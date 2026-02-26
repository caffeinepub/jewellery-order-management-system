# Specification

## Summary
**Goal:** Fix order quantities failing to load and display on the dashboard.

**Planned changes:**
- Investigate and fix the backend query in `backend/main.mo` to ensure qty fields are populated and returned correctly.
- Fix React Query hooks in `useQueries.ts` to correctly map and expose qty data from the backend response.
- Ensure SummaryCards, OrderTable, TotalOrdersTab, and any other components that display qty fields render correct quantity values.
- Resolve any console errors related to undefined or null qty fields.

**User-visible outcome:** Quantity values are correctly displayed across all dashboard components (SummaryCards, OrderTable, TotalOrdersTab) after page load, with no missing or zero values when data exists.
