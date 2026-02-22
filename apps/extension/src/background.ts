import type { Interaction, NetworkRequest } from "@api-hover/core"

type DockCorner = "top-left" | "top-right" | "bottom-left" | "bottom-right"
type DockSize = { width: number; height: number }

type TabState = {
  interactions: Interaction[]
  requests: NetworkRequest[]
  linkWindowMs: number
  inspectMode: boolean
  dockOpen: boolean
  dockCorner: DockCorner
  dockSize: DockSize | null
}

const STATE_KEY_PREFIX = "api-hover:tab:"
const MAX_INTERACTIONS = 200
const MAX_REQUESTS = 200
const DEFAULT_LINK_WINDOW_MS = 1500
const DEFAULT_DOCK_OPEN = false
const DEFAULT_DOCK_CORNER: DockCorner = "bottom-right"
const MIN_DOCK_WIDTH = 300
const MIN_DOCK_HEIGHT = 260

const isDockSize = (value: unknown): value is DockSize =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as DockSize).width === "number" &&
  Number.isFinite((value as DockSize).width) &&
  typeof (value as DockSize).height === "number" &&
  Number.isFinite((value as DockSize).height)

const tabStates = new Map<number, TabState>()

const storageKey = (tabId: number) => `${STATE_KEY_PREFIX}${tabId}`

const pushRing = <T>(list: T[], item: T, max: number) => {
  list.push(item)
  if (list.length > max) {
    list.splice(0, list.length - max)
  }
}

const isDockCorner = (value: unknown): value is DockCorner =>
  value === "top-left" ||
  value === "top-right" ||
  value === "bottom-left" ||
  value === "bottom-right"

const ensureState = async (tabId: number): Promise<TabState> => {
  const existing = tabStates.get(tabId)
  if (existing) return existing

  try {
    const result = await chrome.storage.session.get(storageKey(tabId))
    const stored = result[storageKey(tabId)] as TabState | undefined
    if (stored) {
      const hydrated: TabState = {
        interactions: stored.interactions ?? [],
        requests: stored.requests ?? [],
        linkWindowMs: stored.linkWindowMs ?? DEFAULT_LINK_WINDOW_MS,
        inspectMode: stored.inspectMode ?? false,
        dockOpen:
          typeof stored.dockOpen === "boolean"
            ? stored.dockOpen
            : DEFAULT_DOCK_OPEN,
        dockCorner: isDockCorner(stored.dockCorner)
          ? stored.dockCorner
          : DEFAULT_DOCK_CORNER,
        dockSize: isDockSize(stored.dockSize)
          ? {
              width: Math.max(
                MIN_DOCK_WIDTH,
                Math.round(stored.dockSize.width)
              ),
              height: Math.max(
                MIN_DOCK_HEIGHT,
                Math.round(stored.dockSize.height)
              )
            }
          : null
      }
      tabStates.set(tabId, hydrated)
      return hydrated
    }
  } catch {
    // Ignore storage failures.
  }

  const fresh: TabState = {
    interactions: [],
    requests: [],
    linkWindowMs: DEFAULT_LINK_WINDOW_MS,
    inspectMode: false,
    dockOpen: DEFAULT_DOCK_OPEN,
    dockCorner: DEFAULT_DOCK_CORNER,
    dockSize: null
  }
  tabStates.set(tabId, fresh)
  return fresh
}

const persistState = async (tabId: number, state: TabState) => {
  try {
    await chrome.storage.session.set({ [storageKey(tabId)]: state })
  } catch {
    // Ignore storage failures.
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const tabId = sender.tab?.id
  if (!tabId) {
    sendResponse({ ok: false })
    return false
  }

  const respond = async () => {
    const state = await ensureState(tabId)

    if (message?.type === "get-tab-state") {
      sendResponse(state)
      return
    }

    if (message?.type === "store-interaction") {
      const interaction = message.payload as Interaction
      pushRing(state.interactions, interaction, MAX_INTERACTIONS)
      await persistState(tabId, state)
      sendResponse({ ok: true })
      return
    }

    if (message?.type === "store-request") {
      const request = message.payload as NetworkRequest
      pushRing(state.requests, request, MAX_REQUESTS)
      await persistState(tabId, state)
      sendResponse({ ok: true })
      return
    }

    if (message?.type === "set-link-window") {
      const linkWindowMs = (message.payload as { linkWindowMs?: number })
        ?.linkWindowMs
      if (typeof linkWindowMs === "number" && !Number.isNaN(linkWindowMs)) {
        state.linkWindowMs = linkWindowMs
        await persistState(tabId, state)
        sendResponse({ ok: true })
        return
      }
    }

    if (message?.type === "set-inspect") {
      const enabled = (message.payload as { enabled?: boolean })?.enabled
      state.inspectMode = Boolean(enabled)
      await persistState(tabId, state)
      sendResponse({ ok: true })
      return
    }

    if (message?.type === "set-overlay-ui") {
      const payload =
        (message.payload as {
          dockOpen?: boolean
          dockCorner?: DockCorner
          dockSize?: DockSize | null
        }) ?? {}

      if (typeof payload.dockOpen === "boolean") {
        state.dockOpen = payload.dockOpen
      }
      if (isDockCorner(payload.dockCorner)) {
        state.dockCorner = payload.dockCorner
      }
      if (payload.dockSize === null || isDockSize(payload.dockSize)) {
        state.dockSize =
          payload.dockSize === null
            ? null
            : {
                width: Math.max(
                  MIN_DOCK_WIDTH,
                  Math.round(payload.dockSize.width)
                ),
                height: Math.max(
                  MIN_DOCK_HEIGHT,
                  Math.round(payload.dockSize.height)
                )
              }
      }
      await persistState(tabId, state)
      sendResponse({ ok: true })
      return
    }

    if (message?.type === "clear-tab-state") {
      state.interactions = []
      state.requests = []
      await persistState(tabId, state)
      sendResponse({ ok: true })
      return
    }

    sendResponse({ ok: false })
  }

  respond()
  return true
})

chrome.tabs.onRemoved.addListener((tabId) => {
  tabStates.delete(tabId)
  chrome.storage.session.remove(storageKey(tabId)).catch(() => {})
})
