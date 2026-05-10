import { useLiveQuery } from "dexie-react-hooks"
import { db } from "@/lib/db"
import { Button } from "@/components/ui/button"

export function WalletPage() {
  const wallets = useLiveQuery(() => db.wallets.toArray()) || []

  return (
    <div className="p-6 pb-24">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Wallets & Pockets</h1>
        <Button>Add Wallet</Button>
      </div>

      {wallets.length === 0 ? (
        <p className="text-sm text-muted-foreground">No wallets configured.</p>
      ) : (
        <div className="space-y-4">
          {wallets.map((wallet) => (
            <div key={wallet.id} className="rounded-xl border p-4 shadow-sm">
              <h3 className="text-lg font-medium">{wallet.name}</h3>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
