import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  isBiometricSupported,
  registerBiometrics,
  authenticateBiometrics,
} from "../biometric-service"
import * as settingsService from "../settings-service"

vi.mock("../settings-service", () => ({
  updateSettings: vi.fn().mockResolvedValue({}),
  getSettings: vi.fn().mockResolvedValue({}),
}))

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

  it("should return true on successful registration and save ID", async () => {
    const rawId = new Uint8Array([1, 2, 3]).buffer
    ;(navigator.credentials.create as any).mockResolvedValue({
      id: "AQID",
      rawId,
    })
    const result = await registerBiometrics()
    expect(result).toBe(true)
    expect(navigator.credentials.create).toHaveBeenCalled()
    expect(settingsService.updateSettings).toHaveBeenCalledWith({
      biometricCredentialId: btoa(String.fromCharCode(1, 2, 3)),
    })
  })

  it("should return true on successful authentication and use stored ID", async () => {
    const credentialId = btoa(String.fromCharCode(1, 2, 3))
    ;(settingsService.getSettings as any).mockResolvedValue({
      biometricCredentialId: credentialId,
    })
    ;(navigator.credentials.get as any).mockResolvedValue({ id: "cred-1" })

    const result = await authenticateBiometrics()
    expect(result).toBe(true)
    expect(navigator.credentials.get).toHaveBeenCalledWith({
      publicKey: expect.objectContaining({
        allowCredentials: [
          {
            id: expect.any(ArrayBuffer),
            type: "public-key",
            transports: ["internal"],
          },
        ],
      }),
    })
  })
})
