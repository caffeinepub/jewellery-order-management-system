# Specification

## Summary
**Goal:** Fix RB partial supply calculation and consolidation logic in the summary card and pending list, with no UI or workflow changes.

**Planned changes:**
- When an RB order is partially marked as Ready, decrement Total Orders count by 1 and show a "1 RB Pending" indicator, reduce Total Qty by the supplied quantity, reduce Total Weight by the corresponding supplied weight, and leave Customer Order count unchanged.
- When a partially supplied RB order is returned to Pending, fully restore Total Orders, Total Qty, and Total Weight to their pre-supply values; Customer Order count remains unchanged.
- When a partially supplied RB order is returned to Pending, auto-merge all pending fragments of the same logical RB order into a single consolidated row with combined quantity and weight before any further Mark as Ready action is allowed.
- Ensure the supplied quantity popup appears only once per logical RB order, not once per split fragment.

**User-visible outcome:** After a partial RB supply, the summary card correctly reflects reduced totals with a pending indicator. Returning to Pending restores totals and consolidates split RB fragments into one row, preventing duplicate rows and extra popups.
