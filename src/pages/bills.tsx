import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useLiveQuery } from "dexie-react-hooks"
import { db } from "@/lib/db"
import { triggerBillPayment } from "@/lib/services/recurring-service"
import { formatCurrency } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import {
  ArrowLeft,
  Calendar,
  CreditCard,
  Repeat,
  Check,
  Trash2,
  Wallet as WalletIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"

export function BillsPage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<"bills" | "templates">("bills")
  const [processingId, setProcessingId] = useState<string | null>(null)

  // Load all schedules, wallets, pockets, and categories
  const schedules = useLiveQuery(() => db.schedules.where("isActive").equals(1).toArray(), [], [])
  const wallets = useLiveQuery(() => db.wallets.toArray(), [], [])
  const pockets = useLiveQuery(() => db.pockets.toArray(), [], [])
  const categories = useLiveQuery(() => db.categories.toArray(), [], [])

  const handleCompleteBill = async (id: string, note: string) => {
    setProcessingId(id)
    try {
      await triggerBillPayment(id)
      toast.success(`Completed bill payment: ${note}`)
    } catch (err) {
      console.error(err)
      toast.error("Failed to complete bill payment")
    } finally {
      setProcessingId(null)
    }
  }

  const handleDeactivateSchedule = async (id: string) => {
    try {
      await db.schedules.update(id, { isActive: 0 })
      toast.success("Schedule deactivated successfully")
    } catch (err) {
      console.error(err)
      toast.error("Failed to deactivate schedule")
    }
  }

  // Filter bills vs auto-repeat templates
  const bills = schedules?.filter((s) => s.type === "bill") || []
  const templates = schedules?.filter((s) => s.type === "repeat") || []

  const formatDate = (timestamp: number) => {
    const d = new Date(timestamp)
    return d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  }

  return (
    <>
      {/* Sticky Header — Matches standard form header */}
      <div className="sticky top-0 z-20 flex h-16 items-center border-b bg-background/95 px-4 backdrop-blur supports-backdrop-filter:bg-background/60">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="-ml-2 h-10 w-10 shrink-0"
        >
          <ArrowLeft className="size-5" />
        </Button>
        <h1 className="ml-2 text-lg font-bold">Recurring & Schedules</h1>
      </div>

      <div className="p-4 pb-24">
        {/* Segmented Tab Control */}
        <div className="mb-6 flex rounded-xl bg-muted p-1">
          <button
            type="button"
            onClick={() => setActiveTab("bills")}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-center text-sm font-semibold transition-all cursor-pointer",
              activeTab === "bills"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <CreditCard className="size-4" />
            Active Bills ({bills.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("templates")}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-center text-sm font-semibold transition-all cursor-pointer",
              activeTab === "templates"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Repeat className="size-4" />
            Auto-Repeats ({templates.length})
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === "bills" ? (
          <div className="space-y-4">
            {bills.length === 0 ? (
              <div className="flex min-h-[40vh] flex-col items-center justify-center p-6 text-center">
                <div className="mb-4 rounded-full bg-primary/10 p-4 text-primary">
                  <CreditCard className="h-10 w-10" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">No active bills</h3>
                <p className="max-w-xs text-sm text-muted-foreground">
                  Create a manual bill from the New Transaction page to track upcoming items.
                </p>
              </div>
            ) : (
              bills.map((bill) => {
                const p = pockets?.find((pk) => pk.id === bill.pocketId)
                const w = wallets?.find((wl) => wl.id === p?.walletId)
                const c = categories?.find((cg) => cg.id === bill.categoryId)
                const destP = pockets?.find((pk) => pk.id === bill.destinationPocketId)
                const destW = wallets?.find((wl) => wl.id === destP?.walletId)

                return (
                  <div
                    key={bill.id}
                    className="overflow-hidden rounded-2xl border bg-card p-4 shadow-sm transition-all hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        {/* Category Icon */}
                        {bill.transactionType !== "transfer" ? (
                          <div
                            className="flex size-10 shrink-0 items-center justify-center rounded-full text-base font-semibold"
                            style={{
                              backgroundColor: c?.color ? `${c.color}15` : "#6b728015",
                            }}
                          >
                            {c?.icon || "📦"}
                          </div>
                        ) : (
                          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-blue-500/15 text-base font-semibold">
                            🔁
                          </div>
                        )}

                        <div>
                          <p className="font-semibold text-foreground text-sm">
                            {bill.note || (bill.transactionType === "transfer" ? "Transfer" : c?.name || "Expense")}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <WalletIcon className="size-3" />
                              {bill.transactionType === "transfer"
                                ? `${w?.name} (${p?.name}) → ${destW?.name} (${destP?.name})`
                                : `${w?.name} (${p?.name})`}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1 font-medium text-amber-500 dark:text-amber-400">
                              <Calendar className="size-3" />
                              {bill.period}
                            </span>
                          </div>
                          <p className="mt-2 text-xs font-medium text-muted-foreground">
                            Next due: <span className="text-foreground font-semibold">{formatDate(bill.nextDueDate)}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-3 shrink-0">
                        <span className="font-bold text-foreground text-sm">
                          Rp {formatCurrency(bill.amount)}
                        </span>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="destructive"
                            size="icon"
                            className="size-8"
                            onClick={() => handleDeactivateSchedule(bill.id)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                          <Button
                            size="sm"
                            className="h-8 gap-1 rounded-lg px-2 text-xs cursor-pointer"
                            disabled={processingId === bill.id}
                            onClick={() => handleCompleteBill(bill.id, bill.note || "Bill")}
                          >
                            {processingId === bill.id ? (
                              "..."
                            ) : (
                              <>
                                <Check className="size-3" />
                                Pay
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {templates.length === 0 ? (
              <div className="flex min-h-[40vh] flex-col items-center justify-center p-6 text-center">
                <div className="mb-4 rounded-full bg-primary/10 p-4 text-primary">
                  <Repeat className="h-10 w-10" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">No auto-repeat items</h3>
                <p className="max-w-xs text-sm text-muted-foreground">
                  Set up automated transactions inside the New Transaction form to make them record themselves!
                </p>
              </div>
            ) : (
              templates.map((template) => {
                const p = pockets?.find((pk) => pk.id === template.pocketId)
                const w = wallets?.find((wl) => wl.id === p?.walletId)
                const c = categories?.find((cg) => cg.id === template.categoryId)
                const destP = pockets?.find((pk) => pk.id === template.destinationPocketId)
                const destW = wallets?.find((wl) => wl.id === destP?.walletId)

                return (
                  <div
                    key={template.id}
                    className="overflow-hidden rounded-2xl border bg-card p-4 shadow-sm transition-all hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        {/* Category Icon */}
                        {template.transactionType !== "transfer" ? (
                          <div
                            className="flex size-10 shrink-0 items-center justify-center rounded-full text-base font-semibold"
                            style={{
                              backgroundColor: c?.color ? `${c.color}15` : "#6b728015",
                            }}
                          >
                            {c?.icon || "📦"}
                          </div>
                        ) : (
                          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-blue-500/15 text-base font-semibold">
                            🔁
                          </div>
                        )}

                        <div>
                          <p className="font-semibold text-foreground text-sm">
                            {template.note || (template.transactionType === "transfer" ? "Transfer" : c?.name || "Expense")}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <WalletIcon className="size-3" />
                              {template.transactionType === "transfer"
                                ? `${w?.name} (${p?.name}) → ${destW?.name} (${destP?.name})`
                                : `${w?.name} (${p?.name})`}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1 font-medium text-sky-500 dark:text-sky-400">
                              <Repeat className="size-3" />
                              {template.period}
                            </span>
                          </div>
                          <p className="mt-2 text-xs font-medium text-muted-foreground">
                            Next execution: <span className="text-foreground font-semibold">{formatDate(template.nextDueDate)}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-3 shrink-0">
                        <span className="font-bold text-foreground text-sm">
                          Rp {formatCurrency(template.amount)}
                        </span>
                        <Button
                          variant="destructive"
                          size="icon"
                          className="size-8"
                          onClick={() => handleDeactivateSchedule(template.id)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>
    </>
  )
}
