import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react"
import { getSettings } from "../services/settings-service"
import { hashPin } from "../utils/crypto"
import { authenticateBiometrics } from "../services/biometric-service"

interface AppLockContextType {
  isLocked: boolean
  hasPin: boolean
  isOnboarded: boolean
  isBiometricEnabled: boolean
  unlock: (pin: string) => Promise<boolean>
  unlockWithBiometrics: () => Promise<boolean>
  lock: () => void
  refreshLockState: () => Promise<void>
}

const AppLockContext = createContext<AppLockContextType | null>(null)

export function AppLockProvider({ children }: { children: ReactNode }) {
  const [isLocked, setIsLocked] = useState(false)
  const [hasPin, setHasPin] = useState(false)
  const [isOnboarded, setIsOnboarded] = useState(true) // assume true until loaded
  const [isBiometricEnabled, setIsBiometricEnabled] = useState(false)

  // Load initial lock state and check onboarding
  const refreshLockState = async () => {
    try {
      const settings = await getSettings()
      const onboarded = !!settings.isOnboarded
      const pinSet = !!settings.pin

      setIsOnboarded(onboarded)
      setHasPin(pinSet)
      setIsBiometricEnabled(!!settings.isBiometricEnabled)

      // Only lock if onboarded and a PIN is actually set
      if (onboarded && pinSet) {
        // Check if there was a previous session background timestamp
        const bgTimeStr = localStorage.getItem("app_background_timestamp")
        if (bgTimeStr) {
          const bgTime = Number(bgTimeStr)
          const elapsedMinutes = (Date.now() - bgTime) / (1000 * 60)
          const delay = settings.lockDelayMinutes ?? 5

          if (elapsedMinutes >= delay) {
            setIsLocked(true)
          } else {
            setIsLocked(false)
          }
        } else {
          // Fresh open starts locked for security
          setIsLocked(true)
        }
      } else {
        setIsLocked(false)
      }
    } catch (err) {
      console.error("Failed to load settings in AppLockProvider:", err)
    }
  }

  useEffect(() => {
    refreshLockState()

    const handleVisibilityChange = async () => {
      if (document.visibilityState === "hidden") {
        // App is backgrounded, record the timestamp
        localStorage.setItem("app_background_timestamp", Date.now().toString())
      } else if (document.visibilityState === "visible") {
        // App is foregrounded again, evaluate locking delay
        const settings = await getSettings()
        if (settings.isOnboarded && settings.pin) {
          const bgTimeStr = localStorage.getItem("app_background_timestamp")
          if (bgTimeStr) {
            const bgTime = Number(bgTimeStr)
            const elapsedMinutes = (Date.now() - bgTime) / (1000 * 60)
            const delay = settings.lockDelayMinutes ?? 5

            if (elapsedMinutes >= delay) {
              setIsLocked(true)
            }
          }
        }
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [])

  const unlock = async (enteredPin: string): Promise<boolean> => {
    const settings = await getSettings()
    const hashedEnteredPin = await hashPin(enteredPin)
    if (hashedEnteredPin === settings.pin) {
      setIsLocked(false)
      // Clear background timestamp upon successful unlock
      localStorage.removeItem("app_background_timestamp")
      return true
    }
    return false
  }

  const unlockWithBiometrics = async (): Promise<boolean> => {
    const success = await authenticateBiometrics()
    if (success) {
      setIsLocked(false)
      localStorage.removeItem("app_background_timestamp")
      return true
    }
    return false
  }

  // Auto-trigger biometric unlock when locked and enabled
  useEffect(() => {
    if (isLocked && isBiometricEnabled) {
      unlockWithBiometrics()
    }
  }, [isLocked, isBiometricEnabled])

  const lock = () => {
    if (isOnboarded && hasPin) {
      setIsLocked(true)
    }
  }

  return (
    <AppLockContext.Provider
      value={{
        isLocked,
        hasPin,
        isOnboarded,
        isBiometricEnabled,
        unlock,
        unlockWithBiometrics,
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
