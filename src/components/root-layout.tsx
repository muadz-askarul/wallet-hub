import { useEffect } from "react"
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
} from "lucide-react"
import { GestureButton } from "@/components/ui/gesture-button"
import { processAutoRepeatTransactions } from "@/lib/services/recurring-service"

export function RootLayout() {
  const location = useLocation()
  const navigate = useNavigate()

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

  const showNavBar = ["/", "/transactions", "/wallet", "/settings"].includes(
    location.pathname
  )

  return (
    <div className={`flex min-h-svh flex-col ${showNavBar ? "pb-20" : ""}`}>
      <main className="relative flex-1">
        <div key={location.pathname} className="page-transition">
          <Outlet />
        </div>
      </main>

      {showNavBar && (
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
      )}
    </div>
  )
}
