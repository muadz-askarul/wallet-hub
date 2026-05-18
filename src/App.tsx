import { BrowserRouter, Routes, Route } from "react-router-dom"
import { RootLayout } from "@/components/root-layout"
import { DashboardPage } from "./pages/dashboard"
import { RemindersPage } from "./pages/reminders"
import { WalletPage } from "./pages/wallet"
import { WalletFormPage } from "./pages/wallet-form"
import { TransactionsPage } from "./pages/transactions"
import { TransactionFormPage } from "./pages/transaction-form"
import { SettingsPage } from "./pages/settings"
import { ChangePinPage } from "./pages/change-pin"
import { OnboardingPage } from "./pages/onboarding"
import { LockScreenOverlay } from "@/components/lock-screen-overlay"
import { AppLockProvider, useAppLock } from "@/lib/providers/app-lock-provider"

function AppContent() {
  const { isOnboarded, isLocked, isStorageAvailable, isInitialized } =
    useAppLock()

  // 0. Wait for initial state to avoid flash
  if (!isInitialized) {
    return null
  }

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
        <Route path="reminders" element={<RemindersPage />} />
        <Route path="wallet" element={<WalletPage />} />
        <Route path="wallet/new" element={<WalletFormPage />} />
        <Route path="wallet/edit/:id" element={<WalletFormPage />} />
        <Route path="transactions" element={<TransactionsPage />} />

        <Route path="transactions/new" element={<TransactionFormPage />} />
        <Route path="transactions/edit/:id" element={<TransactionFormPage />} />
        <Route
          path="reminders/new"
          element={<TransactionFormPage isScheduleMode />}
        />
        <Route
          path="reminders/edit/:scheduleId"
          element={<TransactionFormPage isScheduleMode />}
        />
        <Route path="wallet" element={<WalletPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="settings/change-pin" element={<ChangePinPage />} />
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
