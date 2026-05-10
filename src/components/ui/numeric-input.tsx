import * as React from "react"
import { Input } from "@/components/ui/input"

export interface NumericInputProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "onChange" | "value"
> {
  value?: number | string
  onValueChange?: (value: string) => void
  locale?: string
}

export const NumericInput = React.forwardRef<
  HTMLInputElement,
  NumericInputProps
>(({ value, onValueChange, locale = "id-ID", ...props }, ref) => {
  const formatter = React.useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        maximumFractionDigits: 0,
      }),
    [locale]
  )

  const formatValue = React.useCallback(
    (val: number | string | undefined) => {
      if (val === undefined || val === null || val === "") return ""
      const strVal = val.toString()
      const isNegative = strVal.startsWith("-")
      const num = parseFloat(strVal.replace(/\D/g, ""))
      if (isNaN(num)) return isNegative ? "-" : ""
      return (isNegative ? "-" : "") + formatter.format(num)
    },
    [formatter]
  )

  const [displayValue, setDisplayValue] = React.useState(formatValue(value))

  // Sync external value changes if they differ from what we expect
  React.useEffect(() => {
    setDisplayValue(formatValue(value))
  }, [value, formatValue])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value
    const isNegative = input.startsWith("-")
    const rawValue = input.replace(/\D/g, "")

    if (!rawValue) {
      setDisplayValue(isNegative ? "-" : "")
      onValueChange?.("")
      return
    }

    const numValue = parseInt(rawValue, 10) * (isNegative ? -1 : 1)
    setDisplayValue(
      (isNegative ? "-" : "") + formatter.format(Math.abs(numValue))
    )
    onValueChange?.(numValue.toString())
  }

  return (
    <Input
      {...props}
      ref={ref}
      type="text"
      inputMode="numeric"
      value={displayValue}
      onChange={handleChange}
    />
  )
})

NumericInput.displayName = "NumericInput"
