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
            const design = String(row['Design'] || '').trim();
            const weight = Number(row['Weight'] || 0);
            const size = Number(row['Size'] || 0);
            const quantity = Number(row['Quantity'] || 0);
            const remarks = String(row['Remarks'] || '').trim();

            if (!orderNo) {
              errors.push({ row: rowNumber, field: 'Order No', message: 'Order No is required' });
            }
            if (!orderTypeRaw || (orderTypeRaw !== 'CO' && orderTypeRaw !== 'RB')) {
              errors.push({ row: rowNumber, field: 'Order Type', message: 'Order Type must be CO or RB' });
            }
            if (!product) {
              errors.push({ row: rowNumber, field: 'Product', message: 'Product is required' });
            }
            if (!design) {
              errors.push({ row: rowNumber, field: 'Design', message: 'Design is required' });
            }

            if (orderNo) {
              orders.push({
                orderNo,
                orderType: orderTypeRaw === 'CO' ? OrderType.CO : OrderType.RB,
                product,
                design,
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
        
        console.log('📊 Parsing Master Design Excel file');
        console.log('Sheet name:', sheetName);
        console.log('Worksheet range:', worksheet['!ref']);

        // Get the range of the worksheet
        const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
        
        // Read headers from first row
        const headers: { [key: string]: number } = {};
        for (let col = range.s.c; col <= range.e.c; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
          const cell = worksheet[cellAddress];
          if (cell && cell.v) {
            const headerValue = String(cell.v).trim();
            headers[headerValue] = col;
            console.log(`Header found: "${headerValue}" in column ${col} (${String.fromCharCode(65 + col)})`);
          }
        }

        // Check if we found the expected headers
        const designCodeCol = headers['Design Code'];
        const genericNameCol = headers['Generic Name'];
        const karigarNameCol = headers['Karigar Name'];

        console.log('Header mapping:', {
          'Design Code': designCodeCol !== undefined ? `Column ${String.fromCharCode(65 + designCodeCol)}` : 'NOT FOUND',
          'Generic Name': genericNameCol !== undefined ? `Column ${String.fromCharCode(65 + genericNameCol)}` : 'NOT FOUND',
          'Karigar Name': karigarNameCol !== undefined ? `Column ${String.fromCharCode(65 + karigarNameCol)}` : 'NOT FOUND',
        });

        if (designCodeCol === undefined || genericNameCol === undefined || karigarNameCol === undefined) {
          console.error('❌ Required headers not found. Available headers:', Object.keys(headers));
          reject(new Error('Excel file must have headers: "Design Code", "Generic Name", "Karigar Name"'));
          return;
        }

        const mappings: any[] = [];
        const errors: ParseError[] = [];

        // Process data rows (starting from row 1, since row 0 is headers)
        const CHUNK_SIZE = 100;
        const totalRows = range.e.r;
        
        for (let startRow = 1; startRow <= totalRows; startRow += CHUNK_SIZE) {
          const endRow = Math.min(startRow + CHUNK_SIZE - 1, totalRows);
          
          for (let row = startRow; row <= endRow; row++) {
            const rowNumber = row + 1; // Excel row number (1-based)
            
            // Read cell values directly
            const designCodeCell = worksheet[XLSX.utils.encode_cell({ r: row, c: designCodeCol })];
            const genericNameCell = worksheet[XLSX.utils.encode_cell({ r: row, c: genericNameCol })];
            const karigarNameCell = worksheet[XLSX.utils.encode_cell({ r: row, c: karigarNameCol })];
            
            // Extract values, handling different cell types
            const designCode = designCodeCell ? String(designCodeCell.v || '').trim() : '';
            const genericName = genericNameCell ? String(genericNameCell.v || '').trim() : '';
            const karigarName = karigarNameCell ? String(karigarNameCell.v || '').trim() : '';

            // Log first few rows for debugging
            if (row <= 3) {
              console.log(`Row ${rowNumber} values:`, {
                designCode: `"${designCode}"`,
                genericName: `"${genericName}"`,
                karigarName: `"${karigarName}"`,
              });
            }

            // Validate required fields
            if (!designCode) {
              errors.push({ row: rowNumber, field: 'Design Code', message: 'Design Code is required' });
            }
            if (!genericName) {
              errors.push({ row: rowNumber, field: 'Generic Name', message: 'Generic Name is required' });
            }
            if (!karigarName) {
              errors.push({ row: rowNumber, field: 'Karigar Name', message: 'Karigar Name is required' });
            }

            // Only add to mappings if all required fields are present
            if (designCode && genericName && karigarName) {
              mappings.push({
                designCode,
                genericName,
                karigarName,
              });
            }
          }
          
          // Yield to browser to prevent freezing
          if (endRow < totalRows) {
            await new Promise(resolve => setTimeout(resolve, 0));
          }
        }

        console.log(`✅ Parsing complete: ${mappings.length} valid mappings, ${errors.length} errors`);
        if (errors.length > 0) {
          console.log('First 5 errors:', errors.slice(0, 5));
        }

        resolve({ data: mappings, errors });
      } catch (error) {
        console.error('❌ Excel parsing error:', error);
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}
