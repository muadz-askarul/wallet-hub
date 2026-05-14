import { useState } from "react"
import { useLiveQuery } from "dexie-react-hooks"
import { db } from "@/lib/db"
import { getPocketBalance } from "@/lib/services/transaction-service"
import { formatCurrency } from "@/lib/utils"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { Input } from "@/components/ui/input"
import { Search, X } from "lucide-react"

interface PocketSelectionSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (pocketId: string) => void
  excludePocketId?: string
}

type PocketWithBalance = {
  id: string
  name: string
  walletName: string
  balance: number
}

export function PocketSelectionSheet({
  open,
  onOpenChange,
  onSelect,
  excludePocketId,
}: PocketSelectionSheetProps) {
  const [search, setSearch] = useState("")

  const wallets = useLiveQuery(() => db.wallets.toArray(), [], [])
  const pocketsData = useLiveQuery(
    async () => {
      const ps = await db.pockets.filter((p) => !p.deletedAt).toArray()
      const list: PocketWithBalance[] = []
      for (const p of ps) {
        if (p.id === excludePocketId) continue
        const balance = await getPocketBalance(p.id)
        const walletName =
          wallets?.find((w) => w.id === p.walletId)?.name || "Wallet"
        list.push({
          id: p.id,
          name: p.name,
          walletName,
          balance,
        })
      }
      return list
    },
    [wallets, excludePocketId],
    []
  )

  const filteredPockets = pocketsData.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.walletName.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="flex max-h-[50svh]! flex-col">
        <DrawerHeader className="border-b pb-4 text-left">
          <DrawerTitle>Select Pocket</DrawerTitle>
          <div className="relative mt-3">
            <Search className="absolute top-2.5 left-3 size-4 text-muted-foreground" />
            <Input
              placeholder="Search pockets..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-9 pl-9 text-sm"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute top-2.5 right-3 text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto p-4">
          {filteredPockets.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No pockets found.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-2">
              {filteredPockets.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    onSelect(p.id)
                    onOpenChange(false)
                    setSearch("")
                  }}
                  className="flex items-center justify-between rounded-xl border bg-card p-3 text-left transition-colors hover:bg-muted"
                >
                  <div>
                    <div className="font-semibold text-foreground">
                      {p.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {p.walletName}
                    </div>
                  </div>
                  <div className="text-sm font-medium text-foreground">
                    Rp {formatCurrency(p.balance)}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  )
}
