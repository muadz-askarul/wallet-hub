# Design Doc: Comprehensive UI/UX and Functional Updates

## Overview
A set of refinements to improve terminology ("Reminders"), UX ergonomics (input defaults and focus), navigation history robustness, dashboard visibility, and data portability (CSV Backup/Restore).

## 1. Terminology: Bill -> Reminder
- **Goal**: Standardize on "Reminder" for all recurring items and manual bills.
- **Actions**:
  - Rename `src/pages/bills.tsx` to `src/pages/reminders.tsx`.
  - Update route `/bills` to `/reminders`.
  - Update all UI text, labels, and variable names (where safe/local).

## 2. Input Ergonomics
- **Amount Inputs**:
  - Initial value set to `""` or `undefined` (displaying placeholder "0").
  - Components affected: `NumericInput`, `TransactionFormPage`, `WalletFormPage`.
- **Wallet Creation**:
  - New wallets start with an empty name.
  - The name input automatically receives focus upon adding a new wallet (using `useRef`).

## 3. Navigation History Logic
- **Goal**: Prevent history "loops" when submitting forms or going back.
- **Logic**: If the target route matches the immediate previous route in the stack, use `replace: true` instead of `push`.
- **Implementation**: A utility wrapper around `navigate`.

## 4. Dashboard Refinements
- **Reminder Card**: 
  - Reduce vertical height by ~50% (tighter padding/gaps).
  - Remove "(N)" counter from the "See All" card.
- **Filtering**: 
  - Change "due this month" to "due within 1 month".
  - Calculation: Compare `day`, `month`, `year` (calendar date) rather than milliseconds.

## 5. Data Portability: CSV Backup & Restore
- **Format**: Single consolidated CSV file.
- **Columns**: `table`, `data` (JSON-encoded row content or flat columns for all fields). 
  - *Decision*: Use flattened columns for all shared fields, with a `table_name` discriminator.
- **Sharing**: 
  - Use `navigator.share` (Web Share API) to allow direct sharing to Google Drive/etc.
  - Fallback to file download if unsupported.
- **Restore**: Parse CSV and use `db.bulkPut` (overwriting existing IDs) or `bulkAdd`.

## Success Criteria
- Terminology is consistent throughout the app.
- Form inputs feel more responsive and native.
- Dashboard shows a concise list of upcoming reminders for the next month.
- Users can easily export their data to a cloud drive and restore it.
