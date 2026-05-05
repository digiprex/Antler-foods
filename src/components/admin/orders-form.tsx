/**
 * Orders Form Component
 *
 * Provides comprehensive order management functionality including:
 * - List of all orders for a restaurant
 * - View order details with order items
 * - Update order status
 * - Filter and search orders
 * - Order pagination
 * - Download receipt functionality
 * - Professional PDF receipt generation
 */

'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Order,
  OrdersResponse,
  OrderFilters,
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  FULFILLMENT_TYPES,
  getOrderStatusColor,
  getPaymentStatusColor,
  formatOrderTotal,
  formatOrderItemsCount,
  type OfferApplied,
} from '@/types/orders.types';
import { generateInvoicePDF } from '@/lib/generate-invoice-pdf';
import { generateKitchenTicketPDF } from '@/lib/generate-kitchen-ticket-pdf';
import { useAutoPrintKOT, type PrinterSettings } from '@/hooks/use-auto-print-kot';

function parseOfferApplied(value: unknown): OfferApplied | null {
  if (!value) return null;
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    if (
      parsed &&
      typeof parsed === 'object' &&
      'type' in parsed &&
      'title' in parsed
    ) {
      return parsed as OfferApplied;
    }
    return null;
  } catch {
    return null;
  }
}

interface OrdersFormProps {
  restaurantId: string;
  restaurantName: string;
}

