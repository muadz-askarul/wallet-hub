# Design Doc: UI Revamp and Robustness Improvements

## Overview
Revamp several UI components for better ergonomics (PIN form, Transaction form), refine visual density (Wallet page), remove Biometric features, and improve application robustness with IndexedDB fallback.

## 1. AutoTextSize Component
- **Component**: `src/components/ui/auto-text-size.tsx`
- **Behavior**: Dynamically scales font size to fit within a specific width.
- **Rules**:
  - Max font size: `1rem`.
  - Min font size: `0.5rem`.
  - Max container width: 30% of parent.
- **Application**:
  - Wallet page pocket amounts/names.
  - Transaction list amounts.

## 2. Transaction Form Revamp
- **Sticky Footer**: Save and Continue buttons fixed to bottom.
- **Repeat Settings**: 
  - Trigger: Icon button beside amount input.
  - Container: Bottom Sheet (Drawer).
  - State Indication: Primary button variant when "Set repeating schedule" is active.

## 3. Wallet Page & PIN Form
- **Wallet**: Pocket name and amount font size set to `12px`.
- **PIN Form**: Number buttons increased to `h-20 w-20`.

## 4. Biometric Removal
- Comment out Biometric toggle in `src/pages/settings.tsx`.
- Comment out/skip Biometric setup in `src/pages/onboarding.tsx`.
- Remove Biometric button from `src/components/pin-input-form.tsx`.

## 5. IndexedDB Robustness
- **Check**: Detect IndexedDB availability during app initialization.
- **Fallback**: Redirect to onboarding with an error if storage is unavailable.

## Success Criteria
- Transaction form buttons are always accessible at the bottom.
- Repeating transactions are configured via a clean bottom sheet.
- Amounts scale down gracefully instead of overflowing or being hidden.
- App handles storage-less environments gracefully.
