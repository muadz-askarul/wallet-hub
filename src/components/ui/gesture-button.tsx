import * as React from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react"

export type SwipeDirection = "up" | "down" | "left" | "right"

export interface SwipeAction {
  direction: SwipeDirection
  title: string
  icon?: React.ReactNode
  onSwipe: () => void
}

export interface GestureButtonProps extends React.ComponentPropsWithoutRef<
  typeof Button
> {
  onTap?: () => void
  onHold?: () => void
  holdDuration?: number
  holdTitle?: string
  holdTitlePosition?: "top" | "bottom" | "left" | "right"
  swipeActions?: SwipeAction[]
  swipeThreshold?: number
  icon?: React.ReactNode
}

export const GestureButton = React.forwardRef<
  HTMLButtonElement,
  GestureButtonProps
>(
  (
    {
      className,
      onTap,
      onHold,
      holdDuration = 200,
      holdTitle,
      holdTitlePosition = "top",
      swipeActions = [],
      swipeThreshold = 70,
      icon,
      ...props
    },
    ref
  ) => {
    const [interactionState, setInteractionState] = React.useState<
      "idle" | "pressing" | "holding" | "swiping"
    >("idle")
    const [activeSwipe, setActiveSwipe] = React.useState<SwipeAction | null>(
      null
    )
    const [offset, setOffset] = React.useState({ x: 0, y: 0 })

    const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
    const startPosRef = React.useRef({ x: 0, y: 0 })
    const isPointerDownRef = React.useRef(false)

    const clearTimer = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }

    const resetState = () => {
      clearTimer()
      isPointerDownRef.current = false
      setInteractionState("idle")
      setActiveSwipe(null)
      setOffset({ x: 0, y: 0 })
    }

    const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId)
      isPointerDownRef.current = true
      startPosRef.current = { x: e.clientX, y: e.clientY }
      setInteractionState("pressing")

      clearTimer()
      timerRef.current = setTimeout(() => {
        if (isPointerDownRef.current) {
          setInteractionState("holding")
          if (navigator.vibrate) {
            navigator.vibrate(50) // haptic feedback for hold
          }
        }
      }, holdDuration)
    }

    const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
      if (!isPointerDownRef.current) return

      const deltaX = e.clientX - startPosRef.current.x
      const deltaY = e.clientY - startPosRef.current.y

      // Calculate total movement distance
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)

      // If we move too far, cancel the hold timer and transition to swiping
      if (distance > 10) {
        clearTimer()

        if (interactionState !== "swiping") {
          setInteractionState("swiping")
        }

        // Determine dominant direction
        const absX = Math.abs(deltaX)
        const absY = Math.abs(deltaY)
        let direction: SwipeDirection | null = null

        if (absX > absY) {
          direction = deltaX > 0 ? "right" : "left"
        } else {
          direction = deltaY > 0 ? "down" : "up"
        }

        const matchedAction = swipeActions.find(
          (a) => a.direction === direction
        )

        if (matchedAction) {
          setActiveSwipe(matchedAction)
          // Add resistance if pulling past threshold
          const resistance = 0.3
          const activeDistance =
            direction === "left" || direction === "right" ? absX : absY

          // Clamp the movement to avoid going "out of bounds"
          const maxPull = swipeThreshold * 1.5
          let pull =
            activeDistance > swipeThreshold
              ? swipeThreshold + (activeDistance - swipeThreshold) * resistance
              : activeDistance

          pull = Math.min(pull, maxPull)

          if (direction === "up") setOffset({ x: 0, y: -pull })
          else if (direction === "down") setOffset({ x: 0, y: pull })
          else if (direction === "left") setOffset({ x: -pull, y: 0 })
          else if (direction === "right") setOffset({ x: pull, y: 0 })
        } else {
          setActiveSwipe(null)
          // Lock movement: do not move if the direction isn't supported by an action
          setOffset({ x: 0, y: 0 })
        }
      }
    }

    const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
      e.currentTarget.releasePointerCapture(e.pointerId)

      if (!isPointerDownRef.current) return

      if (interactionState === "holding" && onHold) {
        onHold()
      } else if (interactionState === "swiping" && activeSwipe) {
        // Check if distance passed threshold
        const distance =
          activeSwipe.direction === "left" || activeSwipe.direction === "right"
            ? Math.abs(e.clientX - startPosRef.current.x)
            : Math.abs(e.clientY - startPosRef.current.y)

        if (distance >= swipeThreshold) {
          activeSwipe.onSwipe()
        }
      } else if (
        (interactionState === "pressing" || interactionState === "idle") &&
        onTap
      ) {
        onTap()
      }

      resetState()
    }

    const isInteracting =
      interactionState === "holding" || interactionState === "swiping"

    return (
      <div className="relative inline-flex touch-none items-center justify-center">
        {/* Render Directional Tracks when interacting */}
        {isInteracting && (
          <div className="pointer-events-none absolute inset-0">
            {swipeActions.map((action) => {
              const isActive = activeSwipe?.direction === action.direction

              if (action.direction === "up") {
                return (
                  <div
                    key="up"
                    className="absolute right-0 bottom-0 left-0 z-0 flex h-36 animate-in flex-col items-center rounded-full bg-secondary/80 pt-4 backdrop-blur-md duration-200 fade-in slide-in-from-bottom-4"
                  >
                    <div
                      className={cn(
                        "transition-transform duration-200",
                        isActive && "scale-125 text-primary"
                      )}
                    >
                      {action.icon}
                    </div>
                    <ChevronUp
                      className={cn(
                        "mt-2 h-4 w-4 animate-bounce text-muted-foreground",
                        isActive && "opacity-0"
                      )}
                    />

                    {/* Tooltip */}
                    <div className="absolute top-4 right-full mr-4 rounded-lg bg-foreground/90 px-3 py-2 text-sm font-medium whitespace-nowrap text-background shadow-xl">
                      {action.title}
                    </div>
                  </div>
                )
              }

              if (action.direction === "down") {
                return (
                  <div
                    key="down"
                    className="absolute top-0 right-0 left-0 z-0 flex h-36 animate-in flex-col items-center justify-end rounded-full bg-secondary/80 pb-4 backdrop-blur-md duration-200 fade-in slide-in-from-top-4"
                  >
                    <ChevronDown
                      className={cn(
                        "mb-2 h-4 w-4 animate-bounce text-muted-foreground",
                        isActive && "opacity-0"
                      )}
                    />
                    <div
                      className={cn(
                        "transition-transform duration-200",
                        isActive && "scale-125 text-primary"
                      )}
                    >
                      {action.icon}
                    </div>

                    {/* Tooltip */}
                    <div className="absolute right-full bottom-4 mr-4 rounded-lg bg-foreground/90 px-3 py-2 text-sm font-medium whitespace-nowrap text-background shadow-xl">
                      {action.title}
                    </div>
                  </div>
                )
              }

              if (action.direction === "left") {
                return (
                  <div
                    key="left"
                    className="absolute top-1/2 right-full z-0 mr-6 flex -translate-y-1/2 animate-in items-center gap-2 font-medium text-muted-foreground duration-200 fade-in slide-in-from-right-4"
                  >
                    <ChevronLeft
                      className={cn(
                        "h-4 w-4 animate-pulse",
                        isActive && "text-primary"
                      )}
                    />
                    <span
                      className={cn(
                        "whitespace-nowrap transition-colors",
                        isActive && "text-primary"
                      )}
                    >
                      {action.title}
                    </span>
                    <div
                      className={cn(
                        "transition-transform",
                        isActive && "scale-125 text-primary"
                      )}
                    >
                      {action.icon}
                    </div>
                  </div>
                )
              }

              if (action.direction === "right") {
                return (
                  <div
                    key="right"
                    className="absolute top-1/2 left-full z-0 ml-6 flex -translate-y-1/2 animate-in items-center gap-2 font-medium text-muted-foreground duration-200 fade-in slide-in-from-left-4"
                  >
                    <div
                      className={cn(
                        "transition-transform",
                        isActive && "scale-125 text-primary"
                      )}
                    >
                      {action.icon}
                    </div>
                    <span
                      className={cn(
                        "whitespace-nowrap transition-colors",
                        isActive && "text-primary"
                      )}
                    >
                      {action.title}
                    </span>
                    <ChevronRight
                      className={cn(
                        "h-4 w-4 animate-pulse",
                        isActive && "text-primary"
                      )}
                    />
                  </div>
                )
              }

              return null
            })}
          </div>
        )}

        {/* Hold Title (Release hint) */}
        {interactionState === "holding" && holdTitle && (
          <div
            className={cn(
              "pointer-events-none absolute z-50 animate-in rounded-md bg-foreground px-3 py-1.5 text-xs whitespace-nowrap text-background shadow-md duration-200 fade-in",
              holdTitlePosition === "top" &&
                "bottom-[calc(100%+12px)] left-1/2 -translate-x-1/2",
              holdTitlePosition === "bottom" &&
                "top-[calc(100%+12px)] left-1/2 -translate-x-1/2",
              holdTitlePosition === "left" &&
                "top-1/2 right-[calc(100%+12px)] -translate-y-1/2",
              holdTitlePosition === "right" &&
                "top-1/2 left-[calc(100%+12px)] -translate-y-1/2"
            )}
          >
            {holdTitle}
            {holdTitlePosition === "top" && (
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 border-4 border-transparent border-t-foreground" />
            )}
            {holdTitlePosition === "bottom" && (
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 border-4 border-transparent border-b-foreground" />
            )}
            {holdTitlePosition === "left" && (
              <div className="absolute top-1/2 -right-1 -translate-y-1/2 border-4 border-transparent border-l-foreground" />
            )}
            {holdTitlePosition === "right" && (
              <div className="absolute top-1/2 -left-1 -translate-y-1/2 border-4 border-transparent border-r-foreground" />
            )}
          </div>
        )}

        {/* The Button */}
        <Button
          ref={ref}
          size="icon-lg"
          variant="default"
          className={cn(
            "relative z-10 touch-none rounded-full transition-transform",
            className
          )}
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${
              interactionState === "holding"
                ? 1.15
                : interactionState === "pressing"
                  ? 0.95
                  : 1
            })`,
            transitionDuration:
              interactionState === "swiping" ? "0ms" : "200ms",
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={resetState}
          onContextMenu={(e) => e.preventDefault()} // Prevent context menu on long press
          {...props}
        >
          {icon}
        </Button>
      </div>
    )
  }
)
GestureButton.displayName = "GestureButton"
