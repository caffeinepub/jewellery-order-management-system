import { Order } from "../backend";
import { getQuantityAsNumber } from "./orderNormalizer";

function getOrderTypeLabel(orderType: string): string {
  return orderType;
}

function getStatusLabel(status: string): string {
  return status;
}

export async function exportOrdersToExcel(
  orders: Order[],
  filename: string = "orders"
): Promise<void> {
  try {
    const XLSX = await import("https://cdn.sheetjs.com/xlsx-0.20.1/package/xlsx.mjs" as string) as any;

    const data = orders.map((order) => ({
      "Order No": order.orderNo,
      "Type": getOrderTypeLabel(order.orderType as string),
      "Design": order.design,
      "Product": order.product,
      "Qty": getQuantityAsNumber(order.quantity),
      "Weight": order.weight?.toFixed(2) ?? "",
      "Size": order.size > 0 ? order.size : "",
      "Generic Name": order.genericName ?? "",
      "Karigar": order.karigarName ?? "",
      "Status": getStatusLabel(order.status as string),
      "Remarks": order.remarks ?? "",
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Orders");

    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([wbout], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error("Export failed:", err);
    throw err;
  }
}

export async function exportOrdersToPDF(
  orders: Order[],
  title: string = "Orders",
  filename: string = "orders"
): Promise<void> {
  try {
    const rows = orders
      .map(
        (order) =>
          `<tr>
            <td>${order.orderNo}</td>
            <td>${order.orderType}</td>
            <td>${order.design}</td>
            <td>${order.product}</td>
            <td>${getQuantityAsNumber(order.quantity)}</td>
            <td>${order.weight?.toFixed(2) ?? ""}</td>
            <td>${order.size > 0 ? order.size : ""}</td>
            <td>${order.genericName ?? ""}</td>
            <td>${order.karigarName ?? ""}</td>
            <td>${order.status}</td>
            <td>${order.remarks ?? ""}</td>
          </tr>`
      )
      .join("");

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: Arial, sans-serif; font-size: 10px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ccc; padding: 4px 6px; text-align: left; }
            th { background: #f5f5f5; font-weight: bold; }
            h1 { font-size: 14px; margin-bottom: 8px; }
          </style>
        </head>
        <body>
          <h1>${title}</h1>
          <table>
            <thead>
              <tr>
                <th>Order No</th><th>Type</th><th>Design</th><th>Product</th>
                <th>Qty</th><th>Weight</th><th>Size</th><th>Generic</th>
                <th>Karigar</th><th>Status</th><th>Remarks</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </body>
      </html>
    `;

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      throw new Error("Could not open print window. Please allow popups.");
    }
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  } catch (err) {
    console.error("PDF export failed:", err);
    throw err;
  }
}

export async function exportKarigarOrdersToExcel(
  karigarName: string,
  orders: Order[],
  filename?: string
): Promise<void> {
  return exportOrdersToExcel(orders, filename ?? `karigar_${karigarName}`);
}

export async function exportKarigarOrdersToPDF(
  karigarName: string,
  orders: Order[],
  title?: string,
  filename?: string
): Promise<void> {
  return exportOrdersToPDF(
    orders,
    title ?? `${karigarName} - Pending Orders`,
    filename ?? `karigar_${karigarName}`
  );
}

export async function exportKarigarOrdersToJPEG(
  karigarName: string,
  orders: Order[],
  filename?: string
): Promise<void> {
  try {
    const canvas = document.createElement("canvas");
    const padding = 40;
    const rowHeight = 28;
    const headerHeight = 80;
    const colWidths = [120, 60, 120, 160, 60, 70, 60, 160, 100];
    const totalWidth =
      colWidths.reduce((a, b) => a + b, 0) + padding * 2;
    const totalHeight =
      headerHeight + (orders.length + 1) * rowHeight + padding * 2;

    canvas.width = totalWidth;
    canvas.height = totalHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not get canvas context");

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, totalWidth, totalHeight);

    ctx.fillStyle = "#1a1a1a";
    ctx.font = "bold 20px Arial";
    ctx.fillText(`${karigarName} - Pending Orders`, padding, padding + 20);
    ctx.font = "12px Arial";
    ctx.fillStyle = "#666666";
    ctx.fillText(
      `Generated: ${new Date().toLocaleDateString()}  |  Total Orders: ${orders.length}  |  Total Qty: ${orders.reduce((sum, o) => sum + getQuantityAsNumber(o.quantity), 0)}`,
      padding,
      padding + 44
    );

    const headers = [
      "Order No",
      "Type",
      "Design",
      "Product",
      "Qty",
      "Weight",
      "Size",
      "Generic Name",
      "Karigar",
    ];

    let x = padding;
    const headerY = headerHeight + padding;

    ctx.fillStyle = "#f5f0e8";
    ctx.fillRect(padding, headerY, totalWidth - padding * 2, rowHeight);

    ctx.fillStyle = "#1a1a1a";
    ctx.font = "bold 11px Arial";
    headers.forEach((header, i) => {
      ctx.fillText(header, x + 4, headerY + 18);
      x += colWidths[i];
    });

    orders.forEach((order, rowIdx) => {
      const y = headerY + (rowIdx + 1) * rowHeight;
      if (rowIdx % 2 === 0) {
        ctx.fillStyle = "#fafafa";
        ctx.fillRect(padding, y, totalWidth - padding * 2, rowHeight);
      }

      ctx.fillStyle = "#333333";
      ctx.font = "10px Arial";
      const cells = [
        order.orderNo,
        order.orderType as string,
        order.design,
        order.product,
        String(getQuantityAsNumber(order.quantity)),
        order.weight?.toFixed(2) ?? "",
        order.size > 0 ? String(order.size) : "",
        order.genericName ?? "",
        order.karigarName ?? "",
      ];

      x = padding;
      cells.forEach((cell, i) => {
        const maxWidth = colWidths[i] - 8;
        let text = cell;
        while (ctx.measureText(text).width > maxWidth && text.length > 0) {
          text = text.slice(0, -1);
        }
        if (text !== cell) text += "…";
        ctx.fillText(text, x + 4, y + 18);
        x += colWidths[i];
      });

      ctx.strokeStyle = "#e5e5e5";
      ctx.beginPath();
      ctx.moveTo(padding, y + rowHeight);
      ctx.lineTo(totalWidth - padding, y + rowHeight);
      ctx.stroke();
    });

    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `${filename ?? `karigar_${karigarName}`}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch (err) {
    console.error("JPEG export failed:", err);
    throw err;
  }
}
