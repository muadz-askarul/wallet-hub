import { useLiveQuery } from "dexie-react-hooks"
import { db } from "@/lib/db"
import { getPocketBalance } from "@/lib/services/transaction-service"

export function DashboardPage() {
  const transactions =
    useLiveQuery(() =>
      db.transactions.orderBy("date").reverse().limit(10).toArray()
    ) || []

  const balances = useLiveQuery(
    async () => {
      const pockets = await db.pockets.toArray()
      let assets = 0
      let liabilities = 0

      for (const pocket of pockets) {
        const balance = await getPocketBalance(pocket.id)
        if (balance >= 0) assets += balance
        else liabilities += Math.abs(balance)
      }

      return { assets, liabilities, total: assets - liabilities }
    },
    [],
    { assets: 0, liabilities: 0, total: 0 }
  )

  return (
    <div className="p-6 pb-24">
      <h1 className="mb-6 text-2xl font-semibold">Dashboard</h1>

      <div className="mb-8 grid gap-4 md:grid-cols-3">
        <div className="rounded-xl bg-primary p-6 text-primary-foreground shadow-sm">
          <p className="text-sm opacity-80">Total Balance</p>
          <h2 className="mt-2 text-3xl font-bold">
            Rp {balances.total.toLocaleString("id-ID")}
          </h2>
        </div>
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <p className="text-sm text-muted-foreground">Assets</p>
          <h2 className="mt-2 text-2xl font-bold">
            Rp {balances.assets.toLocaleString("id-ID")}
          </h2>
        </div>
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <p className="text-sm text-muted-foreground">Liabilities</p>
          <h2 className="mt-2 text-2xl font-bold">
            Rp {balances.liabilities.toLocaleString("id-ID")}
          </h2>
        </div>
      </div>

      <div>
        <h3 className="mb-4 text-lg font-medium">Recent Transactions</h3>
        {transactions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No recent transactions.
          </p>
        ) : (
          <ul className="space-y-3">
            {transactions.map((tx) => (
              <li
                key={tx.id}
                className="flex justify-between rounded-lg border p-4 shadow-sm"
              >
                <span>{tx.type}</span>
                <span
                  className={
                    tx.type === "expense" ? "text-red-500" : "text-green-500"
                  }
                >
                  {tx.type === "expense" ? "-" : "+"}Rp{" "}
                  {tx.amount.toLocaleString("id-ID")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
