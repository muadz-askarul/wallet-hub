import { useState } from "react"
import { useTheme } from "@/components/theme-provider"
import { Switch } from "@/components/ui/switch"
import { CategoryManagementSheet } from "@/components/category-management-sheet"
import { ChevronRight, Moon, Tag } from "lucide-react"
import { Button } from "@/components/ui/button"

export function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const [categorySheetOpen, setCategorySheetOpen] = useState(false)

  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches)

  const handleDarkModeToggle = (checked: boolean) => {
    setTheme(checked ? "dark" : "light")
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
