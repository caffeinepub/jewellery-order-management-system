# Specification

## Summary
**Goal:** Fix critical dashboard display and filtering issues including missing Status columns, incorrect Ready tab filtering, broken design code mapping, karigar filter UI glitch, and non-functional mobile exports.

**Planned changes:**
- Add Status column to Total Orders, Ready, and Hallmark tabs showing current order status
- Fix Ready tab to display only orders with status 'Ready' instead of all orders
- Fix design code matching logic to correctly map Generic Name and Karigar Name from master designs data, handling product prefixes (CH, BR, H, etc.) that need to be stripped before matching
- Fix UI glitch in Karigar filter dropdown button text when changing from 'All Karigars' to specific karigar names
- Fix Export to JPEG functionality to work on mobile devices across all dashboard tabs
- Fix Export to PDF functionality to work on mobile devices across all dashboard tabs

**User-visible outcome:** Users can see the Status column in all tabs, the Ready tab correctly filters to show only ready orders, Generic Name and Karigar Name populate correctly for all orders (including CHTMN40038, BRNOB41367, BRDZL45035, CHDZL6001GN), the karigar filter displays selected text cleanly without visual artifacts, and JPEG/PDF exports work properly on mobile devices.
