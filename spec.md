# Specification

## Summary
**Goal:** Fix five specific bugs and UI issues in the Jewellery Order Manager's Total Orders and dashboard tabs.

**Planned changes:**
- Restore summary tab value computation logic so metric values (order counts, weight, quantity, CO orders) update correctly when switching between dashboard tabs (Total Orders, Ready, Hallmark, Customer Orders, Karigars), matching v158 behaviour.
- Fix RB partial supplied rows so the supplied portion appears as a row in the Ready tab after a partial supply action.
- Within each design group in the Total Orders tab, sort rows from longest due (oldest order date) to least due (most recent), grouped by weight.
- Display design code text in bold orange color in design group header rows in the Total Orders tab.
- Remove the image icon from design group header rows in the Total Orders tab.

**User-visible outcome:** Summary cards correctly reflect the active tab's orders; RB partial supply rows appear in the Ready tab; Total Orders design groups show rows sorted oldest-to-newest due date grouped by weight; design codes are bold orange in group headers; and the image icon is no longer shown in group headers.
