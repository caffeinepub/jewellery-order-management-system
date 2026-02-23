# Specification

## Summary
**Goal:** Apply SO parsing to existing orders and fix Ready tab summary calculations.

**Planned changes:**
- Scan and re-evaluate all existing uploaded orders in storage to apply SO type classification logic
- Update orders matching SO criteria to have orderType set to SO
- Fix summary card calculations in Ready tab to match the deduplicated order list
- Ensure total weight and quantity metrics accurately reflect displayed orders

**User-visible outcome:** Existing orders are correctly classified as SO type where applicable, and the Ready tab summary cards display accurate counts and metrics matching the orders shown in the table.
