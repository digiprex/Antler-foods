'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import formLayoutsData from '@/data/form-layouts.json';
import { useGlobalStyleConfig } from '@/hooks/use-global-style-config';
import { useSectionReveal } from '@/hooks/use-section-reveal';
import { useSectionViewport } from '@/hooks/use-section-viewport';
import {
  getButtonInlineStyle,
  getSectionContainerStyles,
  getSectionTypographyStyles,
  getSelectedGlobalButtonStyle,
  type SectionViewport,
} from '@/lib/section-style';
import type { SectionStyleConfig } from '@/types/section-style.types';

interface FormField {
  field_id: string;
  type: 'text' | 'email' | 'phone' | 'textarea' | 'select' | 'checkbox' | 'radio';
  label: string;
  placeholder?: string;
  required: boolean;
  order: number;
  options?: string[];
}

interface FormDefinition {
  form_id: string;
  name: string;
  fields: FormField[];
}

interface FormConfig extends SectionStyleConfig {
  isEnabled?: boolean;
  form_id?: string;
  title?: string;
  subtitle?: string;
  description?: string;
  layout?: string;
  backgroundColor?: string;
  mobileBackgroundColor?: string;
  textColor?: string;
  mobileTextColor?: string;
  titleColor?: string;
  mobileTitleColor?: string;
  subtitleColor?: string;
  mobileSubtitleColor?: string;
  bodyColor?: string;
  mobileBodyColor?: string;
  accentColor?: string;
  mobileAccentColor?: string;
  primaryButtonColor?: string;
  mobilePrimaryButtonColor?: string;
  buttonText?: string;
  imageUrl?: string;
  showImage?: boolean;
  restaurant_id?: string;
}

interface DynamicFormProps {
  restaurantId?: string;
  pageId?: string;
  templateId?: string;
  showLoading?: boolean;
  configData?: Partial<FormConfig>;
  isPreview?: boolean;
  previewViewport?: SectionViewport;
  previewForm?: FormDefinition | null;
}

const SAMPLE_FORM: FormDefinition = {
  form_id: 'sample-form',
  name: 'Reservations',
  fields: [
    {
      field_id: 'name',
      type: 'text',
      label: 'Full Name',
      placeholder: 'Jordan Lee',
      required: true,
      order: 0,
    },
    {
      field_id: 'email',
      type: 'email',
      label: 'Email Address',
      placeholder: 'jordan@example.com',
      required: true,
      order: 1,
    },
    {
      field_id: 'date',
      type: 'text',
      label: 'Preferred Date',
      placeholder: 'Friday, 7:30 PM',
      required: true,
      order: 2,
    },
    {
      field_id: 'notes',
      type: 'textarea',
      label: 'Special Notes',
      placeholder: 'Let us know about dietary requests or celebrations.',
      required: false,
      order: 3,
    },
  ],
};

const DEFAULT_FORM_CONFIG: FormConfig = {
  isEnabled: true,
  layout: 'centered',
  title: 'Reserve your table',
  subtitle: 'Make your next visit seamless',
  description:
    'Choose a layout that balances editorial storytelling with a fast, confident submission flow.',
  backgroundColor: '#f8fafc',
  mobileBackgroundColor: undefined,
  textColor: '#0f172a',
  mobileTextColor: undefined,
  accentColor: '#7c3aed',
  mobileAccentColor: undefined,
  buttonText: 'Submit Request',
  showImage: true,
};

function resolveViewportColor(
  desktopColor: string | undefined,
  mobileColor: string | undefined,
  viewport: SectionViewport,
  fallback: string,
) {
  if (viewport === 'mobile') {
    return mobileColor || desktopColor || fallback;
  }

  return desktopColor || fallback;
}

// Get available form layouts from JSON
const getFormLayouts = () => {
  return formLayoutsData.layouts;
};

// Get valid layout IDs from JSON
const getValidFormLayoutIds = () => {
  return formLayoutsData.layouts.map(layout => layout.id);
};

