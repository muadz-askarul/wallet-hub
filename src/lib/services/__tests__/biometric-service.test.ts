import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  isBiometricSupported,
  registerBiometrics,
  authenticateBiometrics,
} from "../biometric-service"

describe("Biometric Service", () => {
  beforeEach(() => {
    vi.restoreAllMocks()

    // Mock window.PublicKeyCredential
    vi.stubGlobal("PublicKeyCredential", {
      isUserVerifyingPlatformAuthenticatorAvailable: vi
        .fn()
        .mockResolvedValue(true),
    })

    // Mock navigator.credentials
    vi.stubGlobal("navigator", {
      ...navigator,
      credentials: {
        create: vi.fn(),
        get: vi.fn(),
      },
    })
  })

  it("should check if biometrics are supported", async () => {
    const supported = await isBiometricSupported()
    expect(supported).toBe(true)
    expect(
      window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable
    ).toHaveBeenCalled()
  })

  it("should return false for register if not supported", async () => {
    ;(
      window.PublicKeyCredential
        .isUserVerifyingPlatformAuthenticatorAvailable as any
    ).mockResolvedValue(false)
    const result = await registerBiometrics()
    expect(result).toBe(false)
  })

  it("should return true on successful registration", async () => {
    ;(navigator.credentials.create as any).mockResolvedValue({ id: "cred-1" })
    const result = await registerBiometrics()
    expect(result).toBe(true)
    expect(navigator.credentials.create).toHaveBeenCalled()
  })

  it("should return true on successful authentication", async () => {
    ;(navigator.credentials.get as any).mockResolvedValue({ id: "cred-1" })
    const result = await authenticateBiometrics()
    expect(result).toBe(true)
    expect(navigator.credentials.get).toHaveBeenCalled()
  })
})
