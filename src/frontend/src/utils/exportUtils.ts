import type { Order } from "@/backend";

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
    const XLSX: any = await import(
      "https://cdn.sheetjs.com/xlsx-0.20.1/package/xlsx.mjs" as string
    );
    const rows = orders.map((o) => ({
      "Order No": o.orderNo,
      "Order Type": o.orderType,
      Design: o.design,
      "Generic Name": o.genericName ?? "",
      Karigar: o.karigarName ?? "",
      Weight: o.weight,
      Qty: Number(o.quantity),
      Status: o.status,
      "Order Date": formatDate(o.orderDate ?? undefined),
      "Ready Date": formatDate(o.readyDate ?? undefined),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Orders");
    XLSX.writeFile(wb, filename);
  } catch {
    // fallback CSV
    const headers = [
      "Order No",
      "Order Type",
      "Design",
      "Generic Name",
      "Karigar",
      "Weight",
      "Qty",
      "Status",
      "Order Date",
      "Ready Date",
    ];
    const rows = orders.map((o) =>
      [
        o.orderNo,
        o.orderType,
        o.design,
        o.genericName ?? "",
        o.karigarName ?? "",
        o.weight,
        Number(o.quantity),
        o.status,
        formatDate(o.orderDate ?? undefined),
        formatDate(o.readyDate ?? undefined),
      ].join(","),
    );
    const csv = [headers.join(","), ...rows].join("\n");
    triggerDownload(
      new Blob([csv], { type: "text/csv" }),
      filename.replace(".xlsx", ".csv"),
    );
  }
}

// ─── PDF export (pure client-side, no external lib needed) ──────────────────

function buildPDFBytes(orders: Order[], tabName = ""): ArrayBuffer {
  // Build a minimal valid PDF with proper table layout. A4: 595 x 842 pt.
  const PAGE_W = 595;
  const PAGE_H = 842;
  const MARGIN = 40;
  const today = new Date().toLocaleDateString("en-IN");

  const objects: string[] = [];
  let objCount = 0;

  function addObj(content: string): number {
    objCount++;
    objects.push(`${objCount} 0 obj\n${content}\nendobj`);
    return objCount;
  }

  // Fonts: bold + regular
  const boldFontId = addObj(
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
  );
  const fontId = addObj(
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
  );

  const pageContentIds: number[] = [];
  const pageIds: number[] = [];

  // Escape special PDF string chars; strip non-latin chars to avoid encoding issues
  const escapePdf = (s: string) =>
    s
      .replace(/[^\x20-\x7E]/g, "?")
      .replace(/\\/g, "\\\\")
      .replace(/\(/g, "\\(")
      .replace(/\)/g, "\\)");

  // Table columns: Order No, Karigar, Size, Qty, Unit Wt, Total Wt, Type
  const COL_W = [145, 90, 50, 40, 60, 65, 50];
  const HEADERS = [
    "Order No",
    "Karigar",
    "Size",
    "Qty",
    "Unit Wt",
    "Total Wt",
    "Type",
  ];
  const TABLE_W = COL_W.reduce((s, w) => s + w, 0); // 500 pts
  const ROW_H = 18;
  const HEADER_ROWS_H = 18; // table header row height

  // Group all orders onto pages — up to ~36 rows per page
  const ROWS_PER_PAGE = 36;
  const pages: Order[][] = [];
  for (let i = 0; i < orders.length; i += ROWS_PER_PAGE) {
    pages.push(orders.slice(i, i + ROWS_PER_PAGE));
  }
  if (pages.length === 0) pages.push([]);

  for (let pi = 0; pi < pages.length; pi++) {
    const pageOrders = pages[pi];
    let stream = "";
    let y = PAGE_H - MARGIN;

    // ── Brand header band ──
    stream += `q\n0.102 0.102 0.18 rg\n0 ${y - 55} m\n${PAGE_W} ${y - 55} l\n${PAGE_W} ${y} l\n0 ${y} l\nf\nQ\n`;
    y -= 18;
    stream += `BT\n/F2 16 Tf\n1 0.604 0.086 rg\n${MARGIN} ${y} Td\n(SHREE I JEWELLERY) Tj\nET\n`;
    y -= 15;
    const subtitle = escapePdf(tabName ? `${tabName}  |  ${today}` : today);
    stream += `BT\n/F1 9 Tf\n0.9 0.9 0.9 rg\n${MARGIN} ${y} Td\n(${subtitle}) Tj\nET\n`;
    y -= 22;

    // ── Horizontal rule ──
    stream += `q\n0.8 0.8 0.8 RG\n0.5 w\n${MARGIN} ${y} m\n${PAGE_W - MARGIN} ${y} l\nS\nQ\n`;
    y -= 12;

    // ── Table header row ──
    stream += `q\n0.22 0.22 0.22 rg\n${MARGIN} ${y - HEADER_ROWS_H} m\n${MARGIN + TABLE_W} ${y - HEADER_ROWS_H} l\n${MARGIN + TABLE_W} ${y} l\n${MARGIN} ${y} l\nf\nQ\n`;
    let hx = MARGIN + 4;
    for (let h = 0; h < HEADERS.length; h++) {
      stream += `BT\n/F2 8 Tf\n1 1 1 rg\n${hx} ${y - 13} Td\n(${HEADERS[h]}) Tj\nET\n`;
      hx += COL_W[h];
    }
    y -= HEADER_ROWS_H + 2;

    // ── Data rows ──
    for (let ri = 0; ri < pageOrders.length; ri++) {
      const o = pageOrders[ri];
      const rowBg = ri % 2 === 0 ? "1 1 1" : "0.96 0.96 0.96";
      stream += `q\n${rowBg} rg\n${MARGIN} ${y - ROW_H} m\n${MARGIN + TABLE_W} ${y - ROW_H} l\n${MARGIN + TABLE_W} ${y} l\n${MARGIN} ${y} l\nf\nQ\n`;
      const cells = [
        escapePdf(String(o.orderNo).substring(0, 22)),
        escapePdf(String(o.karigarName ?? "—").substring(0, 14)),
        escapePdf(o.size ? String(o.size) : "—"),
        escapePdf(String(Number(o.quantity))),
        escapePdf(`${o.weight}g`),
        escapePdf(`${(o.weight * Number(o.quantity)).toFixed(1)}g`),
        escapePdf(String(o.orderType)),
      ];
      let rx = MARGIN + 4;
      for (let ci = 0; ci < cells.length; ci++) {
        stream += `BT\n/F1 7.5 Tf\n0.1 0.1 0.1 rg\n${rx} ${y - 13} Td\n(${cells[ci]}) Tj\nET\n`;
        rx += COL_W[ci];
      }
      y -= ROW_H;
    }

    // ── Page number ──
    stream += `BT\n/F1 8 Tf\n0.5 0.5 0.5 rg\n${PAGE_W / 2 - 20} ${MARGIN - 10} Td\n(Page ${pi + 1} of ${pages.length}) Tj\nET\n`;

    const streamLen = new TextEncoder().encode(stream).length;
    const contentId = addObj(
      `<< /Length ${streamLen} >>\nstream\n${stream}\nendstream`,
    );
    pageContentIds.push(contentId);

    const pageId = addObj(
      `<< /Type /Page /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Contents ${contentId} 0 R /Resources << /Font << /F1 ${fontId} 0 R /F2 ${boldFontId} 0 R >> >> >>`,
    );
    pageIds.push(pageId);
  }

  // Pages node
  const kidsRef = pageIds.map((id) => `${id} 0 R`).join(" ");
  const pagesId = addObj(
    `<< /Type /Pages /Kids [${kidsRef}] /Count ${pageIds.length} >>`,
  );

  // Update each page object to include Parent reference
  for (let i = 0; i < pageIds.length; i++) {
    const idx = pageIds[i] - 1;
    objects[idx] =
      `${pageIds[i]} 0 obj\n<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Contents ${pageContentIds[i]} 0 R /Resources << /Font << /F1 ${fontId} 0 R /F2 ${boldFontId} 0 R >> >> >>\nendobj`;
  }

  // Catalog
  const catalogId = addObj(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);

  // Assemble PDF body
  const header = "%PDF-1.4\n";
  let body = header;
  const offsets: number[] = [];

  for (const obj of objects) {
    offsets.push(body.length);
    body += `${obj}\n`;
  }

  // Cross-reference table
  const xrefOffset = body.length;
  body += "xref\n";
  body += `0 ${objCount + 1}\n`;
  body += "0000000000 65535 f \n";
  for (const off of offsets) {
    body += `${off.toString().padStart(10, "0")} 00000 n \n`;
  }

  body += "trailer\n";
  body += `<< /Size ${objCount + 1} /Root ${catalogId} 0 R >>\n`;
  body += "startxref\n";
  body += `${xrefOffset}\n`;
  body += "%%EOF\n";

  // Convert string to ArrayBuffer
  const encoded = new TextEncoder().encode(body);
  return encoded.buffer.slice(0) as ArrayBuffer;
}

export function exportAllToPDF(
  orders: Order[],
  filename = "orders-all.pdf",
  tabName = "",
) {
  if (!orders.length) {
    alert("No orders to export.");
    return;
  }
  const buf = buildPDFBytes(orders, tabName);
  triggerDownload(new Blob([buf], { type: "application/pdf" }), filename);
}

export function exportSelectedToPDF(
  orders: Order[],
  filename = "orders-selected.pdf",
  tabName = "",
) {
  if (!orders.length) {
    alert("No orders selected for export.");
    return;
  }
  const buf = buildPDFBytes(orders, tabName);
  triggerDownload(new Blob([buf], { type: "application/pdf" }), filename);
}

// Legacy alias — kept so OrderTable and KarigarDetail still compile
export function exportToPDF(orders: Order[], filename = "orders.pdf") {
  exportAllToPDF(orders, filename);
}

// ─── JPEG / Image export ─────────────────────────────────────────────────────

export async function exportOrdersToImage(
  orders: Order[],
  tabName: string,
  filename = "export.jpg",
): Promise<void> {
  if (!orders.length) {
    alert("No orders to export.");
    return;
  }

  const today = new Date().toLocaleDateString("en-IN");

  const COLS = [
    "Order No",
    "Design",
    "Generic Name",
    "Karigar",
    "Wt",
    "Size",
    "Qty",
    "Status",
    "Order Date",
  ];
  const COL_WIDTHS = [160, 110, 130, 120, 60, 60, 50, 80, 90];
  const totalTableWidth = COL_WIDTHS.reduce((s, w) => s + w, 0);
  const ROW_H = 30;
  const PADDING = 20;
  const HEADER_H = 80; // taller header for branding

  const canvas = document.createElement("canvas");
  canvas.width = totalTableWidth + PADDING * 2;
  canvas.height = HEADER_H + (orders.length + 1) * ROW_H + PADDING * 2;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    alert("Canvas not supported in this browser.");
    return;
  }

  // Background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Brand header band
  ctx.fillStyle = "#1a1a2e";
  ctx.fillRect(0, 0, canvas.width, HEADER_H - 10);

  // "SHREE I JEWELLERY" title
  ctx.fillStyle = "#f97316";
  ctx.font = "bold 22px Arial, sans-serif";
  ctx.fillText("SHREE I JEWELLERY", PADDING, 34);

  // Tab name + date
  ctx.fillStyle = "#e5e7eb";
  ctx.font = "13px Arial, sans-serif";
  ctx.fillText(`${tabName}  |  ${today}`, PADDING, 56);

  const tableTop = HEADER_H;

  // Column header row
  ctx.fillStyle = "#f3f4f6";
  ctx.fillRect(PADDING, tableTop, totalTableWidth, ROW_H);
  ctx.fillStyle = "#374151";
  ctx.font = "bold 11px Arial, sans-serif";
  let xPos = PADDING;
  COLS.forEach((col, i) => {
    ctx.fillText(col, xPos + 6, tableTop + 19);
    xPos += COL_WIDTHS[i];
  });

  // Data rows
  orders.forEach((order, rowIdx) => {
    const y = tableTop + (rowIdx + 1) * ROW_H;
    ctx.fillStyle = rowIdx % 2 === 0 ? "#ffffff" : "#f9fafb";
    ctx.fillRect(PADDING, y, totalTableWidth, ROW_H);

    ctx.fillStyle = "#1a1a1a";
    ctx.font = "11px Arial, sans-serif";
    const cells = [
      order.orderNo,
      order.design,
      order.genericName ?? "—",
      order.karigarName ?? "—",
      `${order.weight}g`,
      order.size ? String(order.size) : "—",
      String(Number(order.quantity)),
      order.status,
      formatDate(order.orderDate ?? undefined),
    ];
    let cx = PADDING;
    cells.forEach((cell, i) => {
      ctx.fillText(String(cell).substring(0, 20), cx + 6, y + 19);
      cx += COL_WIDTHS[i];
    });
  });

  // Grid lines
  ctx.strokeStyle = "#e5e7eb";
  ctx.lineWidth = 1;
  for (let r = 0; r <= orders.length + 1; r++) {
    const y = tableTop + r * ROW_H;
    ctx.beginPath();
    ctx.moveTo(PADDING, y);
    ctx.lineTo(PADDING + totalTableWidth, y);
    ctx.stroke();
  }
  let lx = PADDING;
  for (let c = 0; c <= COLS.length; c++) {
    ctx.beginPath();
    ctx.moveTo(lx, tableTop);
    ctx.lineTo(lx, tableTop + (orders.length + 1) * ROW_H);
    ctx.stroke();
    if (c < COL_WIDTHS.length) lx += COL_WIDTHS[c];
  }

  canvas.toBlob(
    (blob) => {
      if (blob) triggerDownload(blob, filename);
      else alert("Failed to generate image.");
    },
    "image/jpeg",
    0.92,
  );
}

