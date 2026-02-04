import type { PlasmoCSConfig, PlasmoGetStyle } from "plasmo"
import { useEffect, useMemo, useRef, useState } from "react"
import {
  buildElementKey,
  getElementMeta,
  linkRequestToInteraction,
  type ElementKey,
  type ElementMeta,
  type Interaction,
  type NetworkRequest,
  DEFAULT_LINK_WINDOW_MS
} from "@api-hover/core"

const SOURCE_TAG = "api-hover"
const MAX_INTERACTIONS = 200
const MAX_REQUESTS = 200
const MAX_REQUESTS_PER_ELEMENT = 10
const TOOLTIP_LIMIT = 3
const INTERACTIVE_SELECTOR =
  "[data-testid],[aria-label],button,a,input,select,textarea,[role=button],[role=tab],[role=link],[role=menuitem],[role=checkbox],[role=radio],[role=switch]"

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"]
}

export const getStyle: PlasmoGetStyle = () => {
  const style = document.createElement("style")
  style.textContent = `
    :host {
      all: initial;
      font-family: "IBM Plex Sans", "SF Pro Text", "Segoe UI", sans-serif;
    }

    .api-hover-root {
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: 2147483647;
    }

    .api-hover-highlight {
      position: fixed;
      border: 2px solid #4f8cff;
      border-radius: 6px;
      box-shadow: 0 0 0 3px rgba(79, 140, 255, 0.2);
      background: rgba(79, 140, 255, 0.08);
      transition: all 120ms ease;
    }

    .api-hover-tooltip {
      position: fixed;
      max-width: 360px;
      background: #0f172a;
      color: #e2e8f0;
      border: 1px solid rgba(148, 163, 184, 0.3);
      border-radius: 10px;
      padding: 12px 14px;
      box-shadow: 0 16px 40px rgba(15, 23, 42, 0.35);
      font-size: 12px;
      line-height: 1.4;
    }

    .api-hover-tooltip h4 {
      margin: 0 0 8px;
      font-size: 12px;
      font-weight: 600;
      color: #f8fafc;
      letter-spacing: 0.02em;
    }

    .api-hover-tooltip .meta {
      color: #94a3b8;
      font-size: 11px;
      margin-bottom: 8px;
    }

    .api-hover-tooltip .request {
      display: grid;
      grid-template-columns: auto 1fr auto;
      gap: 8px;
      align-items: center;
      padding: 6px 0;
      border-top: 1px solid rgba(148, 163, 184, 0.15);
    }

    .api-hover-tooltip .request:first-of-type {
      border-top: none;
    }

    .api-hover-tooltip .method {
      font-weight: 600;
      font-size: 11px;
      color: #38bdf8;
      text-transform: uppercase;
    }

    .api-hover-tooltip .url {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: #e2e8f0;
    }

    .api-hover-tooltip .status {
      font-weight: 600;
      font-size: 11px;
      color: #22c55e;
    }

    .api-hover-tooltip .status.error {
      color: #f97316;
    }

    .api-hover-tooltip .empty {
      color: #94a3b8;
      font-size: 11px;
    }
  `
  return style
}

const createId = (prefix: string) =>
  `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`

const pushRing = <T,>(list: T[], item: T, max: number) => {
  list.push(item)
  if (list.length > max) {
    list.splice(0, list.length - max)
  }
}

const useStableCallback = <T extends (...args: any[]) => void>(callback: T) => {
  const ref = useRef(callback)
  ref.current = callback
  return useMemo(() => ((...args: Parameters<T>) => ref.current(...args)) as T, [])
}

const resolveTargetElement = (element: Element | null) => {
  if (!element) return null
  return element.closest(INTERACTIVE_SELECTOR) ?? element
}

type BackgroundState = {
  interactions?: Interaction[]
  requests?: NetworkRequest[]
  linkWindowMs?: number
  inspectMode?: boolean
}

type BackgroundMessage =
  | { type: "get-tab-state" }
  | { type: "store-interaction"; payload: Interaction }
  | { type: "store-request"; payload: NetworkRequest }
  | { type: "set-link-window"; payload: { linkWindowMs: number } }
  | { type: "set-inspect"; payload: { enabled: boolean } }
  | { type: "clear-tab-state" }

