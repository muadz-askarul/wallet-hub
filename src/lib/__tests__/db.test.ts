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

  it("wallet interface should have order field", () => {
    // Schema type check via TypeScript — verified at compile time
    const wallet: import("../db").Wallet = {
      id: "1",
      name: "Test",
      createdAt: Date.now(),
      order: 0,
    }
    expect(wallet.order).toBe(0)
  })

  it("pocket interface should have order field", () => {
    const pocket: import("../db").Pocket = {
      id: "1",
      walletId: "w1",
      name: "Pocket",
      createdAt: Date.now(),
      order: 0,
    }
    expect(pocket.order).toBe(0)
  })

  it("category interface should have color field", () => {
    const cat: import("../db").Category = {
      id: "1",
      name: "Shopping",
      type: "expense",
      color: "#ff0000",
    }
    expect(cat.color).toBe("#ff0000")
  })
})
