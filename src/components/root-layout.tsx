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
} from "lucide-react"

export function RootLayout() {
  const location = useLocation()

  return (
    <div className="flex min-h-svh flex-col pb-32">
      <main className="flex-1">
        <Outlet />
      </main>

      <BottomNavigationBar autoShowDelay={500}>
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
