import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { cn } from "@/lib/utils"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp"
import { Delete, Shield, Check } from "lucide-react"
import { toast } from "sonner"

export interface PinCreationFormProps {
  length?: number
  onComplete: (pin: string) => void
  className?: string
}

export function PinCreationForm({
  length = 4,
  onComplete,
  className,
}: PinCreationFormProps) {
  const [setupStep, setSetupStep] = React.useState<1 | 2>(1)
  const [createdPin, setCreatedPin] = React.useState("")

  const formSchema = z.object({
    pin: z.string().length(length, {
      message: `Your PIN must be ${length} characters.`,
    }),
  })

  const {
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      pin: "",
    },
  })

  const pinValue = watch("pin")

  // Auto-advance / Submit when length is reached
  React.useEffect(() => {
    if (pinValue.length === length) {
      const timer = setTimeout(() => {
        handleSubmit((values) => {
          if (setupStep === 1) {
            setCreatedPin(values.pin)
            setSetupStep(2)
            setValue("pin", "")
          } else {
            if (values.pin === createdPin) {
              toast.success("PIN configured successfully!")
              onComplete(values.pin)
            } else {
              toast.error("PINs do not match. Please try again.")
              setCreatedPin("")
              setSetupStep(1)
              setValue("pin", "")
            }
          }
        })()
      }, 150)
      return () => clearTimeout(timer)
    }
  }, [
    pinValue,
    length,
    handleSubmit,
    setupStep,
    createdPin,
    onComplete,
    setValue,
  ])

  const handleNumberPress = (num: string) => {
    if (pinValue.length < length) {
      setValue("pin", pinValue + num)
    }
  }

  const handleBackspace = () => {
    if (pinValue.length > 0) {
      setValue("pin", pinValue.slice(0, -1))
    }
  }

  return (
    <div
      className={cn(
        "flex w-full flex-col items-center gap-8 text-center",
        className
      )}
    >
      <div className="flex flex-col items-center gap-6">
        <div className="flex h-16 w-16 animate-pulse items-center justify-center rounded-full bg-primary/10 text-primary">
          {setupStep === 1 ? (
            <Shield className="size-6" />
          ) : (
            <Check className="size-6" />
          )}
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            {setupStep === 1 ? "Set App PIN" : "Confirm PIN"}
          </h1>
          <p className="max-w-[280px] text-sm text-muted-foreground">
            {setupStep === 1
              ? "Protect your ledger behind a secure lock"
              : "Re-enter your 4-digit PIN to confirm"}
          </p>
        </div>

        <div className="space-y-2">
          <InputOTP
            maxLength={length}
            value={pinValue}
            onChange={(value) => setValue("pin", value)}
            inputMode="none" // Prevent system keyboard on mobile
          >
            <InputOTPGroup>
              {Array.from({ length }).map((_, index) => (
                <InputOTPSlot key={index} index={index} />
              ))}
            </InputOTPGroup>
          </InputOTP>

          {errors.pin && (
            <p className="text-sm font-medium text-destructive">
              {errors.pin.message}
            </p>
          )}
        </div>
      </div>

      {/* Number Grid */}
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
          <button
            key={num}
            type="button"
            onClick={() => handleNumberPress(num.toString())}
            className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-full border border-border text-2xl font-medium transition-colors hover:bg-muted active:scale-95"
          >
            {num}
          </button>
        ))}
        <div className="h-16 w-16" /> {/* Empty slot */}
        <button
          type="button"
          onClick={() => handleNumberPress("0")}
          className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-full border border-border text-2xl font-medium transition-colors hover:bg-muted active:scale-95"
        >
          0
        </button>
        <button
          type="button"
          onClick={handleBackspace}
          className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted active:scale-95"
        >
          <Delete className="h-8 w-8" />
        </button>
      </div>
    </div>
  )
}
