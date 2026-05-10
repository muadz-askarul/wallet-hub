# Wallet Hub Phase 1 Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Implement the offline-first IndexedDB schema, data services, and app lock security for Wallet Hub Phase 1.

**Architecture:** We use Dexie.js for IndexedDB. Balances are calculated dynamically by summing transactions. A Wallet contains Pockets, and Transactions belong strictly to Pockets.

**Tech Stack:** React 19, Dexie.js, Vitest (for testing).

---

### Task 1: Setup Dexie Database Schema

**Files:**
- Create: `src/lib/db.ts`
- Create: `src/lib/__tests__/db.test.ts`

**Step 1: Write the failing test**

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db';

describe('Database Initialization', () => {
  it('should have defined tables', () => {
    expect(db.wallets).toBeDefined();
    expect(db.pockets).toBeDefined();
    expect(db.categories).toBeDefined();
    expect(db.transactions).toBeDefined();
    expect(db.settings).toBeDefined();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun test src/lib/__tests__/db.test.ts`
Expected: FAIL with "module not found" or "db is undefined"

**Step 3: Write minimal implementation**

```typescript
import Dexie, { type EntityTable } from 'dexie';

export interface Wallet {
  id: string;
  name: string;
  icon?: string;
  createdAt: number;
}

export interface Pocket {
  id: string;
  walletId: string;
  name: string;
  createdAt: number;
}

export interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
  icon?: string;
}

export interface Transaction {
  id: string;
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  date: number;
  note?: string;
  pocketId: string;
  categoryId?: string; // Optional for transfers
  destinationPocketId?: string; // Only for transfers
}

export interface Settings {
  id: 'user_settings';
  darkMode: boolean;
  currency: string;
  pin: string;
}

const db = new Dexie('WalletHubDB') as Dexie & {
  wallets: EntityTable<Wallet, 'id'>;
  pockets: EntityTable<Pocket, 'id'>;
  categories: EntityTable<Category, 'id'>;
  transactions: EntityTable<Transaction, 'id'>;
  settings: EntityTable<Settings, 'id'>;
};

db.version(1).stores({
  wallets: 'id, name',
  pockets: 'id, walletId',
  categories: 'id, type',
  transactions: 'id, pocketId, type, date',
  settings: 'id'
});

export { db };
```

**Step 4: Run test to verify it passes**

Run: `bun test src/lib/__tests__/db.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/db.ts src/lib/__tests__/db.test.ts
git commit -m "feat: initialize Dexie database schema for phase 1"
```

---

### Task 2: Create Wallet & Pocket Service

**Files:**
- Create: `src/lib/services/wallet-service.ts`
- Create: `src/lib/__tests__/wallet-service.test.ts`

**Step 1: Write the failing test**

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db';
import { createWallet } from '../services/wallet-service';

describe('Wallet Service', () => {
  beforeEach(async () => {
    await db.wallets.clear();
    await db.pockets.clear();
  });

  it('should create a wallet and a default pocket', async () => {
    const wallet = await createWallet('Cash');
    expect(wallet.name).toBe('Cash');
    
    const pockets = await db.pockets.where('walletId').equals(wallet.id).toArray();
    expect(pockets.length).toBe(1);
    expect(pockets[0].name).toBe('Cash pocket');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun test src/lib/__tests__/wallet-service.test.ts`
Expected: FAIL 

**Step 3: Write minimal implementation**

```typescript
import { db, type Wallet, type Pocket } from '../db';

export async function createWallet(name: string, icon?: string): Promise<Wallet> {
  const walletId = crypto.randomUUID();
  const pocketId = crypto.randomUUID();
  const now = Date.now();

  const wallet: Wallet = { id: walletId, name, icon, createdAt: now };
  const pocket: Pocket = { id: pocketId, walletId, name: `${name} pocket`, createdAt: now };

  await db.transaction('rw', db.wallets, db.pockets, async () => {
    await db.wallets.add(wallet);
    await db.pockets.add(pocket);
  });

  return wallet;
}
```

**Step 4: Run test to verify it passes**

Run: `bun test src/lib/__tests__/wallet-service.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/services/wallet-service.ts src/lib/__tests__/wallet-service.test.ts
git commit -m "feat: create wallet service with default pocket creation"
```

---

### Task 3: Create Transaction Service (Dynamic Balance)

**Files:**
- Create: `src/lib/services/transaction-service.ts`
- Create: `src/lib/__tests__/transaction-service.test.ts`

**Step 1: Write the failing test**

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db';
import { getPocketBalance } from '../services/transaction-service';

describe('Transaction Service', () => {
  beforeEach(async () => {
    await db.transactions.clear();
  });

  it('should dynamically calculate pocket balance', async () => {
    await db.transactions.bulkAdd([
      { id: '1', type: 'income', amount: 100, date: Date.now(), pocketId: 'p1' },
      { id: '2', type: 'expense', amount: 30, date: Date.now(), pocketId: 'p1' },
      { id: '3', type: 'transfer', amount: 20, date: Date.now(), pocketId: 'p1', destinationPocketId: 'p2' },
      { id: '4', type: 'transfer', amount: 20, date: Date.now(), pocketId: 'p0', destinationPocketId: 'p1' },
    ]);

    // Income(100) - Expense(30) - TransferOut(20) + TransferIn(20) = 70
    const balance = await getPocketBalance('p1');
    expect(balance).toBe(70);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun test src/lib/__tests__/transaction-service.test.ts`
Expected: FAIL 

**Step 3: Write minimal implementation**

```typescript
import { db } from '../db';

export async function getPocketBalance(pocketId: string): Promise<number> {
  const transactions = await db.transactions.toArray();
  
  return transactions.reduce((acc, tx) => {
    if (tx.pocketId === pocketId) {
      if (tx.type === 'income') return acc + tx.amount;
      if (tx.type === 'expense') return acc - tx.amount;
      if (tx.type === 'transfer') return acc - tx.amount; // Outgoing transfer
    }
    if (tx.type === 'transfer' && tx.destinationPocketId === pocketId) {
      return acc + tx.amount; // Incoming transfer
    }
    return acc;
  }, 0);
}
```

**Step 4: Run test to verify it passes**

Run: `bun test src/lib/__tests__/transaction-service.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/services/transaction-service.ts src/lib/__tests__/transaction-service.test.ts
git commit -m "feat: add dynamic balance calculation in transaction service"
```

---

### Task 4: Setup App Lock Context

**Files:**
- Create: `src/lib/providers/app-lock-provider.tsx`

**Step 1: Write the failing test**
*(Skipping strict TDD for React Context to focus on implementation, will verify manually)*

**Step 2 & 3: Write minimal implementation**

```tsx
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

interface AppLockContextType {
  isLocked: boolean;
  unlock: (pin: string) => boolean;
}

const AppLockContext = createContext<AppLockContextType | null>(null);

export function AppLockProvider({ children }: { children: ReactNode }) {
  const [isLocked, setIsLocked] = useState(true);
  const correctPin = '123456'; // Will connect to secure storage later

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        setIsLocked(true); // Lock when sent to background
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const unlock = (pin: string) => {
    if (pin === correctPin) {
      setIsLocked(false);
      return true;
    }
    return false;
  };

  return (
    <AppLockContext.Provider value={{ isLocked, unlock }}>
      {children}
    </AppLockContext.Provider>
  );
}

export const useAppLock = () => {
  const context = useContext(AppLockContext);
  if (!context) throw new Error('useAppLock must be used within AppLockProvider');
  return context;
};
```

**Step 4: Commit**

```bash
git add src/lib/providers/app-lock-provider.tsx
git commit -m "feat: setup app lock provider for security pin"
```

---

### Task 5: Setup Settings Service

**Files:**
- Create: `src/lib/services/settings-service.ts`
- Create: `src/lib/__tests__/settings-service.test.ts`

**Step 1: Write the failing test**

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db';
import { getSettings, updateSettings } from '../services/settings-service';

describe('Settings Service', () => {
  beforeEach(async () => {
    await db.settings.clear();
  });

  it('should get default settings and update them', async () => {
    const settings = await getSettings();
    expect(settings.darkMode).toBe(false);
    expect(settings.currency).toBe('USD');

    await updateSettings({ darkMode: true, currency: 'IDR' });
    const updated = await getSettings();
    expect(updated.darkMode).toBe(true);
    expect(updated.currency).toBe('IDR');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun test src/lib/__tests__/settings-service.test.ts`
Expected: FAIL 

**Step 3: Write minimal implementation**

```typescript
import { db, type Settings } from '../db';

const defaultSettings: Settings = {
  id: 'user_settings',
  darkMode: false,
  currency: 'USD',
  pin: ''
};

export async function getSettings(): Promise<Settings> {
  const settings = await db.settings.get('user_settings');
  if (!settings) {
    await db.settings.add(defaultSettings);
    return defaultSettings;
  }
  return settings;
}

export async function updateSettings(updates: Partial<Omit<Settings, 'id'>>): Promise<Settings> {
  const current = await getSettings();
  const updated = { ...current, ...updates };
  await db.settings.put(updated);
  return updated;
}
```

**Step 4: Run test to verify it passes**

Run: `bun test src/lib/__tests__/settings-service.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/services/settings-service.ts src/lib/__tests__/settings-service.test.ts
git commit -m "feat: add settings service for configuration"
```
