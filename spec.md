# Specification

## Summary
**Goal:** Add a partial supply popup dialog and split/merge logic for RB-type orders in the Total Orders tab, so users can supply partial quantities and have the system correctly track pending vs. ready portions.

**Planned changes:**
- When one or more RB orders are selected and "Mark as Ready" is clicked, display a `SuppliedQtyDialog` popup that steps through each RB order one at a time, showing order number, design code, total ordered quantity, and an input for supplied quantity (validated > 0 and ≤ total ordered qty)
- Non-RB orders selected alongside RB orders bypass the dialog and are marked ready directly
- If supplied quantity equals the full ordered quantity, move the entire order to the Ready tab as a single row and remove it from Total Orders
- If supplied quantity is less than the full ordered quantity (partial supply), move the supplied portion to the Ready tab and keep the remaining portion in Total Orders with reduced qty and proportional weight; both rows are linked by the original order ID; Total Orders summary shows a bracket indicator (e.g. "1 pending RB line")
- When the remaining pending portion of a split RB order is subsequently marked as ready, merge both portions into a single row in the Ready tab showing full combined qty and weight, and fully remove the order from Total Orders (bracket indicator disappears)
- When a ready portion of a split RB order is returned to pending and a pending portion already exists in Total Orders, merge both back into one restored row in Total Orders with original full qty and weight (bracket indicator disappears)
- When a fully supplied (non-split) RB order is returned from the Ready tab, re-add it to Total Orders as a normal single row with no merging logic
- Ensure all summary cards (order count, total qty, total weight) in both tabs accurately reflect split/merge state at all times, treating a split RB order as one logical order with no double-counting

**User-visible outcome:** Users can partially supply RB orders, with the system automatically splitting, tracking, merging, and restoring order portions across the Total Orders and Ready tabs while keeping all summary counts and weights accurate.
