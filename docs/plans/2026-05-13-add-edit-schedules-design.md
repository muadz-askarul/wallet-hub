# Design Doc: Add and Edit Recurring Schedules & Bills

## Overview
Currently, recurring schedules ("bills" and "repeats") can only be created when adding a new transaction. There is no dedicated way to manage standalone schedules or edit existing ones. This design outlines how to reuse the `TransactionFormPage` to provide a unified experience for adding and editing recurring items from the `BillsPage`.

## User Interface

### Bills Page (`src/pages/bills.tsx`)
- **Add Schedule:** A new button (or FAB) will be added to navigate to `/bills/new`.
- **Edit Schedule:** Each schedule card will feature an "Edit" icon button navigating to `/bills/edit/:scheduleId`.

### Transaction Form Page (`src/pages/transaction-form.tsx`)
The page will be updated to handle an `isScheduleMode` prop and `scheduleId` route parameter.
- **Title:** Changes to "New/Edit Recurring Schedule".
- **Fields:** When in `isScheduleMode`, the "Set repeating schedule" section is forced open and the toggle is hidden.
- **Actions:** "Continue" button is hidden. Save logic updates `db.schedules` instead of `db.transactions`.

## Routing (`src/App.tsx`)
Two new routes:
- `/bills/new` -> `TransactionFormPage isScheduleMode`
- `/bills/edit/:scheduleId` -> `TransactionFormPage isScheduleMode`

## Data Flow
- **Loading:** If `scheduleId` is present, fetch from `db.schedules`.
- **Saving:**
  - If `isScheduleMode` is true, upsert the `db.schedules` table.
  - No initial transaction is recorded when creating a standalone schedule.
- **Deleting:** Deletes/Deactivates the schedule from `db.schedules`.

## Success Criteria
1. Users can add a new recurring schedule from the Bills page.
2. Users can edit an existing schedule's details (amount, pocket, category, period, end date).
3. Changes are correctly reflected in the Bills page and auto-repeat processing.
