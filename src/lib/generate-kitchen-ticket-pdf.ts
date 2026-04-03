import { jsPDF } from 'jspdf';

export interface KitchenTicketItem {
  item_name: string;
  quantity: number;
  selected_modifiers: Array<{ name: string; groupName?: string; price?: number }> | null;
  item_note: string | null;
}

export interface KitchenTicketData {
  orderNumber: string;
  restaurantName: string;
  fulfillmentLabel: string;
  placedAt: string;
  items: KitchenTicketItem[];
  orderNote: string;
}

export function generateKitchenTicketPDF(data: KitchenTicketData): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: [80, 200] });
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 8;

  // Header
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('KITCHEN TICKET', pageWidth / 2, y, { align: 'center' });
  y += 6;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text(data.restaurantName, pageWidth / 2, y, { align: 'center' });
  y += 5;

  // Dashed separator
  doc.setDrawColor(150);
  doc.setLineDashPattern([1, 1], 0);
  doc.line(4, y, pageWidth - 4, y);
  y += 5;

  // Order info
  doc.setTextColor(0);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`#${data.orderNumber}`, pageWidth / 2, y, { align: 'center' });
  y += 5;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text(data.placedAt, pageWidth / 2, y, { align: 'center' });
  y += 4;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0);
  doc.text(data.fulfillmentLabel.toUpperCase(), pageWidth / 2, y, { align: 'center' });
  y += 4;

  // Separator
  doc.setLineDashPattern([1, 1], 0);
  doc.line(4, y, pageWidth - 4, y);
  y += 5;

  // Items
  for (const item of data.items) {
    // Check page overflow — add new page if needed
    if (y > 185) {
      doc.addPage();
      y = 8;
    }

    // Quantity x Item name
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    const itemLine = `${item.quantity}x  ${item.item_name}`;
    const wrappedName = doc.splitTextToSize(itemLine, pageWidth - 8);
    doc.text(wrappedName, 4, y);
    y += wrappedName.length * 4.5;

    // Modifiers
    if (item.selected_modifiers && item.selected_modifiers.length > 0) {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60, 60, 60);
      for (const mod of item.selected_modifiers) {
        if (y > 190) {
          doc.addPage();
          y = 8;
        }
        const priceSuffix = typeof mod.price === 'number' && mod.price > 0 ? ` ($${mod.price.toFixed(2)})` : '';
        const groupPrefix = mod.groupName ? `[${mod.groupName}] ` : '';
        doc.text(`  + ${groupPrefix}${mod.name}${priceSuffix}`, 6, y);
        y += 3.5;
      }
    }

    // Item note
    if (item.item_note) {
      if (y > 190) {
        doc.addPage();
        y = 8;
      }
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(120, 50, 50);
      const noteLines = doc.splitTextToSize(`NOTE: ${item.item_note}`, pageWidth - 12);
      doc.text(noteLines, 6, y);
      y += noteLines.length * 3.5;
    }

    y += 3;
  }

  // Order note
  if (data.orderNote) {
    if (y > 180) {
      doc.addPage();
      y = 8;
    }
    doc.setLineDashPattern([1, 1], 0);
    doc.setDrawColor(150);
    doc.line(4, y, pageWidth - 4, y);
    y += 5;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text('ORDER NOTE:', 4, y);
    y += 4;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const noteLines = doc.splitTextToSize(data.orderNote, pageWidth - 8);
    doc.text(noteLines, 4, y);
    y += noteLines.length * 3.5;
  }

  // Bottom separator
  y += 3;
  doc.setLineDashPattern([1, 1], 0);
  doc.setDrawColor(150);
  doc.line(4, y, pageWidth - 4, y);

  return doc;
}
