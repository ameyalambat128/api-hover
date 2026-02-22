import {
  buildElementKey,
  DEFAULT_LINK_WINDOW_MS,
  getElementMeta,
  linkRequestToInteraction,
  type ElementKey,
  type ElementMeta,
  type Interaction,
  type NetworkRequest
} from "@api-hover/core"
import { Check, Copy, ScanEye, X } from "lucide-react"
import type { PlasmoCSConfig, PlasmoGetStyle } from "plasmo"
import { useEffect, useMemo, useRef, useState } from "react"

const SOURCE_TAG = "api-hover"
const MAX_INTERACTIONS = 200
const MAX_REQUESTS = 200
const DOCK_MARGIN = 8
const DEFAULT_DOCK_WIDTH = 320
const MIN_DOCK_WIDTH = 300
const MIN_DOCK_HEIGHT = 260
const INTERACTIVE_SELECTOR =
  "[data-testid],[aria-label],button,a,input,select,textarea,[role=button],[role=tab],[role=link],[role=menuitem],[role=checkbox],[role=radio],[role=switch]"

type DockCorner = "top-left" | "top-right" | "bottom-left" | "bottom-right"
type DockSize = { width: number; height: number }
type ResizeDirection = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw" | null

type DockHistoryItem = {
  id: string
  method: string
  endpoint: string
  fullUrl: string
  status: number
  durationMs: number
  interactionType: Interaction["type"] | null
  timeLabel: string
}

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

    .api-hover-dock-shell {
      position: fixed;
      pointer-events: auto;
      z-index: 2147483647;
    }

    .api-hover-dock-shell.is-dragging {
      cursor: grabbing;
    }

    .api-hover-dock-shell.is-resizing {
      cursor: nwse-resize;
    }

    .api-hover-dock-shell.is-dragging * {
      cursor: grabbing !important;
    }

    .api-hover-dock-shell.is-resizing * {
      user-select: none !important;
    }

    .api-hover-dock-trigger {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 44px;
      height: 44px;
      border-radius: 12px;
      border: 1px solid rgba(79, 140, 255, 0.45);
      background: rgba(7, 10, 20, 0.95);
      color: #4f8cff;
      box-shadow: 0 12px 30px rgba(2, 6, 23, 0.55);
      transition: opacity 180ms ease, transform 180ms ease;
      cursor: pointer;
    }

    .api-hover-dock-trigger.is-hidden {
      opacity: 0;
      transform: scale(0.94);
      pointer-events: none;
    }

    .api-hover-dock-panel {
      position: absolute;
      width: ${DEFAULT_DOCK_WIDTH}px;
      border-radius: 14px;
      border: 1px solid rgba(148, 163, 184, 0.2);
      background: rgba(5, 8, 16, 0.95);
      color: #e2e8f0;
      box-shadow: 0 20px 42px rgba(2, 6, 23, 0.58);
      padding: 10px;
      backdrop-filter: blur(8px);
      display: flex;
      flex-direction: column;
      max-height: calc(100vh - ${DOCK_MARGIN * 2}px);
      overflow: hidden;
      transition: opacity 180ms ease, transform 180ms cubic-bezier(0.22, 1, 0.36, 1);
    }

    .api-hover-dock-panel.corner-bottom-right {
      right: 0;
      bottom: 0;
      transform-origin: bottom right;
    }

    .api-hover-dock-panel.corner-bottom-left {
      left: 0;
      bottom: 0;
      transform-origin: bottom left;
    }

    .api-hover-dock-panel.corner-top-right {
      right: 0;
      top: 0;
      transform-origin: top right;
    }

    .api-hover-dock-panel.corner-top-left {
      left: 0;
      top: 0;
      transform-origin: top left;
    }

    .api-hover-dock-panel.is-open {
      opacity: 1;
      transform: translateY(0) scale(1);
      pointer-events: auto;
    }

    .api-hover-dock-panel.is-closed {
      opacity: 0;
      pointer-events: none;
    }

    .api-hover-dock-panel.corner-bottom-right.is-closed,
    .api-hover-dock-panel.corner-bottom-left.is-closed {
      transform: translateY(10px) scale(0.98);
    }

    .api-hover-dock-panel.corner-top-right.is-closed,
    .api-hover-dock-panel.corner-top-left.is-closed {
      transform: translateY(-10px) scale(0.98);
    }

    .api-hover-dock-shell.is-dragging .api-hover-dock-panel,
    .api-hover-dock-shell.is-resizing .api-hover-dock-panel,
    .api-hover-dock-shell.is-dragging .api-hover-dock-trigger {
      transition: none;
    }

    .api-hover-dock-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 10px;
      gap: 8px;
      cursor: grab;
      user-select: none;
    }

    .api-hover-dock-brand {
      display: flex;
      align-items: center;
      flex: 1;
      gap: 10px;
      min-width: 0;
    }

    .api-hover-dock-brand-copy {
      min-width: 0;
      flex: 1;
    }

    .api-hover-dock-title {
      font-size: 13px;
      font-weight: 600;
      color: #f8fafc;
      letter-spacing: 0.01em;
      line-height: 1.2;
    }

    .api-hover-dock-subtitle {
      margin-top: 2px;
      font-size: 11px;
      color: #94a3b8;
      line-height: 1.25;
    }

    .api-hover-dock-movehint {
      margin-top: 3px;
      font-size: 10px;
      color: #64748b;
      line-height: 1.25;
    }

    .api-hover-dock-app-icon {
      width: 24px;
      height: 24px;
      border-radius: 6px;
      object-fit: cover;
      border: 1px solid rgba(148, 163, 184, 0.24);
      background: rgba(15, 23, 42, 0.74);
      box-shadow: 0 4px 12px rgba(2, 6, 23, 0.35);
      flex: 0 0 auto;
    }

    .api-hover-icon-button {
      width: 28px;
      height: 28px;
      border-radius: 8px;
      border: 1px solid rgba(148, 163, 184, 0.2);
      background: rgba(15, 23, 42, 0.72);
      color: #cbd5e1;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: border-color 120ms ease, color 120ms ease;
    }

    .api-hover-icon-button:hover {
      border-color: rgba(79, 140, 255, 0.55);
      color: #bfdbfe;
    }

    .api-hover-dock-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      border-radius: 10px;
      border: 1px solid rgba(148, 163, 184, 0.14);
      background: rgba(15, 23, 42, 0.45);
      padding: 10px;
      margin-bottom: 10px;
    }

    .api-hover-dock-label {
      font-size: 12px;
      font-weight: 600;
      color: #e2e8f0;
    }

    .api-hover-dock-hint {
      margin-top: 2px;
      font-size: 11px;
      color: #94a3b8;
    }

    .api-hover-toggle {
      width: 44px;
      height: 26px;
      border-radius: 999px;
      border: 1px solid rgba(148, 163, 184, 0.3);
      background: rgba(51, 65, 85, 0.7);
      padding: 2px;
      display: inline-flex;
      align-items: center;
      transition: background 160ms ease, border-color 160ms ease;
      cursor: pointer;
    }

    .api-hover-toggle.is-on {
      background: rgba(79, 140, 255, 0.92);
      border-color: rgba(147, 197, 253, 0.9);
    }

    .api-hover-toggle-knob {
      width: 20px;
      height: 20px;
      border-radius: 999px;
      background: #f8fafc;
      transform: translateX(0);
      transition: transform 160ms ease;
    }

    .api-hover-toggle.is-on .api-hover-toggle-knob {
      transform: translateX(18px);
    }

    .api-hover-history {
      border-radius: 10px;
      border: 1px solid rgba(148, 163, 184, 0.14);
      background: rgba(15, 23, 42, 0.45);
      margin-bottom: 10px;
      min-height: 120px;
      flex: 1;
      overflow: auto;
    }

    .api-hover-history-controls {
      display: grid;
      gap: 7px;
      margin-bottom: 10px;
    }

    .api-hover-search,
    .api-hover-filter {
      width: 100%;
      height: 30px;
      border-radius: 8px;
      border: 1px solid rgba(148, 163, 184, 0.24);
      background: rgba(7, 10, 20, 0.75);
      color: #e2e8f0;
      padding: 0 9px;
      font-size: 11px;
      outline: none;
    }

    .api-hover-search::placeholder {
      color: #94a3b8;
    }

    .api-hover-search:focus,
    .api-hover-filter:focus {
      border-color: rgba(79, 140, 255, 0.56);
    }

    .api-hover-filter-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 6px;
    }

    .api-hover-history-header {
      position: sticky;
      top: 0;
      padding: 8px 10px;
      font-size: 11px;
      font-weight: 600;
      color: #cbd5e1;
      background: rgba(7, 10, 20, 0.9);
      border-bottom: 1px solid rgba(148, 163, 184, 0.14);
      z-index: 1;
    }

    .api-hover-history-empty {
      padding: 12px 10px;
      font-size: 11px;
      color: #94a3b8;
    }

    .api-hover-history-item {
      padding: 9px 10px;
      border-top: 1px solid rgba(148, 163, 184, 0.12);
    }

    .api-hover-history-item:first-of-type {
      border-top: none;
    }

    .api-hover-history-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 5px;
    }

    .api-hover-history-top-right {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .api-hover-method {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      color: #93c5fd;
      letter-spacing: 0.04em;
    }

    .api-hover-status {
      font-size: 10px;
      font-weight: 700;
      color: #4ade80;
    }

    .api-hover-status.is-error {
      color: #fb923c;
    }

    .api-hover-copy {
      width: 22px;
      height: 22px;
      border-radius: 7px;
      border: 1px solid rgba(148, 163, 184, 0.22);
      background: rgba(15, 23, 42, 0.72);
      color: #cbd5e1;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: border-color 120ms ease, color 120ms ease;
    }

    .api-hover-copy:hover {
      border-color: rgba(79, 140, 255, 0.55);
      color: #bfdbfe;
    }

    .api-hover-copy.is-copied {
      border-color: rgba(52, 211, 153, 0.58);
      color: #86efac;
    }

    .api-hover-endpoint {
      font-size: 11px;
      color: #e2e8f0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin-bottom: 4px;
    }

    .api-hover-history-meta {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 10px;
      color: #94a3b8;
    }

    .api-hover-dock-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .api-hover-dock-action {
      height: 30px;
      padding: 0 10px;
      border-radius: 9px;
      border: 1px solid rgba(148, 163, 184, 0.22);
      background: rgba(15, 23, 42, 0.66);
      color: #cbd5e1;
      font-size: 11px;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      transition: border-color 120ms ease, color 120ms ease;
    }

    .api-hover-dock-action:hover {
      border-color: rgba(79, 140, 255, 0.58);
      color: #e2e8f0;
    }

    .api-hover-dock-action.is-danger:hover {
      border-color: rgba(248, 113, 113, 0.58);
      color: #fecaca;
    }

    .api-hover-corner {
      margin-left: auto;
      font-size: 10px;
      color: #94a3b8;
      text-transform: capitalize;
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
  return useMemo(
    () => ((...args: Parameters<T>) => ref.current(...args)) as T,
    []
  )
}

const resolveTargetElement = (element: Element | null) => {
  if (!element) return null
  return element.closest(INTERACTIVE_SELECTOR) ?? element
}

const isDockCorner = (value: unknown): value is DockCorner =>
  value === "top-left" ||
  value === "top-right" ||
  value === "bottom-left" ||
  value === "bottom-right"

const isDockSize = (value: unknown): value is DockSize =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as DockSize).width === "number" &&
  Number.isFinite((value as DockSize).width) &&
  typeof (value as DockSize).height === "number" &&
  Number.isFinite((value as DockSize).height)