const postToBackground = (message: BackgroundMessage) => {
  try {
    chrome.runtime.sendMessage(message)
  } catch {
    // Ignore if runtime is unavailable.
  }
}

const requestTabState = () =>
  new Promise<BackgroundState | null>((resolve) => {
    try {
      chrome.runtime.sendMessage({ type: "get-tab-state" } as BackgroundMessage, (response) => {
        if (chrome.runtime.lastError) {
          resolve(null)
          return
        }
        resolve(response as BackgroundState)
      })
    } catch {
      resolve(null)
    }
  })

const formatMeta = (meta: ElementMeta) => {
  const parts = [meta.tagName]
  if (meta.dataTestId) parts.push(`data-testid=${meta.dataTestId}`)
  else if (meta.ariaLabel) parts.push(`aria-label=${meta.ariaLabel}`)
  else if (meta.id) parts.push(`#${meta.id}`)
  else if (meta.name) parts.push(`name=${meta.name}`)
  else if (meta.role && meta.text) parts.push(`${meta.role} "${meta.text}"`)
  else if (meta.text) parts.push(`"${meta.text}"`)
  return parts.join(" · ")
}

const getRequestsForKey = (
  key: ElementKey | null,
  requestMap: Map<ElementKey, string[]>,
  requestById: Map<string, NetworkRequest>
) => {
  if (!key) return []
  const ids = requestMap.get(key) ?? []
  return ids
    .map((id) => requestById.get(id))
    .filter(Boolean)
    .slice(0, TOOLTIP_LIMIT) as NetworkRequest[]
}

