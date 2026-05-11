import { useState } from "react"
import { useLiveQuery } from "dexie-react-hooks"
import { db } from "@/lib/db"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { Button } from "@/components/ui/button"
import { NumericInput } from "@/components/ui/numeric-input"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

type TxType = "income" | "expense" | "transfer"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const now = () => {
  const d = new Date()
  // Return in "datetime-local" input format: YYYY-MM-DDTHH:MM
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
}

export function AddTransactionSheet({ open, onOpenChange }: Props) {
  const [type, setType] = useState<TxType>("expense")
  const [amount, setAmount] = useState(0)
  const [date, setDate] = useState(now())
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined)
  const [pocketId, setPocketId] = useState<string | undefined>(undefined)
  const [destPocketId, setDestPocketId] = useState<string | undefined>(
    undefined
  )
  const [name, setName] = useState("")
  const [note, setNote] = useState("")
  const [saving, setSaving] = useState(false)

  const categories = useLiveQuery(
    () =>
      type === "transfer"
        ? Promise.resolve([])
        : db.categories.where("type").equals(type).toArray(),
    [type],
    []
  )

  const pockets = useLiveQuery(
    () => db.pockets.filter((p) => !p.deletedAt).toArray(),
    [],
    []
  )

  const wallets = useLiveQuery(() => db.wallets.toArray(), [], [])

  const handleOpenChange = (o: boolean) => {
    if (!o) {
      // Reset form on close
      setType("expense")
      setAmount(0)
      setDate(now())
      setCategoryId(undefined)
      setPocketId(undefined)
      setDestPocketId(undefined)
      setName("")
      setNote("")
    }
    onOpenChange(o)
  }

  const setTypeAndResetCategory = (t: TxType) => {
    setType(t)
    setCategoryId(undefined)
  }

  const getWalletName = (pocket: { walletId: string }) => {
    return wallets.find((w) => w.id === pocket.walletId)?.name || ""
  }

  const handleSave = async () => {
    if (!amount || amount <= 0) {
      toast.error("Please enter an amount")
      return
    }
    if (!pocketId) {
      toast.error("Please select a pocket")
      return
    }
    if (type === "transfer" && !destPocketId) {
      toast.error("Please select a destination pocket")
      return
    }

    setSaving(true)
    try {
      await db.transactions.add({
        id: crypto.randomUUID(),
        type,
        amount,
        date: new Date(date).getTime(),
        note: name || note || undefined,
        pocketId: pocketId!,
        categoryId: type !== "transfer" ? categoryId : undefined,
        destinationPocketId: type === "transfer" ? destPocketId : undefined,
      })
      toast.success("Transaction added")
      onOpenChange(false)
    } catch (e) {
      console.error(e)
      toast.error("Failed to save transaction")
    } finally {
      setSaving(false)
    }
  }

  const typeConfig = {
    income: { label: "Income", color: "text-primary" },
    expense: { label: "Expense", color: "text-destructive" },
    transfer: { label: "Transfer", color: "text-foreground" },
  }

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerContent className="flex max-h-[95dvh] flex-col">
        <DrawerHeader className="border-b text-left">
          <DrawerTitle>New Transaction</DrawerTitle>

          {/* Type Selector */}
          <div className="mt-3 flex rounded-lg border p-1">
            {(["expense", "income", "transfer"] as TxType[]).map((t) => (
              <button
                key={t}
                onClick={() => setTypeAndResetCategory(t)}
                className={cn(
                  "flex-1 rounded-md py-1.5 text-sm font-medium capitalize transition-colors",
                  type === t
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto">
          <div className="space-y-4 p-4 pb-8">
            {/* Amount */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Amount</label>
              <NumericInput
                value={amount}
                onValueChange={(v) => setAmount(v ? parseFloat(v) : 0)}
                className={cn("text-lg font-semibold", typeConfig[type].color)}
              />
            </div>

            {/* Date Time */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Date & Time</label>
              <Input
                type="datetime-local"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            {/* Pocket (From Pocket for transfers) */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                {type === "transfer" ? "From Pocket" : "Pocket"}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {pockets.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setPocketId(p.id)}
                    className={cn(
                      "rounded-xl border px-3 py-2.5 text-left text-sm transition-colors",
                      pocketId === p.id
                        ? "border-primary bg-primary/10 font-medium"
                        : "hover:bg-muted"
                    )}
                  >
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {getWalletName(p)}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Destination Pocket (transfers only) */}
            {type === "transfer" && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">To Pocket</label>
                <div className="grid grid-cols-2 gap-2">
                  {pockets
                    .filter((p) => p.id !== pocketId)
                    .map((p) => (
                      <button
                        key={p.id}
                        onClick={() => setDestPocketId(p.id)}
                        className={cn(
                          "rounded-xl border px-3 py-2.5 text-left text-sm transition-colors",
                          destPocketId === p.id
                            ? "border-primary bg-primary/10 font-medium"
                            : "hover:bg-muted"
                        )}
                      >
                        <div className="font-medium">{p.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {getWalletName(p)}
                        </div>
                      </button>
                    ))}
                </div>
              </div>
            )}

            {/* Category (non-transfer) */}
            {type !== "transfer" && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Category</label>
                <div className="flex flex-wrap gap-2">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setCategoryId(cat.id)}
                      className={cn(
                        "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors",
                        categoryId === cat.id
                          ? "border-primary bg-primary/10 font-medium"
                          : "hover:bg-muted"
                      )}
                    >
                      <span>{cat.icon}</span>
                      <span>{cat.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Name */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Transaction name (optional)"
              />
            </div>

            {/* Note */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Note</label>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Additional note (optional)"
                rows={2}
              />
            </div>

            <Button className="w-full" onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save Transaction"}
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
