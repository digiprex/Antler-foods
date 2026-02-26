/**
 * Forms Management Page
 * 
 * Admin interface for managing dynamic forms
 * Features:
 * - List all forms for a restaurant
 * - Create new forms
 * - Edit existing forms
 * - Delete forms
 * - Preview forms
 */

'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import type { Form } from '@/types/forms.types';
import Toast from '@/components/ui/toast';

export default function FormsPage() {
  const searchParams = useSearchParams();
  const restaurantId = searchParams.get('restaurant_id');
  const restaurantName = searchParams.get('restaurant_name');

  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  // Fetch forms
  useEffect(() => {
    if (restaurantId) {
      fetchForms();
    }
  }, [restaurantId]);

  const fetchForms = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/forms?restaurant_id=${restaurantId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch forms');
      }

      if (data.success) {
        setForms(data.data || []);
      } else {
        throw new Error(data.error || 'Failed to fetch forms');
      }
    } catch (err) {
      console.error('Error fetching forms:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteForm = async (formId: string) => {
    if (!confirm('Are you sure you want to delete this form? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/forms?form_id=${formId}`, {
        method: 'DELETE',
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete form');
      }

      if (data.success) {
        setToastMessage('Form deleted successfully');
        setToastType('success');
        setShowToast(true);
        fetchForms(); // Refresh the list
      } else {
        throw new Error(data.error || 'Failed to delete form');
      }
    } catch (err) {
      console.error('Error deleting form:', err);
      setToastMessage(err instanceof Error ? err.message : 'Failed to delete form');
      setToastType('error');
      setShowToast(true);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!restaurantId || !restaurantName) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="text-6xl mb-4">📋</div>
            <h2 className="text-xl font-semibold text-[#111827] mb-2">
              Restaurant Required
            </h2>
            <p className="text-[#6b7280] max-w-md">
              Please provide restaurant_id and restaurant_name parameters to manage forms.
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* Toast Notification */}
      {showToast && (
        <Toast
          message={toastMessage}
          type={toastType}
          onClose={() => setShowToast(false)}
        />
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[#111827]">Forms Management</h1>
              <p className="text-[#6b7280] mt-1">
                Create and manage dynamic forms for {restaurantName}
              </p>
            </div>
            <button
              onClick={() => {
                // TODO: Navigate to form builder
                window.location.href = `/admin/forms/builder?restaurant_id=${restaurantId}&restaurant_name=${encodeURIComponent(restaurantName)}`;
              }}
              className="bg-[#3b82f6] text-white px-4 py-2 rounded-lg hover:bg-[#2563eb] transition-colors flex items-center gap-2"
            >
              <span>➕</span>
              Create New Form
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3b82f6]"></div>
            <span className="ml-3 text-[#6b7280]">Loading forms...</span>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <span className="text-red-500 text-xl mr-3">⚠️</span>
              <div>
                <h3 className="text-red-800 font-medium">Error Loading Forms</h3>
                <p className="text-red-600 text-sm mt-1">{error}</p>
              </div>
            </div>
            <button
              onClick={fetchForms}
              className="mt-3 bg-red-100 text-red-700 px-3 py-1 rounded text-sm hover:bg-red-200 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Forms List */}
        {!loading && !error && (
          <div className="bg-white rounded-lg shadow-sm border border-[#e5e7eb]">
            {forms.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📝</div>
                <h3 className="text-lg font-medium text-[#111827] mb-2">No Forms Yet</h3>
                <p className="text-[#6b7280] mb-6">
                  Create your first form to get started with collecting customer information.
                </p>
                <button
                  onClick={() => {
                    window.location.href = `/admin/forms/builder?restaurant_id=${restaurantId}&restaurant_name=${encodeURIComponent(restaurantName)}`;
                  }}
                  className="bg-[#3b82f6] text-white px-6 py-2 rounded-lg hover:bg-[#2563eb] transition-colors"
                >
                  Create Your First Form
                </button>
              </div>
            ) : (
              <div className="overflow-hidden">
                <table className="min-w-full divide-y divide-[#e5e7eb]">
                  <thead className="bg-[#f9fafb]">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#6b7280] uppercase tracking-wider">
                        Form Title
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#6b7280] uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#6b7280] uppercase tracking-wider">
                        Fields
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#6b7280] uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#6b7280] uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-[#e5e7eb]">
                    {forms.map((form) => (
                      <tr key={form.form_id} className="hover:bg-[#f9fafb]">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-[#111827]">
                            {form.title}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-[#6b7280]">
                            {form.email}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-[#6b7280]">
                            {form.fields?.length || 0} fields
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-[#6b7280]">
                            {formatDate(form.created_at)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                // TODO: Navigate to form preview
                                window.location.href = `/admin/forms/preview?form_id=${form.form_id}`;
                              }}
                              className="text-[#3b82f6] hover:text-[#2563eb] transition-colors"
                              title="Preview Form"
                            >
                              👁️
                            </button>
                            <button
                              onClick={() => {
                                // TODO: Navigate to form editor
                                window.location.href = `/admin/forms/builder?form_id=${form.form_id}&restaurant_id=${restaurantId}&restaurant_name=${encodeURIComponent(restaurantName)}`;
                              }}
                              className="text-[#059669] hover:text-[#047857] transition-colors"
                              title="Edit Form"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => handleDeleteForm(form.form_id)}
                              className="text-[#dc2626] hover:text-[#b91c1c] transition-colors"
                              title="Delete Form"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}