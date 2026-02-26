# Specification

## Summary
**Goal:** Within the Total Orders tab, sort orders inside each design code group by overdue days in descending order (most overdue first).

**Planned changes:**
- In `TotalOrdersTab.tsx`, after grouping Pending/ReturnFromHallmark orders by design code, sort the orders within each group by the number of days elapsed since `orderDate` (descending).
- Orders with a null or missing `orderDate` are placed at the bottom of their respective design code group.

**User-visible outcome:** In the Total Orders tab, each design code group displays its orders from most overdue (oldest order date) to least overdue, with undated orders at the bottom of each group.