const Overlay = () => {
  const [inspectMode, setInspectMode] = useState(false)
  const [linkWindowMs, setLinkWindowMs] = useState(DEFAULT_LINK_WINDOW_MS)
  const [hovered, setHovered] = useState<{
    key: ElementKey
    rect: DOMRect
    meta: ElementMeta
  } | null>(null)
  const [hoveredRequests, setHoveredRequests] = useState<NetworkRequest[]>([])
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 })
  const tooltipRef = useRef<HTMLDivElement | null>(null)
  const hoveredElementRef = useRef<Element | null>(null)
  const interactionsRef = useRef<Interaction[]>([])
  const requestsRef = useRef<NetworkRequest[]>([])
  const elementRequestMapRef = useRef<Map<ElementKey, string[]>>(new Map())
  const requestByIdRef = useRef<Map<string, NetworkRequest>>(new Map())

  const refreshHoveredRequests = useStableCallback((key: ElementKey | null) => {
    setHoveredRequests(
      getRequestsForKey(key, elementRequestMapRef.current, requestByIdRef.current)
    )
  })

  const clearHistory = useStableCallback(() => {
    interactionsRef.current = []
    requestsRef.current = []
    elementRequestMapRef.current.clear()
    requestByIdRef.current.clear()
    refreshHoveredRequests(hovered?.key ?? null)
    postToBackground({ type: "clear-tab-state" })
  })

  const rehydrateState = useStableCallback((state: BackgroundState | null) => {
    if (!state) return

    const interactions = Array.isArray(state.interactions) ? state.interactions : []
    const requests = Array.isArray(state.requests) ? state.requests : []
    const windowMs =
      typeof state.linkWindowMs === "number" ? state.linkWindowMs : linkWindowMs
    const storedInspect = typeof state.inspectMode === "boolean" ? state.inspectMode : null

    interactionsRef.current = interactions.slice(-MAX_INTERACTIONS)
    requestsRef.current = requests.slice(-MAX_REQUESTS)
    requestByIdRef.current.clear()
    elementRequestMapRef.current.clear()

    for (const request of requestsRef.current) {
      requestByIdRef.current.set(request.id, request)
      const interaction = linkRequestToInteraction(
        interactionsRef.current,
        request,
        windowMs
      )
      if (interaction) {
        const key = interaction.elementKey
        const existing = elementRequestMapRef.current.get(key) ?? []
        existing.unshift(request.id)
        if (existing.length > MAX_REQUESTS_PER_ELEMENT) {
          existing.length = MAX_REQUESTS_PER_ELEMENT
        }
        elementRequestMapRef.current.set(key, existing)
      }
    }

    setLinkWindowMs(windowMs)
    if (storedInspect !== null) {
      setInspectMode(storedInspect)
    }
    refreshHoveredRequests(hovered?.key ?? null)
  })

  const updateTooltipPosition = useStableCallback(() => {
    if (!hovered) return
    const tooltipRect = tooltipRef.current?.getBoundingClientRect()
    const rect = hovered.rect
    let top = rect.bottom + 8
    let left = rect.left

    if (tooltipRect) {
      if (top + tooltipRect.height > window.innerHeight - 8) {
        top = rect.top - tooltipRect.height - 8
      }
      if (left + tooltipRect.width > window.innerWidth - 8) {
        left = window.innerWidth - tooltipRect.width - 8
      }
    }

    if (top < 8) top = 8
    if (left < 8) left = 8

    setTooltipPosition({ top, left })
  })

  const setHoveredFromElement = useStableCallback((element: Element | null) => {
    if (!inspectMode) return
    const resolved = resolveTargetElement(element)
    if (!resolved) {
      setHovered(null)
      return
    }

    if (!document.contains(resolved)) {
      setHovered(null)
      return
    }

    const rect = resolved.getBoundingClientRect()
    if (hovered && hoveredElementRef.current === resolved) {
      const unchanged =
        rect.top === hovered.rect.top &&
        rect.left === hovered.rect.left &&
        rect.width === hovered.rect.width &&
        rect.height === hovered.rect.height
      if (unchanged) {
        return
      }
    }
    if (rect.width === 0 && rect.height === 0) {
      setHovered(null)
      return
    }

    const key = buildElementKey(resolved)
    const meta = getElementMeta(resolved)

    hoveredElementRef.current = resolved
    setHovered({ key, rect, meta })
    refreshHoveredRequests(key)
  })

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.source !== window) return
      const data = event.data
      if (!data || data.source !== SOURCE_TAG || data.type !== "request") return

      const request = data.payload as NetworkRequest
      pushRing(requestsRef.current, request, MAX_REQUESTS)
      requestByIdRef.current.set(request.id, request)
      postToBackground({ type: "store-request", payload: request })

      const interaction = linkRequestToInteraction(
        interactionsRef.current,
        request,
        linkWindowMs
      )

      if (interaction) {
        const key = interaction.elementKey
        const existing = elementRequestMapRef.current.get(key) ?? []
        existing.unshift(request.id)
        if (existing.length > MAX_REQUESTS_PER_ELEMENT) {
          existing.length = MAX_REQUESTS_PER_ELEMENT
        }
        elementRequestMapRef.current.set(key, existing)
        if (hovered?.key === key) {
          refreshHoveredRequests(key)
        }
      }
    }

    window.addEventListener("message", handleMessage)
    return () => window.removeEventListener("message", handleMessage)
  }, [hovered?.key, linkWindowMs, refreshHoveredRequests])

  useEffect(() => {
    requestTabState().then((state) => {
      rehydrateState(state)
    })
  }, [rehydrateState])

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof Element)) return
      const resolved = resolveTargetElement(target)
      if (!resolved) return
      const interaction: Interaction = {
        id: createId("interaction"),
        ts: Date.now(),
        type: "click",
        elementKey: buildElementKey(resolved),
        elementMeta: getElementMeta(resolved)
      }
      pushRing(interactionsRef.current, interaction, MAX_INTERACTIONS)
      postToBackground({ type: "store-interaction", payload: interaction })
    }

    const handleSubmit = (event: Event) => {
      const target = event.target
      if (!(target instanceof Element)) return
      const resolved = resolveTargetElement(target)
      if (!resolved) return
      const interaction: Interaction = {
        id: createId("interaction"),
        ts: Date.now(),
        type: "submit",
        elementKey: buildElementKey(resolved),
        elementMeta: getElementMeta(resolved)
      }
      pushRing(interactionsRef.current, interaction, MAX_INTERACTIONS)
      postToBackground({ type: "store-interaction", payload: interaction })
    }

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key !== "Enter") return
      const target = event.target
      if (!(target instanceof Element)) return
      const resolved = resolveTargetElement(target)
      if (!resolved) return
      const interaction: Interaction = {
        id: createId("interaction"),
        ts: Date.now(),
        type: "enter",
        elementKey: buildElementKey(resolved),
        elementMeta: getElementMeta(resolved)
      }
      pushRing(interactionsRef.current, interaction, MAX_INTERACTIONS)
      postToBackground({ type: "store-interaction", payload: interaction })
    }

    document.addEventListener("click", handleClick, true)
    document.addEventListener("submit", handleSubmit, true)
    document.addEventListener("keydown", handleKeydown, true)

    return () => {
      document.removeEventListener("click", handleClick, true)
      document.removeEventListener("submit", handleSubmit, true)
      document.removeEventListener("keydown", handleKeydown, true)
    }
  }, [])

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!inspectMode) return
      const target = event.target
      if (!(target instanceof Element)) return
      setHoveredFromElement(target)
    }

    const handleScroll = () => {
      if (!inspectMode) return
      const target = hoveredElementRef.current
      if (target) {
        setHoveredFromElement(target)
      }
    }

    window.addEventListener("mousemove", handleMouseMove, true)
    window.addEventListener("scroll", handleScroll, true)
    window.addEventListener("resize", handleScroll, true)

    return () => {
      window.removeEventListener("mousemove", handleMouseMove, true)
      window.removeEventListener("scroll", handleScroll, true)
      window.removeEventListener("resize", handleScroll, true)
    }
  }, [inspectMode, setHoveredFromElement])

  useEffect(() => {
    if (!inspectMode) {
      setHovered(null)
      return
    }
    updateTooltipPosition()
  }, [inspectMode, hovered, hoveredRequests, updateTooltipPosition])

  useEffect(() => {
    if (!inspectMode) return
    const raf = requestAnimationFrame(() => updateTooltipPosition())
    return () => cancelAnimationFrame(raf)
  }, [hovered, hoveredRequests, inspectMode, updateTooltipPosition])

  useEffect(() => {
    const handleMessage = (
      message: {
        type: string
        payload?: unknown
      },
      _sender: chrome.runtime.MessageSender,
      sendResponse: (response?: unknown) => void
    ) => {
      if (!message?.type) return

      if (message.type === "get-state") {
        sendResponse({ inspectMode, linkWindowMs })
        return
      }

      if (message.type === "set-inspect") {
        const enabled = Boolean((message.payload as { enabled?: boolean })?.enabled)
        setInspectMode(enabled)
        postToBackground({ type: "set-inspect", payload: { enabled } })
        if (!enabled) {
          setHovered(null)
        }
        sendResponse({ ok: true })
        return
      }

      if (message.type === "set-link-window") {
        const value = (message.payload as { linkWindowMs?: number })?.linkWindowMs
        if (typeof value === "number" && !Number.isNaN(value)) {
          setLinkWindowMs(value)
          postToBackground({ type: "set-link-window", payload: { linkWindowMs: value } })
          sendResponse({ ok: true })
          return
        }
      }

      if (message.type === "clear-history") {
        clearHistory()
        sendResponse({ ok: true })
        return
      }
    }

    chrome.runtime.onMessage.addListener(handleMessage)
    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage)
    }
  }, [clearHistory, inspectMode, linkWindowMs])

  if (!inspectMode || !hovered) {
    return <div className="api-hover-root" />
  }

  return (
    <div className="api-hover-root">
      <div
        className="api-hover-highlight"
        style={{
          top: hovered.rect.top,
          left: hovered.rect.left,
          width: hovered.rect.width,
          height: hovered.rect.height
        }}
      />
      <div
        ref={tooltipRef}
        className="api-hover-tooltip"
        style={{
          top: tooltipPosition.top,
          left: tooltipPosition.left
        }}>
        <h4>API Hover</h4>
        <div className="meta">{formatMeta(hovered.meta)}</div>
        {hoveredRequests.length === 0 ? (
          <div className="empty">No recorded calls yet.</div>
        ) : (
          hoveredRequests.map((request) => {
            const duration = request.tsEnd - request.tsStart
            const statusClass = request.status >= 400 || request.status === 0 ? "status error" : "status"
            return (
              <div className="request" key={request.id}>
                <div className="method">{request.method}</div>
                <div className="url">{request.url}</div>
                <div className={statusClass}>
                  {request.status === 0 ? "ERR" : request.status} · {duration}ms
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

export default Overlay
