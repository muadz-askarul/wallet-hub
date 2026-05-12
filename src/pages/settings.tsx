import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useTheme } from "@/components/theme-provider"
import { useLiveQuery } from "dexie-react-hooks"
import { db } from "@/lib/db"
import { Switch } from "@/components/ui/switch"
import { CategoryManagementSheet } from "@/components/category-management-sheet"
import { ChevronRight, Moon, Tag, Repeat, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

export function SettingsPage() {
  const navigate = useNavigate()
  const { theme, setTheme } = useTheme()
  const [categorySheetOpen, setCategorySheetOpen] = useState(false)

  const settings = useLiveQuery(() => db.settings.get("user_settings"))
  const lockDelay = settings?.lockDelayMinutes ?? 5

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
      toast.success(`Auto-lock delay set to ${minutes === 99999 ? "Never" : `${minutes} min`}`)
    } catch (err) {
      console.error(err)
      toast.error("Failed to update auto-lock settings")
    }
  }

  return (
    <>
      {/* Sticky Header — same style as transactions page */}
      <div className="sticky top-0 z-20 flex h-16 items-center border-b bg-background/95 px-4 backdrop-blur supports-backdrop-filter:bg-background/60">
        <h1 className="text-lg font-semibold">Settings</h1>
      </div>

      <div className="p-4 pb-24">
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

          {/* Auto-Lock Delay */}
          <div className="flex items-center justify-between px-4 py-4 border-t">
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
              className="rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
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
            className="flex h-auto w-full items-center justify-between rounded-none border-t px-4 py-4 text-left cursor-pointer"
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
        </div>

        {/* App Info */}
        <div className="mt-8 text-center text-xs text-muted-foreground">
          Wallet Hub v0.0.1
        </div>
      </div>

      <CategoryManagementSheet
        open={categorySheetOpen}
        onOpenChange={setCategorySheetOpen}
      />
    </>
  )
}
