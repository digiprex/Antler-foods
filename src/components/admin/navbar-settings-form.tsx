/**
 * Simplified Navbar Settings Form
 * 
 * A clean form interface for configuring navbar settings:
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
import { useNavbarConfig, useUpdateNavbarConfig } from '@/hooks/use-navbar-config';
import Navbar from '@/components/navbar';
import styles from './navbar-settings-form.module.css';

export default function NavbarSettingsForm() {
  const { config, loading, error: fetchError, refetch } = useNavbarConfig();
  const { updateNavbar, updating, error: updateError } = useUpdateNavbarConfig();

  // Form state
  const [layout, setLayout] = useState<string>('bordered-centered');
  const [position, setPosition] = useState<string>('absolute');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [textColor, setTextColor] = useState('#000000');
  const [showOrderButton, setShowOrderButton] = useState(true);
  const [orderButtonText, setOrderButtonText] = useState('Order Online');
  const [orderButtonHref, setOrderButtonHref] = useState('/order');
  const [restaurantId] = useState<string>('92e9160e-0afa-4f78-824f-b28e32885353');

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
      alert('Restaurant ID not found. Please refresh the page.');
      return;
    }

    try {
      await updateNavbar({
        restaurant_id: restaurantId,
        layout: layout as any,
        position: position as any,
        bgColor,
        textColor,
        ctaButton: showOrderButton
          ? {
              label: orderButtonText,
              href: orderButtonHref,
            }
          : undefined,
      });

      alert('Navbar settings saved successfully!');
      refetch();
    } catch (err) {
      console.error('Failed to update navbar:', err);
      alert('Failed to save settings. Please try again.');
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
      <div className={styles.splitLayout}>
        {/* Settings Form - Left Side */}
        <div className={styles.formSection}>
          <div className={styles.formHeader}>
            <h1 className={styles.formTitle}>Navigation Bar</h1>
            <button
              type="button"
              className={styles.closeButton}
              onClick={() => window.history.back()}
            >
              ✕
            </button>
          </div>

          {fetchError && (
            <div className={styles.errorMessage}>
              Error loading settings: {fetchError}
            </div>
          )}

          {updateError && (
            <div className={styles.errorMessage}>
              Error saving settings: {updateError}
            </div>
          )}

          <form onSubmit={handleSubmit} className={styles.form}>
            {/* Type/Layout */}
            <div className={styles.formGroup}>
              <label className={styles.label}>Type:</label>
              <select
                value={layout}
                onChange={(e) => setLayout(e.target.value)}
                className={styles.select}
              >
                <option value="default">Option 1 - Default</option>
                <option value="centered">Option 2 - Centered</option>
                <option value="logo-center">Option 3 - Logo Center</option>
                <option value="bordered-centered">Option 4 - Bordered Centered</option>
                <option value="stacked">Option 5 - Stacked</option>
                <option value="split">Option 6 - Split</option>
              </select>
            </div>

            {/* Position */}
            <div className={styles.formGroup}>
              <label className={styles.label}>Position:</label>
              <select
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                className={styles.select}
              >
                <option value="absolute">Absolute</option>
                <option value="fixed">Fixed</option>
              </select>
            </div>

            {/* Background Color */}
            <div className={styles.formGroup}>
              <label className={styles.label}>Background Color:</label>
              <div className={styles.colorInputGroup}>
                <input
                  type="color"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  className={styles.colorInput}
                />
                <button
                  type="button"
                  onClick={() => setBgColor('#ffffff')}
                  className={styles.clearButton}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Text Color */}
            <div className={styles.formGroup}>
              <label className={styles.label}>Text Color:</label>
              <div className={styles.colorInputGroup}>
                <input
                  type="color"
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                  className={styles.colorInput}
                />
                <button
                  type="button"
                  onClick={() => setTextColor('#000000')}
                  className={styles.clearButton}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Online Ordering Button Toggle */}
            <div className={styles.formGroup}>
              <label className={styles.label}>Online Ordering Button:</label>
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
              <>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Order Online Button:</label>
                  <input
                    type="text"
                    value={orderButtonText}
                    onChange={(e) => setOrderButtonText(e.target.value)}
                    className={styles.textInput}
                    placeholder="Order Online"
                  />
                </div>
                
                <div className={styles.formGroup}>
                  <label className={styles.label}>Button Link:</label>
                  <input
                    type="text"
                    value={orderButtonHref}
                    onChange={(e) => setOrderButtonHref(e.target.value)}
                    className={styles.textInput}
                    placeholder="/order"
                  />
                </div>
              </>
            )}

            {/* Save Button */}
            <div className={styles.formActions}>
              <button
                type="submit"
                disabled={updating}
                className={styles.saveButton}
              >
                {updating ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        </div>

        {/* Preview - Right Side */}
        <div className={styles.previewSection}>
          <h2 className={styles.previewTitle}>Preview</h2>
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
              layout={layout as any}
              position="relative"
              bgColor={bgColor}
              textColor={textColor}
              buttonBgColor="#000000"
              buttonTextColor="#ffffff"
            />
          </div>
          <p className={styles.previewNote}>
            This is how your navbar will appear on the website
          </p>
        </div>
      </div>
    </div>
  );
}
