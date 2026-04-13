import { jsPDF } from 'jspdf';
import type {
  RestaurantPayoutStatement,
  RestaurantPayoutStatementOrder,
} from '@/lib/server/restaurant-payouts';

type SummaryRow = {
  label: string;
  quantity?: string;
  amountWithoutTax: number;
  taxRateLabel: string;
  taxAmount: number;
  totalAmount: number;
  bold?: boolean;
};

type LedgerRow = {
  date: string;
  serial: string;
  type: string;
  transactionId: string;
  productValue?: number | null;
  netProductValue?: number | null;
  paymentMethod: string;
  orderMethod: string;
  totalProductValue?: number | null;
  totalDeliveryFees?: number | null;
};

type TipsRow = {
  date: string;
  type: string;
  transactionId: string;
  amount: number;
};

const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const PAGE_LEFT = 12;
const PAGE_RIGHT = PAGE_WIDTH - 12;
const FOOTER_TOP = 272;
const FOOTER_TEXT_Y = 278;
const TABLE_LINE_COLOR: [number, number, number] = [17, 24, 39];
const LIGHT_LINE_COLOR: [number, number, number] = [220, 226, 234];
const TEXT_COLOR: [number, number, number] = [17, 24, 39];
const SUBTLE_TEXT_COLOR: [number, number, number] = [51, 65, 85];
const BRAND_BOX_X = PAGE_RIGHT - 35;
const BRAND_BOX_Y = 18;
const BRAND_BOX_W = 31;
const BRAND_BOX_H = 12;

export function generatePayoutStatementPDF(
  data: RestaurantPayoutStatement,
): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const metrics = buildMetrics(data);

  drawPayoutPage(doc, data, metrics);
  drawServiceFeeInvoicePage(doc, data, metrics);
  drawSalesReportPages(doc, data);
  drawTipsPages(doc, data);

  return doc;
}

function drawSectionRule(doc: jsPDF, y: number, width = PAGE_RIGHT) {
  doc.setDrawColor(...TABLE_LINE_COLOR);
  doc.setLineWidth(0.35);
  doc.line(PAGE_LEFT, y, width, y);
}

function drawPayoutPage(
  doc: jsPDF,
  data: RestaurantPayoutStatement,
  metrics: ReturnType<typeof buildMetrics>,
) {
  drawDocumentHeader(doc, {
    title: 'Payout',
    restaurantName: data.restaurant.name,
    restaurantAddress: data.restaurant.fullAddress,
    secondaryLabel: data.restaurant.name,
    secondaryValue: data.batch.stripeConnectedAccountId || 'Connected account unavailable',
    reportDate: formatReportDate(data.generatedAt),
    periodLabel: buildPeriodLabel(data.batch.periodStart, data.batch.periodEnd),
  });

  let y = 108;

  y = drawSummaryTableWithQuantity(doc, y, 'Total sales', data.currency, [
    {
      label: 'Sum sold items',
      quantity: String(data.batch.orderCount),
      amountWithoutTax: metrics.productSalesWithoutTax,
      taxRateLabel: '0.00%',
      taxAmount: 0,
      totalAmount: metrics.productSalesWithoutTax,
    },
    {
      label: 'Deliveries sold by the restaurant',
      quantity: String(metrics.deliveryOrderCount),
      amountWithoutTax: data.totals.deliveryFeeTotal,
      taxRateLabel: '0.00%',
      taxAmount: 0,
      totalAmount: data.totals.deliveryFeeTotal,
    },
    {
      label: 'Total',
      quantity: '',
      amountWithoutTax: metrics.salesSectionWithoutTax,
      taxRateLabel: '0.00%',
      taxAmount: 0,
      totalAmount: metrics.salesSectionWithoutTax,
      bold: true,
    },
  ]);

  y += 10;
  y = drawSummaryTableWithoutQuantity(doc, y, 'Sales correction', data.currency, [
    {
      label: 'Online service fee paid by the customer in addition to the order price',
      amountWithoutTax: data.totals.serviceFeeTotal,
      taxRateLabel: metrics.serviceFeeTaxRateLabel,
      taxAmount: data.totals.stateTaxTotal,
      totalAmount: data.totals.serviceFeeTotal + data.totals.stateTaxTotal,
    },
    {
      label: 'Total',
      amountWithoutTax: data.totals.serviceFeeTotal,
      taxRateLabel: metrics.serviceFeeTaxRateLabel,
      taxAmount: data.totals.stateTaxTotal,
      totalAmount: data.totals.serviceFeeTotal + data.totals.stateTaxTotal,
      bold: true,
    },
  ]);

  y += 10;
  y = drawSimpleAmountSection(
    doc,
    y,
    'Tips',
    'Tips',
    data.totals.tipTotal,
    'Total tips',
    data.currency,
  );

  y += 10;
  y = drawSimpleAmountSection(
    doc,
    y,
    'Card payment fees',
    'Card payment fees',
    0,
    'Amount',
    data.currency,
  );

  const payoutBreakdownRows = [
    {
      label: 'Total sales',
      value: formatCurrency(data.totals.grossSales, data.currency),
    },
    {
      label: 'Card payment fees',
      value: `-${formatCurrency(0, data.currency)}`,
    },
    {
      label: 'Summary service fee items (see page 2)',
      value: `-${formatCurrency(
        data.totals.serviceFeeTotal + data.totals.stateTaxTotal,
        data.currency,
      )}`,
    },
    {
      label: 'Delivery fees deducted',
      value: `-${formatCurrency(data.totals.deliveryFeeTotal, data.currency)}`,
    },
    {
      label: 'Refund adjustments',
      value: `-${formatCurrency(data.totals.refundTotal, data.currency)}`,
    },
    {
      label: 'Cash amount (already collected by restaurant)',
      value: formatCurrency(0, data.currency),
      bold: true,
    },
    {
      label: 'Online payout amount (transfer to bank account)',
      value: formatCurrency(data.totals.netPayoutAmount, data.currency),
      bold: true,
    },
  ];
  const payoutBreakdownStartY = Math.max(
    y + 8,
    FOOTER_TOP - getTotalsBreakdownHeight(doc, payoutBreakdownRows) - 3,
  );
  drawTotalsBreakdown(doc, payoutBreakdownStartY, payoutBreakdownRows);

  drawPageFooter(doc, data);
}

