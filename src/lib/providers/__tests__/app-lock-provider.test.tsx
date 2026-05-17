import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, waitFor, cleanup } from "@testing-library/react"
import { AppLockProvider, useAppLock } from "../app-lock-provider"
import { getSettings } from "../../services/settings-service"

vi.mock("../../services/settings-service")
vi.mock("../../utils/crypto", () => ({
  hashPin: vi.fn((pin) => Promise.resolve(`hashed-${pin}`)),
}))

// Mock IndexedDB
const mockIndexedDB = {
  open: vi.fn().mockReturnValue({
    onsuccess: null,
    onerror: null,
    onblocked: null,
    result: { close: vi.fn() },
  }),
  deleteDatabase: vi.fn(),
}

Object.defineProperty(window, "indexedDB", {
  value: mockIndexedDB,
})

function TestComponent() {
  const { isLocked } = useAppLock()
  return (
    <div>
      <div data-testid="isLocked">{isLocked.toString()}</div>
    </div>
  )
}

describe("AppLockProvider", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
    
    // Setup mock IndexedDB success
    const request = {
      onsuccess: null as any,
      result: { close: vi.fn() },
    }
    mockIndexedDB.open.mockReturnValue(request)
    
    // Default mock: onboarded with PIN
    vi.mocked(getSettings).mockResolvedValue({
      isOnboarded: true,
      pin: "hashed-1234",
    } as any)
    
    // Trigger onsuccess after a tick
    setTimeout(() => {
      if (request.onsuccess) request.onsuccess()
    }, 0)
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
})
