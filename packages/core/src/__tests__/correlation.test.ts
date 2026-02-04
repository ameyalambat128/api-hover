import {
  linkRequestToInteraction,
  type Interaction,
  type NetworkRequest
} from "../index"

describe("linkRequestToInteraction", () => {
  it("links requests within the window", () => {
    const interactions: Interaction[] = [
      {
        id: "i1",
        ts: 1000,
        type: "click",
        elementKey: "button",
        elementMeta: { tagName: "button" }
      }
    ]

    const request: NetworkRequest = {
      id: "r1",
      tsStart: 2100,
      tsEnd: 2150,
      method: "GET",
      url: "/api",
      status: 200
    }

    const linked = linkRequestToInteraction(interactions, request, 1500)
    expect(linked?.id).toBe("i1")
  })

  it("returns null outside the window", () => {
    const interactions: Interaction[] = [
      {
        id: "i2",
        ts: 1000,
        type: "click",
        elementKey: "button",
        elementMeta: { tagName: "button" }
      }
    ]

    const request: NetworkRequest = {
      id: "r2",
      tsStart: 4000,
      tsEnd: 4200,
      method: "POST",
      url: "/api/submit",
      status: 201
    }

    const linked = linkRequestToInteraction(interactions, request, 1500)
    expect(linked).toBeNull()
  })
})
