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
  const [guestFilter, setGuestFilter] = useState<'' | 'guest' | 'registered'>('');
  const [orderedDaysFilter, setOrderedDaysFilter] = useState<string>('');

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
                    onClick={() => setSelectedCustomer(customer)}
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
            className="bg-white rounded-2xl shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-900">Customer Details</h3>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="rounded-lg p-1.5 hover:bg-gray-100 transition-colors"
              >
                <svg className="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">
              {/* Name & Type */}
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100 text-purple-700 text-lg font-semibold">
                  {(selectedCustomer.display_name || 'N')[0].toUpperCase()}
                </div>
                <div>
                  <p className="text-lg font-semibold text-gray-900">
                    {selectedCustomer.display_name || 'N/A'}
                  </p>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      selectedCustomer.is_guest
                        ? 'bg-gray-100 text-gray-700'
                        : 'bg-purple-100 text-purple-800'
                    }`}
                  >
                    {selectedCustomer.is_guest ? 'Guest' : 'Registered'}
                  </span>
                </div>
              </div>

              {/* Contact Info */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <h4 className="text-sm font-semibold text-gray-900">Contact Information</h4>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Email</p>
                  <p className="text-sm text-gray-900 mt-0.5">{selectedCustomer.email}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Phone</p>
                  <p className="text-sm text-gray-900 mt-0.5">{selectedCustomer.phone || 'N/A'}</p>
                </div>
              </div>

              {/* Delivery Addresses */}
              {selectedCustomer.customer_delivery_addresses && selectedCustomer.customer_delivery_addresses.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <h4 className="text-sm font-semibold text-gray-900">
                    Delivery Addresses ({selectedCustomer.customer_delivery_addresses.length})
                  </h4>
                  <div className="space-y-2">
                    {selectedCustomer.customer_delivery_addresses.map((addr) => {
                      const parts = [addr.house_no, addr.street, addr.address, addr.city, addr.state, addr.zip_code, addr.country].filter(Boolean);
                      return (
                        <div key={addr.id} className={`flex items-start gap-2 rounded-md border p-3 ${addr.is_default ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-white'}`}>
                          <svg className="h-4 w-4 mt-0.5 shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-purple-700 capitalize">{addr.saved_as}</span>
                              {addr.is_default && (
                                <span className="inline-flex items-center rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
                                  Default
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-900 mt-0.5">{parts.join(', ') || 'N/A'}</p>
                            {addr.nearby_landmark && (
                              <p className="text-xs text-gray-500 mt-0.5">Near: {addr.nearby_landmark}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Marketing Opt-In */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <h4 className="text-sm font-semibold text-gray-900">Marketing Preferences</h4>
                <div className="flex gap-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                      selectedCustomer.email_opt_in
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    Email: {selectedCustomer.email_opt_in ? 'Opted In' : 'Opted Out'}
                  </span>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                      selectedCustomer.sms_opt_in
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    SMS: {selectedCustomer.sms_opt_in ? 'Opted In' : 'Opted Out'}
                  </span>
                </div>
              </div>

              {/* Order Stats */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <h4 className="text-sm font-semibold text-gray-900">Order History</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Orders</p>
                    <p className="text-lg font-semibold text-gray-900 mt-0.5">
                      {selectedCustomer.order_count ?? 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Spent</p>
                    <p className="text-lg font-semibold text-gray-900 mt-0.5">
                      {formatCurrency(selectedCustomer.total_spent ?? 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Last Order</p>
                    <p className="text-sm font-medium text-gray-900 mt-1">
                      {selectedCustomer.last_order_at
                        ? formatDate(selectedCustomer.last_order_at)
                        : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Joined Date */}
              <div className="text-xs text-gray-500">
                Customer since {formatDate(selectedCustomer.created_at)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