function drawServiceFeeInvoicePage(
  doc: jsPDF,
  data: RestaurantPayoutStatement,
  metrics: ReturnType<typeof buildMetrics>,
) {
  doc.addPage();

  drawDocumentHeader(doc, {
    title: `Invoice #${buildInvoiceNumber(data.batch.payoutBatchId)}`,
    restaurantName: data.restaurant.name,
    restaurantAddress: data.restaurant.fullAddress,
    secondaryLabel: data.restaurant.name,
    secondaryValue: data.batch.stripeConnectedAccountId || 'Connected account unavailable',
    reportDate: formatReportDate(data.generatedAt),
    periodLabel: buildPeriodLabel(data.batch.periodStart, data.batch.periodEnd),
  });

  let y = 112;

  y = drawSummaryTableWithoutQuantity(
    doc,
    y,
    'Paid by the customer in addition to the regular order price',
    data.currency,
    [
      {
        label: 'Online service fee',
        amountWithoutTax: data.totals.serviceFeeTotal,
        taxRateLabel: metrics.serviceFeeTaxRateLabel,
        taxAmount: data.totals.stateTaxTotal,
        totalAmount: data.totals.serviceFeeTotal + data.totals.stateTaxTotal,
      },
      {
        label: 'Total',
        amountWithoutTax: data.totals.serviceFeeTotal,
        taxRateLabel: metrics.serviceFeeTaxRateLabel,
        taxAmount: data.totals.stateTaxTotal,
        totalAmount: data.totals.serviceFeeTotal + data.totals.stateTaxTotal,
        bold: true,
      },
    ],
  );

  const invoiceBreakdownRows = [
    {
      label: 'Paid by the customer in addition to the regular order price',
      value: formatCurrency(
        data.totals.serviceFeeTotal + data.totals.stateTaxTotal,
        data.currency,
      ),
    },
    {
      label: 'Total amount',
      value: formatCurrency(
        data.totals.serviceFeeTotal + data.totals.stateTaxTotal,
        data.currency,
      ),
      bold: true,
    },
    {
      label: 'Open invoice amount',
      value: formatCurrency(0, data.currency),
      bold: true,
    },
  ];
  const invoiceBreakdownStartY = Math.max(
    y + 10,
    FOOTER_TOP - getTotalsBreakdownHeight(doc, invoiceBreakdownRows) - 3,
  );
  drawTotalsBreakdown(doc, invoiceBreakdownStartY, invoiceBreakdownRows);

  drawPageFooter(doc, data);
}

