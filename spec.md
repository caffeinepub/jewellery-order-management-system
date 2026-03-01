# Specification

## Summary
**Goal:** Fix four issues in the Jewellery Order Dashboard: child row layout in order tabs, RB partial supply visibility in Ready tab, Hallmark "Mark as Returned" flow to Total Orders, and reconciliation order type preservation.

**Planned changes:**
- Update child row layout in TotalOrdersTab (and any tab sharing the same row structure) to match IMG_6511-2: order number + Qty/Wt on the left, generic/design type label (e.g. CHAIN, IPL) in a centre column, date + ageing badge on the right, and a red × delete icon on the far right
- Remove the standalone checkbox column from child rows; make the entire child row clickable to toggle selection
- Retain the group header row's checkbox, collapse arrow, design code (clickable to open DesignImageModal), karigar name badge, order count, qty, and weight
- Fix the Ready tab so that after a partial supply on an RB order, the supplied-portion row appears in the Ready tab with status Ready while the remaining portion stays in Total Orders as Pending
- Fix the Hallmark tab's "Mark as Returned" action so that a Hallmark-status order is removed from the Hallmark tab and re-appears in the Total Orders tab with status Pending
- Fix the Reconciliation page so that each row's parsed order type (RB, SO, or CO) is correctly carried through when saving to Total Orders, instead of defaulting all rows to CO

**User-visible outcome:** Child order rows display in the correct three-column layout with click-to-select behaviour; partially supplied RB orders show up in the Ready tab; Hallmark orders marked as returned reappear in Total Orders as Pending; and orders imported from the Reconciliation page show their correct type (RB, SO, or CO) in Total Orders.
