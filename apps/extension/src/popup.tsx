import { useEffect, useState } from "react"

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

function IndexPopup() {
  const [inspectMode, setInspectMode] = useState(false)
  const [linkWindowMs, setLinkWindowMs] = useState(DEFAULT_LINK_WINDOW_MS)
  const [status, setStatus] = useState<string | null>(null)

  useEffect(() => {
    sendToActiveTab({ type: "get-state" })
      .then((response) => {
        const state = response as { inspectMode?: boolean; linkWindowMs?: number }
        if (typeof state.inspectMode === "boolean") {
          setInspectMode(state.inspectMode)
        }
        if (typeof state.linkWindowMs === "number") {
          setLinkWindowMs(state.linkWindowMs)
        }
        setStatus(null)
      })
      .catch(() => {
        setStatus("Open a webpage to connect API Hover.")
      })
  }, [])

  const onToggleInspect = async (enabled: boolean) => {
    setInspectMode(enabled)
    try {
      await sendToActiveTab({
        type: "set-inspect",
        payload: { enabled }
      })
      setStatus(null)
    } catch {
      setStatus("Unable to reach the current tab.")
    }
  }

  const onUpdateWindow = async (value: number) => {
    setLinkWindowMs(value)
    try {
      await sendToActiveTab({
        type: "set-link-window",
        payload: { linkWindowMs: value }
      })
      setStatus(null)
    } catch {
      setStatus("Unable to update correlation window.")
    }
  }

  const onClear = async () => {
    try {
      await sendToActiveTab({ type: "clear-history" })
      setStatus("Cleared session history.")
    } catch {
      setStatus("Unable to clear history for this tab.")
    }
  }

  return (
    <div
      style={{
        minWidth: 280,
        padding: 16,
        fontFamily: "\"IBM Plex Sans\", \"SF Pro Text\", sans-serif",
        color: "#0f172a"
      }}>
      <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
        API Hover
      </div>
      <div style={{ fontSize: 12, color: "#64748b", marginBottom: 16 }}>
        Hover elements to reveal recent API calls tied to your actions.
      </div>

      <label
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 12
        }}>
        <span style={{ fontSize: 13 }}>Inspect mode</span>
        <input
          type="checkbox"
          checked={inspectMode}
          onChange={(event) => onToggleInspect(event.target.checked)}
        />
      </label>

      <div style={{ fontSize: 12, marginBottom: 6 }}>
        Correlation window: {linkWindowMs}ms
      </div>
      <input
        type="range"
        min={250}
        max={5000}
        step={250}
        value={linkWindowMs}
        onChange={(event) => onUpdateWindow(Number(event.target.value))}
        style={{ width: "100%", marginBottom: 16 }}
      />

      <button
        onClick={onClear}
        style={{
          width: "100%",
          padding: "8px 10px",
          borderRadius: 8,
          border: "1px solid #cbd5f5",
          background: "#f8fafc",
          fontSize: 12,
          fontWeight: 600,
          cursor: "pointer"
        }}>
        Clear history
      </button>

      {status ? (
        <div style={{ marginTop: 12, fontSize: 12, color: "#475569" }}>
          {status}
        </div>
      ) : null}
    </div>
  )
}

export default IndexPopup
