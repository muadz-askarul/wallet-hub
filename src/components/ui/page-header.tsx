import * as React from "react"
import { cn } from "@/lib/utils"

interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export function PageHeader({ children, className, ...props }: PageHeaderProps) {
  return (
    <div
      className={cn(
        "sticky top-0 z-20 flex h-16 items-center border-b bg-background/95 px-4 backdrop-blur supports-backdrop-filter:bg-background/60",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
