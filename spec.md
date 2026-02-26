# Specification

## Summary
**Goal:** Fix date parsing to always use DD/MM/YYYY format, and enhance the Total Orders tab with improved search, clickable rows, and per-group Mark Ready buttons.

**Planned changes:**
- Fix `excelParser.ts` so Order Date is always parsed as DD/MM/YYYY (not MM/DD/YYYY), correctly handling string dates like "19/02/2026", "13/02/2026", "16/02/2026", and Excel serial numbers — eliminating "No date" display for valid dates
- Extend the search bar in the Total Orders tab to filter by Order Number, Generic Name, and Design Code (case-insensitive); hide design group headers when no rows in that group match the search term
- Make entire order rows clickable in the Total Orders tab to toggle selection (not just the checkbox), with a highlighted selected state
- Add a "Mark Ready" button inside each design group that marks all currently selected rows in that group as Ready (disabled if none selected)
- When the top-level "Select All" checkbox is checked, show a bulk "Mark Ready" button at the top of the Total Orders tab to mark all selected orders across all groups as Ready at once

**User-visible outcome:** Dates from the Excel file (including 2025 and 2026 dates) display correctly in DD/MM/YYYY format instead of showing "No date". In the Total Orders tab, users can search by order number, generic name, or design code; select rows by clicking anywhere on them; and mark orders as ready per design group or in bulk from the top.
