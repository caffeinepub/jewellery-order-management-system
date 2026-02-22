# Specification

## Summary
**Goal:** Fix infinite loop causing maximum update depth exceeded error in Dashboard component.

**Planned changes:**
- Fix infinite setState loop in Dashboard component triggered by onFilteredOrdersChange callbacks
- Properly memoize callbacks in TotalOrdersTab, ReadyTab, HallmarkTab, and CustomerOrdersTab to prevent cascading re-renders
- Add correct dependency arrays and memoization (useMemo/useCallback) to Dashboard and tab components

**User-visible outcome:** Dashboard renders without errors, tabs switch smoothly, and summary cards update correctly without console errors.
