/**
 * Announcement Bar Settings Form
 *
 * Enhanced interface for configuring announcement bar settings:
 * - Enable/disable toggle
 * - Text content
 * - Contact information (address, phone)
 * - Social media icons
 * - Layout selection
 * - Position (top/bottom)
 * - Colors and styling
 * - Live preview
 */

'use client';

import { useState, useEffect } from 'react';
import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAnnouncementBarConfig, useUpdateAnnouncementBarConfig } from '@/hooks/use-announcement-bar-config';
import type { AnnouncementBarConfig, SocialMediaIcon } from '@/types/announcement-bar.types';
import { SOCIAL_MEDIA_PLATFORMS } from '@/types/announcement-bar.types';
import Toast from '@/components/ui/toast';
import styles from './announcement-bar-settings-form.module.css';

export default function AnnouncementBarSettingsForm() {
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
    () => `/api/announcement-bar-config?restaurant_id=${encodeURIComponent(restaurantId)}`,
    [restaurantId],
  );

  const { config, loading, error: fetchError } = useAnnouncementBarConfig({
    apiEndpoint: configApiEndpoint,
  });
  const { updateAnnouncementBar, updating, error: updateError } = useUpdateAnnouncementBarConfig();

  // Form state
  const [isEnabled, setIsEnabled] = useState(false);
  const [text, setText] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [socialMediaIcons, setSocialMediaIcons] = useState<SocialMediaIcon[]>([]);
  const [layout, setLayout] = useState<AnnouncementBarConfig['layout']>('text-only');
  const [position, setPosition] = useState<AnnouncementBarConfig['position']>('top');
  const [bgColor, setBgColor] = useState('#000000');
  const [textColor, setTextColor] = useState('#ffffff');
  const [linkColor, setLinkColor] = useState('#ffffff');
  
  // Toast state
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  // Preview visibility state
  const [showPreview, setShowPreview] = useState(false);

  // Initialize form with fetched config
  useEffect(() => {
    if (config) {
      setIsEnabled(config.isEnabled ?? false);
      setText(config.text || '');
      setAddress(config.address || '');
      setPhone(config.phone || '');
      setSocialMediaIcons(config.socialMediaIcons || []);
      setLayout(config.layout || 'text-only');
      setPosition(config.position || 'top');
      setBgColor(config.bgColor || '#000000');
      setTextColor(config.textColor || '#ffffff');
      setLinkColor(config.linkColor || '#ffffff');
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
      await updateAnnouncementBar({
        restaurant_id: restaurantId,
        isEnabled,
        text,
        address,
        phone,
        socialMediaIcons,
        layout,
        position,
        bgColor,
        textColor,
        linkColor,
      });

      setToastMessage('Announcement bar settings saved successfully!');
      setToastType('success');
      setShowToast(true);
    } catch (err) {
      console.error('Failed to update announcement bar:', err);
      setToastMessage('Failed to save settings. Please try again.');
      setToastType('error');
      setShowToast(true);
    }
  };

  const addSocialMediaIcon = () => {
    const newIcon: SocialMediaIcon = {
      id: Date.now().toString(),
      platform: 'facebook',
      url: '',
      order: socialMediaIcons.length,
    };
    setSocialMediaIcons([...socialMediaIcons, newIcon]);
  };

  const updateSocialMediaIcon = (index: number, field: keyof SocialMediaIcon, value: string) => {
    const updated = [...socialMediaIcons];
    updated[index] = { ...updated[index], [field]: value };
    setSocialMediaIcons(updated);
  };

  const removeSocialMediaIcon = (index: number) => {
    const updated = socialMediaIcons.filter((_, i) => i !== index);
    setSocialMediaIcons(updated);
  };

  // Create preview component
  const AnnouncementBarPreview = () => {
    if (!isEnabled) {
      return (
        <div style={{ 
          padding: '1rem', 
          textAlign: 'center', 
          color: '#6b7280',
          fontStyle: 'italic',
          background: '#f9fafb',
          borderRadius: '8px',
          border: '2px dashed #e5e7eb'
        }}>
          Announcement bar is disabled
        </div>
      );
    }

    const hasContent = text || address || phone || socialMediaIcons.some(icon => icon.url);
    
    if (!hasContent) {
      return (
        <div style={{ 
          padding: '1rem', 
          textAlign: 'center', 
          color: '#6b7280',
          fontStyle: 'italic',
          background: '#f9fafb',
          borderRadius: '8px',
          border: '2px dashed #e5e7eb'
        }}>
          Add content to see preview
        </div>
      );
    }

    return (
      <div style={{
        backgroundColor: bgColor,
        color: textColor,
        padding: '8px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1rem',
        flexWrap: 'wrap',
        minHeight: '40px',
      }}>
        {text && <span>{text}</span>}
        {address && <span>📍 {address}</span>}
        {phone && <span>📞 {phone}</span>}
        {socialMediaIcons.filter(icon => icon.url).map((icon, index) => (
          <a
            key={index}
            href={icon.url}
            style={{ 
              color: linkColor, 
              textDecoration: 'none',
              fontSize: '1.2rem'
            }}
            target="_blank"
            rel="noopener noreferrer"
          >
            {SOCIAL_MEDIA_PLATFORMS[icon.platform]?.icon || '🔗'}
          </a>
        ))}
      </div>
    );
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
              <h1 className={styles.formTitle}>Announcement Bar Settings</h1>
              <p className={styles.formSubtitle}>Configure your announcement bar</p>
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
            {/* General Settings Section */}
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>
                <span className={styles.sectionIcon}>⚙</span>
                General Settings
              </h3>

              {/* Enable/Disable Toggle */}
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Enable Announcement Bar
                  <span className={styles.labelHint}>Show/hide the announcement bar</span>
                </label>
                <label className={styles.toggleSwitch}>
                  <input
                    type="checkbox"
                    checked={isEnabled}
                    onChange={(e) => setIsEnabled(e.target.checked)}
                    className={styles.toggleInput}
                  />
                  <span className={styles.toggleSlider}></span>
                </label>
              </div>

              {/* Layout */}
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Layout Type
                  <span className={styles.labelHint}>Choose content layout</span>
                </label>
                <select
                  value={layout}
                  onChange={(e) => setLayout(e.target.value as any)}
                  className={styles.select}
                >
                  <option value="text-only">Text Only</option>
                  <option value="contact-info">Contact Information</option>
                  <option value="social-only">Social Media Only</option>
                  <option value="full">Full (Text + Contact + Social)</option>
                </select>
              </div>

              {/* Position */}
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Position
                  <span className={styles.labelHint}>Where to display the bar</span>
                </label>
                <select
                  value={position}
                  onChange={(e) => setPosition(e.target.value as any)}
                  className={styles.select}
                >
                  <option value="top">Top of Page</option>
                  <option value="bottom">Bottom of Page</option>
                </select>
              </div>
            </div>

            {/* Content Section */}
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>
                <span className={styles.sectionIcon}>📝</span>
                Content
              </h3>

              {/* Text Content */}
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Announcement Text
                  <span className={styles.labelHint}>Main message to display</span>
                </label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  className={styles.textarea}
                  placeholder="Welcome to our restaurant! Special offers available..."
                />
              </div>

              {/* Address */}
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Address
                  <span className={styles.labelHint}>Restaurant address</span>
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className={styles.textInput}
                  placeholder="123 Main St, City, State 12345"
                />
              </div>

              {/* Phone */}
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Phone Number
                  <span className={styles.labelHint}>Contact phone number</span>
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={styles.textInput}
                  placeholder="(555) 123-4567"
                />
              </div>

              {/* Social Media Icons */}
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Social Media
                  <span className={styles.labelHint}>Social media links</span>
                </label>
                <div className={styles.socialMediaSection}>
                  <div className={styles.socialMediaList}>
                    {socialMediaIcons.map((icon, index) => (
                      <div key={index} className={styles.socialMediaItem}>
                        <span className={styles.socialMediaIcon}>
                          {SOCIAL_MEDIA_PLATFORMS[icon.platform]?.icon || '🔗'}
                        </span>
                        <select
                          value={icon.platform}
                          onChange={(e) => updateSocialMediaIcon(index, 'platform', e.target.value)}
                          style={{ minWidth: '120px', marginRight: '0.5rem' }}
                        >
                          {Object.entries(SOCIAL_MEDIA_PLATFORMS).map(([key, platform]) => (
                            <option key={key} value={key}>
                              {platform.name}
                            </option>
                          ))}
                        </select>
                        <input
                          type="url"
                          value={icon.url}
                          onChange={(e) => updateSocialMediaIcon(index, 'url', e.target.value)}
                          className={styles.socialMediaInput}
                          placeholder={SOCIAL_MEDIA_PLATFORMS[icon.platform]?.placeholder || 'https://...'}
                        />
                        <button
                          type="button"
                          onClick={() => removeSocialMediaIcon(index)}
                          className={styles.removeButton}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={addSocialMediaIcon}
                    className={styles.addSocialButton}
                  >
                    <span>➕</span>
                    Add Social Media Link
                  </button>
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
                  <span className={styles.labelHint}>Bar background color</span>
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
                    placeholder="#000000"
                  />
                  <button
                    type="button"
                    onClick={() => setBgColor('#000000')}
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
                    placeholder="#ffffff"
                  />
                  <button
                    type="button"
                    onClick={() => setTextColor('#ffffff')}
                    className={styles.clearButton}
                    title="Reset to default"
                  >
                    ↺
                  </button>
                </div>
              </div>

              {/* Link Color */}
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Link Color
                  <span className={styles.labelHint}>Social media link color</span>
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
                    placeholder="#ffffff"
                  />
                  <button
                    type="button"
                    onClick={() => setLinkColor('#ffffff')}
                    className={styles.clearButton}
                    title="Reset to default"
                  >
                    ↺
                  </button>
                </div>
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
              <h2 className={styles.previewModalTitle}>Announcement Bar Live Preview</h2>
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
                  <AnnouncementBarPreview />
                </div>
              </div>
              <p className={styles.previewNote}>
                <span className={styles.previewIcon}>👁</span>
                Preview shows how your announcement bar will appear on the website
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}