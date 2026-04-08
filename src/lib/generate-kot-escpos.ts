/**
 * ESC/POS Kitchen Order Ticket (KOT) Generator
 *
 * Produces raw ESC/POS text commands for thermal printers.
 * Used for silent auto-printing via QZ Tray.
 */

import type { KitchenTicketData } from './generate-kitchen-ticket-pdf';

// ESC/POS constants
const ESC = '\x1B';
const GS = '\x1D';
const LF = '\n';

const CMD = {
  INIT: `${ESC}@`,
  CENTER: `${ESC}a\x01`,
  LEFT: `${ESC}a\x00`,
  BOLD_ON: `${ESC}E\x01`,
  BOLD_OFF: `${ESC}E\x00`,
  DOUBLE_HEIGHT: `${GS}!\x10`,
  DOUBLE_WIDTH: `${GS}!\x20`,
  DOUBLE_BOTH: `${GS}!0`,
  NORMAL_SIZE: `${GS}!\x00`,
  CUT: `${GS}V\x00`,
  PARTIAL_CUT: `${GS}V\x01`,
  FEED_3: `${ESC}d\x03`,
} as const;

function dashLine(cols: number): string {
  return '-'.repeat(cols);
}

function wrapText(text: string, cols: number): string[] {
  const lines: string[] = [];
  let remaining = text;
  while (remaining.length > cols) {
    let breakAt = remaining.lastIndexOf(' ', cols);
    if (breakAt <= 0) breakAt = cols;
    lines.push(remaining.slice(0, breakAt));
    remaining = remaining.slice(breakAt).trimStart();
  }
  if (remaining) lines.push(remaining);
  return lines;
}

/**
 * Generate ESC/POS command array for a kitchen order ticket.
 * Returns a string[] suitable for QZ Tray raw printing.
 *
 * @param data - Kitchen ticket data
 * @param columns - Paper width in characters (48 for 80mm, 32 for 58mm)
 */
export function generateKOTEscPos(
  data: KitchenTicketData,
  columns: number = 48,
): string[] {
  const lines: string[] = [];

  // Initialize printer
  lines.push(CMD.INIT);

  // Header
  lines.push(CMD.CENTER);
  lines.push(CMD.DOUBLE_HEIGHT);
  lines.push(CMD.BOLD_ON);
  lines.push(`KITCHEN TICKET${LF}`);
  lines.push(CMD.NORMAL_SIZE);
  lines.push(CMD.BOLD_OFF);
  lines.push(`${data.restaurantName}${LF}`);
  lines.push(`${dashLine(columns)}${LF}`);

  // Order info
  lines.push(CMD.DOUBLE_BOTH);
  lines.push(CMD.BOLD_ON);
  lines.push(`#${data.orderNumber}${LF}`);
  lines.push(CMD.NORMAL_SIZE);
  lines.push(CMD.BOLD_OFF);
  lines.push(`${data.placedAt}${LF}`);
  lines.push(CMD.BOLD_ON);
  lines.push(`${data.fulfillmentLabel.toUpperCase()}${LF}`);
  lines.push(CMD.BOLD_OFF);
  lines.push(CMD.LEFT);
  lines.push(`${dashLine(columns)}${LF}`);

  // Items
  for (const item of data.items) {
    lines.push(CMD.BOLD_ON);
    const itemLine = `${item.quantity}x  ${item.item_name}`;
    for (const wrapped of wrapText(itemLine, columns)) {
      lines.push(`${wrapped}${LF}`);
    }
    lines.push(CMD.BOLD_OFF);

    // Modifiers
    if (item.selected_modifiers && item.selected_modifiers.length > 0) {
      for (const mod of item.selected_modifiers) {
        const groupPrefix = mod.groupName ? `[${mod.groupName}] ` : '';
        const modLine = `  + ${groupPrefix}${mod.name}`;
        for (const wrapped of wrapText(modLine, columns - 2)) {
          lines.push(`  ${wrapped}${LF}`);
        }
      }
    }

    // Item note
    if (item.item_note) {
      for (const wrapped of wrapText(`  NOTE: ${item.item_note}`, columns - 2)) {
        lines.push(`  ${wrapped}${LF}`);
      }
    }

    lines.push(LF);
  }

  // Order note
  if (data.orderNote) {
    lines.push(`${dashLine(columns)}${LF}`);
    lines.push(CMD.BOLD_ON);
    lines.push(`ORDER NOTE:${LF}`);
    lines.push(CMD.BOLD_OFF);
    for (const wrapped of wrapText(data.orderNote, columns)) {
      lines.push(`${wrapped}${LF}`);
    }
  }

  // Footer
  lines.push(`${dashLine(columns)}${LF}`);
  lines.push(CMD.FEED_3);
  lines.push(CMD.PARTIAL_CUT);

  return lines;
}
