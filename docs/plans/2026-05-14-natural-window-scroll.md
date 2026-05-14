# Natural Window Scroll Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Migrate from viewport-locked page layouts to natural window scrolling so the BottomNavigationBar's existing `window.scrollY` hide-on-scroll works correctly.

**Architecture:** Remove per-page viewport locking (`h-[calc(100svh-5rem)]` + `overflow-hidden` + inner `overflow-y-auto`). Let pages grow to natural content height and scroll via the window. Use `sticky` positioning for headers and key sections. Move `overflow-x: hidden` from `<main>` to `body` in CSS to prevent nested scroll containers.

**Tech Stack:** React, Tailwind CSS v4, React Router

---

### Task 1: Create PageHeader Component

**Files:**
- Create: `src/components/ui/page-header.tsx`

**Context:** Currently every page duplicates the same header div with classes like `flex h-16 shrink-0 items-center border-b bg-background/95 px-4 backdrop-blur`. This task creates a single reusable component. It must use `sticky top-0 z-20` so the header stays pinned when the window scrolls.

**Step 1: Create the PageHeader component file**

Create `src/components/ui/page-header.tsx` with the following exact content:

```tsx
import * as React from "react"
import { cn } from "@/lib/utils"

interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export function PageHeader({ children, className, ...props }: PageHeaderProps) {
  return (
    <div
      className={cn(
        "sticky top-0 z-20 flex h-16 items-center border-b bg-background/95 px-4 backdrop-blur supports-backdrop-filter:bg-background/60",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
```

**Step 2: Verify the file was created correctly**

Run: `cat src/components/ui/page-header.tsx`

Expected: The file contents match the code above.

**Step 3: Run type check**

Run: `npm run typecheck`

Expected: Exit code 0, no errors.

**Step 4: Commit**

```bash
git add src/components/ui/page-header.tsx
git commit -m "feat: add reusable PageHeader component with sticky positioning"
```

---

### Task 2: Update index.css — Move overflow-x to body level

**Files:**
- Modify: `src/index.css` (lines 130-156, the `@layer base` block)

**Context:** Currently `overflow-x-hidden` is on `<main>` in `root-layout.tsx`. Per CSS spec, setting `overflow-x: hidden` on an element forces `overflow-y: auto`, creating a nested scroll container. This makes `window.scrollY` always 0. We need to move `overflow-x: hidden` to the `body` element in CSS instead.

**Step 1: Add `overflow-x: hidden` to the existing `body` rule in `@layer base`**

In `src/index.css`, find this block (around line 134-137):

```css
  body {
    @apply bg-background text-foreground;
    touch-action: manipulation;
    }
```

Replace it with:

```css
  body {
    @apply bg-background text-foreground;
    touch-action: manipulation;
    overflow-x: hidden;
    }
```

**Step 2: Run type check**

Run: `npm run typecheck`

Expected: Exit code 0, no errors.

**Step 3: Commit**

```bash
git add src/index.css
git commit -m "fix: move overflow-x hidden to body level to prevent nested scroll containers"
```

---

### Task 3: Update root-layout.tsx — Remove viewport constraints

**Files:**
- Modify: `src/components/root-layout.tsx` (lines 54-55)

**Context:** The root layout currently has `h-svh` on the outer div and `overflow-x-hidden` on `<main>`. Both create nested scroll containers that prevent `window.scrollY` from working. We need to remove both. The `pb-20` for bottom nav spacing stays. The `page-transition` div stays.

**Step 1: Update the root layout container**

In `src/components/root-layout.tsx`, find this block (lines 54-55):

```tsx
    <div className={`flex h-svh flex-col ${showNavBar ? "pb-20" : ""}`}>
      <main className="relative flex-1 overflow-x-hidden">
```

Replace it with:

```tsx
    <div className={`flex min-h-svh flex-col ${showNavBar ? "pb-20" : ""}`}>
      <main className="relative flex-1">
```

**Why `min-h-svh` instead of removing it entirely:** We keep `min-h-svh` so that short pages (like Settings) still fill the screen height. But unlike `h-svh` (which constrains height and forces overflow), `min-h-svh` allows the content to grow beyond the viewport and scroll the window naturally.

**Step 2: Run type check**

Run: `npm run typecheck`

Expected: Exit code 0, no errors.

**Step 3: Commit**

