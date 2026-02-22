# Specification

## Summary
**Goal:** Fix row selection behavior in OrderTable, resolve design mapping save error, and enable PDF export on iPhone mobile browsers.

**Planned changes:**
- Modify OrderTable row click behavior: clicking anywhere on a row (except Design Code text) selects the row with multi-select support; clicking Design Code text opens Design Image Preview modal without selecting the row
- Remove eye icon button from each row; image preview only opens via Design Code text click
- Fix EditDesignModal save error by validating karigar selection, updating Master Mapping Table, and updating only Pending orders (not Ready or Hallmark)
- Fix PDF export in KarigarDetail page to open correctly on iPhone mobile browsers

**User-visible outcome:** Users can select rows by clicking anywhere except the Design Code text, open design previews by clicking Design Code, successfully save design-to-karigar mappings without errors, and export PDFs that open properly on iPhone.
