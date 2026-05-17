# UI Revamp and Robustness Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Revamp key UI components for better mobile ergonomics and visual density, remove biometric features, and add IndexedDB robustness.

**Architecture:**

- Create a reusable `AutoTextSize` component using `ResizeObserver` to scale text dynamically.
- Refactor the transaction form to use a sticky footer for actions and a drawer for repeat settings.
- Implement a storage availability check during app boot.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, Lucide React, shadcn/ui (Drawer).

---

### Task 1: Create AutoTextSize Component

**Files:**

- Create: `src/components/ui/auto-text-size.tsx`

**Step 1: Write the component**
Create a component that measures its parent's width and scales font-size between 0.5rem and 1rem to ensure it doesn't exceed 30% of parent width.

```tsx
import React, { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

interface AutoTextSizeProps {
  children: React.ReactNode
  className?: string
  maxSizeRem?: number
  minSizeRem?: number
  maxParentWidthPercent?: number
}

export function AutoTextSize({
  children,
  className,
  maxSizeRem = 1,
  minSizeRem = 0.5,
  maxParentWidthPercent = 30,
}: AutoTextSizeProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [fontSize, setFontSize] = useState(maxSizeRem)

  useEffect(() => {
    const el = containerRef.current
    if (!el || !el.parentElement) return

    const observer = new ResizeObserver(() => {
      const parentWidth = el.parentElement!.clientWidth
      const maxWidth = (parentWidth * maxParentWidthPercent) / 100

      // Temporary reset to measure natural width
      el.style.fontSize = `${maxSizeRem}rem`
      let currentWidth = el.scrollWidth

      if (currentWidth > maxWidth) {
        const ratio = maxWidth / currentWidth
        const newSize = Math.max(minSizeRem, maxSizeRem * ratio)
        setFontSize(newSize)
      } else {
        setFontSize(maxSizeRem)
      }
    })

    observer.observe(el.parentElement)
    return () => observer.disconnect()
  }, [maxSizeRem, minSizeRem, maxParentWidthPercent])

  return (
    <div
      ref={containerRef}
      className={cn("inline-block whitespace-nowrap transition-all", className)}
      style={{ fontSize: `${fontSize}rem` }}
    >
      {children}
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/components/ui/auto-text-size.tsx
git commit -m "feat: add AutoTextSize component"
```

---

### Task 2: Refine Wallet Page

**Files:**

- Modify: `src/pages/wallet.tsx`

**Step 1: Apply smaller text and AutoTextSize**
Change pocket name and amount to `text-xs` and wrap them in `AutoTextSize`.

**Step 2: Commit**

```bash
git add src/pages/wallet.tsx
git commit -m "style(wallet): smaller pocket labels and auto text sizing"
```

---

### Task 3: Refine Transaction List

**Files:**

- Modify: `src/components/transaction-group.tsx`

**Step 1: Wrap amounts in AutoTextSize**
Apply `AutoTextSize` to the transaction amount display in history.

**Step 2: Commit**

```bash
git add src/components/transaction-group.tsx
git commit -m "style(history): apply auto text sizing to transaction amounts"
```

---

### Task 4: Revamp PIN Input Form

**Files:**

- Modify: `src/components/pin-input-form.tsx`

**Step 1: Increase button size and remove biometrics**

- Change number buttons from `h-16 w-16` to `h-20 w-20`.
- Remove `isBiometricEnabled`, `onBiometricClick` props and the biometric button logic.

**Step 2: Commit**

```bash
git add src/components/pin-input-form.tsx
git commit -m "refactor(pin): bigger buttons and remove biometric support"
```

---

### Task 5: Disable Biometrics in Settings and Onboarding

**Files:**

- Modify: `src/pages/settings.tsx`
- Modify: `src/pages/onboarding.tsx`

**Step 1: Comment out biometric features**

- In `settings.tsx`, comment out the Biometric Unlock section.
- In `onboarding.tsx`, comment out Step 3 logic and navigation.

**Step 2: Commit**

```bash
git add src/pages/settings.tsx src/pages/onboarding.tsx
git commit -m "chore: disable biometric features from settings and onboarding"
```

---

### Task 6: Revamp Transaction Form UI

**Files:**

- Modify: `src/pages/transaction-form.tsx`

**Step 1: Implement Sticky Footer**
Wrap the "Save" and "Continue" buttons in a fixed bottom container.

**Step 2: Implement Repeat Settings Sheet**

- Move repeating schedule fields into a `Drawer`.
- Add a `RefreshCw` trigger button beside the amount input.
- Highlight trigger button when `isRecurring` is true.

**Step 3: Commit**

```bash
git add src/pages/transaction-form.tsx
git commit -m "feat(tx-form): sticky footer and drawer for repeat settings"
```

---

### Task 7: Implement IndexedDB Robustness

**Files:**

- Modify: `src/App.tsx`
- Modify: `src/lib/providers/app-lock-provider.tsx` (if needed for state)

**Step 1: Add storage check**
Detect if IndexedDB is available. If not, show an error state.

**Step 2: Commit**

```bash
git add src/App.tsx
git commit -m "feat: add IndexedDB availability check"
```
