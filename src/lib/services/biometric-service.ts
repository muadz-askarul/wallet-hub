/**
 * Biometric Service using WebAuthn API.
 * Since this is an offline-first app without a backend, we use WebAuthn
 * to register and verify credentials locally.
 */

import { getSettings, updateSettings } from "./settings-service"

const CHALLENGE = "wallet-hub-local-challenge"

export async function isBiometricSupported(): Promise<boolean> {
  // Check if WebAuthn is supported and if platform authenticators are available
  return (
    window.PublicKeyCredential !== undefined &&
    (await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable())
  )
}

export async function registerBiometrics(): Promise<boolean> {
  try {
    const isSupported = await isBiometricSupported()
    if (!isSupported) return false

    const encoder = new TextEncoder()
    const challenge = encoder.encode(CHALLENGE)

    const options: PublicKeyCredentialCreationOptions = {
      challenge,
      rp: {
        name: "Wallet Hub",
        id: window.location.hostname || "localhost",
      },
      user: {
        id: encoder.encode("user-1"),
        name: "user@wallet-hub.local",
        displayName: "User",
      },
      pubKeyCredParams: [
        { alg: -7, type: "public-key" }, // ES256
        { alg: -257, type: "public-key" }, // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        userVerification: "required",
        residentKey: "required",
      },
      timeout: 60000,
    }

    const credential = (await navigator.credentials.create({
      publicKey: options,
    })) as PublicKeyCredential

    if (credential) {
      // Encode ID to base64 for storage
      const idBase64 = btoa(
        String.fromCharCode(...new Uint8Array(credential.rawId))
      )
      await updateSettings({ biometricCredentialId: idBase64 })
      return true
    }
    return false
  } catch (err) {
    console.error("Biometric registration failed:", err)
    return false
  }
}

export async function authenticateBiometrics(): Promise<boolean> {
  try {
    const isSupported = await isBiometricSupported()
    if (!isSupported) return false

    const encoder = new TextEncoder()
    const challenge = encoder.encode(CHALLENGE)

    const settings = await getSettings()
    const options: PublicKeyCredentialRequestOptions = {
      challenge,
      rpId: window.location.hostname || "localhost",
      userVerification: "required",
    }

    if (settings.biometricCredentialId) {
      const idArray = Uint8Array.from(
        atob(settings.biometricCredentialId),
        (c) => c.charCodeAt(0)
      )
      options.allowCredentials = [
        {
          id: idArray.buffer,
          type: "public-key",
          transports: ["internal"],
        },
      ]
    }

    const assertion = await navigator.credentials.get({ publicKey: options })

    if (assertion) {
      return true
    }
    return false
  } catch (err) {
    console.error("Biometric authentication failed:", err)
    return false
  }
}
