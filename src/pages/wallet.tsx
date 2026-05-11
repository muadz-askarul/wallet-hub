import { useState } from "react"
import { useLiveQuery } from "dexie-react-hooks"
import { formatCurrency } from "@/lib/utils"
import { db } from "@/lib/db"
import { getPocketBalance } from "@/lib/services/transaction-service"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NumericInput } from "@/components/ui/numeric-input"
import { Label } from "@/components/ui/label"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  createWallet,
  updateWallet,
  deleteWallet,
  createPocket,
  updatePocket,
  deletePocket,
} from "@/lib/services/wallet-service"
import {
  Plus,
  Trash,
  MoreVertical,
  ArrowUp,
  ArrowDown,
  GripVertical,
} from "lucide-react"
import { toast } from "sonner"

type DraftPocket = {
  id?: string
  name: string
  amount: string
}

export function WalletPage() {
  const { wallets, pockets, pocketBalances, walletBalances } = useLiveQuery(
    async () => {
      const w = await db.wallets.orderBy("order").toArray()
      const p = await db.pockets
        .filter((p) => !p.deletedAt)
        .toArray()
        .then((ps) => ps.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)))
      const pb: Record<string, number> = {}
      const wb: Record<string, number> = {}

      for (const wallet of w) {
        wb[wallet.id] = 0
      }

      for (const pocket of p) {
        const balance = await getPocketBalance(pocket.id)
        pb[pocket.id] = balance
        if (wb[pocket.walletId] !== undefined) {
          wb[pocket.walletId] += balance
        }
      }

      return { wallets: w, pockets: p, pocketBalances: pb, walletBalances: wb }
    },
    [],
    { wallets: [], pockets: [], pocketBalances: {}, walletBalances: {} }
  )

  // UI State
  const [orderMode, setOrderMode] = useState(false)
  const [walletDrawerOpen, setWalletDrawerOpen] = useState(false)
  const [editingWallet, setEditingWallet] = useState<{
    id: string
    name: string
  } | null>(null)
  const [walletName, setWalletName] = useState("")
  const [draftPockets, setDraftPockets] = useState<DraftPocket[]>([])
  const [deletedPocketIds, setDeletedPocketIds] = useState<string[]>([])
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  // Wallet Order handlers
  const moveWallet = async (index: number, direction: "up" | "down") => {
    const swapIndex = direction === "up" ? index - 1 : index + 1
    if (swapIndex < 0 || swapIndex >= wallets.length) return
    await db.wallets.update(wallets[index].id, { order: swapIndex })
    await db.wallets.update(wallets[swapIndex].id, { order: index })
  }

  // Pocket Order handlers (within draft)
  const movePocket = (index: number, direction: "up" | "down") => {
    const swapIndex = direction === "up" ? index - 1 : index + 1
    if (swapIndex < 0 || swapIndex >= draftPockets.length) return
    const updated = [...draftPockets]
    ;[updated[index], updated[swapIndex]] = [updated[swapIndex], updated[index]]
    setDraftPockets(updated)
  }

  const openAddWallet = () => {
    setEditingWallet(null)
    setWalletName("")
    setDraftPockets([])
    setDeletedPocketIds([])
    setWalletDrawerOpen(true)
  }

  const openEditWallet = (wallet: { id: string; name: string }) => {
    setEditingWallet(wallet)
    setWalletName(wallet.name)
    const existingPockets = pockets
      .filter((p) => p.walletId === wallet.id)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    setDraftPockets(
      existingPockets.map((p) => ({
        id: p.id,
        name: p.name,
        amount: (pocketBalances[p.id] || 0).toString(),
      }))
    )
    setDeletedPocketIds([])
    setWalletDrawerOpen(true)
  }

  const handleAddDraftPocket = () => {
    setDraftPockets([...draftPockets, { name: "", amount: "" }])
  }

  const handleDeleteDraftPocket = (index: number, id?: string) => {
    if (id) {
      setDeletedPocketIds([...deletedPocketIds, id])
    }
    setDraftPockets(draftPockets.filter((_, i) => i !== index))
  }

  const updateDraftPocket = (
    index: number,
    field: keyof DraftPocket,
    value: string
  ) => {
    const updated = [...draftPockets]
    updated[index] = { ...updated[index], [field]: value }
    setDraftPockets(updated)
  }

  const handleSaveWallet = async () => {
    if (!walletName.trim()) return
    try {
      let walletId = ""
      if (editingWallet) {
        await updateWallet(editingWallet.id, { name: walletName })
        walletId = editingWallet.id
      } else {
        const newWallet = await createWallet(walletName)
        walletId = newWallet.id
        // Set order to end
        await db.wallets.update(newWallet.id, { order: wallets.length })
      }

      for (const id of deletedPocketIds) {
        await deletePocket(id)
      }

      for (let i = 0; i < draftPockets.length; i++) {
        const dp = draftPockets[i]
        if (!dp.name.trim()) continue

        let pocketId = dp.id
        if (pocketId) {
          await updatePocket(pocketId, { name: dp.name, order: i })
        } else {
          const newPocket = await createPocket(walletId, dp.name)
          pocketId = newPocket.id
          await db.pockets.update(pocketId, { order: i })
        }

        const targetBalance = parseFloat(dp.amount) || 0
        const currentBalance = dp.id ? pocketBalances[dp.id] || 0 : 0
        const diff = targetBalance - currentBalance

        if (diff !== 0) {
          await db.transactions.add({
            id: crypto.randomUUID(),
            type: diff > 0 ? "income" : "expense",
            amount: Math.abs(diff),
            date: Date.now(),
            note: "Balance Adjustment",
            pocketId: pocketId,
          })
        }
      }

      toast.success(editingWallet ? "Wallet updated" : "Wallet created")
      setWalletDrawerOpen(false)
    } catch {
      toast.error("Failed to save wallet")
    }
  }

  const handleDeleteWallet = async () => {
    if (!editingWallet) return
    try {
      await deleteWallet(editingWallet.id)
      toast.success("Wallet deleted")
      setWalletDrawerOpen(false)
      setDeleteDialogOpen(false)
    } catch {
      toast.error("Failed to delete wallet")
    }
  }

  return (
    <>
      {/* Sticky Header — same style as transactions page */}
      <div className="sticky top-0 z-20 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur supports-backdrop-filter:bg-background/60">
        <h1 className="text-lg font-semibold">Wallets</h1>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-9">
              <MoreVertical className="size-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={openAddWallet}>
              <Plus className="mr-2 size-4" />
              Add Wallet
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setOrderMode((prev) => !prev)}>
              <GripVertical className="mr-2 size-4" />
              {orderMode ? "Done Ordering" : "Order Wallets"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="p-4 pb-24">
        {wallets.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No wallets configured.
          </p>
        ) : (
          <div className="space-y-6">
            {wallets.map((wallet, wIndex) => {
              const walletPockets = pockets.filter(
                (p) => p.walletId === wallet.id
              )
              return (
                <div
                  key={wallet.id}
                  className="overflow-hidden rounded-xl border bg-card shadow-sm"
                >
                  <div className="flex items-center border-b bg-muted/30 px-4 py-3">
                    {/* Order controls */}
                    {orderMode && (
                      <div className="mr-3 flex flex-col gap-0.5">
                        <button
                          onClick={() => moveWallet(wIndex, "up")}
                          disabled={wIndex === 0}
                          className="rounded p-0.5 hover:bg-muted disabled:opacity-30"
                        >
                          <ArrowUp className="size-3.5" />
                        </button>
                        <button
                          onClick={() => moveWallet(wIndex, "down")}
                          disabled={wIndex === wallets.length - 1}
                          className="rounded p-0.5 hover:bg-muted disabled:opacity-30"
                        >
                          <ArrowDown className="size-3.5" />
                        </button>
                      </div>
                    )}

                    <div className="flex flex-1 items-center justify-between">
                      <h3 className="text-lg font-semibold">{wallet.name}</h3>
                      <p className="font-semibold text-muted-foreground">
                        Rp {formatCurrency(walletBalances[wallet.id] || 0)}
                      </p>
                    </div>

                    {!orderMode && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-2"
                        onClick={() => openEditWallet(wallet)}
                      >
                        <MoreVertical className="size-4" />
                      </Button>
                    )}
                  </div>

                  <div className="space-y-1 py-1">
                    {walletPockets.map((pocket) => (
                      <div
                        key={pocket.id}
                        className="flex items-center justify-between px-4 py-2.5"
                      >
                        <span className="font-medium">{pocket.name}</span>
                        <span className="font-medium">
                          Rp {formatCurrency(pocketBalances[pocket.id] || 0)}
                        </span>
                      </div>
                    ))}
                    {walletPockets.length === 0 && (
                      <p className="py-2 text-center text-sm text-muted-foreground">
                        No pockets. Edit wallet to add pockets.
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Full-Screen Wallet Drawer for Editing */}
      <Drawer open={walletDrawerOpen} onOpenChange={setWalletDrawerOpen}>
        <DrawerContent className="mt-0 h-dvh rounded-none">
          <DrawerHeader className="border-b text-left">
            <DrawerTitle>
              {editingWallet ? "Edit Wallet" : "Add Wallet"}
            </DrawerTitle>
          </DrawerHeader>
          <div className="flex-1 overflow-y-auto px-4 py-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="walletName">Wallet Name</Label>
                <Input
                  id="walletName"
                  value={walletName}
                  onChange={(e) => setWalletName(e.target.value)}
                  placeholder="e.g. Bank BCA"
                />
              </div>

              <div className="space-y-3 border-t pt-6">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">Pockets</h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAddDraftPocket}
                  >
                    <Plus className="mr-2 size-4" /> Add Pocket
                  </Button>
                </div>

                <div className="space-y-3">
                  {draftPockets.map((dp, index) => (
                    <div
                      key={dp.id || index}
                      className="flex items-start gap-2 rounded-lg border bg-muted/10 p-3"
                    >
                      {/* Pocket order controls */}
                      <div className="flex flex-col gap-0.5 pt-1">
                        <button
                          onClick={() => movePocket(index, "up")}
                          disabled={index === 0}
                          className="rounded p-0.5 text-muted-foreground hover:bg-muted disabled:opacity-30"
                        >
                          <ArrowUp className="size-3.5" />
                        </button>
                        <button
                          onClick={() => movePocket(index, "down")}
                          disabled={index === draftPockets.length - 1}
                          className="rounded p-0.5 text-muted-foreground hover:bg-muted disabled:opacity-30"
                        >
                          <ArrowDown className="size-3.5" />
                        </button>
                      </div>

                      <div className="flex-1 space-y-2">
                        <div>
                          <Label className="text-xs text-muted-foreground">
                            Name
                          </Label>
                          <Input
                            value={dp.name}
                            onChange={(e) =>
                              updateDraftPocket(index, "name", e.target.value)
                            }
                            placeholder="Pocket Name"
                            className="h-8 text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">
                            Balance (Rp)
                          </Label>
                          <NumericInput
                            value={dp.amount}
                            onValueChange={(val) =>
                              updateDraftPocket(index, "amount", val)
                            }
                            placeholder="0"
                            className="h-8 text-sm"
                          />
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-0.5 size-8 self-start text-destructive"
                        onClick={() => handleDeleteDraftPocket(index, dp.id)}
                      >
                        <Trash className="size-4" />
                      </Button>
                    </div>
                  ))}

                  {draftPockets.length === 0 && (
                    <p className="py-4 text-center text-sm text-muted-foreground">
                      No pockets added yet.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <DrawerFooter className="border-t bg-background">
            <div className="flex w-full items-center justify-between">
              {editingWallet ? (
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  <Trash className="size-4" />
                </Button>
              ) : (
                <div />
              )}
              <div className="flex gap-2">
                <DrawerClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DrawerClose>
                <Button onClick={handleSaveWallet}>Save Wallet</Button>
              </div>
            </div>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Delete Wallet Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Wallet?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &quot;{editingWallet?.name}&quot; and
              all its pockets. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="text-destructive-foreground bg-destructive hover:bg-destructive/90"
              onClick={handleDeleteWallet}
            >
              Delete Wallet
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