// Legacy alias used by OrderTable
export async function exportToJPEG(
  orders: Order[],
  _actor?: unknown,
): Promise<void> {
  await exportOrdersToImage(orders, "Orders Export", "orders.jpg");
}

// ─── Karigar grouped export (by Design Code) ─────────────────────────────────

/**
 * Exports karigar orders grouped by design code.
 * Each design code gets its own page (PDF) or section (JPEG).
 * Shows: Design Code, Generic Name, image (fetched via URL), order lines table.
 * @param designImageUrls - Optional map of designCode -> image URL string
 */
export async function exportKarigarByDesignGrouped(
  orders: Order[],
  karigarName: string,
  filename: string,
  format: "pdf" | "jpeg",
  designImageUrls?: Map<string, string>,
): Promise<void> {
  if (!orders.length) {
    alert("No orders to export.");
    return;
  }

  const today = new Date().toLocaleDateString("en-IN");

  // Group orders by design code
  const groupMap = new Map<string, Order[]>();
  for (const o of orders) {
    if (!groupMap.has(o.design)) groupMap.set(o.design, []);
    groupMap.get(o.design)!.push(o);
  }
  const groups = Array.from(groupMap.entries());

  if (format === "pdf") {
    // ── PDF path ──────────────────────────────────────────────────────────────
    const PAGE_W = 595;
    const PAGE_H = 842;
    const MARGIN = 40;
    const escapePdf = (s: string) =>
      s
        .replace(/[^\x20-\x7E]/g, "?")
        .replace(/\\/g, "\\\\")
        .replace(/\(/g, "\\(")
        .replace(/\)/g, "\\)");

    const objects: string[] = [];
    let objCount = 0;
    function addObj(content: string): number {
      objCount++;
      objects.push(`${objCount} 0 obj\n${content}\nendobj`);
      return objCount;
    }

    const boldFontId = addObj(
      "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
    );
    const fontId = addObj(
      "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    );

    const pageContentIds: number[] = [];
    const pageIds: number[] = [];

    for (const [design, groupOrders] of groups) {
      const genericName = groupOrders[0]?.genericName ?? "—";
      const totalQty = groupOrders.reduce((s, o) => s + Number(o.quantity), 0);
      const totalWt = groupOrders.reduce(
        (s, o) => s + o.weight * Number(o.quantity),
        0,
      );

      let y = PAGE_H - MARGIN;
      let stream = "";

      // Header band background
      stream += `q\n0.102 0.102 0.18 rg\n0 ${y - 60} m\n${PAGE_W} ${y - 60} l\n${PAGE_W} ${y} l\n0 ${y} l\nf\nQ\n`;
      y -= 20;

      // "SHREE I JEWELLERY" in brand orange
      stream += `BT\n/F2 16 Tf\n1 0.604 0.086 rg\n${MARGIN} ${y} Td\n(SHREE I JEWELLERY) Tj\nET\n`;
      y -= 16;
      stream += `BT\n/F1 9 Tf\n0.9 0.9 0.9 rg\n${MARGIN} ${y} Td\n(Karigar: ${escapePdf(karigarName)}  |  ${escapePdf(today)}) Tj\nET\n`;
      y -= 24;

      // Design header block (green)
      stream += `q\n0.133 0.545 0.133 rg\n${MARGIN} ${y - 28} m\n${PAGE_W - MARGIN} ${y - 28} l\n${PAGE_W - MARGIN} ${y + 4} l\n${MARGIN} ${y + 4} l\nf\nQ\n`;
      stream += `BT\n/F2 13 Tf\n1 1 1 rg\n${MARGIN + 8} ${y - 16} Td\n(Design: ${escapePdf(design)}) Tj\nET\n`;
      y -= 36;

      // Generic name
      stream += `BT\n/F2 11 Tf\n0.2 0.2 0.2 rg\n${MARGIN} ${y} Td\n(${escapePdf(genericName)}) Tj\nET\n`;
      y -= 14;

      // Summary line
      stream += `BT\n/F1 9 Tf\n0.4 0.4 0.4 rg\n${MARGIN} ${y} Td\n(${groupOrders.length} orders  |  Qty: ${totalQty}  |  Total Wt: ${totalWt.toFixed(2)}g) Tj\nET\n`;
      y -= 20;

      // Image placeholder box (300 x 180)
      const imgX = (PAGE_W - 300) / 2;
      stream += `q\n0.93 0.93 0.93 rg\n${imgX} ${y - 180} m\n${imgX + 300} ${y - 180} l\n${imgX + 300} ${y} l\n${imgX} ${y} l\nf\nQ\n`;
      stream += `q\n0.7 0.7 0.7 RG\n1 w\n${imgX} ${y - 180} m\n${imgX + 300} ${y - 180} l\n${imgX + 300} ${y} l\n${imgX} ${y} l\nh\nS\nQ\n`;
      stream += `BT\n/F1 10 Tf\n0.5 0.5 0.5 rg\n${imgX + 100} ${y - 96} Td\n(Design Image: ${escapePdf(design)}) Tj\nET\n`;
      y -= 200;

      // Table header
      const COL = [140, 80, 60, 50, 70, 70, 60];
      const HEADERS = [
        "Order No",
        "Karigar",
        "Size",
        "Qty",
        "Unit Wt",
        "Total Wt",
        "Type",
      ];
      stream += `q\n0.22 0.22 0.22 rg\n${MARGIN} ${y - 18} m\n${PAGE_W - MARGIN} ${y - 18} l\n${PAGE_W - MARGIN} ${y + 2} l\n${MARGIN} ${y + 2} l\nf\nQ\n`;
      let hx = MARGIN + 6;
      for (let h = 0; h < HEADERS.length; h++) {
        stream += `BT\n/F2 8 Tf\n1 1 1 rg\n${hx} ${y - 12} Td\n(${HEADERS[h]}) Tj\nET\n`;
        hx += COL[h];
      }
      y -= 20;

      // Order rows
      for (let ri = 0; ri < groupOrders.length; ri++) {
        const o = groupOrders[ri];
        if (y < MARGIN + 20) break; // skip if out of page
        const rowBg = ri % 2 === 0 ? "1 1 1" : "0.96 0.96 0.96";
        stream += `q\n${rowBg} rg\n${MARGIN} ${y - 16} m\n${PAGE_W - MARGIN} ${y - 16} l\n${PAGE_W - MARGIN} ${y + 2} l\n${MARGIN} ${y + 2} l\nf\nQ\n`;
        const cells = [
          o.orderNo,
          o.karigarName ?? "—",
          o.size ? String(o.size) : "—",
          String(Number(o.quantity)),
          `${o.weight}g`,
          `${(o.weight * Number(o.quantity)).toFixed(1)}g`,
          o.orderType,
        ];
        let rx = MARGIN + 6;
        stream += "BT\n/F1 8 Tf\n0.1 0.1 0.1 rg\n";
        for (let ci = 0; ci < cells.length; ci++) {
          stream += `${rx} ${y - 10} Td\n(${escapePdf(String(cells[ci]).substring(0, 16))}) Tj\n`;
          rx += COL[ci];
          if (ci < cells.length - 1)
            stream += `${-rx + MARGIN + 6 + COL.slice(0, ci + 1).reduce((a, b) => a + b, 0)} 0 Td\n`;
        }
        stream += "ET\n";
        y -= 18;
      }

      const streamLen = new TextEncoder().encode(stream).length;
      const contentId = addObj(
        `<< /Length ${streamLen} >>\nstream\n${stream}\nendstream`,
      );
      pageContentIds.push(contentId);
      const pageId = addObj(
        `<< /Type /Page /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Contents ${contentId} 0 R /Resources << /Font << /F1 ${fontId} 0 R /F2 ${boldFontId} 0 R >> >> >>`,
      );
      pageIds.push(pageId);
    }

    const kidsRef = pageIds.map((id) => `${id} 0 R`).join(" ");
    const pagesId = addObj(
      `<< /Type /Pages /Kids [${kidsRef}] /Count ${pageIds.length} >>`,
    );
    for (let i = 0; i < pageIds.length; i++) {
      const idx = pageIds[i] - 1;
      objects[idx] =
        `${pageIds[i]} 0 obj\n<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Contents ${pageContentIds[i]} 0 R /Resources << /Font << /F1 ${fontId} 0 R /F2 ${boldFontId} 0 R >> >> >>\nendobj`;
    }
    const catalogId = addObj(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);

    let body = "%PDF-1.4\n";
    const offsets: number[] = [];
    for (const obj of objects) {
      offsets.push(body.length);
      body += `${obj}\n`;
    }
    const xrefOffset = body.length;
    body += "xref\n";
    body += `0 ${objCount + 1}\n`;
    body += "0000000000 65535 f \n";
    for (const off of offsets) {
      body += `${off.toString().padStart(10, "0")} 00000 n \n`;
    }
    body += "trailer\n";
    body += `<< /Size ${objCount + 1} /Root ${catalogId} 0 R >>\n`;
    body += "startxref\n";
    body += `${xrefOffset}\n`;
    body += "%%EOF\n";

    const encoded = new TextEncoder().encode(body);
    triggerDownload(
      new Blob([encoded.buffer.slice(0) as ArrayBuffer], {
        type: "application/pdf",
      }),
      filename,
    );
  } else {
    // ── JPEG path ─────────────────────────────────────────────────────────────
    const SECTION_PADDING = 20;
    const IMG_H = 160;
    const ROW_H = 26;
    const TABLE_HEADER_H = 24;
    const GROUP_HEADER_H = 80;
    const PAGE_W = 860;

    // Compute total canvas height
    let totalH = 80; // top brand header
    for (const [, groupOrders] of groups) {
      totalH +=
        GROUP_HEADER_H +
        IMG_H +
        TABLE_HEADER_H +
        groupOrders.length * ROW_H +
        SECTION_PADDING;
    }
    totalH += 20; // bottom padding

    const canvas = document.createElement("canvas");
    canvas.width = PAGE_W;
    canvas.height = totalH;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      alert("Canvas not supported.");
      return;
    }

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, PAGE_W, totalH);

    // Brand header
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, PAGE_W, 70);
    ctx.fillStyle = "#f97316";
    ctx.font = "bold 22px Arial, sans-serif";
    ctx.fillText("SHREE I JEWELLERY", SECTION_PADDING, 34);
    ctx.fillStyle = "#e5e7eb";
    ctx.font = "13px Arial, sans-serif";
    ctx.fillText(`Karigar: ${karigarName}  |  ${today}`, SECTION_PADDING, 56);

    let yPos = 80;

    for (const [design, groupOrders] of groups) {
      const genericName = groupOrders[0]?.genericName ?? "—";
      const totalQty = groupOrders.reduce((s, o) => s + Number(o.quantity), 0);
      const totalWt = groupOrders.reduce(
        (s, o) => s + o.weight * Number(o.quantity),
        0,
      );

      // Design group header (green band)
      ctx.fillStyle = "#1a8c1a";
      ctx.fillRect(0, yPos, PAGE_W, 40);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 15px Arial, sans-serif";
      ctx.fillText(`Design: ${design}`, SECTION_PADDING, yPos + 26);
      yPos += 40;

      // Generic name + summary
      ctx.fillStyle = "#f3f4f6";
      ctx.fillRect(0, yPos, PAGE_W, 36);
      ctx.fillStyle = "#1a1a1a";
      ctx.font = "bold 13px Arial, sans-serif";
      ctx.fillText(genericName, SECTION_PADDING, yPos + 15);
      ctx.fillStyle = "#6b7280";
      ctx.font = "11px Arial, sans-serif";
      ctx.fillText(
        `${groupOrders.length} orders  |  Qty: ${totalQty}  |  Total Wt: ${totalWt.toFixed(2)}g`,
        SECTION_PADDING,
        yPos + 30,
      );
      yPos += 40;

      // Design image — use real URL if available, else placeholder
      const imgX = (PAGE_W - 300) / 2;
      const imgUrl = designImageUrls?.get(design);
      if (imgUrl) {
        try {
          await new Promise<void>((resolve) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => {
              // Draw image fitted within 300 x IMG_H box
              const scale = Math.min(
                300 / img.naturalWidth,
                IMG_H / img.naturalHeight,
              );
              const drawW = img.naturalWidth * scale;
              const drawH = img.naturalHeight * scale;
              const drawX = imgX + (300 - drawW) / 2;
              const drawY = yPos + (IMG_H - drawH) / 2;
              ctx.fillStyle = "#f8f8f8";
              ctx.fillRect(imgX, yPos, 300, IMG_H);
              ctx.drawImage(img, drawX, drawY, drawW, drawH);
              resolve();
            };
            img.onerror = () => {
              // Fallback placeholder on error
              ctx.fillStyle = "#eeeeee";
              ctx.fillRect(imgX, yPos, 300, IMG_H);
              ctx.strokeStyle = "#cccccc";
              ctx.lineWidth = 1;
              ctx.strokeRect(imgX, yPos, 300, IMG_H);
              ctx.fillStyle = "#aaaaaa";
              ctx.font = "12px Arial, sans-serif";
              ctx.fillText(`[Image: ${design}]`, imgX + 60, yPos + IMG_H / 2);
              resolve();
            };
            img.src = imgUrl;
          });
        } catch {
          ctx.fillStyle = "#eeeeee";
          ctx.fillRect(imgX, yPos, 300, IMG_H);
        }
      } else {
        ctx.fillStyle = "#eeeeee";
        ctx.fillRect(imgX, yPos, 300, IMG_H);
        ctx.strokeStyle = "#cccccc";
        ctx.lineWidth = 1;
        ctx.strokeRect(imgX, yPos, 300, IMG_H);
        ctx.fillStyle = "#aaaaaa";
        ctx.font = "12px Arial, sans-serif";
        ctx.fillText(`[Image: ${design}]`, imgX + 80, yPos + IMG_H / 2);
      }
      yPos += IMG_H + 10;

      // Table header
      const COLS = [
        "Order No",
        "Karigar",
        "Size",
        "Qty",
        "Unit Wt",
        "Total Wt",
        "Type",
      ];
      const COL_W = [160, 110, 70, 60, 80, 80, 70];
      ctx.fillStyle = "#374151";
      ctx.fillRect(
        SECTION_PADDING,
        yPos,
        PAGE_W - SECTION_PADDING * 2,
        TABLE_HEADER_H,
      );
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 11px Arial, sans-serif";
      let cx = SECTION_PADDING + 6;
      for (let h = 0; h < COLS.length; h++) {
        ctx.fillText(COLS[h], cx, yPos + 16);
        cx += COL_W[h];
      }
      yPos += TABLE_HEADER_H;

      // Order rows
      for (let ri = 0; ri < groupOrders.length; ri++) {
        const o = groupOrders[ri];
        ctx.fillStyle = ri % 2 === 0 ? "#ffffff" : "#f9fafb";
        ctx.fillRect(
          SECTION_PADDING,
          yPos,
          PAGE_W - SECTION_PADDING * 2,
          ROW_H,
        );
        ctx.fillStyle = "#1a1a1a";
        ctx.font = "11px Arial, sans-serif";
        const cells = [
          o.orderNo,
          o.karigarName ?? "—",
          o.size ? String(o.size) : "—",
          String(Number(o.quantity)),
          `${o.weight}g`,
          `${(o.weight * Number(o.quantity)).toFixed(1)}g`,
          o.orderType,
        ];
        let rx = SECTION_PADDING + 6;
        for (let ci = 0; ci < cells.length; ci++) {
          ctx.fillText(String(cells[ci]).substring(0, 20), rx, yPos + 17);
          rx += COL_W[ci];
        }
        yPos += ROW_H;
      }

      // Separator
      ctx.fillStyle = "#e5e7eb";
      ctx.fillRect(0, yPos, PAGE_W, 1);
      yPos += SECTION_PADDING;
    }

    canvas.toBlob(
      (blob) => {
        if (blob) triggerDownload(blob, filename);
        else alert("Failed to generate image.");
      },
      "image/jpeg",
      0.92,
    );
  }
}
