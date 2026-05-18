import { useState } from "react"
import { useLiveQuery } from "dexie-react-hooks"
import { db } from "@/lib/db"
import {
  TransactionGroup,
  type EnrichedTransaction,
} from "@/components/transaction-group"
import { formatCurrency } from "../lib/utils"
import { getPocketBalance } from "../lib/services/transaction-service"
import { triggerReminderPayment } from "@/lib/services/recurring-service"
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

      // Load upcoming reminders within 1 month from today (by calendar date)
      const now = new Date()
      const oneMonthLater = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        now.getDate()
      ).getTime()

      const reminders = await db.schedules
        .where("type")
        .equals("bill")
        .filter((s) => s.isActive === 1 && s.nextDueDate <= oneMonthLater)
        .toArray()

      const sortedReminders = reminders
        .sort((a, b) => a.nextDueDate - b.nextDueDate)
        .slice(0, 5)

      const enrichedReminders = sortedReminders.map((b) => {
        const pocket = pockets.find((pk) => pk.id === b.pocketId)
        const wallet = pocket
          ? wallets.find((wl) => wl.id === pocket.walletId)
          : undefined
        const category = categories.find((cg) => cg.id === b.categoryId)

        return {
          ...b,
          pocketName: pocket?.name || "Unknown Pocket",
          walletName: wallet?.name || "Unknown Wallet",
          categoryName: category?.name || "Adjustment",
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
            (tx.type === "transfer" ? "Transfer" : "Adjustment"),
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
        enrichedReminders,
      }
    },
    [],
    {
      assets: 0,
      liabilities: 0,
      total: 0,
      transactionGroups: [],
      enrichedReminders: [],
    }
  )

  const handlePayReminder = async (id: string, note: string) => {
    setProcessingId(id)
    try {
      await triggerReminderPayment(id)
      toast.success(`Reminder completed: ${note}`)
    } catch (err) {
      console.error(err)
      toast.error("Failed to complete reminder payment")
    } finally {
      setProcessingId(null)
    }
  }

  return (
    <div>
      <div className="sticky top-0 z-10 bg-background px-6 pt-6 pb-2">
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

        {/* Reminders due this month widget */}
        {data.enrichedReminders && data.enrichedReminders.length > 0 && (
          <div className="mb-4">
            <div className="mb-3 flex items-center justify-between px-1">
              <h3 className="text-base font-bold text-foreground">Reminders</h3>
            </div>
            <div className="-mx-6 flex snap-x snap-mandatory scroll-pr-6 scroll-pl-6 gap-3 overflow-x-auto scroll-smooth px-6 pb-2 [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {data.enrichedReminders.map((reminder) => (
                <div
                  key={reminder.id}
                  className="flex w-[180px] shrink-0 snap-start flex-col gap-2 rounded-xl border bg-card p-2.5 shadow-sm"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                      style={{
                        backgroundColor: reminder.categoryColor
                          ? `${reminder.categoryColor}15`
                          : "#6b728015",
                      }}
                    >
                      {reminder.categoryIcon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs leading-tight font-bold text-foreground">
                        {reminder.note || reminder.categoryName}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-1">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[10px] font-medium text-muted-foreground">
                        {new Date(reminder.nextDueDate).toLocaleDateString(
                          "id-ID",
                          {
                            day: "numeric",
                            month: "short",
                          }
                        )}
                      </p>
                      <p className="truncate text-[10px] font-bold text-foreground">
                        Rp {formatCurrency(reminder.amount)}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      className="h-7 cursor-pointer rounded-lg px-2.5 text-[10px] font-black transition-all hover:scale-[1.02] active:scale-[0.98]"
                      disabled={processingId === reminder.id}
                      onClick={() =>
                        handlePayReminder(
                          reminder.id,
                          reminder.note || "Reminder"
                        )
                      }
                    >
                      {processingId === reminder.id ? (
                        "..."
                      ) : (
                        <>
                          Pay <Check className="ml-1 size-3" />
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))}
              {/* See All Card */}
              <Link
                to="/reminders"
                className="flex w-[120px] shrink-0 snap-start flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed bg-muted/30 transition-colors hover:bg-muted/50"
              >
                <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <ChevronRight className="size-5" />
                </div>
                <span className="text-xs font-bold text-foreground">
                  See All
                </span>
              </Link>
            </div>
          </div>
        )}
        <h3 className="mt-4 mb-4 text-lg font-medium">Recent Transactions</h3>
      </div>

      <div className="px-6 pt-2 pb-6">
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
