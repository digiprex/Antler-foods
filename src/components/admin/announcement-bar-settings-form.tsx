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
  const [email, setEmail] = useState('');
  const [showAddress, setShowAddress] = useState(true);
  const [showPhone, setShowPhone] = useState(true);
  const [showEmail, setShowEmail] = useState(true);
  const [socialMediaIcons, setSocialMediaIcons] = useState<SocialMediaIcon[]>([]);
  const [layout, setLayout] = useState<AnnouncementBarConfig['layout']>('text-only');
  const [bgColor, setBgColor] = useState('#000000');
  const [textColor, setTextColor] = useState('#ffffff');
  const [linkColor, setLinkColor] = useState('#ffffff');
  const [fontFamily, setFontFamily] = useState('Inter, system-ui, sans-serif');
  const [fontSize, setFontSize] = useState('14px');
  const [fontWeight, setFontWeight] = useState<number>(400);
  const [textTransform, setTextTransform] = useState<'none' | 'uppercase' | 'lowercase' | 'capitalize'>('none');

  // Toast state
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  // Preview visibility state
  const [showPreview, setShowPreview] = useState(false);

  // Mobile carousel state for preview
  const [previewContactIndex, setPreviewContactIndex] = useState(0);

  // Initialize form with fetched config
  useEffect(() => {
    if (config) {
      setIsEnabled(config.isEnabled ?? false);
      setText(config.text || '');
      setAddress(config.address || '');
      setPhone(config.phone || '');
      setEmail(config.email || '');
      setShowAddress(config.showAddress ?? true);
      setShowPhone(config.showPhone ?? true);
      setShowEmail(config.showEmail ?? true);
      setSocialMediaIcons(config.socialMediaIcons || []);
      setLayout(config.layout || 'text-only');
      setBgColor(config.bgColor || '#000000');
      setTextColor(config.textColor || '#ffffff');
      setLinkColor(config.linkColor || '#ffffff');
      setFontFamily(config.fontFamily || 'Inter, system-ui, sans-serif');
      setFontSize(config.fontSize || '14px');
      setFontWeight(config.fontWeight || 400);
      setTextTransform(config.textTransform || 'none');
    }
  }, [config]);

  // Prepare contact items for preview carousel
  const previewContactItems = useMemo(() => {
    const items = [];
    const showContactInPreview = (layout === 'contact-info' || layout === 'contact-social' || layout === 'full');

    if (showContactInPreview && showAddress && address) {
      items.push({ type: 'address', content: `📍 ${address}` });
    }
    if (showContactInPreview && showPhone && phone) {
      items.push({ type: 'phone', content: `📞 ${phone}` });
    }
    if (showContactInPreview && showEmail && email) {
      items.push({ type: 'email', content: `✉️ ${email}` });
    }
    return items;
  }, [layout, showAddress, address, showPhone, phone, showEmail, email]);

  // Auto-rotate contact items in preview
  useEffect(() => {
    if (previewContactItems.length <= 1) return;

    const interval = setInterval(() => {
      setPreviewContactIndex((prev) => (prev + 1) % previewContactItems.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [previewContactItems.length]);

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
        email,
        showAddress,
        showPhone,
        showEmail,
        showSocialMedia: true, // Always enabled when layout includes social media
        layout,
        position: 'top', // Always top position
        bgColor,
        textColor,
        linkColor,
        fontFamily,
        fontSize,
        fontWeight,
        textTransform,
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

    // Check for content based on visibility settings and layout
    const hasVisibleContent =
      (layout === 'text-only' && text) ||
      (layout === 'full' && text) ||
      (layout === 'contact-info' && (showAddress && address || showPhone && phone || showEmail && email)) ||
      (layout === 'social-only' && socialMediaIcons.some(icon => icon.url)) ||
      (layout === 'contact-social' && (showAddress && address || showPhone && phone || showEmail && email || socialMediaIcons.some(icon => icon.url)));

    if (!hasVisibleContent) {
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
          Enable content options to see preview
        </div>
      );
    }

    // Determine what to show based on layout
    const showTextInPreview = (layout === 'text-only' || layout === 'full') && text;
    const showContactInPreview = (layout === 'contact-info' || layout === 'contact-social' || layout === 'full');
    const showSocialInPreview = (layout === 'social-only' || layout === 'contact-social' || layout === 'full');

    return (
      <div style={{
        backgroundColor: bgColor,
        color: textColor,
        fontFamily: fontFamily,
        fontSize: fontSize,
        fontWeight: fontWeight,
        textTransform: textTransform,
        padding: '8px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1rem',
        flexWrap: 'wrap',
        minHeight: '40px',
      }}>
        {showTextInPreview && <span>{text}</span>}
        {showContactInPreview && previewContactItems.length > 0 && (
          <span
            key={previewContactIndex}
            style={{
              animation: previewContactItems.length > 1 ? 'fadeIn 0.5s ease-in-out' : 'none'
            }}
          >
            {previewContactItems[previewContactIndex]?.content}
          </span>
        )}
        {showSocialInPreview && socialMediaIcons.filter(icon => icon.url).map((icon, index) => (
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

  // Validate that restaurant ID is provided
  if (!restaurantId) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#dc2626' }}>
        <h2>Error</h2>
        <p>Restaurant ID is required. Please provide it via URL parameter.</p>
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
                  <span className={styles.labelHint}>Choose what content to display</span>
                </label>
                <select
                  value={layout}
                  onChange={(e) => setLayout(e.target.value as AnnouncementBarConfig['layout'])}
                  className={styles.select}
                >
                  <option value="text-only">Text Only</option>
                  <option value="contact-info">Contact Information Only</option>
                  <option value="social-only">Social Media Only</option>
                  <option value="contact-social">Contact + Social Media</option>
                  <option value="full">All (Text + Contact + Social)</option>
                </select>
              </div>
            </div>

            {/* Content Section */}
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>
                <span className={styles.sectionIcon}>📝</span>
                Content
              </h3>

              {/* Text Content - Show only for text-only and full layouts */}
              {(layout === 'text-only' || layout === 'full') && (
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
              )}

              {/* Contact Information - Show for contact-info, contact-social, and full layouts */}
              {(layout === 'contact-info' || layout === 'contact-social' || layout === 'full') && (
                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    Contact Information
                    <span className={styles.labelHint}>Choose what to display</span>
                  </label>

                  <div style={{
                    padding: '1rem',
                    background: '#f9fafb',
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                    marginBottom: '1rem'
                  }}>
                    <p style={{ margin: 0, marginBottom: '0.75rem', color: '#6b7280', fontSize: '0.875rem' }}>
                      📞 Contact information is automatically pulled from your restaurant profile.
                    </p>

                    {/* Contact Display Options */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {/* Show Address */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <label className={styles.toggleSwitch} style={{ margin: 0 }}>
                          <input
                            type="checkbox"
                            checked={showAddress}
                            onChange={(e) => setShowAddress(e.target.checked)}
                            className={styles.toggleInput}
                          />
                          <span className={styles.toggleSlider}></span>
                        </label>
                        <div style={{ flex: 1 }}>
                          <div style={{ color: '#111827', fontWeight: '500', fontSize: '0.875rem' }}>
                            Show Address
                          </div>
                          {address && (
                            <div style={{ color: '#6b7280', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                              📍 {address}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Show Phone */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <label className={styles.toggleSwitch} style={{ margin: 0 }}>
                          <input
                            type="checkbox"
                            checked={showPhone}
                            onChange={(e) => setShowPhone(e.target.checked)}
                            className={styles.toggleInput}
                          />
                          <span className={styles.toggleSlider}></span>
                        </label>
                        <div style={{ flex: 1 }}>
                          <div style={{ color: '#111827', fontWeight: '500', fontSize: '0.875rem' }}>
                            Show Phone
                          </div>
                          {phone && (
                            <div style={{ color: '#6b7280', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                              📞 {phone}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Show Email */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <label className={styles.toggleSwitch} style={{ margin: 0 }}>
                          <input
                            type="checkbox"
                            checked={showEmail}
                            onChange={(e) => setShowEmail(e.target.checked)}
                            className={styles.toggleInput}
                          />
                          <span className={styles.toggleSlider}></span>
                        </label>
                        <div style={{ flex: 1 }}>
                          <div style={{ color: '#111827', fontWeight: '500', fontSize: '0.875rem' }}>
                            Show Email
                          </div>
                          {email && (
                            <div style={{ color: '#6b7280', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                              ✉️ {email}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Social Media Info - Show for social-only, contact-social, and full layouts */}
              {(layout === 'social-only' || layout === 'contact-social' || layout === 'full') && (
                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    Social Media Icons
                    <span className={styles.labelHint}>From restaurant profile</span>
                  </label>

                  <div style={{
                    padding: '1rem',
                    background: '#f9fafb',
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb'
                  }}>
                    <p style={{ margin: 0, marginBottom: socialMediaIcons.length > 0 ? '0.75rem' : '0', color: '#6b7280', fontSize: '0.875rem' }}>
                      📱 Social media icons are automatically pulled from your restaurant profile and will be displayed based on the selected layout.
                    </p>

                    {/* Current Social Media Icons */}
                    {socialMediaIcons.length > 0 ? (
                      <div style={{
                        marginTop: '0.75rem',
                        paddingTop: '0.75rem',
                        borderTop: '1px solid #e5e7eb',
                        display: 'flex',
                        gap: '0.5rem',
                        flexWrap: 'wrap',
                        alignItems: 'center'
                      }}>
                        <strong style={{ color: '#111827', fontSize: '0.875rem' }}>Available social medias:</strong>
                        {socialMediaIcons.map((icon, index) => (
                          <span
                            key={index}
                            style={{
                              fontSize: '1.5rem'
                            }}
                            title={SOCIAL_MEDIA_PLATFORMS[icon.platform]?.name}
                          >
                            {SOCIAL_MEDIA_PLATFORMS[icon.platform]?.icon || '🔗'}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div style={{
                        marginTop: '0.75rem',
                        padding: '0.75rem',
                        background: '#fef2f2',
                        borderRadius: '6px',
                        border: '1px solid #fecaca',
                        color: '#991b1b',
                        fontSize: '0.875rem'
                      }}>
                        ⚠️ No social media links found. Add them in your restaurant settings to display icons here.
                      </div>
                    )}
                  </div>
                </div>
              )}
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

            {/* Typography Section */}
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>
                <span className={styles.sectionIcon}>✍️</span>
                Typography
              </h3>

              {/* Font Family */}
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Font Family
                  <span className={styles.labelHint}>Choose font style</span>
                </label>
                <select
                  value={fontFamily}
                  onChange={(e) => setFontFamily(e.target.value)}
                  className={styles.select}
                  style={{ fontFamily: fontFamily }}
                >
                  <option value="Inter, system-ui, sans-serif" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>Inter (Default)</option>
                  <option value="Roboto, sans-serif" style={{ fontFamily: 'Roboto, sans-serif' }}>Roboto</option>
                  <option value="Open Sans, sans-serif" style={{ fontFamily: 'Open Sans, sans-serif' }}>Open Sans</option>
                  <option value="Lato, sans-serif" style={{ fontFamily: 'Lato, sans-serif' }}>Lato</option>
                  <option value="Montserrat, sans-serif" style={{ fontFamily: 'Montserrat, sans-serif' }}>Montserrat</option>
                  <option value="Poppins, sans-serif" style={{ fontFamily: 'Poppins, sans-serif' }}>Poppins</option>
                  <option value="Playfair Display, serif" style={{ fontFamily: 'Playfair Display, serif' }}>Playfair Display</option>
                  <option value="Merriweather, serif" style={{ fontFamily: 'Merriweather, serif' }}>Merriweather</option>
                  <option value="Arial, sans-serif" style={{ fontFamily: 'Arial, sans-serif' }}>Arial</option>
                  <option value="Helvetica, sans-serif" style={{ fontFamily: 'Helvetica, sans-serif' }}>Helvetica</option>
                </select>
              </div>

              {/* Font Size */}
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Font Size
                  <span className={styles.labelHint}>Text size in pixels</span>
                </label>
                <select
                  value={fontSize}
                  onChange={(e) => setFontSize(e.target.value)}
                  className={styles.select}
                >
                  <option value="12px">12px (Small)</option>
                  <option value="14px">14px (Default)</option>
                  <option value="16px">16px (Medium)</option>
                  <option value="18px">18px (Large)</option>
                  <option value="20px">20px (Extra Large)</option>
                </select>
              </div>

              {/* Font Weight */}
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Font Weight
                  <span className={styles.labelHint}>Text thickness</span>
                </label>
                <select
                  value={fontWeight}
                  onChange={(e) => setFontWeight(Number(e.target.value))}
                  className={styles.select}
                >
                  <option value={300}>Light (300)</option>
                  <option value={400}>Normal (400)</option>
                  <option value={500}>Medium (500)</option>
                  <option value={600}>Semi Bold (600)</option>
                  <option value={700}>Bold (700)</option>
                </select>
              </div>

              {/* Text Transform */}
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Text Transform
                  <span className={styles.labelHint}>Text capitalization</span>
                </label>
                <select
                  value={textTransform}
                  onChange={(e) => setTextTransform(e.target.value as 'none' | 'uppercase' | 'lowercase' | 'capitalize')}
                  className={styles.select}
                >
                  <option value="none">None (Default)</option>
                  <option value="uppercase">UPPERCASE</option>
                  <option value="lowercase">lowercase</option>
                  <option value="capitalize">Capitalize Each Word</option>
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