function drawSalesReportPages(doc: jsPDF, data: RestaurantPayoutStatement) {
  const rows = buildSalesLedgerRows(data.orders);
  drawLedgerPages(doc, data, 'Sales report', rows);
}

function drawTipsPages(doc: jsPDF, data: RestaurantPayoutStatement) {
  const rows = buildTipsRows(data.orders);
  drawTipsLedgerPages(doc, data, rows);
}

function drawLedgerPages(
  doc: jsPDF,
  data: RestaurantPayoutStatement,
  title: string,
  rows: LedgerRow[],
) {
  const columns = [
    { key: 'date', label: 'Date', width: 19, align: 'left' as const, maxChars: 10 },
    { key: 'serial', label: '#', width: 8, align: 'left' as const, maxChars: 4 },
    { key: 'type', label: 'Type', width: 12, align: 'left' as const, maxChars: 8 },
    {
      key: 'transactionId',
      label: 'Transaction',
      width: 23,
      align: 'left' as const,
      maxChars: 14,
    },
    {
      key: 'productValue',
      label: 'Product',
      width: 16,
      align: 'right' as const,
      maxChars: 11,
    },
    {
      key: 'netProductValue',
      label: 'Net product',
      width: 18,
      align: 'right' as const,
      maxChars: 11,
    },
    {
      key: 'paymentMethod',
      label: 'Payment',
      width: 14,
      align: 'left' as const,
      maxChars: 8,
    },
    {
      key: 'orderMethod',
      label: 'Fulfillment',
      width: 16,
      align: 'left' as const,
      maxChars: 10,
    },
    {
      key: 'totalProductValue',
      label: 'Product total',
      width: 22,
      align: 'right' as const,
      maxChars: 12,
    },
    {
      key: 'totalDeliveryFees',
      label: 'Delivery total',
      width: 22,
      align: 'right' as const,
      maxChars: 12,
    },
  ];

  let rowIndex = 0;

  while (rowIndex < rows.length || rowIndex === 0) {
    doc.addPage();
    drawDocumentHeader(doc, {
      title,
      restaurantName: data.restaurant.name,
      restaurantAddress: data.restaurant.fullAddress,
      secondaryLabel: data.restaurant.name,
      secondaryValue: data.batch.stripeConnectedAccountId || 'Connected account unavailable',
      reportDate: formatReportDate(data.generatedAt),
      periodLabel: buildPeriodLabel(data.batch.periodStart, data.batch.periodEnd),
    });

    let y = 122;
    drawLedgerHeaderRow(doc, y, columns);
    y += 6.5;

    if (rows.length === 0) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...SUBTLE_TEXT_COLOR);
      doc.text('No rows available for this section.', PAGE_LEFT, y + 4);
    }

    while (rowIndex < rows.length) {
      const row = rows[rowIndex];
      if (y > FOOTER_TOP - 8) {
        break;
      }

      drawLedgerRow(doc, y, columns, [
        row.date,
        row.serial,
        row.type,
        row.transactionId,
        row.productValue != null
          ? formatCurrencyShort(row.productValue, data.currency)
          : '',
        row.netProductValue != null
          ? formatCurrencyShort(row.netProductValue, data.currency)
          : '',
        row.paymentMethod,
        row.orderMethod,
        row.totalProductValue != null
          ? formatCurrencyShort(row.totalProductValue, data.currency)
          : '',
        row.totalDeliveryFees != null
          ? formatCurrencyShort(row.totalDeliveryFees, data.currency)
          : '',
      ]);
      y += row.totalProductValue != null || row.totalDeliveryFees != null ? 7 : 6;
      rowIndex += 1;
    }

    drawPageFooter(doc, data);
  }
}

