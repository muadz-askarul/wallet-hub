import { useState } from "react"
import { useLiveQuery } from "dexie-react-hooks"
import { db } from "@/lib/db"
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
import { Pencil, Plus, Trash } from "lucide-react"
import { toast } from "sonner"

export function WalletPage() {
  const wallets = useLiveQuery(() => db.wallets.toArray()) || []
  const pockets = useLiveQuery(() => db.pockets.toArray()) || []

  // State for Wallet Drawer
  const [walletDrawerOpen, setWalletDrawerOpen] = useState(false)
  const [editingWallet, setEditingWallet] = useState<{
    id: string
    name: string
  } | null>(null)
  const [walletName, setWalletName] = useState("")

  // State for Pocket Drawer
  const [pocketDrawerOpen, setPocketDrawerOpen] = useState(false)
  const [editingPocket, setEditingPocket] = useState<{
    id: string
    name: string
    walletId: string
  } | null>(null)
  const [pocketName, setPocketName] = useState("")
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
    setActiveWalletIdForPocket(pocket.walletId)
    setPocketDrawerOpen(true)
  }

  const handleSavePocket = async () => {
    if (!pocketName.trim()) return
    try {
      if (editingPocket) {
        await updatePocket(editingPocket.id, { name: pocketName })
        toast.success("Pocket updated")
      } else {
        await createPocket(activeWalletIdForPocket, pocketName)
        toast.success("Pocket created")
      }
      setPocketDrawerOpen(false)
    } catch {
      toast.error("Failed to save pocket")
    }
  }

  const handleDeletePocket = async () => {
    if (!editingPocket) return
    if (
      !confirm(
        "Are you sure you want to delete this pocket and its transactions?"
      )
    )
      return
    try {
      await deletePocket(editingPocket.id)
      toast.success("Pocket deleted")
      setPocketDrawerOpen(false)
    } catch {
      toast.error("Failed to delete pocket")
    }
  }

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
                  <h3 className="text-lg font-semibold">{wallet.name}</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditWallet(wallet)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-3 p-4">
                  {walletPockets.map((pocket) => (
                    <div
                      key={pocket.id}
                      className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
                      onClick={() => openEditPocket(pocket)}
                    >
                      <span className="font-medium">{pocket.name}</span>
                      <Pencil className="h-4 w-4 text-muted-foreground" />
                    </div>
                  ))}

                  <Button
                    variant="outline"
                    className="mt-2 w-full border-dashed"
                    onClick={() => openAddPocket(wallet.id)}
                  >
                    <Plus className="mr-2 h-4 w-4" /> Add Pocket
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Wallet Drawer */}
      <Drawer open={walletDrawerOpen} onOpenChange={setWalletDrawerOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>
              {editingWallet ? "Edit Wallet" : "Add Wallet"}
            </DrawerTitle>
          </DrawerHeader>
          <div className="space-y-4 px-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="walletName">Name</Label>
              <Input
                id="walletName"
                value={walletName}
                onChange={(e) => setWalletName(e.target.value)}
                placeholder="e.g. Bank BCA"
              />
            </div>
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
              <Button onClick={handleSaveWallet}>Save</Button>
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
          </div>
          <DrawerFooter className="flex-row justify-between pt-2">
            {editingPocket ? (
              <Button variant="destructive" onClick={handleDeletePocket}>
                <Trash className="h-4 w-4" />
              </Button>
            ) : (
              <div />
            )}
            <div className="flex gap-2">
              <DrawerClose asChild>
                <Button variant="outline">Cancel</Button>
              </DrawerClose>
              <Button onClick={handleSavePocket}>Save</Button>
            </div>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  )
}
