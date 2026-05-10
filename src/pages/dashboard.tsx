import { useLiveQuery } from "dexie-react-hooks"
import { db } from "@/lib/db"
import { getPocketBalance } from "@/lib/services/transaction-service"
import { formatCurrency, cn } from "@/lib/utils"

import { Transaction } from "@/lib/db"

type EnrichedTransaction = Transaction & {
  categoryName: string
  categoryIcon: string
  pocketName: string
  walletName: string
}

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
        .limit(50)
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

      for (const tx of txs) {
        const d = new Date(tx.date)
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
          2,
          "0"
        )}-${String(d.getDate()).padStart(2, "0")}`

        if (!grouped[dateStr]) {
          grouped[dateStr] = {
            date: d,
            income: 0,
            expense: 0,
            transactions: [],
          }
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
          <div className="space-y-8">
            {data.transactionGroups.map((group) => (
              <div key={group.date.toISOString()} className="space-y-3">
                {/* Group Header */}
                <div className="flex items-center justify-between border-b border-muted/20 px-1 pb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl font-bold tracking-tighter">
                      {String(group.date.getDate()).padStart(2, "0")}
                    </span>
                    <div className="flex flex-col items-start leading-tight">
                      <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
                        {group.date.toLocaleDateString("en-US", {
                          weekday: "short",
                        })}
                      </span>
                      <span className="mt-0.5 text-[10px] font-medium text-muted-foreground">
                        {String(group.date.getMonth() + 1).padStart(2, "0")}.
                        {group.date.getFullYear()}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm font-medium">
                    {group.income > 0 && (
                      <span className="text-primary">
                        Rp {formatCurrency(group.income)}
                      </span>
                    )}
                    {group.expense > 0 && (
                      <span className="text-destructive">
                        Rp {formatCurrency(group.expense)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Transactions List */}
                <div className="space-y-1">
                  {group.transactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between rounded-lg px-2 py-2.5 transition-colors hover:bg-muted/30"
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-4">
                        <div className="flex w-28 shrink-0 items-center gap-2">
                          <span className="text-lg">{tx.categoryIcon}</span>
                          <span className="truncate text-sm text-muted-foreground">
                            {tx.categoryName}
                          </span>
                        </div>
                        <div className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate text-[15px] font-medium">
                            {tx.note || "Adjustment"}
                          </span>
                          <span className="truncate text-xs text-muted-foreground">
                            [{tx.walletName}] {tx.pocketName}
                          </span>
                        </div>
                      </div>
                      <span
                        className={cn(
                          "ml-3 shrink-0 text-[15px] font-medium",
                          tx.type === "income"
                            ? "text-primary"
                            : tx.type === "expense"
                              ? "text-destructive"
                              : "text-foreground"
                        )}
                      >
                        Rp {formatCurrency(tx.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
