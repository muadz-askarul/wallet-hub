# Recurring Bills & Repeat Transactions Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Build a robust, offline-first scheduling and recurring transaction engine supporting automated repeat items and manual bills with swipe/tap trigger completions, fully responsive layouts, and historical transaction insertion.

**Architecture:** A unified Dexie `schedules` store with type differentiator `"bill" | "repeat"`. Auto-repeating items are processed on application load, and manual bills are resolved on user interaction. Both systems use an advanced, multi-period due-date calculator.

**Tech Stack:** React 19, Dexie.js (IndexedDB), Tailwind CSS v4, Lucide React, Base UI, Shadcn/ui.

---

## Task 1: Update Database Schema & Types

**Files:**
- Modify: `src/lib/db.ts`

**Step 1: Define Type Definitions**
Add `Schedule` interface to `src/lib/db.ts`:

```typescript
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
```

Add `schedules` table declaration to the `db` declaration type:
```typescript
  schedules: EntityTable<Schedule, "id">
```

**Step 2: Add Incremental Version Update**
Add `db.version(4)` to specify the upgraded schema store:
```typescript
db.version(4).stores({
  schedules: "id, type, isActive, nextDueDate, pocketId",
})
```

**Step 3: Verify & Build**
Run type-checking to ensure schema extension matches perfectly.
Run: `bun run typecheck`
Expected: PASS

**Step 4: Commit**
```bash
git add src/lib/db.ts
git commit -m "chore(db): add schedules store for recurring bills and repeat transactions"
```

---

## Task 2: Implement Due Date Calendar Calculator

**Files:**
- Create: `src/lib/utils/date-calculator.ts`
- Create: `src/lib/utils/__tests__/date-calculator.test.ts`

**Step 1: Write Unit Tests first (TDD)**
Create test cases for daily, weekday, end of the month, monthly, and annual due date advancements:

```typescript
import { expect, test, describe } from "vitest"
import { calculateNextDueDate } from "../date-calculator"

describe("calculateNextDueDate", () => {
  test("Every Day", () => {
    const start = new Date(2026, 4, 1) // May 1
    const next = calculateNextDueDate(start, "Every Day")
    expect(next.getDate()).toBe(2)
  })

  test("Weekdays advances on weekend", () => {
    const friday = new Date(2026, 4, 8) // Friday, May 8
    const next = calculateNextDueDate(friday, "Weekdays")
    expect(next.getDay()).toBe(1) // Monday, May 11
  })

  test("The end of the month handles different lengths", () => {
    const endJan = new Date(2026, 0, 31) // Jan 31
    const next = calculateNextDueDate(endJan, "The end of the month")
    expect(next.getDate()).toBe(28) // Feb 28
  })
})
```

**Step 2: Run Tests to Verify Failure**
Run: `bunx vitest run src/lib/utils/__tests__/date-calculator.test.ts`
Expected: FAIL (file/functions missing)

**Step 3: Implement Calculation Utility**
Create `src/lib/utils/date-calculator.ts` with the robust `calculateNextDueDate` function:

```typescript
export function calculateNextDueDate(currentDate: Date, period: string): Date {
  const next = new Date(currentDate)
  next.setHours(0, 0, 0, 0)

  switch (period) {
    case "Every Day":
      next.setDate(next.getDate() + 1)
      break
    case "Weekdays":
      next.setDate(next.getDate() + 1)
      while (next.getDay() === 0 || next.getDay() === 6) {
        next.setDate(next.getDate() + 1)
      }
      break
    case "Weekend":
      next.setDate(next.getDate() + 1)
      while (next.getDay() >= 1 && next.getDay() <= 5) {
        next.setDate(next.getDate() + 1)
      }
      break
    case "Every Week":
      next.setDate(next.getDate() + 7)
      break
    case "Every 2 Weeks":
      next.setDate(next.getDate() + 14)
      break
    case "Every 4 Weeks":
      next.setDate(next.getDate() + 28)
      break
    case "Every Month":
      next.setMonth(next.getMonth() + 1)
      break
    case "The end of the month": {
      const firstOfNextNext = new Date(next.getFullYear(), next.getMonth() + 2, 1)
      firstOfNextNext.setDate(firstOfNextNext.getDate() - 1)
      return firstOfNextNext
    }
    case "Every 2 Month":
      next.setMonth(next.getMonth() + 2)
      break
    case "Every 3 Month":
      next.setMonth(next.getMonth() + 3)
      break
    case "Every 4 Month":
      next.setMonth(next.getMonth() + 4)
      break
    case "Every 6 Month":
      next.setMonth(next.getMonth() + 6)
      break
    case "Anually":
    case "Annually":
      next.setMonth(next.getMonth() + 12)
      break
    default:
      next.setDate(next.getDate() + 1)
  }
  return next
}
```

