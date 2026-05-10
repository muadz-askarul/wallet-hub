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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  createWallet,
  updateWallet,
  deleteWallet,
  createPocket,
  updatePocket,
  deletePocket,
} from "@/lib/services/wallet-service"
import { Plus, Trash, MoreVertical, Edit } from "lucide-react"
import { toast } from "sonner"

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

  // State for Pocket Drawer (Used both standalone and inside Wallet Drawer)
  const [pocketDrawerOpen, setPocketDrawerOpen] = useState(false)
  const [editingPocket, setEditingPocket] = useState<{
    id: string
    name: string
    walletId: string
  } | null>(null)
  const [pocketName, setPocketName] = useState("")
  const [pocketAmountAdjustment, setPocketAmountAdjustment] = useState("")
  const [activeWalletIdForPocket, setActiveWalletIdForPocket] = useState("")

  const openAddWallet = () => {
    setEditingWallet(null)
    setWalletName("")
    setWalletDrawerOpen(true)
  }

  const openEditWallet = (wallet: { id: string; name: string }) => {
    setEditingWallet(wallet)
    setWalletName(wallet.name)
    setWalletDrawerOpen(true)
  }

  const handleSaveWallet = async () => {
    if (!walletName.trim()) return
    try {
      if (editingWallet) {
        await updateWallet(editingWallet.id, { name: walletName })
        toast.success("Wallet updated")
      } else {
        await createWallet(walletName)
        toast.success("Wallet created")
      }
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

  const openAddPocket = (walletId: string) => {
    setEditingPocket(null)
    setPocketName("")
    setPocketAmountAdjustment("")
    setActiveWalletIdForPocket(walletId)
    setPocketDrawerOpen(true)
  }

  const openEditPocket = (pocket: {
    id: string
    name: string
    walletId: string
  }) => {
    setEditingPocket(pocket)
    setPocketName(pocket.name)
    setPocketAmountAdjustment("")
    setActiveWalletIdForPocket(pocket.walletId)
    setPocketDrawerOpen(true)
  }

  const handleSavePocket = async () => {
    if (!pocketName.trim()) return
    try {
      let currentPocketId = ""
      if (editingPocket) {
        await updatePocket(editingPocket.id, { name: pocketName })
        currentPocketId = editingPocket.id
        toast.success("Pocket updated")
      } else {
        const p = await createPocket(activeWalletIdForPocket, pocketName)
        currentPocketId = p.id
        toast.success("Pocket created")
      }

      // Handle Adjustment Transaction if amount is provided
      const adjustmentValue = parseFloat(pocketAmountAdjustment)
      if (!isNaN(adjustmentValue)) {
        const currentBalance = editingPocket
          ? pocketBalances[editingPocket.id] || 0
          : 0
        const diff = adjustmentValue - currentBalance

        if (diff !== 0) {
          await db.transactions.add({
            id: crypto.randomUUID(),
            type: diff > 0 ? "income" : "expense",
            amount: Math.abs(diff),
            date: Date.now(),
            note: "Balance Adjustment",
            pocketId: currentPocketId,
          })
          toast.success("Pocket balance adjusted")
        }
      }

      setPocketDrawerOpen(false)
    } catch {
      toast.error("Failed to save pocket")
    }
  }

  const handleDeletePocket = async (pocketId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this pocket and its transactions?"
      )
    )
      return
    try {
      await deletePocket(pocketId)
      toast.success("Pocket soft-deleted")
      if (editingPocket?.id === pocketId) {
        setPocketDrawerOpen(false)
      }
    } catch {
      toast.error("Failed to delete pocket")
    }
  }

  // Helper to render pocket items
  const renderPocketItem = (pocket: {
    id: string
    name: string
    walletId: string
  }) => (
    <div
      key={pocket.id}
      className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50"
    >
      <div className="flex flex-col">
        <span className="font-medium">{pocket.name}</span>
        <span className="text-sm text-muted-foreground">
          Rp {(pocketBalances[pocket.id] || 0).toLocaleString("id-ID")}
        </span>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <MoreVertical className="h-4 w-4 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => openEditPocket(pocket)}>
            <Edit className="mr-2 h-4 w-4" /> Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-destructive focus:bg-destructive/10 focus:text-destructive"
            onClick={() => handleDeletePocket(pocket.id)}
          >
            <Trash className="mr-2 h-4 w-4" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
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
                  <div>
                    <h3 className="text-lg font-semibold">{wallet.name}</h3>
                    <p className="text-sm font-medium text-muted-foreground">
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

                <div className="space-y-3 p-4">
                  {walletPockets.map(renderPocketItem)}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Wallet Drawer (Expanded for CRUD) */}
      <Drawer open={walletDrawerOpen} onOpenChange={setWalletDrawerOpen}>
        <DrawerContent className="max-h-[90svh]">
          <DrawerHeader>
            <DrawerTitle>
              {editingWallet ? "Edit Wallet" : "Add Wallet"}
            </DrawerTitle>
          </DrawerHeader>
          <div className="space-y-6 overflow-y-auto px-4 py-2 pb-6">
            <div className="space-y-2">
              <Label htmlFor="walletName">Name</Label>
              <Input
                id="walletName"
                value={walletName}
                onChange={(e) => setWalletName(e.target.value)}
                placeholder="e.g. Bank BCA"
              />
            </div>

            {editingWallet && (
              <div className="space-y-3 border-t pt-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">Manage Pockets</h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openAddPocket(editingWallet.id)}
                  >
                    <Plus className="mr-2 h-4 w-4" /> Add Pocket
                  </Button>
                </div>

                <div className="space-y-2">
                  {pockets
                    .filter((p) => p.walletId === editingWallet.id)
                    .map(renderPocketItem)}

                  {pockets.filter((p) => p.walletId === editingWallet.id)
                    .length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      No pockets available.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
          <DrawerFooter className="flex-row justify-between pt-2">
            {editingWallet ? (
              <Button variant="destructive" onClick={handleDeleteWallet}>
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
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Pocket Drawer */}
      <Drawer open={pocketDrawerOpen} onOpenChange={setPocketDrawerOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>
              {editingPocket ? "Edit Pocket" : "Add Pocket"}
            </DrawerTitle>
          </DrawerHeader>
          <div className="space-y-4 px-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="pocketName">Name</Label>
              <Input
                id="pocketName"
                value={pocketName}
                onChange={(e) => setPocketName(e.target.value)}
                placeholder="e.g. Main Pocket"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pocketAmountAdjustment">
                Target Balance (Rp)
              </Label>
              <Input
                id="pocketAmountAdjustment"
                type="number"
                value={pocketAmountAdjustment}
                onChange={(e) => setPocketAmountAdjustment(e.target.value)}
                placeholder={
                  editingPocket
                    ? `Current: ${(pocketBalances[editingPocket.id] || 0).toString()}`
                    : "0"
                }
              />
              <p className="text-xs text-muted-foreground">
                Setting a new amount will create an adjustment transaction to
                match this balance.
              </p>
            </div>
          </div>
          <DrawerFooter className="flex-row justify-between pt-2">
            <div />
            <div className="flex gap-2">
              <DrawerClose asChild>
                <Button variant="outline">Cancel</Button>
              </DrawerClose>
              <Button onClick={handleSavePocket}>Save Pocket</Button>
            </div>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  )
}
