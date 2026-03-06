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

export default function AnnouncementBarSettingsForm() {
  // Add animations
  if (typeof document !== 'undefined') {
    const styleId = 'announcement-bar-animations';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `;
      document.head.appendChild(style);
    }
  }
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
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="inline-flex items-center gap-3 rounded-xl border border-purple-200 bg-purple-50 px-5 py-3.5">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-purple-600 border-t-transparent"></div>
          <p className="text-sm font-medium text-gray-700">Loading announcement bar settings...</p>
        </div>
      </div>
    );
  }

  // Validate that restaurant ID is provided
  if (!restaurantId) {
    return (
      <div className="flex min-h-[400px] items-center justify-center p-8">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <svg className="mx-auto h-12 w-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h2 className="mt-4 text-lg font-semibold text-red-900">Error</h2>
          <p className="mt-2 text-sm text-red-700">Restaurant ID is required. Please provide it via URL parameter.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Toast Notification */}
      {showToast && (
        <Toast
          message={toastMessage}
          type={toastType}
          onClose={() => setShowToast(false)}
        />
      )}

      <div className="min-h-screen bg-gray-50 p-8">
        <div className="mx-auto max-w-5xl">
          {/* Page Header */}
          <div className="mb-8 flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg">
                <svg className="h-7 w-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Announcement Bar Settings</h1>
                <p className="mt-1 text-sm text-gray-600">Configure your announcement bar</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              className="inline-flex items-center gap-2 rounded-lg border border-purple-200 bg-white px-4 py-2.5 text-sm font-medium text-purple-700 shadow-sm transition-all hover:border-purple-300 hover:bg-purple-50"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {showPreview ? 'Hide' : 'Show'} Preview
            </button>
          </div>

          {fetchError && (
            <div className="mb-6 flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              <svg className="h-5 w-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>Error loading settings: {fetchError}</span>
            </div>
          )}

          {updateError && (
            <div className="mb-6 flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              <svg className="h-5 w-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>Error saving settings: {updateError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* General Settings Section */}
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-200 bg-gradient-to-r from-purple-50 to-white px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100">
                    <svg className="h-5 w-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">General Settings</h3>
                </div>
              </div>

              <div className="space-y-4 p-6">
                {/* Enable/Disable Toggle */}
                <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900">Enable Announcement Bar</label>
                    <p className="mt-0.5 text-xs text-gray-600">Show/hide the announcement bar</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsEnabled(!isEnabled)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${isEnabled ? 'bg-purple-600' : 'bg-gray-300'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>

                {/* Layout */}
                <div>
                  <label className="block text-sm font-medium text-gray-900">
                    Layout Type
                  </label>
                  <p className="mt-1 text-xs text-gray-600">Choose what content to display</p>
                  <select
                    value={layout}
                    onChange={(e) => setLayout(e.target.value as AnnouncementBarConfig['layout'])}
                    className="mt-2 block w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 shadow-sm transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="text-only">Text Only</option>
                    <option value="contact-info">Contact Information Only</option>
                    <option value="social-only">Social Media Only</option>
                    <option value="contact-social">Contact + Social Media</option>
                    <option value="full">All (Text + Contact + Social)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Content Section */}
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-200 bg-gradient-to-r from-purple-50 to-white px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100">
                    <svg className="h-5 w-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Content</h3>
                </div>
              </div>

              <div className="space-y-4 p-6">
                {/* Text Content - Show only for text-only and full layouts */}
                {(layout === 'text-only' || layout === 'full') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-900">
                      Announcement Text
                    </label>
                    <p className="mt-1 text-xs text-gray-600">Main message to display</p>
                    <textarea
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      className="mt-2 block w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 shadow-sm transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="Welcome to our restaurant! Special offers available..."
                      rows={3}
                    />
                  </div>
                )}

              {/* Contact Information - Show for contact-info, contact-social, and full layouts */}
              {(layout === 'contact-info' || layout === 'contact-social' || layout === 'full') && (
                <div>
                  <label className="block text-sm font-medium text-gray-900">
                    Contact Information
                  </label>
                  <p className="mt-1 text-xs text-gray-600">Choose what to display</p>

                  <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <p className="mb-3 flex items-center gap-2 text-xs text-gray-600">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Contact information is automatically pulled from your restaurant profile.
                    </p>

                    {/* Contact Display Options */}
                    <div className="space-y-3">
                      {/* Show Address */}
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setShowAddress(!showAddress)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${showAddress ? 'bg-purple-600' : 'bg-gray-300'}`}
                        >
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${showAddress ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">
                            Show Address
                          </div>
                          {address && (
                            <div className="mt-1 flex items-center gap-1 text-xs text-gray-600">
                              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              {address}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Show Phone */}
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setShowPhone(!showPhone)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${showPhone ? 'bg-purple-600' : 'bg-gray-300'}`}
                        >
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${showPhone ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">
                            Show Phone
                          </div>
                          {phone && (
                            <div className="mt-1 flex items-center gap-1 text-xs text-gray-600">
                              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                              </svg>
                              {phone}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Show Email */}
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setShowEmail(!showEmail)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${showEmail ? 'bg-purple-600' : 'bg-gray-300'}`}
                        >
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${showEmail ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">
                            Show Email
                          </div>
                          {email && (
                            <div className="mt-1 flex items-center gap-1 text-xs text-gray-600">
                              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                              {email}
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
                <div>
                  <label className="block text-sm font-medium text-gray-900">
                    Social Media Icons
                  </label>
                  <p className="mt-1 text-xs text-gray-600">From restaurant profile</p>

                  <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <p className={`flex items-center gap-2 text-xs text-gray-600 ${socialMediaIcons.length > 0 ? 'mb-3' : ''}`}>
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      Social media icons are automatically pulled from your restaurant profile and will be displayed based on the selected layout.
                    </p>

                    {/* Current Social Media Icons */}
                    {socialMediaIcons.length > 0 ? (
                      <div className="flex flex-wrap items-center gap-2 border-t border-gray-200 pt-3">
                        <strong className="text-sm text-gray-900">Available social medias:</strong>
                        {socialMediaIcons.map((icon, index) => (
                          <span
                            key={index}
                            className="text-2xl"
                            title={SOCIAL_MEDIA_PLATFORMS[icon.platform]?.name}
                          >
                            {SOCIAL_MEDIA_PLATFORMS[icon.platform]?.icon || '🔗'}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                        <svg className="h-5 w-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <span>No social media links found. Add them in your restaurant settings to display icons here.</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
              </div>
            </div>

            {/* Styling Section */}
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-200 bg-gradient-to-r from-purple-50 to-white px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100">
                    <svg className="h-5 w-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Colors & Styling</h3>
                </div>
              </div>

              <div className="space-y-4 p-6">
                {/* Background Color */}
                <div>
                  <label className="block text-sm font-medium text-gray-900">
                    Background Color
                  </label>
                  <p className="mt-1 text-xs text-gray-600">Bar background color</p>
                  <div className="mt-2 flex items-center gap-3">
                    <input
                      type="color"
                      value={bgColor}
                      onChange={(e) => setBgColor(e.target.value)}
                      className="h-10 w-16 cursor-pointer rounded-lg border border-gray-300 shadow-sm"
                    />
                    <input
                      type="text"
                      value={bgColor}
                      onChange={(e) => setBgColor(e.target.value)}
                      className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 shadow-sm transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="#000000"
                    />
                    <button
                      type="button"
                      onClick={() => setBgColor('#000000')}
                      className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
                      title="Reset to default"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Text Color */}
                <div>
                  <label className="block text-sm font-medium text-gray-900">
                    Text Color
                  </label>
                  <p className="mt-1 text-xs text-gray-600">Main text color</p>
                  <div className="mt-2 flex items-center gap-3">
                    <input
                      type="color"
                      value={textColor}
                      onChange={(e) => setTextColor(e.target.value)}
                      className="h-10 w-16 cursor-pointer rounded-lg border border-gray-300 shadow-sm"
                    />
                    <input
                      type="text"
                      value={textColor}
                      onChange={(e) => setTextColor(e.target.value)}
                      className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 shadow-sm transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="#ffffff"
                    />
                    <button
                      type="button"
                      onClick={() => setTextColor('#ffffff')}
                      className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
                      title="Reset to default"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Link Color */}
                <div>
                  <label className="block text-sm font-medium text-gray-900">
                    Link Color
                  </label>
                  <p className="mt-1 text-xs text-gray-600">Social media link color</p>
                  <div className="mt-2 flex items-center gap-3">
                    <input
                      type="color"
                      value={linkColor}
                      onChange={(e) => setLinkColor(e.target.value)}
                      className="h-10 w-16 cursor-pointer rounded-lg border border-gray-300 shadow-sm"
                    />
                    <input
                      type="text"
                      value={linkColor}
                      onChange={(e) => setLinkColor(e.target.value)}
                      className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 shadow-sm transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="#ffffff"
                    />
                    <button
                      type="button"
                      onClick={() => setLinkColor('#ffffff')}
                      className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
                      title="Reset to default"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Typography Section */}
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-200 bg-gradient-to-r from-purple-50 to-white px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100">
                    <svg className="h-5 w-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Typography</h3>
                </div>
              </div>

              <div className="space-y-4 p-6">
                {/* Font Family */}
                <div>
                  <label className="block text-sm font-medium text-gray-900">
                    Font Family
                  </label>
                  <p className="mt-1 text-xs text-gray-600">Choose font style</p>
                  <select
                    value={fontFamily}
                    onChange={(e) => setFontFamily(e.target.value)}
                    className="mt-2 block w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 shadow-sm transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
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
                <div>
                  <label className="block text-sm font-medium text-gray-900">
                    Font Size
                  </label>
                  <p className="mt-1 text-xs text-gray-600">Text size in pixels</p>
                  <select
                    value={fontSize}
                    onChange={(e) => setFontSize(e.target.value)}
                    className="mt-2 block w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 shadow-sm transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="12px">12px (Small)</option>
                    <option value="14px">14px (Default)</option>
                    <option value="16px">16px (Medium)</option>
                    <option value="18px">18px (Large)</option>
                    <option value="20px">20px (Extra Large)</option>
                  </select>
                </div>

                {/* Font Weight */}
                <div>
                  <label className="block text-sm font-medium text-gray-900">
                    Font Weight
                  </label>
                  <p className="mt-1 text-xs text-gray-600">Text thickness</p>
                  <select
                    value={fontWeight}
                    onChange={(e) => setFontWeight(Number(e.target.value))}
                    className="mt-2 block w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 shadow-sm transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value={300}>Light (300)</option>
                    <option value={400}>Normal (400)</option>
                    <option value={500}>Medium (500)</option>
                    <option value={600}>Semi Bold (600)</option>
                    <option value={700}>Bold (700)</option>
                  </select>
                </div>

                {/* Text Transform */}
                <div>
                  <label className="block text-sm font-medium text-gray-900">
                    Text Transform
                  </label>
                  <p className="mt-1 text-xs text-gray-600">Text capitalization</p>
                  <select
                    value={textTransform}
                    onChange={(e) => setTextTransform(e.target.value as 'none' | 'uppercase' | 'lowercase' | 'capitalize')}
                    className="mt-2 block w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 shadow-sm transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="none">None (Default)</option>
                    <option value="uppercase">UPPERCASE</option>
                    <option value="lowercase">lowercase</option>
                    <option value="capitalize">Capitalize Each Word</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={updating}
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-3 font-semibold text-white shadow-lg transition-all hover:from-purple-700 hover:to-purple-800 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
              >
                {updating ? (
                  <>
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16v2a2 2 0 01-2 2H5a2 2 0 01-2-2v-7a2 2 0 012-2h2m3-4H9a2 2 0 00-2 2v7a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-1m-1 4l-3 3m0 0l-3-3m3 3V3" />
                    </svg>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ animation: 'fadeIn 0.2s ease-out' }}>
          <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setShowPreview(false)} />
          <div className="relative w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl" style={{ animation: 'slideUp 0.3s ease-out' }}>
            <div className="flex items-center justify-between border-b border-gray-200 bg-gradient-to-r from-purple-50 to-white px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
                  <svg className="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Announcement Bar Live Preview</h2>
                  <p className="text-xs text-gray-600">Updates in real-time</p>
                </div>
              </div>
              <button
                onClick={() => setShowPreview(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
                aria-label="Close preview"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <div className="overflow-hidden rounded-xl border border-gray-200 shadow-sm">
                <AnnouncementBarPreview />
              </div>
              <p className="mt-4 text-center text-sm text-gray-600">
                <svg className="inline-block h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Preview shows how your announcement bar will appear on the website
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}