function normalizeFormLayout(layout: string | undefined) {
  const validLayouts = getValidFormLayoutIds();
  
  // If layout is valid, return it
  if (layout && validLayouts.includes(layout)) {
    return layout;
  }
  
  // Legacy layout mappings for backward compatibility
  switch (layout) {
    case 'card':
    case 'two-column':
    case 'minimal':
      return 'centered';
    default:
      return 'centered';
  }
}

export default function DynamicForm({
  restaurantId,
  pageId,
  templateId,
  showLoading = true,
  configData,
  isPreview = false,
  previewViewport,
  previewForm,
}: DynamicFormProps) {
  const [config, setConfig] = useState<FormConfig | null>(
    configData ? { ...DEFAULT_FORM_CONFIG, ...configData } : null,
  );
  const [form, setForm] = useState<FormDefinition | null>(previewForm || null);
  const [loading, setLoading] = useState(!configData);
  const [formData, setFormData] = useState<Record<string, string | string[]>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const viewport = useSectionViewport(previewViewport);
  // Use effective restaurant ID for global styles (from prop or config)
  const effectiveRestaurantIdForStyles = restaurantId || (configData?.restaurant_id);
  const globalStyleEndpoint = effectiveRestaurantIdForStyles
    ? `/api/global-style-config?restaurant_id=${encodeURIComponent(effectiveRestaurantIdForStyles)}`
    : '/api/global-style-config';
  const { config: globalStyles } = useGlobalStyleConfig({
    apiEndpoint: globalStyleEndpoint,
    fetchOnMount: Boolean(effectiveRestaurantIdForStyles),
  });

  useEffect(() => {
    if (previewForm) {
      setForm(previewForm);
    }
  }, [previewForm]);

  useEffect(() => {
    if (configData) {
      const newConfig = {
        ...DEFAULT_FORM_CONFIG,
        ...configData,
      };
      setConfig(newConfig);
      
      // Even with configData, we still need to fetch the form definition if form_id is provided
      const effectiveRestaurantId = restaurantId || newConfig.restaurant_id;
      if (newConfig.form_id && effectiveRestaurantId) {
        console.log('[DynamicForm] 🔍 Fetching form definition:', { form_id: newConfig.form_id, effectiveRestaurantId });
        const fetchForm = async () => {
          try {
            const formUrl = `/api/forms?restaurant_id=${encodeURIComponent(effectiveRestaurantId)}&form_id=${encodeURIComponent(newConfig.form_id!)}`;
            console.log('[DynamicForm] 📡 Form API URL:', formUrl);
            
            const formResponse = await fetch(formUrl);
            console.log('[DynamicForm] 📡 Form API response status:', formResponse.status);
            
            const formPayload = await formResponse.json();
            console.log('[DynamicForm] 📡 Form API payload:', formPayload);

            // API returns single object when form_id is provided, array when listing all forms
            const formData = formPayload.success ? (Array.isArray(formPayload.data) ? formPayload.data[0] : formPayload.data) : null;

            if (formData) {
              console.log('[DynamicForm] ✅ Form definition loaded:', formData);
              setForm(formData);
            } else {
              console.log('[DynamicForm] ❌ No form data found:', formPayload);
            }
          } catch (error) {
            console.error('[DynamicForm] ❌ Error fetching form definition:', error);
          }
        };
        fetchForm();
      } else {
        console.log('[DynamicForm] ⚠️ Skipping form fetch - missing form_id or restaurantId:', {
          form_id: newConfig.form_id,
          restaurantId,
          effectiveRestaurantId: restaurantId || newConfig.restaurant_id
        });
      }
      
      setLoading(false);
      return;
    }

    const fetchConfig = async () => {
      if (!restaurantId || (!pageId && !templateId)) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        let configUrl = `/api/form-settings?restaurant_id=${encodeURIComponent(restaurantId)}`;
        if (templateId) {
          configUrl += `&template_id=${encodeURIComponent(templateId)}`;
        } else if (pageId) {
          configUrl += `&page_id=${encodeURIComponent(pageId)}`;
        }

        const configResponse = await fetch(configUrl);
        const configPayload = await configResponse.json();

        if (!configResponse.ok) {
          throw new Error(configPayload.error || 'Failed to load form settings');
        }

        const resolvedConfig = configPayload.success && configPayload.data
          ? { ...DEFAULT_FORM_CONFIG, ...configPayload.data }
          : null;
        setConfig(resolvedConfig);

        if (resolvedConfig?.form_id) {
          const formResponse = await fetch(
            `/api/forms?restaurant_id=${encodeURIComponent(restaurantId)}&form_id=${encodeURIComponent(resolvedConfig.form_id)}`,
          );
          const formPayload = await formResponse.json();

          // API returns single object when form_id is provided, array when listing all forms
          const formData = formPayload.success ? (Array.isArray(formPayload.data) ? formPayload.data[0] : formPayload.data) : null;

          if (formData) {
            setForm(formData);
          }
        }
      } catch (fetchError) {
        console.error('Error fetching form config:', fetchError);
        setConfig(null);
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, [configData, pageId, restaurantId, templateId]);

  const displayConfig = useMemo<FormConfig | null>(() => {
    if (!config) {
      return isPreview ? DEFAULT_FORM_CONFIG : null;
    }

    return config;
  }, [config, isPreview]);

  const displayForm = useMemo<FormDefinition>(() => {
    if (previewForm) {
      return previewForm;
    }

    if (form) {
      return form;
    }

    return SAMPLE_FORM;
  }, [form, previewForm]);

  // Use global styles when is_custom is false, otherwise use config colors
  const backgroundColor = displayConfig?.is_custom === false
    ? (globalStyles?.backgroundColor || '#f8fafc')
    : resolveViewportColor(
        displayConfig?.backgroundColor,
        displayConfig?.mobileBackgroundColor,
        viewport,
        '#f8fafc',
      );
  
  // Title color for headings (h2)
  const titleColor = displayConfig?.is_custom === false
    ? (globalStyles?.textColor || '#0f172a')
    : resolveViewportColor(
        displayConfig?.titleColor || displayConfig?.textColor,
        displayConfig?.mobileTitleColor || displayConfig?.mobileTextColor,
        viewport,
        '#0f172a',
      );
  
  // Subtitle color for subtitle text
  const subtitleColor = displayConfig?.is_custom === false
    ? (globalStyles?.accentColor || '#7c3aed')
    : resolveViewportColor(
        displayConfig?.subtitleColor || displayConfig?.accentColor,
        displayConfig?.mobileSubtitleColor || displayConfig?.mobileAccentColor,
        viewport,
        '#7c3aed',
      );
  
  // Body color for paragraph descriptions
  const bodyColor = displayConfig?.is_custom === false
    ? (globalStyles?.textColor || '#0f172a')
    : resolveViewportColor(
        displayConfig?.bodyColor || displayConfig?.textColor,
        displayConfig?.mobileBodyColor || displayConfig?.mobileTextColor,
        viewport,
        '#0f172a',
      );
  
  // Keep textColor for form fields and labels
  const textColor = displayConfig?.is_custom === false
    ? (globalStyles?.textColor || '#0f172a')
    : resolveViewportColor(
        displayConfig?.textColor,
        displayConfig?.mobileTextColor,
        viewport,
        '#0f172a',
      );
  
  const accentColor = displayConfig?.is_custom === false
    ? (globalStyles?.accentColor || '#7c3aed')
    : resolveViewportColor(
        displayConfig?.accentColor,
        displayConfig?.mobileAccentColor,
        viewport,
        '#7c3aed',
      );

  // Primary button color for form submit button
  const primaryButtonColor = displayConfig?.is_custom === false
    ? (globalStyles?.primaryButton?.backgroundColor || globalStyles?.accentColor || '#7c3aed')
    : resolveViewportColor(
        displayConfig?.primaryButtonColor || displayConfig?.accentColor,
        displayConfig?.mobilePrimaryButtonColor || displayConfig?.mobileAccentColor,
        viewport,
        '#7c3aed',
      );

  const layout = normalizeFormLayout(displayConfig?.layout);
  const isDisabled = displayConfig?.isEnabled === false;
  const sortedFields = [...displayForm.fields].sort((a, b) => a.order - b.order);
  const fieldsToRender = isPreview ? sortedFields.slice(0, 4) : sortedFields;

  const { titleStyle, subtitleStyle, bodyStyle } = getSectionTypographyStyles(
    displayConfig,
    globalStyles,
    viewport,
  );
  const { sectionStyle, contentStyle, surfaceStyle, layoutConfig } =
    getSectionContainerStyles(displayConfig, viewport);
  const { ref, style: revealStyle } = useSectionReveal({
    enabled: displayConfig?.enableScrollReveal,
    animation: displayConfig?.scrollRevealAnimation,
    isPreview,
  });

  const globalButtonStyle = getButtonInlineStyle(
    getSelectedGlobalButtonStyle(displayConfig, globalStyles),
  );
  const submitButtonStyle: CSSProperties = {
    ...globalButtonStyle,
    backgroundColor: primaryButtonColor,
    borderColor: primaryButtonColor,
    color: globalButtonStyle.color || '#ffffff',
    borderRadius: globalButtonStyle.borderRadius || '999px',
    border: globalButtonStyle.border || `1px solid ${primaryButtonColor}`,
  };

  if (loading && showLoading) {
    console.log('[DynamicForm] 🔄 Loading form...', { restaurantId, pageId, templateId });
    return (
      <div className="flex min-h-[220px] items-center justify-center rounded-3xl border border-slate-200 bg-white p-6 text-sm font-medium text-slate-600 shadow-sm">
        Loading form...
      </div>
    );
  }

  if (!displayConfig || (isDisabled && !isPreview)) {
    console.log('[DynamicForm] ❌ Form not displayed - config or disabled:', {
      displayConfig: !!displayConfig,
      isDisabled,
      isPreview,
      config: displayConfig
    });
    return null;
  }

  if (!isPreview && (!displayConfig.form_id || !form)) {
    console.log('[DynamicForm] ❌ Form not displayed - missing form_id or form:', {
      isPreview,
      form_id: displayConfig.form_id,
      form: !!form,
      displayConfig
    });
    
    // If no form_id is configured, show a message to configure the form
    if (!displayConfig.form_id) {
      return (
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-center">
          <div className="text-4xl mb-4">📝</div>
          <h3 className="text-lg font-semibold text-amber-800 mb-2">Form Not Configured</h3>
          <p className="text-sm text-amber-700">
            This form section needs to be configured with a form. Please go to the admin panel and select a form for this section.
          </p>
        </div>
      );
    }
    
    return null;
  }

  console.log('[DynamicForm] ✅ Rendering form:', {
    layout: normalizeFormLayout(displayConfig?.layout),
    form_id: displayConfig.form_id,
    isEnabled: displayConfig.isEnabled,
    form: !!form
  });

  const validateForm = () => {
    const errors: Record<string, string> = {};

    sortedFields.forEach((field) => {
      const value = formData[field.field_id];
      if (field.required) {
        if (field.type === 'checkbox') {
          if (!Array.isArray(value) || value.length === 0) {
            errors[field.field_id] = `${field.label} is required`;
          }
        } else if (!value || value.toString().trim() === '') {
          errors[field.field_id] = `${field.label} is required`;
        }
      }

      if (field.type === 'email' && value && typeof value === 'string') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          errors[field.field_id] = 'Please enter a valid email address';
        }
      }
    });

    return errors;
  };

  const handleInputChange = (fieldId: string, value: string | string[]) => {
    setFormData((current) => ({
      ...current,
      [fieldId]: value,
    }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isPreview) {
      return;
    }

    if (!restaurantId) {
      setSubmitError('Restaurant ID is required for form submission.');
      return;
    }

    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setSubmitError('Please fill in all required fields correctly.');
      return;
    }

    const emailField = sortedFields.find((field) => field.type === 'email');
    const emailValue = emailField ? formData[emailField.field_id] : '';

    if (!emailValue || typeof emailValue !== 'string') {
      setSubmitError('A valid email field is required.');
      return;
    }

    const submissionPayload: Record<string, string | string[]> = {};
    sortedFields.forEach((field) => {
      const value = formData[field.field_id];
      if (value !== undefined && value !== '') {
        submissionPayload[field.label] = value;
      }
    });

    try {
      setSubmitting(true);
      setSubmitError(null);

      const response = await fetch('/api/form-submissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          form_id: displayForm.form_id,
          form_title: displayConfig.title || displayForm.name,
          restaurant_id: restaurantId,
          email: emailValue,
          data: submissionPayload,
        }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to submit form');
      }

      setSubmitSuccess(true);
      setFormData({});
    } catch (submitFailure) {
      console.error('Error submitting form:', submitFailure);
      setSubmitError(
        submitFailure instanceof Error
          ? submitFailure.message
          : 'Failed to submit form',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const mediaPanel = (
    <div
      className="relative h-full min-h-[240px] overflow-hidden border border-white/40"
      style={{
        ...surfaceStyle,
        background:
          displayConfig.imageUrl && displayConfig.showImage !== false
            ? undefined
            : `linear-gradient(160deg, ${accentColor}22 0%, ${accentColor}08 42%, rgba(15,23,42,0.04) 100%)`,
      }}
    >
      {displayConfig.imageUrl && displayConfig.showImage !== false ? (
        <img
          src={displayConfig.imageUrl}
          alt={displayConfig.title || 'Form media'}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="absolute inset-0">
          <div className="absolute inset-x-6 top-6 rounded-full border border-white/60 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700 backdrop-blur">
            Guest experience
          </div>
        </div>
      )}
    </div>
  );

  const headingBlock = (
    <div style={{ textAlign: layoutConfig.sectionTextAlign }}>
      {displayConfig.title ? (
        <h2 className="text-balance" style={{ ...titleStyle, color: titleColor }}>
          {displayConfig.title}
        </h2>
      ) : null}
      {displayConfig.subtitle ? (
        <p className="mt-3" style={{ ...subtitleStyle, color: subtitleColor }}>
          {displayConfig.subtitle}
        </p>
      ) : null}
      {displayConfig.description ? (
        <p className="mt-4 max-w-2xl text-sm leading-7 mx-auto text-center" style={{ ...bodyStyle, color: bodyColor, opacity: 0.78 }}>
          {displayConfig.description}
        </p>
      ) : null}
    </div>
  );

  const formCard = (
    <div
      className="border border-white/60 p-6 sm:p-7"
      style={{
        ...surfaceStyle,
        background: 'linear-gradient(180deg, rgba(255,255,255,0.96), rgba(255,255,255,0.9))',
      }}
    >

      {submitSuccess && !isPreview ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          Your submission has been sent successfully.
        </div>
      ) : null}
      {submitError ? (
        <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {submitError}
        </div>
      ) : null}

      <form className="space-y-4" onSubmit={handleSubmit}>
        {fieldsToRender.map((field) => (
          <FieldRenderer
            key={field.field_id}
            field={field}
            value={formData[field.field_id]}
            onChange={(value) => handleInputChange(field.field_id, value)}
            isPreview={isPreview}
            accentColor={accentColor}
            textColor={textColor}
          />
        ))}

        <button
          type="submit"
          disabled={submitting || isPreview}
          className="inline-flex w-full items-center justify-center rounded-full px-5 py-3 text-sm font-semibold shadow-lg transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
          style={submitButtonStyle}
        >
          {isPreview ? displayConfig.buttonText || 'Submit Request' : submitting ? 'Submitting...' : displayConfig.buttonText || 'Submit Request'}
        </button>
      </form>
    </div>
  );

  const centeredLayout = (
    <div className="mx-auto max-w-3xl space-y-8">
      {headingBlock}
      {formCard}
    </div>
  );

  const splitContent = (
    <div className={`grid gap-6 ${viewport === 'mobile' ? 'grid-cols-1' : 'lg:grid-cols-[1.05fr_0.95fr]'}`}>
      {layout === 'split-left' ? (
        <>
          {mediaPanel}
          <div className="space-y-8">
            {headingBlock}
            {formCard}
          </div>
        </>
      ) : (
        <>
          <div className="space-y-8">
            {headingBlock}
            {formCard}
          </div>
          {mediaPanel}
        </>
      )}
    </div>
  );

  const imageTopLayout = (
    <div className="space-y-8">
      {mediaPanel}
      <div className="mx-auto max-w-3xl space-y-8">
        {headingBlock}
        {formCard}
      </div>
    </div>
  );

  const backgroundImageLayout = (
    <div
      className="relative overflow-hidden border border-white/30 p-6 sm:p-8"
      style={{
        ...surfaceStyle,
        background:
          displayConfig.imageUrl && displayConfig.showImage !== false
            ? `url(${displayConfig.imageUrl}) center / cover`
            : `${accentColor}`,
      }}
    >
      <div className="mx-auto max-w-3xl rounded-[28px] bg-white/92 p-6 shadow-[0_32px_90px_rgba(15,23,42,0.24)] backdrop-blur sm:p-8">
        <div className="space-y-8">
          {headingBlock}
          {formCard}
        </div>
      </div>
    </div>
  );

  return (
    <section
      ref={ref}
      style={{
        ...sectionStyle,
        ...revealStyle,
        background: `radial-gradient(circle at top left, ${accentColor}16, transparent 34%), ${backgroundColor}`,
      }}
    >
      <div style={contentStyle}>
        {isPreview && isDisabled ? (
          <div className="rounded-[28px] border border-dashed border-slate-300 bg-white/90 px-6 py-12 text-center shadow-inner">
            <p className="text-sm font-semibold text-slate-700">Form display is currently disabled</p>
            <p className="mt-2 text-sm text-slate-500">
              Enable the section to preview the selected form layout.
            </p>
          </div>
        ) : layout === 'split-right' || layout === 'split-left' ? (
          splitContent
        ) : layout === 'image-top' ? (
          imageTopLayout
        ) : layout === 'background-image' ? (
          backgroundImageLayout
        ) : (
          centeredLayout
        )}
      </div>
    </section>
  );
}

function FieldRenderer({
  field,
  value,
  onChange,
  isPreview,
  accentColor,
  textColor,
}: {
  field: FormField;
  value: string | string[] | undefined;
  onChange: (value: string | string[]) => void;
  isPreview: boolean;
  accentColor: string;
  textColor: string;
}) {
  const baseInputClassName =
    'w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition-colors focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20';

  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-left" style={{ color: textColor }}>
        {field.label}
        {field.required ? <span style={{ color: accentColor }}> *</span> : null}
      </span>

      {field.type === 'textarea' ? (
        <textarea
          className={baseInputClassName}
          rows={4}
          value={typeof value === 'string' ? value : ''}
          onChange={(event) => onChange(event.target.value)}
          disabled={isPreview}
          placeholder={field.placeholder || ''}
        />
      ) : field.type === 'select' ? (
        <select
          className={baseInputClassName}
          value={typeof value === 'string' ? value : ''}
          onChange={(event) => onChange(event.target.value)}
          disabled={isPreview}
        >
          <option value="">Select an option</option>
          {(field.options || []).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : field.type === 'checkbox' ? (
        <div className="grid gap-2">
          {(field.options || ['Yes']).map((option) => {
            const values = Array.isArray(value) ? value : [];
            const checked = values.includes(option);
            return (
              <label
                key={option}
                className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-sm text-slate-700 shadow-sm"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={isPreview}
                  onChange={(event) => {
                    if (event.target.checked) {
                      onChange([...values, option]);
                    } else {
                      onChange(values.filter((item) => item !== option));
                    }
                  }}
                />
                {option}
              </label>
            );
          })}
        </div>
      ) : field.type === 'radio' ? (
        <div className="grid gap-2">
          {(field.options || ['Option']).map((option) => (
            <label
              key={option}
              className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-sm text-slate-700 shadow-sm"
            >
              <input
                type="radio"
                checked={value === option}
                disabled={isPreview}
                onChange={() => onChange(option)}
              />
              {option}
            </label>
          ))}
        </div>
      ) : (
        <input
          type={field.type === 'phone' ? 'tel' : field.type}
          className={baseInputClassName}
          value={typeof value === 'string' ? value : ''}
          onChange={(event) => onChange(event.target.value)}
          disabled={isPreview}
          placeholder={field.placeholder || ''}
        />
      )}
    </label>
  );
}
