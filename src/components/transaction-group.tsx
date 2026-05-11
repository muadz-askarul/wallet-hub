import { formatCurrency, cn } from "@/lib/utils"
import { type Transaction } from "@/lib/db"
import { Link } from "react-router-dom"

export type EnrichedTransaction = Transaction & {
  categoryName: string
  categoryIcon: string
  pocketName: string
  walletName: string
}

export interface TransactionGroupProps {
  group: {
    date: Date
    income: number
    expense: number
    transactions: EnrichedTransaction[]
  }
}

export function TransactionGroup({ group }: TransactionGroupProps) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      {/* Group Header */}
      <div className="flex items-center justify-between border-b bg-muted/30 px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="text-3xl font-bold tracking-tighter">
            {String(group.date.getDate()).padStart(2, "0")}
          </span>
          <div className="flex flex-col items-start leading-tight">
            <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
              {group.date.toLocaleDateString("en-US", {
                weekday: "short",
              })}
            </span>
            <span className="mt-0.5 text-[10px] font-medium text-muted-foreground">
              {String(group.date.getMonth() + 1).padStart(2, "0")}.
              {group.date.getFullYear()}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm font-medium">
          {group.income > 0 && (
            <span className="text-primary">
              Rp {formatCurrency(group.income)}
            </span>
          )}
          {group.expense > 0 && (
            <span className="text-destructive">
              Rp {formatCurrency(group.expense)}
            </span>
          )}
        </div>
      </div>

      {/* Transactions List */}
      <div className="space-y-1 py-1">
        {group.transactions.map((tx) => (
          <Link
            key={tx.id}
            to={`/transactions/edit/${tx.id}`}
            className="flex items-center justify-between px-3 py-2 transition-colors hover:bg-muted/50"
          >
            <div className="flex min-w-0 flex-1 items-center gap-4">
              <div className="flex w-28 shrink-0 items-center gap-2">
                <span className="text-lg">{tx.categoryIcon}</span>
                <span className="truncate text-sm text-muted-foreground">
                  {tx.categoryName}
                </span>
              </div>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[15px] font-medium text-foreground">
                  {tx.note || "Adjustment"}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {tx.pocketName}
                </span>
              </div>
            </div>
            <span
              className={cn(
                "ml-3 shrink-0 text-[15px] font-medium",
                tx.type === "income"
                  ? "text-primary"
                  : tx.type === "expense"
                    ? "text-destructive"
                    : "text-foreground"
              )}
            >
              Rp {formatCurrency(tx.amount)}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
