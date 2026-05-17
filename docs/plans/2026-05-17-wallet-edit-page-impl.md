# Wallet Edit Page Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Convert wallet management from a drawer to a dedicated page for better UX and consistency.

**Architecture:**
- Move `SortablePocketRow` and `DraftPocket` type to `src/components/sortable-pocket-row.tsx`.
- Create `src/pages/wallet-form.tsx` to handle create/edit logic.
- Update `src/pages/wallet.tsx` and `src/App.tsx` for routing and navigation.

**Tech Stack:** React 19, TypeScript, React Router 7, dnd-kit, Dexie.

---

### Task 1: Extract SortablePocketRow Component

**Files:**
- Create: `src/components/sortable-pocket-row.tsx`
- Modify: `src/pages/wallet.tsx` (to remove components/types)

**Step 1: Create shared component**
Move the `DraftPocket` type and `SortablePocketRow` component from `wallet.tsx` to the new file.

**Step 2: Commit**

```bash
git add src/components/sortable-pocket-row.tsx
git commit -m "refactor: extract SortablePocketRow to shared component"
```

---

### Task 2: Implement WalletFormPage

**Files:**
- Create: `src/pages/wallet-form.tsx`

**Step 1: Write the form page**
Implement the page with a sticky footer, wallet name input, and reorderable pockets.

