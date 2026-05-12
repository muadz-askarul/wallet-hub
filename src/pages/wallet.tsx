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
import { Plus, Trash, MoreVertical, GripVertical } from "lucide-react"
import { toast } from "sonner"
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable"
import { CSS, type Transform } from "@dnd-kit/utilities"

type DraftPocket = {
  id?: string
  name: string
  amount: string
  _key: string // stable drag key
}

// ─── Sortable Wallet Card ──────────────────────────────────────────────────────

interface SortableWalletProps {
  walletId: string
  walletName: string
  walletBalance: number
  pockets: { id: string; name: string; walletId: string }[]
  pocketBalances: Record<string, number>
  orderMode: boolean
  onEdit: () => void
}

function SortableWallet({
  walletId,
  walletName,
  walletBalance,
  pockets,
  pocketBalances,
  orderMode,
  onEdit,
}: SortableWalletProps) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: walletId })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="overflow-hidden rounded-xl border bg-card shadow-sm"
    >
      <div className="flex items-center border-b bg-muted/30 px-4 py-3">
        {/* Drag handle */}
        {orderMode && (
          <button
            {...attributes}
            {...listeners}
            className="mr-3 cursor-grab touch-none text-muted-foreground active:cursor-grabbing"
          >
            <GripVertical className="size-5" />
          </button>
        )}

        <div className="flex flex-1 items-center justify-between">
          <h3 className="text-lg font-semibold">{walletName}</h3>
          <p className="font-semibold text-muted-foreground">
            Rp {formatCurrency(walletBalance)}
          </p>
        </div>

        {!orderMode && (
          <Button variant="ghost" size="sm" className="ml-2" onClick={onEdit}>
            <MoreVertical className="size-4" />
          </Button>
        )}
      </div>

      <div className="space-y-1 py-1">
        {pockets.map((pocket) => (
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
        {pockets.length === 0 && (
          <p className="py-2 text-center text-sm text-muted-foreground">
            No pockets. Edit wallet to add pockets.
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Sortable Pocket Row (in edit drawer) ─────────────────────────────────────

interface SortablePocketRowProps {
  pocket: DraftPocket
  onUpdateName: (val: string) => void
  onUpdateAmount: (val: string) => void
  onDelete: () => void
}

function SortablePocketRow({
  pocket,
  onUpdateName,
  onUpdateAmount,
  onDelete,
}: SortablePocketRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: pocket._key })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-start gap-2 rounded-lg border bg-muted/10 p-3"
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="mt-1.5 cursor-grab touch-none text-muted-foreground active:cursor-grabbing"
      >
        <GripVertical className="size-5" />
      </button>

      <div className="flex-1 space-y-2">
        <div>
          <Label className="text-xs text-muted-foreground">Name</Label>
          <Input
            value={pocket.name}
            onChange={(e) => onUpdateName(e.target.value)}
            placeholder="Pocket Name"
            className="h-8 text-sm"
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Balance (Rp)</Label>
          <NumericInput
            value={pocket.amount}
            onValueChange={onUpdateAmount}
            placeholder="0"
            className="h-8 text-sm"
          />
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="mt-0.5 size-8 self-start text-destructive"
        onClick={onDelete}
      >
        <Trash className="size-4" />
      </Button>
    </div>
  )
}

const restrictToVerticalAxis = ({ transform }: { transform: Transform }) => ({
  ...transform,
  x: 0,
})

// ─── Main WalletPage ──────────────────────────────────────────────────────────

export function WalletPage() {
  const { wallets, pockets, pocketBalances, walletBalances } = useLiveQuery(
    async () => {
      const w = await db.wallets.toArray()
      w.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      const p = await db.pockets
        .filter((p) => !p.deletedAt)
        .toArray()
        .then((ps) => ps.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)))
      const pb: Record<string, number> = {}
      const wb: Record<string, number> = {}

      for (const wallet of w) wb[wallet.id] = 0

      for (const pocket of p) {
        const balance = await getPocketBalance(pocket.id)
        pb[pocket.id] = balance
        if (wb[pocket.walletId] !== undefined) wb[pocket.walletId] += balance
      }

      return { wallets: w, pockets: p, pocketBalances: pb, walletBalances: wb }
    },
    [],
    {
      wallets: [],
      pockets: [],
      pocketBalances: {} as Record<string, number>,
      walletBalances: {} as Record<string, number>,
    }
  )

  // DnD sensors — pointer + touch for mobile
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    })
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

  // ── Wallet DnD ────────────────────────────────────────────────────────────

  const handleWalletDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = wallets.findIndex((w) => w.id === active.id)
    const newIndex = wallets.findIndex((w) => w.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const reordered = arrayMove(wallets, oldIndex, newIndex)
    // Persist order
    await Promise.all(
      reordered.map((w, i) => db.wallets.update(w.id, { order: i }))
    )
  }

  // ── Pocket DnD (draft) ────────────────────────────────────────────────────

  const handlePocketDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = draftPockets.findIndex((p) => p._key === active.id)
    const newIndex = draftPockets.findIndex((p) => p._key === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    setDraftPockets(arrayMove(draftPockets, oldIndex, newIndex))
  }

  // ── Wallet CRUD ───────────────────────────────────────────────────────────

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
        _key: p.id,
      }))
    )
    setDeletedPocketIds([])
    setWalletDrawerOpen(true)
  }

  const handleAddDraftPocket = () => {
    setDraftPockets([
      ...draftPockets,
      { name: "", amount: "", _key: crypto.randomUUID() },
    ])
  }

  const handleDeleteDraftPocket = (index: number, id?: string) => {
    if (id) setDeletedPocketIds([...deletedPocketIds, id])
    setDraftPockets(draftPockets.filter((_, i) => i !== index))
  }

  const updateDraftPocket = (
    index: number,
    field: "name" | "amount",
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
        await db.wallets.update(newWallet.id, { order: wallets.length })
      }

      for (const id of deletedPocketIds) await deletePocket(id)

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
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur supports-backdrop-filter:bg-background/60">
        <h1 className="text-lg font-semibold">Wallets</h1>

        {!orderMode && (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="ghost" size="icon" className="size-9" />}
            >
              <MoreVertical className="size-5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={openAddWallet}>
                <Plus className="mr-2 size-4" />
                Add
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setOrderMode((prev) => !prev)}>
                <GripVertical className="mr-2 size-4" />
                Order
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {orderMode && (
          <Button
            variant="default"
            size="sm"
            onClick={() => setOrderMode(false)}
          >
            Save
          </Button>
        )}
      </div>

      <div className="p-4 pb-24">
        {wallets.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No wallets configured.
          </p>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleWalletDragEnd}
            modifiers={[restrictToVerticalAxis]}
          >
            <SortableContext
              items={wallets.map((w) => w.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-6">
                {wallets.map((wallet) => (
                  <SortableWallet
                    key={wallet.id}
                    walletId={wallet.id}
                    walletName={wallet.name}
                    walletBalance={walletBalances[wallet.id] || 0}
                    pockets={pockets.filter((p) => p.walletId === wallet.id)}
                    pocketBalances={pocketBalances}
                    orderMode={orderMode}
                    onEdit={() => openEditWallet(wallet)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Full-Screen Wallet Drawer */}
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

                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handlePocketDragEnd}
                  modifiers={[restrictToVerticalAxis]}
                >
                  <SortableContext
                    items={draftPockets.map((p) => p._key)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-3">
                      {draftPockets.map((dp, index) => (
                        <SortablePocketRow
                          key={dp._key}
                          pocket={dp}
                          onUpdateName={(val) =>
                            updateDraftPocket(index, "name", val)
                          }
                          onUpdateAmount={(val) =>
                            updateDraftPocket(index, "amount", val)
                          }
                          onDelete={() => handleDeleteDraftPocket(index, dp.id)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>

                {draftPockets.length === 0 && (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    No pockets added yet.
                  </p>
                )}
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
