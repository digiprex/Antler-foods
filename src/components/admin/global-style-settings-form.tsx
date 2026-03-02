/**
 * Global Style Settings Form
 *
 * Enhanced interface for configuring global website typography:
 * - Title styling (font family, size, weight, color)
 * - Subheading styling
 * - Paragraph styling
 * - Live preview of changes
 */

'use client';

import { useState, useEffect } from 'react';
import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useGlobalStyleConfig, useUpdateGlobalStyleConfig } from '@/hooks/use-global-style-config';
import type { GlobalStyleConfig, FontStyle } from '@/types/global-style.types';
import Toast from '@/components/ui/toast';
import { loadGoogleFonts, preloadGoogleFonts } from '@/utils/google-fonts';
import styles from './global-style-settings-form.module.css';

// Font options - Popular Google Fonts
const FONT_OPTIONS = [
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

const TEXT_TRANSFORM_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'uppercase', label: 'Uppercase' },
  { value: 'lowercase', label: 'Lowercase' },
  { value: 'capitalize', label: 'Capitalize' },
];

const BUTTON_SIZE_OPTIONS = [
  { value: 'small', label: 'Small', padding: '0.5rem 1rem' },
  { value: 'medium', label: 'Medium', padding: '0.75rem 1.5rem' },
  { value: 'large', label: 'Large', padding: '1rem 2rem' },
];

const FONT_SIZE_OPTIONS = [
  { value: '0.75rem', label: 'Extra Small (12px)' },
  { value: '0.875rem', label: 'Small (14px)' },
  { value: '1rem', label: 'Base (16px)' },
  { value: '1.125rem', label: 'Medium (18px)' },
  { value: '1.25rem', label: 'Large (20px)' },
  { value: '1.5rem', label: 'Extra Large (24px)' },
  { value: '1.875rem', label: '2XL (30px)' },
  { value: '2.25rem', label: '3XL (36px)' },
  { value: '3rem', label: '4XL (48px)' },
  { value: '3.75rem', label: '5XL (60px)' },
];

const BORDER_RADIUS_OPTIONS = [
  { value: '0', label: 'None (Square)' },
  { value: '0.125rem', label: 'Extra Small (2px)' },
  { value: '0.25rem', label: 'Small (4px)' },
  { value: '0.375rem', label: 'Medium (6px)' },
  { value: '0.5rem', label: 'Large (8px)' },
  { value: '0.75rem', label: 'Extra Large (12px)' },
  { value: '1rem', label: '2XL (16px)' },
  { value: '1.5rem', label: '3XL (24px)' },
  { value: '9999px', label: 'Full (Pill)' },
];

const BORDER_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: '1px solid #d1d5db', label: 'Light Gray (1px)' },
  { value: '2px solid #d1d5db', label: 'Light Gray (2px)' },
  { value: '1px solid #9ca3af', label: 'Gray (1px)' },
  { value: '2px solid #9ca3af', label: 'Gray (2px)' },
  { value: '1px solid #000000', label: 'Black (1px)' },
  { value: '2px solid #000000', label: 'Black (2px)' },
  { value: '1px solid currentColor', label: 'Current Color (1px)' },
  { value: '2px solid currentColor', label: 'Current Color (2px)' },
];

// Helper function to get padding from button size
const getButtonPadding = (size: 'small' | 'medium' | 'large' = 'medium'): string => {
  const sizeOption = BUTTON_SIZE_OPTIONS.find(option => option.value === size);
  return sizeOption?.padding || '0.75rem 1.5rem';
};

