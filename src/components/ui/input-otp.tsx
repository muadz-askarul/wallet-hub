import * as React from "react"
import { OTPInput, OTPInputContext } from "input-otp"
import { Minus } from "lucide-react"

import { cn } from "@/lib/utils"

const InputOTP = React.forwardRef<
  React.ElementRef<typeof OTPInput>,
  React.ComponentPropsWithoutRef<typeof OTPInput>
>(({ className, containerClassName, ...props }, ref) => (
  <OTPInput
    ref={ref}
    containerClassName={cn(
      "flex items-center gap-2 has-disabled:opacity-50",
      containerClassName
    )}
    className={cn("disabled:cursor-not-allowed", className)}
    {...props}
  />
))
InputOTP.displayName = "InputOTP"

const InputOTPGroup = React.forwardRef<
  React.ElementRef<"div">,
  React.ComponentPropsWithoutRef<"div">
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center gap-3", className)}
    {...props}
  />
))
InputOTPGroup.displayName = "InputOTPGroup"

const InputOTPSlot = React.forwardRef<
  React.ElementRef<"div">,
  React.ComponentPropsWithoutRef<"div"> & { index: number }
>(({ index, className, ...props }, ref) => {
  const inputOTPContext = React.useContext(OTPInputContext)
  const { char, hasFakeCaret, isActive } = inputOTPContext.slots[index]
  const [isMasked, setIsMasked] = React.useState(true)

  React.useEffect(() => {
    if (char) {
      setIsMasked(false)
      const timer = setTimeout(() => setIsMasked(true), 200)
      return () => clearTimeout(timer)
    } else {
      setIsMasked(true)
    }
  }, [char])

  return (
    <div
      ref={ref}
      className={cn(
        "relative flex h-12 w-12 items-center justify-center rounded-full bg-transparent transition-all duration-200",
        isActive && "ring-2 ring-ring ring-offset-4 ring-offset-background",
        className
      )}
      {...props}
    >
      {/* Empty State: Small white ring */}
      {!char && (
        <div className="h-4 w-4 animate-in rounded-full border-2 border-white duration-200 fade-in" />
      )}

      {/* Entry State: Show number */}
      {char && !isMasked && (
        <span className="animate-in text-xl font-bold text-white duration-100 zoom-in-75 fade-in">
          {char}
        </span>
      )}

      {/* Masked State: Solid primary dot (replaces ring) */}
      {char && isMasked && (
        <div className="h-4 w-4 animate-in rounded-full bg-primary duration-200 zoom-in-50 fade-in" />
      )}

      {hasFakeCaret && !char && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-4 w-px animate-caret-blink bg-white duration-1000" />
        </div>
      )}
    </div>
  )
})
InputOTPSlot.displayName = "InputOTPSlot"

const InputOTPSeparator = React.forwardRef<
  React.ElementRef<"div">,
  React.ComponentPropsWithoutRef<"div">
>(({ ...props }, ref) => (
  <div ref={ref} role="separator" {...props}>
    <Minus />
  </div>
))
InputOTPSeparator.displayName = "InputOTPSeparator"

export { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator }
