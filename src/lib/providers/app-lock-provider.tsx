import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react"
import { getSettings } from "../services/settings-service"
import { hashPin } from "../utils/crypto"

interface AppLockContextType {
  isLocked: boolean
  hasPin: boolean
  isOnboarded: boolean
  isStorageAvailable: boolean
  isInitialized: boolean
  unlock: (pin: string) => Promise<boolean>
  lock: () => void
  refreshLockState: () => Promise<void>
}

const AppLockContext = createContext<AppLockContextType | null>(null)

async function checkIndexedDB() {
  return new Promise<boolean>((resolve) => {
    try {
      if (!window.indexedDB) {
        resolve(false)
        return
      }
      const request = window.indexedDB.open("IDBAvailabilityCheck", 1)
      request.onerror = () => resolve(false)
      request.onsuccess = () => {
        const db = request.result
        db.close()
        window.indexedDB.deleteDatabase("IDBAvailabilityCheck")
        resolve(true)
      }
      request.onblocked = () => resolve(false)
    } catch {
      resolve(false)
    }
  })
}

export function AppLockProvider({ children }: { children: ReactNode }) {
  const [isLocked, setIsLocked] = useState(() => {
    // Initial guess from sessionStorage to avoid flash if possible
    return sessionStorage.getItem("app_is_locked") !== "false"
  })
  const [hasPin, setHasPin] = useState(false)
  const [isOnboarded, setIsOnboarded] = useState(true) // assume true until loaded
  const [isStorageAvailable, setIsStorageAvailable] = useState(true)
  const [isInitialized, setIsInitialized] = useState(false)

  // Wrapper to sync state with sessionStorage
  const setLocked = (locked: boolean) => {
    setIsLocked(locked)
    sessionStorage.setItem("app_is_locked", locked.toString())
  }

  // Load initial lock state and check onboarding
  const refreshLockState = useCallback(async () => {
    try {
      const dbAvailable = await checkIndexedDB()
      if (!dbAvailable) {
        setIsStorageAvailable(false)
        setIsOnboarded(false)
        setIsInitialized(true)
        return
      }

      const settings = await getSettings()
      const onboarded = !!settings.isOnboarded
      const pinSet = !!settings.pin

      setIsOnboarded(onboarded)
      setHasPin(pinSet)

      // Only lock if onboarded and a PIN is actually set
      if (onboarded && pinSet) {
        const wasLocked = sessionStorage.getItem("app_is_locked") === "true"

        if (wasLocked) {
          setLocked(true)
        } else {
          // Check background delay
          const bgTimeStr = localStorage.getItem("app_background_timestamp")
          if (bgTimeStr) {
            const bgTime = Number(bgTimeStr)
            const elapsedMinutes = (Date.now() - bgTime) / (1000 * 60)
            const delay = settings.lockDelayMinutes ?? 5

            if (elapsedMinutes >= delay) {
              setLocked(true)
            } else {
              setLocked(false)
            }
          } else {
            // Fresh open (no sessionStorage, no bg timestamp) -> Lock
            setLocked(true)
          }
        }
      } else {
        setLocked(false)
      }
    } catch (err) {
      console.error("Failed to load settings in AppLockProvider:", err)
    } finally {
      setIsInitialized(true)
    }
  }, [])

  useEffect(() => {
    const runRefresh = async () => {
      await refreshLockState()
    }
    runRefresh()

    const handleVisibilityChange = async () => {
      if (document.visibilityState === "hidden") {
        // App is backgrounded, record the timestamp
        localStorage.setItem("app_background_timestamp", Date.now().toString())
      } else if (document.visibilityState === "visible") {
        // App is foregrounded again, evaluate locking delay
        const settings = await getSettings()
        if (settings.isOnboarded && settings.pin) {
          const wasLocked = sessionStorage.getItem("app_is_locked") === "true"
          if (wasLocked) {
            setLocked(true)
            return
          }

          const bgTimeStr = localStorage.getItem("app_background_timestamp")
          if (bgTimeStr) {
            const bgTime = Number(bgTimeStr)
            const elapsedMinutes = (Date.now() - bgTime) / (1000 * 60)
            const delay = settings.lockDelayMinutes ?? 5

            if (elapsedMinutes >= delay) {
              setLocked(true)
            }
          }
        }
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [refreshLockState])

  const unlock = async (enteredPin: string): Promise<boolean> => {
    const settings = await getSettings()
    const hashedEnteredPin = await hashPin(enteredPin)
    if (hashedEnteredPin === settings.pin) {
      setLocked(false)
      // Clear background timestamp upon successful unlock
      localStorage.removeItem("app_background_timestamp")
      return true
    }
    return false
  }

  const lock = () => {
    if (isOnboarded && hasPin) {
      setLocked(true)
    }
  }

  return (
    <AppLockContext.Provider
      value={{
        isLocked,
        hasPin,
        isOnboarded,
        isStorageAvailable,
        isInitialized,
        unlock,
        lock,
        refreshLockState,
      }}
    >
      {children}
    </AppLockContext.Provider>
  )
}

export const useAppLock = () => {
  const context = useContext(AppLockContext)
  if (!context) {
    throw new Error("useAppLock must be used within AppLockProvider")
  }
  return context
}