const isErrorStatus = (status: number) => status >= 400 || status === 0

const clampDockSize = (value: DockSize) => {
  const maxWidth = Math.max(MIN_DOCK_WIDTH, Math.floor(window.innerWidth * 0.7))
  const maxHeight = Math.max(
    MIN_DOCK_HEIGHT,
    Math.floor(window.innerHeight * 0.7)
  )
  return {
    width: Math.min(
      Math.max(Math.round(value.width), MIN_DOCK_WIDTH),
      maxWidth
    ),
    height: Math.min(
      Math.max(Math.round(value.height), MIN_DOCK_HEIGHT),
      maxHeight
    )
  } satisfies DockSize
}

const getResizeDirection = (x: number, y: number, rect: DOMRect) => {
  const edge = 10
  const nearLeft = x <= rect.left + edge
  const nearRight = x >= rect.right - edge
  const nearTop = y <= rect.top + edge
  const nearBottom = y >= rect.bottom - edge

  if (nearTop && nearLeft) return "nw" as ResizeDirection
  if (nearTop && nearRight) return "ne" as ResizeDirection
  if (nearBottom && nearLeft) return "sw" as ResizeDirection
  if (nearBottom && nearRight) return "se" as ResizeDirection
  if (nearTop) return "n" as ResizeDirection
  if (nearBottom) return "s" as ResizeDirection
  if (nearLeft) return "w" as ResizeDirection
  if (nearRight) return "e" as ResizeDirection
  return null
}

