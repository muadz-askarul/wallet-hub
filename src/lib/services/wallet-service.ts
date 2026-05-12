import { db, type Wallet, type Pocket } from "../db"

export async function createWallet(
  name: string,
  icon?: string
): Promise<Wallet> {
  const walletId = crypto.randomUUID()
  const pocketId = crypto.randomUUID()
  const now = Date.now()

  const wallet: Wallet = { id: walletId, name, icon, createdAt: now, order: 0 }
  const pocket: Pocket = {
    id: pocketId,
    walletId,
    name: `${name} pocket`,
    createdAt: now,
    order: 0,
  }

  await db.transaction("rw", db.wallets, db.pockets, async () => {
    await db.wallets.add(wallet)
    await db.pockets.add(pocket)
  })

  return wallet
}

export async function updateWallet(
  id: string,
  data: Partial<Omit<Wallet, "id" | "createdAt">>
): Promise<void> {
  await db.wallets.update(id, data)
}

export async function deleteWallet(id: string): Promise<void> {
  await db.transaction(
    "rw",
    db.wallets,
    db.pockets,
    db.transactions,
    async () => {
      await db.wallets.delete(id)
      const pockets = await db.pockets.where("walletId").equals(id).toArray()
      const pocketIds = pockets.map((p) => p.id)
      await db.pockets.bulkDelete(pocketIds)
      
      // delete all transactions in those pockets
      if (pocketIds.length > 0) {
        const txs = await db.transactions
          .where("pocketId")
          .anyOf(pocketIds)
          .toArray()
        if (txs.length > 0) {
          await db.transactions.bulkDelete(txs.map((t) => t.id))
        }
      }
    }
  )
}

export async function createPocket(
  walletId: string,
  name: string
): Promise<Pocket> {
  const pocket: Pocket = {
    id: crypto.randomUUID(),
    walletId,
    name,
    createdAt: Date.now(),
  }
  await db.pockets.add(pocket)
  return pocket
}

export async function updatePocket(
  id: string,
  data: Partial<Omit<Pocket, "id" | "walletId" | "createdAt">>
): Promise<void> {
  await db.pockets.update(id, data)
}

export async function deletePocket(id: string): Promise<void> {
  await db.pockets.update(id, { deletedAt: Date.now() })
}
