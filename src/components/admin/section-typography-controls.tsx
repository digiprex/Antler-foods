'use client';

import type { SectionStyleConfig } from '@/types/section-style.types';

const FONT_FAMILY_OPTIONS = [
  { value: 'Inter, system-ui, sans-serif', label: 'Inter (Default)' },
  { value: 'Poppins, sans-serif', label: 'Poppins' },
  { value: 'Montserrat, sans-serif', label: 'Montserrat' },
  { value: 'Open Sans, sans-serif', label: 'Open Sans' },
  { value: 'Roboto, sans-serif', label: 'Roboto' },
  { value: 'Lato, sans-serif', label: 'Lato' },
  { value: 'Playfair Display, serif', label: 'Playfair Display' },
];

const FONT_SIZE_OPTIONS = [
  { value: '0.875rem', label: 'Small (14px)' },
  { value: '1rem', label: 'Base (16px)' },
  { value: '1.125rem', label: 'Medium (18px)' },
  { value: '1.25rem', label: 'Large (20px)' },
  { value: '1.5rem', label: 'XL (24px)' },
  { value: '1.875rem', label: '2XL (30px)' },
  { value: '2.25rem', label: '3XL (36px)' },
];

const FONT_WEIGHT_OPTIONS = [
  { value: 300, label: 'Light (300)' },
  { value: 400, label: 'Normal (400)' },
  { value: 500, label: 'Medium (500)' },
  { value: 600, label: 'Semi Bold (600)' },
  { value: 700, label: 'Bold (700)' },
  { value: 800, label: 'Extra Bold (800)' },
];

interface SectionTypographyControlsProps {
  value: SectionStyleConfig;
  onChange: (updates: Partial<SectionStyleConfig>) => void;
}

function TypoGroup({
  title,
  prefix,
  value,
  onChange,
  disabled,
}: {
  title: string;
  prefix: 'title' | 'subtitle' | 'body';
  value: SectionStyleConfig;
  onChange: (updates: Partial<SectionStyleConfig>) => void;
  disabled: boolean;
}) {
  const familyKey = `${prefix}FontFamily` as const;
  const sizeKey = `${prefix}FontSize` as const;
  const weightKey = `${prefix}FontWeight` as const;
  const colorKey = `${prefix}Color` as const;

  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 12 }}>
      <h4 style={{ margin: '0 0 10px 0', fontSize: 15, fontWeight: 700 }}>{title}</h4>
      <div style={{ display: 'grid', gap: 10 }}>
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
            Font Family
          </label>
          <select
            value={(value[familyKey] as string) || 'Inter, system-ui, sans-serif'}
            onChange={(e) => onChange({ [familyKey]: e.target.value })}
            disabled={disabled}
            style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8 }}
          >
            {FONT_FAMILY_OPTIONS.map((font) => (
              <option key={`${prefix}-font-${font.value}`} value={font.value}>
                {font.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
            Font Size
          </label>
          <select
            value={(value[sizeKey] as string) || '1rem'}
            onChange={(e) => onChange({ [sizeKey]: e.target.value })}
            disabled={disabled}
            style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8 }}
          >
            {FONT_SIZE_OPTIONS.map((size) => (
              <option key={`${prefix}-size-${size.value}`} value={size.value}>
                {size.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
            Font Weight
          </label>
          <select
            value={(value[weightKey] as number) || 400}
            onChange={(e) => onChange({ [weightKey]: Number(e.target.value) })}
            disabled={disabled}
            style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8 }}
          >
            {FONT_WEIGHT_OPTIONS.map((weight) => (
              <option key={`${prefix}-weight-${weight.value}`} value={weight.value}>
                {weight.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
            Color
          </label>
          <input
            type="color"
            value={(value[colorKey] as string) || '#111827'}
            onChange={(e) => onChange({ [colorKey]: e.target.value })}
            disabled={disabled}
            style={{ width: 64, height: 44, padding: 0, border: '1px solid #d1d5db', borderRadius: 8, cursor: 'pointer' }}
          />
        </div>
      </div>
    </div>
  );
}

export function SectionTypographyControls({
  value,
  onChange,
}: SectionTypographyControlsProps) {
  const isCustom = value.is_custom === true;

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 12 }}>
        <h4 style={{ margin: '0 0 10px 0', fontSize: 15, fontWeight: 700 }}>
          Typography Source
        </h4>
        <div style={{ display: 'grid', gap: 10 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
              Use Section Custom Typography
            </label>
            <select
              value={isCustom ? 'true' : 'false'}
              onChange={(e) => onChange({ is_custom: e.target.value === 'true' })}
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8 }}
            >
              <option value="false">No - Use Global Typography</option>
              <option value="true">Yes - Use Custom Typography</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
              Button Style Source
            </label>
            <select
              value={value.buttonStyleVariant || 'primary'}
              onChange={(e) =>
                onChange({
                  buttonStyleVariant:
                    e.target.value === 'secondary' ? 'secondary' : 'primary',
                })
              }
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8 }}
            >
              <option value="primary">Global Primary Button</option>
              <option value="secondary">Global Secondary Button</option>
            </select>
          </div>
        </div>
      </div>

      <TypoGroup
        title="Title Typography"
        prefix="title"
        value={value}
        onChange={onChange}
        disabled={!isCustom}
      />
      <TypoGroup
        title="Subheading Typography"
        prefix="subtitle"
        value={value}
        onChange={onChange}
        disabled={!isCustom}
      />
      <TypoGroup
        title="Paragraph Typography"
        prefix="body"
        value={value}
        onChange={onChange}
        disabled={!isCustom}
      />
    </div>
  );
}
