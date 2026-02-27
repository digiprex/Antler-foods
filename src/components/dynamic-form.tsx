/**
 * Dynamic Form Component
 *
 * Renders form section with configurable layout and styling.
 * Fetches form settings and displays the selected form.
 */

"use client";

import { useState, useEffect } from 'react';

interface FormField {
  id: string;
  type: string;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
  order: number;
}

interface Form {
  form_id: string;
  title: string;
  email: string;
  fields: FormField[];
}

interface FormSettings {
  form_id: string;
  layout: string;
  title: string;
  subtitle: string;
  description: string;
  backgroundColor: string;
  textColor: string;
  imageUrl?: string;
  showImage: boolean;
  imagePosition: 'left' | 'right' | 'top' | 'background';
  enabled: boolean;
}

interface DynamicFormProps {
  restaurantId: string;
  pageId?: string;
  showLoading?: boolean;
}

export default function DynamicForm({
  restaurantId,
  pageId,
  showLoading = false
}: DynamicFormProps) {
  const [formSettings, setFormSettings] = useState<FormSettings | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [formData, setFormData] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchFormSettings = async () => {
      if (!pageId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await fetch(`/api/form-settings?restaurant_id=${restaurantId}&page_id=${pageId}`);
        const data = await response.json();

        if (data.success && data.data) {
          setFormSettings(data.data);

          // Fetch the actual form
          if (data.data.form_id) {
            const formResponse = await fetch(`/api/forms?restaurant_id=${restaurantId}`);
            const formData = await formResponse.json();

            if (formData.success && formData.data) {
              const selectedForm = formData.data.find((f: Form) => f.form_id === data.data.form_id);
              if (selectedForm) {
                setForm(selectedForm);
              }
            }
          }
        }
      } catch (err) {
        console.error('Error fetching form settings:', err);
        setError(err instanceof Error ? err.message : 'Failed to load form');
      } finally {
        setLoading(false);
      }
    };

    fetchFormSettings();
  }, [restaurantId, pageId]);

  const handleInputChange = (fieldId: string, value: string) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form || !formSettings) return;

    // Use email from form creation (forms table)
    if (!form.email) {
      alert('Form email not configured. Please contact administrator.');
      return;
    }

    try {
      setSubmitting(true);

      const response = await fetch('/api/form-submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          form_id: form.form_id,
          form_title: form.title,
          restaurant_id: restaurantId,
          email: form.email,
          data: formData
        })
      });

      const result = await response.json();

      if (result.success) {
        setSubmitSuccess(true);
        setFormData({});
        setTimeout(() => setSubmitSuccess(false), 5000);
      } else {
        throw new Error(result.error || 'Submission failed');
      }
    } catch (err) {
      console.error('Form submission error:', err);
      alert('Failed to submit form. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && showLoading) {
    return (
      <section style={{
        padding: '80px 2rem',
        backgroundColor: '#f9fafb',
        textAlign: 'center'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ color: '#6b7280' }}>Loading form...</div>
        </div>
      </section>
    );
  }

  if (error || !formSettings || !form || !formSettings.enabled) {
    return null;
  }

  const renderFormFields = () => {
    return form.fields
      .sort((a, b) => a.order - b.order)
      .map((field) => (
        <div key={field.id} style={{ marginBottom: '1.5rem' }}>
          <label
            htmlFor={field.id}
            style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '500',
              marginBottom: '0.5rem',
              color: formSettings.textColor
            }}
          >
            {field.label}
            {field.required && <span style={{ color: '#dc2626', marginLeft: '0.25rem' }}>*</span>}
          </label>

          {field.type === 'textarea' ? (
            <textarea
              id={field.id}
              placeholder={field.placeholder || ''}
              required={field.required}
              value={formData[field.id] || ''}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                fontFamily: 'inherit',
                resize: 'vertical',
                minHeight: '120px',
                boxSizing: 'border-box'
              }}
              rows={4}
            />
          ) : field.type === 'select' ? (
            <select
              id={field.id}
              required={field.required}
              value={formData[field.id] || ''}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                backgroundColor: 'white',
                boxSizing: 'border-box'
              }}
            >
              <option value="">Select an option...</option>
              {field.options?.map((option, i) => (
                <option key={i} value={option}>{option}</option>
              ))}
            </select>
          ) : (
            <input
              id={field.id}
              type={field.type}
              placeholder={field.placeholder || ''}
              required={field.required}
              value={formData[field.id] || ''}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                boxSizing: 'border-box'
              }}
            />
          )}
        </div>
      ));
  };

  const renderForm = () => (
    <form onSubmit={handleSubmit}>
      {renderFormFields()}

      {submitSuccess && (
        <div style={{
          padding: '1rem',
          backgroundColor: '#dcfce7',
          color: '#166534',
          borderRadius: '0.375rem',
          marginBottom: '1rem',
          textAlign: 'center'
        }}>
          Thank you! Your submission has been received.
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        style={{
          backgroundColor: '#3b82f6',
          color: 'white',
          padding: '0.75rem 1.5rem',
          border: 'none',
          borderRadius: '0.375rem',
          fontSize: '0.875rem',
          fontWeight: '500',
          cursor: submitting ? 'not-allowed' : 'pointer',
          opacity: submitting ? 0.6 : 1,
          width: '100%'
        }}
      >
        {submitting ? 'Submitting...' : 'Submit'}
      </button>
    </form>
  );

  const renderContent = () => (
    <div style={{ textAlign: formSettings.layout === 'centered' ? 'center' : 'left', marginBottom: '2rem' }}>
      <h2 style={{
        fontSize: '2rem',
        fontWeight: 'bold',
        marginBottom: '0.5rem',
        color: formSettings.textColor
      }}>
        {formSettings.title}
      </h2>
      {formSettings.subtitle && (
        <p style={{
          fontSize: '1.125rem',
          marginBottom: '0.5rem',
          opacity: 0.8,
          color: formSettings.textColor
        }}>
          {formSettings.subtitle}
        </p>
      )}
      {formSettings.description && (
        <p style={{
          fontSize: '0.875rem',
          opacity: 0.7,
          lineHeight: 1.6,
          color: formSettings.textColor
        }}>
          {formSettings.description}
        </p>
      )}
    </div>
  );

  // Render different layouts
  if (formSettings.layout === 'split-right') {
    return (
      <section style={{
        padding: '80px 2rem',
        backgroundColor: formSettings.backgroundColor,
        color: formSettings.textColor
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: window.innerWidth < 768 ? '1fr' : '1fr 1fr',
            gap: '3rem',
            alignItems: 'center'
          }}>
            <div>
              {renderContent()}
              {renderForm()}
            </div>
            {formSettings.imageUrl && (
              <div style={{
                borderRadius: '0.5rem',
                overflow: 'hidden',
                height: window.innerWidth < 768 ? '300px' : '500px'
              }}>
                <img
                  src={formSettings.imageUrl}
                  alt="Form image"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </section>
    );
  }

  if (formSettings.layout === 'split-left') {
    return (
      <section style={{
        padding: '80px 2rem',
        backgroundColor: formSettings.backgroundColor,
        color: formSettings.textColor
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: window.innerWidth < 768 ? '1fr' : '1fr 1fr',
            gap: '3rem',
            alignItems: 'center'
          }}>
            {formSettings.imageUrl && (
              <div style={{
                borderRadius: '0.5rem',
                overflow: 'hidden',
                height: window.innerWidth < 768 ? '300px' : '500px',
                order: window.innerWidth < 768 ? 1 : 0
              }}>
                <img
                  src={formSettings.imageUrl}
                  alt="Form image"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                />
              </div>
            )}
            <div style={{ order: window.innerWidth < 768 ? 0 : 1 }}>
              {renderContent()}
              {renderForm()}
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (formSettings.layout === 'image-top') {
    return (
      <section style={{
        padding: '80px 2rem',
        backgroundColor: formSettings.backgroundColor,
        color: formSettings.textColor
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          {formSettings.imageUrl && (
            <div style={{
              borderRadius: '0.5rem',
              overflow: 'hidden',
              height: '300px',
              marginBottom: '3rem'
            }}>
              <img
                src={formSettings.imageUrl}
                alt="Form image"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }}
              />
            </div>
          )}
          {renderContent()}
          {renderForm()}
        </div>
      </section>
    );
  }

  if (formSettings.layout === 'background-image') {
    return (
      <section style={{
        padding: '80px 2rem',
        backgroundImage: formSettings.imageUrl ? `url(${formSettings.imageUrl})` : 'none',
        backgroundColor: formSettings.imageUrl ? 'transparent' : formSettings.backgroundColor,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        position: 'relative',
        minHeight: '600px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {formSettings.imageUrl && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            zIndex: 0
          }} />
        )}
        <div style={{
          position: 'relative',
          zIndex: 1,
          maxWidth: '600px',
          width: '100%',
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          padding: '3rem',
          borderRadius: '1rem',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)'
        }}>
          {renderContent()}
          {renderForm()}
        </div>
      </section>
    );
  }

  // Default centered layout
  return (
    <section style={{
      padding: '80px 2rem',
      backgroundColor: formSettings.backgroundColor,
      color: formSettings.textColor
    }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        {renderContent()}
        {renderForm()}
      </div>
    </section>
  );
}
