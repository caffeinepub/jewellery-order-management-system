import { Order } from "@/backend";

// ─── helpers ────────────────────────────────────────────────────────────────

function formatDate(ts: bigint | undefined | null): string {
  if (!ts) return "—";
  const ms = Number(ts) / 1_000_000;
  return new Date(ms).toLocaleDateString("en-IN");
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 200);
}

// ─── Excel export ────────────────────────────────────────────────────────────

export async function exportToExcel(orders: Order[], filename = "orders.xlsx") {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const XLSX: any = await import("https://cdn.sheetjs.com/xlsx-0.20.1/package/xlsx.mjs" as string);
    const rows = orders.map((o) => ({
      "Order No": o.orderNo,
      "Order Type": o.orderType,
      "Design": o.design,
      "Generic Name": o.genericName ?? "",
      "Karigar": o.karigarName ?? "",
      "Weight": o.weight,
      "Qty": Number(o.quantity),
      "Status": o.status,
      "Order Date": formatDate(o.orderDate ?? undefined),
      "Ready Date": formatDate(o.readyDate ?? undefined),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Orders");
    XLSX.writeFile(wb, filename);
  } catch {
    // fallback CSV
    const headers = ["Order No","Order Type","Design","Generic Name","Karigar","Weight","Qty","Status","Order Date","Ready Date"];
    const rows = orders.map((o) =>
      [o.orderNo, o.orderType, o.design, o.genericName ?? "", o.karigarName ?? "",
       o.weight, Number(o.quantity), o.status,
       formatDate(o.orderDate ?? undefined), formatDate(o.readyDate ?? undefined)].join(",")
    );
    const csv = [headers.join(","), ...rows].join("\n");
    triggerDownload(new Blob([csv], { type: "text/csv" }), filename.replace(".xlsx", ".csv"));
  }
}

// ─── PDF export (pure client-side, no external lib needed) ──────────────────

function buildPDFBytes(orders: Order[]): ArrayBuffer {
  // Build a minimal valid PDF. Each order gets its own page (A4: 595 x 842 pt).
  const PAGE_W = 595;
  const PAGE_H = 842;
  const MARGIN = 50;

  const objects: string[] = [];
  let objCount = 0;

  function addObj(content: string): number {
    objCount++;
    objects.push(`${objCount} 0 obj\n${content}\nendobj`);
    return objCount;
  }

  // Font
  const fontId = addObj(
    `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>`
  );

  const pageContentIds: number[] = [];
  const pageIds: number[] = [];

  for (const order of orders) {
    const lines: string[] = [
      `Order No: ${order.orderNo}`,
      `Order Type: ${order.orderType}`,
      `Design Code: ${order.design}`,
      `Generic Name: ${order.genericName ?? "\u2014"}`,
      `Karigar: ${order.karigarName ?? "\u2014"}`,
      `Weight: ${order.weight} g`,
      `Quantity: ${Number(order.quantity)}`,
      `Status: ${order.status}`,
      `Order Date: ${formatDate(order.orderDate ?? undefined)}`,
      `Ready Date: ${formatDate(order.readyDate ?? undefined)}`,
      `Remarks: ${order.remarks || "\u2014"}`,
    ];

    // Escape special PDF string chars; strip non-latin chars to avoid encoding issues
    const escape = (s: string) =>
      s
        .replace(/[^\x20-\x7E]/g, "?")
        .replace(/\\/g, "\\\\")
        .replace(/\(/g, "\\(")
        .replace(/\)/g, "\\)");

    let stream = "BT\n";
    stream += `/F1 14 Tf\n`;
    stream += `${MARGIN} ${PAGE_H - MARGIN - 14} Td\n`;
    stream += `(Order Details) Tj\n`;
    stream += `/F1 11 Tf\n`;
    stream += `0 -30 Td\n`;

    for (let i = 0; i < lines.length; i++) {
      stream += `(${escape(lines[i])}) Tj\n`;
      if (i < lines.length - 1) stream += `0 -20 Td\n`;
    }
    stream += "ET\n";

    const streamLen = new TextEncoder().encode(stream).length;
    const contentId = addObj(
      `<< /Length ${streamLen} >>\nstream\n${stream}\nendstream`
    );
    pageContentIds.push(contentId);

    // Placeholder page — will be updated with Parent ref below
    const pageId = addObj(
      `<< /Type /Page /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Contents ${contentId} 0 R /Resources << /Font << /F1 ${fontId} 0 R >> >> >>`
    );
    pageIds.push(pageId);
  }

  // Pages node
  const kidsRef = pageIds.map((id) => `${id} 0 R`).join(" ");
  const pagesId = addObj(
    `<< /Type /Pages /Kids [${kidsRef}] /Count ${pageIds.length} >>`
  );

  // Update each page object to include Parent reference
  for (let i = 0; i < pageIds.length; i++) {
    const idx = pageIds[i] - 1; // objects array is 0-based
    objects[idx] =
      `${pageIds[i]} 0 obj\n` +
      `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] ` +
      `/Contents ${pageContentIds[i]} 0 R /Resources << /Font << /F1 ${fontId} 0 R >> >> >>\n` +
      `endobj`;
  }

  // Catalog
  const catalogId = addObj(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);

  // Assemble PDF body
  const header = "%PDF-1.4\n";
  let body = header;
  const offsets: number[] = [];

  for (const obj of objects) {
    offsets.push(body.length);
    body += obj + "\n";
  }

  // Cross-reference table
  const xrefOffset = body.length;
  body += "xref\n";
  body += `0 ${objCount + 1}\n`;
  body += "0000000000 65535 f \n";
  for (const off of offsets) {
    body += off.toString().padStart(10, "0") + " 00000 n \n";
  }

  body += "trailer\n";
  body += `<< /Size ${objCount + 1} /Root ${catalogId} 0 R >>\n`;
  body += "startxref\n";
  body += `${xrefOffset}\n`;
  body += "%%EOF\n";

  // Convert string to ArrayBuffer (avoids Uint8Array<ArrayBufferLike> type issue)
  const encoded = new TextEncoder().encode(body);
  return encoded.buffer.slice(0) as ArrayBuffer;
}

export function exportAllToPDF(orders: Order[], filename = "orders-all.pdf") {
  if (!orders.length) {
    alert("No orders to export.");
    return;
  }
  const buf = buildPDFBytes(orders);
  triggerDownload(new Blob([buf], { type: "application/pdf" }), filename);
}

export function exportSelectedToPDF(orders: Order[], filename = "orders-selected.pdf") {
  if (!orders.length) {
    alert("No orders selected for export.");
    return;
  }
  const buf = buildPDFBytes(orders);
  triggerDownload(new Blob([buf], { type: "application/pdf" }), filename);
}

// Legacy alias — kept so OrderTable and KarigarDetail still compile
export function exportToPDF(orders: Order[], filename = "orders.pdf") {
  exportAllToPDF(orders, filename);
}

// ─── JPEG / Image export ─────────────────────────────────────────────────────

export async function exportOrdersToImage(
  orders: Order[],
  title: string,
  filename = "export.jpg"
): Promise<void> {
  if (!orders.length) {
    alert("No orders to export.");
    return;
  }

  const COLS = ["Order No", "Design", "Generic Name", "Karigar", "Weight", "Qty", "Status", "Order Date"];
  const ROW_H = 32;
  const COL_W = 160;
  const PADDING = 16;
  const HEADER_H = 60;

  const canvas = document.createElement("canvas");
  canvas.width = COLS.length * COL_W + PADDING * 2;
  canvas.height = HEADER_H + (orders.length + 1) * ROW_H + PADDING * 2;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    alert("Canvas not supported in this browser.");
    return;
  }

  // Background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Title
  ctx.fillStyle = "#1a1a1a";
  ctx.font = "bold 20px Arial, sans-serif";
  ctx.fillText(title, PADDING, PADDING + 24);

  const tableTop = HEADER_H;

  // Header row
  ctx.fillStyle = "#f3f4f6";
  ctx.fillRect(PADDING, tableTop, COLS.length * COL_W, ROW_H);
  ctx.fillStyle = "#374151";
  ctx.font = "bold 12px Arial, sans-serif";
  COLS.forEach((col, i) => {
    ctx.fillText(col, PADDING + i * COL_W + 8, tableTop + 20);
  });

  // Data rows
  orders.forEach((order, rowIdx) => {
    const y = tableTop + (rowIdx + 1) * ROW_H;
    ctx.fillStyle = rowIdx % 2 === 0 ? "#ffffff" : "#f9fafb";
    ctx.fillRect(PADDING, y, COLS.length * COL_W, ROW_H);

    ctx.fillStyle = "#1a1a1a";
    ctx.font = "11px Arial, sans-serif";
    const cells = [
      order.orderNo,
      order.design,
      order.genericName ?? "—",
      order.karigarName ?? "—",
      String(order.weight),
      String(Number(order.quantity)),
      order.status,
      formatDate(order.orderDate ?? undefined),
    ];
    cells.forEach((cell, i) => {
      ctx.fillText(String(cell).substring(0, 18), PADDING + i * COL_W + 8, y + 20);
    });
  });

  // Grid lines
  ctx.strokeStyle = "#e5e7eb";
  ctx.lineWidth = 1;
  for (let r = 0; r <= orders.length + 1; r++) {
    const y = tableTop + r * ROW_H;
    ctx.beginPath();
    ctx.moveTo(PADDING, y);
    ctx.lineTo(PADDING + COLS.length * COL_W, y);
    ctx.stroke();
  }
  for (let c = 0; c <= COLS.length; c++) {
    const x = PADDING + c * COL_W;
    ctx.beginPath();
    ctx.moveTo(x, tableTop);
    ctx.lineTo(x, tableTop + (orders.length + 1) * ROW_H);
    ctx.stroke();
  }

  canvas.toBlob(
    (blob) => {
      if (blob) triggerDownload(blob, filename);
      else alert("Failed to generate image.");
    },
    "image/jpeg",
    0.92
  );
}

// Legacy alias used by OrderTable
export async function exportToJPEG(orders: Order[], _actor?: unknown): Promise<void> {
  await exportOrdersToImage(orders, "Orders Export", "orders.jpg");
}
