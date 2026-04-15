import { jsPDF } from 'jspdf';

export interface InvoiceItem {
  item_name: string;
  item_price: number;
  quantity: number;
  line_total: number;
  selected_modifiers: Array<{ name: string; price: number }> | null;
  base_item_price: number;
  modifier_total: number;
  item_note: string | null;
}

export interface InvoiceOffer {
  type: 'auto_offer';
  code?: string | null;
  title?: string | null;
  name?: string | null;
  headline?: string | null;
  offerName?: string | null;
  description?: string | null;
  discountType?: 'percent' | 'amount';
  value?: number;
  discountAmount?: number;
}

export interface InvoiceData {
  orderNumber: string;
  restaurantName: string;
  customerName: string;
  email: string;
  phone: string;
  fulfillmentLabel: string;
  address: string;
  pickupAddress?: string | null;
  paymentMethod: string;
  placedAt: string;
  items: InvoiceItem[];
  subtotal: number | null;
  total: number | null;
  discount: number | null;
  loyaltyDiscount?: number | null;
  loyaltyPointsRedeemed?: number | null;
  deliveryFee: number | null;
  tip: number | null;
  tax: number | null;
  offerApplied: InvoiceOffer | null;
  couponCode: string;
  giftCardCode: string;
  orderNote: string;
}

function fmt(n: number | null | undefined): string {
  if (n == null) return '$0.00';
  return `$${Number(n).toFixed(2)}`;
}

function resolveOfferTitle(offer: InvoiceOffer): string {
  const candidates = [offer.title, offer.name, offer.headline, offer.offerName, offer.code];
  const resolved = candidates.find(
    (value): value is string => typeof value === 'string' && value.trim().length > 0,
  );
  return resolved || 'Promotion';
}

