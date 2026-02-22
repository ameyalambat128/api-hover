import { Monitor, ScanEye } from "lucide-react"
import { useEffect, useState } from "react"

import "./popup.css"

const sendToActiveTab = async (message: {
  type: string
  payload?: unknown
}) => {
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

function IndexPopup() {
  const [activeHost, setActiveHost] = useState<string | null>(null)
  const [isWebPage, setIsWebPage] = useState(false)
  const [requestCount, setRequestCount] = useState(0)
  const [interactionCount, setInteractionCount] = useState(0)

  useEffect(() => {
    let mounted = true

    const loadTabInfo = async () => {
      const { host, isWeb } = await getActiveTabInfo()
      if (!mounted) return
      setActiveHost(host)
      setIsWebPage(isWeb)

      if (!isWeb) {
        setRequestCount(0)
        setInteractionCount(0)
        return
      }

      try {
        const response = (await sendToActiveTab({ type: "get-state" })) as {
          requestCount?: number
          interactionCount?: number
        }
        if (!mounted) return
        setRequestCount(
          typeof response.requestCount === "number" ? response.requestCount : 0
        )
        setInteractionCount(
          typeof response.interactionCount === "number"
            ? response.interactionCount
            : 0
        )
      } catch {
        if (!mounted) return
        setRequestCount(0)
        setInteractionCount(0)
      }
    }

    loadTabInfo()
    return () => {
      mounted = false
    }
  }, [])

  const iconUrl = chrome.runtime.getURL("assets/icon.png")
  const pageLabel = isWebPage
    ? activeHost ?? "Current website"
    : "Open a website to use API Hover"

  return (
    <div className="popup-root">
      <div className="popup-content">
        <header className="popup-header">
          <div className="header-left">
            <img className="app-icon" src={iconUrl} alt="API Hover" />
            <div>
              <div className="app-title">API Hover</div>
              <div className="subtitle">Track UI actions to API calls.</div>
            </div>
          </div>
          <div className={`status-pill ${isWebPage ? "is-connected" : ""}`}>
            <Monitor size={12} aria-hidden="true" />
            <span>{pageLabel}</span>
          </div>
        </header>

        <section className="info-card">
          <div className="info-title">
            <ScanEye size={14} aria-hidden="true" />
            <span>Mini dock controls this tab</span>
          </div>
          <div className="stats-row">
            <div className="stat-chip">
              <span className="stat-label">Requests</span>
              <span className="stat-value">{requestCount}</span>
            </div>
            <div className="stat-chip">
              <span className="stat-label">Actions</span>
              <span className="stat-value">{interactionCount}</span>
            </div>
          </div>
          <ul className="info-list">
            <li>Use the corner button to open the API Hover dock.</li>
            <li>Inspect mode and request history now live in the dock.</li>
            <li>Drag the dock to pin it to any corner.</li>
          </ul>
        </section>
      </div>
    </div>
  )
}

export default IndexPopup
