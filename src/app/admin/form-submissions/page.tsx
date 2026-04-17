/**
 * Form Submissions Management Page
 *
 * Admin interface for viewing form submissions
 */

'use client';

import { Suspense } from 'react';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Toast from '@/components/ui/toast';

interface FormSubmission {
  form_submission_id: string;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  type: string;
  fields: Record<string, any>;
  restaurant_id: string;
  email: string;
  poc_email: string;
  mail_sent: boolean;
}

function FormSubmissionsContent() {
  const searchParams = useSearchParams() ?? new URLSearchParams();
  const restaurantId = searchParams.get('restaurant_id');
  const restaurantName = searchParams.get('restaurant_name');

  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('success');
  const [selectedSubmission, setSelectedSubmission] = useState<FormSubmission | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Filters
  const [filterType, setFilterType] = useState('all');
  const [filterMailSent, setFilterMailSent] = useState('all');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (restaurantId) {
      fetchSubmissions();
    }
  }, [restaurantId]);

  const fetchSubmissions = async () => {
    if (!restaurantId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/form-submissions?restaurant_id=${encodeURIComponent(restaurantId)}`
      );
      const data = await response.json();

      if (data.success) {
        setSubmissions(data.data);
      } else {
        setError(data.error || 'Failed to fetch form submissions');
      }
    } catch (err) {
      console.error('Error fetching form submissions:', err);
      setError('An error occurred while fetching form submissions');
    } finally {
      setLoading(false);
    }
  };

  // Derive unique form types for filter dropdown
  const uniqueTypes = Array.from(new Set(submissions.map((s) => s.type))).sort();

  // Apply filters
  const filteredSubmissions = submissions.filter((s) => {
    if (filterType !== 'all' && s.type !== filterType) return false;
    if (filterMailSent === 'sent' && !s.mail_sent) return false;
    if (filterMailSent === 'not_sent' && s.mail_sent) return false;
    if (filterDateFrom) {
      const from = new Date(filterDateFrom);
      from.setHours(0, 0, 0, 0);
      if (new Date(s.created_at) < from) return false;
    }
    if (filterDateTo) {
      const to = new Date(filterDateTo);
      to.setHours(23, 59, 59, 999);
      if (new Date(s.created_at) > to) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const fieldsStr = Object.values(s.fields || {}).join(' ').toLowerCase();
      if (
        !s.type.toLowerCase().includes(q) &&
        !s.email.toLowerCase().includes(q) &&
        !s.poc_email.toLowerCase().includes(q) &&
        !fieldsStr.includes(q)
      ) return false;
    }
    return true;
  });

  const hasActiveFilters = filterType !== 'all' || filterMailSent !== 'all' || filterDateFrom || filterDateTo || searchQuery.trim();

  const clearFilters = () => {
    setFilterType('all');
    setFilterMailSent('all');
    setFilterDateFrom('');
    setFilterDateTo('');
    setSearchQuery('');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const viewDetails = (submission: FormSubmission) => {
    setSelectedSubmission(submission);
    setShowDetailsModal(true);
  };

  const closeDetailsModal = () => {
    setShowDetailsModal(false);
    setSelectedSubmission(null);
  };

  if (!restaurantId) {
    return (
      <>
        <div className="flex min-h-[400px] items-center justify-center p-6">
          <div className="max-w-md text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-purple-100 to-purple-200">
              <svg className="h-8 w-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2zM9 12h6M9 16h6" />
              </svg>
            </div>
            <h2 className="mb-2 text-xl font-bold text-gray-900">
              Select a Restaurant
            </h2>
            <p className="text-sm text-gray-600">
              Please select a restaurant from the sidebar to view form submissions.
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg">
              <svg className="h-7 w-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2zM9 12h6M9 16h6" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900">Form Submissions</h1>
              <p className="text-sm text-gray-600 mt-1">
                View and manage form submissions for {restaurantName || 'your restaurant'}
              </p>
            </div>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-100">
                <svg className="h-5 w-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-red-900">Error Loading Submissions</h3>
                <p className="mt-1 text-sm text-red-700">{error}</p>
                <button
                  onClick={fetchSubmissions}
                  className="mt-3 inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:from-purple-700 hover:to-purple-800"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                  </svg>
                  Try Again
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        {!loading && submissions.length > 0 && (
          <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-end gap-3">
              {/* Search */}
              <div className="flex-1 min-w-[200px]">
                <label className="mb-1 block text-xs font-medium text-gray-500">Search</label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by email, type, or fields..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>

              {/* Type Filter */}
              <div className="min-w-[160px]">
                <label className="mb-1 block text-xs font-medium text-gray-500">Form Type</label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                >
                  <option value="all">All Types</option>
                  {uniqueTypes.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              {/* Mail Sent Filter */}
              <div className="min-w-[140px]">
                <label className="mb-1 block text-xs font-medium text-gray-500">Mail Status</label>
                <select
                  value={filterMailSent}
                  onChange={(e) => setFilterMailSent(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                >
                  <option value="all">All</option>
                  <option value="sent">Sent</option>
                  <option value="not_sent">Not Sent</option>
                </select>
              </div>

              {/* Date From */}
              <div className="min-w-[150px]">
                <label className="mb-1 block text-xs font-medium text-gray-500">From</label>
                <input
                  type="date"
                  value={filterDateFrom}
                  onChange={(e) => setFilterDateFrom(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>

              {/* Date To */}
              <div className="min-w-[150px]">
                <label className="mb-1 block text-xs font-medium text-gray-500">To</label>
                <input
                  type="date"
                  value={filterDateTo}
                  onChange={(e) => setFilterDateTo(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>

              {/* Clear Filters */}
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Clear
                </button>
              )}
            </div>

            {/* Result count */}
            {hasActiveFilters && (
              <p className="mt-3 text-xs text-gray-500">
                Showing {filteredSubmissions.length} of {submissions.length} submissions
              </p>
            )}
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="inline-flex items-center gap-3 rounded-xl border border-purple-200 bg-purple-50 px-5 py-3.5">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-purple-600 border-t-transparent"></div>
              <p className="text-sm font-medium text-gray-700">Loading submissions...</p>
            </div>
          </div>
        ) : filteredSubmissions.length === 0 ? (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="p-12 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-purple-300 bg-purple-50">
                <svg className="h-8 w-8 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2zM9 12h6M9 16h6" />
                </svg>
              </div>
              {hasActiveFilters ? (
                <>
                  <h3 className="mb-2 text-lg font-semibold text-gray-900">No Matching Submissions</h3>
                  <p className="text-sm text-gray-600">
                    No submissions match your current filters.
                  </p>
                  <button
                    onClick={clearFilters}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:from-purple-700 hover:to-purple-800"
                  >
                    Clear Filters
                  </button>
                </>
              ) : (
                <>
                  <h3 className="mb-2 text-lg font-semibold text-gray-900">No Submissions Yet</h3>
                  <p className="text-sm text-gray-600">
                    Form submissions will appear here when users submit your forms.
                  </p>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                      POC Email
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-600">
                      Mail Sent
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                      Submitted At
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-600">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredSubmissions.map((submission) => (
                    <tr key={submission.form_submission_id} className="transition-colors hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <span className="font-medium text-gray-900">{submission.type}</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {submission.poc_email}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                            submission.mail_sent
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {submission.mail_sent ? 'Sent' : 'Not Sent'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {formatDate(submission.created_at)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => viewDetails(submission)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition-all hover:from-purple-700 hover:to-purple-800 hover:shadow-md"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {showDetailsModal && selectedSubmission && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
          onClick={closeDetailsModal}
        >
          <div
            className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 z-10 border-b border-gray-200 bg-white px-6 py-4 rounded-t-xl">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Submission Details
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    ID: {selectedSubmission.form_submission_id.slice(0, 8)}...
                  </p>
                </div>
                <button
                  onClick={closeDetailsModal}
                  className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="px-6 py-4 space-y-6">
              {/* Basic Information */}
              <div>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
                  Basic Information
                </h3>
                <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500">Type</label>
                      <p className="mt-1 font-medium text-gray-900">{selectedSubmission.type}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500">Mail Status</label>
                      <span
                        className={`mt-1 inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          selectedSubmission.mail_sent
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {selectedSubmission.mail_sent ? 'Sent' : 'Not Sent'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500">POC Email</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedSubmission.poc_email}</p>
                  </div>
                  <div className="border-t border-gray-200 pt-3">
                    <label className="block text-xs font-medium text-gray-500">Submitted At</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {formatDate(selectedSubmission.created_at)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Form Fields */}
              <div>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
                  Form Fields
                </h3>
                <div className="rounded-lg border border-gray-200 bg-white">
                  {selectedSubmission.fields && Object.keys(selectedSubmission.fields).length > 0 ? (
                    <div className="divide-y divide-gray-200">
                      {Object.entries(selectedSubmission.fields).map(([key, value]) => (
                        <div key={key} className="px-4 py-3">
                          <label className="block text-xs font-medium uppercase tracking-wider text-gray-500">
                            {key.replace(/_/g, ' ')}
                          </label>
                          <p className="mt-1 whitespace-pre-wrap break-words text-sm text-gray-900">
                            {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="px-4 py-8 text-center">
                      <svg className="mx-auto h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                      </svg>
                      <p className="mt-2 text-sm italic text-gray-500">No fields data available</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 border-t border-gray-200 bg-gray-50 px-6 py-4 rounded-b-xl">
              <div className="flex justify-end">
                <button
                  onClick={closeDetailsModal}
                  className="rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:from-purple-700 hover:to-purple-800 hover:shadow-md"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showToast && (
        <Toast
          message={toastMessage}
          type={toastType}
          onClose={() => setShowToast(false)}
        />
      )}
    </>
  );
}

export default function FormSubmissionsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <FormSubmissionsContent />
    </Suspense>
  );
}
