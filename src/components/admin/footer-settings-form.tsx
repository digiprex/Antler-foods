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
import { generateFooterPropsFromConfig } from '@/utils/footer-layout-generator';

// Font options for footer text
const FONT_OPTIONS = [
  { value: 'Poppins, sans-serif', label: 'Poppins (Default)' },

  // Sans-serif fonts
  { value: 'Inter, system-ui, sans-serif', label: 'Inter' },
  { value: 'Roboto, sans-serif', label: 'Roboto' },
  { value: 'Open Sans, sans-serif', label: 'Open Sans' },
  { value: 'Lato, sans-serif', label: 'Lato' },
  { value: 'Montserrat, sans-serif', label: 'Montserrat' },
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
  const [fontFamily, setFontFamily] = useState('Poppins, sans-serif');
  const [fontSize, setFontSize] = useState('0.9375rem');
  const [fontWeight, setFontWeight] = useState<number>(400);
  const [textTransform, setTextTransform] = useState<'none' | 'uppercase' | 'lowercase' | 'capitalize'>('none');

  const [headingFontFamily, setHeadingFontFamily] = useState('Poppins, sans-serif');
  const [headingFontSize, setHeadingFontSize] = useState('1.125rem');
  const [headingFontWeight, setHeadingFontWeight] = useState<number>(600);
  const [headingTextTransform, setHeadingTextTransform] = useState<'none' | 'uppercase' | 'lowercase' | 'capitalize'>('uppercase');

  const [copyrightFontFamily, setCopyrightFontFamily] = useState('Poppins, sans-serif');
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
      setFontFamily(config.fontFamily || 'Poppins, sans-serif');
      setFontSize(config.fontSize || '0.9375rem');
      setFontWeight(config.fontWeight || 400);
      setTextTransform(config.textTransform || 'none');
      setHeadingFontFamily(config.headingFontFamily || 'Poppins, sans-serif');
      setHeadingFontSize(config.headingFontSize || '1.125rem');
      setHeadingFontWeight(config.headingFontWeight || 600);
      setHeadingTextTransform(config.headingTextTransform || 'uppercase');
      setCopyrightFontFamily(config.copyrightFontFamily || 'Poppins, sans-serif');
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
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="inline-flex items-center gap-3 rounded-xl border border-purple-200 bg-purple-50 px-5 py-3.5">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-purple-600 border-t-transparent"></div>
          <p className="text-sm font-medium text-gray-700">Loading footer settings...</p>
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

      {/* Page Header */}
      <div className="mb-8 flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg">
            <svg
              className="h-7 w-7 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 4.5h14.25M3 9h9.75M3 13.5h9.75m4.5-4.5v12m0 0l-3.75-3.75M17.25 21L21 17.25"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Footer Settings</h1>
            <p className="mt-1 text-sm text-gray-600">Customize your website footer</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowPreview(!showPreview)}
          className="inline-flex items-center gap-2 rounded-lg border border-purple-200 bg-white px-4 py-2.5 text-sm font-medium text-purple-700 shadow-sm transition-all hover:border-purple-300 hover:bg-purple-50"
          title={showPreview ? 'Hide Preview' : 'Show Live Preview'}
        >
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          {showPreview ? 'Hide' : 'Show'} Preview
        </button>
      </div>

      {/* Error Messages */}
      {fetchError && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
          <svg
            className="h-5 w-5 shrink-0 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
          <div>
            <h3 className="text-sm font-semibold text-red-900">Error loading settings</h3>
            <p className="mt-1 text-sm text-red-700">{fetchError}</p>
          </div>
        </div>
      )}

      {updateError && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
          <svg
            className="h-5 w-5 shrink-0 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
          <div>
            <h3 className="text-sm font-semibold text-red-900">Error saving settings</h3>
            <p className="mt-1 text-sm text-red-700">{updateError}</p>
          </div>
        </div>
      )}

      {/* Settings Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Layout Section */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
              <svg
                className="h-5 w-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Layout Configuration</h3>
              <p className="mt-0.5 text-sm text-gray-600">Choose footer style and arrangement</p>
            </div>
          </div>

          <div>
            <label className="mb-3 block">
              <span className="text-sm font-semibold text-gray-900">Layout Type</span>
              <span className="mt-0.5 block text-xs text-gray-600">Choose a footer style</span>
            </label>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {/* Default Layout */}
              <button
                type="button"
                className={`group relative cursor-pointer rounded-lg border-2 p-4 text-left transition-all ${layout === 'default'
                    ? 'border-purple-500 bg-purple-50 shadow-md'
                    : 'border-gray-200 bg-white hover:border-purple-300 hover:bg-purple-50/50'
                  }`}
                onClick={() => setLayout('default')}
              >
                <div className="mb-3 rounded border border-gray-300 bg-gray-50 p-2">
                  <div className="flex items-center justify-between gap-1">
                    <div className="h-2 w-4 rounded bg-gray-400"></div>
                    <div className="h-2 w-4 rounded bg-gray-400"></div>
                    <div className="h-2 w-4 rounded bg-gray-400"></div>
                  </div>
                </div>
                <div className="text-sm font-semibold text-gray-900">Three Section</div>
                <div className="text-xs text-gray-600">Brand, Location, Contact</div>
                {layout === 'default' && (
                  <div className="absolute right-2 top-2">
                    <svg className="h-5 w-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                )}
              </button>

              {/* Centered Layout */}
              <button
                type="button"
                className={`group relative cursor-pointer rounded-lg border-2 p-4 text-left transition-all ${layout === 'centered'
                    ? 'border-purple-500 bg-purple-50 shadow-md'
                    : 'border-gray-200 bg-white hover:border-purple-300 hover:bg-purple-50/50'
                  }`}
                onClick={() => setLayout('centered')}
              >
                <div className="mb-3 rounded border border-gray-300 bg-gray-50 p-2">
                  <div className="flex items-center justify-center gap-1">
                    <div className="h-2 w-6 rounded bg-gray-400"></div>
                  </div>
                </div>
                <div className="text-sm font-semibold text-gray-900">Centered</div>
                <div className="text-xs text-gray-600">All Centered</div>
                {layout === 'centered' && (
                  <div className="absolute right-2 top-2">
                    <svg className="h-5 w-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                )}
              </button>

              {/* Restaurant Layout */}
              <button
                type="button"
                className={`group relative cursor-pointer rounded-lg border-2 p-4 text-left transition-all ${layout === 'restaurant'
                    ? 'border-purple-500 bg-purple-50 shadow-md'
                    : 'border-gray-200 bg-white hover:border-purple-300 hover:bg-purple-50/50'
                  }`}
                onClick={() => setLayout('restaurant')}
              >
                <div className="mb-3 rounded border border-gray-300 bg-gray-50 p-2">
                  <div className="flex items-center justify-between gap-0.5">
                    <div className="h-2 w-3 rounded bg-gray-400"></div>
                    <div className="h-2 w-3 rounded bg-gray-400"></div>
                    <div className="h-2 w-3 rounded bg-gray-400"></div>
                    <div className="h-2 w-3 rounded bg-gray-400"></div>
                  </div>
                </div>
                <div className="text-sm font-semibold text-gray-900">Restaurant</div>
                <div className="text-xs text-gray-600">4 Columns + Nav</div>
                {layout === 'restaurant' && (
                  <div className="absolute right-2 top-2">
                    <svg className="h-5 w-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                )}
              </button>

              {/* 4 Columns Layout */}
              <button
                type="button"
                className={`group relative cursor-pointer rounded-lg border-2 p-4 text-left transition-all ${layout === 'columns-4'
                    ? 'border-purple-500 bg-purple-50 shadow-md'
                    : 'border-gray-200 bg-white hover:border-purple-300 hover:bg-purple-50/50'
                  }`}
                onClick={() => setLayout('columns-4')}
              >
                <div className="mb-3 rounded border border-gray-300 bg-gray-50 p-2">
                  <div className="flex items-center justify-between gap-0.5">
                    <div className="h-2 w-3 rounded bg-gray-400"></div>
                    <div className="h-2 w-3 rounded bg-gray-400"></div>
                    <div className="h-2 w-3 rounded bg-gray-400"></div>
                    <div className="h-2 w-3 rounded bg-gray-400"></div>
                  </div>
                </div>
                <div className="text-sm font-semibold text-gray-900">4 Columns</div>
                <div className="text-xs text-gray-600">Wide Layout</div>
                {layout === 'columns-4' && (
                  <div className="absolute right-2 top-2">
                    <svg className="h-5 w-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Branding Section */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
              <svg
                className="h-5 w-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Branding & Info</h3>
              <p className="mt-0.5 text-sm text-gray-600">Business description and social media</p>
            </div>
          </div>

          <div className="mb-6">
            <label className="mb-2 block">
              <span className="text-sm font-semibold text-gray-900">About Content</span>
              <span className="mt-0.5 block text-xs text-gray-600">Description about your business</span>
            </label>
            <textarea
              value={aboutContent}
              onChange={(e) => setAboutContent(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Experience fine dining at its best. We offer premium quality food with exceptional service."
              rows={4}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div>
              <div className="text-sm font-semibold text-gray-900">Show Social Media</div>
              <div className="mt-0.5 text-xs text-gray-600">Display social media links</div>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={showSocialMedia}
                onChange={(e) => setShowSocialMedia(e.target.checked)}
                className="peer sr-only"
              />
              <div className="peer h-6 w-11 rounded-full bg-gray-300 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-purple-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-500"></div>
            </label>
          </div>
        </div>

        {/* Styling Section */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
              <svg
                className="h-5 w-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4.098 19.902a3.75 3.75 0 005.304 0l6.401-6.402M6.75 21A3.75 3.75 0 013 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 003.75-3.75V8.197M6.75 21h13.125c.621 0 1.125-.504 1.125-1.125v-5.25c0-.621-.504-1.125-1.125-1.125h-4.072M10.5 8.197l2.88-2.88c.438-.439 1.15-.439 1.59 0l3.712 3.713c.44.44.44 1.152 0 1.59l-2.879 2.88M6.75 17.25h.008v.008H6.75v-.008z"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Colors & Styling</h3>
              <p className="mt-0.5 text-sm text-gray-600">Customize colors and appearance</p>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <label className="mb-2 block">
                <span className="text-sm font-semibold text-gray-900">Background Color</span>
                <span className="mt-0.5 block text-xs text-gray-600">Footer background</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  className="h-10 w-16 cursor-pointer rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <input
                  type="text"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="#1f2937"
                />
                <button
                  type="button"
                  onClick={() => setBgColor('#1f2937')}
                  className="rounded-lg border border-gray-300 px-3 text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  title="Reset to default"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                    />
                  </svg>
                </button>
              </div>
            </div>

            <div>
              <label className="mb-2 block">
                <span className="text-sm font-semibold text-gray-900">Text Color</span>
                <span className="mt-0.5 block text-xs text-gray-600">Main text color</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                  className="h-10 w-16 cursor-pointer rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <input
                  type="text"
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="#f9fafb"
                />
                <button
                  type="button"
                  onClick={() => setTextColor('#f9fafb')}
                  className="rounded-lg border border-gray-300 px-3 text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  title="Reset to default"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                    />
                  </svg>
                </button>
              </div>
            </div>

            <div>
              <label className="mb-2 block">
                <span className="text-sm font-semibold text-gray-900">Link Color</span>
                <span className="mt-0.5 block text-xs text-gray-600">Footer link color</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={linkColor}
                  onChange={(e) => setLinkColor(e.target.value)}
                  className="h-10 w-16 cursor-pointer rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <input
                  type="text"
                  value={linkColor}
                  onChange={(e) => setLinkColor(e.target.value)}
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="#9ca3af"
                />
                <button
                  type="button"
                  onClick={() => setLinkColor('#9ca3af')}
                  className="rounded-lg border border-gray-300 px-3 text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  title="Reset to default"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                    />
                  </svg>
                </button>
              </div>
            </div>

            <div>
              <label className="mb-2 block">
                <span className="text-sm font-semibold text-gray-900">Copyright Background</span>
                <span className="mt-0.5 block text-xs text-gray-600">Copyright section background</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={copyrightBgColor}
                  onChange={(e) => setCopyrightBgColor(e.target.value)}
                  className="h-10 w-16 cursor-pointer rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <input
                  type="text"
                  value={copyrightBgColor}
                  onChange={(e) => setCopyrightBgColor(e.target.value)}
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="#000000"
                />
                <button
                  type="button"
                  onClick={() => setCopyrightBgColor('#000000')}
                  className="rounded-lg border border-gray-300 px-3 text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  title="Reset to default"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                    />
                  </svg>
                </button>
              </div>
            </div>

            <div>
              <label className="mb-2 block">
                <span className="text-sm font-semibold text-gray-900">Copyright Text Color</span>
                <span className="mt-0.5 block text-xs text-gray-600">Copyright section text</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={copyrightTextColor}
                  onChange={(e) => setCopyrightTextColor(e.target.value)}
                  className="h-10 w-16 cursor-pointer rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <input
                  type="text"
                  value={copyrightTextColor}
                  onChange={(e) => setCopyrightTextColor(e.target.value)}
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="#ffffff"
                />
                <button
                  type="button"
                  onClick={() => setCopyrightTextColor('#ffffff')}
                  className="rounded-lg border border-gray-300 px-3 text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  title="Reset to default"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Content Text Font Styling */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
              <svg
                className="h-5 w-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Content Text Font Styling</h3>
              <p className="mt-0.5 text-sm text-gray-600">Customize body text appearance</p>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <label className="mb-2 block">
                <span className="text-sm font-semibold text-gray-900">Font Family</span>
                <span className="mt-0.5 block text-xs text-gray-600">Choose content text font</span>
              </label>
              <select
                value={fontFamily}
                onChange={(e) => setFontFamily(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                style={{ fontFamily: fontFamily }}
              >
                {FONT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value} style={{ fontFamily: option.value }}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label className="mb-2 block">
                  <span className="text-sm font-semibold text-gray-900">Font Size</span>
                  <span className="mt-0.5 block text-xs text-gray-600">Content text size</span>
                </label>
                <select
                  value={fontSize}
                  onChange={(e) => setFontSize(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {FONT_SIZE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block">
                  <span className="text-sm font-semibold text-gray-900">Font Weight</span>
                  <span className="mt-0.5 block text-xs text-gray-600">Content text weight</span>
                </label>
                <select
                  value={fontWeight}
                  onChange={(e) => setFontWeight(Number(e.target.value))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {FONT_WEIGHT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="mb-2 block">
                <span className="text-sm font-semibold text-gray-900">Text Transform</span>
                <span className="mt-0.5 block text-xs text-gray-600">Content text case</span>
              </label>
              <select
                value={textTransform}
                onChange={(e) => setTextTransform(e.target.value as 'none' | 'uppercase' | 'lowercase' | 'capitalize')}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {TEXT_TRANSFORM_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Heading Text Font Styling */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
              <svg
                className="h-5 w-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Heading Text Font Styling</h3>
              <p className="mt-0.5 text-sm text-gray-600">Customize section headings</p>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <label className="mb-2 block">
                <span className="text-sm font-semibold text-gray-900">Font Family</span>
                <span className="mt-0.5 block text-xs text-gray-600">Choose heading font</span>
              </label>
              <select
                value={headingFontFamily}
                onChange={(e) => setHeadingFontFamily(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                style={{ fontFamily: headingFontFamily }}
              >
                {FONT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value} style={{ fontFamily: option.value }}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label className="mb-2 block">
                  <span className="text-sm font-semibold text-gray-900">Font Size</span>
                  <span className="mt-0.5 block text-xs text-gray-600">Heading text size</span>
                </label>
                <select
                  value={headingFontSize}
                  onChange={(e) => setHeadingFontSize(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {FONT_SIZE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block">
                  <span className="text-sm font-semibold text-gray-900">Font Weight</span>
                  <span className="mt-0.5 block text-xs text-gray-600">Heading text weight</span>
                </label>
                <select
                  value={headingFontWeight}
                  onChange={(e) => setHeadingFontWeight(Number(e.target.value))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {FONT_WEIGHT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="mb-2 block">
                <span className="text-sm font-semibold text-gray-900">Text Transform</span>
                <span className="mt-0.5 block text-xs text-gray-600">Heading text case</span>
              </label>
              <select
                value={headingTextTransform}
                onChange={(e) => setHeadingTextTransform(e.target.value as 'none' | 'uppercase' | 'lowercase' | 'capitalize')}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {TEXT_TRANSFORM_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Copyright Text Font Styling */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
              <svg
                className="h-5 w-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Copyright Text Font Styling</h3>
              <p className="mt-0.5 text-sm text-gray-600">Customize copyright section</p>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <label className="mb-2 block">
                <span className="text-sm font-semibold text-gray-900">Font Family</span>
                <span className="mt-0.5 block text-xs text-gray-600">Choose copyright font</span>
              </label>
              <select
                value={copyrightFontFamily}
                onChange={(e) => setCopyrightFontFamily(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                style={{ fontFamily: copyrightFontFamily }}
              >
                {FONT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value} style={{ fontFamily: option.value }}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label className="mb-2 block">
                  <span className="text-sm font-semibold text-gray-900">Font Size</span>
                  <span className="mt-0.5 block text-xs text-gray-600">Copyright text size</span>
                </label>
                <select
                  value={copyrightFontSize}
                  onChange={(e) => setCopyrightFontSize(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {FONT_SIZE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block">
                  <span className="text-sm font-semibold text-gray-900">Font Weight</span>
                  <span className="mt-0.5 block text-xs text-gray-600">Copyright text weight</span>
                </label>
                <select
                  value={copyrightFontWeight}
                  onChange={(e) => setCopyrightFontWeight(Number(e.target.value))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
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
        </div>

        {/* Additional Options - hide for Three Section (default), Restaurant (4 Columns + Nav), and 4 Columns layouts */}
        {layout !== 'default' && layout !== 'restaurant' && layout !== 'columns-4' && (
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
                <svg
                  className="h-5 w-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Additional Options</h3>
                <p className="mt-0.5 text-sm text-gray-600">Extra features and settings</p>
              </div>
            </div>

            {/* Newsletter option */}
            <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-4">
              <div>
                <div className="text-sm font-semibold text-gray-900">Newsletter Signup</div>
                <div className="mt-0.5 text-xs text-gray-600">Show newsletter form</div>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={showNewsletter}
                  onChange={(e) => setShowNewsletter(e.target.checked)}
                  className="peer sr-only"
                />
                <div className="peer h-6 w-11 rounded-full bg-gray-300 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-purple-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-500"></div>
              </label>
            </div>
          </div>
        )}

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
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M17 16v2a2 2 0 01-2 2H5a2 2 0 01-2-2v-7a2 2 0 012-2h2m3-4H9a2 2 0 00-2 2v7a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-1m-1 4l-3 3m0 0l-3-3m3 3V3"
                  />
                </svg>
                Save Changes
              </>
            )}
          </button>
        </div>
      </form>

      {/* Preview Modal Popup */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowPreview(false)} />
          <div className="relative z-10 w-full max-w-6xl overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-4">
              <div>
                <h2 className="text-xl font-bold text-white">Footer Live Preview</h2>
                <p className="mt-0.5 text-sm text-purple-100">Updates in real-time</p>
              </div>
              <button
                onClick={() => setShowPreview(false)}
                className="rounded-lg p-2 text-white transition-colors hover:bg-white/20"
                aria-label="Close preview"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="max-h-[80vh] overflow-y-auto bg-gray-50 p-8">
              <div className="mx-auto max-w-5xl">
                <div className="overflow-hidden rounded-xl border border-gray-300 bg-white shadow-lg">
                  <Footer
                    {...generateFooterPropsFromConfig(config, {
                      restaurantName: config?.restaurantName || 'Antler Foods',
                      aboutContent,
                      email,
                      phone,
                      address,
                      socialLinks: config?.socialLinks || [
                        { platform: 'facebook', url: 'https://facebook.com', order: 1 },
                        { platform: 'instagram', url: 'https://instagram.com', order: 2 },
                        { platform: 'twitter', url: 'https://twitter.com', order: 3 },
                      ],
                      columns: config?.columns || [],
                      showSocialMedia,
                      showNewsletter,
                      layout,
                      bgColor,
                      textColor,
                      linkColor,
                      copyrightBgColor,
                      copyrightTextColor,
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
                    })}
                  />
                </div>
              </div>
              <div className="mt-6 flex items-center gap-2 rounded-lg border border-purple-200 bg-purple-50 p-4">
                <svg
                  className="h-5 w-5 shrink-0 text-purple-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <p className="text-sm text-purple-900">
                  Preview shows how your footer will appear on the website
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
