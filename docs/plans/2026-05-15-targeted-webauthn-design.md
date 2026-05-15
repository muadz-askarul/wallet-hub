# Design Doc: Targeted WebAuthn Authentication

## Overview
Refine the biometric authentication flow to remove the manual "credential selection" step. By storing the Credential ID locally and using it during authentication, the browser will immediately trigger the native biometric prompt (FaceID/Fingerprint) instead of showing a list of available passkeys.

## Goals
- Eliminate the 2-step authentication friction.
- Provide a more "instant" and "native" experience for PWA users on Android and iOS.
- Maintain fallback compatibility for missing or expired credentials.

## Architecture

### 1. Data Layer (`src/lib/db.ts`)
Update the `Settings` interface to include the credential ID.
```typescript
export interface Settings {
  // ... existing fields
  isBiometricEnabled?: boolean
  biometricCredentialId?: string // Base64 encoded ID
}
```

### 2. Biometric Service (`src/lib/services/biometric-service.ts`)

#### Registration (`registerBiometrics`)
1. Capture the credential from `navigator.credentials.create`.
2. Encode the `credential.id` (ArrayBuffer) to a Base64 string.
3. Save the Base64 string to user settings via `updateSettings`.

#### Authentication (`authenticateBiometrics`)
1. Retrieve `biometricCredentialId` from settings.
2. If present, decode it back to an ArrayBuffer.
3. Add it to the `allowCredentials` array in the WebAuthn options:
   ```typescript
   allowCredentials: [{
     id: credentialIdBuffer,
     type: 'public-key',
     transports: ['internal'] // Hint for platform biometric
   }]
   ```
4. Call `navigator.credentials.get`.

### 3. Components & Providers
- **`AppLockProvider`**: Ensure it handles the refined service call correctly.
- **`Settings` page**: Ensure registration correctly persists the ID.

## Error Handling
- If `allowCredentials` fails (e.g., ID no longer valid on device), fall back to the "discoverable" mode (empty `allowCredentials`) to allow the user to see what's wrong or re-authenticate.
- Log failures for easier debugging of cross-device issues.

## Testing Strategy
- Manual verification on Android (PWA) and Desktop (Chrome/Safari) to confirm the selection screen is bypassed.
- Verify that dismissing the biometric prompt doesn't lock the user out (fallback to PIN).
