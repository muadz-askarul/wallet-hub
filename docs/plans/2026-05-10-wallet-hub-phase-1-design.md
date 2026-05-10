# Wallet Hub - Phase 1 Design

## Overview
Offline-first personal finance app using Dexie.js (IndexedDB). Phase 1 covers basic transaction flows, envelope budgeting (Wallets & Pockets), categories, and app security.

## Architecture & Data
**Approach: Dynamic Calculation (Event Sourcing)**
Balances are dynamically calculated by summing transactions instead of storing running totals.

### Schema Entities
1. **Wallet**
   - Concept: Container for one or more pockets.
   - Fields: `id`, `name`, `icon`, `createdAt`.
   
2. **Pocket**
   - Concept: Envelope budgeting unit. Funds physically reside here.
   - Fields: `id`, `walletId`, `name`, `createdAt`.
   - Default Behavior: Every Wallet auto-creates a default pocket named `"{wallet_name} pocket"`. If a Wallet only has 1 pocket, the UI hides the pocket level and just displays the Wallet.
   
3. **Category**
   - Concept: Classification for income and expense.
   - Fields: `id`, `name`, `type` (income/expense), `icon`.

4. **Transaction**
   - Concept: Immutable record of money movement.
   - Fields: `id`, `type` (income/expense/transfer), `amount`, `date`, `note`, `pocketId`, `categoryId`.
   - Transfer Logic: Transfer transactions are always between two pockets (`sourcePocketId` → `destinationPocketId`). If pockets belong to different wallets, the UI presents it as a Wallet-to-Wallet transfer.

5. **Settings**
   - Concept: User preferences and security configuration.
   - Fields: `id` (singleton), `darkMode` (boolean), `currency` (string), `pin` (string).

6. **Security**
   - App Lock PIN: Configurable timeout lock (default: always). App locks when brought to foreground or opened. Uses `pin` from Settings.

## UI/UX Rules
- **Caveman/Minimalist Focus:** High utility, fast, no visual bloat.
- **Offline First:** Zero server latency. All writes synchronous to IndexedDB.
