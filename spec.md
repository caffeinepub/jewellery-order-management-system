# Specification

## Summary
**Goal:** Restore RB (Return/Replenishment Buy) order logic so that RB-type orders are correctly handled throughout the full order lifecycle without breaking existing CO-type order flows.

**Planned changes:**
- Ensure RB-type orders are distinguishable from CO-type orders across the application
- Display RB orders correctly in the TotalOrdersTab grouped view
- Support SuppliedQtyDialog partial-supply flow for RB orders, keeping remaining units as Pending
- Enable RB orders to transition through status stages: Pending → Ready → Hallmark → ReturnFromHallmark
- Ensure CO-type order flows and existing status transitions are unaffected

**User-visible outcome:** RB orders appear and behave correctly in the order management system — they can be viewed, partially supplied, and transitioned through all status stages without errors or regression in CO-type order handling.