function drawTipsLedgerPages(
  doc: jsPDF,
  data: RestaurantPayoutStatement,
  rows: TipsRow[],
) {
  const columns = [
    { key: 'date', label: 'Date', width: 34, align: 'left' as const, maxChars: 10 },
    { key: 'type', label: 'Type', width: 30, align: 'left' as const, maxChars: 8 },
    {
      key: 'transactionId',
      label: 'Transaction',
      width: 72,
      align: 'left' as const,
      maxChars: 18,
    },
    { key: 'amount', label: 'Amount', width: 32, align: 'right' as const, maxChars: 12 },
  ];

  let rowIndex = 0;

  while (rowIndex < rows.length || rowIndex === 0) {
    doc.addPage();
    drawDocumentHeader(doc, {
      title: 'Tips',
      restaurantName: data.restaurant.name,
      restaurantAddress: data.restaurant.fullAddress,
      secondaryLabel: data.restaurant.name,
      secondaryValue: data.batch.stripeConnectedAccountId || 'Connected account unavailable',
      reportDate: formatReportDate(data.generatedAt),
      periodLabel: buildPeriodLabel(data.batch.periodStart, data.batch.periodEnd),
    });

    let y = 110;
    const tipTotal = rows.reduce((sum, row) => sum + row.amount, 0);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...SUBTLE_TEXT_COLOR);
    doc.text(
      `${rows.length} transactions worth ${formatCurrency(tipTotal, data.currency)}`,
      PAGE_LEFT,
      y,
    );

    y += 12;
    drawLedgerHeaderRow(doc, y, columns);
    y += 6.5;

    if (rows.length === 0) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...SUBTLE_TEXT_COLOR);
      doc.text('No tips available for this payout period.', PAGE_LEFT, y + 4);
    }

    while (rowIndex < rows.length) {
      const row = rows[rowIndex];
      if (y > FOOTER_TOP - 8) {
        break;
      }

      drawLedgerRow(doc, y, columns, [
        row.date,
        row.type,
        row.transactionId,
        formatCurrencyShort(row.amount, data.currency),
      ]);
      y += 6;
      rowIndex += 1;
    }

    if (rows.length > 0 && y <= FOOTER_TOP - 14) {
      doc.setDrawColor(...TABLE_LINE_COLOR);
      doc.setLineWidth(0.4);
      doc.line(PAGE_LEFT, y + 1, PAGE_RIGHT, y + 1);
      y += 7;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...TEXT_COLOR);
      doc.text('Total', PAGE_LEFT, y);
      doc.text(formatCurrency(tipTotal, data.currency), PAGE_RIGHT, y, {
        align: 'right',
      });
    }

    drawPageFooter(doc, data);
  }
}

function drawDocumentHeader(
  doc: jsPDF,
  input: {
    title: string;
    restaurantName: string;
    restaurantAddress: string;
    secondaryLabel: string;
    secondaryValue: string;
    reportDate: string;
    periodLabel: string;
  },
) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...TEXT_COLOR);
  doc.text(input.title, PAGE_LEFT, 23);

  drawBrandMark(doc);

  const addressLines = splitAddressLines(doc, input.restaurantAddress, 74);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.4);
  doc.setTextColor(...TEXT_COLOR);
  doc.text(input.restaurantName, PAGE_LEFT, 43);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...SUBTLE_TEXT_COLOR);
  doc.text(addressLines, PAGE_LEFT, 51);

  const secondBlockY = 67;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.4);
  doc.setTextColor(...TEXT_COLOR);
  doc.text(input.secondaryLabel, PAGE_LEFT, secondBlockY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...SUBTLE_TEXT_COLOR);
  const secondaryLines = splitAddressLines(doc, input.secondaryValue, 74);
  doc.text(secondaryLines, PAGE_LEFT, secondBlockY + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...TEXT_COLOR);
  doc.text(`Invoice date: ${input.reportDate}`, PAGE_RIGHT, 44, { align: 'right' });
  doc.text(`Billing period: ${input.periodLabel}`, PAGE_RIGHT, 51.5, {
    align: 'right',
  });
}