**Step 4: Run Tests to Verify Success**
Run: `bunx vitest run src/lib/utils/__tests__/date-calculator.test.ts`
Expected: PASS

**Step 5: Commit**
```bash
git add src/lib/utils/date-calculator.ts src/lib/utils/__tests__/date-calculator.test.ts
git commit -m "feat(recurring): implement due date calculator utility with unit tests"
```

---

## Task 3: Build Recurring Services Engine

**Files:**
- Create: `src/lib/services/recurring-service.ts`

**Step 1: Implement background auto-repeat processing**
Create background engine function `processAutoRepeatTransactions()`:
- Loads active repeat schedules (`type === "repeat"`, `isActive === 1`) where `nextDueDate <= Date.now()`.
- Loops through passed due dates, creates a matching `Transaction` record, and advances the schedule due date.
- Ends schedule (`isActive = 0`) if new `nextDueDate > endDate`.
- Executes inside a transaction to maintain 100% atomicity.

```typescript
import { db, type Schedule, type Transaction } from "../db"
import { calculateNextDueDate } from "../utils/date-calculator"

export async function processAutoRepeatTransactions() {
  const now = Date.now()
  const activeSchedules = await db.schedules
    .where("type")
    .equals("repeat")
    .filter((s) => s.isActive === 1 && s.nextDueDate <= now)
    .toArray()

  if (activeSchedules.length === 0) return

  await db.transaction("rw", [db.transactions, db.schedules], async () => {
    for (const schedule of activeSchedules) {
      let currentDue = new Date(schedule.nextDueDate)
      const transactionsToAdd: Transaction[] = []

      while (currentDue.getTime() <= now) {
        // Stop if we hit the optional end date
        if (schedule.endDate && currentDue.getTime() > schedule.endDate) {
          schedule.isActive = 0
          break
        }

        const newTx: Transaction = {
          id: crypto.randomUUID(),
          type: schedule.transactionType,
          amount: schedule.amount,
          date: currentDue.getTime(),
          note: schedule.note,
          pocketId: schedule.pocketId,
          categoryId: schedule.categoryId,
          destinationPocketId: schedule.destinationPocketId,
        }

        transactionsToAdd.push(newTx)
        schedule.lastTriggeredDate = currentDue.getTime()

        // Advance to next due date
        const nextDue = calculateNextDueDate(currentDue, schedule.period)
        currentDue = nextDue

        // Disable if next occurrences are beyond end date
        if (schedule.endDate && currentDue.getTime() > schedule.endDate) {
          schedule.isActive = 0
          break
        }
      }

      schedule.nextDueDate = currentDue.getTime()

      // Bulk add all generated transactions
      if (transactionsToAdd.length > 0) {
        await db.transactions.bulkAdd(transactionsToAdd)
      }
      await db.schedules.put(schedule)
    }
  })
}
```

**Step 2: Implement Manual Bill Trigger Function**
Create `triggerBillPayment(scheduleId: string)`:
- Sets up standard transaction from manual bill details.
- Registers transaction, updates bill schedule `lastTriggeredDate` and advances `nextDueDate`.

```typescript
export async function triggerBillPayment(scheduleId: string) {
  const schedule = await db.schedules.get(scheduleId)
  if (!schedule) return

  await db.transaction("rw", [db.transactions, db.schedules], async () => {
    const newTx: Transaction = {
      id: crypto.randomUUID(),
      type: schedule.transactionType,
      amount: schedule.amount,
      date: schedule.nextDueDate, // Bill completed on its due date schedule
      note: schedule.note,
      pocketId: schedule.pocketId,
      categoryId: schedule.categoryId,
      destinationPocketId: schedule.destinationPocketId,
    }

    await db.transactions.add(newTx)

    schedule.lastTriggeredDate = schedule.nextDueDate
    const nextDue = calculateNextDueDate(new Date(schedule.nextDueDate), schedule.period)
    
    if (schedule.endDate && nextDue.getTime() > schedule.endDate) {
      schedule.isActive = 0
    }
    
    schedule.nextDueDate = nextDue.getTime()
    await db.schedules.put(schedule)
  })
}
```

**Step 3: Run Typecheck**
Run: `bun run typecheck`
Expected: PASS

**Step 4: Commit**
```bash
git add src/lib/services/recurring-service.ts
git commit -m "feat(recurring): implement core background services for auto-repeats and bills"
```

---

## Task 4: Connect Recurring Engine to App Initialization

**Files:**
- Modify: `src/components/root-layout.tsx`

**Step 1: Mount execution engine**
Call `processAutoRepeatTransactions()` inside `RootLayout` mount phase to keep databases fully updated when the app loads:

