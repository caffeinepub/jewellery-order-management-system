import { Order } from '../backend';

function getOrderStatusLabel(status: Order['status']): string {
  if (status === 'Ready') return 'Ready';
  if (status === 'Hallmark') return 'Hallmark';
  if (status === 'ReturnFromHallmark') return 'Return From Hallmark';
  return 'Pending';
}

function getOrderTypeLabel(type: Order['orderType']): string {
  if (type === 'CO') return 'CO';
  if (type === 'RB') return 'RB';
  if (type === 'SO') return 'SO';
  return String(type);
}

function formatDate(time?: bigint): string {
  if (!time) return '-';
  const ms = Number(time) / 1_000_000;
  return new Date(ms).toLocaleDateString('en-IN');
}

// ─── Excel Export ────────────────────────────────────────────────────────────

export function exportToExcel(orders: Order[], filename = 'orders'): void {
  try {
    const headers = [
      'Order No', 'Order Type', 'Design Code', 'Generic Name', 'Karigar',
      'Weight (g)', 'Quantity', 'Status', 'Order Date', 'Ready Date', 'Remarks'
    ];

    const rows = orders.map(o => [
      o.orderNo,
      getOrderTypeLabel(o.orderType),
      o.design,
      o.genericName ?? '-',
      o.karigarName ?? '-',
      o.weight.toFixed(3),
      String(o.quantity),
      getOrderStatusLabel(o.status),
      formatDate(o.orderDate),
      formatDate(o.readyDate),
      o.remarks ?? ''
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    triggerDownload(blob, `${filename}.csv`);
  } catch (err) {
    console.error('Excel export failed:', err);
    alert('Export failed. Please try again.');
  }
}

// ─── PDF Export ──────────────────────────────────────────────────────────────

export async function exportToPDF(orders: Order[], filename = 'orders'): Promise<void> {
  try {
    const jsPDF = await loadJsPDF();

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = 210;
    const pageH = 297;
    const margin = 14;
    const contentW = pageW - margin * 2;

    orders.forEach((order, idx) => {
      if (idx > 0) doc.addPage();

      // Header bar
      doc.setFillColor(249, 115, 22);
      doc.rect(0, 0, pageW, 18, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text('Order Details', margin, 12);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Page ${idx + 1} of ${orders.length}`, pageW - margin, 12, { align: 'right' });

      // Card background
      doc.setFillColor(30, 30, 30);
      doc.roundedRect(margin, 24, contentW, pageH - 40, 4, 4, 'F');

      const fields: [string, string][] = [
        ['Order No', order.orderNo],
        ['Order Type', getOrderTypeLabel(order.orderType)],
        ['Design Code', order.design],
        ['Generic Name', order.genericName ?? '-'],
        ['Karigar', order.karigarName ?? '-'],
        ['Weight', `${order.weight.toFixed(3)} g`],
        ['Quantity', String(order.quantity)],
        ['Status', getOrderStatusLabel(order.status)],
        ['Order Date', formatDate(order.orderDate)],
        ['Ready Date', formatDate(order.readyDate)],
        ['Remarks', order.remarks || '-'],
      ];

      let y = 36;
      const labelX = margin + 6;
      const valueX = margin + 60;

      fields.forEach(([label, value]) => {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(180, 180, 180);
        doc.text(label, labelX, y);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(240, 240, 240);
        const lines = doc.splitTextToSize(value, contentW - 70);
        doc.text(lines, valueX, y);
        y += Math.max(8, lines.length * 6);
      });

      doc.setFontSize(7);
      doc.setTextColor(120, 120, 120);
      doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, margin, pageH - 6);
    });

    const pdfBlob = doc.output('blob');
    triggerDownload(pdfBlob, `${filename}.pdf`);
  } catch (err) {
    console.error('PDF export failed:', err);
    alert('PDF export failed. Please try again.');
  }
}

// Alias for KarigarDetail backward compatibility
export async function exportKarigarToPDF(orders: Order[], _karigarName: string, _actor?: any): Promise<void> {
  return exportToPDF(orders, `karigar-orders`);
}

// ─── JPEG Export ─────────────────────────────────────────────────────────────

export async function exportToJPEG(orders: Order[], filename = 'orders'): Promise<void> {
  try {
    const CARD_W = 800;
    const CARD_H = 320;
    const PADDING = 28;
    const HEADER_H = 52;
    const ROW_H = 28;
    const COLS_PER_ROW = 2;
    const CARDS_PER_COL = Math.ceil(orders.length / COLS_PER_ROW);

    const canvasW = CARD_W * COLS_PER_ROW;
    const canvasH = HEADER_H + CARDS_PER_COL * CARD_H;

    const canvas = document.createElement('canvas');
    canvas.width = canvasW;
    canvas.height = canvasH;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not available');

    // Background
    ctx.fillStyle = '#111111';
    ctx.fillRect(0, 0, canvasW, canvasH);

    // Header
    ctx.fillStyle = '#f97316';
    ctx.fillRect(0, 0, canvasW, HEADER_H);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px Arial, sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillText('Orders Export', PADDING, HEADER_H / 2);
    ctx.font = '16px Arial, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.textAlign = 'right';
    ctx.fillText(new Date().toLocaleString('en-IN'), canvasW - PADDING, HEADER_H / 2);
    ctx.textAlign = 'left';

    orders.forEach((order, idx) => {
      const col = idx % COLS_PER_ROW;
      const row = Math.floor(idx / COLS_PER_ROW);
      const x = col * CARD_W;
      const y = HEADER_H + row * CARD_H;

      // Card background
      ctx.fillStyle = '#1e1e1e';
      ctx.fillRect(x + 4, y + 4, CARD_W - 8, CARD_H - 8);

      // Card border
      ctx.strokeStyle = '#333333';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 4, y + 4, CARD_W - 8, CARD_H - 8);

      // Design code
      ctx.fillStyle = '#f97316';
      ctx.font = 'bold 18px Arial, sans-serif';
      ctx.fillText(order.design, x + PADDING, y + 28);

      // Order no
      ctx.fillStyle = '#aaaaaa';
      ctx.font = '14px Arial, sans-serif';
      ctx.fillText(`#${order.orderNo}`, x + PADDING + 200, y + 28);

      // Status
      const statusColor = order.status === 'Ready' ? '#22c55e'
        : order.status === 'Hallmark' ? '#3b82f6'
        : order.status === 'ReturnFromHallmark' ? '#a855f7'
        : '#f97316';
      ctx.fillStyle = statusColor;
      ctx.font = 'bold 12px Arial, sans-serif';
      ctx.fillText(getOrderStatusLabel(order.status), x + CARD_W - PADDING - 120, y + 28);

      // Divider
      ctx.strokeStyle = '#333333';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + PADDING, y + 40);
      ctx.lineTo(x + CARD_W - PADDING, y + 40);
      ctx.stroke();

      // Fields
      const fields: [string, string][] = [
        ['Type', getOrderTypeLabel(order.orderType)],
        ['Generic', order.genericName ?? '-'],
        ['Karigar', order.karigarName ?? '-'],
        ['Weight', `${order.weight.toFixed(3)} g`],
        ['Qty', String(order.quantity)],
        ['Order Date', formatDate(order.orderDate)],
        ['Ready Date', formatDate(order.readyDate)],
        ['Remarks', order.remarks || '-'],
      ];

      const halfLen = Math.ceil(fields.length / 2);
      fields.forEach(([label, value], fi) => {
        const col2 = fi < halfLen ? 0 : 1;
        const row2 = fi < halfLen ? fi : fi - halfLen;
        const fx = x + PADDING + col2 * (CARD_W / 2 - PADDING);
        const fy = y + 52 + row2 * ROW_H;

        ctx.fillStyle = '#888888';
        ctx.font = '12px Arial, sans-serif';
        ctx.fillText(label + ':', fx, fy);

        ctx.fillStyle = '#eeeeee';
        ctx.font = '13px Arial, sans-serif';
        const displayVal = value.length > 22 ? value.substring(0, 22) + '…' : value;
        ctx.fillText(displayVal, fx + 72, fy);
      });
    });

    await new Promise<void>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) { reject(new Error('Canvas toBlob returned null')); return; }
          // filename may be passed as old-style actor object from legacy callers — guard it
          const safeName = typeof filename === 'string' ? filename : 'orders';
          triggerDownload(blob, `${safeName}.jpg`);
          resolve();
        },
        'image/jpeg',
        0.92
      );
    });
  } catch (err) {
    console.error('JPEG export failed:', err);
    alert('JPEG export failed. Please try again.');
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 300);
}

function loadJsPDF(): Promise<any> {
  return new Promise((resolve, reject) => {
    if ((window as any).jspdf?.jsPDF) {
      resolve((window as any).jspdf.jsPDF);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    script.onload = () => {
      if ((window as any).jspdf?.jsPDF) {
        resolve((window as any).jspdf.jsPDF);
      } else {
        reject(new Error('jsPDF failed to load'));
      }
    };
    script.onerror = () => reject(new Error('Failed to load jsPDF script'));
    document.head.appendChild(script);
  });
}
