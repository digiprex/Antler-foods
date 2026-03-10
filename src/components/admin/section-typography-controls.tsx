'use client';

import type { SectionStyleConfig } from '@/types/section-style.types';
type ResponsiveViewport = 'desktop' | 'mobile';
type TypographyPrefix = 'title' | 'subtitle' | 'body';

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

const CUSTOM_FONT_SIZE_VALUE = '__custom__';

const FONT_WEIGHT_OPTIONS = [
  { value: 300, label: 'Light (300)' },
  { value: 400, label: 'Normal (400)' },
  { value: 500, label: 'Medium (500)' },
  { value: 600, label: 'Semi Bold (600)' },
  { value: 700, label: 'Bold (700)' },
  { value: 800, label: 'Extra Bold (800)' },
];

const FONT_STYLE_OPTIONS = [
  { value: 'normal', label: 'Normal' },
  { value: 'italic', label: 'Italic' },
] as const;

const TEXT_TRANSFORM_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'uppercase', label: 'Uppercase' },
  { value: 'capitalize', label: 'Capitalize' },
  { value: 'lowercase', label: 'Lowercase' },
] as const;

interface SectionTypographyControlsProps {
  value: SectionStyleConfig;
  onChange: (updates: Partial<SectionStyleConfig>) => void;
  showAdvancedControls?: boolean;
  viewport?: ResponsiveViewport;
}

function getTypographyKeys(prefix: TypographyPrefix, viewport: ResponsiveViewport) {
  if (viewport === 'mobile') {
    return {
      familyKey: `${prefix}MobileFontFamily` as const,
      sizeKey: `${prefix}MobileFontSize` as const,
      weightKey: `${prefix}MobileFontWeight` as const,
      styleKey: `${prefix}MobileFontStyle` as const,
      colorKey: `${prefix}MobileColor` as const,
      transformKey: `${prefix}MobileTextTransform` as const,
      lineHeightKey: `${prefix}MobileLineHeight` as const,
      letterSpacingKey: `${prefix}MobileLetterSpacing` as const,
    };
  }

  return {
    familyKey: `${prefix}FontFamily` as const,
    sizeKey: `${prefix}FontSize` as const,
    weightKey: `${prefix}FontWeight` as const,
    styleKey: `${prefix}FontStyle` as const,
    colorKey: `${prefix}Color` as const,
    transformKey: `${prefix}TextTransform` as const,
    lineHeightKey: `${prefix}LineHeight` as const,
    letterSpacingKey: `${prefix}LetterSpacing` as const,
  };
}

