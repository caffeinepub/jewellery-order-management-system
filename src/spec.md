# Specification

## Summary
**Goal:** Improve dashboard usability with column reordering, row highlighting, enhanced search, fix RB quantity validation, add ready order deletion, and redesign tag printing with grouped design view.

**Planned changes:**
- Reorder dashboard columns to: Generic name, Karigar name, design, wt, size, Qty, type, remarks, status
- Add red highlight to selected rows in the dashboard table
- Add search by design code and order number in Total Orders, Ready, and Hallmark tabs
- Fix RB type orders to allow entering full quantity; split orders on partial supply (Ready + Pending)
- Add delete button in Ready tab to move orders back to Total Orders with Pending status
- Remove all existing Tag Printing logic and integrations
- Redesign Tag Printing page to group READY orders by design code with "Copy for MPN" button that copies order numbers in comma-separated format

**User-visible outcome:** Users can view dashboard columns in their preferred order with highlighted selections, search orders more effectively across tabs, supply full quantities for RB orders, reverse ready orders back to pending, and efficiently copy order numbers grouped by design for tag printing.
