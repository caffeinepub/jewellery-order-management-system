# Specification

## Summary
**Goal:** Fix critical UI/UX issues across row selection, sidebar display, order ingestion, design mapping editing, and export functionality to ensure smooth operations on both desktop and mobile browsers.

**Planned changes:**
- Fix row selection highlighting across all dashboard tabs (Total Orders, Ready, Hallmark, Customer Orders, Karigars) to work when clicking anywhere on the row except the design column
- Fix sidebar visibility at 100% zoom on iPhone browser and prevent sidebar overlap at 50% zoom on all browsers
- Fix "failed to ingest orders" error after Excel upload on Ingest Orders page
- Optimize Excel upload and order saving speed on Ingest Orders page
- Display uploaded design mappings in a table on Master Designs page with inline editing for design code column
- Add Karigar dropdown in Master Designs that shows karigars extracted from the Master Design Excel file
- Implement cascading updates so modifying design codes in Master Designs automatically updates all pending orders
- Ensure all dashboard tabs display correct and up-to-date design mappings after modifications
- Fix JPEG export functionality to work on iPhone browsers
- Fix PDF export functionality to work on iPhone browsers

**User-visible outcome:** Users can reliably select rows across dashboard tabs, view the sidebar correctly on mobile devices, successfully upload and save Excel orders without errors, edit design mappings inline with karigar selection, see automatic updates cascade to all orders, and export data as JPEG/PDF on both desktop and iPhone browsers.
