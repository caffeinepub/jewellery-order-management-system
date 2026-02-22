import { OrderType, MappingRecord } from '../backend';

export function normalizeDesignCode(code: string): string {
  return String(code).trim().toUpperCase();
}

export interface ParsedOrder {
  design: string;
  orderNo: string;
  orderType: OrderType;
  product: string;
  weight: number;
  size: number;
  quantity: bigint;
  remarks: string;
  orderId: string;
}

export interface ParsedMasterDesign {
  designCode: string;
  genericName: string;
  karigarName: string;
}

export interface ParseResult<T> {
  data: T[];
  errors: Array<{ row: number; field: string; message: string }>;
}

export async function parseMasterDesignExcel(file: File): Promise<ParseResult<MappingRecord>> {
  const XLSX = await import('https://cdn.sheetjs.com/xlsx-0.20.0/package/xlsx.mjs' as any);
  
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][];

  const data: MappingRecord[] = [];
  const errors: Array<{ row: number; field: string; message: string }> = [];

  for (let i = 1; i < rawData.length; i++) {
    const row = rawData[i];
    
    if (!row || row.length === 0) continue;

    const designCode = row[0] ? normalizeDesignCode(String(row[0])) : '';
    const genericName = row[1] ? String(row[1]).trim() : '';
    const karigarName = row[2] ? String(row[2]).trim() : '';

    if (!designCode) {
      errors.push({ row: i + 1, field: 'Design Code', message: 'Missing design code' });
      continue;
    }

    if (!genericName) {
      errors.push({ row: i + 1, field: 'Generic Name', message: 'Missing generic name' });
      continue;
    }

    if (!karigarName) {
      errors.push({ row: i + 1, field: 'Karigar Name', message: 'Missing karigar name' });
      continue;
    }

    data.push({
      designCode,
      genericName,
      karigarName,
    });
  }

  return { data, errors };
}
