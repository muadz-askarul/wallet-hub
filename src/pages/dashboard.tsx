import { useLiveQuery } from "dexie-react-hooks"
import { db } from "@/lib/db"
import {
  TransactionGroup,
  type EnrichedTransaction,
} from "@/components/transaction-group"
import { formatCurrency } from "../lib/utils"
import { getPocketBalance } from "../lib/services/transaction-service"

export function DashboardPage() {
  const data = useLiveQuery(
    async () => {
      const pockets = await db.pockets.toArray()
      const wallets = await db.wallets.toArray()
      const categories = await db.categories.toArray()

      let assets = 0
      let liabilities = 0

      for (const pocket of pockets) {
        if (pocket.deletedAt) continue
        const balance = await getPocketBalance(pocket.id)
        if (balance >= 0) assets += balance
        else liabilities += Math.abs(balance)
      }

      // Fetch more transactions for better grouping visibility
      const txs = await db.transactions
        .orderBy("date")
        .reverse()
        .limit(200) // Limit to 200 just for safety, but we'll break after 5 days
        .toArray()

      const grouped: Record<
        string,
        {
          date: Date
          income: number
          expense: number
          transactions: EnrichedTransaction[]
        }
      > = {}

      let daysCount = 0

      for (const tx of txs) {
        const d = new Date(tx.date)
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
          2,
          "0"
        )}-${String(d.getDate()).padStart(2, "0")}`

        if (!grouped[dateStr]) {
          if (daysCount >= 5) {
            break // Stop collecting after 5 unique days
          }
          grouped[dateStr] = {
            date: d,
            income: 0,
            expense: 0,
            transactions: [],
          }
          daysCount++
        }

        if (tx.type === "income") grouped[dateStr].income += tx.amount
        if (tx.type === "expense") grouped[dateStr].expense += tx.amount

        const category = categories.find((c) => c.id === tx.categoryId)
        const pocket = pockets.find((p) => p.id === tx.pocketId)
        const wallet = pocket
          ? wallets.find((w) => w.id === pocket.walletId)
          : undefined

        // Simple fallback icons
        const fallbackIcon =
          tx.type === "income" ? "💵" : tx.type === "transfer" ? "↔️" : "🛒"

        grouped[dateStr].transactions.push({
          ...tx,
          categoryName:
            category?.name ||
            (tx.type === "transfer" ? "Transfer" : "Uncategorized"),
          categoryIcon: category?.icon || fallbackIcon,
          pocketName: pocket?.name || "Unknown Pocket",
          walletName: wallet?.name || "Unknown Wallet",
        })
      }

      const transactionGroups = Object.values(grouped).sort(
        (a, b) => b.date.getTime() - a.date.getTime()
      )

      return {
        assets,
        liabilities,
        total: assets - liabilities,
        transactionGroups,
      }
    },
    [],
    { assets: 0, liabilities: 0, total: 0, transactionGroups: [] }
  )

  return (
    <div className="p-6 pb-24">
      <div className="mt-4 mb-8 flex flex-col items-center justify-center">
        <h2 className="text-5xl font-bold tracking-tight text-primary">
          Rp {formatCurrency(data.total)}
        </h2>
      </div>

      <div className="mb-8 flex h-14 w-full overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="flex flex-1 flex-col justify-center px-4 py-2 text-center">
          <p className="text-[10px] tracking-wider text-muted-foreground uppercase">
            Assets
          </p>
          <h2 className="text-sm leading-tight font-bold">
            Rp {formatCurrency(data.assets)}
          </h2>
        </div>
        <div className="flex flex-1 flex-col justify-center border-l bg-muted/30 px-4 py-2 text-center">
          <p className="text-[10px] tracking-wider text-muted-foreground uppercase">
            Liabilities
          </p>
          <h2 className="text-sm leading-tight font-bold">
            Rp {formatCurrency(data.liabilities)}
          </h2>
        </div>
      </div>

      <div>
        <h3 className="mb-4 text-lg font-medium">Recent Transactions</h3>
        {data.transactionGroups.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No recent transactions.
          </p>
        ) : (
          <div className="space-y-6">
            {data.transactionGroups.map((group) => (
              <TransactionGroup key={group.date.toISOString()} group={group} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