function drawBrandMark(doc: jsPDF) {
  doc.setDrawColor(229, 231, 235);
  doc.setFillColor(250, 250, 252);
  doc.roundedRect(
    BRAND_BOX_X,
    BRAND_BOX_Y,
    BRAND_BOX_W,
    BRAND_BOX_H,
    0.8,
    0.8,
    'FD',
  );

  const iconX = BRAND_BOX_X + 2.6;
  const iconY = BRAND_BOX_Y + 2.1;
  doc.setFillColor(59, 130, 246);
  doc.rect(iconX, iconY, 2.7, 2.7, 'F');
  doc.rect(iconX + 3.5, iconY + 3.6, 2.7, 2.7, 'F');
  doc.setFillColor(99, 102, 241);
  doc.rect(iconX + 3.5, iconY, 2.7, 2.7, 'F');
  doc.rect(iconX, iconY + 3.6, 2.7, 2.7, 'F');
  doc.setFillColor(236, 72, 153);
  doc.rect(iconX + 7, iconY + 1.8, 2.7, 2.7, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.9);
  doc.setTextColor(37, 99, 235);
  doc.text('Antler', BRAND_BOX_X + 12.5, BRAND_BOX_Y + 7.2);
  doc.setTextColor(236, 72, 153);
  doc.text('Foods', BRAND_BOX_X + 21.6, BRAND_BOX_Y + 7.2);
}

function drawSummaryTableWithQuantity(
  doc: jsPDF,
  startY: number,
  title: string,
  currency: string,
  rows: SummaryRow[],
) {
  const headerToRowsGap = 7.8;
  const rowLineHeight = 4.2;
  const rowBottomPadding = 1.8;
  const totalDividerGap = 4.4;
  const col = {
    label: 62,
    quantity: 18,
    amountWithoutTax: 30,
    taxRate: 16,
    tax: 20,
    total: 32,
  };
  const headerY = startY;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...TEXT_COLOR);
  doc.text(title, PAGE_LEFT, headerY);
  doc.text('Quantity', PAGE_LEFT + col.label + col.quantity - 2, headerY, { align: 'right' });
  doc.text('Amount (without tax)', PAGE_LEFT + col.label + col.quantity + col.amountWithoutTax - 2, headerY, { align: 'right' });
  doc.text('Tax %', PAGE_LEFT + col.label + col.quantity + col.amountWithoutTax + col.taxRate - 2, headerY, { align: 'right' });
  doc.text('Tax', PAGE_LEFT + col.label + col.quantity + col.amountWithoutTax + col.taxRate + col.tax - 2, headerY, { align: 'right' });
  doc.text('Total amount (incl. tax)', PAGE_RIGHT, headerY, { align: 'right' });

  drawSectionRule(doc, headerY + 2);

  let y = headerY + headerToRowsGap;

  for (const row of rows) {
    const labelLines = doc.splitTextToSize(row.label, col.label - 2);
    const rowHeight = Math.max(5.6, labelLines.length * rowLineHeight);

    if (row.bold) {
      drawSectionRule(doc, y - totalDividerGap);
    }

    doc.setFont('helvetica', row.bold ? 'bold' : 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...TEXT_COLOR);
    doc.text(labelLines, PAGE_LEFT, y);
    doc.text(row.quantity || '', PAGE_LEFT + col.label + col.quantity - 2, y, {
      align: 'right',
    });
    doc.text(
      formatCurrencyShort(row.amountWithoutTax, currency),
      PAGE_LEFT + col.label + col.quantity + col.amountWithoutTax - 2,
      y,
      { align: 'right' },
    );
    doc.text(
      row.taxRateLabel,
      PAGE_LEFT + col.label + col.quantity + col.amountWithoutTax + col.taxRate - 2,
      y,
      { align: 'right' },
    );
    doc.text(
      formatCurrencyShort(row.taxAmount, currency),
      PAGE_LEFT + col.label + col.quantity + col.amountWithoutTax + col.taxRate + col.tax - 2,
      y,
      { align: 'right' },
    );
    doc.text(formatCurrencyShort(row.totalAmount, currency), PAGE_RIGHT, y, {
      align: 'right',
    });

    y += rowHeight + rowBottomPadding;
  }

  return y;
}