```bash
git add src/components/root-layout.tsx
git commit -m "fix: remove viewport lock from root layout to enable natural window scroll"
```

---

### Task 4: Update DashboardPage — Remove viewport lock, add sticky sections

**Files:**
- Modify: `src/pages/dashboard.tsx` (lines 168-278)

**Context:** The dashboard currently has `h-[calc(100svh-5rem)]` + `overflow-hidden` on the root div, and `overflow-y-auto` on the transaction list. The balance display + assets/liabilities card + bills section + "Recent Transactions" label should all be sticky at the top. The transaction list below should scroll naturally.

**Step 1: Replace the root container and sticky section**

In `src/pages/dashboard.tsx`, find this block (lines 168-170):

```tsx
    <div className="flex h-[calc(100svh-5rem)] flex-col overflow-hidden">
      <div className="shrink-0 px-6 pt-6 pb-2">
```

Replace with:

```tsx
    <div>
      <div className="sticky top-0 z-10 bg-background px-6 pt-6 pb-2">
```

**Step 2: Remove overflow-y-auto from the transactions container**

In `src/pages/dashboard.tsx`, find this line (line 278):

```tsx
      <div className="flex-1 overflow-y-auto px-6 pt-2 pb-6">
```

Replace with:

```tsx
      <div className="px-6 pt-2 pb-6">
```

**Step 3: Run type check**

Run: `npm run typecheck`

Expected: Exit code 0, no errors.

**Step 4: Commit**

```bash
git add src/pages/dashboard.tsx
git commit -m "refactor: dashboard uses natural scroll with sticky balance section"
```

---

### Task 5: Update TransactionsPage — Use PageHeader, keep summary sticky

**Files:**
- Modify: `src/pages/transactions.tsx` (lines 1-5 for import, lines 162-304 for layout)

**Context:** The transactions page has: (1) a header with month-switcher and action buttons, (2) a sticky filter/summary section, (3) the transaction list. The header becomes a `<PageHeader>`. The filter/summary section stays `sticky` but its `top` value must account for the header height (4rem = `top-16`). The transaction list scrolls naturally.

**Step 1: Add PageHeader import**

In `src/pages/transactions.tsx`, find the import block at the top. After the last import line (line 18, the `} from "@/components/transaction-group"` line), add a new line:

```tsx
import { PageHeader } from "@/components/ui/page-header"
```

**Step 2: Replace the root container and header**

In `src/pages/transactions.tsx`, find these lines (162-165):

```tsx
    <div className="flex h-[calc(100svh-5rem)] flex-col overflow-hidden">
      {/* Header */}
      <div className="flex h-16 shrink-0 items-center justify-between border-b bg-background/95 px-4 backdrop-blur supports-backdrop-filter:bg-background/60">
```

Replace with:

```tsx
    <div>
      {/* Header */}
      <PageHeader className="justify-between">
```

**Step 3: Replace the header closing div**

Find the closing `</div>` of the header. It is on line 224 — the `</div>` that closes the header section opened at line 165. It sits right before the empty line and the `<div className="flex-1 overflow-y-auto">` line.

Replace:

```tsx
      </div>
```

With:

```tsx
      </PageHeader>
```

**Step 4: Remove the inner scroll container wrapper**

Find this line (around line 226, right after the header closing):

```tsx
      <div className="flex-1 overflow-y-auto">
```

Replace with:

```tsx
      <div>
```

**Step 5: Update the sticky summary section's top offset**

Find this line (around line 227):

```tsx
        <div className="sticky top-0 z-10 space-y-4 bg-background/95 p-4 pb-2 backdrop-blur supports-backdrop-filter:bg-background/60">
```

Replace with:

```tsx
        <div className="sticky top-16 z-10 space-y-4 bg-background/95 p-4 pb-2 backdrop-blur supports-backdrop-filter:bg-background/60">
```

**Why `top-16`:** The PageHeader is `h-16` (4rem). The summary must stack immediately below it, so `top-16` (4rem) is the correct offset.

**Step 6: Run type check**

Run: `npm run typecheck`

Expected: Exit code 0, no errors.

**Step 7: Commit**

```bash
git add src/pages/transactions.tsx
git commit -m "refactor: transactions page uses PageHeader and natural window scroll"
```

---

### Task 6: Update WalletPage — Use PageHeader, remove viewport lock

