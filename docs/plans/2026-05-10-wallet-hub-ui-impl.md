# Phase 1 UI Building Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Build mobile-first UI for Phase 1 features, updating routing and bottom navigation to integrate with Dexie database.

**Architecture:** Use `react-router-dom` for navigation, feature-based pages in `src/pages/`, and `useLiveQuery` to connect Dexie data to UI components.

**Tech Stack:** React 19, React Router 7, Dexie-React-Hooks, Tailwind CSS v4, Lucide React, Vitest/Testing Library.



### Task 1: Setup UI Testing and Core Routing

**Files:**
- Modify: `package.json`
- Modify: `vitest.config.ts`
- Modify: `src/App.tsx`
- Modify: `src/components/root-layout.tsx`

**Step 1: Install Testing Library**
Run: `bun add -d jsdom @testing-library/react @testing-library/jest-dom`

**Step 2: Update vitest.config.ts for DOM testing**
```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
  },
});
```

**Step 3: Update vitest.setup.ts**
```ts
import 'fake-indexeddb/auto';
import '@testing-library/jest-dom';
```

**Step 4: Write failing test for routing**
Create `src/__tests__/App.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../App';

describe('App Routing', () => {
  it('renders bottom navigation items', () => {
    render(<App />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Bills')).toBeInTheDocument();
    expect(screen.getByText('Budget')).toBeInTheDocument();
    expect(screen.getByText('Wallet')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });
});
```

**Step 5: Run test to verify it fails**
Run: `bunx vitest run src/__tests__/App.test.tsx`
Expected: FAIL

**Step 6: Implement RootLayout and App Routing**
Modify `src/components/root-layout.tsx`:
```tsx
import { Outlet, Link, useLocation } from "react-router-dom"
import { BottomNavigationBar, BottomNavigationItem } from "@/components/ui/bottom-navigation-bar"
import { LayoutDashboard, Receipt, PieChart, Wallet, Settings } from "lucide-react"

export function RootLayout() {
  const location = useLocation()

  return (
    <div className="flex min-h-svh flex-col pb-32">
      <main className="flex-1">
        <Outlet />
      </main>

      <BottomNavigationBar autoShowDelay={500}>
        <BottomNavigationItem active={location.pathname === "/"} render={<Link to="/" />}>
          <LayoutDashboard className="h-6 w-6" strokeWidth={1.5} />
          <span className="sr-only">Dashboard</span>
        </BottomNavigationItem>
        <BottomNavigationItem active={location.pathname === "/bills"} render={<Link to="/bills" />}>
          <Receipt className="h-6 w-6" strokeWidth={1.5} />
          <span className="sr-only">Bills</span>
        </BottomNavigationItem>
        <BottomNavigationItem active={location.pathname === "/budget"} render={<Link to="/budget" />}>
          <PieChart className="h-6 w-6" strokeWidth={1.5} />
          <span className="sr-only">Budget</span>
        </BottomNavigationItem>
        <BottomNavigationItem active={location.pathname === "/wallet"} render={<Link to="/wallet" />}>
          <Wallet className="h-6 w-6" strokeWidth={1.5} />
          <span className="sr-only">Wallet</span>
        </BottomNavigationItem>
        <BottomNavigationItem active={location.pathname === "/settings"} render={<Link to="/settings" />}>
          <Settings className="h-6 w-6" strokeWidth={1.5} />
          <span className="sr-only">Settings</span>
        </BottomNavigationItem>
      </BottomNavigationBar>
    </div>
  )
}
```

Modify `src/App.tsx`:
```tsx
import { BrowserRouter, Routes, Route } from "react-router-dom"
import { RootLayout } from "@/components/root-layout"
import { DashboardPage } from "./pages/dashboard"
import { BillsPage } from "./pages/bills"
import { BudgetPage } from "./pages/budget"
import { WalletPage } from "./pages/wallet"
import { SettingsPage } from "./pages/settings"

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RootLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="bills" element={<BillsPage />} />
          <Route path="budget" element={<BudgetPage />} />
          <Route path="wallet" element={<WalletPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
```

Run: `mkdir -p src/pages`
Create placeholder pages in `src/pages/`:
`src/pages/dashboard.tsx`: `export function DashboardPage() { return <div>Dashboard</div> }`
`src/pages/bills.tsx`: `export function BillsPage() { return <div>Bills</div> }`
`src/pages/budget.tsx`: `export function BudgetPage() { return <div>Budget</div> }`
`src/pages/wallet.tsx`: `export function WalletPage() { return <div>Wallet</div> }`
`src/pages/settings.tsx`: `export function SettingsPage() { return <div>Settings</div> }`

**Step 7: Run test to verify it passes**
Run: `bunx vitest run src/__tests__/App.test.tsx`
Expected: PASS

**Step 8: Commit**
Run: `git add . && git commit -m "feat: setup core routing and navigation bar for phase 1"`

---

### Task 2: Build Dashboard Page

**Files:**
- Modify: `src/pages/dashboard.tsx`
- Create: `src/pages/__tests__/dashboard.test.tsx`

**Step 1: Write the failing test**
Create `src/pages/__tests__/dashboard.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DashboardPage } from '../dashboard';

describe('DashboardPage', () => {
  it('renders assets, liabilities, and total sections', () => {
    render(<DashboardPage />);
    expect(screen.getByText('Total Balance')).toBeInTheDocument();
    expect(screen.getByText('Assets')).toBeInTheDocument();
    expect(screen.getByText('Liabilities')).toBeInTheDocument();
    expect(screen.getByText('Recent Transactions')).toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**
Run: `bunx vitest run src/pages/__tests__/dashboard.test.tsx`
Expected: FAIL

**Step 3: Implement Dashboard Page**
Modify `src/pages/dashboard.tsx`:
```tsx
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { getPocketBalance } from "@/lib/services/transaction-service";

