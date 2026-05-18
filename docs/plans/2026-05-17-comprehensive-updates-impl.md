# Comprehensive UI/UX and Functional Updates Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Perform a series of refinements to terminology, input UX, navigation logic, and data portability.

**Architecture:**
- Global terminology rename (Bill -> Reminder).
- Input state management updates (empty defaults, auto-focus).
- Navigation logic refinement (history replacement).
- Dashboard data fetching and UI tightening.
- CSV export/import service using `navigator.share`.

**Tech Stack:** React 19, TypeScript, Dexie, React Router 7, Lucide React.

---

### Task 1: Rename Bill to Reminder

**Files:**
- Rename: `src/pages/bills.tsx` -> `src/pages/reminders.tsx`
- Modify: `src/App.tsx`
- Modify: `src/components/root-layout.tsx`
- Modify: `src/pages/dashboard.tsx`
- Modify: `src/pages/transaction-form.tsx`

**Step 1: Rename the page file**
```bash
mv src/pages/bills.tsx src/pages/reminders.tsx
```

**Step 2: Update App.tsx routes**
Update imports and route paths from `bills` to `reminders`.

**Step 3: Update navigation items**
In `root-layout.tsx`, change labels and paths.

**Step 4: Update global strings**
Replace "Bill", "Bills", "Manual Bill" with "Reminder", "Reminders", "Manual Reminder" across the project.

**Step 5: Commit**
```bash
git add .
git commit -m "chore: rename bills to reminders project-wide"
```

---

### Task 2: Improve Amount Input UX

**Files:**
- Modify: `src/components/ui/numeric-input.tsx`
- Modify: `src/pages/transaction-form.tsx`
- Modify: `src/pages/wallet-form.tsx`
- Modify: `src/pages/onboarding.tsx`

**Step 1: Update NumericInput**
Ensure it handles `undefined` or `""` and shows placeholder.

**Step 2: Update form states**
Change initial amount state from `0` to `undefined` or `""`.

**Step 3: Commit**
```bash
git add src/components/ui/numeric-input.tsx src/pages/transaction-form.tsx src/pages/wallet-form.tsx src/pages/onboarding.tsx
git commit -m "ux: default amount inputs to empty instead of 0"
```

---

### Task 4: Wallet Creation UX (Auto-focus)

**Files:**
- Modify: `src/pages/wallet-form.tsx`
- Modify: `src/pages/onboarding.tsx`

**Step 1: Implement auto-focus in WalletFormPage**
Use `useRef` and `useEffect` to focus the name input when the page loads (especially for "New Wallet" mode).

**Step 2: Fix Onboarding name default**
Ensure new wallets in onboarding start with empty names.

**Step 3: Commit**
```bash
git add src/pages/wallet-form.tsx src/pages/onboarding.tsx
git commit -m "ux: auto-focus wallet name and default to empty on creation"
```

---

### Task 5: Smart Navigation History

**Files:**
- Create: `src/lib/utils/navigation.ts` (if needed) or update components directly.
- Modify: `src/pages/transaction-form.tsx`
- Modify: `src/pages/wallet-form.tsx`

**Step 1: Implement logic in submit handlers**
If destination route is same as previous, use `{ replace: true }`.

**Step 2: Commit**
```bash
git add src/pages/transaction-form.tsx src/pages/wallet-form.tsx
git commit -m "feat: use replace in navigation history when returning to same route"
```

---

### Task 6: Dashboard Refinements

**Files:**
- Modify: `src/pages/dashboard.tsx`

**Step 1: Tighten Reminder Card UI**
Reduce padding, gaps, and sizes to halve the height.

**Step 2: Update 1-month filtering**
Change the date calculation to look ahead exactly one calendar month.

**Step 3: Remove counter**
Delete the `({data.enrichedReminders.length})` from the See All link.

**Step 4: Commit**
```bash
git add src/pages/dashboard.tsx
git commit -m "style(dashboard): tighten reminder cards and update 1-month filtering"
```

---

### Task 7: CSV Backup & Restore

**Files:**
- Create: `src/lib/services/backup-service.ts`
- Modify: `src/pages/settings.tsx`

**Step 1: Implement Export logic**
Flatten all DB tables into a single CSV with a `table_name` column.

**Step 2: Implement Share functionality**
Use `navigator.share()` for sharing the CSV file.

**Step 3: Implement Restore logic**
Parse CSV and populate IndexedDB.

**Step 4: Add UI to Settings**
Add Export and Import buttons.

**Step 5: Commit**
```bash
git add src/lib/services/backup-service.ts src/pages/settings.tsx
git commit -m "feat: implement CSV backup/restore with sharing support"
```
