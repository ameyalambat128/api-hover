import { useEffect, useMemo, useState } from "react"
import "./popup.css"

const DEFAULT_LINK_WINDOW_MS = 1500

const sendToActiveTab = async (message: { type: string; payload?: unknown }) => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab?.id) {
    throw new Error("No active tab")
  }

  return new Promise<unknown>((resolve, reject) => {
    chrome.tabs.sendMessage(tab.id, message, (response) => {
      const error = chrome.runtime.lastError
      if (error) {
        reject(error)
        return
      }
      resolve(response)
    })
  })
}

const getActiveTabInfo = async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab?.id) {
    return { host: null, isWeb: false }
  }
  if (!tab.url) {
    return { host: null, isWeb: false }
  }
  try {
    const url = new URL(tab.url)
    const isWeb = url.protocol === "http:" || url.protocol === "https:"
    return { host: isWeb ? url.hostname : null, isWeb }
  } catch {
    return { host: null, isWeb: false }
  }
}

const formatWindow = (value: number) => {
  const seconds = value / 1000
  const precision = seconds < 1 ? 2 : seconds < 10 ? 1 : 0
  return `${Number(seconds.toFixed(precision))}s`
}

type StatusTone = "info" | "success" | "error"

type StatusMessage = {
  tone: StatusTone
  message: string
}

function IndexPopup() {
  const [inspectMode, setInspectMode] = useState(false)
  const [linkWindowMs, setLinkWindowMs] = useState(DEFAULT_LINK_WINDOW_MS)
  const [status, setStatus] = useState<StatusMessage | null>(null)
  const [connected, setConnected] = useState(false)
  const [activeHost, setActiveHost] = useState<string | null>(null)
  const [connectionNote, setConnectionNote] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    const loadState = async () => {
      const { host, isWeb } = await getActiveTabInfo()
      if (!mounted) return
      setActiveHost(host)

      if (!isWeb) {
        setConnected(false)
        setConnectionNote("Open a webpage to connect API Hover.")
        return
      }

      try {
        const response = await sendToActiveTab({ type: "get-state" })
        const state = response as { inspectMode?: boolean; linkWindowMs?: number }
        if (!mounted) return
        if (typeof state.inspectMode === "boolean") {
          setInspectMode(state.inspectMode)
        }
        if (typeof state.linkWindowMs === "number") {
          setLinkWindowMs(state.linkWindowMs)
        }
        setConnected(true)
        setConnectionNote(null)
        setStatus(null)
      } catch {
        if (!mounted) return
        setConnected(false)
        setConnectionNote("API Hover is not active on this page yet.")
      }
    }

    loadState()
    return () => {
      mounted = false
    }
  }, [])

  const onToggleInspect = async (enabled: boolean) => {
    setInspectMode(enabled)
    try {
      await sendToActiveTab({
        type: "set-inspect",
        payload: { enabled }
      })
      setConnected(true)
      setStatus(null)
    } catch {
      setConnected(false)
      setStatus({ tone: "error", message: "Unable to reach the current tab." })
    }
  }

  const onUpdateWindow = async (value: number) => {
    setLinkWindowMs(value)
    try {
      await sendToActiveTab({
        type: "set-link-window",
        payload: { linkWindowMs: value }
      })
      setConnected(true)
      setStatus(null)
    } catch {
      setConnected(false)
      setStatus({ tone: "error", message: "Unable to update correlation window." })
    }
  }

  const onClear = async () => {
    try {
      await sendToActiveTab({ type: "clear-history" })
      setStatus({ tone: "success", message: "Cleared session history." })
    } catch {
      setStatus({ tone: "error", message: "Unable to clear history for this tab." })
    }
  }

  const statusMessage = status?.message ?? connectionNote
  const statusTone: StatusTone | null = status?.tone ?? (connectionNote ? "info" : null)

  const statusClass = useMemo(() => {
    if (!statusTone) return "status-message"
    return `status-message is-${statusTone}`
  }, [statusTone])

  const connectionLabel = connected
    ? `Connected${activeHost ? ` • ${activeHost}` : ""}`
    : "Not connected"

  const iconUrl = chrome.runtime.getURL("assets/icon.png")

  return (
    <div className="popup-root">
      <div className="popup-content">
        <header className="popup-header">
          <div className="header-left">
            <img className="app-icon" src={iconUrl} alt="API Hover" />
            <div>
              <div className="app-title">API Hover</div>
              <div className="subtitle">See API calls tied to UI actions.</div>
            </div>
          </div>
          <div className={`status-pill ${connected ? "is-connected" : ""}`}>
            <span className="status-dot" />
            <span>{connectionLabel}</span>
          </div>
        </header>

        <section className="control-stack">
          <div className="danger-bar">
            <button className="danger-button" onClick={onClear}>
              Clear history
            </button>
          </div>

          <div className="inspect-card">
            <label className="inspect-row">
              <div className="inspect-copy">
                <span className="inspect-title">Inspect mode</span>
                <span className="inspect-hint">Hover UI elements to see linked calls.</span>
              </div>
              <span className="switch">
                <input
                  type="checkbox"
                  checked={inspectMode}
                  onChange={(event) => onToggleInspect(event.target.checked)}
                />
                <span className="slider" />
              </span>
            </label>

            <div className="inspect-meta">
              <span className={`inspect-tag ${inspectMode ? "is-on" : "is-off"}`}>
                {inspectMode ? "Listening" : "Paused"}
              </span>
              <span className="inspect-status">
                {inspectMode
                  ? "Capturing clicks, submits, and Enter presses."
                  : "Turn on to start listening for interactions."}
              </span>
            </div>
          </div>

          <div className="control-card">
            <div className="slider-row">
              <div className="slider-header">
                <span>Correlation window</span>
                <span className="slider-value">{formatWindow(linkWindowMs)}</span>
              </div>
              <input
                className="range"
                type="range"
                min={250}
                max={5000}
                step={250}
                value={linkWindowMs}
                onChange={(event) => onUpdateWindow(Number(event.target.value))}
              />
              <span className="slider-hint">
                Links API calls to recent clicks, submits, or Enter presses.
              </span>
            </div>
          </div>

          <div className={statusClass}>{statusMessage}</div>
        </section>
      </div>
    </div>
  )
}

export default IndexPopup
