import { useState } from "react"
import { Outlet, Link, useLocation } from "react-router-dom"
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
import { AddTransactionSheet } from "@/components/add-transaction-sheet"

export function RootLayout() {
  const location = useLocation()
  const [addTxOpen, setAddTxOpen] = useState(false)

  return (
    <div className="flex min-h-svh flex-col pb-32">
      <main className="flex-1">
        <Outlet />
      </main>

      <BottomNavigationBar
        autoShowDelay={500}
        size={"sm"}
        endSlot={
          <GestureButton
            className="h-14 w-14 shadow-lg"
            icon={<Plus className="size-6" />}
            onTap={() => setAddTxOpen(true)}
            onHold={() => setAddTxOpen(true)}
            holdTitle="Release for Action"
            holdTitlePosition="left"
            swipeActions={[
              {
                direction: "up",
                title: "New Transaction",
                icon: <MessageSquareText className="size-4" />,
                onSwipe: () => setAddTxOpen(true),
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
          <Wallet className="size-6" strokeWidth={1.5} />
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

      <AddTransactionSheet open={addTxOpen} onOpenChange={setAddTxOpen} />
    </div>
  )
}