const resizeCursor = (direction: ResizeDirection) => {
  if (direction === "n" || direction === "s") return "ns-resize"
  if (direction === "e" || direction === "w") return "ew-resize"
  if (direction === "ne" || direction === "sw") return "nesw-resize"
  if (direction === "nw" || direction === "se") return "nwse-resize"
  return "default"
}

const dockCornerFromPoint = (x: number, y: number) => {
  const horizontal = x < window.innerWidth / 2 ? "left" : "right"
  const vertical = y < window.innerHeight / 2 ? "top" : "bottom"
  return `${vertical}-${horizontal}` as DockCorner
}

const getDockAnchorStyle = (corner: DockCorner) => {
  if (corner === "top-left")
    return { top: `${DOCK_MARGIN}px`, left: `${DOCK_MARGIN}px` }
  if (corner === "top-right")
    return { top: `${DOCK_MARGIN}px`, right: `${DOCK_MARGIN}px` }
  if (corner === "bottom-left") {
    return { bottom: `${DOCK_MARGIN}px`, left: `${DOCK_MARGIN}px` }
  }
  return { bottom: `${DOCK_MARGIN}px`, right: `${DOCK_MARGIN}px` }
}

const endpointFromUrl = (url: string) => {
  try {
    const parsed = new URL(url, window.location.href)
    const endpoint = `${parsed.pathname}${parsed.search}`
    return endpoint || parsed.pathname || url
  } catch {
    return url
  }
}

