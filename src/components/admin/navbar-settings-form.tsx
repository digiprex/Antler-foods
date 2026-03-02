/**
 * Navbar Settings Form
 *
 * Enhanced interface for configuring navbar settings:
 * - Layout/Type selection
 * - Position
 * - Background color
 * - Text color
 * - Order online button toggle
 * - Order online button text
 * - Live preview on the right side
 */

'use client';

import { useState, useEffect } from 'react';
import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useNavbarConfig, useUpdateNavbarConfig } from '@/hooks/use-navbar-config';
import type { NavbarConfig } from '@/types/navbar.types';
import Navbar from '@/components/navbar';
import Toast from '@/components/ui/toast';
import styles from './navbar-settings-form.module.css';

// Font options for navbar menu text
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
  { value: '1rem', label: 'Base (16px)' },
  { value: '1.125rem', label: 'Medium (18px)' },
  { value: '1.25rem', label: 'Large (20px)' },
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

export default function NavbarSettingsForm() {
  const searchParams = useSearchParams();
  const restaurantIdFromQuery = searchParams.get('restaurant_id')?.trim() ?? '';
  const restaurantNameFromQuery =
    searchParams.get('restaurant_name')?.trim() ?? '';
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
    () =>
      `/api/navbar-config?restaurant_id=${encodeURIComponent(restaurantId)}`,
    [restaurantId],
  );

  const { config, loading, error: fetchError } = useNavbarConfig({
    apiEndpoint: configApiEndpoint,
  });
  const { updateNavbar, updating, error: updateError } = useUpdateNavbarConfig();

  // Form state
  const [layout, setLayout] = useState<NonNullable<NavbarConfig['layout']>>(
    'bordered-centered',
  );
  const [position, setPosition] = useState<
    NonNullable<NavbarConfig['position']>
  >('absolute');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [textColor, setTextColor] = useState('#000000');
  const [logoSize, setLogoSize] = useState<number>(40);
  const [fontFamily, setFontFamily] = useState('Inter, system-ui, sans-serif');
  const [fontSize, setFontSize] = useState('1rem');
  const [fontWeight, setFontWeight] = useState<number>(400);
  const [textTransform, setTextTransform] = useState<'none' | 'uppercase' | 'lowercase' | 'capitalize'>('uppercase');
  const [showOrderButton, setShowOrderButton] = useState(true);
  const [orderButtonText, setOrderButtonText] = useState('Order Online');
  const [orderButtonHref, setOrderButtonHref] = useState('/menu');
  const [buttonStyle, setButtonStyle] = useState<'primary' | 'secondary'>('primary');
  
  // Toast state
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  // Preview visibility state
  const [showPreview, setShowPreview] = useState(false);

  // Load Google Fonts dynamically
  useEffect(() => {
    // Check if fonts are already loaded
    const existingLink = document.getElementById('navbar-google-fonts');
    if (!existingLink) {
      const link = document.createElement('link');
      link.id = 'navbar-google-fonts';
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Roboto:wght@300;400;500;700&family=Open+Sans:wght@300;400;600;700&family=Lato:wght@300;400;700&family=Montserrat:wght@300;400;500;600;700&family=Poppins:wght@300;400;500;600;700&family=Playfair+Display:wght@400;500;600;700&family=Merriweather:wght@300;400;700&display=swap';
      document.head.appendChild(link);
    }
  }, []);

  // Initialize form with fetched config
  useEffect(() => {
    if (config) {
      setLayout(config.layout || 'bordered-centered');
      setPosition(config.position || 'absolute');
      setBgColor(config.bgColor || '#ffffff');
      setTextColor(config.textColor || '#000000');
      setLogoSize(config.logoSize || 40);
      setFontFamily(config.fontFamily || 'Inter, system-ui, sans-serif');
      setFontSize(config.fontSize || '1rem');
      setFontWeight(config.fontWeight || 400);
      setTextTransform(config.textTransform || 'uppercase');
      setShowOrderButton(!!config.ctaButton);
      setOrderButtonText(config.ctaButton?.label || 'Order Online');
      setOrderButtonHref(config.ctaButton?.href || '/menu');
      setButtonStyle(config.ctaButton?.style || 'primary');
    }
  }, [config]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!restaurantId) {
      setToastMessage('Restaurant ID not found. Please refresh the page.');
      setToastType('error');
      setShowToast(true);
      return;
    }

    try {
      // Show immediate success feedback without waiting for refetch
      await updateNavbar({
        restaurant_id: restaurantId,
        layout,
        position,
        bgColor,
        textColor,
        logoSize,
        fontFamily,
        fontSize,
        fontWeight,
        textTransform,
        ctaButton: showOrderButton
          ? {
              label: orderButtonText,
              href: orderButtonHref,
              style: buttonStyle,
            }
          : undefined,
      });

      setToastMessage('Navbar settings saved successfully!');
      setToastType('success');
      setShowToast(true);
      // Removed refetch() - no need to fetch again since we already have the latest data
    } catch (err) {
      console.error('Failed to update navbar:', err);
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
              <h1 className={styles.formTitle}>Navigation Bar Settings</h1>
              <p className={styles.formSubtitle}>Customize your website navigation</p>
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

              {/* Type/Layout */}
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Layout Type
                  <span className={styles.labelHint}>Choose a navigation style</span>
                </label>
                <div className={styles.layoutCardGrid}>
                  {/* Default Layout */}
                  <div
                    className={`${styles.layoutCard} ${layout === 'default' ? styles.layoutCardActive : ''}`}
                    onClick={() => setLayout('default')}
                  >
                    <div className={styles.layoutPreview}>
                      <div className={styles.layoutPreviewNav}>
                        <div className={styles.layoutPreviewLogo}></div>
                        <div className={styles.layoutPreviewItems}>
                          <div className={styles.layoutPreviewItem}></div>
                          <div className={styles.layoutPreviewItem}></div>
                          <div className={styles.layoutPreviewItem}></div>
                        </div>
                        <div className={styles.layoutPreviewButton}></div>
                      </div>
                    </div>
                    <div className={styles.layoutCardName}>Default</div>
                    <div className={styles.layoutCardDesc}>Standard Navigation</div>
                  </div>

                  {/* Centered Layout */}
                  <div
                    className={`${styles.layoutCard} ${layout === 'centered' ? styles.layoutCardActive : ''}`}
                    onClick={() => setLayout('centered')}
                  >
                    <div className={styles.layoutPreview}>
                      <div className={styles.layoutPreviewNav}>
                        <div className={styles.layoutPreviewLogo}></div>
                        <div className={styles.layoutPreviewItemsCentered}>
                          <div className={styles.layoutPreviewItem}></div>
                          <div className={styles.layoutPreviewItem}></div>
                          <div className={styles.layoutPreviewItem}></div>
                        </div>
                        <div className={styles.layoutPreviewButton}></div>
                      </div>
                    </div>
                    <div className={styles.layoutCardName}>Centered</div>
                    <div className={styles.layoutCardDesc}>All Items Center</div>
                  </div>

                  {/* Logo Center Layout */}
                  <div
                    className={`${styles.layoutCard} ${layout === 'logo-center' ? styles.layoutCardActive : ''}`}
                    onClick={() => setLayout('logo-center')}
                  >
                    <div className={styles.layoutPreview}>
                      <div className={styles.layoutPreviewNav}>
                        <div className={styles.layoutPreviewItems}>
                          <div className={styles.layoutPreviewItem}></div>
                          <div className={styles.layoutPreviewItem}></div>
                        </div>
                        <div className={styles.layoutPreviewLogoCenter}></div>
                        <div className={styles.layoutPreviewItems}>
                          <div className={styles.layoutPreviewItem}></div>
                          <div className={styles.layoutPreviewButton}></div>
                        </div>
                      </div>
                    </div>
                    <div className={styles.layoutCardName}>Logo Center</div>
                    <div className={styles.layoutCardDesc}>Logo in Middle</div>
                  </div>

                  {/* Bordered Centered Layout */}
                  <div
                    className={`${styles.layoutCard} ${layout === 'bordered-centered' ? styles.layoutCardActive : ''}`}
                    onClick={() => setLayout('bordered-centered')}
                  >
                    <div className={styles.layoutPreview}>
                      <div className={`${styles.layoutPreviewNav} ${styles.layoutPreviewNavBordered}`}>
                        <div className={styles.layoutPreviewLogo}></div>
                        <div className={styles.layoutPreviewItemsCentered}>
                          <div className={styles.layoutPreviewItem}></div>
                          <div className={styles.layoutPreviewItem}></div>
                          <div className={styles.layoutPreviewItem}></div>
                        </div>
                        <div className={styles.layoutPreviewButton}></div>
                      </div>
                    </div>
                    <div className={styles.layoutCardName}>Bordered Centered</div>
                    <div className={styles.layoutCardDesc}>With Border</div>
                  </div>

                  {/* Stacked Layout */}
                  <div
                    className={`${styles.layoutCard} ${layout === 'stacked' ? styles.layoutCardActive : ''}`}
                    onClick={() => setLayout('stacked')}
                  >
                    <div className={styles.layoutPreview}>
                      <div className={styles.layoutPreviewNavStacked}>
                        <div className={styles.layoutPreviewLogoCenter}></div>
                        <div className={styles.layoutPreviewItemsRow}>
                          <div className={styles.layoutPreviewItem}></div>
                          <div className={styles.layoutPreviewItem}></div>
                          <div className={styles.layoutPreviewItem}></div>
                          <div className={styles.layoutPreviewButton}></div>
                        </div>
                      </div>
                    </div>
                    <div className={styles.layoutCardName}>Stacked</div>
                    <div className={styles.layoutCardDesc}>Vertical Layout</div>
                  </div>

                  {/* Split Layout */}
                  <div
                    className={`${styles.layoutCard} ${layout === 'split' ? styles.layoutCardActive : ''}`}
                    onClick={() => setLayout('split')}
                  >
                    <div className={styles.layoutPreview}>
                      <div className={styles.layoutPreviewNav}>
                        <div className={styles.layoutPreviewItems}>
                          <div className={styles.layoutPreviewItem}></div>
                          <div className={styles.layoutPreviewItem}></div>
                        </div>
                        <div className={styles.layoutPreviewLogoCenter}></div>
                        <div className={styles.layoutPreviewItems}>
                          <div className={styles.layoutPreviewItem}></div>
                          <div className={styles.layoutPreviewButton}></div>
                        </div>
                      </div>
                    </div>
                    <div className={styles.layoutCardName}>Split</div>
                    <div className={styles.layoutCardDesc}>Left & Right Aligned</div>
                  </div>
                </div>
              </div>

              {/* Position */}
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Position
                  <span className={styles.labelHint}>Scroll behavior</span>
                </label>
                <div className={styles.radioGroup}>
                  <label className={styles.radioLabel}>
                    <input
                      type="radio"
                      value="absolute"
                      checked={position === 'absolute'}
                      onChange={(e) => setPosition(e.target.value as any)}
                      className={styles.radioInput}
                    />
                    <span className={styles.radioButton}></span>
                    <span className={styles.radioText}>
                      <strong>Absolute</strong>
                      <small>Scrolls with page</small>
                    </span>
                  </label>
                  <label className={styles.radioLabel}>
                    <input
                      type="radio"
                      value="fixed"
                      checked={position === 'fixed'}
                      onChange={(e) => setPosition(e.target.value as any)}
                      className={styles.radioInput}
                    />
                    <span className={styles.radioButton}></span>
                    <span className={styles.radioText}>
                      <strong>Fixed</strong>
                      <small>Stays at top</small>
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* Styling Section */}
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>
                <span className={styles.sectionIcon}>🎨</span>
                Colors & Styling
              </h3>

              <div className={styles.colorFieldsGrid}>
                {/* Background Color */}
                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    Background Color
                    <span className={styles.labelHint}>Navbar background</span>
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
                      placeholder="#ffffff"
                    />
                    <button
                      type="button"
                      onClick={() => setBgColor('#ffffff')}
                      className={styles.clearButton}
                      title="Reset to default"
                    >
                      ↺
                    </button>
                  </div>
                </div>

                {/* Text Color */}
                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    Text Color
                    <span className={styles.labelHint}>Link and text color</span>
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
                      placeholder="#000000"
                    />
                    <button
                      type="button"
                      onClick={() => setTextColor('#000000')}
                      className={styles.clearButton}
                      title="Reset to default"
                    >
                      ↺
                    </button>
                  </div>
                </div>
              </div>

              {/* Current Logo Display */}
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Restaurant Logo
                  <span className={styles.labelHint}>Logo from restaurant settings</span>
                </label>
                <div className={styles.logoPreview}>
                  {config?.logoUrl ? (
                    <div className={styles.logoPreviewContainer}>
                      <img
                        src={config.logoUrl}
                        alt={config.restaurantName || 'Restaurant Logo'}
                        className={styles.logoPreviewImage}
                        style={{ height: `${logoSize}px` }}
                      />
                      <span className={styles.logoPreviewName}>{config.restaurantName}</span>
                    </div>
                  ) : (
                    <div className={styles.logoPreviewPlaceholder}>
                      <div className={styles.logoInitialsPreview}>
                        {config?.restaurantName
                          ? config.restaurantName
                              .split(' ')
                              .map(word => word[0])
                              .join('')
                              .toUpperCase()
                              .slice(0, 3)
                          : 'R'}
                      </div>
                      <span className={styles.logoPreviewName}>
                        {config?.restaurantName || 'Restaurant'} (Initials)
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Logo Size */}
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Logo Size
                  <span className={styles.labelHint}>Height in pixels (20-100)</span>
                </label>
                <div className={styles.rangeInputGroup}>
                  <div className={styles.rangeSliderWrapper} style={{ '--range-value': `${((logoSize - 20) / 80) * 100}%` } as React.CSSProperties}>
                    <input
                      type="range"
                      min="20"
                      max="100"
                      value={logoSize}
                      onChange={(e) => setLogoSize(parseInt(e.target.value))}
                      className={styles.rangeInput}
                    />
                  </div>
                  <input
                    type="number"
                    min="20"
                    max="100"
                    value={logoSize}
                    onChange={(e) => setLogoSize(parseInt(e.target.value))}
                    className={styles.numberInput}
                  />
                  <span className={styles.rangeUnit}>px</span>
                </div>
              </div>

              {/* Font Family */}
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Menu Font
                  <span className={styles.labelHint}>Font family for menu items</span>
                </label>
                <select
                  value={fontFamily}
                  onChange={(e) => setFontFamily(e.target.value)}
                  className={styles.select}
                  style={{ fontFamily: fontFamily }}
                >
                  {FONT_OPTIONS.map((option) => (
                    <option
                      key={option.value}
                      value={option.value}
                      style={{ fontFamily: option.value }}
                    >
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Font Size and Weight Grid */}
              <div className={styles.colorFieldsGrid}>
                {/* Font Size */}
                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    Menu Font Size
                    <span className={styles.labelHint}>Text size</span>
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

                {/* Font Weight */}
                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    Menu Font Weight
                    <span className={styles.labelHint}>Text boldness</span>
                  </label>
                  <select
                    value={fontWeight}
                    onChange={(e) => setFontWeight(parseInt(e.target.value))}
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

              {/* Text Transform */}
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Menu Text Style
                  <span className={styles.labelHint}>Letter casing</span>
                </label>
                <select
                  value={textTransform}
                  onChange={(e) => setTextTransform(e.target.value as any)}
                  className={styles.select}
                >
                  {TEXT_TRANSFORM_OPTIONS.map((option) => (
                    <option
                      key={option.value}
                      value={option.value}
                      style={{ textTransform: option.value as any }}
                    >
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* CTA Button Section */}
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>
                <span className={styles.sectionIcon}>🔘</span>
                Call-to-Action Button
              </h3>

              {/* Online Ordering Button Toggle */}
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Show CTA Button
                  <span className={styles.labelHint}>Display action button</span>
                </label>
                <label className={styles.toggleSwitch}>
                  <input
                    type="checkbox"
                    checked={showOrderButton}
                    onChange={(e) => setShowOrderButton(e.target.checked)}
                    className={styles.toggleInput}
                  />
                  <span className={styles.toggleSlider}></span>
                </label>
              </div>

              {/* Button Style & Settings (shown when toggle is on) */}
              {showOrderButton && (
                <>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>
                      Button Style
                      <span className={styles.labelHint}>Visual appearance</span>
                    </label>
                    <div className={styles.radioGroup}>
                      <label className={styles.radioLabel}>
                        <input
                          type="radio"
                          value="primary"
                          checked={buttonStyle === 'primary'}
                          onChange={(e) => setButtonStyle(e.target.value as 'primary' | 'secondary')}
                          className={styles.radioInput}
                        />
                        <span className={styles.radioButton}></span>
                        <span className={styles.radioText}>
                          <strong>Primary</strong>
                          <small>Filled button</small>
                        </span>
                      </label>
                      <label className={styles.radioLabel}>
                        <input
                          type="radio"
                          value="secondary"
                          checked={buttonStyle === 'secondary'}
                          onChange={(e) => setButtonStyle(e.target.value as 'primary' | 'secondary')}
                          className={styles.radioInput}
                        />
                        <span className={styles.radioButton}></span>
                        <span className={styles.radioText}>
                          <strong>Secondary</strong>
                          <small>Outlined button</small>
                        </span>
                      </label>
                    </div>
                  </div>

                  <div className={styles.buttonSettings}>
                    <div className={styles.formGroup}>
                      <label className={styles.label}>
                        Button Text
                        <span className={styles.labelHint}>What the button says</span>
                      </label>
                      <input
                        type="text"
                        value={orderButtonText}
                        onChange={(e) => setOrderButtonText(e.target.value)}
                        className={styles.textInput}
                        placeholder="Order Online"
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.label}>
                        Button Link
                        <span className={styles.labelHint}>Where it navigates</span>
                      </label>
                      <input
                        type="text"
                        value={orderButtonHref}
                        onChange={(e) => setOrderButtonHref(e.target.value)}
                        className={styles.textInput}
                        placeholder="/menu"
                      />
                    </div>
                  </div>
                </>
              )}
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
              <h2 className={styles.previewModalTitle}>Navbar Live Preview</h2>
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
                  <Navbar
                    key={`${bgColor}-${textColor}-${showOrderButton}-${logoSize}`}
                    restaurantName={config?.restaurantName || 'Restaurant Name'}
                    logoUrl={config?.logoUrl}
                    logoSize={logoSize}
                    leftNavItems={config?.leftNavItems || [
                      { label: 'Menu', href: '#menu' },
                      { label: 'About', href: '#about' },
                      { label: 'Contact', href: '#contact' },
                    ]}
                    rightNavItems={config?.rightNavItems || []}
                    ctaButton={
                      showOrderButton
                        ? {
                            label: orderButtonText,
                            href: orderButtonHref,
                          }
                        : undefined
                    }
                    layout={layout}
                    position="relative"
                    bgColor={bgColor}
                    textColor={textColor}
                    buttonBgColor="#000000"
                    buttonTextColor="#ffffff"
                    fontFamily={fontFamily}
                    fontSize={fontSize}
                    fontWeight={fontWeight}
                    textTransform={textTransform}
                  />
                </div>
              </div>
              <p className={styles.previewNote}>
                <span className={styles.previewIcon}>👁</span>
                Preview shows how your navbar will appear on the website
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
