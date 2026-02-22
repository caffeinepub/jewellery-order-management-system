# Specification

## Summary
**Goal:** Fix Excel parsing to normalize design codes and automatically map Master Design data to existing orders.

**Planned changes:**
- Normalize all design codes by trimming whitespace and converting to uppercase in Excel parser
- Update Master Design Excel parsing to correctly read Column A as DESIGN CODE, Column B as Generic Name, Column C as Karigar Name
- Automatically update existing orders with matching design codes when Master Design Excel is uploaded
- Display confirmation message showing count of successfully mapped design codes after upload

**User-visible outcome:** After uploading Master Design Excel, orders with matching design codes are automatically updated with Generic Name and Karigar Name, removing them from the unmapped section on the Dashboard.
