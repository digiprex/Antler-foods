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
import { useFooterConfig, useUpdateFooterConfig } from '@/hooks/use-footer-config';
import Footer from '@/components/footer';
import Toast from '@/components/ui/toast';
import styles from './footer-settings-form.module.css';

export default function FooterSettingsForm() {
  const { config, loading, error: fetchError } = useFooterConfig();
  const { updateFooter, updating, error: updateError } = useUpdateFooterConfig();

  // Form state
  const [layout, setLayout] = useState<string>('columns-3');
  const [aboutContent, setAboutContent] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [bgColor, setBgColor] = useState('#1f2937');
  const [textColor, setTextColor] = useState('#f9fafb');
  const [linkColor, setLinkColor] = useState('#9ca3af');
  const [showNewsletter, setShowNewsletter] = useState(false);
  const [showSocialMedia, setShowSocialMedia] = useState(true);
  const [showLocations, setShowLocations] = useState(true);
  const [restaurantId] = useState<string>('92e9160e-0afa-4f78-824f-b28e32885353');

  // Toast state
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  // Initialize form with fetched config
  useEffect(() => {
    if (config) {
      setLayout(config.layout || 'columns-3');
      setAboutContent(config.aboutContent || '');
      setEmail(config.email || '');
      setPhone(config.phone || '');
      setAddress(config.address || '');
      setBgColor(config.bgColor || '#1f2937');
      setTextColor(config.textColor || '#f9fafb');
      setLinkColor(config.linkColor || '#9ca3af');
      setShowNewsletter(config.showNewsletter || false);
      setShowSocialMedia(config.showSocialMedia !== false);
      setShowLocations(config.showLocations !== false);
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
      await updateFooter({
        restaurant_id: restaurantId,
        layout: layout as any,
        restaurantName: config?.restaurantName || 'Antler Foods',
        aboutContent,
        email: config?.email || '',
        phone: config?.phone || '',
        address: config?.address || '',
        bgColor,
        textColor,
        linkColor,
        showNewsletter,
        showSocialMedia,
        showLocations,
        columns: config?.columns || [],
        socialLinks: config?.socialLinks || [],
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

      <div className={styles.splitLayout}>
        {/* Settings Form - Left Side */}
        <div className={styles.formSection}>
          <div className={styles.formHeader}>
            <div>
              <h1 className={styles.formTitle}>Footer Settings</h1>
              <p className={styles.formSubtitle}>Customize your website footer</p>
            </div>
            <button
              type="button"
              className={styles.closeButton}
              onClick={() => window.history.back()}
              aria-label="Close"
            >
              ✕
            </button>
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
                <select
                  value={layout}
                  onChange={(e) => setLayout(e.target.value)}
                  className={styles.select}
                >
                  <option value="default">Three Section (Brand | Location | Contact)</option>
                  <option value="centered">Centered</option>
                  <option value="restaurant">Restaurant Style (4 Columns + Nav)</option>
                </select>
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

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Show Locations
                  <span className={styles.labelHint}>Display location information</span>
                </label>
                <label className={styles.toggleSwitch}>
                  <input
                    type="checkbox"
                    checked={showLocations}
                    onChange={(e) => setShowLocations(e.target.checked)}
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
            </div>

            {/* Additional Options */}
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>
                <span className={styles.sectionIcon}>⚡</span>
                Additional Options
              </h3>

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

        {/* Preview - Right Side */}
        <div className={styles.previewSection}>
          <div className={styles.previewHeader}>
            <h2 className={styles.previewTitle}>Live Preview</h2>
            <span className={styles.previewBadge}>Updates in real-time</span>
          </div>
          <div className={styles.previewWrapper}>
            <div className={styles.previewDevice}>
              <div className={styles.previewContainer}>
                <Footer
                  restaurantName={config?.restaurantName || 'Antler Foods'}
                  aboutContent={aboutContent}
                  email={config?.email}
                  phone={config?.phone}
                  address={config?.address}
                  socialLinks={config?.socialLinks || [
                    { platform: 'facebook', url: 'https://facebook.com', order: 1 },
                    { platform: 'instagram', url: 'https://instagram.com', order: 2 },
                    { platform: 'twitter', url: 'https://twitter.com', order: 3 },
                  ]}
                  columns={config?.columns || []}
                  showSocialMedia={showSocialMedia}
                  showLocations={showLocations}
                  showNewsletter={showNewsletter}
                  layout={layout as any}
                  bgColor={bgColor}
                  textColor={textColor}
                  linkColor={linkColor}
                />
              </div>
            </div>
          </div>
          <p className={styles.previewNote}>
            <span className={styles.previewIcon}>👁</span>
            Preview shows how your footer will appear on the website
          </p>
        </div>
      </div>
    </div>
  );
}
