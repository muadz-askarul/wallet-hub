import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react"

interface AppLockContextType {
  isLocked: boolean
  unlock: (pin: string) => boolean
}

const AppLockContext = createContext<AppLockContextType | null>(null)

export function AppLockProvider({ children }: { children: ReactNode }) {
  const [isLocked, setIsLocked] = useState(true)
  const correctPin = "123456" // Will connect to settings service in Task 5

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        setIsLocked(true) // Lock when sent to background
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange)
  }, [])

  const unlock = (pin: string) => {
    if (pin === correctPin) {
      setIsLocked(false)
      return true
    }
    return false
  }

  return (
    <AppLockContext.Provider value={{ isLocked, unlock }}>
      {children}
    </AppLockContext.Provider>
  )
}

export const useAppLock = () => {
  const context = useContext(AppLockContext)
  if (!context)
    throw new Error("useAppLock must be used within AppLockProvider")
  return context
}
