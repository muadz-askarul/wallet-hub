# Design Doc: Wallet Form Page

## Overview
Convert the wallet and pocket management interface from a `Drawer` in the `WalletPage` into a dedicated full-screen page (`WalletFormPage`). This improves ergonomics and follows the pattern established in the Transaction Form.

## 1. Shared Component: SortablePocketRow
- **File**: `src/components/sortable-pocket-row.tsx`
- **Purpose**: Extract the reorderable pocket row logic to be used in the new page.
- **Exports**:
  - `type DraftPocket`: `{ id?: string; name: string; amount: string; _key: string }`
  - `function SortablePocketRow`: The component with `dnd-kit` hooks.

## 2. Wallet Form Page
- **Route**: `/wallet/new` and `/wallet/edit/:id`
- **File**: `src/pages/wallet-form.tsx`
- **Architecture**:
  - Use `useParams()` to distinguish between creation and editing.
  - Use `useLiveQuery` and `db.pockets` to fetch existing data if editing.
  - **Layout**:
    - **Header**: Back button and title ("Add Wallet" / "Edit Wallet").
    - **Form**: Wallet Name input and a list of `SortablePocketRow` components.
    - **Sticky Footer**: Save, Delete (if edit), and Cancel buttons fixed to the bottom.

## 3. Integration
- **App.tsx**: Add routes for the new page.
- **WalletPage**:
  - Update "Add" and "Edit" triggers to use `navigate()`.
  - Remove all `Drawer` related state and logic.

## Success Criteria
- Wallets can be added and edited via dedicated URLs.
- Pocket reordering remains functional in the new page.
- Sticky footer provides consistent action placement.
- Clean separation of concerns between wallet listing and wallet management.
