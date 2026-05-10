import { useState } from "react"
import { useLiveQuery } from "dexie-react-hooks"
import { db } from "@/lib/db"
import { getPocketBalance } from "@/lib/services/transaction-service"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
  createWallet,
  updateWallet,
  deleteWallet,
  createPocket,
  updatePocket,
  deletePocket,
} from "@/lib/services/wallet-service"
import { Plus, Trash, Edit } from "lucide-react"
import { toast } from "sonner"

type DraftPocket = {
  id?: string
  name: string
  amount: string
}

export function WalletPage() {
  const { wallets, pockets, pocketBalances, walletBalances } = useLiveQuery(
    async () => {
      const w = await db.wallets.toArray()
      const p = await db.pockets.filter((p) => !p.deletedAt).toArray()
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

  // State for Wallet Drawer
  const [walletDrawerOpen, setWalletDrawerOpen] = useState(false)
  const [editingWallet, setEditingWallet] = useState<{
    id: string
    name: string
  } | null>(null)
  const [walletName, setWalletName] = useState("")

  // Inline Pockets State
  const [draftPockets, setDraftPockets] = useState<DraftPocket[]>([])
  const [deletedPocketIds, setDeletedPocketIds] = useState<string[]>([])

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
    const existingPockets = pockets.filter((p) => p.walletId === wallet.id)
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
      }

      // Handle deleted pockets
      for (const id of deletedPocketIds) {
        await deletePocket(id)
      }

      // Handle existing and new pockets
      for (const dp of draftPockets) {
        if (!dp.name.trim()) continue // Skip unnamed pockets

        let pocketId = dp.id
        if (pocketId) {
          await updatePocket(pocketId, { name: dp.name })
        } else {
          const newPocket = await createPocket(walletId, dp.name)
          pocketId = newPocket.id
        }

        // Handle balance adjustment
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
    if (
      !confirm(
        "Are you sure you want to delete this wallet and all its pockets/transactions?"
      )
    )
      return
    try {
      await deleteWallet(editingWallet.id)
      toast.success("Wallet deleted")
      setWalletDrawerOpen(false)
    } catch {
      toast.error("Failed to delete wallet")
    }
  }

  // Render Pocket Item on Main Dashboard (No dropdown, flex-row aligned)
  const renderPocketItem = (pocket: {
    id: string
    name: string
    walletId: string
  }) => (
    <div
      key={pocket.id}
      className="flex items-center justify-between rounded-lg border px-4 py-3 hover:bg-muted/50"
    >
      <span className="font-medium">{pocket.name}</span>
      <span className="font-medium">
        Rp {(pocketBalances[pocket.id] || 0).toLocaleString("id-ID")}
      </span>
    </div>
  )

  return (
    <div className="p-6 pb-24">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Wallets & Pockets</h1>
        <Button onClick={openAddWallet}>
          <Plus className="mr-2 h-4 w-4" /> Add Wallet
        </Button>
      </div>

      {wallets.length === 0 ? (
        <p className="text-sm text-muted-foreground">No wallets configured.</p>
      ) : (
        <div className="space-y-6">
          {wallets.map((wallet) => {
            const walletPockets = pockets.filter(
              (p) => p.walletId === wallet.id
            )
            return (
              <div
                key={wallet.id}
                className="overflow-hidden rounded-xl border bg-card shadow-sm"
              >
                <div className="flex items-center justify-between border-b bg-muted/30 px-4 py-3">
                  <div className="flex flex-1 items-center justify-between pr-4">
                    <h3 className="text-lg font-semibold">{wallet.name}</h3>
                    <p className="font-semibold text-muted-foreground">
                      Rp{" "}
                      {(walletBalances[wallet.id] || 0).toLocaleString("id-ID")}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditWallet(wallet)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-2 p-4">
                  {walletPockets.map(renderPocketItem)}
                  {walletPockets.length === 0 && (
                    <p className="py-2 text-center text-sm text-muted-foreground">
                      No pockets available. Edit wallet to add pockets.
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Full-Screen Wallet Drawer for Editing */}
      <Drawer open={walletDrawerOpen} onOpenChange={setWalletDrawerOpen}>
        <DrawerContent className="mt-0 h-[100dvh] rounded-none">
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
                    <Plus className="mr-2 h-4 w-4" /> Add Pocket
                  </Button>
                </div>

                <div className="space-y-3">
                  {draftPockets.map((dp, index) => (
                    <div
                      key={dp.id || index}
                      className="flex items-center gap-2 rounded-lg border bg-muted/10 p-3"
                    >
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
                            Target Balance (Rp)
                          </Label>
                          <Input
                            type="number"
                            value={dp.amount}
                            onChange={(e) =>
                              updateDraftPocket(index, "amount", e.target.value)
                            }
                            placeholder="0"
                            className="h-8 text-sm"
                          />
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mb-0.5 h-10 w-10 self-end text-destructive"
                        onClick={() => handleDeleteDraftPocket(index, dp.id)}
                      >
                        <Trash className="h-4 w-4" />
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
                  onClick={handleDeleteWallet}
                >
                  <Trash className="h-4 w-4" />
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
    </div>
  )
}
