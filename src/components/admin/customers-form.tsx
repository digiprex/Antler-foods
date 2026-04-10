'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';

interface CustomerAddress {
  id: string;
  address: string;
  street: string | null;
  house_no: string | null;
  city: string;
  state: string;
  country: string;
  zip_code: string;
  saved_as: string;
  nearby_landmark: string | null;
  is_default: boolean;
}

interface Customer {
  customer_id: string;
  created_at: string;
  display_name: string;
  email: string;
  phone: string | null;
  is_guest: boolean;
  email_opt_in: boolean;
  sms_opt_in: boolean;
  order_count?: number;
  total_spent?: number;
  last_order_at?: string | null;
  customer_delivery_addresses?: CustomerAddress[];
}

interface CustomerOrder {
  order_id: string;
  order_number: string | null;
  created_at: string;
  status: string;
  cart_total: number;
  fulfillment_type: string | null;
  payment_status: string | null;
  payment_method: string | null;
  order_items: { item_name: string; quantity: number; line_total: number }[];
}

interface CustomersFormProps {
  restaurantId: string;
  restaurantName: string;
}

export default function CustomersForm({ restaurantId, restaurantName }: CustomersFormProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerOrders, setCustomerOrders] = useState<CustomerOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [modalTab, setModalTab] = useState<'overview' | 'orders' | 'addresses' | 'preferences'>('overview');
  const [guestFilter, setGuestFilter] = useState<'' | 'guest' | 'registered'>('');
  const [orderedDaysFilter, setOrderedDaysFilter] = useState<string>('');

  // Lock body scroll when modal is open
  useEffect(() => {
    if (selectedCustomer) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [selectedCustomer]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchCustomers = useCallback(
    async (page = 1) => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams({
          restaurant_id: restaurantId,
          page: page.toString(),
          limit: pagination.limit.toString(),
          include_order_stats: 'true',
        });

        if (debouncedSearch) {
          params.set('search', debouncedSearch);
        }

        if (orderedDaysFilter) {
          params.set('ordered_days', orderedDaysFilter);
        }

        const response = await fetch(`/api/customers?${params.toString()}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch customers');
        }

        setCustomers(data.customers || []);
        setPagination(data.pagination);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch customers');
      } finally {
        setLoading(false);
      }
    },
    [restaurantId, pagination.limit, debouncedSearch, orderedDaysFilter],
  );

  useEffect(() => {
    fetchCustomers(1);
  }, [fetchCustomers]);

  const filteredCustomers = useMemo(() => {
    if (!guestFilter) return customers;
    if (guestFilter === 'guest') return customers.filter((c) => c.is_guest);
    return customers.filter((c) => !c.is_guest);
  }, [customers, guestFilter]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const handlePageChange = (newPage: number) => {
    fetchCustomers(newPage);
  };

  const handleSelectCustomer = useCallback(async (customer: Customer) => {
    setSelectedCustomer(customer);
    setModalTab('overview');
    setCustomerOrders([]);
    setOrdersLoading(true);
    try {
      const res = await fetch(
        `/api/orders?restaurant_id=${encodeURIComponent(restaurantId)}&customer_id=${encodeURIComponent(customer.customer_id)}&limit=20`,
      );
      const data = await res.json();
      setCustomerOrders(data.orders || []);
    } catch {
      setCustomerOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  }, [restaurantId]);

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-gray-300 pl-10 pr-4 py-2.5 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none"
          />
        </div>
        <select
          value={guestFilter}
          onChange={(e) => setGuestFilter(e.target.value as '' | 'guest' | 'registered')}
          className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none"
        >
          <option value="">All Customers</option>
          <option value="registered">Registered</option>
          <option value="guest">Guests</option>
        </select>
        <select
          value={orderedDaysFilter}
          onChange={(e) => setOrderedDaysFilter(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none"
        >
          <option value="">All Time</option>
          <option value="7">Ordered Last 7 Days</option>
          <option value="30">Ordered Last 30 Days</option>
          <option value="60">Ordered Last 60 Days</option>
          <option value="90">Ordered Last 90 Days</option>
        </select>
        <button
          onClick={() => fetchCustomers(1)}
          className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-purple-700 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Refresh
        </button>
      </div>

      {/* Error State */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="inline-flex items-center gap-3 rounded-xl border border-purple-200 bg-purple-50 px-5 py-3.5">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-purple-600 border-t-transparent"></div>
            <p className="text-sm font-medium text-gray-700">Loading customers...</p>
          </div>
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <p className="mt-2 text-sm text-gray-600">No customers found</p>
          </div>
        </div>
      ) : (
        <>
          {/* Customer Table */}
          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Opt-In
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Address
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Orders
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Total Spent
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Last Order
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Joined
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredCustomers.map((customer) => (
                  <tr
                    key={customer.customer_id}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => handleSelectCustomer(customer)}
                  >
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">
                        {customer.display_name || 'N/A'}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-900">{customer.email}</p>
                      {customer.phone && (
                        <p className="text-xs text-gray-500">{customer.phone}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          customer.is_guest
                            ? 'bg-gray-100 text-gray-700'
                            : 'bg-purple-100 text-purple-800'
                        }`}
                      >
                        {customer.is_guest ? 'Guest' : 'Registered'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5">
                        <span
                          className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-medium ${
                            customer.email_opt_in
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                          title={`Email: ${customer.email_opt_in ? 'Opted In' : 'Opted Out'}`}
                        >
                          Email
                        </span>
                        <span
                          className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-medium ${
                            customer.sms_opt_in
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                          title={`SMS: ${customer.sms_opt_in ? 'Opted In' : 'Opted Out'}`}
                        >
                          SMS
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {(() => {
                        const addrs = customer.customer_delivery_addresses;
                        if (!addrs?.length) return <span className="text-sm text-gray-400">-</span>;
                        const defaultAddr = addrs.find((a) => a.is_default) || addrs[0];
                        const parts = [defaultAddr.house_no, defaultAddr.street, defaultAddr.address, defaultAddr.city, defaultAddr.state, defaultAddr.zip_code].filter(Boolean);
                        return (
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-medium text-purple-700 capitalize">{defaultAddr.saved_as}</span>
                              {defaultAddr.is_default && (
                                <span className="inline-flex items-center rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">Default</span>
                              )}
                            </div>
                            <p className="text-sm text-gray-900 truncate max-w-[200px]" title={parts.join(', ')}>
                              {parts.join(', ') || 'N/A'}
                            </p>
                            {addrs.length > 1 && (
                              <p className="text-xs text-gray-500">+{addrs.length - 1} more</p>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {customer.order_count ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {customer.total_spent != null ? formatCurrency(customer.total_spent) : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {customer.last_order_at ? formatDate(customer.last_order_at) : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {formatDate(customer.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                {pagination.total} customers
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="inline-flex items-center px-3 py-1.5 text-sm text-gray-700">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Customer Detail Modal */}
      {selectedCustomer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setSelectedCustomer(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-4xl w-full mx-4 h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 text-purple-700 text-base font-semibold">
                  {(selectedCustomer.display_name || 'N')[0].toUpperCase()}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{selectedCustomer.display_name || 'N/A'}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${selectedCustomer.is_guest ? 'bg-gray-100 text-gray-700' : 'bg-purple-100 text-purple-800'}`}>
                      {selectedCustomer.is_guest ? 'Guest' : 'Registered'}
                    </span>
                    <span className="text-xs text-gray-400">Since {formatDate(selectedCustomer.created_at)}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="rounded-lg p-1.5 hover:bg-gray-100 transition-colors"
              >
                <svg className="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body with sidebar tabs */}
            <div className="flex flex-1 min-h-0">
              {/* Left tabs */}
              <div className="w-48 shrink-0 border-r border-gray-200 bg-gray-50/50 py-3 px-2 space-y-1">
                {([
                  { key: 'overview' as const, label: 'Overview', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
                  { key: 'orders' as const, label: 'Orders', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
                  { key: 'addresses' as const, label: 'Addresses', icon: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z' },
                  { key: 'preferences' as const, label: 'Preferences', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
                ]).map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setModalTab(t.key)}
                    className={`w-full flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                      modalTab === t.key
                        ? 'bg-white text-purple-700 shadow-sm border border-gray-200'
                        : 'text-gray-600 hover:bg-white/60 hover:text-gray-900'
                    }`}
                  >
                    <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={t.icon} />
                    </svg>
                    {t.label}
                    {t.key === 'orders' && (selectedCustomer.order_count ?? 0) > 0 && (
                      <span className="ml-auto inline-flex items-center justify-center rounded-full bg-purple-100 px-1.5 text-[10px] font-bold text-purple-700 min-w-[18px]">
                        {selectedCustomer.order_count}
                      </span>
                    )}
                    {t.key === 'addresses' && (selectedCustomer.customer_delivery_addresses?.length ?? 0) > 0 && (
                      <span className="ml-auto inline-flex items-center justify-center rounded-full bg-gray-200 px-1.5 text-[10px] font-bold text-gray-600 min-w-[18px]">
                        {selectedCustomer.customer_delivery_addresses!.length}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Right content */}
              <div className="flex-1 overflow-y-auto p-6">
                {/* Overview Tab */}
                {modalTab === 'overview' && (
                  <div className="space-y-5">
                    {/* Contact Info */}
                    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                      <h4 className="text-sm font-semibold text-gray-900">Contact Information</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Email</p>
                          <p className="text-sm text-gray-900 mt-0.5">{selectedCustomer.email}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Phone</p>
                          <p className="text-sm text-gray-900 mt-0.5">{selectedCustomer.phone || 'N/A'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Order Summary */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="text-sm font-semibold text-gray-900 mb-3">Order Summary</h4>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="bg-white rounded-lg border border-gray-200 p-3 text-center">
                          <p className="text-2xl font-bold text-gray-900">{selectedCustomer.order_count ?? 0}</p>
                          <p className="text-xs text-gray-500 mt-0.5">Total Orders</p>
                        </div>
                        <div className="bg-white rounded-lg border border-gray-200 p-3 text-center">
                          <p className="text-2xl font-bold text-gray-900">{formatCurrency(selectedCustomer.total_spent ?? 0)}</p>
                          <p className="text-xs text-gray-500 mt-0.5">Total Spent</p>
                        </div>
                        <div className="bg-white rounded-lg border border-gray-200 p-3 text-center">
                          <p className="text-lg font-semibold text-gray-900 mt-1">{selectedCustomer.last_order_at ? formatDate(selectedCustomer.last_order_at) : 'N/A'}</p>
                          <p className="text-xs text-gray-500 mt-0.5">Last Order</p>
                        </div>
                      </div>
                    </div>

                    {/* Marketing Preferences */}
                    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                      <h4 className="text-sm font-semibold text-gray-900">Marketing Preferences</h4>
                      <div className="flex gap-3">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${selectedCustomer.email_opt_in ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                          Email: {selectedCustomer.email_opt_in ? 'Opted In' : 'Opted Out'}
                        </span>
                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${selectedCustomer.sms_opt_in ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                          SMS: {selectedCustomer.sms_opt_in ? 'Opted In' : 'Opted Out'}
                        </span>
                      </div>
                    </div>

                    {/* Default Address */}
                    {(() => {
                      const addrs = selectedCustomer.customer_delivery_addresses;
                      const defaultAddr = addrs?.find((a) => a.is_default) || addrs?.[0];
                      if (!defaultAddr) return null;
                      const parts = [defaultAddr.house_no, defaultAddr.street, defaultAddr.address, defaultAddr.city, defaultAddr.state, defaultAddr.zip_code].filter(Boolean);
                      return (
                        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                          <h4 className="text-sm font-semibold text-gray-900">Default Address</h4>
                          <div className="flex items-start gap-2">
                            <svg className="h-4 w-4 mt-0.5 shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <div>
                              <span className="text-xs font-medium text-purple-700 capitalize">{defaultAddr.saved_as}</span>
                              <p className="text-sm text-gray-900 mt-0.5">{parts.join(', ') || 'N/A'}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Orders Tab */}
                {modalTab === 'orders' && (
                  <div className="space-y-4">
                    {/* Stats row */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-gray-50 rounded-lg border border-gray-200 p-3 text-center">
                        <p className="text-2xl font-bold text-gray-900">{selectedCustomer.order_count ?? 0}</p>
                        <p className="text-xs text-gray-500">Orders</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg border border-gray-200 p-3 text-center">
                        <p className="text-2xl font-bold text-gray-900">{formatCurrency(selectedCustomer.total_spent ?? 0)}</p>
                        <p className="text-xs text-gray-500">Total Spent</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg border border-gray-200 p-3 text-center">
                        <p className="text-lg font-semibold text-gray-900 mt-1">{selectedCustomer.last_order_at ? formatDate(selectedCustomer.last_order_at) : 'N/A'}</p>
                        <p className="text-xs text-gray-500">Last Order</p>
                      </div>
                    </div>

                    {/* Order List */}
                    {ordersLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-purple-600 border-t-transparent" />
                        <span className="ml-2 text-sm text-gray-500">Loading orders...</span>
                      </div>
                    ) : customerOrders.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12">
                        <svg className="h-12 w-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        <p className="mt-3 text-sm text-gray-500">No orders found</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {customerOrders.map((order) => (
                          <div key={order.order_id} className="rounded-lg border border-gray-200 bg-white p-4 hover:shadow-sm transition-shadow">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-gray-900">
                                  #{order.order_number || order.order_id.slice(0, 8)}
                                </span>
                                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${
                                  order.status === 'delivered' ? 'bg-green-100 text-green-700' :
                                  order.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                  order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-blue-100 text-blue-700'
                                }`}>
                                  {order.status?.replace(/_/g, ' ')}
                                </span>
                                {order.payment_status && (
                                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${
                                    order.payment_status === 'paid' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'
                                  }`}>
                                    {order.payment_status}
                                  </span>
                                )}
                              </div>
                              <span className="text-base font-bold text-gray-900">
                                {formatCurrency(order.cart_total || 0)}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                              <span>{formatDate(order.created_at)}</span>
                              {order.fulfillment_type && (
                                <span className="inline-flex items-center gap-1 capitalize">
                                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                    {order.fulfillment_type === 'delivery' ? (
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                                    ) : (
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                                    )}
                                  </svg>
                                  {order.fulfillment_type.replace(/_/g, ' ')}
                                </span>
                              )}
                              {order.payment_method && (
                                <span className="capitalize">{order.payment_method.replace(/_/g, ' ')}</span>
                              )}
                            </div>
                            {order.order_items?.length > 0 && (
                              <div className="mt-3 border-t border-gray-100 pt-3 space-y-1">
                                {order.order_items.map((item, idx) => (
                                  <div key={idx} className="flex items-center justify-between text-xs">
                                    <span className="text-gray-700">{item.quantity}x {item.item_name}</span>
                                    <span className="text-gray-500 font-medium">{formatCurrency(item.line_total || 0)}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Addresses Tab */}
                {modalTab === 'addresses' && (
                  <div className="space-y-3">
                    {!selectedCustomer.customer_delivery_addresses?.length ? (
                      <div className="flex flex-col items-center justify-center py-12">
                        <svg className="h-12 w-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <p className="mt-3 text-sm text-gray-500">No saved addresses</p>
                      </div>
                    ) : (
                      selectedCustomer.customer_delivery_addresses.map((addr) => {
                        const parts = [addr.house_no, addr.street, addr.address, addr.city, addr.state, addr.zip_code, addr.country].filter(Boolean);
                        return (
                          <div key={addr.id} className={`flex items-start gap-3 rounded-lg border p-4 ${addr.is_default ? 'border-purple-300 bg-purple-50/50' : 'border-gray-200 bg-white'}`}>
                            <div className={`flex h-9 w-9 items-center justify-center rounded-lg shrink-0 ${addr.is_default ? 'bg-purple-100' : 'bg-gray-100'}`}>
                              <svg className={`h-4 w-4 ${addr.is_default ? 'text-purple-600' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-gray-900 capitalize">{addr.saved_as}</span>
                                {addr.is_default && (
                                  <span className="inline-flex items-center rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-semibold text-purple-700">Default</span>
                                )}
                              </div>
                              <p className="text-sm text-gray-700 mt-1">{parts.join(', ') || 'N/A'}</p>
                              {addr.nearby_landmark && (
                                <p className="text-xs text-gray-500 mt-1">Landmark: {addr.nearby_landmark}</p>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                {/* Preferences Tab */}
                {modalTab === 'preferences' && (
                  <div className="space-y-5">
                    <div className="bg-gray-50 rounded-lg p-5 space-y-4">
                      <h4 className="text-sm font-semibold text-gray-900">Marketing Preferences</h4>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between bg-white rounded-lg border border-gray-200 p-4">
                          <div className="flex items-center gap-3">
                            <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${selectedCustomer.email_opt_in ? 'bg-green-100' : 'bg-gray-100'}`}>
                              <svg className={`h-4 w-4 ${selectedCustomer.email_opt_in ? 'text-green-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">Email Marketing</p>
                              <p className="text-xs text-gray-500">Receive promotional emails and offers</p>
                            </div>
                          </div>
                          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${selectedCustomer.email_opt_in ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                            {selectedCustomer.email_opt_in ? 'Opted In' : 'Opted Out'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between bg-white rounded-lg border border-gray-200 p-4">
                          <div className="flex items-center gap-3">
                            <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${selectedCustomer.sms_opt_in ? 'bg-green-100' : 'bg-gray-100'}`}>
                              <svg className={`h-4 w-4 ${selectedCustomer.sms_opt_in ? 'text-green-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                              </svg>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">SMS Marketing</p>
                              <p className="text-xs text-gray-500">Receive text message updates and offers</p>
                            </div>
                          </div>
                          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${selectedCustomer.sms_opt_in ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                            {selectedCustomer.sms_opt_in ? 'Opted In' : 'Opted Out'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-5 space-y-3">
                      <h4 className="text-sm font-semibold text-gray-900">Account Details</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Account Type</p>
                          <p className="text-sm text-gray-900 mt-1">{selectedCustomer.is_guest ? 'Guest' : 'Registered'}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Customer Since</p>
                          <p className="text-sm text-gray-900 mt-1">{formatDate(selectedCustomer.created_at)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
