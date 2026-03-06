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
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="inline-flex items-center gap-3 rounded-xl border border-purple-200 bg-purple-50 px-5 py-3.5">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-purple-600 border-t-transparent"></div>
          <p className="text-sm font-medium text-gray-700">Loading navbar settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      {/* Toast Notification */}
      {showToast && (
        <Toast
          message={toastMessage}
          type={toastType}
          onClose={() => setShowToast(false)}
        />
      )}

      <div className="mx-auto max-w-5xl">
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
                  d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Navigation Bar Settings</h1>
              <p className="mt-1 text-sm text-gray-600">Customize your website navigation</p>
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
                <p className="mt-0.5 text-sm text-gray-600">Choose navigation style and position</p>
              </div>
            </div>

            {/* Type/Layout */}
            <div className="mb-6">
              <label className="mb-3 block">
                <span className="text-sm font-semibold text-gray-900">Layout Type</span>
                <span className="mt-0.5 block text-xs text-gray-600">Choose a navigation style</span>
              </label>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {/* Default Layout */}
                <button
                  type="button"
                  className={`group relative cursor-pointer rounded-lg border-2 p-4 text-left transition-all ${
                    layout === 'default'
                      ? 'border-purple-500 bg-purple-50 shadow-md'
                      : 'border-gray-200 bg-white hover:border-purple-300 hover:bg-purple-50/50'
                  }`}
                  onClick={() => setLayout('default')}
                >
                  <div className="mb-3 rounded border border-gray-300 bg-gray-50 p-2">
                    <div className="flex items-center justify-between gap-1">
                      <div className="h-2 w-6 rounded bg-gray-400"></div>
                      <div className="flex gap-1">
                        <div className="h-2 w-4 rounded bg-gray-300"></div>
                        <div className="h-2 w-4 rounded bg-gray-300"></div>
                        <div className="h-2 w-4 rounded bg-gray-300"></div>
                      </div>
                      <div className="h-2 w-6 rounded bg-purple-400"></div>
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-gray-900">Default</div>
                  <div className="text-xs text-gray-600">Standard Navigation</div>
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
                  className={`group relative cursor-pointer rounded-lg border-2 p-4 text-left transition-all ${
                    layout === 'centered'
                      ? 'border-purple-500 bg-purple-50 shadow-md'
                      : 'border-gray-200 bg-white hover:border-purple-300 hover:bg-purple-50/50'
                  }`}
                  onClick={() => setLayout('centered')}
                >
                  <div className="mb-3 rounded border border-gray-300 bg-gray-50 p-2">
                    <div className="flex items-center justify-center gap-1">
                      <div className="h-2 w-6 rounded bg-gray-400"></div>
                      <div className="flex gap-1">
                        <div className="h-2 w-4 rounded bg-gray-300"></div>
                        <div className="h-2 w-4 rounded bg-gray-300"></div>
                        <div className="h-2 w-4 rounded bg-gray-300"></div>
                      </div>
                      <div className="h-2 w-6 rounded bg-purple-400"></div>
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-gray-900">Centered</div>
                  <div className="text-xs text-gray-600">All Items Center</div>
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

                {/* Logo Center Layout */}
                <button
                  type="button"
                  className={`group relative cursor-pointer rounded-lg border-2 p-4 text-left transition-all ${
                    layout === 'logo-center'
                      ? 'border-purple-500 bg-purple-50 shadow-md'
                      : 'border-gray-200 bg-white hover:border-purple-300 hover:bg-purple-50/50'
                  }`}
                  onClick={() => setLayout('logo-center')}
                >
                  <div className="mb-3 rounded border border-gray-300 bg-gray-50 p-2">
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex gap-1">
                        <div className="h-2 w-4 rounded bg-gray-300"></div>
                        <div className="h-2 w-4 rounded bg-gray-300"></div>
                      </div>
                      <div className="h-2 w-6 rounded bg-gray-400"></div>
                      <div className="flex gap-1">
                        <div className="h-2 w-4 rounded bg-gray-300"></div>
                        <div className="h-2 w-6 rounded bg-purple-400"></div>
                      </div>
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-gray-900">Logo Center</div>
                  <div className="text-xs text-gray-600">Logo in Middle</div>
                  {layout === 'logo-center' && (
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

                {/* Bordered Centered Layout */}
                <button
                  type="button"
                  className={`group relative cursor-pointer rounded-lg border-2 p-4 text-left transition-all ${
                    layout === 'bordered-centered'
                      ? 'border-purple-500 bg-purple-50 shadow-md'
                      : 'border-gray-200 bg-white hover:border-purple-300 hover:bg-purple-50/50'
                  }`}
                  onClick={() => setLayout('bordered-centered')}
                >
                  <div className="mb-3 rounded border-2 border-gray-300 bg-gray-50 p-2">
                    <div className="flex items-center justify-center gap-1">
                      <div className="h-2 w-6 rounded bg-gray-400"></div>
                      <div className="flex gap-1">
                        <div className="h-2 w-4 rounded bg-gray-300"></div>
                        <div className="h-2 w-4 rounded bg-gray-300"></div>
                        <div className="h-2 w-4 rounded bg-gray-300"></div>
                      </div>
                      <div className="h-2 w-6 rounded bg-purple-400"></div>
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-gray-900">Bordered Centered</div>
                  <div className="text-xs text-gray-600">With Border</div>
                  {layout === 'bordered-centered' && (
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

                {/* Stacked Layout */}
                <button
                  type="button"
                  className={`group relative cursor-pointer rounded-lg border-2 p-4 text-left transition-all ${
                    layout === 'stacked'
                      ? 'border-purple-500 bg-purple-50 shadow-md'
                      : 'border-gray-200 bg-white hover:border-purple-300 hover:bg-purple-50/50'
                  }`}
                  onClick={() => setLayout('stacked')}
                >
                  <div className="mb-3 rounded border border-gray-300 bg-gray-50 p-2">
                    <div className="flex flex-col items-center gap-1">
                      <div className="h-2 w-6 rounded bg-gray-400"></div>
                      <div className="flex gap-1">
                        <div className="h-2 w-4 rounded bg-gray-300"></div>
                        <div className="h-2 w-4 rounded bg-gray-300"></div>
                        <div className="h-2 w-4 rounded bg-gray-300"></div>
                        <div className="h-2 w-4 rounded bg-purple-400"></div>
                      </div>
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-gray-900">Stacked</div>
                  <div className="text-xs text-gray-600">Vertical Layout</div>
                  {layout === 'stacked' && (
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

                {/* Split Layout */}
                <button
                  type="button"
                  className={`group relative cursor-pointer rounded-lg border-2 p-4 text-left transition-all ${
                    layout === 'split'
                      ? 'border-purple-500 bg-purple-50 shadow-md'
                      : 'border-gray-200 bg-white hover:border-purple-300 hover:bg-purple-50/50'
                  }`}
                  onClick={() => setLayout('split')}
                >
                  <div className="mb-3 rounded border border-gray-300 bg-gray-50 p-2">
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex gap-1">
                        <div className="h-2 w-4 rounded bg-gray-300"></div>
                        <div className="h-2 w-4 rounded bg-gray-300"></div>
                      </div>
                      <div className="h-2 w-6 rounded bg-gray-400"></div>
                      <div className="flex gap-1">
                        <div className="h-2 w-4 rounded bg-gray-300"></div>
                        <div className="h-2 w-6 rounded bg-purple-400"></div>
                      </div>
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-gray-900">Split</div>
                  <div className="text-xs text-gray-600">Left & Right Aligned</div>
                  {layout === 'split' && (
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

            {/* Position */}
            <div>
              <label className="mb-3 block">
                <span className="text-sm font-semibold text-gray-900">Position</span>
                <span className="mt-0.5 block text-xs text-gray-600">Scroll behavior</span>
              </label>
              <div className="flex gap-4">
                <label className="flex flex-1 cursor-pointer items-center gap-3 rounded-lg border-2 p-4 transition-all hover:bg-purple-50/50 has-[:checked]:border-purple-500 has-[:checked]:bg-purple-50">
                  <input
                    type="radio"
                    value="absolute"
                    checked={position === 'absolute'}
                    onChange={(e) => setPosition(e.target.value as any)}
                    className="h-4 w-4 border-gray-300 text-purple-600 focus:ring-2 focus:ring-purple-500"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-gray-900">Absolute</div>
                    <div className="text-xs text-gray-600">Scrolls with page</div>
                  </div>
                </label>
                <label className="flex flex-1 cursor-pointer items-center gap-3 rounded-lg border-2 p-4 transition-all hover:bg-purple-50/50 has-[:checked]:border-purple-500 has-[:checked]:bg-purple-50">
                  <input
                    type="radio"
                    value="fixed"
                    checked={position === 'fixed'}
                    onChange={(e) => setPosition(e.target.value as any)}
                    className="h-4 w-4 border-gray-300 text-purple-600 focus:ring-2 focus:ring-purple-500"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-gray-900">Fixed</div>
                    <div className="text-xs text-gray-600">Stays at top</div>
                  </div>
                </label>
              </div>
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
                <p className="mt-0.5 text-sm text-gray-600">Customize appearance and branding</p>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {/* Background Color */}
              <div>
                <label className="mb-2 block">
                  <span className="text-sm font-semibold text-gray-900">Background Color</span>
                  <span className="mt-0.5 block text-xs text-gray-600">Navbar background</span>
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
                    placeholder="#ffffff"
                  />
                  <button
                    type="button"
                    onClick={() => setBgColor('#ffffff')}
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

              {/* Text Color */}
              <div>
                <label className="mb-2 block">
                  <span className="text-sm font-semibold text-gray-900">Text Color</span>
                  <span className="mt-0.5 block text-xs text-gray-600">Link and text color</span>
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
                    placeholder="#000000"
                  />
                  <button
                    type="button"
                    onClick={() => setTextColor('#000000')}
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

            {/* Current Logo Display */}
            <div className="mt-6">
              <label className="mb-2 block">
                <span className="text-sm font-semibold text-gray-900">Restaurant Logo</span>
                <span className="mt-0.5 block text-xs text-gray-600">Logo from restaurant settings</span>
              </label>
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                {config?.logoUrl ? (
                  <div className="flex items-center gap-3">
                    <img
                      src={config.logoUrl}
                      alt={config.restaurantName || 'Restaurant Logo'}
                      className="rounded object-contain"
                      style={{ height: `${logoSize}px` }}
                    />
                    <span className="text-sm font-medium text-gray-700">{config.restaurantName}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center rounded bg-purple-100 px-3 py-2 text-sm font-bold text-purple-700">
                      {config?.restaurantName
                        ? config.restaurantName
                            .split(' ')
                            .map(word => word[0])
                            .join('')
                            .toUpperCase()
                            .slice(0, 3)
                        : 'R'}
                    </div>
                    <span className="text-sm font-medium text-gray-700">
                      {config?.restaurantName || 'Restaurant'} (Initials)
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Logo Size */}
            <div className="mt-6">
              <label className="mb-2 block">
                <span className="text-sm font-semibold text-gray-900">Logo Size</span>
                <span className="mt-0.5 block text-xs text-gray-600">Height in pixels (20-100)</span>
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="20"
                  max="100"
                  value={logoSize}
                  onChange={(e) => setLogoSize(parseInt(e.target.value))}
                  className="h-2 flex-1 appearance-none rounded-lg bg-gray-200 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-purple-600 [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-purple-600 [&::-moz-range-thumb]:cursor-pointer"
                />
                <input
                  type="number"
                  min="20"
                  max="100"
                  value={logoSize}
                  onChange={(e) => setLogoSize(parseInt(e.target.value))}
                  className="w-20 rounded-lg border border-gray-300 px-3 py-2 text-sm text-center focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <span className="text-sm font-medium text-gray-600">px</span>
              </div>
            </div>

            {/* Font Family */}
            <div className="mt-6">
              <label className="mb-2 block">
                <span className="text-sm font-semibold text-gray-900">Menu Font</span>
                <span className="mt-0.5 block text-xs text-gray-600">Font family for menu items</span>
              </label>
              <select
                value={fontFamily}
                onChange={(e) => setFontFamily(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
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
            <div className="mt-6 grid gap-6 md:grid-cols-2">
              {/* Font Size */}
              <div>
                <label className="mb-2 block">
                  <span className="text-sm font-semibold text-gray-900">Menu Font Size</span>
                  <span className="mt-0.5 block text-xs text-gray-600">Text size</span>
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

              {/* Font Weight */}
              <div>
                <label className="mb-2 block">
                  <span className="text-sm font-semibold text-gray-900">Menu Font Weight</span>
                  <span className="mt-0.5 block text-xs text-gray-600">Text boldness</span>
                </label>
                <select
                  value={fontWeight}
                  onChange={(e) => setFontWeight(parseInt(e.target.value))}
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

            {/* Text Transform */}
            <div className="mt-6">
              <label className="mb-2 block">
                <span className="text-sm font-semibold text-gray-900">Menu Text Style</span>
                <span className="mt-0.5 block text-xs text-gray-600">Letter casing</span>
              </label>
              <select
                value={textTransform}
                onChange={(e) => setTextTransform(e.target.value as any)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
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
                    d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zM12 2.25V4.5m5.834.166l-1.591 1.591M20.25 10.5H18M7.757 14.743l-1.59 1.59M6 10.5H3.75m4.007-4.243l-1.59-1.59"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Call-to-Action Button</h3>
                <p className="mt-0.5 text-sm text-gray-600">Configure action button settings</p>
              </div>
            </div>

            {/* Online Ordering Button Toggle */}
            <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-4">
              <div>
                <div className="text-sm font-semibold text-gray-900">Show CTA Button</div>
                <div className="mt-0.5 text-xs text-gray-600">Display action button in navbar</div>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={showOrderButton}
                  onChange={(e) => setShowOrderButton(e.target.checked)}
                  className="peer sr-only"
                />
                <div className="peer h-6 w-11 rounded-full bg-gray-300 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-purple-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-500"></div>
              </label>
            </div>

            {/* Button Style & Settings (shown when toggle is on) */}
            {showOrderButton && (
              <>
                <div className="mt-6">
                  <label className="mb-3 block">
                    <span className="text-sm font-semibold text-gray-900">Button Style</span>
                    <span className="mt-0.5 block text-xs text-gray-600">Visual appearance</span>
                  </label>
                  <div className="flex gap-4">
                    <label className="flex flex-1 cursor-pointer items-center gap-3 rounded-lg border-2 p-4 transition-all hover:bg-purple-50/50 has-[:checked]:border-purple-500 has-[:checked]:bg-purple-50">
                      <input
                        type="radio"
                        value="primary"
                        checked={buttonStyle === 'primary'}
                        onChange={(e) => setButtonStyle(e.target.value as 'primary' | 'secondary')}
                        className="h-4 w-4 border-gray-300 text-purple-600 focus:ring-2 focus:ring-purple-500"
                      />
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-gray-900">Primary</div>
                        <div className="text-xs text-gray-600">Filled button</div>
                      </div>
                    </label>
                    <label className="flex flex-1 cursor-pointer items-center gap-3 rounded-lg border-2 p-4 transition-all hover:bg-purple-50/50 has-[:checked]:border-purple-500 has-[:checked]:bg-purple-50">
                      <input
                        type="radio"
                        value="secondary"
                        checked={buttonStyle === 'secondary'}
                        onChange={(e) => setButtonStyle(e.target.value as 'primary' | 'secondary')}
                        className="h-4 w-4 border-gray-300 text-purple-600 focus:ring-2 focus:ring-purple-500"
                      />
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-gray-900">Secondary</div>
                        <div className="text-xs text-gray-600">Outlined button</div>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="mt-6 space-y-4">
                  <div>
                    <label className="mb-2 block">
                      <span className="text-sm font-semibold text-gray-900">Button Text</span>
                      <span className="mt-0.5 block text-xs text-gray-600">What the button says</span>
                    </label>
                    <input
                      type="text"
                      value={orderButtonText}
                      onChange={(e) => setOrderButtonText(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="Order Online"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block">
                      <span className="text-sm font-semibold text-gray-900">Button Link</span>
                      <span className="mt-0.5 block text-xs text-gray-600">Where it navigates</span>
                    </label>
                    <input
                      type="text"
                      value={orderButtonHref}
                      onChange={(e) => setOrderButtonHref(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="/menu"
                    />
                  </div>
                </div>
              </>
            )}
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
      </div>

      {/* Preview Modal Popup */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowPreview(false)} />
          <div className="relative z-10 w-full max-w-6xl overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-4">
              <div>
                <h2 className="text-xl font-bold text-white">Navbar Live Preview</h2>
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
                  Preview shows how your navbar will appear on the website
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
