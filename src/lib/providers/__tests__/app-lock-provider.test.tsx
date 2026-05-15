import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, waitFor, cleanup } from "@testing-library/react"
import { AppLockProvider, useAppLock } from "../app-lock-provider"
import { getSettings } from "../../services/settings-service"
import { authenticateBiometrics } from "../../services/biometric-service"

vi.mock("../../services/settings-service")
vi.mock("../../services/biometric-service")
vi.mock("../../utils/crypto", () => ({
  hashPin: vi.fn((pin) => Promise.resolve(`hashed-${pin}`)),
}))

function TestComponent() {
  const { isLocked, isBiometricEnabled, unlockWithBiometrics } = useAppLock()
  return (
    <div>
      <div data-testid="isLocked">{isLocked.toString()}</div>
      <div data-testid="isBiometricEnabled">
        {isBiometricEnabled.toString()}
      </div>
      <button onClick={unlockWithBiometrics}>Unlock Biometric</button>
    </div>
  )
}

describe("AppLockProvider", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
    // Default mock: onboarded with PIN, biometric disabled
    vi.mocked(getSettings).mockResolvedValue({
      isOnboarded: true,
      pin: "hashed-1234",
      isBiometricEnabled: false,
    } as any)
  })

  afterEach(() => {
    cleanup()
  })

  it("should lock by default if onboarded and has PIN", async () => {
    render(
      <AppLockProvider>
        <TestComponent />
      </AppLockProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId("isLocked").textContent).toBe("true")
    })
  })

  it("should unlock with biometrics if enabled", async () => {
    vi.mocked(getSettings).mockResolvedValue({
      isOnboarded: true,
      pin: "hashed-1234",
      isBiometricEnabled: true,
    } as any)
    vi.mocked(authenticateBiometrics).mockResolvedValue(true)

    render(
      <AppLockProvider>
        <TestComponent />
      </AppLockProvider>
    )

    // Wait for it to be locked first
    await waitFor(() => {
      expect(screen.getByTestId("isLocked").textContent).toBe("true")
    })

    // Then wait for it to be unlocked by biometrics
    await waitFor(
      () => {
        expect(screen.getByTestId("isLocked").textContent).toBe("false")
      },
      { timeout: 2000 }
    )

    expect(authenticateBiometrics).toHaveBeenCalled()
  })

  it("should not unlock with biometrics if it fails", async () => {
    vi.mocked(getSettings).mockResolvedValue({
      isOnboarded: true,
      pin: "hashed-1234",
      isBiometricEnabled: true,
    } as any)
    vi.mocked(authenticateBiometrics).mockResolvedValue(false)

    render(
      <AppLockProvider>
        <TestComponent />
      </AppLockProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId("isLocked").textContent).toBe("true")
    })
  })
})
