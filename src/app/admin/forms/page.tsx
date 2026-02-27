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

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import type { Form, FormField, FormFieldType } from '@/types/forms.types';
import Toast from '@/components/ui/toast';

export default function FormsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const restaurantId = searchParams.get('restaurant_id');
  const restaurantName = searchParams.get('restaurant_name');

  const [forms, setForms] = useState<Form[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [previewForm, setPreviewForm] = useState<Form | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [editForm, setEditForm] = useState<Form | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [deleteFormId, setDeleteFormId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const fetchForms = useCallback(async () => {
    try {
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
    }
  }, [restaurantId]);

  useEffect(() => {
    if (restaurantId) {
      fetchForms();
    }
  }, [fetchForms, restaurantId]);

  const handlePreviewForm = (form: Form) => {
    setPreviewForm(form);
    setShowPreviewModal(true);
  };

  const handleClosePreview = () => {
    setShowPreviewModal(false);
    setPreviewForm(null);
  };

  const handleEditForm = (form: Form) => {
    setEditForm(form);
    setShowEditModal(true);
  };

  const handleCloseEdit = () => {
    setShowEditModal(false);
    setEditForm(null);
  };

  const handleFormSaved = () => {
    fetchForms(); // Refresh the forms list
    handleCloseEdit();
    setToastMessage('Form updated successfully!');
    setToastType('success');
    setShowToast(true);
  };

  const handleDeleteForm = (formId: string) => {
    setDeleteFormId(formId);
    setShowDeleteModal(true);
  };

  const confirmDeleteForm = async () => {
    if (!deleteFormId) return;

    try {
      const response = await fetch(`/api/forms?form_id=${deleteFormId}`, {
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
    } finally {
      setShowDeleteModal(false);
      setDeleteFormId(null);
    }
  };

  const cancelDeleteForm = () => {
    setShowDeleteModal(false);
    setDeleteFormId(null);
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
                router.push(`/admin/forms/builder?restaurant_id=${restaurantId}&restaurant_name=${encodeURIComponent(restaurantName)}`);
              }}
              className="bg-[#3b82f6] text-white px-4 py-2 rounded-lg hover:bg-[#2563eb] transition-colors flex items-center gap-2"
            >
              <span>➕</span>
              Create New Form
            </button>
          </div>
        </div>

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
        {!error && (
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
                    router.push(`/admin/forms/builder?restaurant_id=${restaurantId}&restaurant_name=${encodeURIComponent(restaurantName)}`);
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
                              onClick={() => handleEditForm(form)}
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

      {/* Edit Modal */}
      {showEditModal && editForm && (
        <EditModal
          form={editForm}
          onClose={handleCloseEdit}
          onSaved={handleFormSaved}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <DeleteConfirmationModal
          onConfirm={confirmDeleteForm}
          onCancel={cancelDeleteForm}
        />
      )}
    </DashboardLayout>
  );
}

// Preview Modal Component
function PreviewModal({ form, onClose }: { form: Form; onClose: () => void }) {
  const [formData, setFormData] = useState<Record<string, string | string[]>>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const handleFieldChange = (fieldId: string, value: string | string[]) => {
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

      if (value && field.type === 'email' && typeof value === 'string') {
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
      console.log('Form data:', formData);
      // Form validation passed - this is just a preview
    }
  };

  const renderField = (field: FormField) => {
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

// Edit Modal Component
function EditModal({
  form,
  onClose,
  onSaved,
}: {
  form: Form;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [formTitle, setFormTitle] = useState(form.title);
  const [formEmail, setFormEmail] = useState(form.email);
  const [fields, setFields] = useState<FormField[]>(form.fields || []);
  const [selectedField, setSelectedField] = useState<FormField | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Available field types
  const FIELD_TYPES = [
    { type: 'text', label: 'Text Input', icon: '📝' },
    { type: 'email', label: 'Email', icon: '📧' },
    { type: 'tel', label: 'Phone', icon: '📞' },
    { type: 'textarea', label: 'Text Area', icon: '📄' },
    { type: 'select', label: 'Dropdown', icon: '📋' },
    { type: 'radio', label: 'Radio Buttons', icon: '🔘' },
    { type: 'checkbox', label: 'Checkboxes', icon: '☑️' },
    { type: 'number', label: 'Number', icon: '🔢' },
    { type: 'date', label: 'Date', icon: '📅' },
    { type: 'file', label: 'File Upload', icon: '📎' },
  ];

  const generateFieldId = () => {
    return `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  const addField = (type: string) => {
    const newField: FormField = {
      id: generateFieldId(),
      type: type as FormFieldType,
      label: `${FIELD_TYPES.find((ft) => ft.type === type)?.label || 'Field'}`,
      required: false,
      order: fields.length,
      ...(type === 'select' || type === 'radio' || type === 'checkbox'
        ? { options: ['Option 1', 'Option 2'] }
        : {}),
    };

    setFields([...fields, newField]);
    setSelectedField(newField);
  };

  const updateField = (fieldId: string, updates: Partial<FormField>) => {
    setFields(
      fields.map((field) => (field.id === fieldId ? { ...field, ...updates } : field))
    );

    if (selectedField?.id === fieldId) {
      setSelectedField({ ...selectedField, ...updates });
    }
  };

  const removeField = (fieldId: string) => {
    setFields(fields.filter((field) => field.id !== fieldId));
    if (selectedField?.id === fieldId) {
      setSelectedField(null);
    }
  };

  const moveField = (fieldId: string, direction: 'up' | 'down') => {
    const currentIndex = fields.findIndex((field) => field.id === fieldId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= fields.length) return;

    const newFields = [...fields];
    [newFields[currentIndex], newFields[newIndex]] = [
      newFields[newIndex],
      newFields[currentIndex],
    ];

    // Update order values
    newFields.forEach((field, index) => {
      field.order = index;
    });

    setFields(newFields);
  };

  const handleSave = async () => {
    if (!formTitle.trim() || !formEmail.trim()) {
      setError('Please provide form title and email');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const response = await fetch('/api/forms', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          form_id: form.form_id,
          title: formTitle.trim(),
          email: formEmail.trim(),
          fields: fields.map((field, index) => ({ ...field, order: index })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update form');
      }

      if (data.success) {
        onSaved();
      } else {
        throw new Error(data.error || 'Failed to update form');
      }
    } catch (err) {
      console.error('Error updating form:', err);
      setError(err instanceof Error ? err.message : 'Failed to update form');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="sticky top-0 bg-white border-b border-[#e5e7eb] px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-[#111827]">Edit Form</h2>
            <p className="text-sm text-[#6b7280] mt-1">
              Update form settings and fields
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
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <span className="text-red-500 text-xl mr-3">⚠️</span>
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Form Settings Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-[#f9fafb] rounded-lg p-4">
                <h3 className="text-md font-medium text-[#111827] mb-4">
                  Form Settings
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[#374151] mb-2">
                      Form Title *
                    </label>
                    <input
                      type="text"
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      className="w-full px-3 py-2 border border-[#d1d5db] rounded-md focus:outline-none focus:ring-2 focus:ring-[#3b82f6]"
                      placeholder="Contact Form"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#374151] mb-2">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      className="w-full px-3 py-2 border border-[#d1d5db] rounded-md focus:outline-none focus:ring-2 focus:ring-[#3b82f6]"
                      placeholder="contact@restaurant.com"
                    />
                    <p className="text-xs text-[#6b7280] mt-1">
                      Form submissions will be sent to this email
                    </p>
                  </div>
                </div>

                <hr className="my-4" />

                <h4 className="text-sm font-medium text-[#111827] mb-3">Add Fields</h4>
                <div className="grid grid-cols-2 gap-2">
                  {FIELD_TYPES.map((fieldType) => (
                    <button
                      key={fieldType.type}
                      onClick={() => addField(fieldType.type)}
                      className="p-2 text-xs border border-[#d1d5db] rounded-md hover:bg-white transition-colors text-center"
                    >
                      <div className="text-base mb-1">{fieldType.icon}</div>
                      <div className="text-xs text-[#6b7280]">{fieldType.label}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Form Builder */}
            <div className="lg:col-span-2">
              <div className="bg-[#f9fafb] rounded-lg p-4">
                <h3 className="text-md font-medium text-[#111827] mb-4">
                  Form Fields
                </h3>

                {fields.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-[#e5e7eb] rounded-lg bg-white">
                    <div className="text-4xl mb-4">📝</div>
                    <p className="text-[#6b7280]">
                      Add fields from the sidebar to start building your form
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {fields.map((field, index) => (
                      <div
                        key={field.id}
                        className={`border rounded-lg p-3 bg-white ${
                          selectedField?.id === field.id
                            ? 'border-[#3b82f6] ring-2 ring-blue-100'
                            : 'border-[#e5e7eb]'
                        }`}
                        onClick={() => setSelectedField(field)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-sm font-medium text-[#374151]">
                            {field.label}{' '}
                            {field.required && <span className="text-red-500">*</span>}
                          </label>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                moveField(field.id, 'up');
                              }}
                              disabled={index === 0}
                              className="p-1 text-[#6b7280] hover:text-[#374151] disabled:opacity-30"
                              title="Move up"
                            >
                              ⬆️
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                moveField(field.id, 'down');
                              }}
                              disabled={index === fields.length - 1}
                              className="p-1 text-[#6b7280] hover:text-[#374151] disabled:opacity-30"
                              title="Move down"
                            >
                              ⬇️
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removeField(field.id);
                              }}
                              className="p-1 text-red-500 hover:text-red-700"
                              title="Delete"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>

                        {/* Field Preview (simplified) */}
                        <div className="text-xs text-[#6b7280]">
                          Type: {field.type}
                          {field.placeholder && ` • Placeholder: ${field.placeholder}`}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Field Editor */}
                {selectedField && (
                  <div className="mt-4 p-4 bg-white rounded-lg border border-[#e5e7eb]">
                    <h4 className="font-medium text-[#111827] mb-3 text-sm">
                      Edit Field: {selectedField.label}
                    </h4>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-[#374151] mb-1">
                          Field Label
                        </label>
                        <input
                          type="text"
                          value={selectedField.label}
                          onChange={(e) =>
                            updateField(selectedField.id, { label: e.target.value })
                          }
                          className="w-full px-3 py-2 border border-[#d1d5db] rounded-md text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-[#374151] mb-1">
                          Placeholder
                        </label>
                        <input
                          type="text"
                          value={selectedField.placeholder || ''}
                          onChange={(e) =>
                            updateField(selectedField.id, {
                              placeholder: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-[#d1d5db] rounded-md text-sm"
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={selectedField.required}
                            onChange={(e) =>
                              updateField(selectedField.id, {
                                required: e.target.checked,
                              })
                            }
                            className="mr-2"
                          />
                          <span className="text-sm font-medium text-[#374151]">
                            Required Field
                          </span>
                        </label>
                      </div>

                      {/* Options for select, radio, checkbox */}
                      {(selectedField.type === 'select' ||
                        selectedField.type === 'radio' ||
                        selectedField.type === 'checkbox') && (
                        <div className="col-span-2">
                          <label className="block text-xs font-medium text-[#374151] mb-2">
                            Options (one per line)
                          </label>
                          <textarea
                            value={selectedField.options?.join('\n') || ''}
                            onChange={(e) =>
                              updateField(selectedField.id, {
                                options: e.target.value
                                  .split('\n')
                                  .filter((opt) => opt.trim()),
                              })
                            }
                            className="w-full px-3 py-2 border border-[#d1d5db] rounded-md text-sm"
                            rows={4}
                            placeholder="Option 1&#10;Option 2&#10;Option 3"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="sticky bottom-0 bg-white border-t border-[#e5e7eb] px-6 py-4 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="bg-[#6b7280] text-white px-6 py-2 rounded-lg hover:bg-[#4b5563] transition-colors"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-[#3b82f6] text-white px-6 py-2 rounded-lg hover:bg-[#2563eb] transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Saving...
              </>
            ) : (
              <>
                <span>💾</span>
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// Delete Confirmation Modal Component
function DeleteConfirmationModal({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#e5e7eb]">
          <div className="flex items-center gap-3">
            <span className="text-3xl">⚠️</span>
            <h2 className="text-xl font-semibold text-[#111827]">
              Delete Form
            </h2>
          </div>
        </div>

        {/* Modal Body */}
        <div className="px-6 py-6">
          <p className="text-[#6b7280] mb-4">
            Are you sure you want to delete this form? This will mark the form as deleted and it will no longer appear in your forms list.
          </p>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-[#f9fafb] border-t border-[#e5e7eb] flex items-center justify-end gap-3 rounded-b-lg">
          <button
            onClick={onCancel}
            className="bg-white text-[#374151] px-4 py-2 rounded-lg border border-[#d1d5db] hover:bg-[#f9fafb] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="bg-[#dc2626] text-white px-4 py-2 rounded-lg hover:bg-[#b91c1c] transition-colors"
          >
            Delete Form
          </button>
        </div>
      </div>
    </div>
  );
}