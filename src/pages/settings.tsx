import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useTheme } from "@/components/theme-provider"
import { useLiveQuery } from "dexie-react-hooks"
import { db } from "@/lib/db"
import { Switch } from "@/components/ui/switch"
import { CategoryManagementSheet } from "@/components/category-management-sheet"
import {
  ChevronRight,
  Moon,
  Tag,
  Repeat,
  Clock,
  Trash,
  Fingerprint,
  Lock,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { PageHeader } from "@/components/ui/page-header"
import { PinInputForm } from "@/components/pin-input-form"
import { registerBiometrics } from "@/lib/services/biometric-service"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Dialog, DialogContent } from "@/components/ui/dialog"

export function SettingsPage() {
  const navigate = useNavigate()
  const { theme, setTheme } = useTheme()
  const [categorySheetOpen, setCategorySheetOpen] = useState(false)
  const [resetDialogOpen, setResetDialogOpen] = useState(false)
  const [bioGateOpen, setBioGateOpen] = useState(false)
  const [pendingBioValue, setPendingBioValue] = useState(false)

  const settings = useLiveQuery(() => db.settings.get("user_settings"))
  const lockDelay = settings?.lockDelayMinutes ?? 5
  const isBiometricEnabled = !!settings?.isBiometricEnabled

  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches)

  const handleDarkModeToggle = (checked: boolean) => {
    setTheme(checked ? "dark" : "light")
  }

  const handleLockDelayChange = async (minutes: number) => {
    try {
      await db.settings.update("user_settings", { lockDelayMinutes: minutes })
      toast.success(
        `Auto-lock delay set to ${minutes === 99999 ? "Never" : `${minutes} min`}`
      )
    } catch (err) {
      console.error(err)
      toast.error("Failed to update auto-lock settings")
    }
  }

  const handleBiometricToggle = (checked: boolean) => {
    setPendingBioValue(checked)
    setBioGateOpen(true)
  }

  const handleBioGateSubmit = async (values: { pin: string }) => {
    const { hashPin } = await import("@/lib/utils/crypto")
    const hashedPin = await hashPin(values.pin)

    if (hashedPin !== settings?.pin) {
      toast.error("Incorrect PIN")
      return false
    }

    try {
      if (pendingBioValue) {
        const success = await registerBiometrics()
        if (!success) {
          toast.error("Failed to register biometrics")
          setBioGateOpen(false)
          return false
        }
      }

      await db.settings.update("user_settings", {
        isBiometricEnabled: pendingBioValue,
      })
      toast.success(
        `Biometric unlock ${pendingBioValue ? "enabled" : "disabled"}`
      )
      setBioGateOpen(false)
      return true
    } catch (err) {
      console.error(err)
      toast.error("Failed to update biometric settings")
      return false
    }
  }

  const handleResetApp = () => {
    setResetDialogOpen(true)
  }

  const confirmReset = async () => {
    try {
      await db.transaction(
        "rw",
        [db.settings, db.wallets, db.pockets, db.transactions, db.schedules],
        async () => {
          await db.settings.clear()
          await db.wallets.clear()
          await db.pockets.clear()
          await db.transactions.clear()
          await db.schedules.clear()
        }
      )
      toast.success("App reset successfully!")
      window.location.reload()
    } catch (err) {
      console.error(err)
      toast.error("Failed to reset app")
    }
  }

  return (
    <>
      <div>
        {/* Sticky Header */}
        <PageHeader>
          <h1 className="text-lg font-semibold">Settings</h1>
        </PageHeader>

        <div className="p-4">
          {/* Preferences */}
          <div className="mb-3 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            Preferences
          </div>
          <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
            {/* Dark Mode Toggle */}
            <div className="flex items-center justify-between border-b px-4 py-4">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-full bg-muted">
                  <Moon className="size-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">Dark Mode</p>
                  <p className="text-xs text-muted-foreground">
                    {isDark ? "Enabled" : "Disabled"}
                  </p>
                </div>
              </div>
              <Switch
                id="dark-mode-toggle"
                checked={isDark}
                onCheckedChange={handleDarkModeToggle}
              />
            </div>

            {/* Biometric Toggle (Disabled)
            <div className="flex items-center justify-between border-b px-4 py-4">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-full bg-muted">
                  <Fingerprint className="size-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">Biometric Unlock</p>
                  <p className="text-xs text-muted-foreground">
                    Use fingerprint or FaceID to unlock
                  </p>
                </div>
              </div>
              <Switch
                id="biometric-toggle"
                checked={isBiometricEnabled}
                onCheckedChange={handleBiometricToggle}
              />
            </div>
            */}

            {/* Auto-Lock Delay */}
            <div className="flex items-center justify-between border-t px-4 py-4">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-full bg-muted">
                  <Clock className="size-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">Auto-Lock Delay</p>
                  <p className="text-xs text-muted-foreground">
                    Lock delay when app is out of focus
                  </p>
                </div>
              </div>
              <select
                value={lockDelay}
                onChange={(e) => handleLockDelayChange(Number(e.target.value))}
                className="cursor-pointer rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs font-semibold focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <option value={1}>1 Minute</option>
                <option value={5}>5 Minutes</option>
                <option value={10}>10 Minutes</option>
                <option value={30}>30 Minutes</option>
                <option value={99999}>Never</option>
              </select>
            </div>
          </div>

          {/* Data Management */}
          <div className="mt-6 mb-3 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            Data
          </div>
          <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
            {/* Category Management */}
            <Button
              variant="ghost"
              className="flex h-auto w-full items-center justify-between rounded-none px-4 py-4 text-left"
              onClick={() => setCategorySheetOpen(true)}
            >
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-full bg-muted">
                  <Tag className="size-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">Categories</p>
                  <p className="text-xs text-muted-foreground">
                    Manage income and expense categories
                  </p>
                </div>
              </div>
              <ChevronRight className="size-4 text-muted-foreground" />
            </Button>

            {/* Recurring Schedules */}
            <Button
              variant="ghost"
              className="flex h-auto w-full cursor-pointer items-center justify-between rounded-none border-t px-4 py-4 text-left"
              onClick={() => navigate("/bills")}
            >
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-full bg-muted">
                  <Repeat className="size-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">Recurring & Schedules</p>
                  <p className="text-xs text-muted-foreground">
                    Manage repeating transactions and bills
                  </p>
                </div>
              </div>
              <ChevronRight className="size-4 text-muted-foreground" />
            </Button>

            {/* Reset App & Onboarding */}
            <Button
              variant="ghost"
              className="group flex h-auto w-full cursor-pointer items-center justify-between rounded-none border-t px-4 py-4 text-left hover:bg-destructive/10 hover:text-destructive"
              onClick={handleResetApp}
            >
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-full bg-muted group-hover:bg-destructive/20">
                  <Trash className="size-4 text-muted-foreground group-hover:text-destructive" />
                </div>
                <div>
                  <p className="font-medium">Reset System</p>
                  <p className="text-xs text-muted-foreground group-hover:text-destructive/80">
                    Delete all data and start the onboarding wizard again
                  </p>
                </div>
              </div>
              <ChevronRight className="size-4 text-muted-foreground group-hover:text-destructive" />
            </Button>
          </div>

          {/* App Info */}
          <div className="mt-8 text-center text-xs text-muted-foreground">
            Wallet Hub v0.0.1
          </div>
        </div>
      </div>

      <CategoryManagementSheet
        open={categorySheetOpen}
        onOpenChange={setCategorySheetOpen}
      />

      <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset App?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reset the app? This will delete all
              wallets, pockets, transactions, bills, and lock settings. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="text-destructive-foreground bg-destructive hover:bg-destructive/90"
              onClick={confirmReset}
            >
              Reset Everything
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={bioGateOpen} onOpenChange={setBioGateOpen}>
        <DialogContent className="max-w-[280px] border-none bg-transparent p-0 shadow-none">
          <div className="rounded-3xl border bg-card p-8 shadow-xl">
            <PinInputForm
              title="Verify PIN"
              description={`Enter your PIN to ${pendingBioValue ? "enable" : "disable"} biometrics`}
              icon={<Lock className="size-6" />}
              onSubmit={handleBioGateSubmit}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
