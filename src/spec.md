# Specification

## Summary
**Goal:** Fix order filtering by status in tabs, make summary metrics tab-specific, and reorder table columns across all dashboard views.

**Planned changes:**
- Filter Total Orders tab to show only pending orders; remove orders from view when marked as ready
- Filter Karigar detail view to show only pending orders; remove orders when marked as ready
- Update summary cards (Total Orders, Weight, Quantity, Customer Orders) to reflect only the current tab's filtered data
- Filter Customer Orders tab to display only orders with type 'CO'
- Reorder all table columns to: Generic name, Karigar name, wt, size, qty, design code, remarks, order number, type, product

**User-visible outcome:** Users will see accurate status-filtered orders in each tab, real-time metrics that update per tab, Customer Orders showing only CO type orders, and consistently ordered columns across all dashboard views.
