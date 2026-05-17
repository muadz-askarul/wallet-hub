import React, { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

interface AutoTextSizeProps {
  children: React.ReactNode
  className?: string
  maxSizeRem?: number
  minSizeRem?: number
  maxParentWidthPercent?: number
}

export function AutoTextSize({
  children,
  className,
  maxSizeRem = 1,
  minSizeRem = 0.5,
  maxParentWidthPercent = 30,
}: AutoTextSizeProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [fontSize, setFontSize] = useState(maxSizeRem)

  useEffect(() => {
    const el = containerRef.current
    if (!el || !el.parentElement) return

    const observer = new ResizeObserver(() => {
      const parentWidth = el.parentElement!.clientWidth
      const maxWidth = (parentWidth * maxParentWidthPercent) / 100
      
      // Temporary reset to measure natural width
      el.style.fontSize = `${maxSizeRem}rem`
      let currentWidth = el.scrollWidth

      if (currentWidth > maxWidth) {
        const ratio = maxWidth / currentWidth
        const newSize = Math.max(minSizeRem, maxSizeRem * ratio)
        setFontSize(newSize)
      } else {
        setFontSize(maxSizeRem)
      }
    })

    observer.observe(el.parentElement)
    return () => observer.disconnect()
  }, [maxSizeRem, minSizeRem, maxParentWidthPercent])

  return (
    <div
      ref={containerRef}
      className={cn("inline-block whitespace-nowrap transition-all", className)}
      style={{ fontSize: `${fontSize}rem` }}
    >
      {children}
    </div>
  )
}
