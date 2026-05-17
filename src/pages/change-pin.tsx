import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useLiveQuery } from "dexie-react-hooks"
import { db } from "@/lib/db"
import { toast } from "sonner"
import { ChevronLeft, Lock } from "lucide-react"
import { PageHeader } from "@/components/ui/page-header"
import { PinInputForm } from "@/components/pin-input-form"
import { PinCreationForm } from "@/components/pin-creation-form"
import { hashPin } from "@/lib/utils/crypto"

export function ChangePinPage() {
  const navigate = useNavigate()
  const [pinStep, setPinStep] = useState<"verify" | "create">("verify")
  const settings = useLiveQuery(() => db.settings.get("user_settings"))

  const handleVerifyOldPin = async (values: { pin: string }) => {
    const hashed = await hashPin(values.pin)
    if (hashed === settings?.pin) {
      setPinStep("create")
      return true
    } else {
      toast.error("Incorrect current PIN")
      return false
    }
  }

  const handleSetNewPin = async (newPin: string) => {
    try {
      const hashed = await hashPin(newPin)
      await db.settings.update("user_settings", { pin: hashed })
      toast.success("PIN changed successfully")
      navigate("/settings")
    } catch (err) {
      console.error(err)
      toast.error("Failed to update PIN")
    }
  }

  return (
    <div className="min-h-dvh bg-background">
      <PageHeader className="justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="mr-1 size-5" />
          Back
        </button>
        <h1 className="text-base font-semibold">Change App PIN</h1>
        <div className="size-8" />
      </PageHeader>

      <div className="p-4 pt-8">
        <div className="mx-auto max-w-sm">
          {pinStep === "verify" ? (
            <PinInputForm
              title="Verify Old PIN"
              description="Please enter your current 4-digit PIN"
              icon={<Lock className="size-6" />}
              onSubmit={handleVerifyOldPin}
            />
          ) : (
            <PinCreationForm onComplete={handleSetNewPin} />
          )}
        </div>
      </div>
    </div>
  )
}
