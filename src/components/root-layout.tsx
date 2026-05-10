import { Outlet, Link, useLocation } from "react-router-dom"
import {
  BottomNavigationBar,
  BottomNavigationItem,
} from "@/components/ui/bottom-navigation-bar"
import {
  LayoutDashboard,
  Receipt,
  PieChart,
  Wallet,
  Settings,
  Plus,
  ArrowUpRight,
} from "lucide-react"
import { GestureButton } from "@/components/ui/gesture-button"
import { toast } from "sonner"

export function RootLayout() {
  const location = useLocation()

  return (
    <div className="flex min-h-svh flex-col pb-32">
      <main className="flex-1">
        <Outlet />
      </main>

      <BottomNavigationBar
        autoShowDelay={500}
        endSlot={
          <GestureButton
            icon={<Plus />}
            onTap={() => toast("Tap: Open quick add")}
            onHold={() => toast("Hold action triggered")}
            holdTitle="Release for Action"
            swipeActions={[
              {
                direction: "up",
                title: "New Transaction",
                icon: <ArrowUpRight className="h-4 w-4" />,
                onSwipe: () => toast("Swipe Up: New Transaction"),
              },
            ]}
          />
        }
      >
        <BottomNavigationItem
          active={location.pathname === "/"}
          render={<Link to="/" />}
        >
          <LayoutDashboard className="h-6 w-6" strokeWidth={1.5} />
          <span className="sr-only">Dashboard</span>
        </BottomNavigationItem>
        <BottomNavigationItem
          active={location.pathname === "/bills"}
          render={<Link to="/bills" />}
        >
          <Receipt className="h-6 w-6" strokeWidth={1.5} />
          <span className="sr-only">Bills</span>
        </BottomNavigationItem>
        <BottomNavigationItem
          active={location.pathname === "/budget"}
          render={<Link to="/budget" />}
        >
          <PieChart className="h-6 w-6" strokeWidth={1.5} />
          <span className="sr-only">Budget</span>
        </BottomNavigationItem>
        <BottomNavigationItem
          active={location.pathname === "/wallet"}
          render={<Link to="/wallet" />}
        >
          <Wallet className="h-6 w-6" strokeWidth={1.5} />
          <span className="sr-only">Wallet</span>
        </BottomNavigationItem>
        <BottomNavigationItem
          active={location.pathname === "/settings"}
          render={<Link to="/settings" />}
        >
          <Settings className="h-6 w-6" strokeWidth={1.5} />
          <span className="sr-only">Settings</span>
        </BottomNavigationItem>
      </BottomNavigationBar>
    </div>
  )
}
