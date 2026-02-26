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
  const [previewForm, setPreviewForm] = useState<Form | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

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

  const handlePreviewForm = (form: Form) => {
    setPreviewForm(form);
    setShowPreviewModal(true);
  };

  const handleClosePreview = () => {
    setShowPreviewModal(false);
    setPreviewForm(null);
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
                              onClick={() => handlePreviewForm(form)}
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

      {/* Preview Modal */}
      {showPreviewModal && previewForm && (
        <PreviewModal form={previewForm} onClose={handleClosePreview} />
      )}
    </DashboardLayout>
  );
}

// Preview Modal Component
function PreviewModal({ form, onClose }: { form: Form; onClose: () => void }) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const handleFieldChange = (fieldId: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [fieldId]: value
    }));

    if (validationErrors[fieldId]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldId];
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    form.fields?.forEach((field) => {
      const value = formData[field.id];

      if (field.required && (!value || (typeof value === 'string' && !value.trim()))) {
        errors[field.id] = `${field.label} is required`;
      }

      if (value && field.type === 'email') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          errors[field.id] = 'Please enter a valid email address';
        }
      }
    });

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (validateForm()) {
      alert('Form validation passed! This is a preview - form data is not actually submitted.');
      console.log('Form data:', formData);
    }
  };

  const renderField = (field: any) => {
    const value = formData[field.id] || '';
    const error = validationErrors[field.id];

    const baseInputClasses = `w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#3b82f6] ${
      error ? 'border-red-500' : 'border-[#d1d5db]'
    }`;

    switch (field.type) {
      case 'textarea':
        return (
          <textarea
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
            className={baseInputClasses}
            rows={4}
          />
        );

      case 'select':
        return (
          <select
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            required={field.required}
            className={baseInputClasses}
          >
            <option value="">Select an option...</option>
            {field.options?.map((option: string, index: number) => (
              <option key={index} value={option}>
                {option}
              </option>
            ))}
          </select>
        );

      case 'radio':
        return (
          <div className="space-y-2">
            {field.options?.map((option: string, index: number) => (
              <label key={index} className="flex items-center">
                <input
                  type="radio"
                  name={field.id}
                  value={option}
                  checked={value === option}
                  onChange={(e) => handleFieldChange(field.id, e.target.value)}
                  required={field.required}
                  className="mr-2"
                />
                {option}
              </label>
            ))}
          </div>
        );

      case 'checkbox':
        return (
          <div className="space-y-2">
            {field.options?.map((option: string, index: number) => (
              <label key={index} className="flex items-center">
                <input
                  type="checkbox"
                  value={option}
                  checked={Array.isArray(value) ? value.includes(option) : false}
                  onChange={(e) => {
                    const currentValues = Array.isArray(value) ? value : [];
                    const newValues = e.target.checked
                      ? [...currentValues, option]
                      : currentValues.filter(v => v !== option);
                    handleFieldChange(field.id, newValues);
                  }}
                  className="mr-2"
                />
                {option}
              </label>
            ))}
          </div>
        );

      default:
        return (
          <input
            type={field.type}
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
            className={baseInputClasses}
          />
        );
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="sticky top-0 bg-white border-b border-[#e5e7eb] px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-[#111827]">
              {form.title}
            </h2>
            <p className="text-sm text-[#6b7280] mt-1">
              Preview Mode - Submissions will be sent to: {form.email}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[#6b7280] hover:text-[#374151] transition-colors text-2xl leading-none"
            title="Close"
          >
            ×
          </button>
        </div>

        {/* Modal Body */}
        <div className="px-6 py-6">
          {form.fields && form.fields.length > 0 ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              {form.fields
                .sort((a, b) => a.order - b.order)
                .map((field) => (
                  <div key={field.id}>
                    <label className="block text-sm font-medium text-[#374151] mb-2">
                      {field.label}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                    </label>

                    {renderField(field)}

                    {validationErrors[field.id] && (
                      <p className="text-red-500 text-sm mt-1">
                        {validationErrors[field.id]}
                      </p>
                    )}
                  </div>
                ))}

              <div className="pt-4 flex items-center gap-3">
                <button
                  type="submit"
                  className="bg-[#3b82f6] text-white px-6 py-2 rounded-lg hover:bg-[#2563eb] transition-colors"
                >
                  Submit Form (Preview)
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="bg-[#6b7280] text-white px-6 py-2 rounded-lg hover:bg-[#4b5563] transition-colors"
                >
                  Close Preview
                </button>
              </div>
            </form>
          ) : (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">📝</div>
              <p className="text-[#6b7280]">
                This form has no fields yet.
              </p>
            </div>
          )}

          {/* Info Box */}
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <span className="text-blue-500 text-xl mr-3">ℹ️</span>
              <div>
                <h3 className="text-blue-800 font-medium text-sm">Preview Mode</h3>
                <p className="text-blue-600 text-xs mt-1">
                  This is a preview. Form submissions are not processed. The validation and user experience will work exactly like this when deployed.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}