function drawSummaryTableWithoutQuantity(
  doc: jsPDF,
  startY: number,
  title: string,
  currency: string,
  rows: SummaryRow[],
) {
  const headerToRowsGap = 7.8;
  const rowLineHeight = 4.2;
  const rowBottomPadding = 1.8;
  const totalDividerGap = 4.4;
  const col = {
    label: 94,
    amountWithoutTax: 28,
    taxRate: 16,
    tax: 16,
    total: 32,
  };
  const headerY = startY;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...TEXT_COLOR);
  doc.text(title, PAGE_LEFT, headerY);
  doc.text('Amount (without tax)', PAGE_LEFT + col.label + col.amountWithoutTax - 2, headerY, { align: 'right' });
  doc.text('Tax %', PAGE_LEFT + col.label + col.amountWithoutTax + col.taxRate - 2, headerY, { align: 'right' });
  doc.text('Tax', PAGE_LEFT + col.label + col.amountWithoutTax + col.taxRate + col.tax - 2, headerY, { align: 'right' });
  doc.text('Total amount (incl. tax)', PAGE_RIGHT, headerY, { align: 'right' });

  drawSectionRule(doc, headerY + 2);

  let y = headerY + headerToRowsGap;

  for (const row of rows) {
    const labelLines = doc.splitTextToSize(row.label, col.label - 2);
    const rowHeight = Math.max(5.6, labelLines.length * rowLineHeight);

    if (row.bold) {
      drawSectionRule(doc, y - totalDividerGap);
    }

    doc.setFont('helvetica', row.bold ? 'bold' : 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...TEXT_COLOR);
    doc.text(labelLines, PAGE_LEFT, y);
    doc.text(
      formatCurrencyShort(row.amountWithoutTax, currency),
      PAGE_LEFT + col.label + col.amountWithoutTax - 2,
      y,
      { align: 'right' },
    );
    doc.text(
      row.taxRateLabel,
      PAGE_LEFT + col.label + col.amountWithoutTax + col.taxRate - 2,
      y,
      { align: 'right' },
    );
    doc.text(
      formatCurrencyShort(row.taxAmount, currency),
      PAGE_LEFT + col.label + col.amountWithoutTax + col.taxRate + col.tax - 2,
      y,
      { align: 'right' },
    );
    doc.text(formatCurrencyShort(row.totalAmount, currency), PAGE_RIGHT, y, {
      align: 'right',
    });

    y += rowHeight + rowBottomPadding;
  }

  return y;
}

function drawSimpleAmountSection(
  doc: jsPDF,
  startY: number,
  title: string,
  rowLabel: string,
  amount: number,
  amountHeader: string,
  currency: string,
) {
  const headerToRowsGap = 7.8;
  const rowBottomGap = 7.2;
  const totalDividerGap = 3.2;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...TEXT_COLOR);
  doc.text(title, PAGE_LEFT, startY);
  doc.text(amountHeader, PAGE_RIGHT, startY, { align: 'right' });

  drawSectionRule(doc, startY + 2);

  let y = startY + headerToRowsGap;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(rowLabel, PAGE_LEFT, y);
  doc.text(formatCurrencyShort(amount, currency), PAGE_RIGHT, y, { align: 'right' });

  y += rowBottomGap;
  drawSectionRule(doc, y - totalDividerGap);
  doc.setFont('helvetica', 'bold');
  doc.text('Total', PAGE_LEFT, y);
  doc.text(formatCurrencyShort(amount, currency), PAGE_RIGHT, y, { align: 'right' });

  return y + 2.6;
}

function drawTotalsBreakdown(
  doc: jsPDF,
  startY: number,
  rows: Array<{ label: string; value: string; bold?: boolean }>,
) {
  const blockX = 116;
  const valueColumnWidth = 24;
  const labelWidth = PAGE_RIGHT - blockX - valueColumnWidth - 3;
  let y = startY;

  doc.setDrawColor(...TABLE_LINE_COLOR);
  doc.setLineWidth(0.35);
  doc.line(blockX - 4, y - 4, PAGE_RIGHT, y - 4);

  for (const row of rows) {
    doc.setFont('helvetica', row.bold ? 'bold' : 'normal');
    doc.setFontSize(row.bold ? 8.15 : 7.55);
    doc.setTextColor(...TEXT_COLOR);
    const labelLines = doc.splitTextToSize(row.label, labelWidth);
    const rowHeight = Math.max(
      row.bold ? 6.4 : 5.6,
      labelLines.length * 4.1,
    );

    doc.text(labelLines, blockX, y);
    doc.text(row.value, PAGE_RIGHT, y, { align: 'right' });
    y += rowHeight;
  }
}

function getTotalsBreakdownHeight(
  doc: jsPDF,
  rows: Array<{ label: string; value: string; bold?: boolean }>,
) {
  const blockX = 116;
  const valueColumnWidth = 24;
  const labelWidth = PAGE_RIGHT - blockX - valueColumnWidth - 3;

  return rows.reduce((total, row) => {
    const labelLines = doc.splitTextToSize(row.label, labelWidth);
    const rowHeight = Math.max(
      row.bold ? 6.4 : 5.6,
      labelLines.length * 4.1,
    );

    return total + rowHeight;
  }, 2.5);
}

