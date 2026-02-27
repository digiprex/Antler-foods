/**
 * Form Preview Page
 * 
 * Shows a live preview of how the form will appear to users
 * Features:
 * - Full form rendering
 * - Form validation preview
 * - Responsive design preview
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import type { Form, FormField } from '@/types/forms.types';

// Simple layout component for form preview (no authentication required)
function PreviewLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f3f5f6]">
      <div className="bg-white shadow-sm border-b border-[#e5e7eb]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-lg font-semibold text-[#111827]">Form Preview</h1>
            </div>
            <button
              onClick={() => window.history.back()}
              className="bg-[#6b7280] text-white px-4 py-2 rounded-lg hover:bg-[#4b5563] transition-colors text-sm"
            >
              ← Back
            </button>
          </div>
        </div>
      </div>
      <main className="flex-1 p-6 md:p-8">{children}</main>
    </div>
  );
}

export default function FormPreviewPage() {
  const searchParams = useSearchParams();
  const formId = searchParams.get('form_id');
  const restaurantId = searchParams.get('restaurant_id');

  const [form, setForm] = useState<Form | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, string | string[]>>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const fetchForm = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // First get all forms for the restaurant, then find the specific form
      const response = await fetch(`/api/forms?restaurant_id=${restaurantId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch forms');
      }

      if (data.success && data.data) {
        // Find the specific form by ID
        const targetForm = data.data.find((f: Form) => f.form_id === formId);
        if (targetForm) {
          setForm(targetForm);
        } else {
          throw new Error('Form not found');
        }
      } else {
        throw new Error('Failed to fetch forms');
      }
    } catch (err) {
      console.error('Error fetching form:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  }, [formId, restaurantId]);

  useEffect(() => {
    if (formId && restaurantId) {
      fetchForm();
    }
  }, [formId, restaurantId, fetchForm]);

  const handleFieldChange = (fieldId: string, value: string | string[]) => {
    setFormData(prev => ({
      ...prev,
      [fieldId]: value
    }));

    // Clear validation error when user starts typing
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

    form?.fields?.forEach((field: FormField) => {
      const value = formData[field.id];

      if (field.required && (!value || (typeof value === 'string' && !value.trim()))) {
        errors[field.id] = `${field.label} is required`;
      }

      if (value && field.validation && typeof value === 'string') {
        const validation = field.validation;

        if (validation.minLength && value.length < validation.minLength) {
          errors[field.id] = `${field.label} must be at least ${validation.minLength} characters`;
        }

        if (validation.maxLength && value.length > validation.maxLength) {
          errors[field.id] = `${field.label} must not exceed ${validation.maxLength} characters`;
        }

        if (validation.pattern && !new RegExp(validation.pattern).test(value)) {
          errors[field.id] = `${field.label} format is invalid`;
        }

        if (field.type === 'number') {
          const numValue = parseFloat(value);
          if (validation.min !== undefined && numValue < validation.min) {
            errors[field.id] = `${field.label} must be at least ${validation.min}`;
          }
          if (validation.max !== undefined && numValue > validation.max) {
            errors[field.id] = `${field.label} must not exceed ${validation.max}`;
          }
        }
      }

      // Email validation
      if (field.type === 'email' && value && typeof value === 'string') {
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
      alert('Form validation passed! In a real implementation, this would submit the form data.');
      console.log('Form data:', formData);
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
            {field.options?.map((option, index) => (
              <option key={index} value={option}>
                {option}
              </option>
            ))}
          </select>
        );

      case 'radio':
        return (
          <div className="space-y-2">
            {field.options?.map((option, index) => (
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
            {field.options?.map((option, index) => (
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

  if (!formId || !restaurantId) {
    return (
      <PreviewLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="text-6xl mb-4">📋</div>
            <h2 className="text-xl font-semibold text-[#111827] mb-2">
              Parameters Required
            </h2>
            <p className="text-[#6b7280] max-w-md">
              Please provide both form_id and restaurant_id parameters to preview the form.
            </p>
          </div>
        </div>
      </PreviewLayout>
    );
  }

  return (
    <PreviewLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div>
            <h1 className="text-2xl font-bold text-[#111827]">Form Preview</h1>
            <p className="text-[#6b7280] mt-1">
              Preview how your form will appear to users
            </p>
          </div>
        </div>

        {/* Loading State - Removed */}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <span className="text-red-500 text-xl mr-3">⚠️</span>
              <div>
                <h3 className="text-red-800 font-medium">Error Loading Form</h3>
                <p className="text-red-600 text-sm mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Form Preview */}
        {form && !loading && !error && (
          <div className="bg-white rounded-lg shadow-sm border border-[#e5e7eb] p-8">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-[#111827] mb-2">
                {form.title}
              </h2>
              <p className="text-sm text-[#6b7280]">
                Submissions will be sent to: {form.email}
              </p>
            </div>

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

                <div className="pt-4">
                  <button
                    type="submit"
                    className="bg-[#3b82f6] text-white px-6 py-2 rounded-lg hover:bg-[#2563eb] transition-colors"
                  >
                    Submit Form
                  </button>
                </div>
              </form>
            ) : (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">📝</div>
                <p className="text-[#6b7280]">
                  This form has no fields yet. Add some fields in the form builder.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Preview Info */}
        {form && (
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <span className="text-blue-500 text-xl mr-3">ℹ️</span>
              <div>
                <h3 className="text-blue-800 font-medium">Preview Mode</h3>
                <p className="text-blue-600 text-sm mt-1">
                  This is a preview of your form. Form submissions are not actually processed in preview mode.
                  The form validation and user experience will work exactly like this when deployed.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </PreviewLayout>
  );
}