# Specification

## Summary
**Goal:** Fix the Total Weight calculation to use `qty × gross weight` and ensure summary cards update correctly after partial order splits.

**Planned changes:**
- Fix weight aggregation in all tabs (Total Orders, Ready, Hallmark) to compute weight as `qty × gw` per order line instead of using raw `gw` alone
- Fix summary cards on Total Orders tab (and all other tabs) to immediately reflect updated totals (order count, qty, weight) after a partial split moves some qty to Ready
- Ensure the return path (moving a split line back from Ready to Total Orders) also recalculates summary card values correctly and symmetrically
- Invalidate React Query cache for all affected summary queries after any split, supply, or return mutation so no stale values remain
- Apply the `qty × gw` fix consistently in both backend aggregation queries and frontend SummaryCards component

**User-visible outcome:** After partially splitting an order line (e.g., moving 3 of 4 qty to Ready), the Total Orders and Ready summary cards immediately show correct totals for weight (`qty × gw`), quantity, and order count — and returning the split line restores the values proportionately.
