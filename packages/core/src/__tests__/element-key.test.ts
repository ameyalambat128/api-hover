import { buildElementKey } from "../index"

describe("buildElementKey", () => {
  it("uses the expected priority order", () => {
    const el = document.createElement("button")
    el.setAttribute("data-testid", "primary")
    el.setAttribute("aria-label", "Save")
    el.id = "save-btn"
    el.setAttribute("name", "save")
    el.setAttribute("role", "button")
    el.textContent = "Save"

    expect(buildElementKey(el)).toBe("data-testid:primary")

    el.removeAttribute("data-testid")
    expect(buildElementKey(el)).toBe("aria-label:Save")

    el.removeAttribute("aria-label")
    expect(buildElementKey(el)).toBe("id:save-btn")

    el.id = ""
    expect(buildElementKey(el)).toBe("name:save")

    el.removeAttribute("name")
    expect(buildElementKey(el)).toBe('role:button|text:Save')
  })
})
