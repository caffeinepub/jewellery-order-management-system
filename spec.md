# Specification

## Summary
**Goal:** Fix karigar resolution across all tabs so it is always derived dynamically from `order.design_code → master_design.karigar_name` at render time, never from any stored karigar field on the order record.

**Planned changes:**
- Remove all reads of `karigar_name` directly from order records in any component used for display, filtering, or grouping
- Create a shared utility/hook that resolves karigar by looking up `order.design_code` in the master design map at render time
- Fix `TotalOrdersTab.tsx` to display and filter karigar using the dynamic lookup only, so updates to Master Design are instantly reflected with no stale or duplicated values
- Fix `KarigarsTab.tsx` and `KarigarDetail.tsx` to group orders by dynamically resolved karigar, so orders automatically move to the new karigar group when Master Design is updated
- Handle the edge case where an order's `design_code` has no matching master design entry by displaying `'Unassigned'` as the karigar without crashing any tab or grouping logic

**User-visible outcome:** After updating a karigar in Master Design, all affected orders instantly reflect the new karigar across the Total Orders and Karigar tabs — with correct grouping, no duplicates, no stale values, and no missing orders. Orders with unrecognized design codes show "Unassigned" gracefully.
