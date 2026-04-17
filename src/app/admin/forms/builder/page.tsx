/**
 * Form Builder Page
 * 
 * Dynamic form builder interface for creating and editing forms
 * Features:
 * - Drag and drop form fields
 * - Field configuration
 * - Live preview
 * - Save/Update forms
 */

'use client';

import { Suspense } from 'react';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import type { Form, FormField, FormFieldType, FormPayload } from '@/types/forms.types';
import Toast from '@/components/ui/toast';

// Available field types
const FIELD_TYPES: { type: FormFieldType; label: string; icon: string }[] = [
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

// Form templates
const FORM_TEMPLATES = [
  {
    id: 'contact',
    name: 'Contact Form',
    icon: '📧',
    description: 'General contact inquiry form',
    title: 'Contact Us',
    fields: [
      { type: 'text', label: 'Full Name', required: true, order: 0 },
      { type: 'email', label: 'Email Address', required: true, order: 1 },
      { type: 'tel', label: 'Phone Number', required: false, order: 2 },
      { type: 'textarea', label: 'Message', required: true, placeholder: 'How can we help you?', order: 3 },
    ] as Partial<FormField>[]
  },
  {
    id: 'catering',
    name: 'Catering Request',
    icon: '🍽️',
    description: 'Catering service inquiry form',
    title: 'Catering Request',
    fields: [
      { type: 'text', label: 'Full Name', required: true, order: 0 },
      { type: 'email', label: 'Email Address', required: true, order: 1 },
      { type: 'tel', label: 'Phone Number', required: true, order: 2 },
      { type: 'date', label: 'Event Date', required: true, order: 3 },
      { type: 'number', label: 'Number of Guests', required: true, placeholder: 'Estimated guest count', order: 4 },
      { type: 'select', label: 'Event Type', required: true, options: ['Wedding', 'Corporate Event', 'Birthday Party', 'Other'], order: 5 },
      { type: 'textarea', label: 'Special Requirements', required: false, placeholder: 'Dietary restrictions, preferences, etc.', order: 6 },
    ] as Partial<FormField>[]
  },
  {
    id: 'reservation',
    name: 'Reservation',
    icon: '🍴',
    description: 'Table reservation form',
    title: 'Table Reservation',
    fields: [
      { type: 'text', label: 'Full Name', required: true, order: 0 },
      { type: 'email', label: 'Email Address', required: true, order: 1 },
      { type: 'tel', label: 'Phone Number', required: true, order: 2 },
      { type: 'date', label: 'Reservation Date', required: true, order: 3 },
      { type: 'select', label: 'Time', required: true, options: ['5:00 PM', '5:30 PM', '6:00 PM', '6:30 PM', '7:00 PM', '7:30 PM', '8:00 PM', '8:30 PM', '9:00 PM'], order: 4 },
      { type: 'number', label: 'Number of Guests', required: true, placeholder: 'Party size', order: 5 },
      { type: 'textarea', label: 'Special Requests', required: false, placeholder: 'Birthday, anniversary, dietary restrictions, etc.', order: 6 },
    ] as Partial<FormField>[]
  },
  {
    id: 'feedback',
    name: 'Feedback',
    icon: '💬',
    description: 'Customer feedback form',
    title: 'We Value Your Feedback',
    fields: [
      { type: 'text', label: 'Name (Optional)', required: false, order: 0 },
      { type: 'email', label: 'Email (Optional)', required: false, order: 1 },
      { type: 'radio', label: 'Overall Experience', required: true, options: ['Excellent', 'Good', 'Average', 'Poor'], order: 2 },
      { type: 'checkbox', label: 'What did you like?', required: false, options: ['Food Quality', 'Service', 'Ambiance', 'Price', 'Location'], order: 3 },
      { type: 'textarea', label: 'Additional Comments', required: false, placeholder: 'Tell us more about your experience...', order: 4 },
    ] as Partial<FormField>[]
  },
  {
    id: 'private-event',
    name: 'Private Event',
    icon: '🎉',
    description: 'Private event booking form',
    title: 'Private Event Inquiry',
    fields: [
      { type: 'text', label: 'Full Name', required: true, order: 0 },
      { type: 'email', label: 'Email Address', required: true, order: 1 },
      { type: 'tel', label: 'Phone Number', required: true, order: 2 },
      { type: 'date', label: 'Event Date', required: true, order: 3 },
      { type: 'select', label: 'Event Type', required: true, options: ['Birthday Party', 'Anniversary', 'Corporate Event', 'Rehearsal Dinner', 'Other'], order: 4 },
      { type: 'number', label: 'Expected Guests', required: true, order: 5 },
      { type: 'radio', label: 'Preferred Space', required: false, options: ['Private Dining Room', 'Full Venue Buyout', 'Semi-Private Area'], order: 6 },
      { type: 'textarea', label: 'Event Details', required: false, placeholder: 'Menu preferences, decorations, special requirements, etc.', order: 7 },
    ] as Partial<FormField>[]
  },
];

function FormBuilderContent() {
  const searchParams = useSearchParams() ?? new URLSearchParams();
  const router = useRouter();
  const restaurantId = searchParams.get('restaurant_id');
  const restaurantName = searchParams.get('restaurant_name');
  const formId = searchParams.get('form_id'); // For editing existing forms

  const [formTitle, setFormTitle] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [fields, setFields] = useState<FormField[]>([]);
  const [selectedField, setSelectedField] = useState<FormField | null>(null);
  const [optionsDraft, setOptionsDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [showTemplates, setShowTemplates] = useState(true);

  // Load existing form if editing
  useEffect(() => {
    if (formId && restaurantId) {
      loadExistingForm();
    }
  }, [formId, restaurantId]);

  const loadExistingForm = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/forms?restaurant_id=${restaurantId}`);
      const data = await response.json();

      if (data.success) {
        const existingForm = data.data.find((f: Form) => f.form_id === formId);
        if (existingForm) {
          setFormTitle(existingForm.title);
          setFormEmail(existingForm.email);
          setFields(existingForm.fields || []);
        }
      }
    } catch (error) {
      console.error('Error loading form:', error);
      setToastMessage('Failed to load form');
      setToastType('error');
      setShowToast(true);
    } finally {
      setLoading(false);
    }
  };

  const generateFieldId = () => {
    return `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  const applyTemplate = (template: typeof FORM_TEMPLATES[0]) => {
    setFormTitle(template.title);
    const templateFields = template.fields.map((field, index) => ({
      ...field,
      id: generateFieldId(),
      order: index,
    })) as FormField[];
    setFields(templateFields);
    setShowTemplates(false);
  };

  const addField = (type: FormFieldType) => {
    const newField: FormField = {
      id: generateFieldId(),
      type,
      label: `${FIELD_TYPES.find(ft => ft.type === type)?.label || 'Field'}`,
      required: false,
      order: fields.length,
      ...(type === 'select' || type === 'radio' || type === 'checkbox' ? { options: ['Option 1', 'Option 2'] } : {})
    };

    setFields([...fields, newField]);
    setSelectedField(newField);
  };

  const updateField = (fieldId: string, updates: Partial<FormField>) => {
    setFields(fields.map(field => 
      field.id === fieldId ? { ...field, ...updates } : field
    ));
    
    if (selectedField?.id === fieldId) {
      setSelectedField({ ...selectedField, ...updates });
    }
  };

  useEffect(() => {
    if (
      selectedField &&
      (selectedField.type === 'select' ||
        selectedField.type === 'radio' ||
        selectedField.type === 'checkbox')
    ) {
      setOptionsDraft(selectedField.options?.join('\n') || '');
      return;
    }

    setOptionsDraft('');
  }, [selectedField?.id, selectedField?.type]);

  const removeField = (fieldId: string) => {
    setFields(fields.filter(field => field.id !== fieldId));
    if (selectedField?.id === fieldId) {
      setSelectedField(null);
    }
  };

  const moveField = (fieldId: string, direction: 'up' | 'down') => {
    const currentIndex = fields.findIndex(field => field.id === fieldId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= fields.length) return;

    const newFields = [...fields];
    [newFields[currentIndex], newFields[newIndex]] = [newFields[newIndex], newFields[currentIndex]];
    
    // Update order values
    newFields.forEach((field, index) => {
      field.order = index;
    });

    setFields(newFields);
  };

  const saveForm = async () => {
    if (!formTitle.trim() || !formEmail.trim()) {
      setToastMessage('Please provide form title and email');
      setToastType('error');
      setShowToast(true);
      return;
    }

    try {
      setSaving(true);

      const payload: FormPayload = {
        title: formTitle.trim(),
        email: formEmail.trim(),
        fields: fields.map((field, index) => ({ ...field, order: index })),
        restaurant_id: restaurantId!
      };

      const url = formId ? '/api/forms' : '/api/forms';
      const method = formId ? 'PUT' : 'POST';
      const body = formId ? { form_id: formId, ...payload } : payload;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (data.success) {
        setToastMessage(formId ? 'Form updated successfully!' : 'Form created successfully!');
        setToastType('success');
        setShowToast(true);

        // Redirect to forms list after a delay
        setTimeout(() => {
          router.push(`/admin/forms?restaurant_id=${restaurantId}&restaurant_name=${encodeURIComponent(restaurantName || '')}`);
        }, 2000);
      } else {
        throw new Error(data.error || 'Failed to save form');
      }
    } catch (error) {
      console.error('Error saving form:', error);
      setToastMessage(error instanceof Error ? error.message : 'Failed to save form');
      setToastType('error');
      setShowToast(true);
    } finally {
      setSaving(false);
    }
  };

  if (!restaurantId) {
    return (
      <>
        <div className="flex min-h-[400px] items-center justify-center p-6">
          <div className="max-w-md text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-purple-100 to-purple-200">
              <svg className="h-8 w-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
              </svg>
            </div>
            <h2 className="mb-2 text-xl font-bold text-gray-900">
              Select a Restaurant
            </h2>
            <p className="text-sm text-gray-600">
              Please add or select a restaurant from the sidebar to create forms.
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
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
          {/* Back Button */}
          <div className="mb-6">
            <button
              onClick={() => {
                router.push(`/admin/forms?restaurant_id=${restaurantId}&restaurant_name=${encodeURIComponent(restaurantName || '')}`);
              }}
              className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 transition-colors hover:text-purple-600"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
              Back to Forms
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg">
                <svg className="h-7 w-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  {formId ? (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                  )}
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                  {formId ? 'Edit Form' : 'Create New Form'}
                </h1>
                <p className="mt-1 text-sm text-gray-600">
                  Build dynamic forms for {restaurantName}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  router.push(`/admin/forms?restaurant_id=${restaurantId}&restaurant_name=${encodeURIComponent(restaurantName || '')}`);
                }}
                className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={saveForm}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 px-5 py-2.5 text-sm font-medium text-white shadow-md transition-all hover:from-purple-700 hover:to-purple-800 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    {formId ? 'Update Form' : 'Create Form'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Templates Section - Show only when creating a new form */}
        {!formId && showTemplates && fields.length === 0 && (
          <div className="mb-8">
            <div className="rounded-xl border border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100/50 p-6">
              <div className="mb-6 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
                    <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Start with a Template</h3>
                    <p className="mt-0.5 text-sm text-gray-600">
                      Choose a pre-built template and customize it to your needs
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowTemplates(false)}
                  className="text-sm font-medium text-purple-600 transition-colors hover:text-purple-700"
                >
                  Start from scratch
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {FORM_TEMPLATES.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => applyTemplate(template)}
                    className="group rounded-lg border border-purple-200 bg-white p-4 text-left transition-all hover:border-purple-400 hover:shadow-md"
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-3xl">{template.icon}</span>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 transition-colors group-hover:text-purple-600">
                          {template.name}
                        </h4>
                        <p className="mt-1 text-xs text-gray-600">
                          {template.description}
                        </p>
                        <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
                          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                          </svg>
                          {template.fields.length} fields
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Loading state removed */}
        {(
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            {/* Form Settings */}
            <div className="lg:col-span-1">
              <div className="space-y-5 rounded-xl border border-purple-100 bg-gradient-to-br from-purple-50/50 to-white p-6 shadow-sm">
                <div>
                  <h3 className="mb-4 text-sm font-bold text-gray-900">Form Settings</h3>

                  <div className="space-y-4">
                    <div>
                      <label className="mb-2 block text-xs font-medium text-gray-700">
                        Form Title *
                      </label>
                      <input
                        type="text"
                        value={formTitle}
                        onChange={(e) => setFormTitle(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="Contact Form"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-xs font-medium text-gray-700">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        value={formEmail}
                        onChange={(e) => setFormEmail(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="contact@restaurant.com"
                      />
                      <p className="mt-1.5 text-xs text-gray-500">
                        Form submissions will be sent to this email
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-purple-100 pt-4">
                  <h4 className="mb-3 text-xs font-bold text-gray-900">Add Fields</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {FIELD_TYPES.map((fieldType) => (
                      <button
                        key={fieldType.type}
                        onClick={() => addField(fieldType.type)}
                        className="rounded-lg border border-purple-200 bg-white p-2.5 text-center transition-all hover:border-purple-300 hover:bg-purple-50"
                      >
                        <div className="mb-1 text-base">{fieldType.icon}</div>
                        <div className="text-xs font-medium text-gray-700">{fieldType.label}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Form Builder */}
            <div className="lg:col-span-2">
              <div className="space-y-5 rounded-xl border border-purple-100 bg-gradient-to-br from-purple-50/50 to-white p-6 shadow-sm">
                <h3 className="text-sm font-bold text-gray-900">Form Preview</h3>

                {fields.length === 0 ? (
                  <div className="rounded-lg border-2 border-dashed border-purple-300 bg-white py-12 text-center">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
                      <svg className="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                      </svg>
                    </div>
                    <p className="mb-4 text-sm text-gray-600">
                      Add fields from the sidebar to start building your form
                    </p>
                    {!formId && (
                      <button
                        onClick={() => setShowTemplates(true)}
                        className="text-sm font-medium text-purple-600 transition-colors hover:text-purple-700"
                      >
                        Or choose from templates
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {fields.map((field, index) => (
                      <div
                        key={field.id}
                        className={`cursor-pointer rounded-lg border bg-white p-4 transition-all ${
                          selectedField?.id === field.id
                            ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-100'
                            : 'border-gray-200 hover:border-purple-300'
                        }`}
                        onClick={() => setSelectedField(field)}
                      >
                        <div className="mb-3 flex items-center justify-between">
                          <label className="text-sm font-medium text-gray-900">
                            {field.label} {field.required && <span className="text-red-500">*</span>}
                          </label>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                moveField(field.id, 'up');
                              }}
                              disabled={index === 0}
                              className="rounded p-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:opacity-30"
                              title="Move up"
                            >
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                              </svg>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                moveField(field.id, 'down');
                              }}
                              disabled={index === fields.length - 1}
                              className="rounded p-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:opacity-30"
                              title="Move down"
                            >
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                              </svg>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removeField(field.id);
                              }}
                              className="rounded p-1 text-red-500 transition-colors hover:bg-red-100 hover:text-red-700"
                              title="Delete"
                            >
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                              </svg>
                            </button>
                          </div>
                        </div>

                        {/* Field Preview */}
                        {field.type === 'textarea' ? (
                          <textarea
                            placeholder={field.placeholder || ''}
                            className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm"
                            rows={3}
                            disabled
                          />
                        ) : field.type === 'select' ? (
                          <select className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm" disabled>
                            <option>Select an option...</option>
                            {field.options?.map((option, i) => (
                              <option key={i}>{option}</option>
                            ))}
                          </select>
                        ) : field.type === 'radio' ? (
                          <div className="space-y-2">
                            {field.options?.map((option, i) => (
                              <label key={i} className="flex items-center text-sm text-gray-700">
                                <input type="radio" name={field.id} className="mr-2" disabled />
                                {option}
                              </label>
                            ))}
                          </div>
                        ) : field.type === 'checkbox' ? (
                          <div className="space-y-2">
                            {field.options?.map((option, i) => (
                              <label key={i} className="flex items-center text-sm text-gray-700">
                                <input type="checkbox" className="mr-2" disabled />
                                {option}
                              </label>
                            ))}
                          </div>
                        ) : (
                          <input
                            type={field.type}
                            placeholder={field.placeholder || ''}
                            className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm"
                            disabled
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Field Editor */}
                {selectedField && (
                  <div className="mt-4 rounded-lg border border-purple-200 bg-white p-4">
                    <h4 className="mb-3 text-sm font-bold text-gray-900">
                      Edit Field: {selectedField.label}
                    </h4>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-gray-700">
                          Field Label
                        </label>
                        <input
                          type="text"
                          value={selectedField.label}
                          onChange={(e) => updateField(selectedField.id, { label: e.target.value })}
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>

                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-gray-700">
                          Placeholder
                        </label>
                        <input
                          type="text"
                          value={selectedField.placeholder || ''}
                          onChange={(e) => updateField(selectedField.id, { placeholder: e.target.value })}
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={selectedField.required}
                            onChange={(e) => updateField(selectedField.id, { required: e.target.checked })}
                            className="mr-2 h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-2 focus:ring-purple-500"
                          />
                          <span className="text-sm font-medium text-gray-700">Required Field</span>
                        </label>
                      </div>

                      {/* Options for select, radio, checkbox */}
                      {(selectedField.type === 'select' || selectedField.type === 'radio' || selectedField.type === 'checkbox') && (
                        <div className="col-span-2">
                          <label className="mb-2 block text-xs font-medium text-gray-700">
                            Options (one per line)
                          </label>
                          <textarea
                            value={optionsDraft}
                            onChange={(e) => {
                              const nextValue = e.target.value;
                              setOptionsDraft(nextValue);
                              updateField(selectedField.id, {
                                options: nextValue.split('\n').filter(opt => opt.trim())
                              });
                            }}
                            onKeyDown={(e) => e.stopPropagation()}
                            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500"
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
        )}
      </div>
    </>
  );
}

export default function FormBuilderPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <FormBuilderContent />
    </Suspense>
  );
}
