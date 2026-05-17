import { BrowserRouter, Routes, Route } from "react-router-dom"
import { RootLayout } from "@/components/root-layout"
import { DashboardPage } from "./pages/dashboard"
import { BillsPage } from "./pages/bills"
import { WalletPage } from "./pages/wallet"
import { WalletFormPage } from "./pages/wallet-form"
import { TransactionsPage } from "./pages/transactions"
import { TransactionFormPage } from "./pages/transaction-form"
import { GoalsPage } from "./pages/goals"
import { SettingsPage } from "./pages/settings"
import { OnboardingPage } from "./pages/onboarding"
import { LockScreenOverlay } from "@/components/lock-screen-overlay"
import { AppLockProvider, useAppLock } from "@/lib/providers/app-lock-provider"

function AppContent() {
  const { isOnboarded, isLocked, isStorageAvailable } = useAppLock()

  // 1. If not onboarded yet or storage unavailable, show ONLY the welcome/setup space
  if (!isOnboarded || !isStorageAvailable) {
    return <OnboardingPage storageError={!isStorageAvailable} />
  }

  // 2. If app is auto-locked, block with full screen shield lock
  if (isLocked) {
    return <LockScreenOverlay />
  }

  // 3. Normal secure routing
  return (
    <Routes>
      <Route path="/" element={<RootLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="bills" element={<BillsPage />} />
        <Route path="wallet" element={<WalletPage />} />
        <Route path="wallet/new" element={<WalletFormPage />} />
        <Route path="wallet/edit/:id" element={<WalletFormPage />} />
        <Route path="transactions" element={<TransactionsPage />} />

        <Route path="transactions/new" element={<TransactionFormPage />} />
        <Route path="transactions/edit/:id" element={<TransactionFormPage />} />
        <Route
          path="bills/new"
          element={<TransactionFormPage isScheduleMode />}
        />
        <Route
          path="bills/edit/:scheduleId"
          element={<TransactionFormPage isScheduleMode />}
        />
        <Route path="wallet" element={<WalletPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  )
}

export function App() {
  return (
    <AppLockProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </AppLockProvider>
  )
}

export default App
