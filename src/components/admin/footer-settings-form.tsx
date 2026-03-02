/**
 * Footer Settings Form
 *
 * Enhanced interface for configuring footer settings:
 * - Layout selection
 * - Contact information
 * - Social media links
 * - Colors customization
 * - Footer columns
 * - Newsletter toggle
 */

'use client';

import { useState, useEffect } from 'react';
import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useFooterConfig, useUpdateFooterConfig } from '@/hooks/use-footer-config';
import type { FooterConfig } from '@/types/footer.types';
import Footer from '@/components/footer';
import Toast from '@/components/ui/toast';
import styles from './footer-settings-form.module.css';

// Font options for footer text
const FONT_OPTIONS = [
  { value: 'Inter, system-ui, sans-serif', label: 'Inter (Default)' },
  { value: 'Roboto, sans-serif', label: 'Roboto' },
  { value: 'Open Sans, sans-serif', label: 'Open Sans' },
  { value: 'Lato, sans-serif', label: 'Lato' },
  { value: 'Montserrat, sans-serif', label: 'Montserrat' },
  { value: 'Poppins, sans-serif', label: 'Poppins' },
  { value: 'Playfair Display, serif', label: 'Playfair Display' },
  { value: 'Merriweather, serif', label: 'Merriweather' },
  { value: 'Arial, sans-serif', label: 'Arial' },
  { value: 'Helvetica, sans-serif', label: 'Helvetica' },
];

const FONT_SIZE_OPTIONS = [
  { value: '0.75rem', label: 'Extra Small (12px)' },
  { value: '0.875rem', label: 'Small (14px)' },
  { value: '0.9375rem', label: 'Base (15px)' },
  { value: '1rem', label: 'Medium (16px)' },
  { value: '1.125rem', label: 'Large (18px)' },
  { value: '1.25rem', label: 'Extra Large (20px)' },
];

const FONT_WEIGHT_OPTIONS = [
  { value: 300, label: 'Light (300)' },
  { value: 400, label: 'Normal (400)' },
  { value: 500, label: 'Medium (500)' },
  { value: 600, label: 'Semi Bold (600)' },
  { value: 700, label: 'Bold (700)' },
];

const TEXT_TRANSFORM_OPTIONS = [
  { value: 'none', label: 'None (Default)' },
  { value: 'uppercase', label: 'UPPERCASE' },
  { value: 'lowercase', label: 'lowercase' },
  { value: 'capitalize', label: 'Capitalize Each Word' },
];

// Restaurant ID should be provided dynamically - no default static ID