export function DashboardPage() {
  const transactions = useLiveQuery(() => db.transactions.orderBy('date').reverse().limit(10).toArray()) || [];
  
  const balances = useLiveQuery(async () => {
    const pockets = await db.pockets.toArray();
    let assets = 0;
    let liabilities = 0;
    
    for (const pocket of pockets) {
      const balance = await getPocketBalance(pocket.id);
      if (balance >= 0) assets += balance;
      else liabilities += Math.abs(balance);
    }
    
    return { assets, liabilities, total: assets - liabilities };
  }, [], { assets: 0, liabilities: 0, total: 0 });
  
  return (
    <div className="p-6 pb-24">
      <h1 className="mb-6 text-2xl font-semibold">Dashboard</h1>
      
      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <div className="rounded-xl bg-primary text-primary-foreground p-6 shadow-sm">
          <p className="text-sm opacity-80">Total Balance</p>
          <h2 className="text-3xl font-bold mt-2">Rp {balances.total.toLocaleString('id-ID')}</h2>
        </div>
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <p className="text-sm text-muted-foreground">Assets</p>
          <h2 className="text-2xl font-bold mt-2">Rp {balances.assets.toLocaleString('id-ID')}</h2>
        </div>
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <p className="text-sm text-muted-foreground">Liabilities</p>
          <h2 className="text-2xl font-bold mt-2">Rp {balances.liabilities.toLocaleString('id-ID')}</h2>
        </div>
      </div>

      <div>
        <h3 className="mb-4 text-lg font-medium">Recent Transactions</h3>
        {transactions.length === 0 ? (
          <p className="text-muted-foreground text-sm">No recent transactions.</p>
        ) : (
          <ul className="space-y-3">
            {transactions.map(tx => (
              <li key={tx.id} className="flex justify-between rounded-lg border p-4 shadow-sm">
                <span>{tx.type}</span>
                <span className={tx.type === 'expense' ? 'text-red-500' : 'text-green-500'}>
                  {tx.type === 'expense' ? '-' : '+'}Rp {tx.amount.toLocaleString('id-ID')}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
```

**Step 4: Run test to verify it passes**
Run: `bunx vitest run src/pages/__tests__/dashboard.test.tsx`
Expected: PASS

**Step 5: Commit**
Run: `git add . && git commit -m "feat: implement dashboard page UI"`

---

### Task 3: Build Wallet Page

**Files:**
- Modify: `src/pages/wallet.tsx`
- Create: `src/pages/__tests__/wallet.test.tsx`

**Step 1: Write the failing test**
Create `src/pages/__tests__/wallet.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WalletPage } from '../wallet';

describe('WalletPage', () => {
  it('renders wallet page with add button', () => {
    render(<WalletPage />);
    expect(screen.getByText('Wallets & Pockets')).toBeInTheDocument();
    expect(screen.getByText('Add Wallet')).toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**
Run: `bunx vitest run src/pages/__tests__/wallet.test.tsx`
Expected: FAIL

**Step 3: Implement Wallet Page**
Modify `src/pages/wallet.tsx`:
```tsx
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";

export function WalletPage() {
  const wallets = useLiveQuery(() => db.wallets.toArray()) || [];

  return (
    <div className="p-6 pb-24">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Wallets & Pockets</h1>
        <Button>Add Wallet</Button>
      </div>

      {wallets.length === 0 ? (
        <p className="text-muted-foreground text-sm">No wallets configured.</p>
      ) : (
        <div className="space-y-4">
          {wallets.map(wallet => (
            <div key={wallet.id} className="rounded-xl border p-4 shadow-sm">
              <h3 className="font-medium text-lg">{wallet.name}</h3>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

**Step 4: Run test to verify it passes**
Run: `bunx vitest run src/pages/__tests__/wallet.test.tsx`
Expected: PASS

**Step 5: Commit**
Run: `git add . && git commit -m "feat: implement wallet and pockets list UI"`

---

### Task 4: Setup Placeholder Pages & Settings

**Files:**
- Modify: `src/pages/bills.tsx`
- Modify: `src/pages/budget.tsx`
- Modify: `src/pages/settings.tsx`

**Step 1: Write implementations directly (Placeholders)**

Modify `src/pages/bills.tsx`:
```tsx
export function BillsPage() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center p-6 text-center">
      <h1 className="text-2xl font-semibold mb-2">Recurring Bills</h1>
      <p className="text-muted-foreground">Coming soon in Phase 2</p>
    </div>
  )
}
```

Modify `src/pages/budget.tsx`:
```tsx
export function BudgetPage() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center p-6 text-center">
      <h1 className="text-2xl font-semibold mb-2">Zero-Based Budget</h1>
      <p className="text-muted-foreground">Coming soon in Phase 2</p>
    </div>
  )
}
```

Modify `src/pages/settings.tsx`:
```tsx
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";

export function SettingsPage() {
  const settings = useLiveQuery(() => db.settings.get('user_settings'));

  return (
    <div className="p-6 pb-24">
      <h1 className="text-2xl font-semibold mb-6">Settings</h1>
      
      <div className="space-y-6">
        <div className="rounded-xl border p-4 shadow-sm">
          <h3 className="font-medium mb-4">Preferences</h3>
          <div className="flex justify-between py-2 border-b">
            <span>Currency</span>
            <span className="text-muted-foreground">{settings?.currency || 'IDR'}</span>
          </div>
          <div className="flex justify-between py-2">
            <span>Dark Mode</span>
            <span className="text-muted-foreground">{settings?.darkMode ? 'On' : 'Off'}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
```

**Step 2: Commit**
Run: `git add . && git commit -m "feat: add placeholder pages and settings UI"`
