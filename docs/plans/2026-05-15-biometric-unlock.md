# Biometric Authentication Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Add biometric (fingerprint/FaceID) unlocking to Wallet Hub with PIN fallback and encrypted storage.

**Architecture:**
1. Use Web Authentication API (WebAuthn) for biometric interaction.
2. Store PIN as a SHA-256 hash in Dexie.
3. Update `AppLockProvider` to manage biometric state and verification logic.
4. Add full-screen onboarding step and PIN-gated settings toggle.

**Tech Stack:** React, Dexie, WebAuthn API, Web Crypto API.

---

### Task 1: PIN Encryption (Hashing)

**Files:**
- Create: `src/lib/utils/crypto.ts`
- Modify: `src/lib/services/settings-service.ts`
- Modify: `src/lib/providers/app-lock-provider.tsx`
- Modify: `src/pages/onboarding.tsx`

**Step 1: Create crypto utility for hashing**
```typescript
export async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
```

**Step 2: Update onboarding to hash PIN before saving**
Modify `handleCompleteSetup` in `src/pages/onboarding.tsx` to call `hashPin(pin)` before `updateSettings`.

**Step 3: Update AppLockProvider to verify hashed PIN**
Modify `unlock` function to hash `enteredPin` before comparing with `settings.pin`.

**Step 4: Commit**
```bash
git add src/lib/utils/crypto.ts src/lib/services/settings-service.ts src/lib/providers/app-lock-provider.tsx src/pages/onboarding.tsx
git commit -m "feat(security): encrypt PIN using SHA-256 hashing"
```

### Task 2: Biometric Service

**Files:**
- Create: `src/lib/services/biometric-service.ts`

**Step 1: Implement Biometric Service**
Implement `isBiometricSupported()`, `registerBiometrics()`, and `authenticateBiometrics()`.
Use a static challenge for local-only verification.

**Step 2: Commit**
```bash
git add src/lib/services/biometric-service.ts
git commit -m "feat(security): add biometric service using WebAuthn"
```

### Task 3: App Lock & Settings State

**Files:**
- Modify: `src/lib/db.ts`
- Modify: `src/lib/providers/app-lock-provider.tsx`

**Step 1: Update Settings schema**
Add `isBiometricEnabled?: boolean` to `Settings` interface in `src/lib/db.ts`.

**Step 2: Update AppLockProvider**
Add `isBiometricEnabled` state and `unlockWithBiometrics` function.
Auto-trigger `unlockWithBiometrics` on mount if enabled.

**Step 3: Commit**
```bash
git add src/lib/db.ts src/lib/providers/app-lock-provider.tsx
git commit -m "feat(security): integrate biometrics into AppLockProvider"
```

### Task 4: UI Updates - PinInputForm

**Files:**
- Modify: `src/components/pin-input-form.tsx`

**Step 1: Add Biometric Button to Grid**
Check `isBiometricEnabled` prop. If true, show `Fingerprint` icon in the bottom-left empty slot of the number grid.
Clicking it should call `onBiometricClick`.

**Step 2: Commit**
```bash
git add src/components/pin-input-form.tsx
git commit -m "feat(ui): add biometric button to PinInputForm"
```

### Task 5: UI Updates - Onboarding

**Files:**
- Modify: `src/pages/onboarding.tsx`

**Step 1: Add Step 3 (Biometric Setup)**
Create a full-screen step after PIN setup that asks to enable biometrics.
Show "Enable" and "Skip" buttons.

**Step 2: Commit**
```bash
git add src/pages/onboarding.tsx
git commit -m "feat(ui): add biometric setup step to onboarding"
```

### Task 6: UI Updates - Settings

**Files:**
- Modify: `src/pages/settings.tsx`

**Step 1: Add Biometric Toggle with PIN Gate**
Add toggle in "Preferences" section.
When clicked, show a dialog asking for PIN before changing the state.

**Step 2: Commit**
```bash
git add src/pages/settings.tsx
git commit -m "feat(ui): add biometric toggle to settings with PIN gate"
```
