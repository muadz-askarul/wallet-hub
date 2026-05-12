import Dexie, { type EntityTable } from "dexie"

export interface Wallet {
  id: string
  name: string
  icon?: string
  createdAt: number
  order: number
}

export interface Pocket {
  id: string
  walletId: string
  name: string
  createdAt: number
  deletedAt?: number
  order: number
}

export interface Category {
  id: string
  name: string
  type: "income" | "expense"
  icon?: string
  color?: string
}

export interface Transaction {
  id: string
  type: "income" | "expense" | "transfer"
  amount: number
  date: number
  note?: string
  pocketId: string
  categoryId?: string // Optional for transfers
  destinationPocketId?: string // Only for transfers
}

export interface Settings {
  id: "user_settings"
  darkMode: boolean
  currency: string
  pin: string
}

export interface Schedule {
  id: string
  type: "bill" | "repeat" // bill: user-triggered; repeat: auto-triggers
  period:
    | "Every Day"
    | "Weekdays"
    | "Weekend"
    | "Every Week"
    | "Every 2 Weeks"
    | "Every 4 Weeks"
    | "Every Month"
    | "The end of the month"
    | "Every 2 Month"
    | "Every 3 Month"
    | "Every 4 Month"
    | "Every 6 Month"
    | "Anually"
  amount: number
  note?: string
  pocketId: string
  categoryId?: string
  destinationPocketId?: string
  transactionType: "income" | "expense" | "transfer"
  startDate: number
  endDate?: number // optional date after which schedule stops repeating
  nextDueDate: number // epoch ms
  lastTriggeredDate?: number
  isActive: number // 1 for active, 0 for inactive/ended
}

const db = new Dexie("WalletHubDB") as Dexie & {
  wallets: EntityTable<Wallet, "id">
  pockets: EntityTable<Pocket, "id">
  categories: EntityTable<Category, "id">
  transactions: EntityTable<Transaction, "id">
  settings: EntityTable<Settings, "id">
  schedules: EntityTable<Schedule, "id">
}

db.version(1).stores({
  wallets: "id, name",
  pockets: "id, walletId",
  categories: "id, type",
  transactions: "id, pocketId, type, date",
  settings: "id",
})

db.version(2).stores({
  pockets: "id, walletId, deletedAt",
})

db.version(3).stores({
  wallets: "id, name, order",
  pockets: "id, walletId, deletedAt, order",
  categories: "id, type, color",
})

db.version(4).stores({
  schedules: "id, type, isActive, nextDueDate, pocketId",
})

// Seed default categories on first run
const DEFAULT_EXPENSE_CATEGORIES: Omit<Category, "id">[] = [
  { name: "Shopping", type: "expense", icon: "🛍️", color: "#f59e0b" },
  { name: "Grocery", type: "expense", icon: "🛒", color: "#10b981" },
  { name: "Bill", type: "expense", icon: "📋", color: "#6366f1" },
  { name: "Health", type: "expense", icon: "🏥", color: "#ef4444" },
  { name: "Beauty", type: "expense", icon: "💄", color: "#ec4899" },
  { name: "Food", type: "expense", icon: "🍜", color: "#f97316" },
  { name: "Snack", type: "expense", icon: "🍿", color: "#eab308" },
  { name: "Beverage", type: "expense", icon: "☕", color: "#a16207" },
  { name: "Transportation", type: "expense", icon: "🚗", color: "#3b82f6" },
  { name: "Apparel", type: "expense", icon: "👗", color: "#8b5cf6" },
  { name: "Education", type: "expense", icon: "📚", color: "#0ea5e9" },
  { name: "Household", type: "expense", icon: "🏠", color: "#14b8a6" },
  { name: "Gift", type: "expense", icon: "🎁", color: "#f43f5e" },
  { name: "Other", type: "expense", icon: "📦", color: "#6b7280" },
]

const DEFAULT_INCOME_CATEGORIES: Omit<Category, "id">[] = [
  { name: "Salary", type: "income", icon: "💼", color: "#10b981" },
  { name: "Petty Cash", type: "income", icon: "💵", color: "#3b82f6" },
  { name: "Allowance", type: "income", icon: "🎓", color: "#8b5cf6" },
  { name: "Bonus", type: "income", icon: "🎉", color: "#f59e0b" },
  { name: "Other", type: "income", icon: "💰", color: "#6b7280" },
]

export async function seedDefaultCategories() {
  const count = await db.categories.count()
  if (count > 0) return

  const all = [...DEFAULT_EXPENSE_CATEGORIES, ...DEFAULT_INCOME_CATEGORIES].map(
    (cat, i) => ({
      ...cat,
      id: `default-cat-${i}`,
    })
  )

  await db.categories.bulkAdd(all)
}

export { db }
