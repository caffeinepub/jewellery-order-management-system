# Specification

## Summary
**Goal:** Fix the "Return to Pending" functionality for RB orders in the Ready tab, which currently fails with "Original order not found" error.

**Planned changes:**
- Update the backend `returnOrdersToPending` function to remove the dependency on looking up an existing original order record
- For fully-fulfilled RB orders (supplied qty = pending qty): create a new Pending order line in Total Orders with qty equal to supplied qty and all fields copied from the Ready order, then remove from Ready
- For partially-fulfilled RB orders (supplied qty < pending qty): find the existing Total Orders line by base order number, add supplied qty back to it and ensure status is Pending, then remove from Ready
- Update `ReadyTab.tsx` to correctly call the fixed backend return function, show a success toast on completion, and show an error toast with the specific failure message on failure

**User-visible outcome:** Users can successfully return selected RB orders from the Ready tab back to Pending without encountering the "Original order not found" error. Returned orders disappear from the Ready tab and reappear correctly in Total Orders with Pending status.
