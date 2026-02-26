import { OrderType } from '@/backend';

interface ParseError {
  row: number;
  field: string;
  message: string;
}

export interface ParseResult<T> {
  data: T[];
  errors: ParseError[];
}

/**
 * Normalize design code by trimming whitespace and converting to uppercase.
 * This ensures consistent matching between order Excel and Master Design Excel.
 */
export function normalizeDesignCode(code: string): string {
  return code.trim().toUpperCase();
}

/**
 * Safely extract a numeric value from an Excel row cell.
 */
function extractNumber(row: any, ...keys: string[]): number {
  for (const key of keys) {
    const val = row[key];
    if (val !== undefined && val !== null && val !== '') {
      const num = Number(val);
      if (!isNaN(num)) return num;
    }
  }
  return 0;
}

/**
 * Safely extract a string value from an Excel row cell.
 */
function extractString(row: any, ...keys: string[]): string {
  for (const key of keys) {
    const val = row[key];
    if (val !== undefined && val !== null && String(val).trim() !== '') {
      return String(val).trim();
    }
  }
  return '';
}

/**
 * Parse a DD/MM/YYYY (or DD-MM-YYYY) string into epoch milliseconds.
 * Returns null if the string does not match the pattern or produces an invalid date.
 */
function parseDDMMYYYY(str: string): number | null {
  // Support both "/" and "-" separators
  const match = str.trim().match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (!match) return null;
  const day = parseInt(match[1], 10);
  const month = parseInt(match[2], 10) - 1; // zero-indexed month
  const year = parseInt(match[3], 10);
  if (day < 1 || day > 31 || month < 0 || month > 11 || year < 1900) return null;
  const date = new Date(year, month, day);
  // Validate the date components round-trip correctly
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month ||
    date.getDate() !== day
  ) {
    return null;
  }
  const ts = date.getTime();
  if (isNaN(ts) || ts <= 0) return null;
  return ts;
}

/**
 * Convert an Excel serial number to a JS timestamp (ms).
 *
 * The Excel file is created in an Indian locale where dates are entered as DD/MM/YYYY.
 * Excel (especially on Mac/iOS with Indian locale) correctly interprets and stores
 * DD/MM/YYYY dates as their proper serial numbers — no day/month swap is needed.
 *
 * For dates where day > 12 (e.g. "19/02/2026"), Excel cannot parse as MM/DD so it
 * stores the value as a text string — those are handled by parseDDMMYYYY instead
 * and never reach this function.
 *
 * For dates where day <= 12 (e.g. "03/12/2025"), Excel stores the correct serial
 * for December 3, 2025 — we just convert directly without any swap.
 */
function excelSerialToTimestamp(serial: number): number | null {
  if (!isFinite(serial) || serial <= 0) return null;
  // Account for Excel's Lotus 1-2-3 leap year bug (serial 60 = fake Feb 29, 1900)
  const adjustedSerial = serial > 60 ? serial - 1 : serial;
  // 25569 = days between Excel epoch (Jan 1 1900) and Unix epoch (Jan 1 1970)
  const msFromUnixEpoch = (adjustedSerial - 25569) * 86400 * 1000;
  const date = new Date(msFromUnixEpoch);
  if (isNaN(date.getTime())) return null;
  return date.getTime();
}

/**
 * Extract and parse an order date from an Excel row.
 *
 * Priority:
 * 1. Strings — try DD/MM/YYYY first (primary format for Indian locale), then ISO, then fallback
 * 2. Numbers (Excel serial dates) — convert directly (no day/month swap needed)
 * 3. JS Date objects (from cellDates:true) — use directly
 *
 * Returns epoch milliseconds (number) or null. Never returns NaN or undefined.
 */
