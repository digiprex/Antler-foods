import { jsPDF } from 'jspdf';
import type {
  RestaurantPayoutStatement,
  RestaurantPayoutStatementOrder,
} from '@/lib/server/restaurant-payouts';

type SummaryRow = {
  label: string;
  value: string;
  tone?: 'default' | 'total';
};

type TableColumn<T> = {
  key: string;
  label: string;
  width: number;
  align?: 'left' | 'center' | 'right';
  render: (row: T) => string;
};

export function generatePayoutStatementPDF(
  data: RestaurantPayoutStatement,
): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  drawSummaryPage(doc, data);
  drawSalesLedgerPages(doc, data);

  const tippedOrders = data.orders.filter((order) => order.tipTotal > 0);
  if (tippedOrders.length > 0) {
    drawTipsPages(doc, data, tippedOrders);
  }

  return doc;
}

function drawSummaryPage(doc: jsPDF, data: RestaurantPayoutStatement) {
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;

  drawReportHeader(doc, {
    title: 'Payout statement',
    restaurantName: data.restaurant.name,
    restaurantAddress: data.restaurant.fullAddress,
    reportDate: formatReportDate(data.generatedAt),
    periodLabel: buildPeriodLabel(data.batch.periodStart, data.batch.periodEnd),
    brandLabel: 'Antler Foods',
  });

  y = 72;

  const metaRows: Array<[string, string]> = [
    ['Payout batch', data.batch.payoutBatchId],
    ['Transfer ID', data.batch.stripeTransferId || 'Not created'],
    ['Connected account', data.batch.stripeConnectedAccountId || 'Unavailable'],
    ['Status', formatBatchStatus(data.batch.status)],
    ['Orders included', String(data.batch.orderCount)],
  ];

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('Batch details', 14, y);
  y += 6;

  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.line(14, y, pageWidth - 14, y);
  y += 5;

  for (const [label, value] of metaRows) {
    doc.setFont('helvetica', 'bold');
    doc.text(label, 14, y);
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(value, pageWidth - 84);
    doc.text(lines, 56, y);
    y += Math.max(6, lines.length * 5);
  }

  y += 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Settlement summary', 14, y);
  y += 6;
  doc.line(14, y, pageWidth - 14, y);
  y += 5;

  const summaryRows: SummaryRow[] = [
    {
      label: 'Gross customer sales',
      value: formatCurrency(data.totals.grossSales, data.currency),
    },
    {
      label: 'Tips total',
      value: formatCurrency(data.totals.tipTotal, data.currency),
    },
    {
      label: 'Less processing tax',
      value: `-${formatCurrency(data.totals.processingTaxTotal, data.currency)}`,
    },
    {
      label: 'Less state tax',
      value: `-${formatCurrency(data.totals.stateTaxTotal, data.currency)}`,
    },
    {
      label: 'Less delivery fees',
      value: `-${formatCurrency(data.totals.deliveryFeeTotal, data.currency)}`,
    },
    {
      label: 'Less refunds',
      value: `-${formatCurrency(data.totals.refundTotal, data.currency)}`,
    },
    {
      label: 'Online payout amount',
      value: formatCurrency(data.totals.netPayoutAmount, data.currency),
      tone: 'total',
    },
  ];

  for (const row of summaryRows) {
    const isTotal = row.tone === 'total';
    doc.setFont('helvetica', isTotal ? 'bold' : 'normal');
    doc.setFontSize(isTotal ? 12 : 10);
    doc.setTextColor(15, 23, 42);
    doc.text(row.label, 14, y);
    doc.text(row.value, pageWidth - 14, y, { align: 'right' });
    y += isTotal ? 9 : 7;
    if (isTotal) {
      doc.setLineWidth(0.5);
      doc.line(14, y - 5, pageWidth - 14, y - 5);
    }
  }
}

function drawSalesLedgerPages(doc: jsPDF, data: RestaurantPayoutStatement) {
  const columns: Array<TableColumn<RestaurantPayoutStatementOrder>> = [
    {
      key: 'date',
      label: 'Date',
      width: 24,
      render: (row) => formatLedgerDate(row.placedAt),
    },
    {
      key: 'order',
      label: 'Order #',
      width: 30,
      render: (row) => row.orderNumber,
    },
    {
      key: 'transaction',
      label: 'Txn ID',
      width: 30,
      render: (row) => row.paymentReference || '-',
    },
    {
      key: 'payment',
      label: 'Payment',
      width: 22,
      render: (row) => row.paymentMethod || '-',
    },
    {
      key: 'orderMethod',
      label: 'Order method',
      width: 22,
      render: (row) => formatFulfillmentType(row.fulfillmentType),
    },
    {
      key: 'gross',
      label: 'Gross',
      width: 20,
      align: 'right',
      render: (row) => formatCurrencyShort(row.cartTotal, data.currency),
    },
    {
      key: 'tip',
      label: 'Tip',
      width: 18,
      align: 'right',
      render: (row) => formatCurrencyShort(row.tipTotal, data.currency),
    },
    {
      key: 'tax',
      label: 'Tax',
      width: 18,
      align: 'right',
      render: (row) => formatCurrencyShort(row.taxTotal, data.currency),
    },
    {
      key: 'stateTax',
      label: 'State tax',
      width: 20,
      align: 'right',
      render: (row) => formatCurrencyShort(row.stateTax, data.currency),
    },
    {
      key: 'delivery',
      label: 'Delivery',
      width: 20,
      align: 'right',
      render: (row) => formatCurrencyShort(row.deliveryFeeTotal, data.currency),
    },
    {
      key: 'refund',
      label: 'Refund',
      width: 20,
      align: 'right',
      render: (row) => formatCurrencyShort(row.refundAmount, data.currency),
    },
    {
      key: 'payout',
      label: 'Payout',
      width: 24,
      align: 'right',
      render: (row) => formatCurrencyShort(row.payoutAmount, data.currency),
    },
  ];

  drawTableReportPages({
    doc,
    title: 'Sales report',
    data,
    rows: data.orders,
    columns,
    countSummary: `${data.orders.length} orders included in this payout batch`,
  });
}

