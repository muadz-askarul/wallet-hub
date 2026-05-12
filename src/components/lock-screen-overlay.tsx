import { useState } from "react"
import { useAppLock } from "@/lib/providers/app-lock-provider"
import { PinInputForm } from "./pin-input-form"
import { Lock } from "lucide-react"
import { toast } from "sonner"

export function LockScreenOverlay() {
  const { unlock } = useAppLock()
  const [errorCount, setErrorCount] = useState(0)

  const handleSubmit = async (values: { pin: string }) => {
    const success = await unlock(values.pin)
    if (success) {
      toast.success("Welcome back!")
      return true
    } else {
      setErrorCount((prev) => prev + 1)
      toast.error("Incorrect PIN. Please try again.")
      return false
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm">
        <PinInputForm
          length={4}
          icon={<Lock className="size-6" />}
          title="App Locked"
          description="Enter your 4-digit PIN to unlock Wallet Hub"
          onSubmit={handleSubmit}
        />
        {errorCount > 0 && (
          <p className="mt-4 text-center text-xs text-muted-foreground animate-pulse">
            Attempts: {errorCount}
          </p>
        )}
      </div>
    </div>
  )
}