function extractOrderDate(row: any): number | null {
  const keys = [
    'Order Date', 'OrderDate', 'ORDER DATE', 'order_date', 'orderdate',
    'Date', 'DATE', 'Dt', 'DT', 'Order Dt', 'ORDER DT',
  ];

  for (const key of keys) {
    const val = row[key];
    if (val === undefined || val === null || val === '') continue;

    try {
      // Case 1: String — try DD/MM/YYYY first (primary format), then fallbacks
      if (typeof val === 'string') {
        const trimmed = val.trim();
        if (!trimmed) continue;

        // Primary: DD/MM/YYYY or DD-MM-YYYY
        const ddmmTs = parseDDMMYYYY(trimmed);
        if (ddmmTs !== null) return ddmmTs;

        // ISO YYYY-MM-DD
        if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
          const d = new Date(trimmed);
          if (!isNaN(d.getTime())) return d.getTime();
        }

        // Last resort: native Date.parse (may misinterpret ambiguous formats)
        const parsed = Date.parse(trimmed);
        if (!isNaN(parsed) && parsed > 0) return parsed;
        continue;
      }

      // Case 2: Number — Excel serial date; convert directly (Indian locale = correct serial)
      if (typeof val === 'number' && !isNaN(val) && isFinite(val) && val > 0) {
        const ts = excelSerialToTimestamp(val);
        if (ts !== null && ts > 0) return ts;
        continue;
      }

      // Case 3: JS Date object (SheetJS cellDates:true) — use directly
      if (val instanceof Date) {
        const rawTs = val.getTime();
        if (!isNaN(rawTs) && rawTs > 0) return rawTs;
        continue;
      }
    } catch {
      continue;
    }
  }

  return null;
}

export async function parseExcelFile(file: File): Promise<
  ParseResult<{
    orderNo: string;
    orderType: OrderType;
    product: string;
    design: string;
    weight: number;
    size: number;
    quantity: number;
    remarks: string;
    orderDate: number | null;
  }>
> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const data = e.target?.result as ArrayBuffer;

        // Use CDN dynamic import — 'xlsx' is not in package.json
        const XLSX: any = await import('https://cdn.sheetjs.com/xlsx-0.20.0/package/xlsx.mjs' as any);

        // Do NOT use cellDates:true — we want raw serial numbers so we can apply
        // our own conversion logic.
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        const orders: any[] = [];
        const errors: ParseError[] = [];

        const CHUNK_SIZE = 100;
        for (let i = 0; i < jsonData.length; i += CHUNK_SIZE) {
          const chunk = (jsonData as any[]).slice(i, Math.min(i + CHUNK_SIZE, jsonData.length));

          chunk.forEach((row: any, chunkIndex: number) => {
            const index = i + chunkIndex;
            const rowNumber = index + 2;

            const orderNo = extractString(row, 'Order No', 'OrderNo', 'ORDER NO', 'order_no', 'orderno');
            const orderTypeRaw = extractString(row, 'Order Type', 'OrderType', 'ORDER TYPE', 'order_type', 'ordertype', 'Type', 'TYPE').toUpperCase();
            const product = extractString(row, 'Product', 'PRODUCT', 'product');
            const designRaw = extractString(row, 'Design', 'DESIGN', 'design', 'Design Code', 'DesignCode');
            const design = normalizeDesignCode(designRaw);
            const weight = extractNumber(row, 'Weight', 'WEIGHT', 'weight', 'Wt', 'WT');
            const size = extractNumber(row, 'Size', 'SIZE', 'size');
            const quantity = extractNumber(row, 'Quantity', 'QUANTITY', 'Qty', 'QTY', 'qty', 'quantity');
            const remarks = extractString(row, 'Remarks', 'REMARKS', 'remarks', 'Remark', 'REMARK');
            const orderDate: number | null = extractOrderDate(row);

            if (!orderNo) {
              errors.push({ row: rowNumber, field: 'Order No', message: 'Order No is required' });
            }
            if (!orderTypeRaw || (orderTypeRaw !== 'CO' && orderTypeRaw !== 'RB' && orderTypeRaw !== 'SO')) {
              errors.push({ row: rowNumber, field: 'Order Type', message: 'Order Type must be CO, RB, or SO' });
            }
            if (!product) {
              errors.push({ row: rowNumber, field: 'Product', message: 'Product is required' });
            }
            if (!design) {
              errors.push({ row: rowNumber, field: 'Design', message: 'Design is required' });
            }

            if (orderNo) {
              let orderType: OrderType;
              if (orderTypeRaw === 'CO') {
                orderType = OrderType.CO;
              } else if (orderTypeRaw === 'RB') {
                orderType = OrderType.RB;
              } else if (orderTypeRaw === 'SO') {
                orderType = OrderType.SO;
              } else {
                orderType = OrderType.RB;
              }

              orders.push({
                orderNo,
                orderType,
                product,
                design,
                weight,
                size,
                quantity,
                remarks,
                orderDate,
              });
            }
          });

          if (i + CHUNK_SIZE < jsonData.length) {
            await new Promise((res) => setTimeout(res, 0));
          }
        }

        resolve({ data: orders, errors });
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

