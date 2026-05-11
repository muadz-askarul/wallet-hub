import { useState, useMemo } from "react"
import { useLiveQuery } from "dexie-react-hooks"
import { db } from "@/lib/db"
import { cn, formatCurrency } from "@/lib/utils"
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
import {
  TransactionGroup,
  type EnrichedTransaction,
} from "@/components/transaction-group"

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

  const summary = useMemo(() => {
    if (!data) return { income: 0, expense: 0, net: 0 }
    const income = data.reduce((s, g) => s + g.income, 0)
    const expense = data.reduce((s, g) => s + g.expense, 0)
    return { income, expense, net: income - expense }
  }, [data])

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
        {/* Monthly Summary Card */}
        {!showAll && (
          <div className="mb-4 overflow-hidden rounded-xl border bg-card shadow-sm">
            <div className="flex divide-x">
              <div className="flex flex-1 flex-col items-center py-3">
                <span className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                  Income
                </span>
                <span className="mt-0.5 text-sm font-bold text-primary">
                  {formatCurrency(summary.income)}
                </span>
              </div>
              <div className="flex flex-1 flex-col items-center py-3">
                <span className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                  Expense
                </span>
                <span className="mt-0.5 text-sm font-bold text-destructive">
                  {formatCurrency(summary.expense)}
                </span>
              </div>
              <div className="flex flex-1 flex-col items-center py-3">
                <span className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                  Total
                </span>
                <span
                  className={cn(
                    "mt-0.5 text-sm font-bold",
                    summary.net >= 0 ? "text-primary" : "text-destructive"
                  )}
                >
                  {formatCurrency(summary.net)}
                </span>
              </div>
            </div>
          </div>
        )}

        {data.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center text-muted-foreground">
            <p>No transactions found.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {data.map((group) => (
              <TransactionGroup key={group.date.toISOString()} group={group} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
