/**
 * Dynamic Form Component
 * 
 * Fetches form configuration from API and renders the form section
 */

'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

interface FormField {
  field_id: string;
  type: 'text' | 'email' | 'phone' | 'textarea' | 'select' | 'checkbox' | 'radio';
  label: string;
  placeholder?: string;
  required: boolean;
  order: number;
  options?: string[];
}

interface FormConfig {
  isEnabled?: boolean;
  title?: string;
  description?: string;
  layout?: string;
  backgroundColor?: string;
  textColor?: string;
  buttonColor?: string;
  buttonText?: string;
  imageUrl?: string;
  selectedFormId?: string;
}

interface Form {
  form_id: string;
  name: string;
  fields: FormField[];
}

interface DynamicFormProps {
  restaurantId?: string;
  pageId?: string;
  showLoading?: boolean;
  configData?: Partial<FormConfig>;
}

export default function DynamicForm({
  restaurantId,
  pageId,
  showLoading = true,
  configData
}: DynamicFormProps) {
  const [config, setConfig] = useState<FormConfig | null>(configData || null);
  const [form, setForm] = useState<Form | null>(null);
  const [loading, setLoading] = useState(!configData);

  useEffect(() => {
    // If configData is provided, use it directly
    if (configData) {
      setConfig(configData as FormConfig);
      setLoading(false);
      return;
    }

    const fetchConfig = async () => {
      if (!restaurantId) {
        setLoading(false);
        return;
      }

      try {
        // Fetch form configuration
        const configUrl = pageId 
          ? `/api/form-settings?restaurant_id=${restaurantId}&page_id=${pageId}`
          : `/api/form-settings?restaurant_id=${restaurantId}`;
        
        const configResponse = await fetch(configUrl);
        const configData = await configResponse.json();

        if (configData.success && configData.data) {
          setConfig(configData.data);

          // If a form is selected, fetch the form details
          if (configData.data.selectedFormId) {
            const formResponse = await fetch(`/api/forms?restaurant_id=${restaurantId}&form_id=${configData.data.selectedFormId}`);
            const formData = await formResponse.json();
            
            if (formData.success && formData.data && formData.data.length > 0) {
              setForm(formData.data[0]);
            }
          }
        }
      } catch (err) {
        console.error('Error fetching form config:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, [restaurantId, pageId, configData]);

  // Show loading state
  if (loading && showLoading) {
    return (
      <div style={{
        minHeight: '300px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f9fafb'
      }}>
        <div style={{
          textAlign: 'center',
          color: '#6b7280'
        }}>
          <p>Loading form...</p>
        </div>
      </div>
    );
  }

  // Use actual config if available, otherwise use sample config for preview
  const displayConfig = config || {
    title: 'Contact Form',
    description: 'Get in touch with us',
    layout: 'centered',
    backgroundColor: '#ffffff',
    textColor: '#000000',
    buttonColor: '#3b82f6',
    buttonText: 'Submit',
    isEnabled: true
  };

  const displayForm = form || {
    form_id: 'sample',
    name: 'Sample Contact Form',
    fields: [
      { field_id: '1', type: 'text' as const, label: 'Full Name', placeholder: 'Enter your full name', required: true, order: 1 },
      { field_id: '2', type: 'email' as const, label: 'Email Address', placeholder: 'Enter your email', required: true, order: 2 },
      { field_id: '3', type: 'textarea' as const, label: 'Message', placeholder: 'Enter your message', required: true, order: 3 }
    ]
  };

  // Always show preview for page settings, even if disabled
  // We'll indicate the status in the preview banner

  // Render form preview
  const {
    title = 'Contact Form',
    description = 'Get in touch with us',
    layout = 'centered',
    backgroundColor = '#ffffff',
    textColor = '#000000',
    buttonColor = '#3b82f6',
    buttonText = 'Submit',
    imageUrl
  } = displayConfig;

  const renderFormFields = () => {
    if (!displayForm || !displayForm.fields) {
      return (
        <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
          <p>No form fields configured</p>
        </div>
      );
    }

    const sortedFields = displayForm.fields.sort((a, b) => a.order - b.order).slice(0, 3); // Show only first 3 fields for preview

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {sortedFields.map((field) => (
          <div key={field.field_id}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: textColor,
              marginBottom: '4px'
            }}>
              {field.label} {field.required && <span style={{ color: '#ef4444' }}>*</span>}
            </label>
            {field.type === 'textarea' ? (
              <textarea
                placeholder={field.placeholder || ''}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  minHeight: '80px',
                  resize: 'vertical'
                }}
                disabled
              />
            ) : field.type === 'select' ? (
              <select
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
                disabled
              >
                <option>{field.placeholder || 'Select an option'}</option>
                {field.options?.map((option, idx) => (
                  <option key={idx} value={option}>{option}</option>
                ))}
              </select>
            ) : (
              <input
                type={field.type}
                placeholder={field.placeholder || ''}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
                disabled
              />
            )}
          </div>
        ))}
        
        {displayForm.fields.length > 3 && (
          <div style={{ 
            padding: '8px', 
            textAlign: 'center', 
            fontSize: '12px', 
            color: '#6b7280',
            fontStyle: 'italic'
          }}>
            ... and {displayForm.fields.length - 3} more fields
          </div>
        )}

        <button
          style={{
            backgroundColor: buttonColor,
            color: '#ffffff',
            padding: '12px 24px',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'not-allowed',
            opacity: 0.7
          }}
          disabled
        >
          {buttonText}
        </button>
      </div>
    );
  };

  const containerStyle = {
    backgroundColor,
    color: textColor,
    padding: '40px 20px',
    borderRadius: '8px'
  };

  // Add preview indicator if using sample data or if disabled
  const isUsingSampleData = !config || !form;
  const isDisabled = config && !config.isEnabled;

  // Render based on layout
  if (layout === 'split' && imageUrl) {
    return (
      <div style={containerStyle}>
        {(isUsingSampleData || isDisabled) && (
          <div style={{
            textAlign: 'center',
            marginBottom: '20px',
            padding: '8px',
            backgroundColor: isDisabled ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)',
            borderRadius: '4px',
            fontSize: '12px',
            color: isDisabled ? '#ef4444' : '#3b82f6'
          }}>
            {isDisabled ? '📝 Form Display (Disabled - Enable in settings to show to customers)' : '📝 Sample Form Preview (Configure form settings to see actual form)'}
          </div>
        )}
        <div style={{ display: 'flex', gap: '40px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: '1', minWidth: '300px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px', color: textColor }}>{title}</h2>
            <p style={{ fontSize: '16px', marginBottom: '24px', color: textColor, opacity: 0.8 }}>{description}</p>
            {renderFormFields()}
          </div>
          <div style={{ flex: '1', minWidth: '300px', position: 'relative', height: '300px' }}>
            <Image
              src={imageUrl}
              alt="Form image"
              fill
              style={{
                objectFit: 'cover',
                borderRadius: '8px'
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  // Default centered layout
  return (
    <div style={containerStyle}>
      {(isUsingSampleData || isDisabled) && (
        <div style={{
          textAlign: 'center',
          marginBottom: '20px',
          padding: '8px',
          backgroundColor: isDisabled ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)',
          borderRadius: '4px',
          fontSize: '12px',
          color: isDisabled ? '#ef4444' : '#3b82f6'
        }}>
          {isDisabled ? '📝 Form Display (Disabled - Enable in settings to show to customers)' : '📝 Sample Form Preview (Configure form settings to see actual form)'}
        </div>
      )}
      <div style={{ maxWidth: '500px', margin: '0 auto', textAlign: 'center' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px', color: textColor }}>{title}</h2>
        <p style={{ fontSize: '16px', marginBottom: '24px', color: textColor, opacity: 0.8 }}>{description}</p>
        <div style={{ textAlign: 'left' }}>
          {renderFormFields()}
        </div>
      </div>
    </div>
  );
}