**Files:**
- Modify: `src/pages/wallet.tsx` (lines 1-50 for import, lines 418-490 for layout)

**Context:** The wallet page has a header + wallet card list + a Drawer (portal). The header becomes `<PageHeader>`. The content area loses its `overflow-y-auto`. The Drawer is rendered as a sibling inside a fragment (`<>`), unaffected by layout changes.

**Step 1: Add PageHeader import**

In `src/pages/wallet.tsx`, after the last import line (line 50, `import { CSS, type Transform } from "@dnd-kit/utilities"`), add:

```tsx
import { PageHeader } from "@/components/ui/page-header"
```

**Step 2: Replace the root container and header**

Find these lines (around 419-422):

```tsx
      <div className="flex h-[calc(100svh-5rem)] flex-col overflow-hidden">
        {/* Sticky Header */}
        <div className="shrink-0 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur supports-backdrop-filter:bg-background/60">
```

Replace with:

```tsx
      <div>
        {/* Sticky Header */}
        <PageHeader className="justify-between">
```

**Step 3: Replace the header closing div**

Find the closing `</div>` of the header (line 454 — the `</div>` right after the "Save" button for order mode, just before the content area):

Replace:

```tsx
        </div>
```

With:

```tsx
        </PageHeader>
```

**Step 4: Remove overflow-y-auto from the content area**

Find this line (around line 456):

```tsx
        <div className="flex-1 overflow-y-auto p-4">
```

Replace with:

```tsx
        <div className="p-4">
```

**Step 5: Run type check**

Run: `npm run typecheck`

Expected: Exit code 0, no errors.

**Step 6: Commit**

```bash
git add src/pages/wallet.tsx
git commit -m "refactor: wallet page uses PageHeader and natural window scroll"
```

---

### Task 7: Update SettingsPage — Use PageHeader, remove viewport lock

**Files:**
- Modify: `src/pages/settings.tsx` (lines 1-10 for import, lines 69-201 for layout)

**Context:** The settings page has a header + settings list + a CategoryManagementSheet (rendered as sibling in a fragment). The header becomes `<PageHeader>`. The content area loses its `overflow-y-auto`.

**Step 1: Add PageHeader import**

In `src/pages/settings.tsx`, after the last import line (line 10, `import { toast } from "sonner"`), add:

```tsx
import { PageHeader } from "@/components/ui/page-header"
```

**Step 2: Replace the return block's root container and header**

Find these lines (around 69-75):

```tsx
  return (
    <>
      <div className="flex h-[calc(100svh-5rem)] flex-col overflow-hidden">
      {/* Sticky Header — same style as transactions page */}
      <div className="shrink-0 flex h-16 items-center border-b bg-background/95 px-4 backdrop-blur supports-backdrop-filter:bg-background/60">
        <h1 className="text-lg font-semibold">Settings</h1>
      </div>
```

Replace with:

```tsx
  return (
    <>
      <div>
      {/* Sticky Header */}
      <PageHeader>
        <h1 className="text-lg font-semibold">Settings</h1>
      </PageHeader>
```

**Step 3: Remove overflow-y-auto from the content area**

Find this line (around line 77):

```tsx
      <div className="flex-1 overflow-y-auto p-4">
```

Replace with:

```tsx
      <div className="p-4">
```

**Step 4: Run type check**

Run: `npm run typecheck`

Expected: Exit code 0, no errors.

**Step 5: Commit**

```bash
git add src/pages/settings.tsx
git commit -m "refactor: settings page uses PageHeader and natural window scroll"
```

---

### Task 8: Update BillsPage — Use PageHeader, remove viewport lock

**Files:**
- Modify: `src/pages/bills.tsx` (lines 1-20 for import, lines 73-371 for layout)

**Context:** The bills page has a header with back button + "Add" button, then tab content. The header becomes `<PageHeader>`. The content area loses its `overflow-y-auto`.

**Step 1: Add PageHeader import**

In `src/pages/bills.tsx`, after the last import line (line 20, `import { cn } from "@/lib/utils"`), add:

```tsx
import { PageHeader } from "@/components/ui/page-header"
```

**Step 2: Replace the root container and header**

Find these lines (around 73-76):

```tsx
    <div className="flex h-[calc(100svh-5rem)] flex-col overflow-hidden">
      {/* Sticky Header — Matches standard form header */}
      <div className="shrink-0 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur supports-backdrop-filter:bg-background/60">
```