function drawLedgerHeaderRow(
  doc: jsPDF,
  y: number,
  columns: Array<{
    label: string;
    width: number;
    align: 'left' | 'right';
    maxChars?: number;
  }>,
) {
  let x = PAGE_LEFT;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.1);
  doc.setTextColor(...TEXT_COLOR);

  for (const column of columns) {
    const textX = column.align === 'right' ? x + column.width - 1 : x;
    doc.text(column.label, textX, y, { align: column.align });
    x += column.width;
  }

  drawSectionRule(doc, y + 1.4);
}

function drawLedgerRow(
  doc: jsPDF,
  y: number,
  columns: Array<{ width: number; align: 'left' | 'right'; maxChars?: number }>,
  values: string[],
) {
  let x = PAGE_LEFT;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.3);
  doc.setTextColor(...TEXT_COLOR);

  for (let index = 0; index < columns.length; index += 1) {
    const column = columns[index];
    const rawValue = values[index] || '';
    const value = truncateText(
      rawValue,
      column.maxChars ?? (column.width <= 12 ? 6 : column.width <= 18 ? 11 : 18),
    );
    const textX = column.align === 'right' ? x + column.width - 1 : x;
    doc.text(value, textX, y, { align: column.align });
    x += column.width;
  }

  doc.setDrawColor(...LIGHT_LINE_COLOR);
  doc.setLineWidth(0.14);
  doc.line(PAGE_LEFT, y + 2, PAGE_RIGHT, y + 2);
}

function drawPageFooter(doc: jsPDF, data: RestaurantPayoutStatement) {
  drawSectionRule(doc, FOOTER_TOP);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(...SUBTLE_TEXT_COLOR);

  const leftLines = [
    'Antler Foods',
    'Settlement statement',
    `Restaurant: ${truncateText(data.restaurant.name, 26)}`,
    buildPeriodLabel(data.batch.periodStart, data.batch.periodEnd),
  ];
  const middleLines = [
    `Payout batch: ${truncateText(data.batch.payoutBatchId, 18)}`,
    `Transfer ID: ${truncateText(data.batch.stripeTransferId || '-', 18)}`,
    `Invoice date: ${formatReportDate(data.generatedAt)}`,
    `Orders included: ${data.batch.orderCount}`,
  ];
  const rightLines = [
    'Connected account',
    truncateText(data.batch.stripeConnectedAccountId || 'Unavailable', 24),
    `Status: ${formatBatchStatus(data.batch.status)}`,
    `Currency: ${data.currency}`,
  ];

  drawFooterColumn(doc, PAGE_LEFT, FOOTER_TEXT_Y, leftLines);
  drawFooterColumn(doc, 86, FOOTER_TEXT_Y, middleLines);
  drawFooterColumn(doc, 155, FOOTER_TEXT_Y, rightLines, 'left');
}

function drawFooterColumn(
  doc: jsPDF,
  x: number,
  startY: number,
  lines: string[],
  align: 'left' | 'right' = 'left',
) {
  let y = startY;

  for (const line of lines) {
    doc.text(truncateText(line, align === 'left' ? 30 : 26), x, y, { align });
    y += 4.2;
  }
}

function buildMetrics(data: RestaurantPayoutStatement) {
  const deliveryOrderCount = data.orders.filter((order) => order.deliveryFeeTotal > 0).length;
  const serviceCorrectionTotal = roundCurrency(
    data.totals.serviceFeeTotal + data.totals.stateTaxTotal,
  );
  const salesSectionWithoutTax = roundCurrency(
    Math.max(data.totals.grossSales - data.totals.tipTotal - serviceCorrectionTotal, 0),
  );
  const productSalesWithoutTax = roundCurrency(
    Math.max(salesSectionWithoutTax - data.totals.deliveryFeeTotal, 0),
  );

  return {
    deliveryOrderCount,
    salesSectionWithoutTax,
    productSalesWithoutTax,
    serviceFeeTaxRateLabel:
      data.totals.serviceFeeTotal > 0 && data.totals.stateTaxTotal > 0
        ? formatPercentage(
            (data.totals.stateTaxTotal / data.totals.serviceFeeTotal) * 100,
          )
        : '0.00%',
  };
}