const toHistoryItem = (
  request: NetworkRequest,
  interactions: Interaction[],
  linkWindowMs: number
) => {
  const interaction = linkRequestToInteraction(
    interactions,
    request,
    linkWindowMs
  )
  const timeLabel = new Date(request.tsEnd).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  })
  return {
    id: request.id,
    method: request.method,
    endpoint: endpointFromUrl(request.url),
    fullUrl: request.url,
    status: request.status,
    durationMs: request.tsEnd - request.tsStart,
    interactionType: interaction?.type ?? null,
    timeLabel
  } satisfies DockHistoryItem
}

type BackgroundState = {
  interactions?: Interaction[]
  requests?: NetworkRequest[]
  linkWindowMs?: number
  inspectMode?: boolean
  dockOpen?: boolean
  dockCorner?: DockCorner
  dockSize?: DockSize | null
}

type BackgroundMessage =
  | { type: "get-tab-state" }
  | { type: "store-interaction"; payload: Interaction }
  | { type: "store-request"; payload: NetworkRequest }
  | { type: "set-link-window"; payload: { linkWindowMs: number } }
  | { type: "set-inspect"; payload: { enabled: boolean } }
  | {
      type: "set-overlay-ui"
      payload: {
        dockOpen?: boolean
        dockCorner?: DockCorner
        dockSize?: DockSize | null
      }
    }
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
      chrome.runtime.sendMessage(
        { type: "get-tab-state" } as BackgroundMessage,
        (response) => {
          if (chrome.runtime.lastError) {
            resolve(null)
            return
          }
          resolve(response as BackgroundState)
        }
      )
    } catch {
      resolve(null)
    }
  })

