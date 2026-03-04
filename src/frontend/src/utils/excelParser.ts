/**
 * Excel parsing utilities.
 * Uses SheetJS loaded dynamically from CDN to avoid npm package dependency.
 */

import { OrderType } from "../backend";

export interface ParsedOrder {
  orderNo: string;
  orderType: OrderType;
  product: string;
  design: string;
  weight: number;
  size: number;
  quantity: number;
  remarks: string;
  orderId: string;
  orderDate: bigint | null;
}

/** Normalize a design code: uppercase, trim whitespace */
export function normalizeDesignCode(raw: string): string {
  return raw.trim().toUpperCase();
}

function normalizeHeader(h: unknown): string {
  return String(h ?? "")
    .toLowerCase()
    .replace(/[\s_\-]/g, "");
}

function resolveOrderType(raw: unknown): OrderType {
  const val = String(raw ?? "")
    .trim()
    .toUpperCase();
  if (val === "RB") return OrderType.RB;
  if (val === "SO") return OrderType.SO;
  return OrderType.CO;
}

async function loadXLSX(): Promise<any> {
  // Use dynamic CDN import — xlsx is not in package.json
  const XLSX = await import(
    "https://cdn.sheetjs.com/xlsx-0.20.0/package/xlsx.mjs" as any
  );
  return XLSX;
}

function parseExcelDateSerial(XLSX: any, raw: unknown): bigint | null {
  if (!raw) return null;
  if (typeof raw === "number") {
    try {
      const date = XLSX.SSF.parse_date_code(raw);
      if (date) {
        const ms = Date.UTC(date.y, date.m - 1, date.d);
        return BigInt(ms) * BigInt(1_000_000);
      }
    } catch {
      // ignore
    }
  }
  if (typeof raw === "string") {
    const ms = Date.parse(raw);
    if (!Number.isNaN(ms)) return BigInt(ms) * BigInt(1_000_000);
  }
  return null;
}

/**
 * Parse an Excel file (as File or Uint8Array) and return an array of ParsedOrder objects.
 * Accepts a File object — reads it internally.
 */
export async function parseOrdersExcel(file: File): Promise<ParsedOrder[]> {
  const XLSX = await loadXLSX();

  const arrayBuffer = await file.arrayBuffer();
  const data = new Uint8Array(arrayBuffer);

  const workbook = XLSX.read(data, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
  }) as unknown[][];

  if (rows.length < 2) return [];

  const headerRow = rows[0] as unknown[];
  const headers = headerRow.map(normalizeHeader);

  const colIdx = (names: string[]): number => {
    for (const name of names) {
      const idx = headers.findIndex((h) => h === name);
      if (idx !== -1) return idx;
    }
    return -1;
  };

  const orderNoIdx = colIdx([
    "orderno",
    "ordernumber",
    "order no",
    "order number",
  ]);
  const orderTypeIdx = colIdx([
    "ordertype",
    "order type",
    "ordert",
    "order t",
    "type",
  ]);
  const productIdx = colIdx(["product", "productname", "product name"]);
  const designIdx = colIdx(["designcode", "design code", "design"]);
  const weightIdx = colIdx(["weight", "wt"]);
  const sizeIdx = colIdx(["size"]);
  const qtyIdx = colIdx(["quantity", "qty"]);
  const remarksIdx = colIdx(["remarks", "remark", "note", "notes"]);
  const orderDateIdx = colIdx(["orderdate", "order date", "date"]);

  const parsed: ParsedOrder[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] as unknown[];
    if (!row || row.every((c) => !c)) continue;

    const orderNo = String(row[orderNoIdx] ?? "").trim();
    const design = normalizeDesignCode(String(row[designIdx] ?? "").trim());
    if (!orderNo || !design) continue;

    const orderType: OrderType =
      orderTypeIdx >= 0 ? resolveOrderType(row[orderTypeIdx]) : OrderType.CO;

    const product = productIdx >= 0 ? String(row[productIdx] ?? "").trim() : "";
    const weight =
      weightIdx >= 0
        ? Number.parseFloat(String(row[weightIdx] ?? "0")) || 0
        : 0;
    const size =
      sizeIdx >= 0 ? Number.parseFloat(String(row[sizeIdx] ?? "0")) || 0 : 0;
    const quantity =
      qtyIdx >= 0 ? Number.parseInt(String(row[qtyIdx] ?? "1"), 10) || 1 : 1;
    const remarks = remarksIdx >= 0 ? String(row[remarksIdx] ?? "").trim() : "";
    const orderDate =
      orderDateIdx >= 0 ? parseExcelDateSerial(XLSX, row[orderDateIdx]) : null;

    const orderId = `${orderNo}_${design}_${Date.now()}_${i}_${Math.random()
      .toString(36)
      .slice(2, 7)}`;

    parsed.push({
      orderNo,
      orderType,
      product,
      design,
      weight,
      size,
      quantity,
      remarks,
      orderId,
      orderDate,
    });
  }

  return parsed;
}
