# Specification

## Summary
**Goal:** Fix the Excel parser to correctly read karigar mapping data from the uploaded Excel file and eliminate all 561 validation errors.

**Planned changes:**
- Update the Excel parser in frontend/src/utils/excelParser.ts to correctly identify and read data from columns A (Design Code), B (Generic Name), and C (Karigar Name) with exact header matching
- Add enhanced error logging to show actual cell values being parsed and indicate header matching status
- Ensure the parser handles both .xls and .xlsx file formats correctly

**User-visible outcome:** Users can successfully upload the karigar mapping Excel file without encountering the 561 "required" field validation errors, with all data correctly parsed from the three columns.
