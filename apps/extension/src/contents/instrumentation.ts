import type { NetworkRequest } from "@api-hover/core"
import type { PlasmoCSConfig } from "plasmo"

const SOURCE_TAG = "api-hover"
const GLOBAL_GUARD = "__API_HOVER_INSTRUMENTED__"

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  world: "MAIN"
}

type FetchArgs = [RequestInfo | URL, RequestInit?]

const getNow = () => Date.now()

const toUrl = (input: RequestInfo | URL): string => {
  if (typeof input === "string") return input
  if (input instanceof URL) return input.toString()
  return input.url
}

const toMethod = (input: RequestInfo | URL, init?: RequestInit): string => {
  if (init?.method) return init.method.toUpperCase()
  if (typeof input === "string" || input instanceof URL) return "GET"
  return (input.method || "GET").toUpperCase()
}

const postRequest = (payload: NetworkRequest) => {
  window.postMessage(
    {
      source: SOURCE_TAG,
      type: "request",
      payload
    },
    "*"
  )
}

const ensureInstrumented = () => {
  const guard = window as unknown as Record<string, boolean>
  if (guard[GLOBAL_GUARD]) return false
  guard[GLOBAL_GUARD] = true
  return true
}

const wrapFetch = () => {
  const originalFetch = window.fetch
  if (typeof originalFetch !== "function") return

  window.fetch = async (...args: FetchArgs): Promise<Response> => {
    const [input, init] = args
    const id = crypto.randomUUID?.() ?? `fetch_${getNow()}_${Math.random()}`
    const tsStart = getNow()
    const method = toMethod(input, init)
    const url = toUrl(input)

    try {
      const response = await originalFetch(...args)
      const tsEnd = getNow()

      postRequest({
        id,
        tsStart,
        tsEnd,
        method,
        url,
        status: response.status
      })

      return response
    } catch (error) {
      const tsEnd = getNow()

      postRequest({
        id,
        tsStart,
        tsEnd,
        method,
        url,
        status: 0
      })

      throw error
    }
  }
}

const wrapXHR = () => {
  const OriginalXHR = window.XMLHttpRequest
  if (typeof OriginalXHR !== "function") return

  function WrappedXHR(this: XMLHttpRequest) {
    const xhr = new OriginalXHR()
    let method = "GET"
    let url = ""
    let tsStart = 0
    const id = crypto.randomUUID?.() ?? `xhr_${getNow()}_${Math.random()}`

    const originalOpen = xhr.open
    xhr.open = function (
      openMethod: string,
      openUrl: string,
      async?: boolean,
      username?: string | null,
      password?: string | null
    ) {
      method = (openMethod || "GET").toUpperCase()
      url = openUrl
      return originalOpen.call(
        this,
        openMethod,
        openUrl,
        async ?? true,
        username ?? null,
        password ?? null
      )
    }

    const originalSend = xhr.send
    xhr.send = function (body?: Document | XMLHttpRequestBodyInit | null) {
      tsStart = getNow()

      const onLoadEnd = () => {
        xhr.removeEventListener("loadend", onLoadEnd)
        const tsEnd = getNow()

        postRequest({
          id,
          tsStart,
          tsEnd,
          method,
          url: xhr.responseURL || url,
          status: xhr.status
        })
      }

      xhr.addEventListener("loadend", onLoadEnd)
      return originalSend.call(this, body ?? null)
    }

    return xhr
  }

  Object.assign(WrappedXHR, OriginalXHR)
  WrappedXHR.prototype = OriginalXHR.prototype

  window.XMLHttpRequest = WrappedXHR as any
}

if (ensureInstrumented()) {
  wrapFetch()
  wrapXHR()
}