export default function OrdersForm({
  restaurantId,
  restaurantName,
}: OrdersFormProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pickupAddress, setPickupAddress] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  // Filters
  const [filters, setFilters] = useState<OrderFilters>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Confirmation dialog for destructive status changes
  const [confirmAction, setConfirmAction] = useState<{
    orderId: string;
    orderNumber: string;
    status: string;
    orderTotal?: number;
    paymentReference?: string | null;
  } | null>(null);

  // Refund form state
  const [refundType, setRefundType] = useState<'full' | 'partial'>('full');
  const [refundAmount, setRefundAmount] = useState<string>('');

  // Track which order is currently being updated
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  // Auto-print KOT
  const [printerSettings, setPrinterSettings] = useState<PrinterSettings | null>(null);
  const autoPrint = useAutoPrintKOT(restaurantId, restaurantName, printerSettings);

  useEffect(() => {
    fetch(`/api/admin/printer-settings?restaurant_id=${encodeURIComponent(restaurantId)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data?.success && data.data) {
          setPrinterSettings(data.data);
        }
      })
      .catch(() => {});
  }, [restaurantId]);

  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  useEffect(() => {
    fetch(`/api/admin/order-settings?restaurant_id=${encodeURIComponent(restaurantId)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data?.success && data.data?.address) {
          setPickupAddress(data.data.address);
        }
      })
      .catch(() => {});
  }, [restaurantId]);

  // Fetch orders from API
  const fetchOrders = useCallback(
    async (page = 1) => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams({
          restaurant_id: restaurantId,
          page: page.toString(),
          limit: pagination.limit.toString(),
          include_items: 'true',
        });

        if (statusFilter) {
          params.set('status', statusFilter);
        }

        const response = await fetch(`/api/orders?${params.toString()}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch orders');
        }

        setOrders(data.orders || []);
        setPagination(data.pagination);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch orders');
      } finally {
        setLoading(false);
      }
    },
    [restaurantId, pagination.limit, statusFilter],
  );

  // Filter orders based on search term
  const filteredOrders = useMemo(() => {
    if (!searchTerm.trim()) return orders;

    const normalizedSearch = searchTerm.trim().toLowerCase();
    return orders.filter((order) => {
      const customerName =
        `${order.contact_first_name || ''} ${order.contact_last_name || ''}`.toLowerCase();
      const orderNumber = (order.order_number || '').toLowerCase();
      const email = (order.contact_email || '').toLowerCase();
      const phone = (order.contact_phone || '').toLowerCase();

      return (
        customerName.includes(normalizedSearch) ||
        orderNumber.includes(normalizedSearch) ||
        email.includes(normalizedSearch) ||
        phone.includes(normalizedSearch) ||
        order.order_id.toLowerCase().includes(normalizedSearch)
      );
    });
  }, [orders, searchTerm]);

  // Load orders on component mount and when filters change
  useEffect(() => {
    fetchOrders(1);
  }, [fetchOrders]);

  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order);
    setShowOrderDetails(true);
  };

  const handleUpdateOrderStatus = async (
    orderId: string,
    status: string,
    paymentStatus?: string,
    refundAmountValue?: number,
  ) => {
    setUpdatingOrderId(orderId);
    try {
      const response = await fetch('/api/orders', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          order_id: orderId,
          action: 'update_status',
          status,
          payment_status: paymentStatus,
          refund_amount: refundAmountValue,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update order status');
      }

      // Update local state
      setOrders((prevOrders) =>
        prevOrders.map((order) =>
          order.order_id === orderId
            ? {
                ...order,
                status,
                payment_status: paymentStatus || order.payment_status,
              }
            : order,
        ),
      );

      // Update selected order if it's the one being updated
      if (selectedOrder?.order_id === orderId) {
        setSelectedOrder({
          ...selectedOrder,
          status,
          payment_status: paymentStatus || selectedOrder.payment_status,
        });
      }
    } catch (err) {
      console.error('Update order status error:', err);
      alert(
        err instanceof Error ? err.message : 'Failed to update order status',
      );
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handlePageChange = (newPage: number) => {
    fetchOrders(newPage);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Generate receipt content for download
  const generateReceiptContent = (order: Order) => {
    const customerName =
      order.contact_first_name || order.contact_last_name
        ? `${order.contact_first_name || ''} ${order.contact_last_name || ''}`.trim()
        : 'N/A';

    const orderDate = formatDate(order.created_at);
    const orderNumber = order.order_number || order.order_id;

    let receiptContent = `
${restaurantName}
Order Receipt
${'='.repeat(50)}

Order #: ${orderNumber}
Date: ${orderDate}
Customer: ${customerName}
${order.contact_email ? `Email: ${order.contact_email}` : ''}
${order.contact_phone ? `Phone: ${order.contact_phone}` : ''}
${order.fulfillment_type === 'pickup' && pickupAddress ? `Pickup Address: ${pickupAddress}` : order.delivery_address ? `Delivery Address: ${order.delivery_address}` : ''}

Status: ${order.status.replace('_', ' ').toUpperCase()}
${order.payment_status ? `Payment: ${order.payment_status.replace('_', ' ').toUpperCase()}` : ''}
${order.fulfillment_type ? `Type: ${order.fulfillment_type.replace('_', ' ').toUpperCase()}` : ''}

${'='.repeat(50)}
ORDER ITEMS
${'='.repeat(50)}
`;

    order.order_items?.forEach((item, index) => {
      receiptContent += `
${index + 1}. ${item.item_name}
   Qty: ${item.quantity || 1} × ${formatCurrency(item.item_price)} = ${formatCurrency(item.line_total || item.item_price * (item.quantity || 1))}`;

      if (item.selected_modifiers) {
        try {
          const modifiers =
            typeof item.selected_modifiers === 'string'
              ? JSON.parse(item.selected_modifiers)
              : item.selected_modifiers;

          if (Array.isArray(modifiers)) {
            modifiers.forEach((modifier: any) => {
              receiptContent += `\n   + ${modifier.name || modifier.modifierGroupName || 'Modifier'}`;
              if (modifier.price) {
                receiptContent += ` (+${formatCurrency(modifier.price)})`;
              }
            });
          }
        } catch (e) {
          // Ignore parsing errors
        }
      }

      if (item.item_note) {
        receiptContent += `\n   Note: ${item.item_note}`;
      }
      receiptContent += '\n';
    });

    receiptContent += `
${'='.repeat(50)}
ORDER SUMMARY
${'='.repeat(50)}

Subtotal: ${formatCurrency(order.sub_total)}`;

    if (order.service_fee != null && order.service_fee > 0) {
      receiptContent += `\nService Fee: ${formatCurrency(order.service_fee)}`;
    }

    if (order.state_tax != null && order.state_tax > 0) {
      receiptContent += `\nState Tax: ${formatCurrency(order.state_tax)}`;
    }

    if (order.tip_total != null && order.tip_total > 0) {
      receiptContent += `\nTip: ${formatCurrency(order.tip_total)}`;
    }

    if (order.delivery_fee != null && order.delivery_fee > 0) {
      receiptContent += `\nDelivery Fee: ${formatCurrency(order.delivery_fee)}`;
    }

    {
      const _loyaltyAmt = order.loyalty_discount != null ? Number(order.loyalty_discount) : 0;
      const _totalDisc = order.discount_total != null ? Number(order.discount_total) : 0;
      const _otherAmt = _totalDisc - _loyaltyAmt;
      if (_otherAmt > 0.005) {
        receiptContent += `\nDiscount: -${formatCurrency(_otherAmt)}`;
        const _offer = parseOfferApplied(order.offer_applied);
        if (_offer) {
          const offerType = _offer.discountType === 'percent' ? `${_offer.value}% off` : `$${_offer.value.toFixed(2)} off`;
          receiptContent += `\n  Offer Applied: ${_offer.title} (${offerType})`;
        }
        if (order.coupon_used) receiptContent += `\n  Coupon: ${order.coupon_used}`;
        if (order.gift_card_used) receiptContent += `\n  Gift Card: ${order.gift_card_used}`;
      }
      if (_loyaltyAmt > 0.005) {
        receiptContent += `\nLoyalty Discount: -${formatCurrency(_loyaltyAmt)}`;
        if (order.loyalty_points_redeemed) receiptContent += ` (${order.loyalty_points_redeemed} pts redeemed)`;
      }
    }

    receiptContent += `\n${'='.repeat(50)}
TOTAL: ${formatCurrency(order.cart_total)}
${'='.repeat(50)}`;

    if (order.refund_amount != null && order.refund_amount > 0) {
      receiptContent += `\nREFUNDED: -${formatCurrency(order.refund_amount)}${order.payment_status === 'partially_refunded' ? ' (partial)' : ''}`;
      receiptContent += `\n${'='.repeat(50)}`;
    }

    receiptContent += `

${order.payment_method ? `Payment Method: ${order.payment_method.replace('_', ' ').toUpperCase()}` : ''}
${order.payment_reference ? `Reference: ${order.payment_reference}` : ''}
${order.scheduled_for ? `Scheduled For: ${formatDate(order.scheduled_for)}` : ''}

${order.order_note ? `\nOrder Note: ${order.order_note}` : ''}

Thank you for your order!
Generated on: ${new Date().toLocaleString()}
`;

    return receiptContent;
  };

  // Download receipt as text file
  const downloadReceipt = (order: Order) => {
    const receiptContent = generateReceiptContent(order);
    const orderNumber = order.order_number || order.order_id;
    const blob = new Blob([receiptContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `receipt-${orderNumber}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Generate receipt HTML for printing
  const printReceipt = (order: Order) => {
    const customerName =
      order.contact_first_name || order.contact_last_name
        ? `${order.contact_first_name || ''} ${order.contact_last_name || ''}`.trim()
        : 'N/A';

    const orderDate = formatDate(order.created_at);
    const orderNumber = order.order_number || order.order_id;

    const printWindow = window.open(
      '',
      '_blank',
      'width=800,height=600,scrollbars=yes,resizable=yes',
    );
    if (!printWindow) return;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <title>Receipt - Order #${orderNumber}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'Courier New', monospace;
            max-width: 400px;
            margin: 0 auto;
            padding: 20px;
            line-height: 1.4;
            background: white;
        }
        .header {
            text-align: center;
            border-bottom: 2px solid #000;
            padding-bottom: 10px;
            margin-bottom: 15px;
        }
        .restaurant-name {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 5px;
        }
        .receipt-title {
            font-size: 14px;
            margin-bottom: 10px;
        }
        .section {
            margin-bottom: 15px;
        }
        .section-title {
            font-weight: bold;
            border-bottom: 1px solid #000;
            margin-bottom: 8px;
        }
        .item {
            margin-bottom: 8px;
        }
        .item-name {
            font-weight: bold;
        }
        .item-details {
            margin-left: 10px;
            font-size: 12px;
        }
        .modifier {
            margin-left: 20px;
            font-size: 11px;
        }
        .totals {
            border-top: 2px solid #000;
            padding-top: 10px;
            margin-top: 15px;
        }
        .total-line {
            display: flex;
            justify-content: space-between;
            margin-bottom: 3px;
        }
        .grand-total {
            font-weight: bold;
            font-size: 16px;
            border-top: 1px solid #000;
            padding-top: 5px;
            margin-top: 8px;
        }
        .footer {
            text-align: center;
            margin-top: 20px;
            border-top: 1px solid #000;
            padding-top: 10px;
            font-size: 12px;
        }
        @media print {
            body { margin: 0; padding: 10px; }
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="restaurant-name">${restaurantName}</div>
        <div class="receipt-title">Order Receipt</div>
    </div>
    
    <div class="section">
        <div><strong>Order #:</strong> ${orderNumber}</div>
        <div><strong>Date:</strong> ${orderDate}</div>
        <div><strong>Customer:</strong> ${customerName}</div>
        ${order.contact_email ? `<div><strong>Email:</strong> ${order.contact_email}</div>` : ''}
        ${order.contact_phone ? `<div><strong>Phone:</strong> ${order.contact_phone}</div>` : ''}
        ${order.fulfillment_type === 'pickup' && pickupAddress ? `<div><strong>Pickup Address:</strong> ${pickupAddress}</div>` : order.delivery_address ? `<div><strong>Delivery Address:</strong> ${order.delivery_address}</div>` : ''}
    </div>
    
    <div class="section">
        <div><strong>Status:</strong> ${order.status.replace('_', ' ').toUpperCase()}</div>
        ${order.payment_status ? `<div><strong>Payment:</strong> ${order.payment_status.replace('_', ' ').toUpperCase()}</div>` : ''}
        ${order.fulfillment_type ? `<div><strong>Type:</strong> ${order.fulfillment_type.replace('_', ' ').toUpperCase()}</div>` : ''}
    </div>
    
    <div class="section">
        <div class="section-title">ORDER ITEMS</div>
        ${
          order.order_items
            ?.map((item, index) => {
              let itemHtml = `
            <div class="item">
                <div class="item-name">${index + 1}. ${item.item_name}</div>
                <div class="item-details">
                    Qty: ${item.quantity || 1} × ${formatCurrency(item.item_price)} = ${formatCurrency(item.line_total || item.item_price * (item.quantity || 1))}
                </div>`;

              if (item.selected_modifiers) {
                try {
                  const modifiers =
                    typeof item.selected_modifiers === 'string'
                      ? JSON.parse(item.selected_modifiers)
                      : item.selected_modifiers;

                  if (Array.isArray(modifiers)) {
                    modifiers.forEach((modifier: any) => {
                      itemHtml += `<div class="modifier">+ ${modifier.name || modifier.modifierGroupName || 'Modifier'}`;
                      if (modifier.price) {
                        itemHtml += ` (+${formatCurrency(modifier.price)})`;
                      }
                      itemHtml += '</div>';
                    });
                  }
                } catch (e) {
                  // Ignore parsing errors
                }
              }

              if (item.item_note) {
                itemHtml += `<div class="modifier">Note: ${item.item_note}</div>`;
              }

              itemHtml += '</div>';
              return itemHtml;
            })
            .join('') || ''
        }
    </div>
    
    <div class="totals">
        <div class="total-line">
            <span>Subtotal:</span>
            <span>${formatCurrency(order.sub_total)}</span>
        </div>
        ${
          order.delivery_fee != null && order.delivery_fee > 0
            ? `
        <div class="total-line">
            <span>Delivery Fee:</span>
            <span>${formatCurrency(order.delivery_fee)}</span>
        </div>`
            : ''
        }
        ${
          order.service_fee != null && order.service_fee > 0
            ? `
        <div class="total-line">
            <span>Service Fee:</span>
            <span>${formatCurrency(order.service_fee)}</span>
        </div>`
            : ''
        }
        ${
          order.state_tax != null && order.state_tax > 0
            ? `
        <div class="total-line">
            <span>State Tax:</span>
            <span>${formatCurrency(order.state_tax)}</span>
        </div>`
            : ''
        }
        ${
          order.tip_total != null && order.tip_total > 0
            ? `
        <div class="total-line">
            <span>Tip:</span>
            <span>${formatCurrency(order.tip_total)}</span>
        </div>`
            : ''
        }
        ${(() => {
          const _loyaltyAmt = order.loyalty_discount != null ? Number(order.loyalty_discount) : 0;
          const _totalDisc = order.discount_total != null ? Number(order.discount_total) : 0;
          const _otherAmt = _totalDisc - _loyaltyAmt;
          let discountHtml = '';
          if (_otherAmt > 0.005) {
            const _offer = parseOfferApplied(order.offer_applied);
            let details = '';
            if (_offer) {
              const offerType = _offer.discountType === 'percent' ? `${_offer.value}% off` : `$${_offer.value.toFixed(2)} off`;
              details += `<div style="font-size:11px;color:#059669;margin-left:10px;">Offer Applied: ${_offer.title} (${offerType})</div>`;
            }
            if (order.coupon_used) details += `<div style="font-size:11px;color:#059669;margin-left:10px;">Coupon: ${order.coupon_used}</div>`;
            if (order.gift_card_used) details += `<div style="font-size:11px;color:#059669;margin-left:10px;">Gift Card: ${order.gift_card_used}</div>`;
            discountHtml += `<div class="total-line" style="color: #059669;"><span>Discount</span><span>-${formatCurrency(_otherAmt)}</span></div>${details}`;
          }
          if (_loyaltyAmt > 0.005) {
            discountHtml += `<div class="total-line" style="color: #b47800;"><span>Loyalty Discount${order.loyalty_points_redeemed ? ` (${order.loyalty_points_redeemed} pts)` : ''}</span><span>-${formatCurrency(_loyaltyAmt)}</span></div>`;
          }
          return discountHtml;
        })()}
        <div class="total-line grand-total">
            <span>TOTAL:</span>
            <span>${formatCurrency(order.cart_total)}</span>
        </div>
        ${order.refund_amount != null && order.refund_amount > 0 ? `
        <div class="total-line" style="color: #ea580c; margin-top: 8px; padding-top: 8px; border-top: 1px dashed #fed7aa;">
            <span>REFUNDED${order.payment_status === 'partially_refunded' ? ' (partial)' : ''}:</span>
            <span>-${formatCurrency(order.refund_amount)}</span>
        </div>` : ''}
    </div>
    
    <div class="section">
        ${order.payment_method ? `<div><strong>Payment Method:</strong> ${order.payment_method.replace('_', ' ').toUpperCase()}</div>` : ''}
        ${order.payment_reference ? `<div><strong>Reference:</strong> ${order.payment_reference}</div>` : ''}
        ${order.scheduled_for ? `<div><strong>Scheduled For:</strong> ${formatDate(order.scheduled_for)}</div>` : ''}
    </div>
    
    ${
      order.order_note
        ? `
    <div class="section">
        <div class="section-title">ORDER NOTE</div>
        <div>${order.order_note}</div>
    </div>`
        : ''
    }
    
    <div class="footer">
        <div>Thank you for your order!</div>
        <div>Generated on: ${new Date().toLocaleString()}</div>
    </div>
</body>
</html>`;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  // Generate PDF invoice (same format as customer-facing invoice)
  const generatePDFReceipt = (order: Order) => {
    const customerName =
      order.contact_first_name || order.contact_last_name
        ? `${order.contact_first_name || ''} ${order.contact_last_name || ''}`.trim()
        : 'N/A';
    const orderNumber = order.order_number || order.order_id;
    const offer = parseOfferApplied(order.offer_applied);

    // Normalize order items to match the shared invoice format
    const items = (order.order_items || []).map((item) => {
      let modifiers: Array<{ name: string; price: number }> | null = null;
      if (item.selected_modifiers) {
        try {
          const raw =
            typeof item.selected_modifiers === 'string'
              ? JSON.parse(item.selected_modifiers)
              : item.selected_modifiers;
          if (Array.isArray(raw)) {
            modifiers = raw.map((m: any) => ({
              name: m.name || m.modifierGroupName || 'Modifier',
              price: Number(m.price) || 0,
            }));
          }
        } catch {
          // ignore
        }
      }
      return {
        item_name: item.item_name,
        item_price: item.item_price,
        quantity: item.quantity || 1,
        line_total: item.line_total || item.item_price * (item.quantity || 1),
        selected_modifiers: modifiers,
        base_item_price: item.base_item_price ?? item.item_price,
        modifier_total: item.modifier_total ?? 0,
        item_note: item.item_note || null,
      };
    });

    const doc = generateInvoicePDF({
      orderNumber,
      restaurantName,
      customerName,
      email: order.contact_email || '',
      phone: order.contact_phone || '',
      fulfillmentLabel: order.fulfillment_type
        ? order.fulfillment_type
            .replace('_', ' ')
            .replace(/\b\w/g, (c) => c.toUpperCase())
        : 'N/A',
      address: order.delivery_address || '',
      pickupAddress: order.fulfillment_type === 'pickup' ? pickupAddress : null,
      paymentMethod: order.payment_method?.replace('_', ' ') || '',
      placedAt: order.placed_at
        ? formatDate(order.placed_at)
        : formatDate(order.created_at),
      items,
      subtotal: order.sub_total,
      total: order.cart_total,
      discount: order.discount_total ?? null,
      loyaltyDiscount: order.loyalty_discount ?? null,
      loyaltyPointsRedeemed: order.loyalty_points_redeemed ?? null,
      deliveryFee: order.delivery_fee ?? null,
      tip: order.tip_total ?? null,
      tax: order.service_fee ?? null,
      offerApplied: offer,
      couponCode: order.coupon_used || '',
      giftCardCode: order.gift_card_used || '',
      orderNote: order.order_note || '',
    });

    doc.save(`invoice-${orderNumber}.pdf`);
  };

  // Build kitchen ticket data from an order
  const buildKitchenTicketData = (order: Order) => {
    const orderNumber = order.order_number || order.order_id;

    const items = (order.order_items || []).map((item) => {
      let modifiers: Array<{ name: string; groupName?: string; price?: number }> | null = null;
      if (item.selected_modifiers) {
        try {
          const raw =
            typeof item.selected_modifiers === 'string'
              ? JSON.parse(item.selected_modifiers)
              : item.selected_modifiers;
          if (Array.isArray(raw)) {
            modifiers = raw
              .map((m: any) => ({
                name: m.name || m.modifierGroupName || 'Modifier',
                groupName: m.modifierGroupName || undefined,
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
        selected_modifiers:
          modifiers && modifiers.length > 0 ? modifiers : null,
        item_note: item.item_note || null,
      };
    });

    return {
      orderNumber,
      restaurantName,
      fulfillmentLabel: order.fulfillment_type
        ? order.fulfillment_type
            .replace('_', ' ')
            .replace(/\b\w/g, (c) => c.toUpperCase())
        : 'Pickup',
      placedAt: order.placed_at
        ? formatDate(order.placed_at)
        : formatDate(order.created_at),
      items,
      orderNote: order.order_note || '',
    };
  };

  // Print kitchen ticket via QZ Tray, or download PDF as fallback
  const [printingKotOrderId, setPrintingKotOrderId] = useState<string | null>(null);

  const printKitchenTicket = async (order: Order) => {
    const ticketData = buildKitchenTicketData(order);

    // Try QZ Tray if printer is configured
    if (printerSettings?.printerName) {
      setPrintingKotOrderId(order.order_id);
      try {
        const qzLib = await import('@/lib/qz-tray');
        if (!qzLib.isQZConnected()) {
          await qzLib.connectQZ();
        }

        const columns = printerSettings.paperSize === '58mm' ? 32 : 48;

        if (printerSettings.printMethod === 'pdf') {
          const doc = generateKitchenTicketPDF(ticketData);
          const pdfBase64 = doc.output('datauristring').split(',')[1];
          await qzLib.printPDF({
            printer: printerSettings.printerName,
            pdfBase64,
          });
        } else {
          const { generateKOTEscPos } = await import('@/lib/generate-kot-escpos');
          const data = generateKOTEscPos(ticketData, columns);
          await qzLib.printRaw({
            printer: printerSettings.printerName,
            data,
            columns,
          });
        }
        return;
      } catch (err) {
        console.error('[KOT] QZ Tray print failed, falling back to PDF download:', err);
      } finally {
        setPrintingKotOrderId(null);
      }
    }

    // Fallback: download PDF
    const doc = generateKitchenTicketPDF(ticketData);
    doc.save(`kitchen-ticket-${ticketData.orderNumber}.pdf`);
  };

  if (loading && orders.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="inline-flex items-center gap-3 rounded-xl border border-purple-200 bg-purple-50 px-5 py-3.5">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-purple-600 border-t-transparent"></div>
          <p className="text-sm font-medium text-gray-700">Loading orders...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <section className="rounded-xl border border-red-200 bg-red-50 p-5 shadow-sm">
          <div className="text-center">
            <p className="text-sm text-red-600 mb-4">{error}</p>
            <button
              onClick={() => fetchOrders(1)}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header + Search + Filters */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 pb-3">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-gray-900">Orders</h2>
            <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-gray-600">
              {pagination.total}
            </span>
            {printerSettings?.autoPrintKot && printerSettings.printerName && (
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${
                autoPrint.isConnected
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-amber-100 text-amber-700'
              }`}>
                <span className={`h-1.5 w-1.5 rounded-full ${autoPrint.isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                {autoPrint.isConnected ? `Auto-Print${autoPrint.printedCount > 0 ? ` (${autoPrint.printedCount})` : ''}` : 'Connecting...'}
              </span>
            )}
          </div>
          <div className="relative w-full sm:w-72">
            <svg className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35m1.85-5.15a7 7 0 1 1-14 0 7 7 0 0 1 14 0z" />
            </svg>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search orders..."
              className="w-full rounded-lg border border-gray-200 bg-gray-50 py-1.5 pl-8 pr-8 text-sm text-gray-700 placeholder:text-gray-400 focus:border-purple-400 focus:bg-white focus:ring-1 focus:ring-purple-400"
            />
            {searchTerm && (
              <button type="button" onClick={() => setSearchTerm('')} className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-gray-400 hover:text-gray-600">
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 border-t border-gray-100 px-4 py-2.5">
          <button
            type="button"
            onClick={() => setStatusFilter('')}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              statusFilter === ''
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            All
          </button>
          {Object.values(ORDER_STATUSES).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors capitalize ${
                statusFilter === status
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {status.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white py-16 text-center">
          <svg className="mx-auto mb-3 h-10 w-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-sm font-medium text-gray-900">No orders found</p>
          <p className="mt-1 text-xs text-gray-500">
            {searchTerm ? `No results for "${searchTerm}"` : 'No orders have been placed yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order) => {
            const customerName = order.contact_first_name || order.contact_last_name
              ? `${order.contact_first_name || ''} ${order.contact_last_name || ''}`.trim()
              : 'N/A';
            const offer = parseOfferApplied(order.offer_applied);
            const loyaltyAmt = order.loyalty_discount != null ? Number(order.loyalty_discount) : 0;
            const totalDisc = order.discount_total != null ? Number(order.discount_total) : 0;
            const otherDiscAmt = totalDisc - loyaltyAmt;
            const isCancelled = order.status === 'cancelled';
            const isRefunded = order.payment_status === 'refunded' || order.payment_status === 'partially_refunded';
            const hasTags = offer || otherDiscAmt > 0.005 || loyaltyAmt > 0.005 || order.coupon_used || order.gift_card_used || order.order_note || (isCancelled && (order.cancelled_by || order.cancelled_at)) || (isRefunded && order.refunded_at);

            return (
              <div
                key={order.order_id}
                className={`rounded-xl border bg-white shadow-sm overflow-hidden transition-shadow hover:shadow-md ${
                  isCancelled ? 'border-red-200' : isRefunded ? 'border-orange-200' : 'border-gray-200'
                }`}
              >
                {/* Top: Header bar */}
                <div className={`flex items-center justify-between gap-3 px-5 py-3 ${
                  isCancelled ? 'bg-red-50/60' : isRefunded ? 'bg-orange-50/60' : 'bg-gray-50/80'
                }`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-gray-900 tabular-nums">#{order.order_number || order.order_id.slice(0, 8)}</span>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${getOrderStatusColor(order.status)}`}>
                      {order.status.replace('_', ' ').toUpperCase()}
                    </span>
                    {order.payment_status && (
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${getPaymentStatusColor(order.payment_status)}`}>
                        {order.payment_status.replace('_', ' ').toUpperCase()}
                      </span>
                    )}
                    {order.fulfillment_type && (
                      <span className="inline-flex items-center rounded-full bg-blue-100/80 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700">
                        {order.fulfillment_type === 'pickup' ? 'Pickup' : order.fulfillment_type === 'delivery' ? 'Delivery' : order.fulfillment_type.replace('_', ' ')}
                      </span>
                    )}
                    <span className="text-xs text-gray-400">{formatDate(order.created_at)}</span>
                  </div>
                  <p className="text-lg font-bold tabular-nums text-gray-900">{formatCurrency(formatOrderTotal(order))}</p>
                </div>

                {/* Body */}
                <div className="px-5 py-4">
                  {/* Info columns */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3">
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400">Customer</p>
                      <p className="mt-0.5 text-sm font-semibold text-gray-900">{customerName}</p>
                      {order.contact_phone && <p className="text-xs text-gray-500">{order.contact_phone}</p>}
                      {order.contact_email && <p className="text-xs text-gray-500 truncate">{order.contact_email}</p>}
                    </div>
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400">Items</p>
                      <p className="mt-0.5 text-sm font-semibold text-gray-900">{formatOrderItemsCount(order)} items</p>
                      <p className="text-xs text-gray-500">Subtotal {formatCurrency(order.sub_total)}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400">Payment</p>
                      <p className="mt-0.5 text-sm font-semibold text-gray-900 capitalize">{order.payment_method?.replace('_', ' ') || 'N/A'}</p>
                      {order.payment_reference && <p className="text-xs text-gray-500 truncate" title={order.payment_reference}>Ref: {order.payment_reference}</p>}
                    </div>
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400">{order.fulfillment_type === 'pickup' ? 'Pickup' : 'Delivery'}</p>
                      {order.fulfillment_type === 'pickup' && pickupAddress ? (
                        <p className="mt-0.5 text-xs text-gray-700 leading-relaxed line-clamp-2">{pickupAddress}</p>
                      ) : order.delivery_address ? (
                        <p className="mt-0.5 text-xs text-gray-700 leading-relaxed line-clamp-2">{order.delivery_address}</p>
                      ) : (
                        <p className="mt-0.5 text-xs text-gray-400">N/A</p>
                      )}
                      {order.scheduled_for && (
                        <p className="text-xs font-medium text-purple-600">Scheduled: {formatDate(order.scheduled_for)}</p>
                      )}
                    </div>
                  </div>

                  {/* Tags row */}
                  {hasTags && (
                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      {offer && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-[11px] font-medium text-green-700">
                          {offer.title} {offer.discountType === 'percent' ? `${offer.value}%` : formatCurrency(offer.value)}
                          {typeof offer.discountAmount === 'number' && offer.discountAmount > 0 && (
                            <span className="font-bold">-{formatCurrency(offer.discountAmount)}</span>
                          )}
                        </span>
                      )}
                      {!offer && otherDiscAmt > 0.005 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-[11px] font-medium text-green-700">
                          Discount <span className="font-bold">-{formatCurrency(otherDiscAmt)}</span>
                        </span>
                      )}
                      {loyaltyAmt > 0.005 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700">
                          Loyalty -{formatCurrency(loyaltyAmt)}
                          {order.loyalty_points_redeemed != null && Number(order.loyalty_points_redeemed) > 0 && (
                            <span className="text-amber-500">({order.loyalty_points_redeemed} pts)</span>
                          )}
                        </span>
                      )}
                      {order.coupon_used && (
                        <span className="inline-flex items-center rounded-full bg-purple-50 px-2.5 py-1 text-[11px] font-mono font-medium text-purple-700">
                          {order.coupon_used}
                        </span>
                      )}
                      {order.gift_card_used && (
                        <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-mono font-medium text-indigo-700">
                          GC: {order.gift_card_used}
                        </span>
                      )}
                      {order.order_note && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-yellow-50 px-2.5 py-1 text-[11px] text-yellow-700" title={order.order_note}>
                          <svg className="h-3 w-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          {order.order_note.length > 50 ? order.order_note.slice(0, 50) + '...' : order.order_note}
                        </span>
                      )}
                      {isCancelled && (order.cancelled_by || order.cancelled_at) && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-medium text-red-700">
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          Cancelled{order.cancelled_by ? ` by ${order.cancelled_by}` : ''}{order.cancelled_at ? ` - ${formatDate(order.cancelled_at)}` : ''}
                        </span>
                      )}
                      {isRefunded && order.refunded_at && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-1 text-[11px] font-medium text-orange-700">
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                          </svg>
                          {order.payment_status === 'partially_refunded' ? 'Partial' : 'Full'} Refund{order.refund_amount ? ` ${formatCurrency(order.refund_amount)}` : ''}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Bottom: Actions bar */}
                <div className="flex items-center justify-between gap-3 border-t border-gray-100 bg-gray-50/50 px-5 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      {updatingOrderId === order.order_id && (
                        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-white/70">
                          <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-300 border-t-purple-600" />
                        </div>
                      )}
                      <select
                        value={order.status}
                        disabled={updatingOrderId === order.order_id}
                        onChange={(e) => {
                          const newStatus = e.target.value;
                          if (newStatus === ORDER_STATUSES.CANCELLED || newStatus === ORDER_STATUSES.REFUNDED) {
                            setConfirmAction({
                              orderId: order.order_id,
                              orderNumber: order.order_number || order.order_id,
                              status: newStatus,
                              orderTotal: order.cart_total || 0,
                              paymentReference: order.payment_reference,
                            });
                            setRefundType('full');
                            setRefundAmount('');
                            e.target.value = order.status;
                          } else {
                            handleUpdateOrderStatus(order.order_id, newStatus);
                          }
                        }}
                        className="h-8 rounded-lg border border-gray-200 bg-white pl-2.5 pr-7 text-xs font-medium text-gray-700 focus:border-purple-400 focus:ring-1 focus:ring-purple-400 disabled:opacity-50"
                      >
                        {Object.values(ORDER_STATUSES).map((status) => {
                          const isDestructive = status === ORDER_STATUSES.CANCELLED || status === ORDER_STATUSES.REFUNDED;
                          const isCurrentStatus = status === order.status;
                          let canCancel = true;
                          if (isDestructive) {
                            if (order.status === ORDER_STATUSES.CANCELLED || order.status === ORDER_STATUSES.REFUNDED) {
                              canCancel = false;
                            } else if (status === ORDER_STATUSES.REFUNDED) {
                              canCancel = true;
                            } else {
                              if (order.fulfillment_type === 'pickup') {
                                canCancel = order.status !== ORDER_STATUSES.READY && order.status !== ORDER_STATUSES.DELIVERED;
                              } else {
                                canCancel = order.status !== ORDER_STATUSES.DELIVERED;
                              }
                            }
                          }
                          const isEditable = isDestructive && canCancel;
                          const isViewOnly = !isEditable && !isCurrentStatus;
                          return (
                            <option key={status} value={status} disabled={isViewOnly}>
                              {status.replace('_', ' ').toUpperCase()}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => printKitchenTicket(order)}
                      disabled={printingKotOrderId === order.order_id}
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 text-xs font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors disabled:opacity-50"
                      title={printerSettings?.printerName ? 'Print Kitchen Ticket' : 'Download Kitchen Ticket'}
                    >
                      {printingKotOrderId === order.order_id ? (
                        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
                      ) : (
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                      )}
                      KOT
                    </button>
                    <button
                      onClick={() => handleViewOrder(order)}
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-purple-600 px-3.5 text-xs font-medium text-white hover:bg-purple-700 transition-colors"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-5 py-3 shadow-sm">
          <p className="text-sm text-gray-500">
            Showing <span className="font-medium text-gray-700">{(pagination.page - 1) * pagination.limit + 1}</span> to <span className="font-medium text-gray-700">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> of <span className="font-medium text-gray-700">{pagination.total}</span> orders
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:text-gray-300 disabled:border-gray-100 disabled:hover:bg-transparent transition-colors"
            >
              Previous
            </button>
            <span className="px-3 py-1.5 text-sm tabular-nums text-gray-500">
              {pagination.page} / {pagination.totalPages}
            </span>
            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:text-gray-300 disabled:border-gray-100 disabled:hover:bg-transparent transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Order Details Modal */}
      {showOrderDetails &&
      selectedOrder &&
      isMounted &&
      typeof document !== 'undefined' &&
      document.body
        ? createPortal(
            <div className="fixed inset-0 top-0 z-[100] overflow-y-auto bg-black/50">
              <div className="mx-auto w-full max-w-5xl px-4 pb-4 pt-4 sm:pt-6">
                <div className="w-full overflow-hidden rounded-xl bg-white shadow-2xl">
                  {/* Header */}
                  <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">
                        Order #
                        {selectedOrder.order_number || selectedOrder.order_id}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Created {formatDate(selectedOrder.created_at)}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Receipt Actions */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => printReceipt(selectedOrder)}
                          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                          title="Print Receipt"
                        >
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                            />
                          </svg>
                          Print
                        </button>

                        <button
                          type="button"
                          onClick={() => generatePDFReceipt(selectedOrder)}
                          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors"
                          title="Download PDF Receipt"
                        >
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                          Download PDF
                        </button>

                        <button
                          type="button"
                          onClick={() => printKitchenTicket(selectedOrder)}
                          disabled={printingKotOrderId === selectedOrder.order_id}
                          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                          title={printerSettings?.printerName ? 'Print Kitchen Ticket' : 'Download Kitchen Ticket'}
                        >
                          {printingKotOrderId === selectedOrder.order_id ? (
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-400 border-t-gray-700" />
                          ) : (
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                            </svg>
                          )}
                          {printingKotOrderId === selectedOrder.order_id ? 'Printing...' : 'Kitchen Ticket'}
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowOrderDetails(false)}
                        className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <svg
                          className="h-6 w-6"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
                    <div className="p-6 space-y-8">
                      {/* Status Badges */}
                      <div className="flex flex-wrap gap-3">
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium ${getOrderStatusColor(selectedOrder.status)}`}
                        >
                          {selectedOrder.status.replace('_', ' ').toUpperCase()}
                        </span>
                        {selectedOrder.payment_status && (
                          <span
                            className={`inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium ${getPaymentStatusColor(selectedOrder.payment_status)}`}
                          >
                            Payment:{' '}
                            {selectedOrder.payment_status
                              .replace('_', ' ')
                              .toUpperCase()}
                          </span>
                        )}
                        {selectedOrder.fulfillment_type && (
                          <span className="inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium bg-blue-100 text-blue-800">
                            {selectedOrder.fulfillment_type
                              .replace('_', ' ')
                              .toUpperCase()}
                          </span>
                        )}
                      </div>

                      {/* Cancellation Info */}
                      {selectedOrder.status === 'cancelled' && (selectedOrder.cancelled_by || selectedOrder.cancelled_at) && (
                        <div className="rounded-xl border border-red-200 bg-gradient-to-b from-red-50 to-red-50/40 p-4">
                          <div className="flex items-center gap-2.5 mb-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100">
                              <svg className="h-4 w-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </div>
                            <span className="text-sm font-semibold text-red-900">Order Cancelled</span>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            {selectedOrder.cancelled_by && (
                              <div className="rounded-lg bg-white/70 border border-red-100 px-3 py-2.5">
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-red-400">Cancelled By</p>
                                <p className="mt-0.5 text-sm font-medium text-red-800 capitalize">{selectedOrder.cancelled_by}</p>
                              </div>
                            )}
                            {selectedOrder.cancelled_at && (
                              <div className="rounded-lg bg-white/70 border border-red-100 px-3 py-2.5">
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-red-400">Cancelled On</p>
                                <p className="mt-0.5 text-sm font-medium text-red-800">{formatDate(selectedOrder.cancelled_at)}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Refund Info */}
                      {(selectedOrder.payment_status === 'refunded' || selectedOrder.payment_status === 'partially_refunded') && selectedOrder.refunded_at && (
                        <div className="rounded-xl border border-orange-200 bg-gradient-to-b from-orange-50 to-orange-50/40 p-4">
                          <div className="flex items-center gap-2.5 mb-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100">
                              <svg className="h-4 w-4 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                              </svg>
                            </div>
                            <span className="text-sm font-semibold text-orange-900">
                              {selectedOrder.payment_status === 'partially_refunded' ? 'Partial Refund Issued' : 'Full Refund Issued'}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            {selectedOrder.refund_amount != null && selectedOrder.refund_amount > 0 && (
                              <div className="rounded-lg bg-white/70 border border-orange-100 px-3 py-2.5">
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-orange-400">Refund Amount</p>
                                <p className="mt-0.5 text-lg font-bold text-orange-700">{formatCurrency(selectedOrder.refund_amount)}</p>
                              </div>
                            )}
                            <div className="rounded-lg bg-white/70 border border-orange-100 px-3 py-2.5">
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-orange-400">Refunded On</p>
                              <p className="mt-0.5 text-sm font-medium text-orange-800">{formatDate(selectedOrder.refunded_at)}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Delivery Status Timeline */}
                      {selectedOrder.fulfillment_type === 'delivery' && !['cancelled', 'failed', 'refunded'].includes(selectedOrder.status) && (() => {
                        const steps = [
                          { key: 'confirmed', label: 'Confirmed' },
                          { key: 'preparing', label: 'Preparing' },
                          { key: 'ready', label: 'Ready' },
                          { key: 'courier_assigned', label: 'Courier Assigned' },
                          { key: 'out_for_delivery', label: 'Out for Delivery' },
                          { key: 'delivered', label: 'Delivered' },
                        ];
                        const statusOrder = ['pending', 'confirmed', 'preparing', 'ready', 'courier_assigned', 'out_for_delivery', 'delivered'];
                        const orderStatus = (selectedOrder.status || 'pending').toLowerCase();
                        const dispatchStatus = (selectedOrder.delivery_dispatch_status || '').toLowerCase();

                        const orderIdx = statusOrder.indexOf(orderStatus);
                        const dispatchIdx = dispatchStatus === 'courier_assigned' ? statusOrder.indexOf('courier_assigned')
                          : dispatchStatus === 'picked_up' ? statusOrder.indexOf('out_for_delivery')
                          : dispatchStatus === 'delivered' ? statusOrder.indexOf('delivered')
                          : -1;
                        const activeIndex = Math.max(orderIdx, dispatchIdx);

                        return (
                          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Delivery Progress</p>
                            <div className="flex items-start gap-0">
                              {steps.map((step, idx) => {
                                const stepIdx = statusOrder.indexOf(step.key);
                                const isCompleted = stepIdx <= activeIndex;
                                const isCurrent = stepIdx === activeIndex;
                                return (
                                  <div key={step.key} className="flex flex-1 flex-col items-center gap-1.5">
                                    <div className="flex w-full items-center">
                                      {idx > 0 && (
                                        <div className={`h-0.5 flex-1 rounded-full ${isCompleted ? 'bg-emerald-500' : 'bg-gray-200'}`} />
                                      )}
                                      <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                                        isCurrent ? 'bg-emerald-500 ring-4 ring-emerald-100' : isCompleted ? 'bg-emerald-500' : 'bg-gray-200'
                                      }`}>
                                        {isCompleted ? (
                                          <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                          </svg>
                                        ) : (
                                          <span className="h-2 w-2 rounded-full bg-gray-400" />
                                        )}
                                      </div>
                                      {idx < steps.length - 1 && (
                                        <div className={`h-0.5 flex-1 rounded-full ${stepIdx < activeIndex ? 'bg-emerald-500' : 'bg-gray-200'}`} />
                                      )}
                                    </div>
                                    <span className={`text-center text-[10px] font-medium leading-tight ${isCurrent ? 'text-emerald-700' : isCompleted ? 'text-gray-700' : 'text-gray-400'}`}>
                                      {step.label}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}

                      {/* Order Summary Grid */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="bg-gray-50 rounded-lg p-6">
                          <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                            <svg
                              className="h-5 w-5 mr-2 text-gray-600"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                              />
                            </svg>
                            Customer Information
                          </h4>
                          <div className="space-y-3">
                            <div>
                              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                Name
                              </p>
                              <p className="text-sm font-medium text-gray-900 mt-1">
                                {selectedOrder.contact_first_name ||
                                selectedOrder.contact_last_name
                                  ? `${selectedOrder.contact_first_name || ''} ${selectedOrder.contact_last_name || ''}`.trim()
                                  : 'N/A'}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                Email
                              </p>
                              <p className="text-sm text-gray-900 mt-1 break-all">
                                {selectedOrder.contact_email || 'N/A'}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                Phone
                              </p>
                              <p className="text-sm text-gray-900 mt-1">
                                {selectedOrder.contact_phone || 'N/A'}
                              </p>
                            </div>
                            {selectedOrder.fulfillment_type === 'pickup' && pickupAddress ? (
                              <div>
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                  Pickup Address
                                </p>
                                <p className="text-sm text-gray-900 mt-1 leading-relaxed">
                                  {pickupAddress}
                                </p>
                              </div>
                            ) : selectedOrder.delivery_address ? (
                              <div>
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                  Delivery Address
                                </p>
                                <p className="text-sm text-gray-900 mt-1 leading-relaxed">
                                  {selectedOrder.delivery_address}
                                </p>
                              </div>
                            ) : null}
                          </div>
                        </div>

                        <div className="bg-gray-50 rounded-lg p-6">
                          <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                            <svg
                              className="h-5 w-5 mr-2 text-gray-600"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                              />
                            </svg>
                            Order Information
                          </h4>
                          <div className="space-y-3">
                            <div>
                              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                Payment Method
                              </p>
                              <p className="text-sm text-gray-900 mt-1">
                                {selectedOrder.payment_method
                                  ?.replace('_', ' ')
                                  .toUpperCase() || 'N/A'}
                              </p>
                            </div>
                            {selectedOrder.payment_reference && (
                              <div>
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                  Payment Reference
                                </p>
                                <p className="text-sm text-gray-900 mt-1 font-mono">
                                  {selectedOrder.payment_reference}
                                </p>
                              </div>
                            )}
                            {selectedOrder.scheduled_for && (
                              <div>
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                  Scheduled For
                                </p>
                                <p className="text-sm text-gray-900 mt-1">
                                  {formatDate(selectedOrder.scheduled_for)}
                                </p>
                              </div>
                            )}
                            {selectedOrder.delivery_provider && (
                              <div>
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                  Delivery Provider
                                </p>
                                <p className="text-sm text-gray-900 mt-1">
                                  {selectedOrder.delivery_provider
                                    .replace(/_/g, ' ')
                                    .toUpperCase()}
                                </p>
                              </div>
                            )}
                            {selectedOrder.delivery_dispatch_status && (
                              <div>
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                  Delivery Status
                                </p>
                                <p className="text-sm text-gray-900 mt-1">
                                  {selectedOrder.delivery_dispatch_status
                                    .replace(/_/g, ' ')
                                    .toUpperCase()}
                                </p>
                              </div>
                            )}
                            {selectedOrder.delivery_provider_delivery_id && (
                              <div>
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                  Delivery ID
                                </p>
                                <p className="text-sm text-gray-900 mt-1 font-mono">
                                  {selectedOrder.delivery_provider_delivery_id}
                                </p>
                              </div>
                            )}
                            {selectedOrder.delivery_tracking_url && (
                              <div>
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                  Tracking
                                </p>
                                <a
                                  href={selectedOrder.delivery_tracking_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-sm font-medium text-blue-600 hover:text-blue-500"
                                >
                                  Open tracking link
                                </a>
                              </div>
                            )}
                            {selectedOrder.delivery_error && (
                              <div>
                                <p className="text-xs font-medium uppercase tracking-wide text-red-500">
                                  Delivery Error
                                </p>
                                <p className="text-sm text-red-700 mt-1">
                                  {selectedOrder.delivery_error}
                                </p>
                              </div>
                            )}
                            {selectedOrder.coupon_used && (
                              <div>
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                  Coupon Used
                                </p>
                                <p className="text-sm text-gray-900 mt-1 font-mono">
                                  {selectedOrder.coupon_used}
                                </p>
                              </div>
                            )}
                            {selectedOrder.gift_card_used && (
                              <div>
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                  Gift Card Used
                                </p>
                                <p className="text-sm text-gray-900 mt-1 font-mono">
                                  {selectedOrder.gift_card_used}
                                </p>
                              </div>
                            )}
                            {/* {selectedOrder.offer_applied && (
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Offer Applied</p>
                          <p className="text-sm text-gray-900 mt-1 font-mono">{selectedOrder.offer_applied}</p>
                        </div>
                      )} */}
                          </div>
                        </div>
                      </div>

                      {/* Order Items */}
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                          <svg
                            className="h-5 w-5 mr-2 text-gray-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                            />
                          </svg>
                          Order Items ({selectedOrder.order_items?.length || 0})
                        </h4>

                        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                          {/* Table header */}
                          <div className="grid grid-cols-[1fr_60px_90px_90px] sm:grid-cols-[1fr_70px_100px_100px] gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-200 text-xs font-semibold uppercase tracking-wider text-gray-500">
                            <span>Item</span>
                            <span className="text-center">Qty</span>
                            <span className="text-right">Price</span>
                            <span className="text-right">Total</span>
                          </div>

                          {/* Item rows */}
                          <div className="divide-y divide-gray-100">
                            {selectedOrder.order_items?.map((item) => (
                              <div key={item.order_item_id} className="px-4 py-3 hover:bg-gray-50/50 transition-colors">
                                {/* Main row */}
                                <div className="grid grid-cols-[1fr_60px_90px_90px] sm:grid-cols-[1fr_70px_100px_100px] gap-2 items-baseline">
                                  <span className="text-sm font-semibold text-gray-900 leading-snug">{item.item_name}</span>
                                  <span className="text-sm text-gray-700 text-center tabular-nums">{item.quantity || 1}</span>
                                  <span className="text-sm text-gray-600 text-right tabular-nums">{formatCurrency(item.item_price)}</span>
                                  <span className="text-sm font-bold text-gray-900 text-right tabular-nums">{formatCurrency(item.line_total || item.item_price * (item.quantity || 1))}</span>
                                </div>

                                {/* Modifiers */}
                                {item.selected_modifiers && (() => {
                                  try {
                                    const parsed = typeof item.selected_modifiers === 'string' ? JSON.parse(item.selected_modifiers) : item.selected_modifiers;
                                    if (Array.isArray(parsed) && parsed.length > 0) {
                                      return (
                                        <div className="mt-1.5 flex flex-wrap gap-1.5 pl-0.5">
                                          {parsed.map((mod: any, idx: number) => (
                                            <span key={idx} className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                                              <span>{mod.name || mod.modifierGroupName || 'Modifier'}</span>
                                              {mod.price ? <span className="font-medium text-gray-500">+{formatCurrency(mod.price)}</span> : null}
                                            </span>
                                          ))}
                                        </div>
                                      );
                                    }
                                    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && Object.keys(parsed).length > 0) {
                                      return (
                                        <div className="mt-1.5 flex flex-wrap gap-1.5 pl-0.5">
                                          {Object.entries(parsed).map(([key, value]: [string, any], idx: number) => (
                                            <span key={idx} className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                                              <span>{key}:</span>
                                              <span className="font-medium text-gray-700">{typeof value === 'object' ? (value.name || JSON.stringify(value)) : String(value)}</span>
                                            </span>
                                          ))}
                                        </div>
                                      );
                                    }
                                    return null;
                                  } catch {
                                    return null;
                                  }
                                })()}

                                {/* Item note */}
                                {item.item_note && (
                                  <div className="mt-1.5 flex items-start gap-1.5 pl-0.5">
                                    <svg className="h-3.5 w-3.5 mt-0.5 shrink-0 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                    <p className="text-xs text-amber-700 italic leading-snug">{item.item_note}</p>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Order Totals */}
                      <div className="bg-gray-50 rounded-lg p-6">
                        <h4 className="text-lg font-semibold text-gray-900 mb-4">
                          Order Summary
                        </h4>
                        <div className="space-y-3">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Subtotal:</span>
                            <span className="font-medium text-gray-900">
                              {formatCurrency(selectedOrder.sub_total)}
                            </span>
                          </div>
                          {selectedOrder.delivery_fee != null &&
                            selectedOrder.delivery_fee > 0 && (
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Delivery Fee:</span>
                                <span className="font-medium text-gray-900">
                                  {formatCurrency(selectedOrder.delivery_fee)}
                                </span>
                              </div>
                            )}
                          {selectedOrder.service_fee != null &&
                            selectedOrder.service_fee > 0 && (
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Service Fee:</span>
                                <span className="font-medium text-gray-900">
                                  {formatCurrency(selectedOrder.service_fee)}
                                </span>
                              </div>
                            )}
                          {selectedOrder.state_tax != null &&
                            selectedOrder.state_tax > 0 && (
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">State Tax:</span>
                                <span className="font-medium text-gray-900">
                                  {formatCurrency(selectedOrder.state_tax)}
                                </span>
                              </div>
                            )}
                          {selectedOrder.tip_total != null &&
                            selectedOrder.tip_total > 0 && (
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Tip:</span>
                                <span className="font-medium text-gray-900">
                                  {formatCurrency(selectedOrder.tip_total)}
                                </span>
                              </div>
                            )}
                          {(() => {
                            const loyaltyAmt = selectedOrder.loyalty_discount != null ? Number(selectedOrder.loyalty_discount) : 0;
                            const totalDisc = selectedOrder.discount_total != null ? Number(selectedOrder.discount_total) : 0;
                            const otherAmt = totalDisc - loyaltyAmt;
                            return (
                              <>
                                {otherAmt > 0.005 && (
                                  <div>
                                    <div className="flex justify-between text-sm">
                                      <span className="text-gray-600">Discount:</span>
                                      <span className="font-medium text-green-600">
                                        -{formatCurrency(otherAmt)}
                                      </span>
                                    </div>
                                    {(() => {
                                      const offer = parseOfferApplied(selectedOrder.offer_applied);
                                      return offer ? (
                                        <p className="text-xs text-green-600 mt-0.5">
                                          Offer Applied: {offer.title}
                                          {offer.discountType === 'percent' ? ` (${offer.value}% off)` : ''}
                                        </p>
                                      ) : null;
                                    })()}
                                    {selectedOrder.coupon_used && (
                                      <p className="text-xs text-green-600 mt-0.5">Coupon: {selectedOrder.coupon_used}</p>
                                    )}
                                    {selectedOrder.gift_card_used && (
                                      <p className="text-xs text-green-600 mt-0.5">Gift Card: {selectedOrder.gift_card_used}</p>
                                    )}
                                  </div>
                                )}
                                {loyaltyAmt > 0.005 && (
                                  <div className="flex justify-between text-sm">
                                    <span className="text-gray-600 flex items-center gap-1.5">
                                      Loyalty Discount
                                      {selectedOrder.loyalty_points_redeemed != null &&
                                        selectedOrder.loyalty_points_redeemed > 0 && (
                                          <span className="inline-flex items-center rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                                            {selectedOrder.loyalty_points_redeemed} pts
                                          </span>
                                        )}
                                      :
                                    </span>
                                    <span className="font-medium text-amber-600">
                                      -{formatCurrency(loyaltyAmt)}
                                    </span>
                                  </div>
                                )}
                              </>
                            );
                          })()}
                          <div className="border-t border-gray-200 pt-3">
                            <div className="flex justify-between">
                              <span className="text-lg font-bold text-gray-900">
                                Total:
                              </span>
                              <span className="text-lg font-bold text-gray-900">
                                {formatCurrency(selectedOrder.cart_total)}
                              </span>
                            </div>
                          </div>
                          {selectedOrder.loyalty_points_earned != null &&
                            selectedOrder.loyalty_points_earned > 0 && (
                              <div className="mt-2 flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
                                <svg className="h-4 w-4 text-amber-500" viewBox="0 0 20 20" fill="currentColor">
                                  <path d="M10 1l2.39 4.84 5.34.78-3.87 3.77.91 5.33L10 13.28l-4.77 2.51.91-5.33L2.27 6.69l5.34-.78L10 1z" />
                                </svg>
                                <span className="text-xs font-semibold text-amber-800">
                                  +{selectedOrder.loyalty_points_earned} loyalty points earned
                                </span>
                              </div>
                            )}
                          {selectedOrder.refund_amount != null && selectedOrder.refund_amount > 0 && (
                            <div className="mt-2 flex justify-between border-t border-dashed border-orange-200 pt-2">
                              <span className="text-sm font-semibold text-orange-700">
                                Refunded{selectedOrder.payment_status === 'partially_refunded' ? ' (partial)' : ''}:
                              </span>
                              <span className="text-sm font-semibold text-orange-700">
                                -{formatCurrency(selectedOrder.refund_amount)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Order Note */}
                      {selectedOrder.order_note && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                          <div className="flex items-start">
                            <svg
                              className="h-5 w-5 text-yellow-600 mr-2 mt-0.5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                              />
                            </svg>
                            <div>
                              <p className="text-sm font-medium text-yellow-800">
                                Order Note
                              </p>
                              <p className="text-sm text-yellow-700 mt-1">
                                {selectedOrder.order_note}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}

      {/* Confirmation Dialog for Cancel / Refund */}
      {confirmAction &&
      isMounted &&
      typeof document !== 'undefined' &&
      document.body
        ? createPortal(
            <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50">
              <div className="mx-4 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
                <div className="mb-1 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                  <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                </div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900">
                  {confirmAction.status === ORDER_STATUSES.CANCELLED
                    ? 'Cancel Order'
                    : 'Refund Order'}
                </h3>
                <p className="mt-2 text-sm text-gray-600">
                  {confirmAction.status === ORDER_STATUSES.CANCELLED ? (
                    <>
                      Are you sure you want to{' '}
                      <span className="font-medium text-gray-900">cancel</span>{' '}
                      order{' '}
                      <span className="font-medium text-gray-900">
                        #{confirmAction.orderNumber}
                      </span>
                      ? This action cannot be undone.
                    </>
                  ) : (
                    <>
                      Refund order{' '}
                      <span className="font-medium text-gray-900">
                        #{confirmAction.orderNumber}
                      </span>
                      {' '}— total charged:{' '}
                      <span className="font-medium text-gray-900">
                        {formatCurrency(confirmAction.orderTotal || 0)}
                      </span>
                    </>
                  )}
                </p>

                {confirmAction.status === ORDER_STATUSES.REFUNDED && (
                  <div className="mt-4 space-y-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => { setRefundType('full'); setRefundAmount(''); }}
                        className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                          refundType === 'full'
                            ? 'border-orange-500 bg-orange-50 text-orange-700'
                            : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        Full Refund
                      </button>
                      <button
                        type="button"
                        onClick={() => setRefundType('partial')}
                        className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                          refundType === 'partial'
                            ? 'border-orange-500 bg-orange-50 text-orange-700'
                            : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        Partial Refund
                      </button>
                    </div>

                    {refundType === 'full' ? (
                      <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
                        <p className="text-sm text-gray-600">
                          Refund amount:{' '}
                          <span className="font-semibold text-gray-900">
                            {formatCurrency(confirmAction.orderTotal || 0)}
                          </span>
                        </p>
                      </div>
                    ) : (
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-600">
                          Refund Amount (max {formatCurrency(confirmAction.orderTotal || 0)})
                        </label>
                        <div className="relative">
                          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">$</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            max={confirmAction.orderTotal || 0}
                            value={refundAmount}
                            onChange={(e) => setRefundAmount(e.target.value)}
                            placeholder="0.00"
                            className="w-full rounded-lg border border-gray-300 py-2.5 pl-7 pr-3 text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-500"
                          />
                        </div>
                        {refundAmount && Number(refundAmount) > (confirmAction.orderTotal || 0) && (
                          <p className="mt-1 text-xs text-red-600">
                            Amount cannot exceed {formatCurrency(confirmAction.orderTotal || 0)}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-6 flex gap-3">
                  <button
                    onClick={() => setConfirmAction(null)}
                    disabled={updatingOrderId === confirmAction.orderId}
                    className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Go Back
                  </button>
                  <button
                    disabled={
                      updatingOrderId === confirmAction.orderId ||
                      (confirmAction.status === ORDER_STATUSES.REFUNDED &&
                        refundType === 'partial' &&
                        (!refundAmount || Number(refundAmount) <= 0 || Number(refundAmount) > (confirmAction.orderTotal || 0)))
                    }
                    onClick={async () => {
                      if (confirmAction.status === ORDER_STATUSES.REFUNDED) {
                        const amount =
                          refundType === 'full'
                            ? confirmAction.orderTotal || 0
                            : Number(refundAmount);
                        const isFullRefund = amount >= (confirmAction.orderTotal || 0);
                        const paymentStatus = isFullRefund
                          ? PAYMENT_STATUSES.REFUNDED
                          : PAYMENT_STATUSES.PARTIALLY_REFUNDED;
                        await handleUpdateOrderStatus(
                          confirmAction.orderId,
                          isFullRefund ? ORDER_STATUSES.REFUNDED : confirmAction.status,
                          paymentStatus,
                          amount,
                        );
                      } else {
                        await handleUpdateOrderStatus(
                          confirmAction.orderId,
                          confirmAction.status,
                        );
                      }
                      setConfirmAction(null);
                    }}
                    className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                      confirmAction.status === ORDER_STATUSES.CANCELLED
                        ? 'bg-red-600 hover:bg-red-700'
                        : 'bg-orange-600 hover:bg-orange-700'
                    }`}
                  >
                    {updatingOrderId === confirmAction.orderId ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        {confirmAction.status === ORDER_STATUSES.REFUNDED ? 'Processing Refund...' : 'Updating...'}
                      </span>
                    ) : confirmAction.status === ORDER_STATUSES.CANCELLED
                      ? 'Yes, Cancel Order'
                      : 'Yes, Refund Order'}
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
