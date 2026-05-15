# Targeted WebAuthn Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Refine WebAuthn biometric authentication to eliminate the manual credential selection step by storing and using the Credential ID.

**Architecture:** Store the `biometricCredentialId` in the `settings` table in IndexedDB. Use this ID in the `allowCredentials` array during `navigator.credentials.get` calls.

**Tech Stack:** React 19, TypeScript, Dexie (IndexedDB), WebAuthn API.

---

### Task 1: Update Settings Schema

**Files:**
- Modify: `src/lib/db.ts`

**Step 1: Add biometricCredentialId to Settings interface**

```typescript
export interface Settings {
  id: "user_settings"
  darkMode: boolean
  currency: string
  pin?: string
  isBiometricEnabled?: boolean
  biometricCredentialId?: string // Add this
  lockDelayMinutes?: number
  isOnboarded?: boolean
}
```

**Step 2: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add src/lib/db.ts
git commit -m "chore: add biometricCredentialId to Settings schema"
```

### Task 2: Update Biometric Registration

**Files:**
- Modify: `src/lib/services/biometric-service.ts`

**Step 1: Update registerBiometrics to save the ID**

```typescript
import { updateSettings } from "./settings-service"

// ... inside registerBiometrics
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
```

**Step 2: Update tests for registerBiometrics**

Modify: `src/lib/services/__tests__/biometric-service.test.ts`
Mock `updateSettings` and verify it's called with the correct ID.

**Step 3: Run tests**

Run: `bun test src/lib/services/__tests__/biometric-service.test.ts`
Expected: PASS

**Step 4: Commit**

```bash
git add src/lib/services/biometric-service.ts src/lib/services/__tests__/biometric-service.test.ts
git commit -m "feat: store credential ID during biometric registration"
```

### Task 3: Update Biometric Authentication

**Files:**
- Modify: `src/lib/services/biometric-service.ts`

**Step 1: Update authenticateBiometrics to use allowCredentials**

```typescript
import { getSettings } from "./settings-service"

// ... inside authenticateBiometrics
    const settings = await getSettings()
    const options: PublicKeyCredentialRequestOptions = {
      challenge,
      rpId: window.location.hostname || "localhost",
      userVerification: "required",
    }

    if (settings.biometricCredentialId) {
      const idArray = Uint8Array.from(atob(settings.biometricCredentialId), c => c.charCodeAt(0))
      options.allowCredentials = [{
        id: idArray.buffer,
        type: 'public-key',
        transports: ['internal']
      }]
    }

    const assertion = await navigator.credentials.get({ publicKey: options })
```

**Step 2: Update tests for authenticateBiometrics**

Modify: `src/lib/services/__tests__/biometric-service.test.ts`
Mock `getSettings` to return a credential ID and verify `navigator.credentials.get` is called with `allowCredentials`.

**Step 3: Run tests**

Run: `bun test src/lib/services/__tests__/biometric-service.test.ts`
Expected: PASS

**Step 4: Commit**

```bash
git add src/lib/services/biometric-service.ts src/lib/services/__tests__/biometric-service.test.ts
git commit -m "feat: use stored credential ID to skip selection screen"
```

### Task 4: Verification & Cleanup

**Step 1: Run all tests**

Run: `bun test`
Expected: PASS

**Step 2: Final Typecheck & Lint**

Run: `bun run typecheck && bun run lint`
Expected: PASS

**Step 3: Final Commit**

```bash
git commit -m "refactor: finalize targeted webauthn implementation"
```