Replace with:

```tsx
    <div>
      {/* Sticky Header */}
      <PageHeader className="justify-between">
```

**Step 3: Replace the header closing div**

Find the closing `</div>` of the header (line 96 — it's right after the "Add" button, just before the content area starting with the tab control):

Replace:

```tsx
      </div>
```

With:

```tsx
      </PageHeader>
```

**Step 4: Remove overflow-y-auto from the content area**

Find this line (around line 98):

```tsx
      <div className="flex-1 overflow-y-auto p-4">
```

Replace with:

```tsx
      <div className="p-4">
```

**Step 5: Run type check**

Run: `npm run typecheck`

Expected: Exit code 0, no errors.

**Step 6: Commit**

```bash
git add src/pages/bills.tsx
git commit -m "refactor: bills page uses PageHeader and natural window scroll"
```

---

### Task 9: Update TransactionFormPage — Use PageHeader, remove viewport lock

**Files:**
- Modify: `src/pages/transaction-form.tsx` (imports + lines 293-641 for layout)

**Context:** The transaction form page has a header with back button + title, then a scrollable form, then bottom sheets and dialogs as siblings in a fragment. The header becomes `<PageHeader>`. The form area loses its `overflow-y-auto`. The bottom sheets/dialogs stay as siblings.

**Step 1: Add PageHeader import**

In `src/pages/transaction-form.tsx`, find the import for `ChevronLeft` (it's in the lucide-react import block). After all the existing imports, add:

```tsx
import { PageHeader } from "@/components/ui/page-header"
```

**Step 2: Replace the root container and header**

Find these lines (around 294-297):

```tsx
      <div className="flex h-[calc(100svh-5rem)] flex-col overflow-hidden">
      {/* Sticky Header */}
      <div className="shrink-0 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur supports-backdrop-filter:bg-background/60">
```

Replace with:

```tsx
      <div>
      {/* Sticky Header */}
      <PageHeader className="justify-between">
```

**Step 3: Replace the header closing div**

Find the closing `</div>` of the header (line 315 — it's right after `<div className="size-8" />` spacer comment):

Replace:

```tsx
      </div>
```

With:

```tsx
      </PageHeader>
```

**Step 4: Remove overflow-y-auto from the form content area**

Find this line (around line 317):

```tsx
      <div className="flex-1 overflow-y-auto p-4 pb-12">
```

Replace with:

```tsx
      <div className="p-4 pb-12">
```

**Step 5: Run type check**

Run: `npm run typecheck`

Expected: Exit code 0, no errors.

**Step 6: Commit**

```bash
git add src/pages/transaction-form.tsx
git commit -m "refactor: transaction form uses PageHeader and natural window scroll"
```

---

### Task 10: Manual Verification — Test scroll behavior

**Context:** All code changes are done. This task is a manual verification to ensure everything works correctly.

**Step 1: Start the dev server**

Run: `bun run dev`

**Step 2: Test in browser — Dashboard**

Open the app in a mobile-sized browser viewport (e.g. 390x844 iPhone 14 size):

1. Navigate to Dashboard (`/`)
2. Verify: The balance, assets/liabilities, bills carousel, and "Recent Transactions" label are all sticky at the top
3. Scroll down through the transaction list
4. Verify: The BottomNavigationBar hides when scrolling down and shows when scrolling up
5. Verify: The sticky section stays pinned while transactions scroll underneath

**Step 3: Test in browser — Transactions**

1. Navigate to Transactions (`/transactions`)
2. Verify: The month-switcher header is sticky at the top
3. Verify: The pocket filter chip and monthly summary card are sticky just below the header
4. Scroll down through transactions
5. Verify: The BottomNavigationBar hides/shows on scroll

**Step 4: Test in browser — Other pages**

1. Navigate to Wallet, Settings, Bills
2. Verify: Headers are sticky at the top
3. Verify: Content scrolls naturally
4. Verify: BottomNavigationBar hides/shows on scroll (if there's enough content to scroll)

**Step 5: Test in browser — Transaction Form**

1. Navigate to `/transactions/new`
2. Verify: The header with "Back" and title is sticky
3. Verify: The form scrolls naturally
4. Verify: Bottom sheets (pocket picker, category picker) still open correctly

**Step 6: If all tests pass, commit a final verification note**

No additional code changes needed. All tasks are complete.
