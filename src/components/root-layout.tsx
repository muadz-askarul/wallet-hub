import { useEffect, useState } from "react"
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom"
import {
  BottomNavigationBar,
  BottomNavigationItem,
} from "@/components/ui/bottom-navigation-bar"
import {
  LayoutDashboard,
  Wallet,
  Settings,
  Plus,
  ArrowUpDown,
  MessageSquareText,
  Download,
  Calendar,
  X,
} from "lucide-react"
import { GestureButton } from "@/components/ui/gesture-button"
import { processAutoRepeatTransactions } from "@/lib/services/recurring-service"
import { Button } from "@/components/ui/button"

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

export function RootLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null)
  const [showPwaSuggestion, setShowPwaSuggestion] = useState(false)

  useEffect(() => {
    // Basic platform detection
    const ua = navigator.userAgent.toLowerCase()
    const isAndroid = /android/i.test(ua)
    const isIOS = /iphone|ipad|ipod/i.test(ua)
    const isMobile = isAndroid || isIOS
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in navigator &&
        (navigator as { standalone?: boolean }).standalone) ||
      document.referrer.includes("android-app://")

    const isDismissed = localStorage.getItem("pwa-suggestion-dismissed")

    // If it's mobile and not already installed and not dismissed, show suggestion
    if (isMobile && !isStandalone && !isDismissed) {
      setTimeout(() => {
        setShowPwaSuggestion(true)
      }, 0)
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault()
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      )
    }
  }, [])

  useEffect(() => {
    const runSchedule = () => {
      processAutoRepeatTransactions().catch((err) => {
        console.error("Failed to process auto-repeat schedules:", err)
      })
    }

    runSchedule()

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        runSchedule()
      }
    }
    const handleFocus = () => {
      runSchedule()
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    window.addEventListener("focus", handleFocus)

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      window.removeEventListener("focus", handleFocus)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return

    // Show the install prompt
    await deferredPrompt.prompt()

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === "accepted") {
      console.log("User accepted the PWA install prompt")
    } else {
      console.log("User dismissed the PWA install prompt")
    }

    // Clear the deferred prompt
    setDeferredPrompt(null)
    setShowPwaSuggestion(false)
  }

  const handleDismissSuggestion = () => {
    setShowPwaSuggestion(false)
    localStorage.setItem("pwa-suggestion-dismissed", "true")
  }

  const showNavBar = [
    "/",
    "/transactions",
    "/wallet",
    "/settings",
    "/reminders",
  ].includes(location.pathname)

  const ua = navigator.userAgent.toLowerCase()
  const isIOS = /iphone|ipad|ipod/i.test(ua)

  return (
    <div className={`flex min-h-svh flex-col ${showNavBar ? "pb-20" : ""}`}>
      <main className="relative flex-1">
        <div key={location.pathname} className="page-transition">
          <Outlet />
        </div>
      </main>

      {showNavBar && (
        <>
          {showPwaSuggestion && (
            <div className="fixed bottom-20 left-1/2 z-50 w-full max-w-120 -translate-x-1/2 px-4 pb-4">
              <div className="flex items-center gap-3 rounded-2xl border border-border bg-background/95 p-3 shadow-xl backdrop-blur-md dark:border-white/10">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Download className="size-5" />
                </div>
                <div className="flex-1 overflow-hidden text-sm">
                  <p className="font-semibold">Install Wallet Hub</p>
                  <p className="truncate text-muted-foreground">
                    {isIOS
                      ? "Tap Share then 'Add to Home Screen'"
                      : "Add to home screen for a better experience."}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-lg"
                    onClick={handleDismissSuggestion}
                  >
                    <X className="size-4" />
                  </Button>
                  {!isIOS && (
                    <Button
                      size="sm"
                      className="h-8 rounded-lg px-3 text-xs"
                      onClick={handleInstallClick}
                      disabled={!deferredPrompt}
                    >
                      Install
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          <BottomNavigationBar
            autoShowDelay={500}
            size={"sm"}
            endSlot={
              <GestureButton
                className="h-14 w-14 shadow-lg"
                icon={<Plus className="size-6" />}
                onTap={() => navigate("/transactions/new")}
                onHold={() => {}}
                holdTitle="Release for Action"
                holdTitlePosition="left"
                swipeActions={[
                  {
                    direction: "up",
                    title: "New Transaction",
                    icon: <MessageSquareText className="size-4" />,
                    onSwipe: () => navigate("/transactions/new"),
                  },
                ]}
              />
            }
          >
            <BottomNavigationItem
              active={location.pathname === "/"}
              render={<Link to="/" />}
            >
              <LayoutDashboard className="size-6" strokeWidth={1.5} />
              <span className="sr-only">Dashboard</span>
            </BottomNavigationItem>
            <BottomNavigationItem
              active={location.pathname === "/transactions"}
              render={<Link to="/transactions" />}
            >
              <ArrowUpDown className="size-6" strokeWidth={1.5} />
              <span className="sr-only">Transactions</span>
            </BottomNavigationItem>
            <BottomNavigationItem
              active={location.pathname === "/reminders"}
              render={<Link to="/reminders" />}
            >
              <Calendar className="size-6" strokeWidth={1.5} />
              <span className="sr-only">Reminders</span>
            </BottomNavigationItem>
            <BottomNavigationItem
              active={location.pathname === "/wallet"}
              render={<Link to="/wallet" />}
            >
              <Wallet
                className="size-6"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <span className="sr-only">Wallet</span>
            </BottomNavigationItem>
            <BottomNavigationItem
              active={location.pathname === "/settings"}
              render={<Link to="/settings" />}
            >
              <Settings className="size-6" strokeWidth={1.5} />
              <span className="sr-only">Settings</span>
            </BottomNavigationItem>
          </BottomNavigationBar>
        </>
      )}
    </div>
  )
}
