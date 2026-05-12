import "fake-indexeddb/auto"
import { describe, it, expect, beforeEach } from "vitest"
import { db } from "../db"
import {
  createWallet,
  updateWallet,
  deleteWallet,
  createPocket,
  updatePocket,
  deletePocket,
} from "../services/wallet-service"

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
    expect(pockets[0].name).toBe("Cash's Pocket")
  })

  it("updates a wallet", async () => {
    const wallet = await createWallet("Test Wallet")
    await updateWallet(wallet.id, { name: "Updated Wallet" })
    const updated = await db.wallets.get(wallet.id)
    expect(updated?.name).toBe("Updated Wallet")
  })

  it("deletes a wallet and cascades", async () => {
    const wallet = await createWallet("Delete Wallet")
    const pocket = await db.pockets.where("walletId").equals(wallet.id).first()
    await db.transactions.add({
      id: crypto.randomUUID(),
      pocketId: pocket!.id,
      amount: 100,
      type: "income",
      date: Date.now(),
      note: "test",
    })

    await deleteWallet(wallet.id)

    expect(await db.wallets.get(wallet.id)).toBeUndefined()
    const pockets = await db.pockets
      .where("walletId")
      .equals(wallet.id)
      .toArray()
    expect(pockets.length).toBe(0)
    const txs = await db.transactions
      .where("pocketId")
      .equals(pocket!.id)
      .toArray()
    expect(txs.length).toBe(0)
  })

  it("creates a pocket", async () => {
    const wallet = await createWallet("Wallet")
    const pocket = await createPocket(wallet.id, "New Pocket")
    expect(pocket.walletId).toBe(wallet.id)
    expect(pocket.name).toBe("New Pocket")
  })

  it("updates a pocket", async () => {
    const wallet = await createWallet("Wallet")
    const pocket = await db.pockets.where("walletId").equals(wallet.id).first()
    await updatePocket(pocket!.id, { name: "Updated Pocket" })
    const updated = await db.pockets.get(pocket!.id)
    expect(updated?.name).toBe("Updated Pocket")
  })

  it("soft deletes a pocket", async () => {
    const wallet = await createWallet("Wallet")
    const pocket = await db.pockets.where("walletId").equals(wallet.id).first()

    await deletePocket(pocket!.id)

    const softDeleted = await db.pockets.get(pocket!.id)
    expect(softDeleted?.deletedAt).toBeDefined()
  })
})
