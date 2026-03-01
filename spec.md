# Specification

## Summary
**Goal:** Add grouped display layout with expandable rows, ageing badges, image modal, and search/filter controls to the Total Orders, Ready, and Hallmark tabs.

**Planned changes:**
- In `TotalOrdersTab.tsx`, group pending orders by design code with a collapsible group header row showing design code (clickable), order type badge (RB/CO/SO), karigar name, sub-order count, total qty, and total weight
- Add a chevron toggle to expand/collapse sub-orders within each group
- Sub-order rows display order number, qty, weight, generic name, order date, and an ageing badge (green ≤14d, amber 15–29d, red ≥30d)
- Group-level checkbox selects/deselects all sub-orders; individual sub-order checkboxes also work independently
- Apply the same grouped layout (expandable sub-orders, ageing badges, karigar name, order type badge) to `ReadyTab.tsx` and `HallmarkTab.tsx`, preserving their existing action buttons
- Clicking a design code in any group header opens the existing `DesignImageModal` for that design code
- Add a search bar and two filter dropdowns (order type: All Types/RB/CO/SO; karigar: All Karigars/list) above the orders table in Total Orders, Ready, and Hallmark tabs
- Search filters by design code, order number, or generic name (case-insensitive, partial match); filters combine with AND logic
- Filter state resets when switching tabs
- Layout matches the screenshot: search bar on the left, two pill/capsule dropdowns on the right

**User-visible outcome:** Users can browse orders grouped by design code across the Total Orders, Ready, and Hallmark tabs, expand groups to see sub-orders with colour-coded ageing indicators, click a design code to view its image, and quickly filter/search orders by type, karigar, or name.
