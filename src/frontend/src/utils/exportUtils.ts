import { Order } from "@/backend";

const COLUMN_ORDER = [
  "Design",
  "Generic Name",
  "Karigar",
  "Wt",
  "Size",
  "Qty",
  "Remarks",
  "Order No",
  "Type",
  "Product",
];

function formatOrderForExport(order: Order) {
  return {
    Design: order.design,
    "Generic Name": order.genericName || "-",
    Karigar: order.karigarName || "-",
    Wt: order.weight.toFixed(2),
    Size: order.size.toFixed(2),
    Qty: Number(order.quantity),
    Remarks: order.remarks || "-",
    "Order No": order.orderNo,
    Type: order.orderType,
    Product: order.product,
  };
}

export async function exportToExcel(orders: Order[], filename: string) {
  try {
    const XLSX = await import(
      "https://cdn.sheetjs.com/xlsx-0.20.0/package/xlsx.mjs" as any
    );

    const data = orders.map(formatOrderForExport);
    const worksheet = XLSX.utils.json_to_sheet(data, { header: COLUMN_ORDER });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Orders");

    XLSX.writeFile(workbook, `${filename}_${Date.now()}.xlsx`);
  } catch (error) {
    console.error("Error exporting to Excel:", error);
    throw error;
  }
}

export async function exportToPDF(orders: Order[], filename: string) {
  try {
    const jsPDF = (await import("https://cdn.jsdelivr.net/npm/jspdf@2.5.2/+esm" as any)).default;
    const autoTable = (await import("https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.3/+esm" as any)).default;

    const doc = new jsPDF({ orientation: "landscape" });

    const tableData = orders.map((order) => [
      order.design,
      order.genericName || "-",
      order.karigarName || "-",
      order.weight.toFixed(2),
      order.size.toFixed(2),
      Number(order.quantity),
      order.remarks || "-",
      order.orderNo,
      order.orderType,
      order.product,
    ]);

    autoTable(doc, {
      head: [COLUMN_ORDER],
      body: tableData,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [212, 175, 55] },
    });

    const pdfBlob = doc.output("blob");
    const pdfUrl = URL.createObjectURL(pdfBlob);

    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    
    if (isIOS) {
      window.open(pdfUrl, "_blank");
      setTimeout(() => URL.revokeObjectURL(pdfUrl), 1000);
    } else {
      const link = document.createElement("a");
      link.href = pdfUrl;
      link.download = `${filename}_${Date.now()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(pdfUrl), 100);
    }
  } catch (error) {
    console.error("Error exporting to PDF:", error);
    throw error;
  }
}

export async function exportToJPEG(orders: Order[], filename: string) {
  try {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not get canvas context");

    const rowHeight = 30;
    const colWidths = [100, 120, 100, 60, 60, 50, 100, 100, 50, 100];
    const totalWidth = colWidths.reduce((a, b) => a + b, 0) + 40;
    const totalHeight = (orders.length + 2) * rowHeight + 40;

    canvas.width = totalWidth;
    canvas.height = totalHeight;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#d4af37";
    ctx.fillRect(20, 20, totalWidth - 40, rowHeight);

    ctx.fillStyle = "#000000";
    ctx.font = "bold 14px Arial";
    let xPos = 20;
    COLUMN_ORDER.forEach((header, i) => {
      ctx.fillText(header, xPos + 5, 20 + rowHeight / 2 + 5);
      xPos += colWidths[i];
    });

    ctx.font = "12px Arial";
    orders.forEach((order, rowIndex) => {
      const yPos = 20 + (rowIndex + 1) * rowHeight;

      if (rowIndex % 2 === 0) {
        ctx.fillStyle = "#f9f9f9";
        ctx.fillRect(20, yPos, totalWidth - 40, rowHeight);
      }

      ctx.fillStyle = "#000000";
      const rowData = [
        order.design,
        order.genericName || "-",
        order.karigarName || "-",
        order.weight.toFixed(2),
        order.size.toFixed(2),
        Number(order.quantity).toString(),
        order.remarks || "-",
        order.orderNo,
        order.orderType,
        order.product,
      ];

      xPos = 20;
      rowData.forEach((cell, i) => {
        ctx.fillText(String(cell).substring(0, 15), xPos + 5, yPos + rowHeight / 2 + 5);
        xPos += colWidths[i];
      });
    });

    canvas.toBlob((blob) => {
      if (!blob) {
        throw new Error("Failed to create JPEG blob");
      }

      const url = URL.createObjectURL(blob);
      const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

      if (isIOS) {
        window.open(url, "_blank");
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } else {
        const link = document.createElement("a");
        link.href = url;
        link.download = `${filename}_${Date.now()}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 100);
      }
    }, "image/jpeg", 0.95);
  } catch (error) {
    console.error("Error exporting to JPEG:", error);
    throw error;
  }
}

export async function exportKarigarToPDF(
  karigarName: string,
  orders: Order[],
  getDesignImage: (designCode: string) => Promise<string | null>
) {
  try {
    const jsPDF = (await import("https://cdn.jsdelivr.net/npm/jspdf@2.5.2/+esm" as any)).default;
    const autoTable = (await import("https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.3/+esm" as any)).default;

    const doc = new jsPDF({ orientation: "portrait" });

    const designGroups = new Map<string, Order[]>();
    orders.forEach((order) => {
      if (!designGroups.has(order.design)) {
        designGroups.set(order.design, []);
      }
      designGroups.get(order.design)!.push(order);
    });

    let isFirstPage = true;

    for (const [designCode, designOrders] of designGroups.entries()) {
      if (!isFirstPage) {
        doc.addPage();
      }
      isFirstPage = false;

      doc.setFontSize(16);
      doc.text(`Karigar: ${karigarName}`, 14, 15);
      doc.setFontSize(12);
      doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 22);
      doc.text(`Design: ${designCode}`, 14, 29);

      try {
        const imageUrl = await getDesignImage(designCode);
        if (imageUrl) {
          doc.addImage(imageUrl, "JPEG", 14, 35, 80, 80);
        }
      } catch (error) {
        console.error(`Failed to load image for ${designCode}:`, error);
      }

      const tableData = designOrders.map((order) => [
        order.orderNo,
        order.product,
        order.weight.toFixed(2),
        order.size.toFixed(2),
        Number(order.quantity),
        order.remarks || "-",
      ]);

      autoTable(doc, {
        startY: 120,
        head: [["Order No", "Product", "Wt", "Size", "Qty", "Remarks"]],
        body: tableData,
        styles: { fontSize: 10 },
        headStyles: { fillColor: [212, 175, 55] },
      });
    }

    const pdfBlob = doc.output("blob");
    const pdfUrl = URL.createObjectURL(pdfBlob);

    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

    if (isIOS) {
      window.open(pdfUrl, "_blank");
      setTimeout(() => URL.revokeObjectURL(pdfUrl), 1000);
    } else {
      const link = document.createElement("a");
      link.href = pdfUrl;
      link.download = `${karigarName}_${Date.now()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(pdfUrl), 100);
    }
  } catch (error) {
    console.error("Error exporting karigar PDF:", error);
    throw error;
  }
}
