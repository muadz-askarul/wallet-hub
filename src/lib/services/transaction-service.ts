import { db } from "../db"

export async function getPocketBalance(pocketId: string): Promise<number> {
  const pocket = await db.pockets.get(pocketId)
  const initial = pocket?.initialBalance || 0
  const transactions = await db.transactions.toArray()

  return transactions.reduce((acc, tx) => {
    if (tx.pocketId === pocketId) {
      if (tx.type === "income") return acc + tx.amount
      if (tx.type === "expense") return acc - tx.amount
      if (tx.type === "transfer") return acc - tx.amount // Outgoing transfer
    }
    if (tx.type === "transfer" && tx.destinationPocketId === pocketId) {
      return acc + tx.amount // Incoming transfer
    }
    return acc
  }, initial)
}
