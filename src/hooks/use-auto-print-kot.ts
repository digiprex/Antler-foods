'use client';

/**
 * Auto-Print KOT Hook
 *
 * Polls for new orders and auto-prints kitchen order tickets
 * via QZ Tray when enabled in printer settings.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { generateKOTEscPos } from '@/lib/generate-kot-escpos';
import { generateKitchenTicketPDF } from '@/lib/generate-kitchen-ticket-pdf';
import type { KitchenTicketData, KitchenTicketItem } from '@/lib/generate-kitchen-ticket-pdf';

export interface PrinterSettings {
  printerName: string;
  paperSize: '80mm' | '58mm';
  autoPrintKot: boolean;
  printMethod: 'escpos' | 'pdf';
  pollIntervalSeconds: number;
}

interface OrderForPrint {
  order_id: string;
  order_number?: string;
  fulfillment_type?: string;
  placed_at?: string;
  created_at?: string;
  order_note?: string;
  order_items?: Array<{
    item_name: string;
    quantity?: number;
    selected_modifiers?: unknown;
    item_note?: string;
  }>;
}

function formatDate(value: string | null | undefined) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
}

function buildTicketData(
  order: OrderForPrint,
  restaurantName: string,
): KitchenTicketData {
  const items: KitchenTicketItem[] = (order.order_items || []).map((item) => {
    let modifiers: KitchenTicketItem['selected_modifiers'] = null;
    if (item.selected_modifiers) {
      try {
        const raw =
          typeof item.selected_modifiers === 'string'
            ? JSON.parse(item.selected_modifiers)
            : item.selected_modifiers;
        if (Array.isArray(raw)) {
          modifiers = raw
            .map((m: Record<string, unknown>) => ({
              name:
                (m.name as string) ||
                (m.modifierGroupName as string) ||
                'Modifier',
              groupName: (m.modifierGroupName as string) || undefined,
              price: typeof m.price === 'number' ? m.price : undefined,
            }))
            .filter((m) => m.name);
        }
      } catch {
        // ignore
      }
    }
    return {
      item_name: item.item_name,
      quantity: item.quantity || 1,
      selected_modifiers: modifiers && modifiers.length > 0 ? modifiers : null,
      item_note: item.item_note || null,
    };
  });

  return {
    orderNumber: order.order_number || order.order_id,
    restaurantName,
    fulfillmentLabel: order.fulfillment_type
      ? order.fulfillment_type.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())
      : 'Pickup',
    placedAt: formatDate(order.placed_at || order.created_at),
    items,
    orderNote: order.order_note || '',
  };
}

export function useAutoPrintKOT(
  restaurantId: string | null,
  restaurantName: string,
  settings: PrinterSettings | null,
) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [printedCount, setPrintedCount] = useState(0);
  const printedOrdersRef = useRef<Set<string>>(new Set());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Lazy-load qz-tray only on client
  const qzRef = useRef<typeof import('@/lib/qz-tray') | null>(null);

  const loadQZ = useCallback(async () => {
    if (!qzRef.current) {
      qzRef.current = await import('@/lib/qz-tray');
    }
    return qzRef.current;
  }, []);

  const connect = useCallback(async () => {
    try {
      const qzLib = await loadQZ();
      await qzLib.connectQZ();
      setIsConnected(true);
      setLastError(null);
    } catch (err) {
      setIsConnected(false);
      setLastError(
        err instanceof Error ? err.message : 'Failed to connect to QZ Tray',
      );
    }
  }, [loadQZ]);

  const disconnect = useCallback(async () => {
    try {
      const qzLib = await loadQZ();
      await qzLib.disconnectQZ();
    } catch {
      // ignore
    }
    setIsConnected(false);
  }, [loadQZ]);

  const printOrder = useCallback(
    async (order: OrderForPrint) => {
      if (!settings?.printerName) return;

      const qzLib = await loadQZ();
      if (!qzLib.isQZConnected()) {
        await qzLib.connectQZ();
        setIsConnected(true);
      }

      const ticketData = buildTicketData(order, restaurantName);
      const columns = settings.paperSize === '58mm' ? 32 : 48;

      if (settings.printMethod === 'pdf') {
        const doc = generateKitchenTicketPDF(ticketData);
        const pdfBase64 = doc.output('datauristring').split(',')[1];
        await qzLib.printPDF({
          printer: settings.printerName,
          pdfBase64,
        });
      } else {
        const data = generateKOTEscPos(ticketData, columns);
        await qzLib.printRaw({
          printer: settings.printerName,
          data,
          columns,
        });
      }
    },
    [settings, restaurantName, loadQZ],
  );

  // Poll for new orders and auto-print
  useEffect(() => {
    if (!settings?.autoPrintKot || !settings.printerName || !restaurantId) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const pollInterval = (settings.pollIntervalSeconds || 15) * 1000;

    const pollAndPrint = async () => {
      try {
        const params = new URLSearchParams({
          restaurant_id: restaurantId,
          limit: '10',
          include_items: 'true',
          status: 'pending',
        });

        const res = await fetch(`/api/orders?${params.toString()}`);
        if (!res.ok) return;

        const data = await res.json();
        const orders: OrderForPrint[] = data.orders || [];

        for (const order of orders) {
          if (printedOrdersRef.current.has(order.order_id)) continue;

          try {
            await printOrder(order);
            printedOrdersRef.current.add(order.order_id);
            setPrintedCount((c) => c + 1);
            console.log('[Auto-Print] KOT printed for order:', order.order_number || order.order_id);
          } catch (err) {
            console.error('[Auto-Print] Failed to print KOT:', err);
            setLastError(
              err instanceof Error ? err.message : 'Print failed',
            );
          }
        }
      } catch (err) {
        console.error('[Auto-Print] Poll error:', err);
      }
    };

    // Initial poll
    void pollAndPrint();

    intervalRef.current = setInterval(pollAndPrint, pollInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [settings, restaurantId, printOrder]);

  // Clean up QZ connection on unmount
  useEffect(() => {
    return () => {
      void disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    lastError,
    printedCount,
    connect,
    disconnect,
    printOrder,
  };
}
