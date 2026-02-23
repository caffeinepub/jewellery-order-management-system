# Specification

## Summary
**Goal:** Enhance the jewelry order management system with Master Design auto-fill, improved Tag Printing functionality, Hallmark workflow, and better export capabilities.

**Planned changes:**
- Automatically populate Karigar Name and Generic Name from Master Design data when Design Code matches during order ingestion or creation
- Display Generic Name alongside design groups on Tag Printing page
- Add date-wise filtering on Tag Printing page based on when order status changed to READY
- Enable selection and bulk status change of design groups from READY to HALLMARK on Tag Printing page
- Add functionality in Hallmark tab to select orders and change status to Returned, moving them back to Total Orders tab
- Add Excel export option on Hallmark page
- Fix PDF export on Karigar tab to properly download on mobile devices instead of just showing "file exported" message
- Increase image size in exported PDF and JPEG files on Karigar tab for better clarity
- Add export options for both Daily Orders and Total Orders in Karigar tab

**User-visible outcome:** Users can automatically get Karigar and Generic names filled in orders, filter Tag Printing by date, efficiently move orders from READY to HALLMARK status in bulk, mark Hallmark orders as Returned, export Hallmark orders to Excel, properly download PDFs on mobile devices, view larger images in exported documents, and export daily or total orders from the Karigar tab.
