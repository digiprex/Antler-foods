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

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
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

export default function FormBuilderPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const restaurantId = searchParams.get('restaurant_id');
  const restaurantName = searchParams.get('restaurant_name');
  const formId = searchParams.get('form_id'); // For editing existing forms

  const [formTitle, setFormTitle] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [fields, setFields] = useState<FormField[]>([]);
  const [selectedField, setSelectedField] = useState<FormField | null>(null);
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
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="text-6xl mb-4">📋</div>
            <h2 className="text-xl font-semibold text-[#111827] mb-2">
              Restaurant Required
            </h2>
            <p className="text-[#6b7280] max-w-md">
              Please provide restaurant_id parameter to create forms.
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
          {/* Back Button */}
          <div className="mb-4">
            <button
              onClick={() => {
                router.push(`/admin/forms?restaurant_id=${restaurantId}&restaurant_name=${encodeURIComponent(restaurantName || '')}`);
              }}
              className="inline-flex items-center gap-2 text-[#6b7280] hover:text-[#374151] transition-colors"
            >
              <span className="text-lg">←</span>
              <span className="text-sm font-medium">Back to Forms</span>
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[#111827]">
                {formId ? 'Edit Form' : 'Create New Form'}
              </h1>
              <p className="text-[#6b7280] mt-1">
                Build dynamic forms for {restaurantName}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  router.push(`/admin/forms?restaurant_id=${restaurantId}&restaurant_name=${encodeURIComponent(restaurantName || '')}`);
                }}
                className="bg-[#6b7280] text-white px-4 py-2 rounded-lg hover:bg-[#4b5563] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveForm}
                disabled={saving}
                className="bg-[#3b82f6] text-white px-4 py-2 rounded-lg hover:bg-[#2563eb] transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <span>💾</span>
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
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-[#111827]">Start with a Template</h3>
                  <p className="text-sm text-[#6b7280] mt-1">
                    Choose a pre-built template and customize it to your needs
                  </p>
                </div>
                <button
                  onClick={() => setShowTemplates(false)}
                  className="text-[#6b7280] hover:text-[#374151] text-sm"
                >
                  Start from scratch instead
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {FORM_TEMPLATES.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => applyTemplate(template)}
                    className="bg-white rounded-lg p-4 border border-[#e5e7eb] hover:border-[#3b82f6] hover:shadow-md transition-all text-left group"
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-3xl">{template.icon}</span>
                      <div className="flex-1">
                        <h4 className="font-medium text-[#111827] group-hover:text-[#3b82f6] transition-colors">
                          {template.name}
                        </h4>
                        <p className="text-xs text-[#6b7280] mt-1">
                          {template.description}
                        </p>
                        <p className="text-xs text-[#9ca3af] mt-2">
                          {template.fields.length} fields
                        </p>
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Form Settings */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm border border-[#e5e7eb] p-6">
                <h3 className="text-lg font-medium text-[#111827] mb-4">Form Settings</h3>
                
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

                <hr className="my-6" />

                <h4 className="text-md font-medium text-[#111827] mb-4">Add Fields</h4>
                <div className="grid grid-cols-2 gap-2">
                  {FIELD_TYPES.map((fieldType) => (
                    <button
                      key={fieldType.type}
                      onClick={() => addField(fieldType.type)}
                      className="p-3 text-sm border border-[#d1d5db] rounded-md hover:bg-[#f9fafb] transition-colors text-center"
                    >
                      <div className="text-lg mb-1">{fieldType.icon}</div>
                      <div className="text-xs text-[#6b7280]">{fieldType.label}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Form Builder */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-sm border border-[#e5e7eb] p-6">
                <h3 className="text-lg font-medium text-[#111827] mb-4">Form Preview</h3>
                
                {fields.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-[#e5e7eb] rounded-lg">
                    <div className="text-4xl mb-4">📝</div>
                    <p className="text-[#6b7280] mb-4">
                      Add fields from the sidebar to start building your form
                    </p>
                    {!formId && (
                      <button
                        onClick={() => setShowTemplates(true)}
                        className="text-[#3b82f6] hover:text-[#2563eb] text-sm font-medium"
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
                        className={`border rounded-lg p-4 ${
                          selectedField?.id === field.id ? 'border-[#3b82f6] bg-blue-50' : 'border-[#e5e7eb]'
                        }`}
                        onClick={() => setSelectedField(field)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-sm font-medium text-[#374151]">
                            {field.label} {field.required && <span className="text-red-500">*</span>}
                          </label>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                moveField(field.id, 'up');
                              }}
                              disabled={index === 0}
                              className="p-1 text-[#6b7280] hover:text-[#374151] disabled:opacity-50"
                            >
                              ⬆️
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                moveField(field.id, 'down');
                              }}
                              disabled={index === fields.length - 1}
                              className="p-1 text-[#6b7280] hover:text-[#374151] disabled:opacity-50"
                            >
                              ⬇️
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removeField(field.id);
                              }}
                              className="p-1 text-red-500 hover:text-red-700"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>

                        {/* Field Preview */}
                        {field.type === 'textarea' ? (
                          <textarea
                            placeholder={field.placeholder || ''}
                            className="w-full px-3 py-2 border border-[#d1d5db] rounded-md"
                            rows={3}
                            disabled
                          />
                        ) : field.type === 'select' ? (
                          <select className="w-full px-3 py-2 border border-[#d1d5db] rounded-md" disabled>
                            <option>Select an option...</option>
                            {field.options?.map((option, i) => (
                              <option key={i}>{option}</option>
                            ))}
                          </select>
                        ) : field.type === 'radio' ? (
                          <div className="space-y-2">
                            {field.options?.map((option, i) => (
                              <label key={i} className="flex items-center">
                                <input type="radio" name={field.id} className="mr-2" disabled />
                                {option}
                              </label>
                            ))}
                          </div>
                        ) : field.type === 'checkbox' ? (
                          <div className="space-y-2">
                            {field.options?.map((option, i) => (
                              <label key={i} className="flex items-center">
                                <input type="checkbox" className="mr-2" disabled />
                                {option}
                              </label>
                            ))}
                          </div>
                        ) : (
                          <input
                            type={field.type}
                            placeholder={field.placeholder || ''}
                            className="w-full px-3 py-2 border border-[#d1d5db] rounded-md"
                            disabled
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Field Editor */}
                {selectedField && (
                  <div className="mt-6 p-4 bg-[#f9fafb] rounded-lg border">
                    <h4 className="font-medium text-[#111827] mb-4">Edit Field: {selectedField.label}</h4>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-[#374151] mb-1">
                          Field Label
                        </label>
                        <input
                          type="text"
                          value={selectedField.label}
                          onChange={(e) => updateField(selectedField.id, { label: e.target.value })}
                          className="w-full px-3 py-2 border border-[#d1d5db] rounded-md text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-[#374151] mb-1">
                          Placeholder
                        </label>
                        <input
                          type="text"
                          value={selectedField.placeholder || ''}
                          onChange={(e) => updateField(selectedField.id, { placeholder: e.target.value })}
                          className="w-full px-3 py-2 border border-[#d1d5db] rounded-md text-sm"
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={selectedField.required}
                            onChange={(e) => updateField(selectedField.id, { required: e.target.checked })}
                            className="mr-2"
                          />
                          <span className="text-sm font-medium text-[#374151]">Required Field</span>
                        </label>
                      </div>

                      {/* Options for select, radio, checkbox */}
                      {(selectedField.type === 'select' || selectedField.type === 'radio' || selectedField.type === 'checkbox') && (
                        <div className="col-span-2">
                          <label className="block text-sm font-medium text-[#374151] mb-2">
                            Options (one per line)
                          </label>
                          <textarea
                            value={selectedField.options?.join('\n') || ''}
                            onChange={(e) => updateField(selectedField.id, { 
                              options: e.target.value.split('\n').filter(opt => opt.trim()) 
                            })}
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
        )}
      </div>
    </DashboardLayout>
  );
}