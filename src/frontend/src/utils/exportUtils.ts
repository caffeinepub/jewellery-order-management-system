import { Order } from "@/backend";
import { ExternalBlob } from "@/backend";

export async function exportToExcel(orders: Order[]) {
  try {
    // Dynamic import of xlsx from CDN
    const XLSX = await import('https://cdn.sheetjs.com/xlsx-0.20.0/package/xlsx.mjs' as any);
    
    const data = orders.map((order) => ({
      Design: order.design,
      "Generic Name": order.genericName || "-",
      Karigar: order.karigarName || "-",
      Weight: order.weight,
      Size: order.size,
      Quantity: Number(order.quantity),
      Remarks: order.remarks || "-",
      "Order No": order.orderNo,
      Type: order.orderType,
      Product: order.product,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Orders");
    XLSX.writeFile(wb, `orders_${new Date().toISOString().split("T")[0]}.xlsx`);
  } catch (error) {
    console.error('Export to Excel failed:', error);
    throw error;
  }
}

// Helper function to extract numeric portion from design code for sorting
function extractNumericPortion(designCode: string): number {
  const match = designCode.match(/\d+/);
  return match ? parseInt(match[0], 10) : 0;
}

// Helper function to fetch and convert design image to base64
async function fetchDesignImageAsBase64(designCode: string, actor: any): Promise<string | null> {
  try {
    if (!actor) return null;
    const blob = await actor.getDesignImage(designCode);
    if (!blob) return null;

    // Get bytes from ExternalBlob
    const bytes = await blob.getBytes();
    
    // Convert Uint8Array to base64
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);
    
    // Return as data URL (assuming JPEG, adjust if needed)
    return `data:image/jpeg;base64,${base64}`;
  } catch (error) {
    console.error(`Failed to fetch image for ${designCode}:`, error);
    return null;
  }
}

// Mobile-friendly download helper
function downloadBlobOnMobile(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  
  // Detect iOS
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  
  if (isIOS) {
    // For iOS, open in new window as Safari has restrictions
    const newWindow = window.open(url, '_blank');
    if (!newWindow) {
      // Fallback: try to use Share API if available
      if (navigator.share) {
        navigator.share({
          files: [new File([blob], filename, { type: blob.type })],
          title: filename,
        }).catch((err) => console.error('Share failed:', err));
      }
    }
  } else {
    // For Android and desktop, use standard download
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up after a delay
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }
}

export async function exportToPDF(orders: Order[], actor?: any): Promise<string> {
  // Group orders by design code
  const groupedOrders = orders.reduce((acc, order) => {
    if (!acc[order.design]) {
      acc[order.design] = [];
    }
    acc[order.design].push(order);
    return acc;
  }, {} as Record<string, Order[]>);

  // Sort design codes numerically (lower to higher)
  const sortedDesignCodes = Object.keys(groupedOrders).sort((a, b) => {
    return extractNumericPortion(a) - extractNumericPortion(b);
  });

  // Fetch all design images in parallel
  const imagePromises = sortedDesignCodes.map(async (designCode) => {
    const base64Image = actor ? await fetchDesignImageAsBase64(designCode, actor) : null;
    return { designCode, base64Image };
  });

  const imageResults = await Promise.all(imagePromises);
  const imageMap = new Map(imageResults.map(r => [r.designCode, r.base64Image]));

  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        @page { size: A4; margin: 20mm; }
        body { font-family: Arial, sans-serif; font-size: 12px; }
        h1 { text-align: center; margin-bottom: 5px; }
        h2 { text-align: center; margin-top: 0; margin-bottom: 20px; font-weight: normal; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #4CAF50; color: white; font-weight: bold; }
        .design-group { page-break-after: always; }
        .design-header { 
          background-color: #4CAF50; 
          color: white; 
          font-weight: bold; 
          font-size: 16px; 
          padding: 12px; 
          margin: 20px 0 10px 0; 
          border-radius: 4px;
        }
        .image-container { text-align: center; margin: 15px 0; }
        .image-container img { max-width: 300px; max-height: 300px; border: 2px solid #ddd; border-radius: 4px; }
        .image-placeholder { color: #999; font-style: italic; padding: 20px; background-color: #f5f5f5; border-radius: 4px; }
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      </style>
    </head>
    <body>
      <h1>Shree I Jewellery</h1>
      <h2>Orders - ${new Date().toLocaleDateString()}</h2>
  `;

  for (const designCode of sortedDesignCodes) {
    const designOrders = groupedOrders[designCode];
    const base64Image = imageMap.get(designCode);

    html += `<div class="design-group">`;
    html += `<div class="design-header">Design: ${designCode}</div>`;
    
    html += `<div class="image-container">`;
    if (base64Image) {
      html += `<img src="${base64Image}" alt="Design ${designCode}" />`;
    } else {
      html += `<div class="image-placeholder">Image Not Available</div>`;
    }
    html += `</div>`;

    html += `<table>
      <thead>
        <tr>
          <th>Generic Name</th>
          <th>Weight</th>
          <th>Qty</th>
          <th>Size</th>
          <th>Remarks</th>
          <th>Order No</th>
        </tr>
      </thead>
      <tbody>`;

    designOrders.forEach((order) => {
      html += `<tr>
        <td>${order.genericName || "-"}</td>
        <td>${order.weight.toFixed(3)}</td>
        <td>${order.quantity}</td>
        <td>${order.size.toFixed(2)}</td>
        <td>${order.remarks || "-"}</td>
        <td>${order.orderNo}</td>
      </tr>`;
    });

    html += `</tbody></table></div>`;
  }

  html += `</body></html>`;

  // Create blob
  const blob = new Blob([html], { type: 'text/html' });
  const blobUrl = URL.createObjectURL(blob);
  
  // Mobile-friendly approach: Open in new window for printing
  const printWindow = window.open(blobUrl, '_blank');
  if (printWindow) {
    printWindow.addEventListener('load', () => {
      setTimeout(() => {
        printWindow.print();
      }, 500);
    });
  } else {
    // Fallback: If popup blocked, try direct download
    downloadBlobOnMobile(blob, `orders_${new Date().toISOString().split("T")[0]}.html`);
  }
  
  return blobUrl;
}

export async function exportToJPEG(orders: Order[]) {
  const groupedOrders = orders.reduce((acc, order) => {
    if (!acc[order.design]) {
      acc[order.design] = [];
    }
    acc[order.design].push(order);
    return acc;
  }, {} as Record<string, Order[]>);

  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: Arial, sans-serif; font-size: 12px; padding: 20px; background: white; }
        h1 { text-align: center; margin-bottom: 5px; }
        h2 { text-align: center; margin-top: 0; margin-bottom: 20px; font-weight: normal; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; font-weight: bold; }
        .design-header { font-weight: bold; font-size: 14px; margin: 20px 0 10px 0; }
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      </style>
    </head>
    <body>
      <h1>Shree I Jewellery</h1>
      <h2>Orders - ${new Date().toLocaleDateString()}</h2>
  `;

  for (const [design, designOrders] of Object.entries(groupedOrders)) {
    html += `<div class="design-header">Design: ${design}</div>`;
    html += `<table>
      <thead>
        <tr>
          <th>Generic Name</th>
          <th>Karigar</th>
          <th>Weight</th>
          <th>Size</th>
          <th>Qty</th>
          <th>Remarks</th>
          <th>Order No</th>
        </tr>
      </thead>
      <tbody>`;

    designOrders.forEach((order) => {
      html += `<tr>
        <td>${order.genericName || "-"}</td>
        <td>${order.karigarName || "-"}</td>
        <td>${order.weight.toFixed(3)}</td>
        <td>${order.size.toFixed(2)}</td>
        <td>${order.quantity}</td>
        <td>${order.remarks || "-"}</td>
        <td>${order.orderNo}</td>
      </tr>`;
    });

    html += `</tbody></table>`;
  }

  html += `</body></html>`;

  // Create blob
  const blob = new Blob([html], { type: 'text/html' });
  const blobUrl = URL.createObjectURL(blob);

  // Mobile-friendly approach
  const printWindow = window.open(blobUrl, '_blank');
  if (printWindow) {
    printWindow.addEventListener('load', () => {
      setTimeout(() => {
        printWindow.print();
      }, 500);
    });
  } else {
    // Fallback for blocked popups
    downloadBlobOnMobile(blob, `orders_${new Date().toISOString().split("T")[0]}.html`);
  }
}

export async function exportKarigarToPDF(orders: Order[], karigarName: string, actor?: any): Promise<string> {
  // Group orders by design code
  const groupedOrders = orders.reduce((acc, order) => {
    if (!acc[order.design]) {
      acc[order.design] = [];
    }
    acc[order.design].push(order);
    return acc;
  }, {} as Record<string, Order[]>);

  // Sort design codes numerically (lower to higher)
  const sortedDesignCodes = Object.keys(groupedOrders).sort((a, b) => {
    return extractNumericPortion(a) - extractNumericPortion(b);
  });

  // Fetch all design images in parallel
  const imagePromises = sortedDesignCodes.map(async (designCode) => {
    const base64Image = actor ? await fetchDesignImageAsBase64(designCode, actor) : null;
    return { designCode, base64Image };
  });

  const imageResults = await Promise.all(imagePromises);
  const imageMap = new Map(imageResults.map(r => [r.designCode, r.base64Image]));

  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        @page { size: A4; margin: 20mm; }
        body { font-family: Arial, sans-serif; font-size: 12px; }
        h1 { text-align: center; margin-bottom: 5px; }
        h2 { text-align: center; margin-top: 0; margin-bottom: 20px; font-weight: normal; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #4CAF50; color: white; font-weight: bold; }
        .design-group { page-break-after: always; }
        .design-header { 
          background-color: #4CAF50; 
          color: white; 
          font-weight: bold; 
          font-size: 16px; 
          padding: 12px; 
          margin: 20px 0 10px 0; 
          border-radius: 4px;
        }
        .image-container { text-align: center; margin: 15px 0; }
        .image-container img { max-width: 300px; max-height: 300px; border: 2px solid #ddd; border-radius: 4px; }
        .image-placeholder { color: #999; font-style: italic; padding: 20px; background-color: #f5f5f5; border-radius: 4px; }
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      </style>
    </head>
    <body>
      <h1>Shree I Jewellery</h1>
      <h2>Orders - ${new Date().toLocaleDateString()}</h2>
  `;

  for (const designCode of sortedDesignCodes) {
    const designOrders = groupedOrders[designCode];
    const base64Image = imageMap.get(designCode);

    html += `<div class="design-group">`;
    html += `<div class="design-header">Design: ${designCode}</div>`;
    
    html += `<div class="image-container">`;
    if (base64Image) {
      html += `<img src="${base64Image}" alt="Design ${designCode}" />`;
    } else {
      html += `<div class="image-placeholder">Image Not Available</div>`;
    }
    html += `</div>`;

    html += `<table>
      <thead>
        <tr>
          <th>Generic Name</th>
          <th>Weight</th>
          <th>Qty</th>
          <th>Size</th>
          <th>Remarks</th>
          <th>Design</th>
          <th>Order No</th>
        </tr>
      </thead>
      <tbody>`;

    designOrders.forEach((order) => {
      html += `<tr>
        <td>${order.genericName || "-"}</td>
        <td>${order.weight.toFixed(3)}</td>
        <td>${order.quantity}</td>
        <td>${order.size.toFixed(2)}</td>
        <td>${order.remarks || "-"}</td>
        <td>${order.design}</td>
        <td>${order.orderNo}</td>
      </tr>`;
    });

    html += `</tbody></table></div>`;
  }

  html += `</body></html>`;

  // Create blob
  const blob = new Blob([html], { type: 'text/html' });
  const blobUrl = URL.createObjectURL(blob);
  
  // Mobile-friendly approach
  const printWindow = window.open(blobUrl, '_blank');
  if (printWindow) {
    printWindow.addEventListener('load', () => {
      setTimeout(() => {
        printWindow.print();
      }, 500);
    });
  } else {
    // Fallback for blocked popups
    downloadBlobOnMobile(blob, `karigar_${karigarName}_${new Date().toISOString().split("T")[0]}.html`);
  }
  
  return blobUrl;
}
