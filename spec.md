# Jewellery Order Management System

## Current State

The Reconciliation page allows uploading an Excel file and clicking "Reconcile with Total Orders". However, the duplicate detection is completely broken:

1. `reconcileMasterFile()` on the backend compares against `masterDesignKarigars` (master design store), NOT existing orders — so it cannot detect duplicate orders.
2. The frontend ignores the backend result entirely and maps ALL parsed Excel rows as "new lines", meaning every upload shows every row as needing to be added regardless of whether it already exists.
3. The "Missing in Master" section shows orders in the app not in Excel, but uses the wrong backend data source and never populates correctly. There is no way to select and delete those orders.

## Requested Changes (Diff)

### Add
- Frontend-only duplicate detection: after parsing Excel, fetch all existing orders via `getAllOrders()`, build a Set of `orderNo_designCode` keys, and filter parsed rows to only show those NOT already in the system (across Pending, Ready, Hallmark, ReturnFromHallmark statuses).
- "In App, Not in Excel" section: shows all orders currently in the app whose `orderNo_designCode` key is NOT present in the uploaded Excel. Includes select-all checkbox and per-row checkboxes. Has a "Delete Selected" button that calls `deleteOrder()` for each selected order, with a confirmation step.
- Accurate summary counts: "Already Existing" = parsed rows that already exist in app; "New Lines" = parsed rows not in app; "In App, Not in Excel" = app orders not in Excel.

### Modify
- `handleReconcile` in `Reconciliation.tsx`: replace the broken backend-based reconcile call with a frontend comparison. Fetch `getAllOrders()` directly, build lookup map by `orderNo_designCode`, filter parsed rows into new vs existing.
- Remove the call to `reconcileMutation.mutateAsync(undefined)` (the backend `reconcileMasterFile()` call) since it operates on master design data, not orders.
- Summary cards: update "Already Existing" and "New Lines" counts to reflect the corrected logic.
- "Missing in Master" section renamed to "In App, Not in Excel" with delete capability.

### Remove
- Reliance on `useReconcileMasterFile` hook in the reconcile flow (the hook can stay but should not be called for order duplicate detection).

## Implementation Plan

1. In `Reconciliation.tsx` `handleReconcile`:
   - Call `actor.getAllOrders()` directly (via the actor from `useActor`) to get all existing orders.
   - Build a Set of existing keys: `${order.orderNo}_${order.design}` for all statuses.
   - Split `parsedRows` into `newRows` (key not in set) and `existingRows` (key in set).
   - Build `appNotInExcel`: existing orders whose key is NOT in the parsed Excel set.
   - Set reconcile result with correct counts and both lists.

2. Add `appNotInExcel: Order[]` and `selectedAppNotInExcel: Set<string>` state.

3. Render "In App, Not in Excel" card below "New Lines":
   - Columns: Order No, Design, Type, Status, Qty, Weight.
   - Select-all checkbox in header.
   - Per-row checkbox.
   - "Delete Selected (N)" button — shows a confirm dialog before deleting.
   - Calls `useDeleteOrder` mutation for each selected order sequentially.
   - On success, refreshes the reconcile result (removes deleted rows from the list).

4. Keep all existing UI structure, dark theme, and orange/gold styling unchanged.
