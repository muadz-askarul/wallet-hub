import * as React from "react"
import { cn } from "@/lib/utils"
import { cva, type VariantProps } from "class-variance-authority"

const bottomNavigationBarVariants = cva(
  "flex items-center rounded-full border border-border bg-background/80 shadow-lg backdrop-blur-md dark:border-white/10",
  {
    variants: {
      size: {
        default: "h-16 gap-2 p-2",
        sm: "h-12 gap-1.5 p-1",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
)

const bottomNavigationItemVariants = cva(
  "flex items-center justify-center rounded-full text-muted-foreground transition-all duration-200 hover:text-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      size: {
        default: "h-12 w-12 [&_svg]:size-6",
        sm: "h-10 w-10 [&_svg]:size-5",
      },
      active: {
        true: "bg-primary/10 text-primary hover:text-primary",
        false: "",
      },
    },
    defaultVariants: {
      size: "default",
      active: false,
    },
  }
)

type BottomNavigationContextValue = {
  size: "default" | "sm"
}

const BottomNavigationContext =
  React.createContext<BottomNavigationContextValue>({
    size: "default",
  })

export interface BottomNavigationBarProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof bottomNavigationBarVariants> {
  startSlot?: React.ReactNode
  endSlot?: React.ReactNode
  autoShowDelay?: number
}

export const BottomNavigationBar = React.forwardRef<
  HTMLDivElement,
  BottomNavigationBarProps
>(
  (
    {
      className,
      size = "default",
      startSlot,
      endSlot,
      autoShowDelay = 0,
      children,
      ...props
    },
    ref
  ) => {
    const [isVisible, setIsVisible] = React.useState(true)
    const lastScrollY = React.useRef(0)
    const autoShowTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(
      null
    )

    const clearAutoShowTimer = () => {
      if (autoShowTimerRef.current) {
        clearTimeout(autoShowTimerRef.current)
        autoShowTimerRef.current = null
      }
    }

    React.useEffect(() => {
      const handleScroll = () => {
        const currentScrollY = window.scrollY

        clearAutoShowTimer()

        // Hide when scrolling down, show when scrolling up
        if (currentScrollY > lastScrollY.current && currentScrollY > 50) {
          setIsVisible(false)

          // Set timer to auto-show if configured
          if (autoShowDelay > 0) {
            autoShowTimerRef.current = setTimeout(() => {
              setIsVisible(true)
            }, autoShowDelay)
          }
        } else {
          setIsVisible(true)
        }
        lastScrollY.current = currentScrollY
      }

      window.addEventListener("scroll", handleScroll, { passive: true })
      return () => {
        window.removeEventListener("scroll", handleScroll)
        clearAutoShowTimer()
      }
    }, [autoShowDelay])

    return (
      <div
        ref={ref}
        className={cn(
          "fixed bottom-6 left-1/2 z-50 flex w-full max-w-[480px] -translate-x-1/2 items-center gap-4 px-4 transition-transform duration-300 ease-in-out",
          isVisible ? "translate-y-0" : "translate-y-[calc(100%+2rem)]"
        )}
        {...props}
      >
        <BottomNavigationContext.Provider value={{ size: size || "default" }}>
          {startSlot && (
            <div className="flex shrink-0 items-center">{startSlot}</div>
          )}
          <div
            className={cn(
              bottomNavigationBarVariants({ size, className }),
              "flex-1 justify-around"
            )}
          >
            {children}
          </div>
          {endSlot && (
            <div className="flex shrink-0 items-center">{endSlot}</div>
          )}
        </BottomNavigationContext.Provider>
      </div>
    )
  }
)
BottomNavigationBar.displayName = "BottomNavigationBar"

export interface BottomNavigationItemProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof bottomNavigationItemVariants> {
  render?:
    | React.ReactElement
    | ((props: Record<string, unknown>) => React.ReactElement)
}

export const BottomNavigationItem = React.forwardRef<
  HTMLButtonElement,
  BottomNavigationItemProps
>(({ className, active, size: sizeProp, render, ...props }, ref) => {
  const context = React.useContext(BottomNavigationContext)
  const size = sizeProp || context.size

  const defaultProps = {
    ref,
    className: cn(bottomNavigationItemVariants({ size, active, className })),
    ...props,
  }

  if (React.isValidElement(render)) {
    const element = render as React.ReactElement<Record<string, unknown>>
    return React.cloneElement(element, {
      ...defaultProps,
      ...element.props,
      className: cn(defaultProps.className, element.props.className as string),
    })
  }

  if (typeof render === "function") {
    return render(defaultProps as Record<string, unknown>)
  }
  return <button {...defaultProps} />
})
BottomNavigationItem.displayName = "BottomNavigationItem"
