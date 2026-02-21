import { Order } from '@/backend';

export async function exportToExcel(orders: Order[]): Promise<void> {
  try {
    // Dynamic import of xlsx from CDN with type assertion
    const XLSX: any = await import('https://cdn.sheetjs.com/xlsx-0.20.0/package/xlsx.mjs' as any);
    
    const data = orders.map((order) => ({
      'Order No': order.orderNo,
      'Order Type': order.orderType,
      Product: order.product,
      Design: order.design,
      'Generic Name': order.genericName,
      Karigar: order.karigarName,
      Weight: order.weight,
      Size: order.size,
      Quantity: Number(order.quantity),
      Status: order.status,
      Remarks: order.remarks,
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Orders');

    XLSX.writeFile(workbook, `orders-${Date.now()}.xlsx`);
  } catch (error) {
    console.error('Export to Excel failed:', error);
    // Fallback to CSV if Excel export fails
    exportToCSV(orders);
  }
}

function exportToCSV(orders: Order[]): void {
  const headers = [
    'Order No',
    'Order Type',
    'Product',
    'Design',
    'Generic Name',
    'Karigar',
    'Weight',
    'Size',
    'Quantity',
    'Status',
    'Remarks',
  ];

  const rows = orders.map((order) => [
    order.orderNo,
    order.orderType,
    order.product,
    order.design,
    order.genericName,
    order.karigarName,
    order.weight.toString(),
    order.size.toString(),
    Number(order.quantity).toString(),
    order.status,
    order.remarks,
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `orders-${Date.now()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export async function exportToPDF(orders: Order[]): Promise<void> {
  try {
    // Create a simple HTML table and convert to PDF using browser print
    const tableHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Order Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { color: #333; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
          th { background-color: #4CAF50; color: white; }
          tr:nth-child(even) { background-color: #f2f2f2; }
        </style>
      </head>
      <body>
        <h1>Order Report</h1>
        <p>Generated: ${new Date().toLocaleString()}</p>
        <table>
          <thead>
            <tr>
              <th>Order No</th>
              <th>Type</th>
              <th>Product</th>
              <th>Design</th>
              <th>Generic</th>
              <th>Karigar</th>
              <th>Weight</th>
              <th>Size</th>
              <th>Qty</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${orders
              .map(
                (order) => `
              <tr>
                <td>${order.orderNo}</td>
                <td>${order.orderType}</td>
                <td>${order.product}</td>
                <td>${order.design}</td>
                <td>${order.genericName}</td>
                <td>${order.karigarName}</td>
                <td>${order.weight.toFixed(2)}</td>
                <td>${order.size}</td>
                <td>${Number(order.quantity)}</td>
                <td>${order.status}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([tableHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const printWindow = window.open(url, '_blank');
    
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print();
        setTimeout(() => {
          printWindow.close();
          URL.revokeObjectURL(url);
        }, 100);
      };
    }
  } catch (error) {
    console.error('Export to PDF failed:', error);
    throw error;
  }
}

export async function exportToJPEG(orders: Order[]): Promise<void> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context not available');

  canvas.width = 1200;
  const rowHeight = 30;
  const headerHeight = 60;
  const footerHeight = 20;
  canvas.height = headerHeight + Math.min(orders.length, 30) * rowHeight + footerHeight;

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Title
  ctx.fillStyle = '#2c3e50';
  ctx.font = 'bold 24px Arial';
  ctx.fillText('Order Report', 20, 35);

  // Date
  ctx.font = '12px Arial';
  ctx.fillStyle = '#7f8c8d';
  ctx.fillText(`Generated: ${new Date().toLocaleString()}`, 20, 55);

  // Header row
  ctx.fillStyle = '#34495e';
  ctx.fillRect(0, headerHeight, canvas.width, rowHeight);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 11px Arial';
  const headers = ['Order No', 'Type', 'Product', 'Design', 'Karigar', 'Weight', 'Qty', 'Status'];
  const colWidths = [120, 60, 140, 140, 140, 80, 60, 100];
  let xPos = 20;
  headers.forEach((header, i) => {
    ctx.fillText(header, xPos, headerHeight + 20);
    xPos += colWidths[i];
  });

  // Data rows
  ctx.fillStyle = '#2c3e50';
  ctx.font = '10px Arial';
  const displayOrders = orders.slice(0, 30); // Limit to 30 rows for image
  displayOrders.forEach((order, idx) => {
    const y = headerHeight + rowHeight + idx * rowHeight + 18;
    
    // Alternate row background
    if (idx % 2 === 0) {
      ctx.fillStyle = '#ecf0f1';
      ctx.fillRect(0, headerHeight + rowHeight + idx * rowHeight, canvas.width, rowHeight);
    }
    
    ctx.fillStyle = '#2c3e50';
    const values = [
      order.orderNo.substring(0, 15),
      order.orderType,
      order.product.substring(0, 15),
      order.design.substring(0, 15),
      order.karigarName.substring(0, 15),
      order.weight.toFixed(1) + 'g',
      Number(order.quantity).toString(),
      order.status,
    ];
    
    xPos = 20;
    values.forEach((value, i) => {
      ctx.fillText(value, xPos, y);
      xPos += colWidths[i];
    });
  });

  // Footer note if more orders exist
  if (orders.length > 30) {
    ctx.fillStyle = '#7f8c8d';
    ctx.font = 'italic 11px Arial';
    ctx.fillText(
      `Showing 30 of ${orders.length} orders. Export to Excel for complete data.`,
      20,
      canvas.height - 10
    );
  }

  canvas.toBlob((blob) => {
    if (!blob) throw new Error('Failed to create image');
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orders-${Date.now()}.jpg`;
    a.click();
    URL.revokeObjectURL(url);
  }, 'image/jpeg', 0.95);
}
