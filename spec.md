# Specification

## Summary
**Goal:** Fix three bugs in the Jewellery Order Manager: restore the karigar PDF export grouped layout, fix karigar name sync across all tabs after a master design update, and fix the desktop sidebar/content overlap.

**Planned changes:**
- Restore karigar PDF export in KarigarDetail.tsx to group orders by design code, displaying the design image above each group's order list, matching the original KASI_orders_2026-02-27.pdf layout
- Fix karigar name sync so that updating a karigar name on the Master Designs page immediately reflects in both the Total Orders tab and the Karigar tab, with query cache invalidation for orders, karigars, and design mappings
- Fix desktop layout in App.tsx and AppSidebar.tsx so the sidebar and main content area sit side by side without overlapping, while leaving the mobile layout unchanged

**User-visible outcome:** The karigar PDF export shows correctly grouped design images with orders below each; the Total Orders and Karigar tabs always show the current karigar name from Master Designs; and on desktop, the sidebar no longer overlaps the main content area.
