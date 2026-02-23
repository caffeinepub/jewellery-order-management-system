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
 * Normalize design code by trimming whitespace and converting to uppercase
 * This ensures consistent matching between order Excel and Master Design Excel
 */
export function normalizeDesignCode(code: string): string {
  return code.trim().toUpperCase();
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
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        const orders: any[] = [];
        const errors: ParseError[] = [];

        // Process in chunks to avoid blocking
        const CHUNK_SIZE = 100;
        for (let i = 0; i < jsonData.length; i += CHUNK_SIZE) {
          const chunk = jsonData.slice(i, Math.min(i + CHUNK_SIZE, jsonData.length));
          
          chunk.forEach((row: any, chunkIndex: number) => {
            const index = i + chunkIndex;
            const rowNumber = index + 2;
            
            const orderNo = String(row['Order No'] || row['OrderNo'] || '').trim();
            const orderTypeRaw = String(row['Order Type'] || row['OrderType'] || '').trim().toUpperCase();
            const product = String(row['Product'] || '').trim();
            const designRaw = String(row['Design'] || '').trim();
            const design = normalizeDesignCode(designRaw); // Normalize design code
            const weight = Number(row['Weight'] || 0);
            const size = Number(row['Size'] || 0);
            const quantity = Number(row['Quantity'] || 0);
            const remarks = String(row['Remarks'] || '').trim();

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
              // Map order type correctly including SO
              let orderType: OrderType;
              if (orderTypeRaw === 'CO') {
                orderType = OrderType.CO;
              } else if (orderTypeRaw === 'RB') {
                orderType = OrderType.RB;
              } else if (orderTypeRaw === 'SO') {
                orderType = OrderType.SO;
              } else {
                // Default to RB for backward compatibility
                orderType = OrderType.RB;
              }

              orders.push({
                orderNo,
                orderType,
                product,
                design, // Already normalized
                weight,
                size,
                quantity,
                remarks,
              });
            }
          });
          
          // Yield to browser to prevent freezing
          if (i + CHUNK_SIZE < jsonData.length) {
            await new Promise(resolve => setTimeout(resolve, 0));
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
        
        console.log('📊 Parsing Master Design Excel - Reading columns A (DESIGN CODE), B (GENERIC NAME), C (KARIGAR NAME)');
        console.log('Sheet name:', sheetName);
        console.log('Worksheet range:', worksheet['!ref']);

        // Get the range of the worksheet
        const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
        
        const mappings: any[] = [];
        const errors: ParseError[] = [];

        // Verify header row (Row 1, index 0)
        const headerA = worksheet[XLSX.utils.encode_cell({ r: 0, c: 0 })];
        const headerB = worksheet[XLSX.utils.encode_cell({ r: 0, c: 1 })];
        const headerC = worksheet[XLSX.utils.encode_cell({ r: 0, c: 2 })];
        
        console.log('Header Row 1:', {
          'Column A': headerA ? String(headerA.v).trim() : 'empty',
          'Column B': headerB ? String(headerB.v).trim() : 'empty',
          'Column C': headerC ? String(headerC.v).trim() : 'empty',
        });

        // Parse data rows starting from Row 2 (index 1)
        const CHUNK_SIZE = 100;
        const totalRows = range.e.r;
        
        console.log(`Processing ${totalRows} rows (Row 2 onwards, skipping header Row 1)`);
        
        for (let startRow = 1; startRow <= totalRows; startRow += CHUNK_SIZE) {
          const endRow = Math.min(startRow + CHUNK_SIZE - 1, totalRows);
          
          for (let row = startRow; row <= endRow; row++) {
            const rowNumber = row + 1; // Excel row number (1-based)
            
            // Read cells by position: Column A (0), Column B (1), Column C (2)
            const cellA = worksheet[XLSX.utils.encode_cell({ r: row, c: 0 })];
            const cellB = worksheet[XLSX.utils.encode_cell({ r: row, c: 1 })];
            const cellC = worksheet[XLSX.utils.encode_cell({ r: row, c: 2 })];
            
            // Extract values, handling different cell types
            const designCodeRaw = cellA ? String(cellA.v || '').trim() : '';
            const designCode = normalizeDesignCode(designCodeRaw); // Normalize design code
            const genericName = cellB ? String(cellB.v || '').trim() : '';
            const karigarName = cellC ? String(cellC.v || '').trim() : '';

            // Log first few data rows for debugging
            if (row <= 3) {
              console.log(`Row ${rowNumber}: Design Code="${designCode}" (normalized from "${designCodeRaw}"), Generic Name="${genericName}", Karigar Name="${karigarName}"`);
            }

            // Skip completely empty rows
            if (!designCode && !genericName && !karigarName) {
              continue;
            }

            // Validate required fields
            if (!designCode) {
              errors.push({ row: rowNumber, field: 'Column A (DESIGN CODE)', message: 'Design Code is required' });
            }
            if (!genericName) {
              errors.push({ row: rowNumber, field: 'Column B (GENERIC NAME)', message: 'Generic Name is required' });
            }
            if (!karigarName) {
              errors.push({ row: rowNumber, field: 'Column C (KARIGAR NAME)', message: 'Karigar Name is required' });
            }

            // Only add to mappings if all required fields are present
            if (designCode && genericName && karigarName) {
              mappings.push({
                designCode, // Already normalized
                genericName,
                karigarName,
              });
            }
          }
          
          // Yield to browser to prevent freezing
          if (startRow + CHUNK_SIZE <= totalRows) {
            await new Promise(resolve => setTimeout(resolve, 0));
          }
        }

        console.log(`✅ Parsed ${mappings.length} valid mappings from Master Design Excel`);
        if (errors.length > 0) {
          console.warn(`⚠️ Found ${errors.length} validation errors`);
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

export async function parseOrdersExcel(file: File): Promise<any[]> {
  const result = await parseExcelFile(file);
  
  if (result.errors.length > 0) {
    console.warn('Parsing errors:', result.errors);
  }
  
  return result.data.map((order, index) => ({
    ...order,
    orderId: `${order.orderNo}-${Date.now()}-${index}`,
    quantity: BigInt(order.quantity),
  }));
}
