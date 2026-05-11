# Core Features Update Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Implement wallet drag-and-drop ordering, transaction page monthly summary, robust category management, dark mode toggle, and the core Add Transaction bottom sheet.

**Architecture:** We will update the Dexie database schema (incrementing version) to support ordering and category colors, add `@dnd-kit` for reliable mobile-first drag-and-drop interactions, and implement generic Bottom Sheets for complex forms (Category Management and Transaction Management) that can be globally or locally triggered.

**Tech Stack:** React, Dexie, Tailwind, shadcn/ui, @dnd-kit/core, @dnd-kit/sortable

---

### Task 1: Database Updates & Dependencies

**Files:**
- Modify: `package.json`
- Modify: `src/lib/db.ts`

**Step 1: Write the failing test**
Update the DB test to check for default categories, category color schema, and wallet/pocket ordering schema.
(Assuming tests exist, modify `src/lib/__tests__/db.test.ts` to expect `order` property and `color` property).

**Step 2: Run test to verify it fails**
Run: `bunx vitest run src/lib/__tests__/db.test.ts`
Expected: FAIL

**Step 3: Write minimal implementation**
Modify `package.json` to add `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` to dependencies.
Modify `src/lib/db.ts`:
- Increment DB version.
- Add `order` to Wallet and Pocket interfaces.
- Add `color` to Category interface.
- Add `seedDefaultCategories` method to automatically populate the default income and expense categories if the table is empty.

**Step 4: Run test to verify it passes**
Run: `bunx vitest run src/lib/__tests__/db.test.ts` (Note: skip if DB tests are basic, or fix them to pass).
Expected: PASS

**Step 5: Commit**
```bash
git add package.json src/lib/db.ts
git commit -m "feat(db): add schema properties for ordering and category colors"
```

---

### Task 2: Setting Page & Category Management Sheet

**Files:**
- Create: `src/components/category-management-sheet.tsx`
- Modify: `src/pages/settings.tsx`
- Modify: `src/components/ui/dropdown-menu.tsx` (Ensure shadcn component is available, if not we create it)

**Step 1: Write the failing test**
(No complex tests for basic UI, but we'll ensure `settings.tsx` renders without crashing).

**Step 2: Run test to verify it fails**
N/A

**Step 3: Write minimal implementation**
In `src/components/category-management-sheet.tsx`:
- Build a generic bottom sheet (`Drawer`) that fetches and lists categories.
- Include a form to add/edit a category, picking an icon and a color (stored as hex, rendered at 80% opacity).
In `src/pages/settings.tsx`:
- Refactor header to be sticky and minimal, matching `transactions.tsx`.
- Add a Dark Mode toggle connected to `useTheme()` from `next-themes`.
- Add a Category Management list item that triggers the new sheet.

**Step 4: Run test to verify it passes**
Run: `bun run lint && bun run typecheck`
Expected: PASS

**Step 5: Commit**
```bash
git add src/pages/settings.tsx src/components/category-management-sheet.tsx
git commit -m "feat(settings): add dark mode toggle and category management sheet"
```

---

### Task 3: Transaction Monthly Summary & Add Transaction Sheet

**Files:**
- Create: `src/components/transaction-bottom-sheet.tsx`
- Modify: `src/pages/transactions.tsx`
- Modify: `src/components/root-layout.tsx`

**Step 1: Write the failing test**
Update `dashboard.test.tsx` or similar if needed.

**Step 2: Run test to verify it fails**
N/A

**Step 3: Write minimal implementation**
In `src/pages/transactions.tsx`:
- Above the transaction groups, calculate the total Income, total Expense, and Net Total *for the currently filtered month*.
- Render this as a horizontally aligned card.
In `src/components/transaction-bottom-sheet.tsx`:
- Create a `Drawer` containing tabs: Income, Expense, Transfer.
- Connect forms to create corresponding transactions.
In `src/components/root-layout.tsx`:
- Import and render `TransactionBottomSheet`.
- Link the `GestureButton`'s `onTap` to open this sheet.

**Step 4: Run test to verify it passes**
Run: `bun run typecheck`
Expected: PASS

**Step 5: Commit**
```bash
git add src/pages/transactions.tsx src/components/transaction-bottom-sheet.tsx src/components/root-layout.tsx
git commit -m "feat(transactions): add monthly summary and add transaction sheet"
```

---

### Task 4: Wallet Page Redesign & Drag-and-Drop

**Files:**
- Modify: `src/pages/wallet.tsx`

**Step 1: Write the failing test**
Ensure `wallet.test.tsx` doesn't break due to missing structural components.

**Step 2: Run test to verify it fails**
N/A

**Step 3: Write minimal implementation**
In `src/pages/wallet.tsx`:
- Refactor the header to match `transactions.tsx` (sticky).
- Replace "Add Wallet" button with a `DropdownMenu` showing "Add Wallet" and "Order Wallets".
- Implement `@dnd-kit` contexts for reordering the main Wallet cards when "Order Wallets" is active.
- Inside the `Edit Wallet` drawer, implement `@dnd-kit` contexts for reordering Pockets.
- Add shadcn `AlertDialog` to handle wallet deletion confirmation instead of `window.confirm`.

**Step 4: Run test to verify it passes**
Run: `bun run lint && bun run typecheck`
Expected: PASS

**Step 5: Commit**
```bash
git add src/pages/wallet.tsx
git commit -m "feat(wallet): implement dnd ordering, dropdown menu, and alert dialogs"
```
