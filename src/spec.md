# Specification

## Summary
**Goal:** Fix mapping update failures on Unmapped Codes page and resolve Ready status transition issues for SO and CO order types.

**Planned changes:**
- Fix updateDesignMapping function in backend to successfully save mappings with generic name and Karigar
- Update EditDesignModal component to properly handle mutation responses and error states
- Fix mark as Ready functionality for SO and CO orders in the Totals tab
- Fix mark as Ready functionality for SO and CO orders in the Karigar detail pages
- Verify backend markOrdersReady function correctly handles SO and CO order types

**User-visible outcome:** Users can successfully save design mappings from the Unmapped Codes page and mark SO/CO orders as Ready from both the Totals and Karigar tabs, with proper success/error feedback.