function drawTipsPages(
  doc: jsPDF,
  data: RestaurantPayoutStatement,
  rows: RestaurantPayoutStatementOrder[],
) {
  const columns: Array<TableColumn<RestaurantPayoutStatementOrder>> = [
    {
      key: 'date',
      label: 'Date',
      width: 40,
      render: (row) => formatLedgerDate(row.placedAt),
    },
    {
      key: 'order',
      label: 'Order #',
      width: 48,
      render: (row) => row.orderNumber,
    },
    {
      key: 'transaction',
      label: 'Transaction ID',
      width: 64,
      render: (row) => row.paymentReference || '-',
    },
    {
      key: 'type',
      label: 'Type',
      width: 48,
      render: () => 'Payment',
    },
    {
      key: 'amount',
      label: 'Amount',
      width: 52,
      align: 'right',
      render: (row) => formatCurrencyShort(row.tipTotal, data.currency),
    },
  ];

  drawTableReportPages({
    doc,
    title: 'Tips',
    data,
    rows,
    columns,
    countSummary: `${rows.length} transactions worth ${formatCurrency(
      rows.reduce((sum, row) => sum + row.tipTotal, 0),
      data.currency,
    )}`,
  });
}

function drawTableReportPages<T>({
  doc,
  title,
  data,
  rows,
  columns,
  countSummary,
}: {
  doc: jsPDF;
  title: string;
  data: RestaurantPayoutStatement;
  rows: T[];
  columns: Array<TableColumn<T>>;
  countSummary?: string;
}) {
  let rowIndex = 0;

  while (rowIndex < rows.length || rowIndex === 0) {
    doc.addPage([297, 210]);
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const left = 14;
    const right = pageWidth - 14;
    let y = 18;

    drawReportHeader(doc, {
      title,
      restaurantName: data.restaurant.name,
      restaurantAddress: data.restaurant.fullAddress,
      reportDate: formatReportDate(data.generatedAt),
      periodLabel: buildPeriodLabel(data.batch.periodStart, data.batch.periodEnd),
      brandLabel: 'Antler Foods',
    });

    y = 74;

    if (countSummary) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(51, 65, 85);
      doc.text(countSummary, left, y);
      y += 12;
    }

    drawTableHeader(doc, columns, left, y);
    y += 7;

    while (rowIndex < rows.length) {
      const row = rows[rowIndex];
      if (y > pageHeight - 18) {
        break;
      }

      drawTableRow(doc, row, columns, left, y);
      y += 6.5;
      rowIndex += 1;
    }

    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.line(left, pageHeight - 12, right, pageHeight - 12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text('Generated by Antler Foods', left, pageHeight - 7);

    if (rows.length === 0) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text('No rows available for this section.', left, y + 4);
      break;
    }
  }
}

function drawReportHeader(
  doc: jsPDF,
  input: {
    title: string;
    restaurantName: string;
    restaurantAddress: string;
    reportDate: string;
    periodLabel: string;
    brandLabel: string;
  },
) {
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42);
  doc.text(input.title, 14, 24);

  doc.setFontSize(12);
  doc.setTextColor(99, 102, 241);
  doc.text(input.brandLabel, pageWidth - 14, 24, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(input.restaurantName, 14, 42);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  const addressLines = doc.splitTextToSize(input.restaurantAddress || 'Address unavailable', 100);
  doc.text(addressLines, 14, 49);

  doc.setTextColor(15, 23, 42);
  doc.text(`Invoice date: ${input.reportDate}`, pageWidth - 14, 42, {
    align: 'right',
  });
  doc.text(`Billing period: ${input.periodLabel}`, pageWidth - 14, 49, {
    align: 'right',
  });
}

function drawTableHeader<T>(
  doc: jsPDF,
  columns: Array<TableColumn<T>>,
  startX: number,
  y: number,
) {
  let x = startX;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);

  for (const column of columns) {
    drawCellText(doc, column.label, x, y, column.width, column.align || 'left', true);
    x += column.width;
  }

  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.4);
  doc.line(startX, y + 1.5, x, y + 1.5);
}

function drawTableRow<T>(
  doc: jsPDF,
  row: T,
  columns: Array<TableColumn<T>>,
  startX: number,
  y: number,
) {
  let x = startX;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);

  for (const column of columns) {
    drawCellText(
      doc,
      truncateText(column.render(row), column.width <= 20 ? 10 : 20),
      x,
      y,
      column.width,
      column.align || 'left',
      false,
    );
    x += column.width;
  }

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.2);
  doc.line(startX, y + 2.3, x, y + 2.3);
}

function drawCellText(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  width: number,
  align: 'left' | 'center' | 'right',
  bold: boolean,
) {
  const renderX =
    align === 'right'
      ? x + width - 1
      : align === 'center'
        ? x + width / 2
        : x + 1;

  doc.setFont('helvetica', bold ? 'bold' : 'normal');
  doc.text(text, renderX, y, { align });
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

function formatLedgerDate(value: string | null) {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  const datePart = formatReportDate(value);
  const timePart = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
  return `${datePart} ${timePart}`;
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

  return `${value.slice(0, Math.max(0, maxLength - 1))}\u2026`;
}
