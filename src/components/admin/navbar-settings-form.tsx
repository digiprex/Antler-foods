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

  // Initialize form with fetched config
  useEffect(() => {
    if (config) {
      setLayout(config.layout || 'bordered-centered');
      setPosition(config.position || 'absolute');
      setBgColor(config.bgColor || '#ffffff');
      setTextColor(config.textColor || '#000000');
      setLogoSize(config.logoSize || 40);
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
