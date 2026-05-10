import Dexie, { type EntityTable } from "dexie"

export interface Wallet {
  id: string
  name: string
  icon?: string
  createdAt: number
}

export interface Pocket {
  id: string
  walletId: string
  name: string
  createdAt: number
  deletedAt?: number
}

export interface Category {
  id: string
  name: string
  type: "income" | "expense"
  icon?: string
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

const db = new Dexie("WalletHubDB") as Dexie & {
  wallets: EntityTable<Wallet, "id">
  pockets: EntityTable<Pocket, "id">
  categories: EntityTable<Category, "id">
  transactions: EntityTable<Transaction, "id">
  settings: EntityTable<Settings, "id">
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

export { db }