export default function GlobalStyleSettingsForm() {
  const searchParams = useSearchParams();
  const restaurantIdFromQuery = searchParams.get('restaurant_id')?.trim() ?? '';
  const restaurantNameFromQuery = searchParams.get('restaurant_name')?.trim() ?? '';
  const restaurantId = restaurantIdFromQuery || '';
  
  // Validate that restaurant ID is provided
  if (!restaurantId) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#dc2626' }}>
        <h2>Error</h2>
        <p>Restaurant ID is required. Please provide it via URL parameter.</p>
      </div>
    );
  }

  const configApiEndpoint = useMemo(
    () => `/api/global-style-config?restaurant_id=${encodeURIComponent(restaurantId)}`,
    [restaurantId],
  );

  const { config, loading, error: fetchError } = useGlobalStyleConfig({
    apiEndpoint: configApiEndpoint,
  });
  const { updateGlobalStyle, updating, error: updateError } = useUpdateGlobalStyleConfig(configApiEndpoint);

  // Form state for title
  const [titleFontFamily, setTitleFontFamily] = useState('Inter, system-ui, sans-serif');
  const [titleFontSize, setTitleFontSize] = useState('2.25rem');
  const [titleFontWeight, setTitleFontWeight] = useState(700);
  const [titleColor, setTitleColor] = useState('#111827');
  const [titleLineHeight, setTitleLineHeight] = useState('1.2');
  const [titleLetterSpacing, setTitleLetterSpacing] = useState('-0.025em');
  const [titleTextTransform, setTitleTextTransform] = useState<'none' | 'uppercase' | 'lowercase' | 'capitalize'>('none');

  // Form state for subheading
  const [subheadingFontFamily, setSubheadingFontFamily] = useState('Inter, system-ui, sans-serif');
  const [subheadingFontSize, setSubheadingFontSize] = useState('1.5rem');
  const [subheadingFontWeight, setSubheadingFontWeight] = useState(600);
  const [subheadingColor, setSubheadingColor] = useState('#374151');
  const [subheadingLineHeight, setSubheadingLineHeight] = useState('1.3');
  const [subheadingLetterSpacing, setSubheadingLetterSpacing] = useState('-0.015em');
  const [subheadingTextTransform, setSubheadingTextTransform] = useState<'none' | 'uppercase' | 'lowercase' | 'capitalize'>('none');

  // Form state for paragraph
  const [paragraphFontFamily, setParagraphFontFamily] = useState('Inter, system-ui, sans-serif');
  const [paragraphFontSize, setParagraphFontSize] = useState('1rem');
  const [paragraphFontWeight, setParagraphFontWeight] = useState(400);
  const [paragraphColor, setParagraphColor] = useState('#6b7280');
  const [paragraphLineHeight, setParagraphLineHeight] = useState('1.6');
  const [paragraphLetterSpacing, setParagraphLetterSpacing] = useState('0');
  const [paragraphTextTransform, setParagraphTextTransform] = useState<'none' | 'uppercase' | 'lowercase' | 'capitalize'>('none');

  // Form state for primary button
  const [primaryButtonBgColor, setPrimaryButtonBgColor] = useState('#2563eb');
  const [primaryButtonColor, setPrimaryButtonColor] = useState('#ffffff');
  const [primaryButtonFontSize, setPrimaryButtonFontSize] = useState('1rem');
  const [primaryButtonFontWeight, setPrimaryButtonFontWeight] = useState(600);
  const [primaryButtonBorderRadius, setPrimaryButtonBorderRadius] = useState('0.5rem');
  const [primaryButtonSize, setPrimaryButtonSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [primaryButtonBorder, setPrimaryButtonBorder] = useState('none');
  const [primaryButtonHoverBgColor, setPrimaryButtonHoverBgColor] = useState('#1d4ed8');
  const [primaryButtonHoverColor, setPrimaryButtonHoverColor] = useState('#ffffff');
  const [primaryButtonFontFamily, setPrimaryButtonFontFamily] = useState('Inter, system-ui, sans-serif');
  const [primaryButtonTextTransform, setPrimaryButtonTextTransform] = useState<'none' | 'uppercase' | 'lowercase' | 'capitalize'>('none');

  // Form state for secondary button
  const [secondaryButtonBgColor, setSecondaryButtonBgColor] = useState('#ffffff');
  const [secondaryButtonColor, setSecondaryButtonColor] = useState('#374151');
  const [secondaryButtonFontSize, setSecondaryButtonFontSize] = useState('1rem');
  const [secondaryButtonFontWeight, setSecondaryButtonFontWeight] = useState(600);
  const [secondaryButtonBorderRadius, setSecondaryButtonBorderRadius] = useState('0.5rem');
  const [secondaryButtonSize, setSecondaryButtonSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [secondaryButtonBorder, setSecondaryButtonBorder] = useState('1px solid #d1d5db');
  const [secondaryButtonHoverBgColor, setSecondaryButtonHoverBgColor] = useState('#f9fafb');
  const [secondaryButtonHoverColor, setSecondaryButtonHoverColor] = useState('#111827');
  const [secondaryButtonFontFamily, setSecondaryButtonFontFamily] = useState('Inter, system-ui, sans-serif');
  const [secondaryButtonTextTransform, setSecondaryButtonTextTransform] = useState<'none' | 'uppercase' | 'lowercase' | 'capitalize'>('none');

  // Toast state
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  // Preview visibility state
  const [showPreview, setShowPreview] = useState(false);

  // Initialize form with fetched config
  useEffect(() => {
    if (config) {
      // Title settings
      if (config.title) {
        setTitleFontFamily(config.title.fontFamily || 'Inter, system-ui, sans-serif');
        setTitleFontSize(config.title.fontSize || '2.25rem');
        setTitleFontWeight(config.title.fontWeight || 700);
        setTitleColor(config.title.color || '#111827');
        setTitleLineHeight(config.title.lineHeight || '1.2');
        setTitleLetterSpacing(config.title.letterSpacing || '-0.025em');
        setTitleTextTransform(config.title.textTransform || 'none');
      }

      // Subheading settings
      if (config.subheading) {
        setSubheadingFontFamily(config.subheading.fontFamily || 'Inter, system-ui, sans-serif');
        setSubheadingFontSize(config.subheading.fontSize || '1.5rem');
        setSubheadingFontWeight(config.subheading.fontWeight || 600);
        setSubheadingColor(config.subheading.color || '#374151');
        setSubheadingLineHeight(config.subheading.lineHeight || '1.3');
        setSubheadingLetterSpacing(config.subheading.letterSpacing || '-0.015em');
        setSubheadingTextTransform(config.subheading.textTransform || 'none');
      }

      // Paragraph settings
      if (config.paragraph) {
        setParagraphFontFamily(config.paragraph.fontFamily || 'Inter, system-ui, sans-serif');
        setParagraphFontSize(config.paragraph.fontSize || '1rem');
        setParagraphFontWeight(config.paragraph.fontWeight || 400);
        setParagraphColor(config.paragraph.color || '#6b7280');
        setParagraphLineHeight(config.paragraph.lineHeight || '1.6');
        setParagraphLetterSpacing(config.paragraph.letterSpacing || '0');
        setParagraphTextTransform(config.paragraph.textTransform || 'none');
      }

      // Primary button settings
      if (config.primaryButton) {
        setPrimaryButtonBgColor(config.primaryButton.backgroundColor || '#2563eb');
        setPrimaryButtonColor(config.primaryButton.color || '#ffffff');
        setPrimaryButtonFontSize(config.primaryButton.fontSize || '1rem');
        setPrimaryButtonFontWeight(config.primaryButton.fontWeight || 600);
        setPrimaryButtonBorderRadius(config.primaryButton.borderRadius || '0.5rem');
        setPrimaryButtonSize(config.primaryButton.size || 'medium');
        setPrimaryButtonBorder(config.primaryButton.border || 'none');
        setPrimaryButtonHoverBgColor(config.primaryButton.hoverBackgroundColor || '#1d4ed8');
        setPrimaryButtonHoverColor(config.primaryButton.hoverColor || '#ffffff');
        setPrimaryButtonFontFamily(config.primaryButton.fontFamily || 'Inter, system-ui, sans-serif');
        setPrimaryButtonTextTransform(config.primaryButton.textTransform || 'none');
      }

      // Secondary button settings
      if (config.secondaryButton) {
        setSecondaryButtonBgColor(config.secondaryButton.backgroundColor || '#ffffff');
        setSecondaryButtonColor(config.secondaryButton.color || '#374151');
        setSecondaryButtonFontSize(config.secondaryButton.fontSize || '1rem');
        setSecondaryButtonFontWeight(config.secondaryButton.fontWeight || 600);
        setSecondaryButtonBorderRadius(config.secondaryButton.borderRadius || '0.5rem');
        setSecondaryButtonSize(config.secondaryButton.size || 'medium');
        setSecondaryButtonBorder(config.secondaryButton.border || '1px solid #d1d5db');
        setSecondaryButtonHoverBgColor(config.secondaryButton.hoverBackgroundColor || '#f9fafb');
        setSecondaryButtonHoverColor(config.secondaryButton.hoverColor || '#111827');
        setSecondaryButtonFontFamily(config.secondaryButton.fontFamily || 'Inter, system-ui, sans-serif');
        setSecondaryButtonTextTransform(config.secondaryButton.textTransform || 'none');
      }
    }
  }, [config]);

  // Load Google Fonts when font families change
  useEffect(() => {
    const selectedFonts = [
      titleFontFamily,
      subheadingFontFamily,
      paragraphFontFamily,
      primaryButtonFontFamily,
      secondaryButtonFontFamily,
    ];
    loadGoogleFonts(selectedFonts);
  }, [
    titleFontFamily,
    subheadingFontFamily,
    paragraphFontFamily,
    primaryButtonFontFamily,
    secondaryButtonFontFamily,
  ]);

  // Preload popular Google Fonts on component mount
  useEffect(() => {
    preloadGoogleFonts();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!restaurantId) {
      setToastMessage('Restaurant ID not found. Please refresh the page.');
      setToastType('error');
      setShowToast(true);
      return;
    }

    try {
      await updateGlobalStyle({
        restaurant_id: restaurantId,
        title: {
          fontFamily: titleFontFamily,
          fontSize: titleFontSize,
          fontWeight: titleFontWeight,
          color: titleColor,
          lineHeight: titleLineHeight,
          letterSpacing: titleLetterSpacing,
          textTransform: titleTextTransform,
        },
        subheading: {
          fontFamily: subheadingFontFamily,
          fontSize: subheadingFontSize,
          fontWeight: subheadingFontWeight,
          color: subheadingColor,
          lineHeight: subheadingLineHeight,
          letterSpacing: subheadingLetterSpacing,
          textTransform: subheadingTextTransform,
        },
        paragraph: {
          fontFamily: paragraphFontFamily,
          fontSize: paragraphFontSize,
          fontWeight: paragraphFontWeight,
          color: paragraphColor,
          lineHeight: paragraphLineHeight,
          letterSpacing: paragraphLetterSpacing,
          textTransform: paragraphTextTransform,
        },
        primaryButton: {
          backgroundColor: primaryButtonBgColor,
          color: primaryButtonColor,
          fontSize: primaryButtonFontSize,
          fontWeight: primaryButtonFontWeight,
          borderRadius: primaryButtonBorderRadius,
          size: primaryButtonSize,
          border: primaryButtonBorder,
          hoverBackgroundColor: primaryButtonHoverBgColor,
          hoverColor: primaryButtonHoverColor,
          fontFamily: primaryButtonFontFamily,
          textTransform: primaryButtonTextTransform,
        },
        secondaryButton: {
          backgroundColor: secondaryButtonBgColor,
          color: secondaryButtonColor,
          fontSize: secondaryButtonFontSize,
          fontWeight: secondaryButtonFontWeight,
          borderRadius: secondaryButtonBorderRadius,
          size: secondaryButtonSize,
          border: secondaryButtonBorder,
          hoverBackgroundColor: secondaryButtonHoverBgColor,
          hoverColor: secondaryButtonHoverColor,
          fontFamily: secondaryButtonFontFamily,
          textTransform: secondaryButtonTextTransform,
        },
      });

      setToastMessage('Global style settings saved successfully!');
      setToastType('success');
      setShowToast(true);
    } catch (err) {
      console.error('Failed to update global styles:', err);
      setToastMessage('Failed to save settings. Please try again.');
      setToastType('error');
      setShowToast(true);
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Toast Notification */}
      {showToast && (
        <Toast
          message={toastMessage}
          type={toastType}
          onClose={() => setShowToast(false)}
        />
      )}

      <div className={styles.singleLayout}>
        {/* Settings Form */}
        <div className={styles.formSection}>
          <div className={styles.formHeader}>
            <div>
              <h1 className={styles.formTitle}>Global Style Settings</h1>
              <p className={styles.formSubtitle}>Configure typography for your website</p>
              {restaurantNameFromQuery && (
                <p className={styles.formSubtitle}>
                  Restaurant: {restaurantNameFromQuery}
                </p>
              )}
            </div>
            <div className={styles.headerActions}>
              <button
                type="button"
                onClick={() => setShowPreview(!showPreview)}
                className={styles.previewToggleButton}
                title={showPreview ? 'Hide Preview' : 'Show Live Preview'}
              >
                {showPreview ? '👁️‍🗨️' : '👁️'} {showPreview ? 'Hide' : 'Show'} Preview
              </button>
            </div>
          </div>

          {fetchError && (
            <div className={styles.errorMessage}>
              <span className={styles.errorIcon}>⚠</span>
              <span>Error loading settings: {fetchError}</span>
            </div>
          )}

          {updateError && (
            <div className={styles.errorMessage}>
              <span className={styles.errorIcon}>⚠</span>
              <span>Error saving settings: {updateError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className={styles.form}>
            {/* Title Section */}
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>
                <span className={styles.sectionIcon}>📝</span>
                Title Styling (H1, Main Headings)
              </h3>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Font Family
                  <span className={styles.labelHint}>Choose title font</span>
                </label>
                <select
                  value={titleFontFamily}
                  onChange={(e) => setTitleFontFamily(e.target.value)}
                  className={styles.select}
                  style={{ fontFamily: titleFontFamily }}
                >
                  {FONT_OPTIONS.map((font) => (
                    <option key={font.value} value={font.value}>
                      {font.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Font Size
                  <span className={styles.labelHint}>Title size</span>
                </label>
                <select
                  value={titleFontSize}
                  onChange={(e) => setTitleFontSize(e.target.value)}
                  className={styles.select}
                >
                  {FONT_SIZE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Font Weight
                  <span className={styles.labelHint}>100-900</span>
                </label>
                <input
                  type="number"
                  min="100"
                  max="900"
                  step="100"
                  value={titleFontWeight}
                  onChange={(e) => setTitleFontWeight(parseInt(e.target.value))}
                  className={styles.numberInput}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Color
                  <span className={styles.labelHint}>Text color</span>
                </label>
                <div className={styles.colorInputGroup}>
                  <input
                    type="color"
                    value={titleColor}
                    onChange={(e) => setTitleColor(e.target.value)}
                    className={styles.colorInput}
                  />
                  <input
                    type="text"
                    value={titleColor}
                    onChange={(e) => setTitleColor(e.target.value)}
                    className={styles.colorHexInput}
                    placeholder="#111827"
                  />
                  <button
                    type="button"
                    onClick={() => setTitleColor('#111827')}
                    className={styles.clearButton}
                    title="Reset to default"
                  >
                    ↺
                  </button>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Line Height
                  <span className={styles.labelHint}>Line spacing</span>
                </label>
                <input
                  type="text"
                  value={titleLineHeight}
                  onChange={(e) => setTitleLineHeight(e.target.value)}
                  className={styles.textInput}
                  placeholder="1.2"
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Letter Spacing
                  <span className={styles.labelHint}>Character spacing</span>
                </label>
                <input
                  type="text"
                  value={titleLetterSpacing}
                  onChange={(e) => setTitleLetterSpacing(e.target.value)}
                  className={styles.textInput}
                  placeholder="-0.025em"
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Text Transform
                  <span className={styles.labelHint}>Case transformation</span>
                </label>
                <select
                  value={titleTextTransform}
                  onChange={(e) => setTitleTextTransform(e.target.value as any)}
                  className={styles.select}
                >
                  {TEXT_TRANSFORM_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Subheading Section */}
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>
                <span className={styles.sectionIcon}>📄</span>
                Subheading Styling (H2, H3, Section Headings)
              </h3>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Font Family
                  <span className={styles.labelHint}>Choose subheading font</span>
                </label>
                <select
                  value={subheadingFontFamily}
                  onChange={(e) => setSubheadingFontFamily(e.target.value)}
                  className={styles.select}
                  style={{ fontFamily: subheadingFontFamily }}
                >
                  {FONT_OPTIONS.map((font) => (
                    <option key={font.value} value={font.value}>
                      {font.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Font Size
                  <span className={styles.labelHint}>Subheading size</span>
                </label>
                <select
                  value={subheadingFontSize}
                  onChange={(e) => setSubheadingFontSize(e.target.value)}
                  className={styles.select}
                >
                  {FONT_SIZE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Font Weight
                  <span className={styles.labelHint}>100-900</span>
                </label>
                <input
                  type="number"
                  min="100"
                  max="900"
                  step="100"
                  value={subheadingFontWeight}
                  onChange={(e) => setSubheadingFontWeight(parseInt(e.target.value))}
                  className={styles.numberInput}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Color
                  <span className={styles.labelHint}>Text color</span>
                </label>
                <div className={styles.colorInputGroup}>
                  <input
                    type="color"
                    value={subheadingColor}
                    onChange={(e) => setSubheadingColor(e.target.value)}
                    className={styles.colorInput}
                  />
                  <input
                    type="text"
                    value={subheadingColor}
                    onChange={(e) => setSubheadingColor(e.target.value)}
                    className={styles.colorHexInput}
                    placeholder="#374151"
                  />
                  <button
                    type="button"
                    onClick={() => setSubheadingColor('#374151')}
                    className={styles.clearButton}
                    title="Reset to default"
                  >
                    ↺
                  </button>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Line Height
                  <span className={styles.labelHint}>Line spacing</span>
                </label>
                <input
                  type="text"
                  value={subheadingLineHeight}
                  onChange={(e) => setSubheadingLineHeight(e.target.value)}
                  className={styles.textInput}
                  placeholder="1.3"
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Letter Spacing
                  <span className={styles.labelHint}>Character spacing</span>
                </label>
                <input
                  type="text"
                  value={subheadingLetterSpacing}
                  onChange={(e) => setSubheadingLetterSpacing(e.target.value)}
                  className={styles.textInput}
                  placeholder="-0.015em"
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Text Transform
                  <span className={styles.labelHint}>Case transformation</span>
                </label>
                <select
                  value={subheadingTextTransform}
                  onChange={(e) => setSubheadingTextTransform(e.target.value as any)}
                  className={styles.select}
                >
                  {TEXT_TRANSFORM_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Paragraph Section */}
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>
                <span className={styles.sectionIcon}>📖</span>
                Paragraph Styling (Body Text, Descriptions)
              </h3>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Font Family
                  <span className={styles.labelHint}>Choose body text font</span>
                </label>
                <select
                  value={paragraphFontFamily}
                  onChange={(e) => setParagraphFontFamily(e.target.value)}
                  className={styles.select}
                  style={{ fontFamily: paragraphFontFamily }}
                >
                  {FONT_OPTIONS.map((font) => (
                    <option key={font.value} value={font.value}>
                      {font.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Font Size
                  <span className={styles.labelHint}>Body text size</span>
                </label>
                <select
                  value={paragraphFontSize}
                  onChange={(e) => setParagraphFontSize(e.target.value)}
                  className={styles.select}
                >
                  {FONT_SIZE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Font Weight
                  <span className={styles.labelHint}>100-900</span>
                </label>
                <input
                  type="number"
                  min="100"
                  max="900"
                  step="100"
                  value={paragraphFontWeight}
                  onChange={(e) => setParagraphFontWeight(parseInt(e.target.value))}
                  className={styles.numberInput}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Color
                  <span className={styles.labelHint}>Text color</span>
                </label>
                <div className={styles.colorInputGroup}>
                  <input
                    type="color"
                    value={paragraphColor}
                    onChange={(e) => setParagraphColor(e.target.value)}
                    className={styles.colorInput}
                  />
                  <input
                    type="text"
                    value={paragraphColor}
                    onChange={(e) => setParagraphColor(e.target.value)}
                    className={styles.colorHexInput}
                    placeholder="#6b7280"
                  />
                  <button
                    type="button"
                    onClick={() => setParagraphColor('#6b7280')}
                    className={styles.clearButton}
                    title="Reset to default"
                  >
                    ↺
                  </button>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Line Height
                  <span className={styles.labelHint}>Line spacing</span>
                </label>
                <input
                  type="text"
                  value={paragraphLineHeight}
                  onChange={(e) => setParagraphLineHeight(e.target.value)}
                  className={styles.textInput}
                  placeholder="1.6"
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Letter Spacing
                  <span className={styles.labelHint}>Character spacing</span>
                </label>
                <input
                  type="text"
                  value={paragraphLetterSpacing}
                  onChange={(e) => setParagraphLetterSpacing(e.target.value)}
                  className={styles.textInput}
                  placeholder="0"
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Text Transform
                  <span className={styles.labelHint}>Case transformation</span>
                </label>
                <select
                  value={paragraphTextTransform}
                  onChange={(e) => setParagraphTextTransform(e.target.value as any)}
                  className={styles.select}
                >
                  {TEXT_TRANSFORM_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Primary Button Section */}
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>
                <span className={styles.sectionIcon}>🔵</span>
                Primary Button Styling
              </h3>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Font Family
                  <span className={styles.labelHint}>Choose button font</span>
                </label>
                <select
                  value={primaryButtonFontFamily}
                  onChange={(e) => setPrimaryButtonFontFamily(e.target.value)}
                  className={styles.select}
                  style={{ fontFamily: primaryButtonFontFamily }}
                >
                  {FONT_OPTIONS.map((font) => (
                    <option key={font.value} value={font.value}>
                      {font.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Background Color
                  <span className={styles.labelHint}>Button background</span>
                </label>
                <div className={styles.colorInputGroup}>
                  <input
                    type="color"
                    value={primaryButtonBgColor}
                    onChange={(e) => setPrimaryButtonBgColor(e.target.value)}
                    className={styles.colorInput}
                  />
                  <input
                    type="text"
                    value={primaryButtonBgColor}
                    onChange={(e) => setPrimaryButtonBgColor(e.target.value)}
                    className={styles.colorHexInput}
                    placeholder="#2563eb"
                  />
                  <button
                    type="button"
                    onClick={() => setPrimaryButtonBgColor('#2563eb')}
                    className={styles.clearButton}
                    title="Reset to default"
                  >
                    ↺
                  </button>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Text Color
                  <span className={styles.labelHint}>Button text color</span>
                </label>
                <div className={styles.colorInputGroup}>
                  <input
                    type="color"
                    value={primaryButtonColor}
                    onChange={(e) => setPrimaryButtonColor(e.target.value)}
                    className={styles.colorInput}
                  />
                  <input
                    type="text"
                    value={primaryButtonColor}
                    onChange={(e) => setPrimaryButtonColor(e.target.value)}
                    className={styles.colorHexInput}
                    placeholder="#ffffff"
                  />
                  <button
                    type="button"
                    onClick={() => setPrimaryButtonColor('#ffffff')}
                    className={styles.clearButton}
                    title="Reset to default"
                  >
                    ↺
                  </button>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Font Size
                  <span className={styles.labelHint}>Button text size</span>
                </label>
                <select
                  value={primaryButtonFontSize}
                  onChange={(e) => setPrimaryButtonFontSize(e.target.value)}
                  className={styles.select}
                >
                  {FONT_SIZE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Font Weight
                  <span className={styles.labelHint}>100-900</span>
                </label>
                <input
                  type="number"
                  min="100"
                  max="900"
                  step="100"
                  value={primaryButtonFontWeight}
                  onChange={(e) => setPrimaryButtonFontWeight(parseInt(e.target.value))}
                  className={styles.numberInput}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Border Radius
                  <span className={styles.labelHint}>Corner rounding</span>
                </label>
                <select
                  value={primaryButtonBorderRadius}
                  onChange={(e) => setPrimaryButtonBorderRadius(e.target.value)}
                  className={styles.select}
                >
                  {BORDER_RADIUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Button Size
                  <span className={styles.labelHint}>Determines padding</span>
                </label>
                <select
                  value={primaryButtonSize}
                  onChange={(e) => setPrimaryButtonSize(e.target.value as 'small' | 'medium' | 'large')}
                  className={styles.select}
                >
                  {BUTTON_SIZE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label} ({option.padding})
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Border
                  <span className={styles.labelHint}>Button border style</span>
                </label>
                <select
                  value={primaryButtonBorder}
                  onChange={(e) => setPrimaryButtonBorder(e.target.value)}
                  className={styles.select}
                >
                  {BORDER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Hover Background Color
                  <span className={styles.labelHint}>Background on hover</span>
                </label>
                <div className={styles.colorInputGroup}>
                  <input
                    type="color"
                    value={primaryButtonHoverBgColor}
                    onChange={(e) => setPrimaryButtonHoverBgColor(e.target.value)}
                    className={styles.colorInput}
                  />
                  <input
                    type="text"
                    value={primaryButtonHoverBgColor}
                    onChange={(e) => setPrimaryButtonHoverBgColor(e.target.value)}
                    className={styles.colorHexInput}
                    placeholder="#1d4ed8"
                  />
                  <button
                    type="button"
                    onClick={() => setPrimaryButtonHoverBgColor('#1d4ed8')}
                    className={styles.clearButton}
                    title="Reset to default"
                  >
                    ↺
                  </button>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Hover Text Color
                  <span className={styles.labelHint}>Text color on hover</span>
                </label>
                <div className={styles.colorInputGroup}>
                  <input
                    type="color"
                    value={primaryButtonHoverColor}
                    onChange={(e) => setPrimaryButtonHoverColor(e.target.value)}
                    className={styles.colorInput}
                  />
                  <input
                    type="text"
                    value={primaryButtonHoverColor}
                    onChange={(e) => setPrimaryButtonHoverColor(e.target.value)}
                    className={styles.colorHexInput}
                    placeholder="#ffffff"
                  />
                  <button
                    type="button"
                    onClick={() => setPrimaryButtonHoverColor('#ffffff')}
                    className={styles.clearButton}
                    title="Reset to default"
                  >
                    ↺
                  </button>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Text Transform
                  <span className={styles.labelHint}>Case transformation</span>
                </label>
                <select
                  value={primaryButtonTextTransform}
                  onChange={(e) => setPrimaryButtonTextTransform(e.target.value as any)}
                  className={styles.select}
                >
                  {TEXT_TRANSFORM_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Secondary Button Section */}
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>
                <span className={styles.sectionIcon}>⚪</span>
                Secondary Button Styling
              </h3>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Font Family
                  <span className={styles.labelHint}>Choose button font</span>
                </label>
                <select
                  value={secondaryButtonFontFamily}
                  onChange={(e) => setSecondaryButtonFontFamily(e.target.value)}
                  className={styles.select}
                  style={{ fontFamily: secondaryButtonFontFamily }}
                >
                  {FONT_OPTIONS.map((font) => (
                    <option key={font.value} value={font.value}>
                      {font.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Background Color
                  <span className={styles.labelHint}>Button background</span>
                </label>
                <div className={styles.colorInputGroup}>
                  <input
                    type="color"
                    value={secondaryButtonBgColor}
                    onChange={(e) => setSecondaryButtonBgColor(e.target.value)}
                    className={styles.colorInput}
                  />
                  <input
                    type="text"
                    value={secondaryButtonBgColor}
                    onChange={(e) => setSecondaryButtonBgColor(e.target.value)}
                    className={styles.colorHexInput}
                    placeholder="#ffffff"
                  />
                  <button
                    type="button"
                    onClick={() => setSecondaryButtonBgColor('#ffffff')}
                    className={styles.clearButton}
                    title="Reset to default"
                  >
                    ↺
                  </button>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Text Color
                  <span className={styles.labelHint}>Button text color</span>
                </label>
                <div className={styles.colorInputGroup}>
                  <input
                    type="color"
                    value={secondaryButtonColor}
                    onChange={(e) => setSecondaryButtonColor(e.target.value)}
                    className={styles.colorInput}
                  />
                  <input
                    type="text"
                    value={secondaryButtonColor}
                    onChange={(e) => setSecondaryButtonColor(e.target.value)}
                    className={styles.colorHexInput}
                    placeholder="#374151"
                  />
                  <button
                    type="button"
                    onClick={() => setSecondaryButtonColor('#374151')}
                    className={styles.clearButton}
                    title="Reset to default"
                  >
                    ↺
                  </button>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Font Size
                  <span className={styles.labelHint}>Button text size</span>
                </label>
                <select
                  value={secondaryButtonFontSize}
                  onChange={(e) => setSecondaryButtonFontSize(e.target.value)}
                  className={styles.select}
                >
                  {FONT_SIZE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Font Weight
                  <span className={styles.labelHint}>100-900</span>
                </label>
                <input
                  type="number"
                  min="100"
                  max="900"
                  step="100"
                  value={secondaryButtonFontWeight}
                  onChange={(e) => setSecondaryButtonFontWeight(parseInt(e.target.value))}
                  className={styles.numberInput}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Border Radius
                  <span className={styles.labelHint}>Corner rounding</span>
                </label>
                <select
                  value={secondaryButtonBorderRadius}
                  onChange={(e) => setSecondaryButtonBorderRadius(e.target.value)}
                  className={styles.select}
                >
                  {BORDER_RADIUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Button Size
                  <span className={styles.labelHint}>Determines padding</span>
                </label>
                <select
                  value={secondaryButtonSize}
                  onChange={(e) => setSecondaryButtonSize(e.target.value as 'small' | 'medium' | 'large')}
                  className={styles.select}
                >
                  {BUTTON_SIZE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label} ({option.padding})
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Border
                  <span className={styles.labelHint}>Button border style</span>
                </label>
                <select
                  value={secondaryButtonBorder}
                  onChange={(e) => setSecondaryButtonBorder(e.target.value)}
                  className={styles.select}
                >
                  {BORDER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Hover Background Color
                  <span className={styles.labelHint}>Background on hover</span>
                </label>
                <div className={styles.colorInputGroup}>
                  <input
                    type="color"
                    value={secondaryButtonHoverBgColor}
                    onChange={(e) => setSecondaryButtonHoverBgColor(e.target.value)}
                    className={styles.colorInput}
                  />
                  <input
                    type="text"
                    value={secondaryButtonHoverBgColor}
                    onChange={(e) => setSecondaryButtonHoverBgColor(e.target.value)}
                    className={styles.colorHexInput}
                    placeholder="#f9fafb"
                  />
                  <button
                    type="button"
                    onClick={() => setSecondaryButtonHoverBgColor('#f9fafb')}
                    className={styles.clearButton}
                    title="Reset to default"
                  >
                    ↺
                  </button>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Hover Text Color
                  <span className={styles.labelHint}>Text color on hover</span>
                </label>
                <div className={styles.colorInputGroup}>
                  <input
                    type="color"
                    value={secondaryButtonHoverColor}
                    onChange={(e) => setSecondaryButtonHoverColor(e.target.value)}
                    className={styles.colorInput}
                  />
                  <input
                    type="text"
                    value={secondaryButtonHoverColor}
                    onChange={(e) => setSecondaryButtonHoverColor(e.target.value)}
                    className={styles.colorHexInput}
                    placeholder="#111827"
                  />
                  <button
                    type="button"
                    onClick={() => setSecondaryButtonHoverColor('#111827')}
                    className={styles.clearButton}
                    title="Reset to default"
                  >
                    ↺
                  </button>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Text Transform
                  <span className={styles.labelHint}>Case transformation</span>
                </label>
                <select
                  value={secondaryButtonTextTransform}
                  onChange={(e) => setSecondaryButtonTextTransform(e.target.value as any)}
                  className={styles.select}
                >
                  {TEXT_TRANSFORM_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Save Button */}
            <div className={styles.formActions}>
              <button
                type="submit"
                disabled={updating}
                className={styles.saveButton}
              >
                {updating ? (
                  <>
                    <span className={styles.spinner}></span>
                    Saving...
                  </>
                ) : (
                  <>
                    <span>💾</span>
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Preview Modal Popup */}
      {showPreview && (
        <div className={styles.previewModal}>
          <div className={styles.previewModalOverlay} onClick={() => setShowPreview(false)} />
          <div className={styles.previewModalContent}>
            <div className={styles.previewModalHeader}>
              <h2 className={styles.previewModalTitle}>Typography Live Preview</h2>
              <div className={styles.previewModalActions}>
                <span className={styles.previewBadge}>Updates in real-time</span>
                <button
                  onClick={() => setShowPreview(false)}
                  className={styles.previewModalClose}
                  aria-label="Close preview"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className={styles.previewModalBody}>
              <div className={styles.previewContainer}>
                <h1
                  className={styles.previewTitle}
                  style={{
                    fontFamily: titleFontFamily,
                    fontSize: titleFontSize,
                    fontWeight: titleFontWeight,
                    color: titleColor,
                    lineHeight: titleLineHeight,
                    letterSpacing: titleLetterSpacing,
                    textTransform: titleTextTransform,
                  }}
                >
                  Sample Title Text
                </h1>
                <h2
                  className={styles.previewSubheading}
                  style={{
                    fontFamily: subheadingFontFamily,
                    fontSize: subheadingFontSize,
                    fontWeight: subheadingFontWeight,
                    color: subheadingColor,
                    lineHeight: subheadingLineHeight,
                    letterSpacing: subheadingLetterSpacing,
                    textTransform: subheadingTextTransform,
                  }}
                >
                  Sample Subheading Text
                </h2>
                <p
                  className={styles.previewParagraph}
                  style={{
                    fontFamily: paragraphFontFamily,
                    fontSize: paragraphFontSize,
                    fontWeight: paragraphFontWeight,
                    color: paragraphColor,
                    lineHeight: paragraphLineHeight,
                    letterSpacing: paragraphLetterSpacing,
                    textTransform: paragraphTextTransform,
                  }}
                >
                  This is sample paragraph text that demonstrates how your body text will appear on the website.
                  You can see the font family, size, weight, color, and spacing settings applied in real-time.
                  This helps you make informed decisions about your typography choices.
                </p>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', flexWrap: 'wrap' }}>
                  <button
                    style={{
                      backgroundColor: primaryButtonBgColor,
                      color: primaryButtonColor,
                      fontSize: primaryButtonFontSize,
                      fontWeight: primaryButtonFontWeight,
                      borderRadius: primaryButtonBorderRadius,
                      padding: getButtonPadding(primaryButtonSize),
                      border: primaryButtonBorder,
                      fontFamily: primaryButtonFontFamily,
                      textTransform: primaryButtonTextTransform,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = primaryButtonHoverBgColor;
                      e.currentTarget.style.color = primaryButtonHoverColor;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = primaryButtonBgColor;
                      e.currentTarget.style.color = primaryButtonColor;
                    }}
                  >
                    Primary Button
                  </button>
                  <button
                    style={{
                      backgroundColor: secondaryButtonBgColor,
                      color: secondaryButtonColor,
                      fontSize: secondaryButtonFontSize,
                      fontWeight: secondaryButtonFontWeight,
                      borderRadius: secondaryButtonBorderRadius,
                      padding: getButtonPadding(secondaryButtonSize),
                      border: secondaryButtonBorder,
                      fontFamily: secondaryButtonFontFamily,
                      textTransform: secondaryButtonTextTransform,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = secondaryButtonHoverBgColor;
                      e.currentTarget.style.color = secondaryButtonHoverColor;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = secondaryButtonBgColor;
                      e.currentTarget.style.color = secondaryButtonColor;
                    }}
                  >
                    Secondary Button
                  </button>
                </div>
              </div>
              <p className={styles.previewNote}>
                <span className={styles.previewIcon}>👁</span>
                Preview shows how your typography and buttons will appear on the website
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}