export default function FooterSettingsForm() {
  const searchParams = useSearchParams();
  const restaurantIdFromQuery = searchParams.get('restaurant_id')?.trim() ?? '';
  const restaurantNameFromQuery =
    searchParams.get('restaurant_name')?.trim() ?? '';
  const restaurantId = restaurantIdFromQuery || '';
  
  // Form state
  const [layout, setLayout] = useState<NonNullable<FooterConfig['layout']>>(
    'columns-4',
  );
  const [aboutContent, setAboutContent] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [bgColor, setBgColor] = useState('#1f2937');
  const [textColor, setTextColor] = useState('#f9fafb');
  const [linkColor, setLinkColor] = useState('#9ca3af');
  const [copyrightBgColor, setCopyrightBgColor] = useState('#000000');
  const [copyrightTextColor, setCopyrightTextColor] = useState('#ffffff');
  const [showNewsletter, setShowNewsletter] = useState(false);
  const [showSocialMedia, setShowSocialMedia] = useState(true);

  // Font styling state
  const [fontFamily, setFontFamily] = useState('Inter, system-ui, sans-serif');
  const [fontSize, setFontSize] = useState('0.9375rem');
  const [fontWeight, setFontWeight] = useState<number>(400);
  const [textTransform, setTextTransform] = useState<'none' | 'uppercase' | 'lowercase' | 'capitalize'>('none');

  const [headingFontFamily, setHeadingFontFamily] = useState('Inter, system-ui, sans-serif');
  const [headingFontSize, setHeadingFontSize] = useState('1.125rem');
  const [headingFontWeight, setHeadingFontWeight] = useState<number>(600);
  const [headingTextTransform, setHeadingTextTransform] = useState<'none' | 'uppercase' | 'lowercase' | 'capitalize'>('uppercase');

  const [copyrightFontFamily, setCopyrightFontFamily] = useState('Inter, system-ui, sans-serif');
  const [copyrightFontSize, setCopyrightFontSize] = useState('0.875rem');
  const [copyrightFontWeight, setCopyrightFontWeight] = useState<number>(400);

  // Toast state
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  // Preview visibility state
  const [showPreview, setShowPreview] = useState(false);
  
  const configApiEndpoint = useMemo(
    () =>
      `/api/footer-config?restaurant_id=${encodeURIComponent(restaurantId)}`,
    [restaurantId],
  );

  const { config, loading, error: fetchError } = useFooterConfig({
    apiEndpoint: configApiEndpoint,
  });
  const { updateFooter, updating, error: updateError } = useUpdateFooterConfig();
  
  // Validate that restaurant ID is provided
  if (!restaurantId) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#dc2626' }}>
        <h2>Error</h2>
        <p>Restaurant ID is required. Please provide it via URL parameter.</p>
      </div>
    );
  }

  // Initialize form with fetched config
  useEffect(() => {
    if (config) {
      setLayout(config.layout || 'columns-4');
      setAboutContent(config.aboutContent || '');
      setEmail(config.email || '');
      setPhone(config.phone || '');
      setAddress(config.address || '');
      setBgColor(config.bgColor || '#1f2937');
      setTextColor(config.textColor || '#f9fafb');
      setLinkColor(config.linkColor || '#9ca3af');
      setCopyrightBgColor(config.copyrightBgColor || '#000000');
      setCopyrightTextColor(config.copyrightTextColor || '#ffffff');
      setShowNewsletter(config.showNewsletter || false);
      setShowSocialMedia(config.showSocialMedia !== false);
      setFontFamily(config.fontFamily || 'Inter, system-ui, sans-serif');
      setFontSize(config.fontSize || '0.9375rem');
      setFontWeight(config.fontWeight || 400);
      setTextTransform(config.textTransform || 'none');
      setHeadingFontFamily(config.headingFontFamily || 'Inter, system-ui, sans-serif');
      setHeadingFontSize(config.headingFontSize || '1.125rem');
      setHeadingFontWeight(config.headingFontWeight || 600);
      setHeadingTextTransform(config.headingTextTransform || 'uppercase');
      setCopyrightFontFamily(config.copyrightFontFamily || 'Inter, system-ui, sans-serif');
      setCopyrightFontSize(config.copyrightFontSize || '0.875rem');
      setCopyrightFontWeight(config.copyrightFontWeight || 400);
    }
  }, [config]);

  // Automatically disable newsletter when default layout is selected
  // Automatically enable newsletter when restaurant or columns-4 layout is selected
  useEffect(() => {
    if (layout === 'default') {
      setShowNewsletter(false);
    } else if (layout === 'restaurant' || layout === 'columns-4') {
      setShowNewsletter(true);
    }
  }, [layout]);

  // Load Google Fonts dynamically for preview
  useEffect(() => {
    const fontsToLoad = new Set<string>();

    // Extract font names from font families
    const extractFontName = (fontFamily: string) => {
      const fontName = fontFamily.split(',')[0].trim().replace(/['"]/g, '');
      // Only load Google Fonts (exclude system fonts)
      if (!['Inter', 'Arial', 'Helvetica', 'system-ui', 'sans-serif', 'serif'].includes(fontName)) {
        return fontName;
      }
      return null;
    };

    const contentFont = extractFontName(fontFamily);
    const headingFont = extractFontName(headingFontFamily);
    const copyrightFont = extractFontName(copyrightFontFamily);

    if (contentFont) fontsToLoad.add(contentFont);
    if (headingFont) fontsToLoad.add(headingFont);
    if (copyrightFont) fontsToLoad.add(copyrightFont);

    if (fontsToLoad.size > 0) {
      // Create Google Fonts link
      const fontFamilies = Array.from(fontsToLoad)
        .map(font => font.replace(/ /g, '+'))
        .join('&family=');

      const link = document.createElement('link');
      link.href = `https://fonts.googleapis.com/css2?family=${fontFamilies}&display=swap`;
      link.rel = 'stylesheet';
      document.head.appendChild(link);

      return () => {
        document.head.removeChild(link);
      };
    }
  }, [fontFamily, headingFontFamily, copyrightFontFamily]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!restaurantId) {
      setToastMessage('Restaurant ID not found. Please refresh the page.');
      setToastType('error');
      setShowToast(true);
      return;
    }

    try {
      await updateFooter({
        restaurant_id: restaurantId,
        layout,
        aboutContent,
        // restaurantName, email, phone, address and socialLinks are not saved here - they come from restaurant table
        bgColor,
        textColor,
        linkColor,
        copyrightBgColor,
        copyrightTextColor,
        showNewsletter: layout === 'default' ? false : (layout === 'restaurant' || layout === 'columns-4') ? true : showNewsletter, // Force newsletter off for default, on for restaurant and columns-4
        showSocialMedia,
        columns: config?.columns || [],
        fontFamily,
        fontSize,
        fontWeight,
        textTransform,
        headingFontFamily,
        headingFontSize,
        headingFontWeight,
        headingTextTransform,
        copyrightFontFamily,
        copyrightFontSize,
        copyrightFontWeight,
      });

      setToastMessage('Footer settings saved successfully!');
      setToastType('success');
      setShowToast(true);
    } catch (err) {
      console.error('Failed to update footer:', err);
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
              <h1 className={styles.formTitle}>Footer Settings</h1>
              <p className={styles.formSubtitle}>Customize your website footer</p>
              {/* {restaurantNameFromQuery && (
                <p className={styles.formSubtitle}>
                  Restaurant: {restaurantNameFromQuery}
                </p>
              )} */}
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
            {/* Layout Section */}
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>
                <span className={styles.sectionIcon}>⚙</span>
                Layout Configuration
              </h3>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Layout Type
                  <span className={styles.labelHint}>Choose a footer style</span>
                </label>

                <div className={styles.layoutGrid}>
                  {/* Default Layout */}
                  <div
                    className={`${styles.layoutCard} ${layout === 'default' ? styles.layoutCardActive : ''}`}
                    onClick={() => setLayout('default')}
                  >
                    <div className={styles.layoutPreview}>
                      <div className={styles.layoutPreviewFooter}>
                        <div className={styles.layoutPreviewSection}></div>
                        <div className={styles.layoutPreviewSection}></div>
                        <div className={styles.layoutPreviewSection}></div>
                      </div>
                    </div>
                    <div className={styles.layoutCardName}>Three Section</div>
                    <div className={styles.layoutCardDesc}>Brand, Location, Contact</div>
                  </div>

                  {/* Centered Layout */}
                  <div
                    className={`${styles.layoutCard} ${layout === 'centered' ? styles.layoutCardActive : ''}`}
                    onClick={() => setLayout('centered')}
                  >
                    <div className={styles.layoutPreview}>
                      <div className={styles.layoutPreviewFooterCentered}>
                        <div className={styles.layoutPreviewSectionCenter}></div>
                      </div>
                    </div>
                    <div className={styles.layoutCardName}>Centered</div>
                    <div className={styles.layoutCardDesc}>All Centered</div>
                  </div>

                  {/* Restaurant Layout */}
                  <div
                    className={`${styles.layoutCard} ${layout === 'restaurant' ? styles.layoutCardActive : ''}`}
                    onClick={() => setLayout('restaurant')}
                  >
                    <div className={styles.layoutPreview}>
                      <div className={styles.layoutPreviewFooterRestaurant}>
                        <div className={styles.layoutPreviewSection}></div>
                        <div className={styles.layoutPreviewSection}></div>
                        <div className={styles.layoutPreviewSection}></div>
                        <div className={styles.layoutPreviewSection}></div>
                      </div>
                    </div>
                    <div className={styles.layoutCardName}>Restaurant</div>
                    <div className={styles.layoutCardDesc}>4 Columns + Nav</div>
                  </div>

                  {/* 4 Columns Layout */}
                  <div
                    className={`${styles.layoutCard} ${layout === 'columns-4' ? styles.layoutCardActive : ''}`}
                    onClick={() => setLayout('columns-4')}
                  >
                    <div className={styles.layoutPreview}>
                      <div className={styles.layoutPreviewFooterRestaurant}>
                        <div className={styles.layoutPreviewSection}></div>
                        <div className={styles.layoutPreviewSection}></div>
                        <div className={styles.layoutPreviewSection}></div>
                        <div className={styles.layoutPreviewSection}></div>
                      </div>
                    </div>
                    <div className={styles.layoutCardName}>4 Columns</div>
                    <div className={styles.layoutCardDesc}>Wide Layout</div>
                  </div>

                </div>
              </div>
            </div>

            {/* Branding Section */}
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>
                <span className={styles.sectionIcon}>🏢</span>
                Branding & Info
              </h3>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  About Content
                  <span className={styles.labelHint}>Description about your business</span>
                </label>
                <textarea
                  value={aboutContent}
                  onChange={(e) => setAboutContent(e.target.value)}
                  className={styles.textArea}
                  placeholder="Experience fine dining at its best. We offer premium quality food with exceptional service."
                  rows={4}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Show Social Media
                  <span className={styles.labelHint}>Display social media links</span>
                </label>
                <label className={styles.toggleSwitch}>
                  <input
                    type="checkbox"
                    checked={showSocialMedia}
                    onChange={(e) => setShowSocialMedia(e.target.checked)}
                    className={styles.toggleInput}
                  />
                  <span className={styles.toggleSlider}></span>
                </label>
              </div>
            </div>

            {/* Styling Section */}
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>
                <span className={styles.sectionIcon}>🎨</span>
                Colors & Styling
              </h3>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Background Color
                  <span className={styles.labelHint}>Footer background</span>
                </label>
                <div className={styles.colorInputGroup}>
                  <input
                    type="color"
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    className={styles.colorInput}
                  />
                  <input
                    type="text"
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    className={styles.colorHexInput}
                    placeholder="#1f2937"
                  />
                  <button
                    type="button"
                    onClick={() => setBgColor('#1f2937')}
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
                  <span className={styles.labelHint}>Main text color</span>
                </label>
                <div className={styles.colorInputGroup}>
                  <input
                    type="color"
                    value={textColor}
                    onChange={(e) => setTextColor(e.target.value)}
                    className={styles.colorInput}
                  />
                  <input
                    type="text"
                    value={textColor}
                    onChange={(e) => setTextColor(e.target.value)}
                    className={styles.colorHexInput}
                    placeholder="#f9fafb"
                  />
                  <button
                    type="button"
                    onClick={() => setTextColor('#f9fafb')}
                    className={styles.clearButton}
                    title="Reset to default"
                  >
                    ↺
                  </button>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Link Color
                  <span className={styles.labelHint}>Footer link color</span>
                </label>
                <div className={styles.colorInputGroup}>
                  <input
                    type="color"
                    value={linkColor}
                    onChange={(e) => setLinkColor(e.target.value)}
                    className={styles.colorInput}
                  />
                  <input
                    type="text"
                    value={linkColor}
                    onChange={(e) => setLinkColor(e.target.value)}
                    className={styles.colorHexInput}
                    placeholder="#9ca3af"
                  />
                  <button
                    type="button"
                    onClick={() => setLinkColor('#9ca3af')}
                    className={styles.clearButton}
                    title="Reset to default"
                  >
                    ↺
                  </button>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Copyright Background
                  <span className={styles.labelHint}>Copyright section background</span>
                </label>
                <div className={styles.colorInputGroup}>
                  <input
                    type="color"
                    value={copyrightBgColor}
                    onChange={(e) => setCopyrightBgColor(e.target.value)}
                    className={styles.colorInput}
                  />
                  <input
                    type="text"
                    value={copyrightBgColor}
                    onChange={(e) => setCopyrightBgColor(e.target.value)}
                    className={styles.colorHexInput}
                    placeholder="#000000"
                  />
                  <button
                    type="button"
                    onClick={() => setCopyrightBgColor('#000000')}
                    className={styles.clearButton}
                    title="Reset to default"
                  >
                    ↺
                  </button>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Copyright Text Color
                  <span className={styles.labelHint}>Copyright section text</span>
                </label>
                <div className={styles.colorInputGroup}>
                  <input
                    type="color"
                    value={copyrightTextColor}
                    onChange={(e) => setCopyrightTextColor(e.target.value)}
                    className={styles.colorInput}
                  />
                  <input
                    type="text"
                    value={copyrightTextColor}
                    onChange={(e) => setCopyrightTextColor(e.target.value)}
                    className={styles.colorHexInput}
                    placeholder="#ffffff"
                  />
                  <button
                    type="button"
                    onClick={() => setCopyrightTextColor('#ffffff')}
                    className={styles.clearButton}
                    title="Reset to default"
                  >
                    ↺
                  </button>
                </div>
              </div>
            </div>

            {/* Content Text Font Styling */}
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>
                <span className={styles.sectionIcon}>🔤</span>
                Content Text Font Styling
              </h3>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Font Family
                  <span className={styles.labelHint}>Choose content text font</span>
                </label>
                <select
                  value={fontFamily}
                  onChange={(e) => setFontFamily(e.target.value)}
                  className={styles.select}
                >
                  {FONT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value} style={{ fontFamily: option.value }}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.colorFieldsGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    Font Size
                    <span className={styles.labelHint}>Content text size</span>
                  </label>
                  <select
                    value={fontSize}
                    onChange={(e) => setFontSize(e.target.value)}
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
                    <span className={styles.labelHint}>Content text weight</span>
                  </label>
                  <select
                    value={fontWeight}
                    onChange={(e) => setFontWeight(Number(e.target.value))}
                    className={styles.select}
                  >
                    {FONT_WEIGHT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Text Transform
                  <span className={styles.labelHint}>Content text case</span>
                </label>
                <select
                  value={textTransform}
                  onChange={(e) => setTextTransform(e.target.value as 'none' | 'uppercase' | 'lowercase' | 'capitalize')}
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

            {/* Heading Text Font Styling */}
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>
                <span className={styles.sectionIcon}>📝</span>
                Heading Text Font Styling
              </h3>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Font Family
                  <span className={styles.labelHint}>Choose heading font</span>
                </label>
                <select
                  value={headingFontFamily}
                  onChange={(e) => setHeadingFontFamily(e.target.value)}
                  className={styles.select}
                >
                  {FONT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value} style={{ fontFamily: option.value }}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.colorFieldsGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    Font Size
                    <span className={styles.labelHint}>Heading text size (larger)</span>
                  </label>
                  <select
                    value={headingFontSize}
                    onChange={(e) => setHeadingFontSize(e.target.value)}
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
                    <span className={styles.labelHint}>Heading text weight</span>
                  </label>
                  <select
                    value={headingFontWeight}
                    onChange={(e) => setHeadingFontWeight(Number(e.target.value))}
                    className={styles.select}
                  >
                    {FONT_WEIGHT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Text Transform
                  <span className={styles.labelHint}>Heading text case</span>
                </label>
                <select
                  value={headingTextTransform}
                  onChange={(e) => setHeadingTextTransform(e.target.value as 'none' | 'uppercase' | 'lowercase' | 'capitalize')}
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

            {/* Copyright Text Font Styling */}
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>
                <span className={styles.sectionIcon}>©️</span>
                Copyright Text Font Styling
              </h3>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Font Family
                  <span className={styles.labelHint}>Choose copyright font</span>
                </label>
                <select
                  value={copyrightFontFamily}
                  onChange={(e) => setCopyrightFontFamily(e.target.value)}
                  className={styles.select}
                >
                  {FONT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value} style={{ fontFamily: option.value }}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.colorFieldsGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    Font Size
                    <span className={styles.labelHint}>Copyright text size</span>
                  </label>
                  <select
                    value={copyrightFontSize}
                    onChange={(e) => setCopyrightFontSize(e.target.value)}
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
                    <span className={styles.labelHint}>Copyright text weight</span>
                  </label>
                  <select
                    value={copyrightFontWeight}
                    onChange={(e) => setCopyrightFontWeight(Number(e.target.value))}
                    className={styles.select}
                  >
                    {FONT_WEIGHT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Additional Options - hide for Three Section (default), Restaurant (4 Columns + Nav), and 4 Columns layouts */}
            {layout !== 'default' && layout !== 'restaurant' && layout !== 'columns-4' && (
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>
                  <span className={styles.sectionIcon}>⚡</span>
                  Additional Options
                </h3>

                {/* Newsletter option */}
                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    Newsletter Signup
                    <span className={styles.labelHint}>Show newsletter form</span>
                  </label>
                  <label className={styles.toggleSwitch}>
                    <input
                      type="checkbox"
                      checked={showNewsletter}
                      onChange={(e) => setShowNewsletter(e.target.checked)}
                      className={styles.toggleInput}
                    />
                    <span className={styles.toggleSlider}></span>
                  </label>
                </div>
              </div>
            )}

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
              <h2 className={styles.previewModalTitle}>Footer Live Preview</h2>
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
              <div className={styles.previewDevice}>
                <div className={styles.previewContainer}>
                  <Footer
                    restaurantName={config?.restaurantName || 'Antler Foods'}
                    aboutContent={aboutContent}
                    email={email}
                    phone={phone}
                    address={address}
                    socialLinks={config?.socialLinks || [
                      { platform: 'facebook', url: 'https://facebook.com', order: 1 },
                      { platform: 'instagram', url: 'https://instagram.com', order: 2 },
                      { platform: 'twitter', url: 'https://twitter.com', order: 3 },
                    ]}
                    columns={config?.columns || []}
                    showSocialMedia={showSocialMedia}
                    showNewsletter={showNewsletter}
                    layout={layout}
                    bgColor={bgColor}
                    textColor={textColor}
                    linkColor={linkColor}
                    copyrightBgColor={copyrightBgColor}
                    copyrightTextColor={copyrightTextColor}
                    fontFamily={fontFamily}
                    fontSize={fontSize}
                    fontWeight={fontWeight}
                    textTransform={textTransform}
                    headingFontFamily={headingFontFamily}
                    headingFontSize={headingFontSize}
                    headingFontWeight={headingFontWeight}
                    headingTextTransform={headingTextTransform}
                    copyrightFontFamily={copyrightFontFamily}
                    copyrightFontSize={copyrightFontSize}
                    copyrightFontWeight={copyrightFontWeight}
                  />
                </div>
              </div>
              <p className={styles.previewNote}>
                <span className={styles.previewIcon}>👁</span>
                Preview shows how your footer will appear on the website
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