function buildSalesLedgerRows(
  orders: RestaurantPayoutStatementOrder[],
): LedgerRow[] {
  const rows: LedgerRow[] = [];
  const groupedOrders = groupOrdersByDate(orders);
  let serial = 1;

  for (const group of groupedOrders) {
    let groupProductValueTotal = 0;
    let groupDeliveryTotal = 0;

    for (const order of group.orders) {
      const productValue = roundCurrency(
        Math.max(order.cartTotal - order.tipTotal - order.deliveryFeeTotal, 0),
      );
      const netProductValue = roundCurrency(
        Math.max(
          productValue - order.taxTotal - order.stateTax - order.refundAmount,
          0,
        ),
      );

      groupProductValueTotal += productValue;
      groupDeliveryTotal += order.deliveryFeeTotal;

      rows.push({
        date: formatDateOnly(order.placedAt),
        serial: String(serial),
        type: 'Payment',
        transactionId: order.paymentReference || '-',
        productValue,
        netProductValue,
        paymentMethod: formatPaymentMethod(order.paymentMethod),
        orderMethod: formatFulfillmentType(order.fulfillmentType),
      });

      serial += 1;
    }

    rows.push({
      date: '',
      serial: '',
      type: '',
      transactionId: '',
      productValue: null,
      netProductValue: null,
      paymentMethod: '',
      orderMethod: '',
      totalProductValue: roundCurrency(groupProductValueTotal),
      totalDeliveryFees: roundCurrency(groupDeliveryTotal),
    });
  }

  return rows;
}

function buildTipsRows(
  orders: RestaurantPayoutStatementOrder[],
): TipsRow[] {
  return orders
    .filter((order) => order.tipTotal > 0)
    .map((order) => ({
      date: formatDateOnly(order.placedAt),
      type: 'Payment',
      transactionId: order.paymentReference || '-',
      amount: order.tipTotal,
    }));
}

function groupOrdersByDate(orders: RestaurantPayoutStatementOrder[]) {
  const grouped = new Map<string, RestaurantPayoutStatementOrder[]>();

  for (const order of orders) {
    const key = formatDateOnly(order.placedAt);
    const bucket = grouped.get(key);
    if (bucket) {
      bucket.push(order);
    } else {
      grouped.set(key, [order]);
    }
  }

  return Array.from(grouped.entries()).map(([date, groupedOrders]) => ({
    date,
    orders: groupedOrders,
  }));
}

function splitAddressLines(doc: jsPDF, text: string, width: number) {
  return doc.splitTextToSize(text || 'Address unavailable', width);
}

function formatCurrency(value: number, currency: string) {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currency.toUpperCase()} ${value.toFixed(2)}`;
  }
}

function formatCurrencyShort(value: number, currency: string) {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return value.toFixed(2);
  }
}

function formatPercentage(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return '0.00%';
  }

  return `${value.toFixed(2)}%`;
}

function formatReportDate(value: string | null) {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
}

function formatDateOnly(value: string | null) {
  return formatReportDate(value);
}

function buildPeriodLabel(start: string | null, end: string | null) {
  return `${formatReportDate(start)} - ${formatReportDate(end)}`;
}

function formatFulfillmentType(value: string | null) {
  if (!value) {
    return '-';
  }

  return value
    .split('_')
    .filter(Boolean)
    .map((part) => `${part[0]?.toUpperCase() ?? ''}${part.slice(1)}`)
    .join(' ');
}

function formatPaymentMethod(value: string | null) {
  if (!value) {
    return 'Online';
  }

  return value
    .split('_')
    .filter(Boolean)
    .map((part) => `${part[0]?.toUpperCase() ?? ''}${part.slice(1)}`)
    .join(' ');
}

function formatBatchStatus(value: string) {
  return value
    .split('_')
    .filter(Boolean)
    .map((part) => `${part[0]?.toUpperCase() ?? ''}${part.slice(1)}`)
    .join(' ');
}

function truncateText(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, Math.max(0, maxLength - 1))}...`;
}

function buildInvoiceNumber(payoutBatchId: string) {
  const normalized = payoutBatchId.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const suffix = normalized.slice(-6) || '000000';
  return `${suffix}-P`;
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}