```typescript
import { processAutoRepeatTransactions } from "@/lib/services/recurring-service"

// Inside RootLayout useEffect:
  useEffect(() => {
    processAutoRepeatTransactions().catch((err) => {
      console.error("Failed to process auto-repeat schedules:", err)
    })
  }, [])
```

**Step 2: Verify lint and build**
Run: `bun run lint`
Expected: PASS

**Step 3: Commit**
```bash
git add src/components/root-layout.tsx
git commit -m "feat(recurring): trigger auto-repeat process engine on application start"
```

---

## Task 5: Add Schedule Option to Transaction Form Page

**Files:**
- Modify: `src/pages/transaction-form.tsx`

**Step 1: Implement Repeat Fields UI**
In `src/pages/transaction-form.tsx`, only when in "Add Mode" (`!id`), display a premium animated collapsable section: **"Set repeating schedule"**:
- **Schedule Type Toggle**: "Manual Bill" or "Automated Repeat"
- **Schedule Period Selection**: dropdown sheet containing our repeat periods.
- **End Date Picker**: optional date field to set schedule completion limits.

```typescript
// Add states to TransactionFormPage
const [isRecurring, setIsRecurring] = useState(false)
const [recurringType, setRecurringType] = useState<"bill" | "repeat">("repeat")
const [recurringPeriod, setRecurringPeriod] = useState<string>("Every Month")
const [endDateStr, setEndDateStr] = useState("")
```

**Step 2: Save Schedule on Submit**
Upon clicking "Save" or "Continue", if `isRecurring` is active, write both the initial transaction AND the matching schedule record:

```typescript
const scheduleId = crypto.randomUUID()
const startDate = selectedDate.getTime()
const nextDue = calculateNextDueDate(selectedDate, recurringPeriod)

const schedule: Schedule = {
  id: scheduleId,
  type: recurringType,
  period: recurringPeriod as any,
  amount,
  note,
  pocketId,
  categoryId,
  destinationPocketId,
  transactionType: type,
  startDate,
  nextDueDate: nextDue.getTime(),
  isActive: 1,
  endDate: endDateStr ? new Date(endDateStr).getTime() : undefined,
}
await db.schedules.add(schedule)
```

**Step 3: Verify and Test**
Run lint and verify form compiles completely.
Run: `bun run lint:fix && bun run typecheck`
Expected: PASS

**Step 4: Commit**
```bash
git add src/pages/transaction-form.tsx
git commit -m "feat(recurring): integrate repeating options into create transaction form"
```

---

## Task 6: Build Schedules Dashboard & Management Hub

**Files:**
- Modify: `src/pages/bills.tsx`

**Step 1: Replace template with comprehensive Hub**
Rewrite `src/pages/bills.tsx` to support segmented Tab controls for:
- 💳 **Active Bills** (Show upcoming bills, sorted chronologically with clear payment/complete primary button triggers).
- 🔄 **Repeat Templates** (Show active automated item schedules with an easy delete/deactivate option).

Include full details: Category details, balance indicators, period info, and a beautiful empty state if no schedules are registered.

**Step 2: Implement Complete Action Handler**
Attach a swipe / click trigger that calls `triggerBillPayment(id)` and triggers a toast notification:
```typescript
const handleCompleteBill = async (id: string, note: string) => {
  await triggerBillPayment(id)
  toast.success(`Completed bill payment: ${note}`)
}
```

**Step 3: Run verification suite**
Run: `bun run lint:fix && bun run typecheck && bunx vitest run`
Expected: PASS

**Step 4: Commit**
```bash
git add src/pages/bills.tsx
git commit -m "feat(recurring): build unified schedules hub for bills and repeat templates"
```

---

## Task 7: Dashboard Bills Widget & Navigation Action

**Files:**
- Modify: `src/pages/dashboard.tsx`

**Step 1: Load Bills due in current month**
Add query to Dashboard `useLiveQuery` block to retrieve manual bills:
```typescript
const now = new Date()
const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime()

const bills = await db.schedules
  .where("type")
  .equals("bill")
  .filter((s) => s.isActive === 1 && s.nextDueDate <= endOfMonth)
  .toArray()
```
Resolve category and pocket details for each bill to match transaction group aesthetics.

**Step 2: Add Bills widget under Net Assets card**
- Build a premium sliding list containing bills due this month.
- Include a fast-trigger "Pay Now" or "Complete" icon button directly on the dashboard.
- Place a text header **"Bills Due This Month"** and a chevron shortcut button leading to `/bills` for the complete hub.

**Step 3: Verify and complete**
Run: `bun run lint:fix && bun run typecheck && bunx vitest run`
Expected: ALL PASS

**Step 4: Commit**
```bash
git add src/pages/dashboard.tsx
git commit -m "feat(recurring): build dashboard bills widget with instant triggers and navigation shortcut"
```
