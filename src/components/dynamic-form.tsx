'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
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
  accentColor?: string;
  mobileAccentColor?: string;
  buttonText?: string;
  imageUrl?: string;
  showImage?: boolean;
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

function normalizeFormLayout(layout: string | undefined) {
  switch (layout) {
    case 'split-right':
    case 'split-left':
    case 'background-image':
    case 'image-top':
      return layout;
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
  const globalStyleEndpoint = restaurantId
    ? `/api/global-style-config?restaurant_id=${encodeURIComponent(restaurantId)}`
    : '/api/global-style-config';
  const { config: globalStyles } = useGlobalStyleConfig({
    apiEndpoint: globalStyleEndpoint,
    fetchOnMount: Boolean(restaurantId),
  });

  useEffect(() => {
    if (previewForm) {
      setForm(previewForm);
    }
  }, [previewForm]);

  useEffect(() => {
    if (configData) {
      setConfig({
        ...DEFAULT_FORM_CONFIG,
        ...configData,
      });
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
          if (formPayload.success && formPayload.data?.length > 0) {
            setForm(formPayload.data[0]);
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

  const backgroundColor = resolveViewportColor(
    displayConfig?.backgroundColor,
    displayConfig?.mobileBackgroundColor,
    viewport,
    '#f8fafc',
  );
  const textColor = resolveViewportColor(
    displayConfig?.textColor,
    displayConfig?.mobileTextColor,
    viewport,
    '#0f172a',
  );
  const accentColor = resolveViewportColor(
    displayConfig?.accentColor,
    displayConfig?.mobileAccentColor,
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
    backgroundColor: accentColor,
    borderColor: accentColor,
    color: globalButtonStyle.color || '#ffffff',
    borderRadius: globalButtonStyle.borderRadius || '999px',
    border: globalButtonStyle.border || `1px solid ${accentColor}`,
  };

  if (loading && showLoading) {
    return (
      <div className="flex min-h-[220px] items-center justify-center rounded-3xl border border-slate-200 bg-white p-6 text-sm font-medium text-slate-600 shadow-sm">
        Loading form...
      </div>
    );
  }

  if (!displayConfig || (isDisabled && !isPreview)) {
    return null;
  }

  if (!isPreview && (!displayConfig.form_id || !form)) {
    return null;
  }

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
          <div className="absolute bottom-8 left-8 right-8 rounded-[28px] border border-white/70 bg-white/82 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.15)] backdrop-blur">
            <div className="mb-3 flex items-center gap-3">
              <span className="inline-flex h-3 w-3 rounded-full" style={{ backgroundColor: accentColor }} />
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Editorial panel
              </span>
            </div>
            <h3 className="text-lg font-semibold text-slate-900">
              Pair rich storytelling with a conversion-ready form surface.
            </h3>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              The split layouts keep the form readable while giving the section room for imagery, brand cues, or trust-building copy.
            </p>
          </div>
        </div>
      )}
    </div>
  );

  const headingBlock = (
    <div style={{ textAlign: layoutConfig.sectionTextAlign }}>
      {displayConfig.title ? (
        <h2 className="text-balance" style={{ ...titleStyle, color: textColor }}>
          {displayConfig.title}
        </h2>
      ) : null}
      {displayConfig.subtitle ? (
        <p className="mt-3" style={{ ...subtitleStyle, color: accentColor }}>
          {displayConfig.subtitle}
        </p>
      ) : null}
      {displayConfig.description ? (
        <p className="mt-4 max-w-2xl text-sm leading-7" style={{ ...bodyStyle, color: textColor, opacity: 0.78 }}>
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
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: accentColor }}>
            {displayForm.name}
          </p>
          <h3 className="mt-2 text-lg font-semibold text-slate-900">
            {isPreview ? 'Preview submission flow' : 'Tell us what you need'}
          </h3>
        </div>
        <div
          className="inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]"
          style={{ borderColor: `${accentColor}30`, color: accentColor, backgroundColor: `${accentColor}10` }}
        >
          {fieldsToRender.length} fields
        </div>
      </div>

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
            ? `linear-gradient(135deg, rgba(15,23,42,0.66), rgba(15,23,42,0.34)), url(${displayConfig.imageUrl}) center / cover`
            : `linear-gradient(135deg, ${accentColor} 0%, rgba(15,23,42,0.94) 100%)`,
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
      <span className="mb-2 block text-sm font-medium" style={{ color: textColor }}>
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
