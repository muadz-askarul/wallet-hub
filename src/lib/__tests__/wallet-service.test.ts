import "fake-indexeddb/auto"
import { describe, it, expect, beforeEach } from "vitest"
import { db } from "../db"
import { createWallet } from "../services/wallet-service"

describe("Wallet Service", () => {
  beforeEach(async () => {
    await db.wallets.clear()
    await db.pockets.clear()
  })

  it("should create a wallet and a default pocket", async () => {
    const wallet = await createWallet("Cash")
    expect(wallet.name).toBe("Cash")

    const pockets = await db.pockets
      .where("walletId")
      .equals(wallet.id)
      .toArray()
    expect(pockets.length).toBe(1)
    expect(pockets[0].name).toBe("Cash pocket")
  })
})
