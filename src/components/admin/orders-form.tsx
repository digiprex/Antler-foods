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

import { useState, useEffect, useCallback, useMemo } from 'react';
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

function parseOfferApplied(value: unknown): OfferApplied | null {
  if (!value) return null;
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    if (parsed && typeof parsed === 'object' && 'type' in parsed && 'title' in parsed) {
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

  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  // Fetch orders from API
  const fetchOrders = useCallback(async (page = 1) => {
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
  }, [restaurantId, pagination.limit, statusFilter]);

  // Filter orders based on search term
  const filteredOrders = useMemo(() => {
    if (!searchTerm.trim()) return orders;

    const normalizedSearch = searchTerm.trim().toLowerCase();
    return orders.filter((order) => {
      const customerName = `${order.contact_first_name || ''} ${order.contact_last_name || ''}`.toLowerCase();
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

  const handleUpdateOrderStatus = async (orderId: string, status: string, paymentStatus?: string) => {
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
            ? { ...order, status, payment_status: paymentStatus || order.payment_status }
            : order
        )
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
      alert(err instanceof Error ? err.message : 'Failed to update order status');
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
    const customerName = order.contact_first_name || order.contact_last_name
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
${order.delivery_address ? `Address: ${order.delivery_address}` : ''}

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
   Qty: ${item.quantity || 1} × ${formatCurrency(item.item_price)} = ${formatCurrency(item.line_total || (item.item_price * (item.quantity || 1)))}`;
      
      if (item.selected_modifiers) {
        try {
          const modifiers = typeof item.selected_modifiers === 'string'
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

    if (order.tax_total != null && order.tax_total > 0) {
      receiptContent += `\nTax: ${formatCurrency(order.tax_total)}`;
    }
    
    if (order.tip_total != null && order.tip_total > 0) {
      receiptContent += `\nTip: ${formatCurrency(order.tip_total)}`;
    }
    
    if (order.discount_total != null && order.discount_total > 0) {
      receiptContent += `\nDiscount: -${formatCurrency(order.discount_total)}`;
      const _offer = parseOfferApplied(order.offer_applied);
      if (_offer) {
        const offerType = _offer.discountType === 'percent' ? `${_offer.value}% off` : `$${_offer.value.toFixed(2)} off`;
        receiptContent += `\n  Offer Applied: ${_offer.title} (${offerType})`;
      }
      if (order.coupon_used) {
        receiptContent += `\n  Coupon: ${order.coupon_used}`;
      }
      if (order.gift_card_used) {
        receiptContent += `\n  Gift Card: ${order.gift_card_used}`;
      }
    }

    receiptContent += `\n${'='.repeat(50)}
TOTAL: ${formatCurrency(order.cart_total)}
${'='.repeat(50)}

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
    const customerName = order.contact_first_name || order.contact_last_name
      ? `${order.contact_first_name || ''} ${order.contact_last_name || ''}`.trim()
      : 'N/A';
    
    const orderDate = formatDate(order.created_at);
    const orderNumber = order.order_number || order.order_id;
    
    const printWindow = window.open('', '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes');
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
        ${order.delivery_address ? `<div><strong>Address:</strong> ${order.delivery_address}</div>` : ''}
    </div>
    
    <div class="section">
        <div><strong>Status:</strong> ${order.status.replace('_', ' ').toUpperCase()}</div>
        ${order.payment_status ? `<div><strong>Payment:</strong> ${order.payment_status.replace('_', ' ').toUpperCase()}</div>` : ''}
        ${order.fulfillment_type ? `<div><strong>Type:</strong> ${order.fulfillment_type.replace('_', ' ').toUpperCase()}</div>` : ''}
    </div>
    
    <div class="section">
        <div class="section-title">ORDER ITEMS</div>
        ${order.order_items?.map((item, index) => {
          let itemHtml = `
            <div class="item">
                <div class="item-name">${index + 1}. ${item.item_name}</div>
                <div class="item-details">
                    Qty: ${item.quantity || 1} × ${formatCurrency(item.item_price)} = ${formatCurrency(item.line_total || (item.item_price * (item.quantity || 1)))}
                </div>`;
          
          if (item.selected_modifiers) {
            try {
              const modifiers = typeof item.selected_modifiers === 'string'
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
        }).join('') || ''}
    </div>
    
    <div class="totals">
        <div class="total-line">
            <span>Subtotal:</span>
            <span>${formatCurrency(order.sub_total)}</span>
        </div>
        ${order.tax_total != null && order.tax_total > 0 ? `
        <div class="total-line">
            <span>Tax:</span>
            <span>${formatCurrency(order.tax_total)}</span>
        </div>` : ''}
        ${order.tip_total != null && order.tip_total > 0 ? `
        <div class="total-line">
            <span>Tip:</span>
            <span>${formatCurrency(order.tip_total)}</span>
        </div>` : ''}
        ${order.discount_total != null && order.discount_total > 0 ? (() => {
          const _offer = parseOfferApplied(order.offer_applied);
          let details = '';
          if (_offer) {
            const offerType = _offer.discountType === 'percent' ? `${_offer.value}% off` : `$${_offer.value.toFixed(2)} off`;
            details += `<div style="font-size:11px;color:#059669;margin-left:10px;">Offer Applied: ${_offer.title} (${offerType})</div>`;
          }
          if (order.coupon_used) {
            details += `<div style="font-size:11px;color:#059669;margin-left:10px;">Coupon: ${order.coupon_used}</div>`;
          }
          if (order.gift_card_used) {
            details += `<div style="font-size:11px;color:#059669;margin-left:10px;">Gift Card: ${order.gift_card_used}</div>`;
          }
          return `
        <div class="total-line" style="color: #059669;">
            <span>Discount</span>
            <span>-${formatCurrency(order.discount_total)}</span>
        </div>${details}`;
        })() : ''}
        <div class="total-line grand-total">
            <span>TOTAL:</span>
            <span>${formatCurrency(order.cart_total)}</span>
        </div>
    </div>
    
    <div class="section">
        ${order.payment_method ? `<div><strong>Payment Method:</strong> ${order.payment_method.replace('_', ' ').toUpperCase()}</div>` : ''}
        ${order.payment_reference ? `<div><strong>Reference:</strong> ${order.payment_reference}</div>` : ''}
        ${order.scheduled_for ? `<div><strong>Scheduled For:</strong> ${formatDate(order.scheduled_for)}</div>` : ''}
    </div>
    
    ${order.order_note ? `
    <div class="section">
        <div class="section-title">ORDER NOTE</div>
        <div>${order.order_note}</div>
    </div>` : ''}
    
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
    const customerName = order.contact_first_name || order.contact_last_name
      ? `${order.contact_first_name || ''} ${order.contact_last_name || ''}`.trim()
      : 'N/A';
    const orderNumber = order.order_number || order.order_id;
    const offer = parseOfferApplied(order.offer_applied);

    // Normalize order items to match the shared invoice format
    const items = (order.order_items || []).map((item) => {
      let modifiers: Array<{ name: string; price: number }> | null = null;
      if (item.selected_modifiers) {
        try {
          const raw = typeof item.selected_modifiers === 'string'
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
        ? order.fulfillment_type.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())
        : 'N/A',
      address: order.delivery_address || '',
      paymentMethod: order.payment_method?.replace('_', ' ') || '',
      placedAt: order.placed_at ? formatDate(order.placed_at) : formatDate(order.created_at),
      items,
      subtotal: order.sub_total,
      total: order.cart_total,
      discount: order.discount_total ?? null,
      tip: order.tip_total ?? null,
      tax: order.tax_total ?? null,
      offerApplied: offer,
      couponCode: order.coupon_used || '',
      giftCardCode: order.gift_card_used || '',
      orderNote: order.order_note || '',
    });

    doc.save(`invoice-${orderNumber}.pdf`);
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
    <div className="space-y-6">
      {/* Header + Filters */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Orders</h2>
            <p className="text-sm text-gray-600">Manage orders for {restaurantName}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-medium">
              <span className="rounded-full bg-purple-100 px-2.5 py-1 text-purple-800">
                Total: {pagination.total}
              </span>
              <span className="rounded-full bg-blue-100 px-2.5 py-1 text-blue-800">
                Page: {pagination.page} of {pagination.totalPages}
              </span>
            </div>
          </div>
        </div>

        {/* Status Filter Buttons */}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setStatusFilter('')}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              statusFilter === ''
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All Orders
          </button>
          {Object.values(ORDER_STATUSES).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors capitalize ${
                statusFilter === status
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {status.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35m1.85-5.15a7 7 0 1 1-14 0 7 7 0 0 1 14 0z" />
          </svg>
        </div>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by customer name, order number, email, or phone..."
          className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-10 text-sm text-gray-700 focus:border-purple-500 focus:ring-2 focus:ring-purple-500"
        />
        {searchTerm && (
          <button
            type="button"
            onClick={() => setSearchTerm('')}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="text-center py-12">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
            <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No orders found</h3>
          <p className="text-gray-600">
            {searchTerm ? `No orders match "${searchTerm}".` : 'No orders have been placed yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <div key={order.order_id} className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="p-6">
                {/* Header Section */}
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-4">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Order #{order.order_number || order.order_id}
                      </h3>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${getOrderStatusColor(order.status)}`}>
                        {order.status.replace('_', ' ').toUpperCase()}
                      </span>
                      {order.payment_status && (
                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${getPaymentStatusColor(order.payment_status)}`}>
                          {order.payment_status.replace('_', ' ').toUpperCase()}
                        </span>
                      )}
                      {order.fulfillment_type && (
                        <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium bg-blue-100 text-blue-800">
                          {order.fulfillment_type.replace('_', ' ').toUpperCase()}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    <select
                      value={order.status}
                      onChange={(e) => handleUpdateOrderStatus(order.order_id, e.target.value)}
                      className="w-full sm:w-auto rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-500"
                    >
                      {Object.values(ORDER_STATUSES).map((status) => (
                        <option key={status} value={status}>
                          {status.replace('_', ' ').toUpperCase()}
                        </option>
                      ))}
                    </select>

                    <button
                      onClick={() => handleViewOrder(order)}
                      className="w-full sm:w-auto rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      View Details
                    </button>
                  </div>
                </div>

                {/* Content Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Customer</p>
                    <p className="font-semibold text-gray-900 text-sm">
                      {order.contact_first_name || order.contact_last_name
                        ? `${order.contact_first_name || ''} ${order.contact_last_name || ''}`.trim()
                        : 'N/A'
                      }
                    </p>
                    {order.contact_email && (
                      <p className="text-gray-600 text-xs break-all">{order.contact_email}</p>
                    )}
                    {order.contact_phone && (
                      <p className="text-gray-600 text-xs">{order.contact_phone}</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Order Details</p>
                    <p className="font-bold text-gray-900 text-lg">
                      {formatCurrency(formatOrderTotal(order))}
                    </p>
                    <p className="text-gray-600 text-xs">
                      {formatOrderItemsCount(order)} items
                    </p>
                    <p className="text-gray-600 text-xs">
                      {formatDate(order.created_at)}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Payment</p>
                    <p className="font-medium text-gray-900 text-sm">
                      {order.payment_method?.replace('_', ' ').toUpperCase() || 'N/A'}
                    </p>
                    {order.payment_reference && (
                      <p className="text-gray-600 text-xs">Ref: {order.payment_reference}</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Delivery</p>
                    {order.delivery_address ? (
                      <p className="text-gray-900 text-xs leading-relaxed">{order.delivery_address}</p>
                    ) : (
                      <p className="text-gray-600 text-xs">N/A</p>
                    )}
                    {order.scheduled_for && (
                      <p className="text-gray-600 text-xs">
                        Scheduled: {formatDate(order.scheduled_for)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Offer Applied (auto offers only) */}
                {(() => {
                  const offer = parseOfferApplied(order.offer_applied);
                  return offer ? (
                    <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex flex-wrap items-center gap-2">
                      <span className="text-green-700 font-medium text-sm">Offer Applied: {offer.title}</span>
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800">
                        {offer.discountType === 'percent' ? `${offer.value}% off` : `$${offer.value.toFixed(2)} off`}
                      </span>
                      {typeof offer.discountAmount === 'number' && offer.discountAmount > 0 && (
                        <span className="text-green-800 text-xs font-semibold ml-auto">
                          −{formatCurrency(offer.discountAmount)}
                        </span>
                      )}
                    </div>
                  ) : null;
                })()}

                {/* Discount total (when no offer but discount exists, e.g. coupon/gift card) */}
                {(() => {
                  const offer = parseOfferApplied(order.offer_applied);
                  return !offer && order.discount_total != null && Number(order.discount_total) > 0 ? (
                    <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                      <span className="text-green-700 font-medium text-sm">Discount Applied</span>
                      <span className="text-green-800 text-xs font-semibold ml-auto">
                        −{formatCurrency(Number(order.discount_total))}
                      </span>
                    </div>
                  ) : null;
                })()}

                {/* Coupon Code */}
                {order.coupon_used && (
                  <div className="mt-2 p-3 bg-purple-50 border border-purple-200 rounded-lg flex items-center gap-2">
                    <span className="text-purple-700 font-medium text-sm">Coupon Used:</span>
                    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-mono bg-purple-100 text-purple-800">
                      {order.coupon_used}
                    </span>
                  </div>
                )}

                {/* Gift Card Code */}
                {order.gift_card_used && (
                  <div className="mt-2 p-3 bg-indigo-50 border border-indigo-200 rounded-lg flex items-center gap-2">
                    <span className="text-indigo-700 font-medium text-sm">Gift Card Used:</span>
                    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-mono bg-indigo-100 text-indigo-800">
                      {order.gift_card_used}
                    </span>
                  </div>
                )}

                {/* Order Note */}
                {order.order_note && (
                  <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      <span className="font-medium">Note:</span> {order.order_note}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
            {pagination.total} orders
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="px-3 py-2 text-sm font-medium text-gray-700">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Order Details Modal */}
      {showOrderDetails && selectedOrder && isMounted && typeof document !== 'undefined' && document.body ? createPortal(
        <div className="fixed inset-0 top-0 z-[100] overflow-y-auto bg-black/50">
          <div className="mx-auto w-full max-w-5xl px-4 pb-4 pt-4 sm:pt-6">
            <div className="w-full overflow-hidden rounded-xl bg-white shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50">
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  Order #{selectedOrder.order_number || selectedOrder.order_id}
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
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    Print
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => generatePDFReceipt(selectedOrder)}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors"
                    title="Download PDF Receipt"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Download PDF
                  </button>
                </div>
                
                <button
                  type="button"
                  onClick={() => setShowOrderDetails(false)}
                  className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
              <div className="p-6 space-y-8">
                {/* Status Badges */}
                <div className="flex flex-wrap gap-3">
                  <span className={`inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium ${getOrderStatusColor(selectedOrder.status)}`}>
                    {selectedOrder.status.replace('_', ' ').toUpperCase()}
                  </span>
                  {selectedOrder.payment_status && (
                    <span className={`inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium ${getPaymentStatusColor(selectedOrder.payment_status)}`}>
                      Payment: {selectedOrder.payment_status.replace('_', ' ').toUpperCase()}
                    </span>
                  )}
                  {selectedOrder.fulfillment_type && (
                    <span className="inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium bg-blue-100 text-blue-800">
                      {selectedOrder.fulfillment_type.replace('_', ' ').toUpperCase()}
                    </span>
                  )}
                </div>

                {/* Order Summary Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <svg className="h-5 w-5 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Customer Information
                    </h4>
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Name</p>
                        <p className="text-sm font-medium text-gray-900 mt-1">
                          {selectedOrder.contact_first_name || selectedOrder.contact_last_name
                            ? `${selectedOrder.contact_first_name || ''} ${selectedOrder.contact_last_name || ''}`.trim()
                            : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Email</p>
                        <p className="text-sm text-gray-900 mt-1 break-all">{selectedOrder.contact_email || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Phone</p>
                        <p className="text-sm text-gray-900 mt-1">{selectedOrder.contact_phone || 'N/A'}</p>
                      </div>
                      {selectedOrder.delivery_address && (
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Delivery Address</p>
                          <p className="text-sm text-gray-900 mt-1 leading-relaxed">{selectedOrder.delivery_address}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <svg className="h-5 w-5 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Order Information
                    </h4>
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Payment Method</p>
                        <p className="text-sm text-gray-900 mt-1">{selectedOrder.payment_method?.replace('_', ' ').toUpperCase() || 'N/A'}</p>
                      </div>
                      {selectedOrder.payment_reference && (
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Payment Reference</p>
                          <p className="text-sm text-gray-900 mt-1 font-mono">{selectedOrder.payment_reference}</p>
                        </div>
                      )}
                      {selectedOrder.scheduled_for && (
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Scheduled For</p>
                          <p className="text-sm text-gray-900 mt-1">{formatDate(selectedOrder.scheduled_for)}</p>
                        </div>
                      )}
                      {selectedOrder.coupon_used && (
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Coupon Used</p>
                          <p className="text-sm text-gray-900 mt-1 font-mono">{selectedOrder.coupon_used}</p>
                        </div>
                      )}
                      {selectedOrder.gift_card_used && (
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Gift Card Used</p>
                          <p className="text-sm text-gray-900 mt-1 font-mono">{selectedOrder.gift_card_used}</p>
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
                    <svg className="h-5 w-5 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                    Order Items ({selectedOrder.order_items?.length || 0})
                  </h4>
                  
                  <div className="space-y-4">
                    {selectedOrder.order_items?.map((item, index) => (
                      <div key={item.order_item_id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <h5 className="text-lg font-semibold text-gray-900 mb-2">{item.item_name}</h5>
                            
                            {/* Item Details Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-3">
                              <div>
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Unit Price</p>
                                <p className="text-sm font-bold text-gray-900">{formatCurrency(item.item_price)}</p>
                              </div>
                              <div>
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Quantity</p>
                                <p className="text-sm font-bold text-gray-900">×{item.quantity || 1}</p>
                              </div>
                              <div>
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Line Total</p>
                                <p className="text-lg font-bold text-purple-600">
                                  {formatCurrency(item.line_total || (item.item_price * (item.quantity || 1)))}
                                </p>
                              </div>
                            </div>

                            {/* Modifiers */}
                            {item.selected_modifiers && (
                              <div className="mb-3">
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Customizations</p>
                                <div className="bg-gray-50 rounded-lg p-3">
                                  {(() => {
                                    try {
                                      const modifiers = typeof item.selected_modifiers === 'string'
                                        ? JSON.parse(item.selected_modifiers)
                                        : item.selected_modifiers;
                                      
                                      if (Array.isArray(modifiers)) {
                                        return (
                                          <div className="space-y-2">
                                            {modifiers.map((modifier: any, idx: number) => (
                                              <div key={idx} className="flex justify-between items-center">
                                                <span className="text-sm text-gray-700">
                                                  {modifier.name || modifier.modifierGroupName || 'Modifier'}
                                                </span>
                                                {modifier.price && (
                                                  <span className="text-sm font-medium text-gray-900">
                                                    +{formatCurrency(modifier.price)}
                                                  </span>
                                                )}
                                              </div>
                                            ))}
                                          </div>
                                        );
                                      } else if (typeof modifiers === 'object') {
                                        return (
                                          <div className="space-y-2">
                                            {Object.entries(modifiers).map(([key, value]: [string, any], idx: number) => (
                                              <div key={idx} className="flex justify-between items-center">
                                                <span className="text-sm text-gray-700">{key}</span>
                                                <span className="text-sm font-medium text-gray-900">
                                                  {typeof value === 'object' ? value.name || JSON.stringify(value) : String(value)}
                                                </span>
                                              </div>
                                            ))}
                                          </div>
                                        );
                                      } else {
                                        return (
                                          <p className="text-sm text-gray-600">{String(modifiers)}</p>
                                        );
                                      }
                                    } catch (e) {
                                      return (
                                        <p className="text-sm text-gray-600">{String(item.selected_modifiers)}</p>
                                      );
                                    }
                                  })()}
                                </div>
                              </div>
                            )}

                            {/* Base Price and Modifier Breakdown */}
                            {(item.base_item_price || item.modifier_total) && (
                              <div className="mb-3">
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Price Breakdown</p>
                                <div className="bg-blue-50 rounded-lg p-3 space-y-1">
                                  {item.base_item_price && (
                                    <div className="flex justify-between text-sm">
                                      <span className="text-gray-600">Base Price:</span>
                                      <span className="font-medium text-gray-900">{formatCurrency(item.base_item_price)}</span>
                                    </div>
                                  )}
                                  {item.modifier_total && item.modifier_total > 0 && (
                                    <div className="flex justify-between text-sm">
                                      <span className="text-gray-600">Modifiers:</span>
                                      <span className="font-medium text-gray-900">+{formatCurrency(item.modifier_total)}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Special Instructions */}
                            {item.item_note && (
                              <div>
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Special Instructions</p>
                                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                                  <p className="text-sm text-yellow-800">{item.item_note}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Order Totals */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Subtotal:</span>
                      <span className="font-medium text-gray-900">{formatCurrency(selectedOrder.sub_total)}</span>
                    </div>
                    {selectedOrder.tax_total != null && selectedOrder.tax_total > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Tax:</span>
                        <span className="font-medium text-gray-900">{formatCurrency(selectedOrder.tax_total)}</span>
                      </div>
                    )}
                    {selectedOrder.tip_total != null && selectedOrder.tip_total > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Tip:</span>
                        <span className="font-medium text-gray-900">{formatCurrency(selectedOrder.tip_total)}</span>
                      </div>
                    )}
                    {selectedOrder.discount_total != null && selectedOrder.discount_total > 0 && (
                      <div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Discount:</span>
                          <span className="font-medium text-green-600">-{formatCurrency(selectedOrder.discount_total)}</span>
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
                          <p className="text-xs text-green-600 mt-0.5">
                            Coupon: {selectedOrder.coupon_used}
                          </p>
                        )}
                        {selectedOrder.gift_card_used && (
                          <p className="text-xs text-green-600 mt-0.5">
                            Gift Card: {selectedOrder.gift_card_used}
                          </p>
                        )}
                      </div>
                    )}
                    <div className="border-t border-gray-200 pt-3">
                      <div className="flex justify-between">
                        <span className="text-lg font-bold text-gray-900">Total:</span>
                        <span className="text-lg font-bold text-gray-900">{formatCurrency(selectedOrder.cart_total)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Order Note */}
                {selectedOrder.order_note && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <svg className="h-5 w-5 text-yellow-600 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      <div>
                        <p className="text-sm font-medium text-yellow-800">Order Note</p>
                        <p className="text-sm text-yellow-700 mt-1">{selectedOrder.order_note}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            </div>
          </div>
        </div>
      , document.body) : null}
    </div>
  );
}
