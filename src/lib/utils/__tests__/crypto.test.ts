import { describe, it, expect } from "vitest"
import { hashPin } from "../crypto"

describe("crypto utils", () => {
  it("should hash a PIN consistently", async () => {
    const pin = "1234"
    const hash1 = await hashPin(pin)
    const hash2 = await hashPin(pin)

    expect(hash1).toBe(hash2)
    expect(hash1).toHaveLength(64) // SHA-256 hex is 64 chars
  })

  it("should produce different hashes for different PINs", async () => {
    const hash1 = await hashPin("1234")
    const hash2 = await hashPin("4321")

    expect(hash1).not.toBe(hash2)
  })
})
