# Specification

## Summary
**Goal:** Fix Karigar names and generic names not displaying correctly in dashboard order tables.

**Planned changes:**
- Ensure karigarName and genericName fields display correctly in OrderTable component across all dashboard tabs (Total Orders, Ready Orders, Hallmark Orders, Customer Orders)
- Verify order filtering logic preserves karigarName and genericName fields when filtering by status, order type, or karigar selection
- Verify RB order splitting logic preserves karigarName and genericName in both original and newly created order records

**User-visible outcome:** All order rows in the dashboard will display the correct Karigar names and generic names without any null or missing values.
