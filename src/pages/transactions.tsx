import { useState } from "react"
import { useLiveQuery } from "dexie-react-hooks"
import { db, type Transaction } from "@/lib/db"
import { formatCurrency, cn } from "@/lib/utils"
import { Link } from "react-router-dom"
import {
  ChevronLeft,
  ChevronRight,
  Receipt,
  PieChart,
  Target,
  ChevronsLeftRightEllipsis,
} from "lucide-react"
import { Button } from "@/components/ui/button"

type EnrichedTransaction = Transaction & {
  categoryName: string
  categoryIcon: string
  pocketName: string
  walletName: string
}

export function TransactionsPage() {
  const [currentDate, setCurrentDate] = useState(() => {
    const d = new Date()
    d.setDate(1)
    d.setHours(0, 0, 0, 0)
    return d
  })
  const [showAll, setShowAll] = useState(false)

  const data = useLiveQuery(
    async () => {
      const pockets = await db.pockets.toArray()
      const wallets = await db.wallets.toArray()
      const categories = await db.categories.toArray()

      const txs = await db.transactions.orderBy("date").reverse().toArray()

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

        // Filter by month if showAll is false
        if (!showAll) {
          if (
            d.getMonth() !== currentDate.getMonth() ||
            d.getFullYear() !== currentDate.getFullYear()
          ) {
            continue
          }
        }

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

      return transactionGroups
    },
    [currentDate, showAll],
    []
  )

  const handlePrevMonth = () => {
    setCurrentDate((prev) => {
      const d = new Date(prev)
      d.setMonth(d.getMonth() - 1)
      return d
    })
  }

  const handleNextMonth = () => {
    setCurrentDate((prev) => {
      const d = new Date(prev)
      d.setMonth(d.getMonth() + 1)
      return d
    })
  }

  const monthYearLabel = currentDate.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  })

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="sticky top-0 z-20 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur supports-backdrop-filter:bg-background/60">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePrevMonth}
            disabled={showAll}
            className="h-8 w-8 text-muted-foreground"
          >
            <ChevronLeft className="size-5" />
          </Button>
          <span
            className={cn(
              "w-20 text-center text-sm font-semibold",
              showAll && "opacity-50"
            )}
          >
            {monthYearLabel}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleNextMonth}
            disabled={showAll}
            className="h-8 w-8 text-muted-foreground"
          >
            <ChevronRight className="size-5" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={showAll ? "secondary" : "ghost"}
            size="icon"
            onClick={() => setShowAll(!showAll)}
            className="size-9"
          >
            <ChevronsLeftRightEllipsis
              className={cn("size-5", showAll && "text-primary")}
            />
            <span className="sr-only">Toggle Show All</span>
          </Button>
          <div className="mx-1 h-6 w-px bg-accent-foreground"></div>
          <Link to="/bills">
            <Button variant="ghost" size="icon" className="size-9">
              <Receipt className="size-5" />
            </Button>
          </Link>
          <Link to="/budget">
            <Button variant="ghost" size="icon" className="size-9">
              <PieChart className="size-5" />
            </Button>
          </Link>
          <Link to="/goals">
            <Button variant="ghost" size="icon" className="size-9">
              <Target className="size-5" />
            </Button>
          </Link>
        </div>
      </div>

      <div className="p-4">
        {data.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center text-muted-foreground">
            <p>No transactions found.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {data.map((group) => (
              <div
                key={group.date.toISOString()}
                className="overflow-hidden rounded-xl border bg-card shadow-sm"
              >
                {/* Group Header */}
                <div className="flex items-center justify-between border-b bg-muted/30 px-4 py-3">
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
                <div className="space-y-2 p-4">
                  {group.transactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between rounded-lg border px-4 py-3 transition-colors hover:bg-muted/50"
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
                            {tx.pocketName}
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
