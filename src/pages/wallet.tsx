import { useState } from "react"
import { useLiveQuery } from "dexie-react-hooks"
import { formatCurrency } from "@/lib/utils"
import { db } from "@/lib/db"
import { Link, useNavigate } from "react-router-dom"
import { getPocketBalance } from "@/lib/services/transaction-service"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Plus, GripVertical, Edit, MoreVertical } from "lucide-react"
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
import { PageHeader } from "@/components/ui/page-header"
import { AutoTextSize } from "@/components/ui/auto-text-size"

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
      <div className="flex items-center border-b bg-muted/30 px-4 py-2">
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
            <Edit className="size-4" />
          </Button>
        )}
      </div>

      <div className="space-y-1 py-1">
        {pockets.map((pocket) => (
          <Link
            key={pocket.id}
            to={`/transactions?pocketId=${pocket.id}`}
            className="flex items-center justify-between px-4 py-2.5 transition-colors hover:bg-muted/40 active:bg-muted/80"
          >
            <span className="text-sm font-medium">{pocket.name}</span>
            <AutoTextSize
              maxSizeRem={0.875}
              className="text-xs font-medium text-foreground"
            >
              Rp {formatCurrency(pocketBalances[pocket.id] || 0)}
            </AutoTextSize>
          </Link>
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
  const [confirmDelete, setConfirmDelete] = useState(false)

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

  return (
    <>
      <div>
        {/* Sticky Header */}
        <PageHeader className="justify-between">
          <h1 className="text-lg font-semibold">Wallets</h1>

          {!orderMode && (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="ghost" size="icon" className="size-9" />
                }
              >
                <MoreVertical className="size-5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => navigate("/wallet/new")}>
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
        </PageHeader>

        <div className="p-4">
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
                      onEdit={() => navigate(`/wallet/edit/${wallet.id}`)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      </div>
    </>
  )
}