```tsx
import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useLiveQuery } from "dexie-react-hooks"
import { db } from "@/lib/db"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  createWallet,
  updateWallet,
  deleteWallet,
  createPocket,
  updatePocket,
  deletePocket,
} from "@/lib/services/wallet-service"
import { getPocketBalance } from "@/lib/services/transaction-service"
import { Plus, Trash, ChevronLeft } from "lucide-react"
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
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable"
import { PageHeader } from "@/components/ui/page-header"
import { DraftPocket, SortablePocketRow } from "@/components/sortable-pocket-row"
import { cn } from "@/lib/utils"

export function WalletFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    })
  )

  const [walletName, setWalletName] = useState("")
  const [draftPockets, setDraftPockets] = useState<DraftPocket[]>([])
  const [deletedPocketIds, setDeletedPocketIds] = useState<string[]>([])
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [saving, setSaving] = useState(false)

  // Query lookups
  const wallets = useLiveQuery(() => db.wallets.toArray(), [], [])
  const pocketBalances = useLiveQuery(async () => {
    const ps = await db.pockets.toArray()
    const pb: Record<string, number> = {}
    for (const p of ps) {
      pb[p.id] = await getPocketBalance(p.id)
    }
    return pb
  }, [], {})

  useEffect(() => {
    if (!id) return
    const loadWallet = async () => {
      const wallet = await db.wallets.get(id)
      if (wallet) {
        setWalletName(wallet.name)
        const ps = await db.pockets
          .where("walletId")
          .equals(id)
          .filter(p => !p.deletedAt)
          .toArray()
        ps.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        
        const drafts: DraftPocket[] = []
        for (const p of ps) {
          const balance = await getPocketBalance(p.id)
          drafts.push({
            id: p.id,
            name: p.name,
            amount: balance.toString(),
            _key: p.id
          })
        }
        setDraftPockets(drafts)
      } else {
        toast.error("Wallet not found")
        navigate("/wallet")
      }
    }
    loadWallet()
  }, [id, navigate])

  const handlePocketDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = draftPockets.findIndex((p) => p._key === active.id)
    const newIndex = draftPockets.findIndex((p) => p._key === over.id)
    setDraftPockets(arrayMove(draftPockets, oldIndex, newIndex))
  }

  const handleAddDraftPocket = () => {
    setDraftPockets([
      ...draftPockets,
      { name: "", amount: "", _key: crypto.randomUUID() },
    ])
  }

  const handleDeleteDraftPocket = (index: number, pid?: string) => {
    if (pid) setDeletedPocketIds([...deletedPocketIds, pid])
    setDraftPockets(draftPockets.filter((_, i) => i !== index))
  }

  const updateDraftPocket = (index: number, field: "name" | "amount", value: string) => {
    const updated = [...draftPockets]
    updated[index] = { ...updated[index], [field]: value }
    setDraftPockets(updated)
  }

  const handleSaveWallet = async () => {
    if (!walletName.trim()) {
      toast.error("Please enter a wallet name")
      return
    }
    setSaving(true)
    try {
      let walletId = id || ""
      if (id) {
        await updateWallet(id, { name: walletName })
      } else {
        const newWallet = await createWallet(walletName)
        walletId = newWallet.id
        await db.wallets.update(newWallet.id, { order: wallets?.length || 0 })
      }

      for (const dpid of deletedPocketIds) await deletePocket(dpid)

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
        const currentBalance = dp.id ? (pocketBalances[dp.id] || 0) : 0
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

      toast.success(id ? "Wallet updated" : "Wallet created")
      navigate("/wallet")
    } catch {
      toast.error("Failed to save wallet")
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteWallet = async () => {
    if (!id) return
    try {
      await deleteWallet(id)
      toast.success("Wallet deleted")
      navigate("/wallet")
    } catch {
      toast.error("Failed to delete wallet")
    }
  }

  return (
    <div className="pb-24">
      <PageHeader className="justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="mr-1 size-5" />
          Back
        </button>
        <h1 className="text-base font-semibold">
          {id ? "Edit Wallet" : "Add Wallet"}
        </h1>
        <div className="size-8" />
      </PageHeader>

      <div className="p-4">
        <div className="mx-auto max-w-md space-y-6">
          <div className="space-y-2">
            <Label htmlFor="walletName">Wallet Name</Label>
            <Input
              id="walletName"
              value={walletName}
              onChange={(e) => setWalletName(e.target.value)}
              placeholder="e.g. Bank BCA"
              className="h-11 rounded-xl"
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm">Pockets</h4>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddDraftPocket}
                className="h-8 rounded-lg"
              >
                <Plus className="mr-2 size-4" /> Add Pocket
              </Button>
            </div>

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handlePocketDragEnd}
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
                      onUpdateName={(val) => updateDraftPocket(index, "name", val)}
                      onUpdateAmount={(val) => updateDraftPocket(index, "amount", val)}
                      onDelete={() => handleDeleteDraftPocket(index, dp.id)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            {draftPockets.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No pockets added yet.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Sticky Footer */}
      <div className="fixed bottom-0 left-0 z-10 w-full border-t bg-background/80 p-4 backdrop-blur-md">
        <div className="mx-auto flex max-w-md flex-col gap-3">
          {confirmDelete ? (
            <div className="flex flex-col gap-3">
              <p className="text-center text-xs font-semibold text-destructive">
                Permanently delete this wallet and all its pockets? This cannot be undone.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 rounded-xl"
                  onClick={() => setConfirmDelete(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1 rounded-xl bg-destructive"
                  onClick={handleDeleteWallet}
                >
                  Yes, Delete
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              {id && (
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={() => setConfirmDelete(true)}
                  className="h-12 w-12 shrink-0 rounded-xl"
                >
                  <Trash className="size-5" />
                </Button>
              )}
              <Button
                variant="outline"
                className="h-12 flex-1 rounded-xl text-base font-bold"
                onClick={() => navigate(-1)}
              >
                Cancel
              </Button>
              <Button
                className="h-12 flex-1 rounded-xl text-base font-bold"
                onClick={handleSaveWallet}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Wallet"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/pages/wallet-form.tsx
git commit -m "feat: implement WalletFormPage with sticky footer"
```

---

### Task 3: Update Routing and WalletPage Navigation

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/pages/wallet.tsx`

**Step 1: Register routes in App.tsx**
Add `/wallet/new` and `/wallet/edit/:id` routes.

**Step 2: Update triggers in WalletPage**
- Change `openAddWallet` and `openEditWallet` to use `navigate`.
- Remove `Drawer` imports and related state/logic.

**Step 3: Commit**

```bash
git add src/App.tsx src/pages/wallet.tsx
git commit -m "feat: integrated WalletFormPage and updated routing"
```

---

### Task 4: Final Cleanup and Verification

**Step 1: Run verification**
Run: `bun run typecheck && bun run lint`
Expected: PASS

**Step 2: Commit**

```bash
git commit -am "chore: final cleanup for wallet edit page conversion"
```