const Overlay = () => {
  const [inspectMode, setInspectMode] = useState(false)
  const [linkWindowMs, setLinkWindowMs] = useState(DEFAULT_LINK_WINDOW_MS)
  const [dockOpen, setDockOpen] = useState(false)
  const [dockCorner, setDockCorner] = useState<DockCorner>("bottom-right")
  const [dockSize, setDockSize] = useState<DockSize | null>(null)
  const [dragPosition, setDragPosition] = useState<{
    x: number
    y: number
  } | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [panelCursor, setPanelCursor] = useState("default")
  const [hovered, setHovered] = useState<{
    key: ElementKey
    rect: DOMRect
    meta: ElementMeta
  } | null>(null)
  const [historyItems, setHistoryItems] = useState<DockHistoryItem[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [methodFilter, setMethodFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [actionFilter, setActionFilter] = useState("all")
  const [copiedItemId, setCopiedItemId] = useState<string | null>(null)

  const dockRef = useRef<HTMLDivElement | null>(null)
  const dockPanelRef = useRef<HTMLDivElement | null>(null)
  const hoveredElementRef = useRef<Element | null>(null)
  const interactionsRef = useRef<Interaction[]>([])
  const requestsRef = useRef<NetworkRequest[]>([])
  const dragOffsetRef = useRef<{ x: number; y: number } | null>(null)
  const copyTimerRef = useRef<number | null>(null)
  const resizeDirectionRef = useRef<ResizeDirection>(null)
  const resizeStartRef = useRef<{
    pointerX: number
    pointerY: number
    panelLeft: number
    panelRight: number
    panelTop: number
    panelBottom: number
    shellWidth: number
    shellHeight: number
  } | null>(null)
  const dragSourceRef = useRef<"header" | "trigger" | null>(null)
  const dragStartRef = useRef<{ x: number; y: number } | null>(null)
  const dragDidMoveRef = useRef(false)
  const ignoreTriggerClickRef = useRef(false)

  const persistOverlayUi = useStableCallback(
    (payload: {
      dockOpen?: boolean
      dockCorner?: DockCorner
      dockSize?: DockSize | null
    }) => {
      postToBackground({ type: "set-overlay-ui", payload })
    }
  )

  const clearHistory = useStableCallback(() => {
    interactionsRef.current = []
    requestsRef.current = []
    setHistoryItems([])
    setCopiedItemId(null)
    postToBackground({ type: "clear-tab-state" })
  })

  const setInspectEnabled = useStableCallback((enabled: boolean) => {
    setInspectMode(enabled)
    postToBackground({ type: "set-inspect", payload: { enabled } })
    if (!enabled) {
      setHovered(null)
    }
  })

  const rehydrateState = useStableCallback((state: BackgroundState | null) => {
    if (!state) return

    const interactions = Array.isArray(state.interactions)
      ? state.interactions
      : []
    const requests = Array.isArray(state.requests) ? state.requests : []
    const windowMs =
      typeof state.linkWindowMs === "number" ? state.linkWindowMs : linkWindowMs
    const storedInspect =
      typeof state.inspectMode === "boolean" ? state.inspectMode : null
    const storedOpen =
      typeof state.dockOpen === "boolean" ? state.dockOpen : null

    interactionsRef.current = interactions.slice(-MAX_INTERACTIONS)
    requestsRef.current = requests.slice(-MAX_REQUESTS)

    setLinkWindowMs(windowMs)
    if (storedInspect !== null) {
      setInspectMode(storedInspect)
    }
    if (storedOpen !== null) {
      setDockOpen(storedOpen)
    }
    if (isDockCorner(state.dockCorner)) {
      setDockCorner(state.dockCorner)
    }
    if (state.dockSize === null) {
      setDockSize(null)
    } else if (isDockSize(state.dockSize)) {
      setDockSize(clampDockSize(state.dockSize))
    }

    const nextHistory = requestsRef.current
      .slice()
      .reverse()
      .map((request) =>
        toHistoryItem(request, interactionsRef.current, windowMs)
      )

    setHistoryItems(nextHistory)
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
      if (unchanged) return
    }

    if (rect.width === 0 && rect.height === 0) {
      setHovered(null)
      return
    }

    const key = buildElementKey(resolved)
    const meta = getElementMeta(resolved)
    hoveredElementRef.current = resolved
    setHovered({ key, rect, meta })
  })

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.source !== window) return
      const data = event.data
      if (!data || data.source !== SOURCE_TAG || data.type !== "request") return

      const request = data.payload as NetworkRequest
      pushRing(requestsRef.current, request, MAX_REQUESTS)
      postToBackground({ type: "store-request", payload: request })

      const nextItem = toHistoryItem(
        request,
        interactionsRef.current,
        linkWindowMs
      )
      setHistoryItems((prev) => [nextItem, ...prev].slice(0, MAX_REQUESTS))
    }

    window.addEventListener("message", handleMessage)
    return () => window.removeEventListener("message", handleMessage)
  }, [linkWindowMs])

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
    if (!isDragging && !isResizing) return

    const handlePointerMove = (event: PointerEvent) => {
      if (isDragging && dockRef.current && dragOffsetRef.current) {
        const shellWidth = dockRef.current.offsetWidth
        const shellHeight = dockRef.current.offsetHeight
        const panelWidth = dockOpen
          ? dockSize?.width ??
            dockPanelRef.current?.offsetWidth ??
            DEFAULT_DOCK_WIDTH
          : shellWidth
        const panelHeight = dockOpen
          ? dockSize?.height ??
            dockPanelRef.current?.offsetHeight ??
            shellHeight
          : shellHeight

        const rightAnchored = dockCorner.endsWith("right")
        const bottomAnchored = dockCorner.startsWith("bottom")

        const minX = rightAnchored
          ? panelWidth - shellWidth + DOCK_MARGIN
          : DOCK_MARGIN
        const maxX = rightAnchored
          ? window.innerWidth - shellWidth - DOCK_MARGIN
          : window.innerWidth - panelWidth - DOCK_MARGIN
        const minY = bottomAnchored
          ? panelHeight - shellHeight + DOCK_MARGIN
          : DOCK_MARGIN
        const maxY = bottomAnchored
          ? window.innerHeight - shellHeight - DOCK_MARGIN
          : window.innerHeight - panelHeight - DOCK_MARGIN

        const clampedX = Math.min(
          Math.max(event.clientX - dragOffsetRef.current.x, minX),
          Math.max(minX, maxX)
        )
        const clampedY = Math.min(
          Math.max(event.clientY - dragOffsetRef.current.y, minY),
          Math.max(minY, maxY)
        )

        if (dragStartRef.current) {
          const distance = Math.hypot(
            event.clientX - dragStartRef.current.x,
            event.clientY - dragStartRef.current.y
          )
          if (distance > 4) {
            dragDidMoveRef.current = true
          }
        }

        setDragPosition({ x: clampedX, y: clampedY })
      }

      if (
        isResizing &&
        resizeStartRef.current &&
        resizeDirectionRef.current &&
        dockRef.current
      ) {
        const start = resizeStartRef.current
        const direction = resizeDirectionRef.current
        const deltaX = event.clientX - start.pointerX
        const deltaY = event.clientY - start.pointerY

        let nextLeft = start.panelLeft
        let nextRight = start.panelRight
        let nextTop = start.panelTop
        let nextBottom = start.panelBottom

        if (direction.includes("w")) {
          nextLeft += deltaX
        }
        if (direction.includes("e")) {
          nextRight += deltaX
        }
        if (direction.includes("n")) {
          nextTop += deltaY
        }
        if (direction.includes("s")) {
          nextBottom += deltaY
        }

        const maxWidth = Math.max(
          MIN_DOCK_WIDTH,
          Math.floor(window.innerWidth * 0.7)
        )
        const maxHeight = Math.max(
          MIN_DOCK_HEIGHT,
          Math.floor(window.innerHeight * 0.7)
        )

        nextLeft = Math.max(nextLeft, DOCK_MARGIN)
        nextRight = Math.min(nextRight, window.innerWidth - DOCK_MARGIN)
        nextTop = Math.max(nextTop, DOCK_MARGIN)
        nextBottom = Math.min(nextBottom, window.innerHeight - DOCK_MARGIN)

        if (direction.includes("w")) {
          nextLeft = Math.min(nextLeft, nextRight - MIN_DOCK_WIDTH)
          nextLeft = Math.max(nextLeft, nextRight - maxWidth)
        }
        if (direction.includes("e")) {
          nextRight = Math.max(nextRight, nextLeft + MIN_DOCK_WIDTH)
          nextRight = Math.min(nextRight, nextLeft + maxWidth)
        }
        if (direction.includes("n")) {
          nextTop = Math.min(nextTop, nextBottom - MIN_DOCK_HEIGHT)
          nextTop = Math.max(nextTop, nextBottom - maxHeight)
        }
        if (direction.includes("s")) {
          nextBottom = Math.max(nextBottom, nextTop + MIN_DOCK_HEIGHT)
          nextBottom = Math.min(nextBottom, nextTop + maxHeight)
        }

        const nextSize = clampDockSize({
          width: nextRight - nextLeft,
          height: nextBottom - nextTop
        })
        setDockSize(nextSize)

        const shellX = dockCorner.endsWith("left")
          ? nextLeft
          : nextRight - start.shellWidth
        const shellY = dockCorner.startsWith("top")
          ? nextTop
          : nextBottom - start.shellHeight

        setDragPosition({ x: shellX, y: shellY })
      }
    }

    const endInteraction = () => {
      if (isResizing && dockPanelRef.current) {
        const panelRect = dockPanelRef.current.getBoundingClientRect()
        const nextSize = clampDockSize({
          width: panelRect.width,
          height: panelRect.height
        })
        setDockSize(nextSize)
        persistOverlayUi({ dockSize: nextSize })
        setIsResizing(false)
        resizeStartRef.current = null
        resizeDirectionRef.current = null
        setPanelCursor("default")
      }

      if (isDragging && dockRef.current) {
        const rect = dockRef.current.getBoundingClientRect()
        const nextCorner = dockCornerFromPoint(
          rect.left + rect.width / 2,
          rect.top + rect.height / 2
        )
        setDockCorner(nextCorner)
        persistOverlayUi({ dockCorner: nextCorner })
        if (
          dragSourceRef.current === "trigger" &&
          dragDidMoveRef.current &&
          !dockOpen
        ) {
          ignoreTriggerClickRef.current = true
        }
      }

      setDragPosition(null)
      setIsDragging(false)
      dragOffsetRef.current = null
      dragStartRef.current = null
      dragDidMoveRef.current = false
      dragSourceRef.current = null
    }

    window.addEventListener("pointermove", handlePointerMove)
    window.addEventListener("pointerup", endInteraction)
    window.addEventListener("pointercancel", endInteraction)

    return () => {
      window.removeEventListener("pointermove", handlePointerMove)
      window.removeEventListener("pointerup", endInteraction)
      window.removeEventListener("pointercancel", endInteraction)
    }
  }, [dockCorner, dockOpen, dockSize, isDragging, isResizing, persistOverlayUi])

  useEffect(() => {
    return () => {
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    const handleResize = () => {
      if (!dockSize) return
      const clamped = clampDockSize(dockSize)
      if (
        clamped.width !== dockSize.width ||
        clamped.height !== dockSize.height
      ) {
        setDockSize(clamped)
        persistOverlayUi({ dockSize: clamped })
      }
    }

    window.addEventListener("resize", handleResize)
    return () => {
      window.removeEventListener("resize", handleResize)
    }
  }, [dockSize, persistOverlayUi])

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
        sendResponse({
          inspectMode,
          linkWindowMs,
          requestCount: requestsRef.current.length,
          interactionCount: interactionsRef.current.length
        })
        return
      }

      if (message.type === "set-inspect") {
        const enabled = Boolean(
          (message.payload as { enabled?: boolean })?.enabled
        )
        setInspectEnabled(enabled)
        sendResponse({ ok: true })
        return
      }

      if (message.type === "set-link-window") {
        const value = (message.payload as { linkWindowMs?: number })
          ?.linkWindowMs
        if (typeof value === "number" && !Number.isNaN(value)) {
          setLinkWindowMs(value)
          postToBackground({
            type: "set-link-window",
            payload: { linkWindowMs: value }
          })
          sendResponse({ ok: true })
          return
        }
      }

      if (message.type === "clear-history") {
        clearHistory()
        sendResponse({ ok: true })
      }
    }

    chrome.runtime.onMessage.addListener(handleMessage)
    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage)
    }
  }, [clearHistory, inspectMode, linkWindowMs, setInspectEnabled])

  const dockStyle = useMemo(() => {
    if (dragPosition) {
      return {
        top: `${dragPosition.y}px`,
        left: `${dragPosition.x}px`
      }
    }
    return getDockAnchorStyle(dockCorner)
  }, [dockCorner, dragPosition])
  const panelStyle = useMemo(
    () => ({
      ...(dockSize
        ? { width: `${dockSize.width}px`, height: `${dockSize.height}px` }
        : {}),
      cursor: isResizing
        ? resizeCursor(resizeDirectionRef.current)
        : panelCursor
    }),
    [dockSize, isResizing, panelCursor]
  )

  const cornerLabel = useMemo(() => dockCorner.replace("-", " "), [dockCorner])
  const appIconUrl = useMemo(() => chrome.runtime.getURL("assets/icon.png"), [])
  const historyCount = historyItems.length
  const methodOptions = useMemo(
    () =>
      Array.from(
        new Set(historyItems.map((item) => item.method.toUpperCase()))
      ).sort(),
    [historyItems]
  )
  const filteredHistoryItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    return historyItems.filter((item) => {
      const actionLabel = item.interactionType ?? "unlinked"
      if (
        methodFilter !== "all" &&
        item.method.toUpperCase() !== methodFilter
      ) {
        return false
      }

      if (statusFilter === "ok" && isErrorStatus(item.status)) {
        return false
      }
      if (statusFilter === "error" && !isErrorStatus(item.status)) {
        return false
      }

      if (actionFilter !== "all" && actionLabel !== actionFilter) {
        return false
      }

      if (!query) return true
      const searchText =
        `${item.method} ${item.endpoint} ${item.fullUrl} ${item.status} ${actionLabel}`.toLowerCase()
      return searchText.includes(query)
    })
  }, [actionFilter, historyItems, methodFilter, searchQuery, statusFilter])

  const copyEndpoint = (item: DockHistoryItem) => {
    const value = item.endpoint
    const onCopied = () => {
      setCopiedItemId(item.id)
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current)
      }
      copyTimerRef.current = window.setTimeout(() => {
        setCopiedItemId(null)
      }, 1100)
    }

    navigator.clipboard
      .writeText(value)
      .then(onCopied)
      .catch(() => {
        const fallback = document.createElement("textarea")
        fallback.value = value
        fallback.setAttribute("readonly", "true")
        fallback.style.position = "fixed"
        fallback.style.left = "-9999px"
        document.body.appendChild(fallback)
        fallback.select()
        try {
          document.execCommand("copy")
          onCopied()
        } finally {
          document.body.removeChild(fallback)
        }
      })
  }

  return (
    <div className="api-hover-root">
      <div
        ref={dockRef}
        className={`api-hover-dock-shell ${isDragging ? "is-dragging" : ""} ${isResizing ? "is-resizing" : ""}`}
        style={dockStyle}>
        <button
          type="button"
          className={`api-hover-dock-trigger ${dockOpen ? "is-hidden" : ""}`}
          onPointerDown={(event) => {
            if (event.button !== 0 || !dockRef.current) return
            event.preventDefault()
            const rect = dockRef.current.getBoundingClientRect()
            dragOffsetRef.current = {
              x: event.clientX - rect.left,
              y: event.clientY - rect.top
            }
            setDragPosition({ x: rect.left, y: rect.top })
            dragStartRef.current = { x: event.clientX, y: event.clientY }
            dragDidMoveRef.current = false
            dragSourceRef.current = "trigger"
            setIsDragging(true)
          }}
          onClick={() => {
            if (ignoreTriggerClickRef.current) {
              ignoreTriggerClickRef.current = false
              return
            }
            setDockOpen(true)
            persistOverlayUi({ dockOpen: true })
          }}
          aria-label="Open API Hover controls">
          <ScanEye size={16} aria-hidden="true" />
        </button>

        <div
          ref={dockPanelRef}
          className={`api-hover-dock-panel corner-${dockCorner} ${dockOpen ? "is-open" : "is-closed"}`}
          style={panelStyle}
          onPointerMove={(event) => {
            if (isDragging || isResizing || !dockPanelRef.current) return
            const rect = dockPanelRef.current.getBoundingClientRect()
            setPanelCursor(
              resizeCursor(
                getResizeDirection(event.clientX, event.clientY, rect)
              )
            )
          }}
          onPointerLeave={() => {
            if (!isResizing) {
              setPanelCursor("default")
            }
          }}
          onPointerDown={(event) => {
            if (event.button !== 0 || !dockPanelRef.current || !dockRef.current)
              return
            const rect = dockPanelRef.current.getBoundingClientRect()
            const direction = getResizeDirection(
              event.clientX,
              event.clientY,
              rect
            )
            if (!direction) return
            event.preventDefault()
            event.stopPropagation()
            const shellRect = dockRef.current.getBoundingClientRect()
            setDragPosition({ x: shellRect.left, y: shellRect.top })
            const clamped = clampDockSize({
              width: rect.width,
              height: rect.height
            })
            setDockSize(clamped)
            resizeDirectionRef.current = direction
            resizeStartRef.current = {
              pointerX: event.clientX,
              pointerY: event.clientY,
              panelLeft: rect.left,
              panelRight: rect.right,
              panelTop: rect.top,
              panelBottom: rect.bottom,
              shellWidth: shellRect.width,
              shellHeight: shellRect.height
            }
            setIsResizing(true)
          }}>
          <div
            className="api-hover-dock-header"
            onPointerDown={(event) => {
              if (event.button !== 0 || !dockRef.current) return
              const target = event.target
              if (
                target instanceof Element &&
                target.closest("button,input,select,textarea,a")
              ) {
                return
              }
              event.preventDefault()
              const rect = dockRef.current.getBoundingClientRect()
              dragOffsetRef.current = {
                x: event.clientX - rect.left,
                y: event.clientY - rect.top
              }
              setDragPosition({ x: rect.left, y: rect.top })
              dragStartRef.current = { x: event.clientX, y: event.clientY }
              dragDidMoveRef.current = false
              dragSourceRef.current = "header"
              setIsDragging(true)
            }}>
            <div className="api-hover-dock-brand">
              <img
                className="api-hover-dock-app-icon"
                src={appIconUrl}
                alt="API Hover icon"
              />
              <div className="api-hover-dock-brand-copy">
                <div className="api-hover-dock-title">API Hover</div>
                <div className="api-hover-dock-subtitle">
                  Session controls for this tab | {historyCount} requests
                </div>
                <div className="api-hover-dock-movehint">
                  Drag header to move. Drag any panel edge to resize.
                </div>
              </div>
            </div>
            <button
              type="button"
              className="api-hover-icon-button"
              onClick={() => {
                setDockOpen(false)
                persistOverlayUi({ dockOpen: false })
              }}
              aria-label="Close controls">
              <X size={14} aria-hidden="true" />
            </button>
          </div>

          <div className="api-hover-dock-row">
            <div>
              <div className="api-hover-dock-label">Inspect mode</div>
              <div className="api-hover-dock-hint">
                Hover interactive UI to highlight matching elements.
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={inspectMode}
              className={`api-hover-toggle ${inspectMode ? "is-on" : ""}`}
              onClick={() => setInspectEnabled(!inspectMode)}>
              <span className="api-hover-toggle-knob" />
            </button>
          </div>

          <div className="api-hover-history-controls">
            <input
              type="search"
              className="api-hover-search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search endpoint, method, status, action"
            />
            <div className="api-hover-filter-grid">
              <select
                className="api-hover-filter"
                value={methodFilter}
                onChange={(event) => setMethodFilter(event.target.value)}>
                <option value="all">All methods</option>
                {methodOptions.map((method) => (
                  <option key={method} value={method}>
                    {method}
                  </option>
                ))}
              </select>

              <select
                className="api-hover-filter"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}>
                <option value="all">All status</option>
                <option value="ok">OK only</option>
                <option value="error">Errors only</option>
              </select>

              <select
                className="api-hover-filter"
                value={actionFilter}
                onChange={(event) => setActionFilter(event.target.value)}>
                <option value="all">All actions</option>
                <option value="click">Click</option>
                <option value="submit">Submit</option>
                <option value="enter">Enter</option>
                <option value="unlinked">Unlinked</option>
              </select>
            </div>
          </div>

          <div className="api-hover-history">
            <div className="api-hover-history-header">
              Requests {filteredHistoryItems.length}/{historyCount}
            </div>
            {historyCount === 0 ? (
              <div className="api-hover-history-empty">
                No linked requests yet. Click around to start logging.
              </div>
            ) : filteredHistoryItems.length === 0 ? (
              <div className="api-hover-history-empty">
                No results match the current search and filters.
              </div>
            ) : (
              filteredHistoryItems.map((item) => {
                const statusClass = isErrorStatus(item.status)
                  ? "api-hover-status is-error"
                  : "api-hover-status"
                const actionLabel = item.interactionType ?? "unlinked"
                return (
                  <div className="api-hover-history-item" key={item.id}>
                    <div className="api-hover-history-top">
                      <span className="api-hover-method">{item.method}</span>
                      <div className="api-hover-history-top-right">
                        <span className={statusClass}>
                          {item.status === 0 ? "ERR" : item.status}
                        </span>
                        <button
                          type="button"
                          className={`api-hover-copy ${copiedItemId === item.id ? "is-copied" : ""}`}
                          onClick={() => copyEndpoint(item)}
                          aria-label="Copy endpoint"
                          title={`Copy ${item.endpoint}`}>
                          {copiedItemId === item.id ? (
                            <Check size={12} aria-hidden="true" />
                          ) : (
                            <Copy size={12} aria-hidden="true" />
                          )}
                        </button>
                      </div>
                    </div>
                    <div className="api-hover-endpoint" title={item.endpoint}>
                      {item.endpoint}
                    </div>
                    <div className="api-hover-history-meta">
                      <span>{actionLabel}</span>
                      <span>{item.durationMs}ms</span>
                      <span>{item.timeLabel}</span>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          <div className="api-hover-dock-actions">
            <button
              type="button"
              className="api-hover-dock-action is-danger"
              onClick={clearHistory}>
              Clear session
            </button>
            <span className="api-hover-corner">{cornerLabel}</span>
          </div>
        </div>
      </div>

      {inspectMode && hovered ? (
        <div
          className="api-hover-highlight"
          style={{
            top: hovered.rect.top,
            left: hovered.rect.left,
            width: hovered.rect.width,
            height: hovered.rect.height
          }}
        />
      ) : null}
    </div>
  )
}

export default Overlay
