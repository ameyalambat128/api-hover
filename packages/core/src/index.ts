export type ElementKey = string

export type InteractionType = "click" | "submit" | "enter"

export interface ElementMeta {
  tagName: string
  id?: string
  name?: string
  role?: string
  ariaLabel?: string
  dataTestId?: string
  text?: string
  classes?: string[]
  selector?: string
}

export interface Interaction {
  id: string
  ts: number
  type: InteractionType
  elementKey: ElementKey
  elementMeta: ElementMeta
}

export interface NetworkRequest {
  id: string
  tsStart: number
  tsEnd: number
  method: string
  url: string
  status: number
}

export const DEFAULT_LINK_WINDOW_MS = 1500

const truncate = (value: string | null | undefined, max = 80) => {
  if (!value) return undefined
  const trimmed = value.trim()
  if (!trimmed) return undefined
  return trimmed.length > max ? `${trimmed.slice(0, max)}…` : trimmed
}

const cssEscape = (value: string) => {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
    return CSS.escape(value)
  }
  return value.replace(/[^a-zA-Z0-9_-]/g, "\\$&")
}

const cssPath = (element: Element): string => {
  const parts: string[] = []
  let current: Element | null = element

  while (current && current.nodeType === Node.ELEMENT_NODE && parts.length < 5) {
    const tagName = current.tagName.toLowerCase()
    if (!tagName) break

    if (current.id) {
      parts.unshift(`${tagName}#${cssEscape(current.id)}`)
      break
    }

    let selector = tagName
    const className =
      typeof current.className === "string"
        ? current.className.trim().split(/\s+/).filter(Boolean)
        : []

    if (className.length > 0) {
      selector += `.${className.slice(0, 2).map(cssEscape).join(".")}`
    }

    const parent = current.parentElement
    if (parent) {
      const siblings = Array.from(parent.children).filter(
        (child) => child.tagName === current?.tagName
      )

      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1
        selector += `:nth-of-type(${index})`
      }
    }

    parts.unshift(selector)
    current = current.parentElement
  }

  return parts.join(" > ")
}

export const getElementMeta = (element: Element): ElementMeta => {
  const tagName = element.tagName.toLowerCase()
  const dataTestId = truncate(element.getAttribute("data-testid"))
  const ariaLabel = truncate(element.getAttribute("aria-label"))
  const id = truncate(element.id)
  const name = truncate(element.getAttribute("name"))
  const role = truncate(element.getAttribute("role"))
  const text = truncate(element.textContent)
  const classes =
    typeof element.className === "string"
      ? element.className.trim().split(/\s+/).filter(Boolean).slice(0, 4)
      : undefined

  return {
    tagName,
    dataTestId,
    ariaLabel,
    id,
    name,
    role,
    text,
    classes,
    selector: cssPath(element)
  }
}

export const buildElementKey = (element: Element): ElementKey => {
  const dataTestId = truncate(element.getAttribute("data-testid"))
  if (dataTestId) return `data-testid:${dataTestId}`

  const ariaLabel = truncate(element.getAttribute("aria-label"))
  if (ariaLabel) return `aria-label:${ariaLabel}`

  const id = truncate(element.id)
  if (id) return `id:${id}`

  const name = truncate(element.getAttribute("name"))
  if (name) return `name:${name}`

  const role = truncate(element.getAttribute("role"))
  const text = truncate(element.textContent, 60)
  if (role && text) return `role:${role}|text:${text}`

  const selector = cssPath(element)
  return `css:${selector || element.tagName.toLowerCase()}`
}

export const linkRequestToInteraction = (
  interactions: Interaction[],
  request: NetworkRequest,
  linkWindowMs: number = DEFAULT_LINK_WINDOW_MS
): Interaction | null => {
  if (interactions.length === 0) return null
  const latestAllowed = request.tsStart
  const earliestAllowed = request.tsStart - linkWindowMs

  for (let index = interactions.length - 1; index >= 0; index -= 1) {
    const interaction = interactions[index]
    if (interaction.ts > latestAllowed) continue
    if (interaction.ts < earliestAllowed) break
    return interaction
  }

  return null
}
