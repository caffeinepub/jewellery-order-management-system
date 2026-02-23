# Specification

## Summary
**Goal:** Fix Ready tab order visibility issue and restore JPEG/PDF export functionality.

**Planned changes:**
- Investigate and fix why order 5038CO2600743-001 with Ready status is not appearing in the Ready tab
- Verify backend query logic correctly filters and returns all orders with Ready status
- Verify frontend ReadyTab component correctly renders all Ready orders
- Fix JPEG export functionality in OrderTable and KarigarDetail components
- Fix PDF export functionality in OrderTable and KarigarDetail components to include design images

**User-visible outcome:** All Ready status orders display correctly in the Ready tab dashboard, and users can successfully export order data as JPEG and PDF files without errors.
