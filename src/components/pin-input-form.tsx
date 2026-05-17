import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Delete } from "lucide-react"

import { cn } from "@/lib/utils"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp"

export interface PinInputFormProps {
  length?: number
  icon?: React.ReactNode
  title?: string
  description?: string
  onSubmit: (values: {
    pin: string
  }) => void | boolean | Promise<void | boolean>
  className?: string
}

export function PinInputForm({
  length = 4,
  icon,
  title,
  description,
  onSubmit,
  className,
}: PinInputFormProps) {
  const formSchema = z.object({
    pin: z.string().length(length, {
      message: `Your PIN must be ${length} characters.`,
    }),
  })

  const {
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      pin: "",
    },
  })

  const pinValue = watch("pin")

  // Auto-submit when length is reached
  React.useEffect(() => {
    if (pinValue.length === length && !isSubmitting) {
      // Small delay to let the UI update (showing the last digit) before submitting
      const timer = setTimeout(() => {
        handleSubmit(async (values) => {
          try {
            const res = await onSubmit(values)
            if (res === false) {
              setValue("pin", "")
            }
          } catch {
            setValue("pin", "")
          }
        })()
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [pinValue, length, handleSubmit, onSubmit, isSubmitting, setValue])

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
      className={cn("flex flex-col items-center gap-8 text-center", className)}
    >
      <div className="flex flex-col items-center gap-6">
        {icon && (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            {icon}
          </div>
        )}

        {(title || description) && (
          <div className="space-y-2">
            {title && (
              <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            )}
            {description && (
              <p className="max-w-[280px] text-sm text-muted-foreground">
                {description}
              </p>
            )}
          </div>
        )}

        <div className="space-y-2">
          <InputOTP
            maxLength={length}
            value={pinValue}
            onChange={(value) => setValue("pin", value)}
            inputMode="none" // Prevent system keyboard on mobile
            disabled={isSubmitting}
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
      <div
        className={cn(
          "grid grid-cols-3 gap-4",
          isSubmitting && "pointer-events-none opacity-50"
        )}
      >
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
          <button
            key={num}
            type="button"
            disabled={isSubmitting}
            onClick={() => handleNumberPress(num.toString())}
            className="flex h-20 w-20 items-center justify-center rounded-full border border-border text-2xl font-medium transition-colors hover:bg-muted active:scale-95 disabled:cursor-not-allowed"
          >
            {num}
          </button>
        ))}
        <div className="h-20 w-20" />
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => handleNumberPress("0")}
          className="flex h-20 w-20 items-center justify-center rounded-full border border-border text-2xl font-medium transition-colors hover:bg-muted active:scale-95 disabled:cursor-not-allowed"
        >
          0
        </button>
        <button
          type="button"
          disabled={isSubmitting}
          onClick={handleBackspace}
          className="flex h-20 w-20 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted active:scale-95 disabled:cursor-not-allowed"
        >
          <Delete className="h-8 w-8" />
        </button>
      </div>

      {isSubmitting && (
        <div className="animate-pulse text-sm font-medium text-muted-foreground">
          Verifying PIN...
        </div>
      )}
    </div>
  )
}
