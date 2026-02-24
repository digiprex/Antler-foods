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

const DEFAULT_RESTAURANT_ID = '92e9160e-0afa-4f78-824f-b28e32885353';

export default function NavbarSettingsForm() {
  const searchParams = useSearchParams();
  const restaurantIdFromQuery = searchParams.get('restaurant_id')?.trim() ?? '';
  const restaurantNameFromQuery =
    searchParams.get('restaurant_name')?.trim() ?? '';
  const restaurantId = restaurantIdFromQuery || DEFAULT_RESTAURANT_ID;
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
  const [showOrderButton, setShowOrderButton] = useState(true);
  const [orderButtonText, setOrderButtonText] = useState('Order Online');
  const [orderButtonHref, setOrderButtonHref] = useState('/order');
  
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
      setShowOrderButton(!!config.ctaButton);
      setOrderButtonText(config.ctaButton?.label || 'Order Online');
      setOrderButtonHref(config.ctaButton?.href || '/order');
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
        ctaButton: showOrderButton
          ? {
              label: orderButtonText,
              href: orderButtonHref,
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
                <select
                  value={layout}
                  onChange={(e) => setLayout(e.target.value as any)}
                  className={styles.select}
                >
                  <option value="default">Default - Standard Navigation</option>
                  <option value="centered">Centered - All Items Center</option>
                  <option value="logo-center">Logo Center - Logo in Middle</option>
                  <option value="bordered-centered">Bordered Centered - With Border</option>
                  <option value="stacked">Stacked - Vertical Layout</option>
                  <option value="split">Split - Left & Right Aligned</option>
                </select>
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

              {/* Order Online Button Text (shown when toggle is on) */}
              {showOrderButton && (
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
                      placeholder="/order"
                    />
                  </div>
                </div>
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
                    key={`${bgColor}-${textColor}-${showOrderButton}`}
                    restaurantName={config?.restaurantName || 'Restaurant Name'}
                    logoUrl={config?.logoUrl}
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
