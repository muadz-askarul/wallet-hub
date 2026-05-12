import { describe, it, expect } from "vitest"
import { calculateNextDueDate } from "../date-calculator"

describe("calculateNextDueDate", () => {
  it("Every Day", () => {
    const start = new Date(2026, 4, 1) // May 1
    const next = calculateNextDueDate(start, "Every Day")
    expect(next.getDate()).toBe(2)
  })

  it("Weekdays advances on weekend", () => {
    const friday = new Date(2026, 4, 8) // Friday, May 8
    const next = calculateNextDueDate(friday, "Weekdays")
    expect(next.getDay()).toBe(1) // Monday, May 11
  })

  it("The end of the month handles different lengths", () => {
    const endJan = new Date(2026, 0, 31) // Jan 31
    const next = calculateNextDueDate(endJan, "The end of the month")
    expect(next.getDate()).toBe(28) // Feb 28
  })
})