export function generateInvoicePDF(data: InvoiceData): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;

  // Header
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Invoice', 14, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120, 113, 108);
  doc.text(data.restaurantName || 'Restaurant', 14, y);
  y += 12;

  // Order details
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10);
  const details = [
    ['Order #', data.orderNumber],
    ['Date', data.placedAt],
    ['Customer', data.customerName],
    data.email ? ['Email', data.email] : null,
    data.phone ? ['Phone', data.phone] : null,
    ['Fulfillment', data.fulfillmentLabel],
    data.address ? ['Delivery address', data.address] : null,
    data.pickupAddress ? ['Pickup from', data.pickupAddress] : null,
    data.paymentMethod ? ['Payment', data.paymentMethod] : null,
  ].filter(Boolean) as [string, string][];

  for (const [label, value] of details) {
    doc.setFont('helvetica', 'bold');
    doc.text(label + ':', 14, y);
    doc.setFont('helvetica', 'normal');
    const maxValueWidth = pageWidth - 55 - 14;
    const valueLines = doc.splitTextToSize(value, maxValueWidth);
    doc.text(valueLines, 55, y);
    y += 6 * valueLines.length;
  }
  y += 6;

  // Items table header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Item', 14, y);
  doc.text('Qty', 130, y, { align: 'center' });
  doc.text('Total', pageWidth - 14, y, { align: 'right' });
  y += 2;
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.5);
  doc.line(14, y, pageWidth - 14, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  for (const item of data.items) {
    if (y > 255) {
      doc.addPage();
      y = 20;
    }

    // Item name + qty + total
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(item.item_name, 14, y);
    doc.setFont('helvetica', 'normal');
    doc.text(`x${item.quantity}`, 130, y, { align: 'center' });
    doc.text(fmt(item.line_total), pageWidth - 14, y, { align: 'right' });
    y += 5;

    // Base price per unit
    doc.setTextColor(120, 113, 108);
    doc.setFontSize(8);
    doc.text(`Base price: ${fmt(item.base_item_price)} each`, 16, y);
    y += 4;

    // Modifiers breakdown
    if (item.selected_modifiers && item.selected_modifiers.length > 0) {
      for (const mod of item.selected_modifiers) {
        if (y > 275) {
          doc.addPage();
          y = 20;
        }
        const modLine = mod.price > 0
          ? `+ ${mod.name}: ${fmt(mod.price)}`
          : `+ ${mod.name}`;
        doc.text(modLine, 18, y);
        y += 4;
      }
      if (item.modifier_total > 0) {
        doc.text(`Modifier total: ${fmt(item.modifier_total)}`, 18, y);
        y += 4;
      }
    }

    // Item note
    if (item.item_note) {
      doc.setTextColor(100, 100, 100);
      const noteLines = doc.splitTextToSize(`Note: ${item.item_note}`, pageWidth - 32);
      doc.text(noteLines, 16, y);
      y += noteLines.length * 4;
    }

    doc.setFontSize(10);
    doc.setTextColor(229, 231, 228);
    doc.setLineWidth(0.2);
    doc.line(14, y + 1, pageWidth - 14, y + 1);
    y += 6;
  }

  // Order note
  if (data.orderNote) {
    if (y > 260) {
      doc.addPage();
      y = 20;
    }
    doc.setTextColor(120, 113, 108);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    const noteLines = doc.splitTextToSize(`Order note: ${data.orderNote}`, pageWidth - 28);
    doc.text(noteLines, 14, y);
    y += noteLines.length * 4 + 4;
    doc.setFont('helvetica', 'normal');
  }

  // Totals
  y += 4;
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10);

  if (typeof data.subtotal === 'number') {
    doc.text('Subtotal', 14, y);
    doc.text(fmt(data.subtotal), pageWidth - 14, y, { align: 'right' });
    y += 6;
  }
  const hasOfferOrCodeDetails = Boolean(
    data.offerApplied ||
    (typeof data.couponCode === 'string' && data.couponCode.trim()) ||
    (typeof data.giftCardCode === 'string' && data.giftCardCode.trim()),
  );

  if (typeof data.deliveryFee === 'number' && data.deliveryFee > 0) {
    doc.text('Delivery fee', 14, y);
    doc.text(fmt(data.deliveryFee), pageWidth - 14, y, { align: 'right' });
    y += 6;
  }
  if (typeof data.discount === 'number' && data.discount > 0) {
    const loyaltyAmt = typeof data.loyaltyDiscount === 'number' ? data.loyaltyDiscount : 0;
    const otherAmt = data.discount - loyaltyAmt;
    if (otherAmt > 0.005) {
      doc.setTextColor(5, 150, 105);
      doc.text('Discount', 14, y);
      doc.text(`-${fmt(otherAmt)}`, pageWidth - 14, y, { align: 'right' });
      y += 5;
      doc.setTextColor(15, 23, 42);
    }
    if (loyaltyAmt > 0.005) {
      doc.setTextColor(180, 120, 0);
      doc.text('Loyalty Discount', 14, y);
      doc.text(`-${fmt(loyaltyAmt)}`, pageWidth - 14, y, { align: 'right' });
      y += 4;
      if (typeof data.loyaltyPointsRedeemed === 'number' && data.loyaltyPointsRedeemed > 0) {
        doc.setFontSize(8);
        doc.text(`${data.loyaltyPointsRedeemed} points redeemed`, 14, y);
        doc.setFontSize(10);
        y += 4;
      }
      doc.setTextColor(15, 23, 42);
    }
    if (otherAmt <= 0.005 && loyaltyAmt <= 0.005) {
      doc.setTextColor(5, 150, 105);
      doc.text('Discount', 14, y);
      doc.text(`-${fmt(data.discount)}`, pageWidth - 14, y, { align: 'right' });
      y += 5;
      doc.setTextColor(15, 23, 42);
    }
  }

  if (hasOfferOrCodeDetails) {
    doc.setTextColor(5, 150, 105);
    doc.setFontSize(8);
    if (data.offerApplied) {
      const discountSuffix =
        data.offerApplied.discountType === 'percent' &&
        typeof data.offerApplied.value === 'number'
          ? ` (${data.offerApplied.value}% off)`
          : '';
      const offerDetail = `Offer Applied: ${resolveOfferTitle(data.offerApplied)}${discountSuffix}`;
      doc.text(offerDetail, 14, y);
      y += 4;
    }
    if (typeof data.couponCode === 'string' && data.couponCode.trim()) {
      doc.text(`Coupon: ${data.couponCode.trim()}`, 14, y);
      y += 4;
    }
    if (typeof data.giftCardCode === 'string' && data.giftCardCode.trim()) {
      doc.text(`Gift Card: ${data.giftCardCode.trim()}`, 14, y);
      y += 4;
    }
    doc.setFontSize(10);
    y += 1;
    doc.setTextColor(15, 23, 42);
  }
  if (typeof data.tip === 'number' && data.tip > 0) {
    doc.text('Tip', 14, y);
    doc.text(fmt(data.tip), pageWidth - 14, y, { align: 'right' });
    y += 6;
  }
  if (typeof data.tax === 'number' && data.tax > 0) {
    doc.text('Service Fee', 14, y);
    doc.text(fmt(data.tax), pageWidth - 14, y, { align: 'right' });
    y += 6;
  }

  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.5);
  doc.line(14, y, pageWidth - 14, y);
  y += 6;

  if (typeof data.total === 'number') {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Total', 14, y);
    doc.text(fmt(data.total), pageWidth - 14, y, { align: 'right' });
  }

  return doc;
}
