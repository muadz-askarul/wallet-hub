import { useState } from "react"
import { useLiveQuery } from "dexie-react-hooks"
import { db } from "@/lib/db"
import {
  TransactionGroup,
  type EnrichedTransaction,
} from "@/components/transaction-group"
import { formatCurrency } from "../lib/utils"
import { getPocketBalance } from "../lib/services/transaction-service"
import { triggerBillPayment } from "@/lib/services/recurring-service"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { ChevronRight, Check } from "lucide-react"

export function DashboardPage() {
  const [processingId, setProcessingId] = useState<string | null>(null)

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

      // Load upcoming bills for the current month
      const now = new Date()
      const endOfMonth = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        1
      ).getTime()

      const bills = await db.schedules
        .where("type")
        .equals("bill")
        .filter((s) => s.isActive === 1 && s.nextDueDate <= endOfMonth)
        .toArray()

      const enrichedBills = bills.map((b) => {
        const pocket = pockets.find((pk) => pk.id === b.pocketId)
        const wallet = pocket
          ? wallets.find((wl) => wl.id === pocket.walletId)
          : undefined
        const category = categories.find((cg) => cg.id === b.categoryId)

        return {
          ...b,
          pocketName: pocket?.name || "Unknown Pocket",
          walletName: wallet?.name || "Unknown Wallet",
          categoryName: category?.name || "Uncategorized",
          categoryIcon: category?.icon || "📋",
          categoryColor: category?.color || "#6b7280",
        }
      })

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
        enrichedBills,
      }
    },
    [],
    {
      assets: 0,
      liabilities: 0,
      total: 0,
      transactionGroups: [],
      enrichedBills: [],
    }
  )

  const handlePayBill = async (id: string, note: string) => {
    setProcessingId(id)
    try {
      await triggerBillPayment(id)
      toast.success(`Bill completed: ${note}`)
    } catch (err) {
      console.error(err)
      toast.error("Failed to complete bill payment")
    } finally {
      setProcessingId(null)
    }
  }

  return (
    <div className="flex h-[calc(100svh-8rem)] flex-col overflow-hidden">
      <div className="shrink-0 px-6 pt-6 pb-2">
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

        {/* Bills due this month widget */}
        {data.enrichedBills && data.enrichedBills.length > 0 && (
          <div className="mb-4">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-medium text-foreground">Bills</h3>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scroll-smooth -mx-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <div className="w-6 shrink-0" /> {/* Left padding spacer */}
              {data.enrichedBills.map((bill) => (
                <div
                  key={bill.id}
                  className="flex w-[240px] shrink-0 flex-col justify-between gap-4 snap-start rounded-2xl border bg-card p-4 shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="flex size-10 shrink-0 items-center justify-center rounded-full text-base font-semibold"
                      style={{
                        backgroundColor: bill.categoryColor
                          ? `${bill.categoryColor}15`
                          : "#6b728015",
                      }}
                    >
                      {bill.categoryIcon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {bill.note || bill.categoryName}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Due{" "}
                        {new Date(bill.nextDueDate).toLocaleDateString(
                          "id-ID",
                          {
                            day: "numeric",
                            month: "short",
                          }
                        )}{" "}
                        • {bill.walletName}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    <span className="text-lg font-bold text-foreground">
                      Rp {formatCurrency(bill.amount)}
                    </span>
                    <Button
                      size="sm"
                      className="w-full cursor-pointer rounded-xl font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
                      disabled={processingId === bill.id}
                      onClick={() => handlePayBill(bill.id, bill.note || "Bill")}
                    >
                      {processingId === bill.id ? (
                        "..."
                      ) : (
                        <>
                          Pay Bill <Check className="ml-1.5 size-4" />
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))}

              {/* See All Card */}
              <Link
                to="/bills"
                className="flex w-[160px] shrink-0 snap-start flex-col items-center justify-center gap-2 rounded-2xl border border-dashed bg-muted/30 transition-colors hover:bg-muted/50"
              >
                <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <ChevronRight className="size-6" />
                </div>
                <span className="text-sm font-semibold text-foreground">
                  See All ({data.enrichedBills.length})
                </span>
              </Link>
              <div className="w-6 shrink-0" /> {/* Right padding spacer */}
            </div>
          </div>
        )}
        <h3 className="mt-4 mb-4 text-lg font-medium">Recent Transactions</h3>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pt-2 pb-24">
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
