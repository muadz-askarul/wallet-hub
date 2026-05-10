import { db, type Wallet, type Pocket } from "../db"

export async function createWallet(
  name: string,
  icon?: string
): Promise<Wallet> {
  const walletId = crypto.randomUUID()
  const pocketId = crypto.randomUUID()
  const now = Date.now()

  const wallet: Wallet = { id: walletId, name, icon, createdAt: now }
  const pocket: Pocket = {
    id: pocketId,
    walletId,
    name: `${name} pocket`,
    createdAt: now,
  }

  await db.transaction("rw", db.wallets, db.pockets, async () => {
    await db.wallets.add(wallet)
    await db.pockets.add(pocket)
  })

  return wallet
}
