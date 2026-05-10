import { Outlet, Link, useLocation } from "react-router-dom"
import {
  BottomNavigationBar,
  BottomNavigationItem,
} from "@/components/ui/bottom-navigation-bar"
import { LayoutDashboard, MessageSquare, User, Plus, Lock } from "lucide-react"
import { GestureButton } from "@/components/ui/gesture-button"

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
            icon={<Plus className="h-6 w-6" />}
            className="h-12 w-12 border border-border bg-primary text-primary-foreground shadow-lg dark:border-white/10"
            onTap={() => alert("Tapped! (e.g. Quick Add)")}
            onHold={() => alert("Held & Released! (e.g. Action Executed)")}
            holdTitle="Release for details"
            holdTitlePosition="left"
            swipeActions={[
              {
                direction: "up",
                title: "Slide up to lock",
                icon: <Lock className="h-5 w-5" />,
                onSwipe: () => alert("Swiped Up! (e.g. Lock Wallet)"),
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
        </BottomNavigationItem>
        <BottomNavigationItem
          active={location.pathname === "/messages"}
          render={<Link to="/messages" />}
        >
          <MessageSquare className="h-6 w-6" strokeWidth={1.5} />
        </BottomNavigationItem>
        <BottomNavigationItem
          active={location.pathname === "/profile"}
          render={<Link to="/profile" />}
        >
          <User className="h-6 w-6" strokeWidth={1.5} />
        </BottomNavigationItem>
      </BottomNavigationBar>
    </div>
  )
}