export async function parseMasterDesignExcel(file: File): Promise<
  ParseResult<{
    designCode: string;
    genericName: string;
    karigarName: string;
  }>
> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const data = e.target?.result as ArrayBuffer;

        const XLSX: any = await import('https://cdn.sheetjs.com/xlsx-0.20.0/package/xlsx.mjs' as any);

        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');

        const mappings: any[] = [];
        const errors: ParseError[] = [];

        const CHUNK_SIZE = 100;
        const totalRows = range.e.r;

        for (let startRow = 1; startRow <= totalRows; startRow += CHUNK_SIZE) {
          const endRow = Math.min(startRow + CHUNK_SIZE - 1, totalRows);

          for (let row = startRow; row <= endRow; row++) {
            const rowNumber = row + 1;

            const cellA = worksheet[XLSX.utils.encode_cell({ r: row, c: 0 })];
            const cellB = worksheet[XLSX.utils.encode_cell({ r: row, c: 1 })];
            const cellC = worksheet[XLSX.utils.encode_cell({ r: row, c: 2 })];

            const designCodeRaw = cellA ? String(cellA.v || '').trim() : '';
            const designCode = normalizeDesignCode(designCodeRaw);
            const genericName = cellB ? String(cellB.v || '').trim() : '';
            const karigarName = cellC ? String(cellC.v || '').trim() : '';

            if (!designCode && !genericName && !karigarName) continue;

            if (!designCode) {
              errors.push({ row: rowNumber, field: 'Column A (DESIGN CODE)', message: 'Design Code is required' });
            }
            if (!genericName) {
              errors.push({ row: rowNumber, field: 'Column B (GENERIC NAME)', message: 'Generic Name is required' });
            }
            if (!karigarName) {
              errors.push({ row: rowNumber, field: 'Column C (KARIGAR NAME)', message: 'Karigar Name is required' });
            }

            if (designCode && genericName && karigarName) {
              mappings.push({ designCode, genericName, karigarName });
            }
          }

          if (startRow + CHUNK_SIZE <= totalRows) {
            await new Promise((res) => setTimeout(res, 0));
          }
        }

        resolve({ data: mappings, errors });
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Parse an orders Excel file and return an array of parsed orders ready for upload.
 * This is the convenience wrapper used by IngestOrders.tsx.
 */
export async function parseOrdersExcel(file: File): Promise<Array<{
  orderNo: string;
  orderType: OrderType;
  product: string;
  design: string;
  weight: number;
  size: number;
  quantity: bigint;
  remarks: string;
  orderId: string;
  orderDate: number | null;
}>> {
  const result = await parseExcelFile(file);

  if (result.errors.length > 0) {
    console.warn('Parsing errors:', result.errors);
  }

  return result.data.map((order, index) => ({
    ...order,
    orderId: `${order.orderNo}-${Date.now()}-${index}`,
    quantity: BigInt(order.quantity),
    // orderDate stays as number | null for use in IngestOrders
  }));
}
