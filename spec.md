# Jewellery Order Management System

## Current State

Full-stack OMS with Motoko backend and React frontend. Handles SO/CO/RB orders, karigar assignments, design mappings, tag printing, reconciliation, and ageing stock.

Backend has:
- `createOrder(...)` — does NOT accept `orderDate`, always stores `null`
- `markOrdersAsReady(orderIds, updatedBy)` — does NOT write `updatedBy`/`lastAction` fields on order
- `batchUpdateOrderStatus(orderIds, newStatus, updatedBy)` — does NOT write `updatedBy`/`lastAction` fields on order
- No `createOrderWithDate` function
- No `updateOrderQuantity` function

Frontend has:
- `useUpdateDesignGroupStatus` calls a non-existent `actor.updateDesignGroupStatus` — falls through silently
- `useBatchSupplyRBOrders` partial supply marks original as Ready with full qty, creates new Pending with remainder — Ready entry shows full qty instead of supplied qty
- Generic name resolved from `order.genericName` (stored at ingest as null) instead of dynamically from master design mappings
- Ageing stock shows "No date" because `orderDate` is never saved to backend (no `createOrderWithDate` called)
- KarigarDetail shows all columns; export buttons visible
- AppSidebar: Tag Printing and Barcode Scanning are Admin-only; Staff cannot see them

## Requested Changes (Diff)

### Add
- Backend: `createOrderWithDate` function — same as `createOrder` but accepts `orderDate: ?Time.Time`
- Backend: `updateOrderQuantity(orderId, newQuantity, updatedBy)` — updates quantity and writes `updatedBy`/`lastAction` fields
- Backend: `markOrdersAsReady` must write `updatedBy` and `lastAction` fields on the order record
- Backend: `batchUpdateOrderStatus` must write `updatedBy` and `lastAction` fields on the order record
- Backend: `markOrdersAsPending` must write `updatedBy` and `lastAction` fields

### Modify
- IngestOrders.tsx: call `createOrderWithDate` passing `orderDate` from parsed Excel
- useQueries.ts `useUpdateDesignGroupStatus`: call `actor.batchUpdateOrderStatus(orderIds, OrderStatus.Hallmark, updatedBy)` instead of non-existent `updateDesignGroupStatus`
- useQueries.ts `useBatchSupplyRBOrders`: after `markOrdersAsReady` on original orderId, call `updateOrderQuantity(orderId, suppliedQty, updatedBy)` to fix the ready entry quantity to the supplied amount
- useQueries.ts `useSaveOrder`: call `createOrderWithDate` passing `orderDate` param  
- All order row displays: resolve `genericName` dynamically from design mappings map (same pattern as `resolveKarigar`) instead of using `order.genericName`
- KarigarDetail.tsx: show only Generic Name, Weight, Qty columns in the table (remove Order No, Design, Type columns); keep all export buttons
- AppSidebar.tsx: add `AppRole.Staff` to `roles` array for Tag Printing and Barcode Scanning menu items

### Remove
- Nothing removed

## Implementation Plan

1. Regenerate backend with `createOrderWithDate`, `updateOrderQuantity`, and updated `markOrdersAsReady`/`batchUpdateOrderStatus`/`markOrdersAsPending` that write `updatedBy`/`lastAction`
2. Update `IngestOrders.tsx` to call `createOrderWithDate` with parsed `orderDate`
3. Update `useUpdateDesignGroupStatus` in `useQueries.ts` to call `batchUpdateOrderStatus` with Hallmark status
4. Update `useBatchSupplyRBOrders` to call `updateOrderQuantity` after marking ready to fix the qty
5. Add `resolveGenericName` utility (alongside `resolveKarigar`) in `karigarResolver.ts`
6. Update all order row displays to use dynamic generic name resolution from mappings
7. Update `KarigarDetail.tsx` table to show only Generic Name, Weight, Qty (keep exports)
8. Update `AppSidebar.tsx` to allow Staff access to Tag Printing and Barcode Scanning
