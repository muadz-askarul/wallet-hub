import { useLiveQuery } from "dexie-react-hooks"
import { db } from "@/lib/db"

export function SettingsPage() {
  const settings = useLiveQuery(() => db.settings.get("user_settings"))

  return (
    <div className="p-6 pb-24">
      <h1 className="mb-6 text-2xl font-semibold">Settings</h1>

      <div className="space-y-6">
        <div className="rounded-xl border p-4 shadow-sm">
          <h3 className="mb-4 font-medium">Preferences</h3>
          <div className="flex justify-between border-b py-2">
            <span>Currency</span>
            <span className="text-muted-foreground">
              {settings?.currency || "IDR"}
            </span>
          </div>
          <div className="flex justify-between py-2">
            <span>Dark Mode</span>
            <span className="text-muted-foreground">
              {settings?.darkMode ? "On" : "Off"}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
