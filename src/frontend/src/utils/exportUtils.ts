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

// Detect if device is iOS
function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
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
  
  // iOS-compatible export: open in new window
  if (isIOS()) {
    const printWindow = window.open(blobUrl, '_blank');
    if (printWindow) {
      printWindow.addEventListener('load', () => {
        setTimeout(() => {
          printWindow.print();
        }, 250);
      });
    } else {
      throw new Error('Failed to open print window. Please allow popups for this site.');
    }
  } else {
    // Desktop: open in new window for printing
    const printWindow = window.open(blobUrl, '_blank');
    if (printWindow) {
      printWindow.addEventListener('load', () => {
        setTimeout(() => {
          printWindow.print();
        }, 250);
      });
    }
  }
  
  return blobUrl;
}

export async function exportToJPEG(orders: Order[], actor?: any) {
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
      <style>
        body { font-family: Arial, sans-serif; font-size: 12px; padding: 20px; background: white; }
        h1 { text-align: center; margin-bottom: 5px; }
        h2 { text-align: center; margin-top: 0; margin-bottom: 20px; font-weight: normal; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #4CAF50; color: white; font-weight: bold; }
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
      </style>
    </head>
    <body>
      <h1>Shree I Jewellery</h1>
      <h2>Orders - ${new Date().toLocaleDateString()}</h2>
  `;

  for (const designCode of sortedDesignCodes) {
    const designOrders = groupedOrders[designCode];
    const base64Image = imageMap.get(designCode);

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

  // iOS-compatible export: open in new window
  if (isIOS()) {
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 250);
    } else {
      throw new Error('Failed to open print window. Please allow popups for this site.');
    }
  } else {
    // Desktop: standard approach
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 250);
    }
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
  
  // iOS-compatible export: open in new window
  if (isIOS()) {
    const printWindow = window.open(blobUrl, '_blank');
    if (printWindow) {
      printWindow.addEventListener('load', () => {
        setTimeout(() => {
          printWindow.print();
        }, 250);
      });
    } else {
      throw new Error('Failed to open print window. Please allow popups for this site.');
    }
  } else {
    // Desktop: open in new window for printing
    const printWindow = window.open(blobUrl, '_blank');
    if (printWindow) {
      printWindow.addEventListener('load', () => {
        setTimeout(() => {
          printWindow.print();
        }, 250);
      });
    }
  }
  
  return blobUrl;
}