function TypoGroup({
  title,
  prefix,
  value,
  onChange,
  disabled,
  showAdvancedControls,
  viewport,
}: {
  title: string;
  prefix: TypographyPrefix;
  value: SectionStyleConfig;
  onChange: (updates: Partial<SectionStyleConfig>) => void;
  disabled: boolean;
  showAdvancedControls: boolean;
  viewport: ResponsiveViewport;
}) {
  const isMobile = viewport === 'mobile';
  const desktopKeys = getTypographyKeys(prefix, 'desktop');
  const activeKeys = getTypographyKeys(prefix, viewport);
  const currentFontSize = ((value[activeKeys.sizeKey] as string) ||
    (isMobile ? (value[desktopKeys.sizeKey] as string) : undefined) ||
    '1rem') as string;
  const currentFontFamily = ((value[activeKeys.familyKey] as string) ||
    (isMobile ? (value[desktopKeys.familyKey] as string) : undefined) ||
    'Inter, system-ui, sans-serif') as string;
  const currentFontWeight = ((value[activeKeys.weightKey] as number) ||
    (isMobile ? (value[desktopKeys.weightKey] as number) : undefined) ||
    400) as number;
  const currentFontStyle = ((value[activeKeys.styleKey] as string) ||
    (isMobile ? (value[desktopKeys.styleKey] as string) : undefined) ||
    'normal') as string;
  const currentColor = ((value[activeKeys.colorKey] as string) ||
    (isMobile ? (value[desktopKeys.colorKey] as string) : undefined) ||
    '#111827') as string;
  const currentTextTransform = ((value[activeKeys.transformKey] as string) ||
    (isMobile ? (value[desktopKeys.transformKey] as string) : undefined) ||
    'none') as string;
  const currentLineHeight = ((value[activeKeys.lineHeightKey] as string) ||
    (isMobile ? (value[desktopKeys.lineHeightKey] as string) : undefined) ||
    '') as string;
  const currentLetterSpacing = ((value[activeKeys.letterSpacingKey] as string) ||
    (isMobile ? (value[desktopKeys.letterSpacingKey] as string) : undefined) ||
    '') as string;
  const selectedFontSizeOption = FONT_SIZE_OPTIONS.some(
    (size) => size.value === currentFontSize,
  )
    ? currentFontSize
    : CUSTOM_FONT_SIZE_VALUE;
  const clearMobileOverrides = () => {
    if (!isMobile) {
      return;
    }

    onChange({
      [activeKeys.familyKey]: undefined,
      [activeKeys.sizeKey]: undefined,
      [activeKeys.weightKey]: undefined,
      [activeKeys.styleKey]: undefined,
      [activeKeys.colorKey]: undefined,
      [activeKeys.transformKey]: undefined,
      [activeKeys.lineHeightKey]: undefined,
      [activeKeys.letterSpacingKey]: undefined,
    });
  };

  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 12 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 10,
        }}
      >
        <div>
          <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{title}</h4>
          {isMobile ? (
            <p style={{ margin: '4px 0 0 0', fontSize: 12, color: '#6b7280' }}>
              Mobile overrides for small screens.
            </p>
          ) : null}
        </div>
        {isMobile ? (
          <button
            type="button"
            onClick={clearMobileOverrides}
            disabled={disabled}
            style={{
              border: '1px solid #d1d5db',
              borderRadius: 8,
              background: '#fff',
              padding: '8px 12px',
              fontSize: 12,
              fontWeight: 600,
              color: '#374151',
              cursor: disabled ? 'not-allowed' : 'pointer',
              opacity: disabled ? 0.6 : 1,
            }}
          >
            Use Desktop Settings
          </button>
        ) : null}
      </div>
      <div style={{ display: 'grid', gap: 10 }}>
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
            Font Family
          </label>
          <select
            value={currentFontFamily}
            onChange={(e) => onChange({ [activeKeys.familyKey]: e.target.value })}
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
            Font Size Preset
          </label>
          <select
            value={selectedFontSizeOption}
            onChange={(e) => {
              if (e.target.value !== CUSTOM_FONT_SIZE_VALUE) {
                onChange({ [activeKeys.sizeKey]: e.target.value });
              }
            }}
            disabled={disabled}
            style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8 }}
          >
            {FONT_SIZE_OPTIONS.map((size) => (
              <option key={`${prefix}-size-${size.value}`} value={size.value}>
                {size.label}
              </option>
            ))}
            <option value={CUSTOM_FONT_SIZE_VALUE}>Custom Value</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
            Custom Font Size
          </label>
          <input
            type="text"
            value={currentFontSize}
            onChange={(e) =>
              onChange({ [activeKeys.sizeKey]: e.target.value || undefined })
            }
            disabled={disabled}
            placeholder={
              isMobile
                ? 'Uses desktop value until you enter a mobile override'
                : '42px, 3rem, clamp(2.5rem, 5vw, 4rem)'
            }
            style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8 }}
          />
          <p style={{ margin: '6px 0 0 0', fontSize: 12, color: '#6b7280' }}>
            {isMobile
              ? 'Leave blank only by clicking "Use Desktop Settings".'
              : 'Enter any CSS size value manually.'}
          </p>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
            Font Weight
          </label>
          <select
            value={currentFontWeight}
            onChange={(e) => onChange({ [activeKeys.weightKey]: Number(e.target.value) })}
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
            value={currentColor}
            onChange={(e) => onChange({ [activeKeys.colorKey]: e.target.value })}
            disabled={disabled}
            style={{ width: 64, height: 44, padding: 0, border: '1px solid #d1d5db', borderRadius: 8, cursor: 'pointer' }}
          />
        </div>

        {showAdvancedControls ? (
          <>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                Font Style
              </label>
              <select
                value={currentFontStyle}
                onChange={(e) =>
                  onChange({
                    [activeKeys.styleKey]: e.target.value as SectionStyleConfig[typeof activeKeys.styleKey],
                  })
                }
                disabled={disabled}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8 }}
              >
                {FONT_STYLE_OPTIONS.map((option) => (
                  <option key={`${prefix}-style-${option.value}`} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                Text Transform
              </label>
              <select
                value={currentTextTransform}
                onChange={(e) =>
                  onChange({
                    [activeKeys.transformKey]: e.target.value as SectionStyleConfig[typeof activeKeys.transformKey],
                  })
                }
                disabled={disabled}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8 }}
              >
                {TEXT_TRANSFORM_OPTIONS.map((option) => (
                  <option key={`${prefix}-transform-${option.value}`} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                Line Spacing
              </label>
              <input
                type="text"
                value={currentLineHeight}
                onChange={(e) =>
                  onChange({ [activeKeys.lineHeightKey]: e.target.value || undefined })
                }
                disabled={disabled}
                placeholder="1.2"
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8 }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                Text Spacing
              </label>
              <input
                type="text"
                value={currentLetterSpacing}
                onChange={(e) =>
                  onChange({ [activeKeys.letterSpacingKey]: e.target.value || undefined })
                }
                disabled={disabled}
                placeholder="0.08em"
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8 }}
              />
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

export function SectionTypographyControls({
  value,
  onChange,
  showAdvancedControls = false,
  viewport = 'desktop',
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
        showAdvancedControls={showAdvancedControls}
        viewport={viewport}
      />
      <TypoGroup
        title="Subheading Typography"
        prefix="subtitle"
        value={value}
        onChange={onChange}
        disabled={!isCustom}
        showAdvancedControls={showAdvancedControls}
        viewport={viewport}
      />
      <TypoGroup
        title="Paragraph Typography"
        prefix="body"
        value={value}
        onChange={onChange}
        disabled={!isCustom}
        showAdvancedControls={showAdvancedControls}
        viewport={viewport}
      />
    </div>
  );
}
