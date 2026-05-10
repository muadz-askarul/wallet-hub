import { describe, it, expect } from "vitest"
import { db } from "../db"

describe("Database Initialization", () => {
  it("should have defined tables", () => {
    expect(db.wallets).toBeDefined()
    expect(db.pockets).toBeDefined()
    expect(db.categories).toBeDefined()
    expect(db.transactions).toBeDefined()
    expect(db.settings).toBeDefined()
  })
})
