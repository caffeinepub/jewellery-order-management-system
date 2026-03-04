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
 * Loads an image from a URL and returns an HTMLImageElement.
 * Resolves even on error (returns null on failure).
 */
function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    // Only set crossOrigin for non-blob URLs to avoid CORS failures with IC HTTP gateway
    if (!url.startsWith("blob:")) {
      img.crossOrigin = "anonymous";
    }
    img.onload = () => resolve(img);
    img.onerror = () => {
      // If crossOrigin caused a failure, retry without it
      if (img.crossOrigin) {
        const retry = new Image();
        retry.onload = () => resolve(retry);
        retry.onerror = () => resolve(null);
        retry.src = url;
      } else {
        resolve(null);
      }
    };
    img.src = url;
  });
}

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
    // Use jsPDF-style canvas-to-PDF via a hidden canvas per page, then
    // assemble a multi-page PDF using the raw PDF spec.
    // Images in raw PDF require XObject embedding — instead we render each
    // page to a canvas first and embed as JPEG XObject.

    // Use 2x scale for high-quality rendering (retina/print quality)
    const SCALE = 2;
    const PAGE_W_PX = 794; // A4 @ 96dpi ≈ 794x1123 (logical pixels)
    const PAGE_H_PX = 1123;
    const MARGIN = 40;
    const BRAND_H = 70;
    const GREEN_H = 40;
    const IMG_AREA = Math.floor(PAGE_H_PX * 0.4); // ~40% of page height
    const TABLE_ROW_H = 22;
    const TABLE_HEADER_H = 26;
    const COL_WIDTHS = [230, 100, 60, 50, 80, 80, 60]; // Order No, Karigar, Size, Qty, Unit Wt, Total Wt, Type
    const TABLE_COLS = [
      "Order No",
      "Karigar",
      "Size",
      "Qty",
      "Unit Wt",
      "Total Wt",
      "Type",
    ];
    const TABLE_W = PAGE_W_PX - MARGIN * 2;

    // We'll build one canvas per design group and collect JPEG data URLs + actual dimensions
    const pageDataUrls: string[] = [];
    const pageActualHeights: number[] = []; // actual canvas heights in scaled pixels

    for (const [design, groupOrders] of groups) {
      const genericName = groupOrders[0]?.genericName ?? "";
      const totalQty = groupOrders.reduce((s, o) => s + Number(o.quantity), 0);
      const totalWt = groupOrders.reduce(
        (s, o) => s + o.weight * Number(o.quantity),
        0,
      );

      // Calculate required height for this page (logical pixels)
      const contentH =
        BRAND_H +
        GREEN_H +
        36 + // generic name + summary
        IMG_AREA +
        10 + // image gap
        TABLE_HEADER_H +
        groupOrders.length * TABLE_ROW_H +
        MARGIN;
      const pageH = Math.max(PAGE_H_PX, contentH);

      // Create canvas at 2x resolution for crisp image quality
      const canvas = document.createElement("canvas");
      canvas.width = PAGE_W_PX * SCALE;
      canvas.height = pageH * SCALE;
      const ctx = canvas.getContext("2d")!;

      // Scale all drawing operations by SCALE factor
      ctx.scale(SCALE, SCALE);

      // White background
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, PAGE_W_PX, pageH);

      let yPos = 0;

      // Brand header band
      ctx.fillStyle = "#1a1a2e";
      ctx.fillRect(0, yPos, PAGE_W_PX, BRAND_H);
      ctx.fillStyle = "#f97316";
      ctx.font = "bold 24px Arial, sans-serif";
      ctx.fillText("SHREE I JEWELLERY", MARGIN, yPos + 38);
      ctx.fillStyle = "#e5e7eb";
      ctx.font = "13px Arial, sans-serif";
      ctx.fillText(`Karigar: ${karigarName}  |  ${today}`, MARGIN, yPos + 60);
      yPos += BRAND_H;

      // Design header block (green)
      ctx.fillStyle = "#1a8c1a";
      ctx.fillRect(0, yPos, PAGE_W_PX, GREEN_H);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 17px Arial, sans-serif";
      ctx.fillText(`Design: ${design}`, MARGIN, yPos + 26);
      yPos += GREEN_H;

      // Generic name + summary line
      ctx.fillStyle = "#f8f8f8";
      ctx.fillRect(0, yPos, PAGE_W_PX, 36);
      ctx.fillStyle = "#111111";
      ctx.font = "bold 13px Arial, sans-serif";
      ctx.fillText(genericName, MARGIN, yPos + 16);
      ctx.fillStyle = "#6b7280";
      ctx.font = "11px Arial, sans-serif";
      ctx.fillText(
        `${groupOrders.length} orders  |  Qty: ${totalQty}  |  Total Wt: ${totalWt.toFixed(2)}g`,
        MARGIN,
        yPos + 30,
      );
      yPos += 36;

      // Design image — centered, fills ~40% of page height
      const imgUrl = designImageUrls?.get(design);
      const imgMaxW = PAGE_W_PX - MARGIN * 2;
      const imgMaxH = IMG_AREA;
      const imgBoxX = MARGIN;
      const imgBoxY = yPos;

      const loadedImg = imgUrl ? await loadImage(imgUrl) : null;
      if (loadedImg) {
        const scale = Math.min(
          imgMaxW / loadedImg.naturalWidth,
          imgMaxH / loadedImg.naturalHeight,
        );
        const drawW = loadedImg.naturalWidth * scale;
        const drawH = loadedImg.naturalHeight * scale;
        const drawX = imgBoxX + (imgMaxW - drawW) / 2;
        const drawY = imgBoxY + (imgMaxH - drawH) / 2;
        ctx.fillStyle = "#f8f8f8";
        ctx.fillRect(imgBoxX, imgBoxY, imgMaxW, imgMaxH);
        ctx.drawImage(loadedImg, drawX, drawY, drawW, drawH);
      } else {
        // Placeholder
        ctx.fillStyle = "#eeeeee";
        ctx.fillRect(imgBoxX, imgBoxY, imgMaxW, imgMaxH);
        ctx.strokeStyle = "#cccccc";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(imgBoxX, imgBoxY, imgMaxW, imgMaxH);
        ctx.fillStyle = "#aaaaaa";
        ctx.font = "14px Arial, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(
          `Design Image: ${design}`,
          PAGE_W_PX / 2,
          imgBoxY + imgMaxH / 2,
        );
        ctx.textAlign = "left";
      }
      yPos += imgMaxH + 10;

      // Table header row
      ctx.fillStyle = "#374151";
      ctx.fillRect(MARGIN, yPos, TABLE_W, TABLE_HEADER_H);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 11px Arial, sans-serif";
      let hx = MARGIN + 6;
      for (let h = 0; h < TABLE_COLS.length; h++) {
        ctx.fillText(TABLE_COLS[h], hx, yPos + 17);
        hx += COL_WIDTHS[h];
      }
      yPos += TABLE_HEADER_H;

      // Order rows
      for (let ri = 0; ri < groupOrders.length; ri++) {
        const o = groupOrders[ri];
        ctx.fillStyle = ri % 2 === 0 ? "#ffffff" : "#f3f4f6";
        ctx.fillRect(MARGIN, yPos, TABLE_W, TABLE_ROW_H);
        // Bottom border
        ctx.strokeStyle = "#e5e7eb";
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(MARGIN, yPos + TABLE_ROW_H);
        ctx.lineTo(MARGIN + TABLE_W, yPos + TABLE_ROW_H);
        ctx.stroke();

        ctx.fillStyle = "#111111";
        ctx.font = "11px Arial, sans-serif";
        const cells = [
          o.orderNo,
          o.karigarName ?? "—",
          o.size ? String(o.size) : "—",
          String(Number(o.quantity)),
          `${o.weight}g`,
          `${(o.weight * Number(o.quantity)).toFixed(1)}g`,
          String(o.orderType),
        ];
        let rx = MARGIN + 6;
        for (let ci = 0; ci < cells.length; ci++) {
          // Clip text to column width
          const maxChars = Math.floor(COL_WIDTHS[ci] / 7);
          const cellText = String(cells[ci]).substring(0, maxChars);
          ctx.fillText(cellText, rx, yPos + 15);
          rx += COL_WIDTHS[ci];
        }
        yPos += TABLE_ROW_H;
      }

      // Convert page canvas to data URL at high quality
      const dataUrl = canvas.toDataURL("image/jpeg", 0.97);
      pageDataUrls.push(dataUrl);
      pageActualHeights.push(canvas.height); // store actual canvas pixel height
    }

    // Now assemble a PDF where each page is the rendered canvas JPEG
    // We embed each JPEG as an XObject image in the PDF
    const PAGE_W_PT = 595;
    const PAGE_H_PT = 842;

    const pdfObjects: string[] = [];
    const binaryObjects: ArrayBuffer[] = [];
    let objCount = 0;

    // We track which objects are binary (JPEG streams)
    const binaryObjIndices = new Set<number>();

    function addTextObj(content: string): number {
      objCount++;
      pdfObjects.push(`${objCount} 0 obj\n${content}\nendobj`);
      binaryObjects.push(new ArrayBuffer(0));
      return objCount;
    }

    function addBinaryObj(header: string, jpegBytes: Uint8Array): number {
      objCount++;
      pdfObjects.push(`${objCount} 0 obj\n${header}\nstream\n`); // placeholder, binary appended later
      binaryObjects.push(jpegBytes.buffer.slice(0) as ArrayBuffer);
      binaryObjIndices.add(objCount - 1); // 0-based index
      return objCount;
    }

    const pageContentIds: number[] = [];
    const pageIds: number[] = [];
    const imageXObjIds: number[] = [];

    // Font (needed for page content streams even if no text)
    const fontId = addTextObj(
      "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    );

    for (let pi = 0; pi < pageDataUrls.length; pi++) {
      const dataUrl = pageDataUrls[pi];
      // Decode base64 to bytes
      const base64 = dataUrl.split(",")[1];
      const binaryStr = atob(base64);
      const jpegBytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        jpegBytes[i] = binaryStr.charCodeAt(i);
      }

      // Add JPEG XObject — use actual canvas pixel dimensions (scaled at 2x)
      const actualH = pageActualHeights[pi] ?? PAGE_H_PX * SCALE;
      const imgId = addBinaryObj(
        `<< /Type /XObject /Subtype /Image /Width ${PAGE_W_PX * SCALE} /Height ${actualH} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>`,
        jpegBytes,
      );
      imageXObjIds.push(imgId);

      // Page content stream: draw image filling the page
      const stream = `q\n${PAGE_W_PT} 0 0 ${PAGE_H_PT} 0 0 cm\n/Im${pi + 1} Do\nQ\n`;
      const streamBytes = new TextEncoder().encode(stream);
      const contentId = addTextObj(
        `<< /Length ${streamBytes.length} >>\nstream\n${stream}\nendstream`,
      );
      pageContentIds.push(contentId);

      // Build XObject resource dict for this page
      const xobjRef = `/Im${pi + 1} ${imgId} 0 R`;
      const pageId = addTextObj(
        `<< /Type /Page /MediaBox [0 0 ${PAGE_W_PT} ${PAGE_H_PT}] /Contents ${contentId} 0 R /Resources << /Font << /F1 ${fontId} 0 R >> /XObject << ${xobjRef} >> >> >>`,
      );
      pageIds.push(pageId);
    }

    if (pageIds.length === 0) {
      // Fallback empty page
      const contentId = addTextObj("<< /Length 0 >>\nstream\n\nendstream");
      pageContentIds.push(contentId);
      const pageId = addTextObj(
        `<< /Type /Page /MediaBox [0 0 ${PAGE_W_PT} ${PAGE_H_PT}] /Contents ${contentId} 0 R /Resources << /Font << /F1 ${fontId} 0 R >> >> >>`,
      );
      pageIds.push(pageId);
    }

    const kidsRef = pageIds.map((id) => `${id} 0 R`).join(" ");
    const pagesId = addTextObj(
      `<< /Type /Pages /Kids [${kidsRef}] /Count ${pageIds.length} >>`,
    );
    for (let i = 0; i < pageIds.length; i++) {
      const idx = pageIds[i] - 1;
      const xobjRef =
        i < imageXObjIds.length ? `/Im${i + 1} ${imageXObjIds[i]} 0 R` : "";
      pdfObjects[idx] =
        `${pageIds[i]} 0 obj\n<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${PAGE_W_PT} ${PAGE_H_PT}] /Contents ${pageContentIds[i]} 0 R /Resources << /Font << /F1 ${fontId} 0 R >> /XObject << ${xobjRef} >> >> >>\nendobj`;
    }
    const catalogId = addTextObj(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);

    // Assemble final PDF as binary
    // Strategy: build text parts, insert binary JPEG streams at correct positions
    const enc = new TextEncoder();
    const parts: Uint8Array[] = [];

    const headerStr = "%PDF-1.4\n%\xFF\xFF\xFF\xFF\n";
    parts.push(enc.encode(headerStr));
    let byteOffset = enc.encode(headerStr).length;

    const offsets: number[] = new Array(objCount).fill(0);

    for (let i = 0; i < pdfObjects.length; i++) {
      offsets[i] = byteOffset;
      const objStr = pdfObjects[i];
      if (binaryObjIndices.has(i)) {
        // Binary object: header up to "stream\n", then JPEG bytes, then "\nendstream\nendobj\n"
        const headerPart = enc.encode(objStr); // ends with "stream\n"
        parts.push(headerPart);
        byteOffset += headerPart.length;
        const jpegData = new Uint8Array(binaryObjects[i]);
        parts.push(jpegData);
        byteOffset += jpegData.length;
        const trailer = enc.encode("\nendstream\nendobj\n");
        parts.push(trailer);
        byteOffset += trailer.length;
      } else {
        const objBytes = enc.encode(`${objStr}\n`);
        parts.push(objBytes);
        byteOffset += objBytes.length;
      }
    }

    // xref table
    const xrefOffset = byteOffset;
    let xrefStr = "xref\n";
    xrefStr += `0 ${objCount + 1}\n`;
    xrefStr += "0000000000 65535 f \n";
    for (const off of offsets) {
      xrefStr += `${off.toString().padStart(10, "0")} 00000 n \n`;
    }
    xrefStr += "trailer\n";
    xrefStr += `<< /Size ${objCount + 1} /Root ${catalogId} 0 R >>\n`;
    xrefStr += "startxref\n";
    xrefStr += `${xrefOffset}\n`;
    xrefStr += "%%EOF\n";
    parts.push(enc.encode(xrefStr));

    // Merge all parts
    const totalLen = parts.reduce((s, p) => s + p.length, 0);
    const finalPdf = new Uint8Array(totalLen);
    let pos = 0;
    for (const p of parts) {
      finalPdf.set(p, pos);
      pos += p.length;
    }

    triggerDownload(
      new Blob([finalPdf.buffer], { type: "application/pdf" }),
      filename,
    );
  } else {
    // ── JPEG path ─────────────────────────────────────────────────────────────
    // Each design group is rendered as a section.
    // Image occupies ~40% of the canvas width (which equals page width).
    // Uses 2x scale for high-quality / retina output.
    const JPEG_SCALE = 2;
    const SECTION_PADDING = 20;
    const ROW_H = 28;
    const TABLE_HEADER_H = 28;
    const BRAND_H = 70;
    const GREEN_BAND_H = 40;
    const META_BAND_H = 38;
    const PAGE_W = 860; // logical width
    // Image area height = ~40% of PAGE_W (square-ish, prominent)
    const IMG_AREA_H = Math.floor(PAGE_W * 0.4); // ~344px (logical)

    // Compute total canvas height (logical pixels)
    let totalH = BRAND_H;
    for (const [, groupOrders] of groups) {
      totalH +=
        GREEN_BAND_H +
        META_BAND_H +
        IMG_AREA_H +
        10 +
        TABLE_HEADER_H +
        groupOrders.length * ROW_H +
        SECTION_PADDING;
    }
    totalH += 20; // bottom padding

    // Create canvas at 2x physical resolution for crisp output
    const canvas = document.createElement("canvas");
    canvas.width = PAGE_W * JPEG_SCALE;
    canvas.height = totalH * JPEG_SCALE;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      alert("Canvas not supported.");
      return;
    }

    // Scale all drawing to 2x
    ctx.scale(JPEG_SCALE, JPEG_SCALE);

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, PAGE_W, totalH);

    // Brand header
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, PAGE_W, BRAND_H);
    ctx.fillStyle = "#f97316";
    ctx.font = "bold 26px Arial, sans-serif";
    ctx.fillText("SHREE I JEWELLERY", SECTION_PADDING, 40);
    ctx.fillStyle = "#e5e7eb";
    ctx.font = "14px Arial, sans-serif";
    ctx.fillText(`Karigar: ${karigarName}  |  ${today}`, SECTION_PADDING, 60);

    let yPos = BRAND_H;

    const TABLE_COLS = [
      "Order No",
      "Karigar",
      "Size",
      "Qty",
      "Unit Wt",
      "Total Wt",
      "Type",
    ];
    const COL_WIDTHS = [230, 110, 70, 60, 80, 80, 70];
    const TABLE_W = PAGE_W - SECTION_PADDING * 2;

    for (const [design, groupOrders] of groups) {
      const genericName = groupOrders[0]?.genericName ?? "";
      const totalQty = groupOrders.reduce((s, o) => s + Number(o.quantity), 0);
      const totalWt = groupOrders.reduce(
        (s, o) => s + o.weight * Number(o.quantity),
        0,
      );

      // Design group header (green band)
      ctx.fillStyle = "#1a8c1a";
      ctx.fillRect(0, yPos, PAGE_W, GREEN_BAND_H);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 17px Arial, sans-serif";
      ctx.fillText(`Design: ${design}`, SECTION_PADDING, yPos + 26);
      yPos += GREEN_BAND_H;

      // Generic name + summary row
      ctx.fillStyle = "#f3f4f6";
      ctx.fillRect(0, yPos, PAGE_W, META_BAND_H);
      ctx.fillStyle = "#111111";
      ctx.font = "bold 14px Arial, sans-serif";
      ctx.fillText(genericName, SECTION_PADDING, yPos + 16);
      ctx.fillStyle = "#6b7280";
      ctx.font = "12px Arial, sans-serif";
      ctx.fillText(
        `${groupOrders.length} orders  |  Qty: ${totalQty}  |  Total Wt: ${totalWt.toFixed(2)}g`,
        SECTION_PADDING,
        yPos + 32,
      );
      yPos += META_BAND_H;

      // Design image — large, centered, fills IMG_AREA_H
      const imgMaxW = PAGE_W - SECTION_PADDING * 2;
      const imgBoxX = SECTION_PADDING;
      const imgBoxY = yPos;

      const imgUrl = designImageUrls?.get(design);
      const loadedImg = imgUrl ? await loadImage(imgUrl) : null;
      if (loadedImg) {
        const scale = Math.min(
          imgMaxW / loadedImg.naturalWidth,
          IMG_AREA_H / loadedImg.naturalHeight,
        );
        const drawW = loadedImg.naturalWidth * scale;
        const drawH = loadedImg.naturalHeight * scale;
        const drawX = imgBoxX + (imgMaxW - drawW) / 2;
        const drawY = imgBoxY + (IMG_AREA_H - drawH) / 2;
        ctx.fillStyle = "#f8f8f8";
        ctx.fillRect(imgBoxX, imgBoxY, imgMaxW, IMG_AREA_H);
        ctx.drawImage(loadedImg, drawX, drawY, drawW, drawH);
      } else {
        // Placeholder box
        ctx.fillStyle = "#eeeeee";
        ctx.fillRect(imgBoxX, imgBoxY, imgMaxW, IMG_AREA_H);
        ctx.strokeStyle = "#cccccc";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(imgBoxX, imgBoxY, imgMaxW, IMG_AREA_H);
        ctx.fillStyle = "#aaaaaa";
        ctx.font = "15px Arial, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(
          `Design Image: ${design}`,
          PAGE_W / 2,
          imgBoxY + IMG_AREA_H / 2,
        );
        ctx.textAlign = "left";
      }
      yPos += IMG_AREA_H + 10;

      // Table header row
      ctx.fillStyle = "#374151";
      ctx.fillRect(SECTION_PADDING, yPos, TABLE_W, TABLE_HEADER_H);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 12px Arial, sans-serif";
      let hx = SECTION_PADDING + 8;
      for (let h = 0; h < TABLE_COLS.length; h++) {
        ctx.fillText(TABLE_COLS[h], hx, yPos + 18);
        hx += COL_WIDTHS[h];
      }
      yPos += TABLE_HEADER_H;

      // Order rows
      for (let ri = 0; ri < groupOrders.length; ri++) {
        const o = groupOrders[ri];
        ctx.fillStyle = ri % 2 === 0 ? "#ffffff" : "#f3f4f6";
        ctx.fillRect(SECTION_PADDING, yPos, TABLE_W, ROW_H);
        // Bottom border
        ctx.strokeStyle = "#e5e7eb";
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(SECTION_PADDING, yPos + ROW_H);
        ctx.lineTo(SECTION_PADDING + TABLE_W, yPos + ROW_H);
        ctx.stroke();

        ctx.fillStyle = "#111111";
        ctx.font = "12px Arial, sans-serif";
        const cells = [
          o.orderNo,
          o.karigarName ?? "—",
          o.size ? String(o.size) : "—",
          String(Number(o.quantity)),
          `${o.weight}g`,
          `${(o.weight * Number(o.quantity)).toFixed(1)}g`,
          String(o.orderType),
        ];
        let rx = SECTION_PADDING + 8;
        for (let ci = 0; ci < cells.length; ci++) {
          const maxChars = Math.floor(COL_WIDTHS[ci] / 8);
          ctx.fillText(String(cells[ci]).substring(0, maxChars), rx, yPos + 19);
          rx += COL_WIDTHS[ci];
        }
        yPos += ROW_H;
      }

      // Section separator
      ctx.fillStyle = "#e5e7eb";
      ctx.fillRect(0, yPos, PAGE_W, 2);
      yPos += SECTION_PADDING;
    }

    canvas.toBlob(
      (blob) => {
        if (blob) triggerDownload(blob, filename);
        else alert("Failed to generate image.");
      },
      "image/jpeg",
      0.97, // high quality output
    );
  }
}
