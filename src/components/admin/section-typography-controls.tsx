'use client';

import type { SectionStyleConfig } from '@/types/section-style.types';

const FONT_FAMILY_OPTIONS = [
  { value: 'Inter, system-ui, sans-serif', label: 'Inter (Default)' },

  // Sans-serif fonts
  { value: 'Roboto, sans-serif', label: 'Roboto' },
  { value: 'Open Sans, sans-serif', label: 'Open Sans' },
  { value: 'Lato, sans-serif', label: 'Lato' },
  { value: 'Montserrat, sans-serif', label: 'Montserrat' },
  { value: 'Poppins, sans-serif', label: 'Poppins' },
  { value: 'Source Sans Pro, sans-serif', label: 'Source Sans Pro' },
  { value: 'Nunito, sans-serif', label: 'Nunito' },
  { value: 'Raleway, sans-serif', label: 'Raleway' },
  { value: 'Ubuntu, sans-serif', label: 'Ubuntu' },
  { value: 'Noto Sans, sans-serif', label: 'Noto Sans' },
  { value: 'Fira Sans, sans-serif', label: 'Fira Sans' },
  { value: 'Work Sans, sans-serif', label: 'Work Sans' },
  { value: 'Barlow, sans-serif', label: 'Barlow' },
  { value: 'Manrope, sans-serif', label: 'Manrope' },
  { value: 'DM Sans, sans-serif', label: 'DM Sans' },
  { value: 'Plus Jakarta Sans, sans-serif', label: 'Plus Jakarta Sans' },

  // Serif fonts
  { value: 'Playfair Display, serif', label: 'Playfair Display' },
  { value: 'Merriweather, serif', label: 'Merriweather' },
  { value: 'Lora, serif', label: 'Lora' },
  { value: 'Source Serif Pro, serif', label: 'Source Serif Pro' },
  { value: 'Crimson Text, serif', label: 'Crimson Text' },
  { value: 'Libre Baskerville, serif', label: 'Libre Baskerville' },
  { value: 'Cormorant Garamond, serif', label: 'Cormorant Garamond' },
  { value: 'EB Garamond, serif', label: 'EB Garamond' },
  { value: 'Vollkorn, serif', label: 'Vollkorn' },
  { value: 'Bitter, serif', label: 'Bitter' },

  // Display fonts
  { value: 'Oswald, sans-serif', label: 'Oswald' },
  { value: 'Bebas Neue, cursive', label: 'Bebas Neue' },
  { value: 'Anton, sans-serif', label: 'Anton' },
  { value: 'Righteous, cursive', label: 'Righteous' },
  { value: 'Fredoka One, cursive', label: 'Fredoka One' },
  { value: 'Comfortaa, cursive', label: 'Comfortaa' },
  { value: 'Quicksand, sans-serif', label: 'Quicksand' },
  { value: 'Pacifico, cursive', label: 'Pacifico' },
  { value: 'Dancing Script, cursive', label: 'Dancing Script' },
  { value: 'Lobster, cursive', label: 'Lobster' },

  // Monospace fonts
  { value: 'JetBrains Mono, monospace', label: 'JetBrains Mono' },
  { value: 'Fira Code, monospace', label: 'Fira Code' },
  { value: 'Source Code Pro, monospace', label: 'Source Code Pro' },
  { value: 'Space Mono, monospace', label: 'Space Mono' },

  // System fonts
  { value: 'Arial, sans-serif', label: 'Arial' },
  { value: 'Helvetica, sans-serif', label: 'Helvetica' },
  { value: 'Georgia, serif', label: 'Georgia' },
  { value: 'Times New Roman, serif', label: 'Times New Roman' },
  { value: 'Verdana, sans-serif', label: 'Verdana' },
  { value: 'Trebuchet MS, sans-serif', label: 'Trebuchet MS' },
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
              <option key={`${prefix}-font-${font.value}`} value={font.value} style={{ fontFamily: font.value }}>
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
