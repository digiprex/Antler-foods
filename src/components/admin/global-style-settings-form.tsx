/**
 * Global Style Settings Form
 *
 * Enhanced interface for configuring global website typography:
 * - Title styling (font family, size, weight, color)
 * - Subheading styling
 * - Paragraph styling
 * - Live preview of changes
 */

'use client';

import { useState, useEffect } from 'react';
import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useGlobalStyleConfig, useUpdateGlobalStyleConfig } from '@/hooks/use-global-style-config';
import type { GlobalStyleConfig, FontStyle } from '@/types/global-style.types';
import Toast from '@/components/ui/toast';
import { loadGoogleFonts, preloadGoogleFonts } from '@/utils/google-fonts';

// Font options - Popular Google Fonts
const FONT_OPTIONS = [
  { value: 'Inter, system-ui, sans-serif', label: 'Inter (Default)' },

  // Sans-serif fonts
  { value: 'Roboto, sans-serif', label: 'Roboto' },
  { value: 'Open Sans, sans-serif', label: 'Open Sans' },
  { value: 'Lato, sans-serif', label: 'Lato' },
  { value: 'Montserrat, sans-serif', label: 'Montserrat' },
  { value: 'Poppins, sans-serif', label: 'Poppins' },
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

const TEXT_TRANSFORM_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'uppercase', label: 'Uppercase' },
  { value: 'lowercase', label: 'Lowercase' },
  { value: 'capitalize', label: 'Capitalize' },
];

const BUTTON_SIZE_OPTIONS = [
  { value: 'small', label: 'Small', padding: '0.5rem 1rem' },
  { value: 'medium', label: 'Medium', padding: '0.75rem 1.5rem' },
  { value: 'large', label: 'Large', padding: '1rem 2rem' },
];

const FONT_SIZE_OPTIONS = [
  { value: '0.75rem', label: 'Extra Small (12px)' },
  { value: '0.875rem', label: 'Small (14px)' },
  { value: '1rem', label: 'Base (16px)' },
  { value: '1.125rem', label: 'Medium (18px)' },
  { value: '1.25rem', label: 'Large (20px)' },
  { value: '1.5rem', label: 'Extra Large (24px)' },
  { value: '1.875rem', label: '2XL (30px)' },
  { value: '2.25rem', label: '3XL (36px)' },
  { value: '3rem', label: '4XL (48px)' },
  { value: '3.75rem', label: '5XL (60px)' },
];

const BORDER_RADIUS_OPTIONS = [
  { value: '0', label: 'None (Square)' },
  { value: '0.125rem', label: 'Extra Small (2px)' },
  { value: '0.25rem', label: 'Small (4px)' },
  { value: '0.375rem', label: 'Medium (6px)' },
  { value: '0.5rem', label: 'Large (8px)' },
  { value: '0.75rem', label: 'Extra Large (12px)' },
  { value: '1rem', label: '2XL (16px)' },
  { value: '1.5rem', label: '3XL (24px)' },
  { value: '9999px', label: 'Full (Pill)' },
];

const BORDER_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: '1px solid #d1d5db', label: 'Light Gray (1px)' },
  { value: '2px solid #d1d5db', label: 'Light Gray (2px)' },
  { value: '1px solid #9ca3af', label: 'Gray (1px)' },
  { value: '2px solid #9ca3af', label: 'Gray (2px)' },
  { value: '1px solid #000000', label: 'Black (1px)' },
  { value: '2px solid #000000', label: 'Black (2px)' },
  { value: '1px solid currentColor', label: 'Current Color (1px)' },
  { value: '2px solid currentColor', label: 'Current Color (2px)' },
];

const FONT_WEIGHT_OPTIONS = [
  { value: 100, label: 'Thin (100)' },
  { value: 200, label: 'Extra Light (200)' },
  { value: 300, label: 'Light (300)' },
  { value: 400, label: 'Normal (400)' },
  { value: 500, label: 'Medium (500)' },
  { value: 600, label: 'Semi Bold (600)' },
  { value: 700, label: 'Bold (700)' },
  { value: 800, label: 'Extra Bold (800)' },
  { value: 900, label: 'Black (900)' },
];

// Helper function to get padding from button size
const getButtonPadding = (size: 'small' | 'medium' | 'large' = 'medium'): string => {
  const sizeOption = BUTTON_SIZE_OPTIONS.find(option => option.value === size);
  return sizeOption?.padding || '0.75rem 1.5rem';
};

export default function GlobalStyleSettingsForm() {
  // Add animations
  if (typeof document !== 'undefined') {
    const styleId = 'global-style-animations';
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
    () => `/api/global-style-config?restaurant_id=${encodeURIComponent(restaurantId)}`,
    [restaurantId],
  );

  const { config, loading, error: fetchError } = useGlobalStyleConfig({
    apiEndpoint: configApiEndpoint,
  });
  const { updateGlobalStyle, updating, error: updateError } = useUpdateGlobalStyleConfig(configApiEndpoint);

  // Form state for title
  const [titleFontFamily, setTitleFontFamily] = useState('Inter, system-ui, sans-serif');
  const [titleFontSize, setTitleFontSize] = useState('2.25rem');
  const [titleFontWeight, setTitleFontWeight] = useState(700);
  const [titleColor, setTitleColor] = useState('#111827');
  const [titleLineHeight, setTitleLineHeight] = useState('1.2');
  const [titleLetterSpacing, setTitleLetterSpacing] = useState('-0.025em');
  const [titleTextTransform, setTitleTextTransform] = useState<'none' | 'uppercase' | 'lowercase' | 'capitalize'>('none');

  // Form state for subheading
  const [subheadingFontFamily, setSubheadingFontFamily] = useState('Inter, system-ui, sans-serif');
  const [subheadingFontSize, setSubheadingFontSize] = useState('1.5rem');
  const [subheadingFontWeight, setSubheadingFontWeight] = useState(600);
  const [subheadingColor, setSubheadingColor] = useState('#374151');
  const [subheadingLineHeight, setSubheadingLineHeight] = useState('1.3');
  const [subheadingLetterSpacing, setSubheadingLetterSpacing] = useState('-0.015em');
  const [subheadingTextTransform, setSubheadingTextTransform] = useState<'none' | 'uppercase' | 'lowercase' | 'capitalize'>('none');

  // Form state for paragraph
  const [paragraphFontFamily, setParagraphFontFamily] = useState('Inter, system-ui, sans-serif');
  const [paragraphFontSize, setParagraphFontSize] = useState('1rem');
  const [paragraphFontWeight, setParagraphFontWeight] = useState(400);
  const [paragraphColor, setParagraphColor] = useState('#6b7280');
  const [paragraphLineHeight, setParagraphLineHeight] = useState('1.6');
  const [paragraphLetterSpacing, setParagraphLetterSpacing] = useState('0');
  const [paragraphTextTransform, setParagraphTextTransform] = useState<'none' | 'uppercase' | 'lowercase' | 'capitalize'>('none');

  // Form state for primary button
  const [primaryButtonBgColor, setPrimaryButtonBgColor] = useState('#2563eb');
  const [primaryButtonColor, setPrimaryButtonColor] = useState('#ffffff');
  const [primaryButtonFontSize, setPrimaryButtonFontSize] = useState('1rem');
  const [primaryButtonFontWeight, setPrimaryButtonFontWeight] = useState(600);
  const [primaryButtonBorderRadius, setPrimaryButtonBorderRadius] = useState('0.5rem');
  const [primaryButtonSize, setPrimaryButtonSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [primaryButtonBorder, setPrimaryButtonBorder] = useState('none');
  const [primaryButtonHoverBgColor, setPrimaryButtonHoverBgColor] = useState('#1d4ed8');
  const [primaryButtonHoverColor, setPrimaryButtonHoverColor] = useState('#ffffff');
  const [primaryButtonFontFamily, setPrimaryButtonFontFamily] = useState('Inter, system-ui, sans-serif');
  const [primaryButtonTextTransform, setPrimaryButtonTextTransform] = useState<'none' | 'uppercase' | 'lowercase' | 'capitalize'>('none');

  // Form state for secondary button
  const [secondaryButtonBgColor, setSecondaryButtonBgColor] = useState('#ffffff');
  const [secondaryButtonColor, setSecondaryButtonColor] = useState('#374151');
  const [secondaryButtonFontSize, setSecondaryButtonFontSize] = useState('1rem');
  const [secondaryButtonFontWeight, setSecondaryButtonFontWeight] = useState(600);
  const [secondaryButtonBorderRadius, setSecondaryButtonBorderRadius] = useState('0.5rem');
  const [secondaryButtonSize, setSecondaryButtonSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [secondaryButtonBorder, setSecondaryButtonBorder] = useState('1px solid #d1d5db');
  const [secondaryButtonHoverBgColor, setSecondaryButtonHoverBgColor] = useState('#f9fafb');
  const [secondaryButtonHoverColor, setSecondaryButtonHoverColor] = useState('#111827');
  const [secondaryButtonFontFamily, setSecondaryButtonFontFamily] = useState('Inter, system-ui, sans-serif');
  const [secondaryButtonTextTransform, setSecondaryButtonTextTransform] = useState<'none' | 'uppercase' | 'lowercase' | 'capitalize'>('none');

  // Accent colors
  const [primaryAccentColor, setPrimaryAccentColor] = useState('#2563eb');
  const [secondaryAccentColor, setSecondaryAccentColor] = useState('#10b981');

  // Toast state
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  // Preview visibility state
  const [showPreview, setShowPreview] = useState(false);

  // Initialize form with fetched config
  useEffect(() => {
    if (config) {
      // Title settings
      if (config.title) {
        setTitleFontFamily(config.title.fontFamily || 'Inter, system-ui, sans-serif');
        setTitleFontSize(config.title.fontSize || '2.25rem');
        setTitleFontWeight(config.title.fontWeight || 700);
        setTitleColor(config.title.color || '#111827');
        setTitleLineHeight(config.title.lineHeight || '1.2');
        setTitleLetterSpacing(config.title.letterSpacing || '-0.025em');
        setTitleTextTransform(config.title.textTransform || 'none');
      }

      // Subheading settings
      if (config.subheading) {
        setSubheadingFontFamily(config.subheading.fontFamily || 'Inter, system-ui, sans-serif');
        setSubheadingFontSize(config.subheading.fontSize || '1.5rem');
        setSubheadingFontWeight(config.subheading.fontWeight || 600);
        setSubheadingColor(config.subheading.color || '#374151');
        setSubheadingLineHeight(config.subheading.lineHeight || '1.3');
        setSubheadingLetterSpacing(config.subheading.letterSpacing || '-0.015em');
        setSubheadingTextTransform(config.subheading.textTransform || 'none');
      }

      // Paragraph settings
      if (config.paragraph) {
        setParagraphFontFamily(config.paragraph.fontFamily || 'Inter, system-ui, sans-serif');
        setParagraphFontSize(config.paragraph.fontSize || '1rem');
        setParagraphFontWeight(config.paragraph.fontWeight || 400);
        setParagraphColor(config.paragraph.color || '#6b7280');
        setParagraphLineHeight(config.paragraph.lineHeight || '1.6');
        setParagraphLetterSpacing(config.paragraph.letterSpacing || '0');
        setParagraphTextTransform(config.paragraph.textTransform || 'none');
      }

      // Primary button settings
      if (config.primaryButton) {
        setPrimaryButtonBgColor(config.primaryButton.backgroundColor || '#2563eb');
        setPrimaryButtonColor(config.primaryButton.color || '#ffffff');
        setPrimaryButtonFontSize(config.primaryButton.fontSize || '1rem');
        setPrimaryButtonFontWeight(config.primaryButton.fontWeight || 600);
        setPrimaryButtonBorderRadius(config.primaryButton.borderRadius || '0.5rem');
        setPrimaryButtonSize(config.primaryButton.size || 'medium');
        setPrimaryButtonBorder(config.primaryButton.border || 'none');
        setPrimaryButtonHoverBgColor(config.primaryButton.hoverBackgroundColor || '#1d4ed8');
        setPrimaryButtonHoverColor(config.primaryButton.hoverColor || '#ffffff');
        setPrimaryButtonFontFamily(config.primaryButton.fontFamily || 'Inter, system-ui, sans-serif');
        setPrimaryButtonTextTransform(config.primaryButton.textTransform || 'none');
      }

      // Secondary button settings
      if (config.secondaryButton) {
        setSecondaryButtonBgColor(config.secondaryButton.backgroundColor || '#ffffff');
        setSecondaryButtonColor(config.secondaryButton.color || '#374151');
        setSecondaryButtonFontSize(config.secondaryButton.fontSize || '1rem');
        setSecondaryButtonFontWeight(config.secondaryButton.fontWeight || 600);
        setSecondaryButtonBorderRadius(config.secondaryButton.borderRadius || '0.5rem');
        setSecondaryButtonSize(config.secondaryButton.size || 'medium');
        setSecondaryButtonBorder(config.secondaryButton.border || '1px solid #d1d5db');
        setSecondaryButtonHoverBgColor(config.secondaryButton.hoverBackgroundColor || '#f9fafb');
        setSecondaryButtonHoverColor(config.secondaryButton.hoverColor || '#111827');
        setSecondaryButtonFontFamily(config.secondaryButton.fontFamily || 'Inter, system-ui, sans-serif');
        setSecondaryButtonTextTransform(config.secondaryButton.textTransform || 'none');
      }

      // Accent colors
      setPrimaryAccentColor((config as any).primaryAccentColor || '#2563eb');
      setSecondaryAccentColor((config as any).secondaryAccentColor || '#10b981');
    }
  }, [config]);

  // Load Google Fonts when font families change
  useEffect(() => {
    const selectedFonts = [
      titleFontFamily,
      subheadingFontFamily,
      paragraphFontFamily,
      primaryButtonFontFamily,
      secondaryButtonFontFamily,
    ];
    loadGoogleFonts(selectedFonts);
  }, [
    titleFontFamily,
    subheadingFontFamily,
    paragraphFontFamily,
    primaryButtonFontFamily,
    secondaryButtonFontFamily,
  ]);

  // Preload popular Google Fonts on component mount
  useEffect(() => {
    preloadGoogleFonts();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!restaurantId) {
      setToastMessage('Restaurant ID not found. Please refresh the page.');
      setToastType('error');
      setShowToast(true);
      return;
    }

    try {
      await updateGlobalStyle({
        restaurant_id: restaurantId,
        title: {
          fontFamily: titleFontFamily,
          fontSize: titleFontSize,
          fontWeight: titleFontWeight,
          color: titleColor,
          lineHeight: titleLineHeight,
          letterSpacing: titleLetterSpacing,
          textTransform: titleTextTransform,
        },
        subheading: {
          fontFamily: subheadingFontFamily,
          fontSize: subheadingFontSize,
          fontWeight: subheadingFontWeight,
          color: subheadingColor,
          lineHeight: subheadingLineHeight,
          letterSpacing: subheadingLetterSpacing,
          textTransform: subheadingTextTransform,
        },
        paragraph: {
          fontFamily: paragraphFontFamily,
          fontSize: paragraphFontSize,
          fontWeight: paragraphFontWeight,
          color: paragraphColor,
          lineHeight: paragraphLineHeight,
          letterSpacing: paragraphLetterSpacing,
          textTransform: paragraphTextTransform,
        },
        primaryButton: {
          backgroundColor: primaryButtonBgColor,
          color: primaryButtonColor,
          fontSize: primaryButtonFontSize,
          fontWeight: primaryButtonFontWeight,
          borderRadius: primaryButtonBorderRadius,
          size: primaryButtonSize,
          border: primaryButtonBorder,
          hoverBackgroundColor: primaryButtonHoverBgColor,
          hoverColor: primaryButtonHoverColor,
          fontFamily: primaryButtonFontFamily,
          textTransform: primaryButtonTextTransform,
        },
        secondaryButton: {
          backgroundColor: secondaryButtonBgColor,
          color: secondaryButtonColor,
          fontSize: secondaryButtonFontSize,
          fontWeight: secondaryButtonFontWeight,
          borderRadius: secondaryButtonBorderRadius,
          size: secondaryButtonSize,
          border: secondaryButtonBorder,
          hoverBackgroundColor: secondaryButtonHoverBgColor,
          hoverColor: secondaryButtonHoverColor,
          fontFamily: secondaryButtonFontFamily,
          textTransform: secondaryButtonTextTransform,
        },
        primaryAccentColor,
        secondaryAccentColor,
      });

      setToastMessage('Global style settings saved successfully!');
      setToastType('success');
      setShowToast(true);
    } catch (err) {
      console.error('Failed to update global styles:', err);
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
          <p className="text-sm font-medium text-gray-700">Loading global style settings...</p>
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

      {/* Page Header */}
      <div className="mb-8 flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg">
            <svg className="h-7 w-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Global Style Settings</h1>
            <p className="mt-1 text-sm text-gray-600">Configure typography for your website</p>
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
        {/* Accent Colors */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 bg-gradient-to-r from-purple-50 to-white px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
                <svg className="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Accent Colors</h3>
                <p className="text-sm text-gray-600">Brand accent colors for highlights and emphasis</p>
              </div>
            </div>
          </div>

          <div className="space-y-6 p-6">
            {/* Primary Accent Color */}
            <div>
              <label className="block text-sm font-medium text-gray-900">
                Primary Accent Color
              </label>
              <p className="mt-1 text-xs text-gray-600">Main brand accent color</p>
              <div className="mt-2 flex gap-3">
                <div className="relative flex-1">
                  <input
                    type="color"
                    value={primaryAccentColor}
                    onChange={(e) => setPrimaryAccentColor(e.target.value)}
                    className="h-10 w-full cursor-pointer rounded-lg border border-gray-300"
                    style={{ padding: '2px' }}
                  />
                </div>
                <input
                  type="text"
                  value={primaryAccentColor}
                  onChange={(e) => setPrimaryAccentColor(e.target.value)}
                  className="w-28 rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono text-gray-900 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="#2563eb"
                />
              </div>
            </div>

            {/* Secondary Accent Color */}
            <div>
              <label className="block text-sm font-medium text-gray-900">
                Secondary Accent Color
              </label>
              <p className="mt-1 text-xs text-gray-600">Alternative accent color for variety</p>
              <div className="mt-2 flex gap-3">
                <div className="relative flex-1">
                  <input
                    type="color"
                    value={secondaryAccentColor}
                    onChange={(e) => setSecondaryAccentColor(e.target.value)}
                    className="h-10 w-full cursor-pointer rounded-lg border border-gray-300"
                    style={{ padding: '2px' }}
                  />
                </div>
                <input
                  type="text"
                  value={secondaryAccentColor}
                  onChange={(e) => setSecondaryAccentColor(e.target.value)}
                  className="w-28 rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono text-gray-900 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="#10b981"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Title Section */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
              <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Title Styling (H1, Main Headings)</h3>
              <p className="mt-0.5 text-sm text-gray-600">Customize main heading typography</p>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-900">
                Font Family
              </label>
              <p className="mt-1 text-xs text-gray-600">Choose title font</p>
              <select
                value={titleFontFamily}
                onChange={(e) => setTitleFontFamily(e.target.value)}
                className="mt-2 block w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 shadow-sm transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                style={{ fontFamily: titleFontFamily }}
              >
                {FONT_OPTIONS.map((font) => (
                  <option key={font.value} value={font.value} style={{ fontFamily: font.value }}>
                    {font.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900">
                Font Size
              </label>
              <p className="mt-1 text-xs text-gray-600">Title size</p>
              <select
                value={titleFontSize}
                onChange={(e) => setTitleFontSize(e.target.value)}
                className="mt-2 block w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 shadow-sm transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {FONT_SIZE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900">
                Font Weight
              </label>
              <p className="mt-1 text-xs text-gray-600">Boldness of text</p>
              <select
                value={titleFontWeight}
                onChange={(e) => setTitleFontWeight(parseInt(e.target.value))}
                className="mt-2 block w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 shadow-sm transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {FONT_WEIGHT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900">
                Color
              </label>
              <p className="mt-1 text-xs text-gray-600">Text color</p>
              <div className="mt-2 flex items-center gap-3">
                <input
                  type="color"
                  value={titleColor}
                  onChange={(e) => setTitleColor(e.target.value)}
                  className="h-10 w-16 cursor-pointer rounded-lg border border-gray-300 shadow-sm"
                />
                <input
                  type="text"
                  value={titleColor}
                  onChange={(e) => setTitleColor(e.target.value)}
                  className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 shadow-sm transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="#111827"
                />
                <button
                  type="button"
                  onClick={() => setTitleColor('#111827')}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
                  title="Reset to default"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900">
                Line Height
              </label>
              <p className="mt-1 text-xs text-gray-600">Line spacing</p>
              <input
                type="text"
                value={titleLineHeight}
                onChange={(e) => setTitleLineHeight(e.target.value)}
                className="mt-2 block w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 shadow-sm transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="1.2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900">
                Letter Spacing
              </label>
              <p className="mt-1 text-xs text-gray-600">Character spacing</p>
              <input
                type="text"
                value={titleLetterSpacing}
                onChange={(e) => setTitleLetterSpacing(e.target.value)}
                className="mt-2 block w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 shadow-sm transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="-0.025em"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-900">
                Text Transform
              </label>
              <p className="mt-1 text-xs text-gray-600">Case transformation</p>
              <select
                value={titleTextTransform}
                onChange={(e) => setTitleTextTransform(e.target.value as any)}
                className="mt-2 block w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 shadow-sm transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
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

        {/* Subheading Section */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
              <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Subheading Styling (H2, H3, Section Headings)</h3>
              <p className="mt-0.5 text-sm text-gray-600">Customize section subheading typography</p>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-900">
                Font Family
              </label>
              <p className="mt-1 text-xs text-gray-600">Choose subheading font</p>
              <select
                value={subheadingFontFamily}
                onChange={(e) => setSubheadingFontFamily(e.target.value)}
                className="mt-2 block w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 shadow-sm transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                style={{ fontFamily: subheadingFontFamily }}
              >
                {FONT_OPTIONS.map((font) => (
                  <option key={font.value} value={font.value} style={{ fontFamily: font.value }}>
                    {font.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900">
                Font Size
              </label>
              <p className="mt-1 text-xs text-gray-600">Subheading size</p>
              <select
                value={subheadingFontSize}
                onChange={(e) => setSubheadingFontSize(e.target.value)}
                className="mt-2 block w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 shadow-sm transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {FONT_SIZE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900">
                Font Weight
              </label>
              <p className="mt-1 text-xs text-gray-600">Boldness of text</p>
              <select
                value={subheadingFontWeight}
                onChange={(e) => setSubheadingFontWeight(parseInt(e.target.value))}
                className="mt-2 block w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 shadow-sm transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {FONT_WEIGHT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900">
                Color
              </label>
              <p className="mt-1 text-xs text-gray-600">Text color</p>
              <div className="mt-2 flex items-center gap-3">
                <input
                  type="color"
                  value={subheadingColor}
                  onChange={(e) => setSubheadingColor(e.target.value)}
                  className="h-10 w-16 cursor-pointer rounded-lg border border-gray-300 shadow-sm"
                />
                <input
                  type="text"
                  value={subheadingColor}
                  onChange={(e) => setSubheadingColor(e.target.value)}
                  className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 shadow-sm transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="#374151"
                />
                <button
                  type="button"
                  onClick={() => setSubheadingColor('#374151')}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
                  title="Reset to default"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900">
                Line Height
              </label>
              <p className="mt-1 text-xs text-gray-600">Line spacing</p>
              <input
                type="text"
                value={subheadingLineHeight}
                onChange={(e) => setSubheadingLineHeight(e.target.value)}
                className="mt-2 block w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 shadow-sm transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="1.3"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900">
                Letter Spacing
              </label>
              <p className="mt-1 text-xs text-gray-600">Character spacing</p>
              <input
                type="text"
                value={subheadingLetterSpacing}
                onChange={(e) => setSubheadingLetterSpacing(e.target.value)}
                className="mt-2 block w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 shadow-sm transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="-0.015em"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900">
                Text Transform
              </label>
              <p className="mt-1 text-xs text-gray-600">Case transformation</p>
              <select
                value={subheadingTextTransform}
                onChange={(e) => setSubheadingTextTransform(e.target.value as any)}
                className="mt-2 block w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 shadow-sm transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
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

        {/* Paragraph Section */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
              <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Paragraph Styling (Body Text, Descriptions)</h3>
              <p className="mt-0.5 text-sm text-gray-600">Customize body text typography</p>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-900">
                Font Family
              </label>
              <p className="mt-1 text-xs text-gray-600">Choose body text font</p>
              <select
                value={paragraphFontFamily}
                onChange={(e) => setParagraphFontFamily(e.target.value)}
                className="mt-2 block w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 shadow-sm transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                style={{ fontFamily: paragraphFontFamily }}
              >
                {FONT_OPTIONS.map((font) => (
                  <option key={font.value} value={font.value} style={{ fontFamily: font.value }}>
                    {font.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900">
                Font Size
              </label>
              <p className="mt-1 text-xs text-gray-600">Body text size</p>
              <select
                value={paragraphFontSize}
                onChange={(e) => setParagraphFontSize(e.target.value)}
                className="mt-2 block w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 shadow-sm transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {FONT_SIZE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900">
                Font Weight
              </label>
              <p className="mt-1 text-xs text-gray-600">Boldness of text</p>
              <select
                value={paragraphFontWeight}
                onChange={(e) => setParagraphFontWeight(parseInt(e.target.value))}
                className="mt-2 block w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 shadow-sm transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {FONT_WEIGHT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900">
                Color
              </label>
              <p className="mt-1 text-xs text-gray-600">Text color</p>
              <div className="mt-2 flex items-center gap-3">
                <input
                  type="color"
                  value={paragraphColor}
                  onChange={(e) => setParagraphColor(e.target.value)}
                  className="h-10 w-16 cursor-pointer rounded-lg border border-gray-300 shadow-sm"
                />
                <input
                  type="text"
                  value={paragraphColor}
                  onChange={(e) => setParagraphColor(e.target.value)}
                  className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 shadow-sm transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="#6b7280"
                />
                <button
                  type="button"
                  onClick={() => setParagraphColor('#6b7280')}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
                  title="Reset to default"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900">
                Line Height
              </label>
              <p className="mt-1 text-xs text-gray-600">Line spacing</p>
              <input
                type="text"
                value={paragraphLineHeight}
                onChange={(e) => setParagraphLineHeight(e.target.value)}
                className="mt-2 block w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 shadow-sm transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="1.6"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900">
                Letter Spacing
              </label>
              <p className="mt-1 text-xs text-gray-600">Character spacing</p>
              <input
                type="text"
                value={paragraphLetterSpacing}
                onChange={(e) => setParagraphLetterSpacing(e.target.value)}
                className="mt-2 block w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 shadow-sm transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900">
                Text Transform
              </label>
              <p className="mt-1 text-xs text-gray-600">Case transformation</p>
              <select
                value={paragraphTextTransform}
                onChange={(e) => setParagraphTextTransform(e.target.value as any)}
                className="mt-2 block w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 shadow-sm transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
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

        {/* Primary Button Section */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
              <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Primary Button Styling</h3>
              <p className="mt-0.5 text-sm text-gray-600">Customize primary button appearance</p>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-900">
                Font Family
              </label>
              <p className="mt-1 text-xs text-gray-600">Choose button font</p>
              <select
                value={primaryButtonFontFamily}
                onChange={(e) => setPrimaryButtonFontFamily(e.target.value)}
                className="mt-2 block w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 shadow-sm transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                style={{ fontFamily: primaryButtonFontFamily }}
              >
                {FONT_OPTIONS.map((font) => (
                  <option key={font.value} value={font.value} style={{ fontFamily: font.value }}>
                    {font.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900">
                Background Color
              </label>
              <p className="mt-1 text-xs text-gray-600">Button background</p>
              <div className="mt-2 flex items-center gap-3">
                <input
                  type="color"
                  value={primaryButtonBgColor}
                  onChange={(e) => setPrimaryButtonBgColor(e.target.value)}
                  className="h-10 w-16 cursor-pointer rounded-lg border border-gray-300 shadow-sm"
                />
                <input
                  type="text"
                  value={primaryButtonBgColor}
                  onChange={(e) => setPrimaryButtonBgColor(e.target.value)}
                  className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 shadow-sm transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="#2563eb"
                />
                <button
                  type="button"
                  onClick={() => setPrimaryButtonBgColor('#2563eb')}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
                  title="Reset to default"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900">
                Text Color
              </label>
              <p className="mt-1 text-xs text-gray-600">Button text color</p>
              <div className="mt-2 flex items-center gap-3">
                <input
                  type="color"
                  value={primaryButtonColor}
                  onChange={(e) => setPrimaryButtonColor(e.target.value)}
                  className="h-10 w-16 cursor-pointer rounded-lg border border-gray-300 shadow-sm"
                />
                <input
                  type="text"
                  value={primaryButtonColor}
                  onChange={(e) => setPrimaryButtonColor(e.target.value)}
                  className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 shadow-sm transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="#ffffff"
                />
                <button
                  type="button"
                  onClick={() => setPrimaryButtonColor('#ffffff')}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
                  title="Reset to default"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900">
                Font Size
              </label>
              <p className="mt-1 text-xs text-gray-600">Button text size</p>
              <select
                value={primaryButtonFontSize}
                onChange={(e) => setPrimaryButtonFontSize(e.target.value)}
                className="mt-2 block w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 shadow-sm transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {FONT_SIZE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900">
                Font Weight
              </label>
              <p className="mt-1 text-xs text-gray-600">Boldness of text</p>
              <select
                value={primaryButtonFontWeight}
                onChange={(e) => setPrimaryButtonFontWeight(parseInt(e.target.value))}
                className="mt-2 block w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 shadow-sm transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {FONT_WEIGHT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900">
                Border Radius
              </label>
              <p className="mt-1 text-xs text-gray-600">Corner rounding</p>
              <select
                value={primaryButtonBorderRadius}
                onChange={(e) => setPrimaryButtonBorderRadius(e.target.value)}
                className="mt-2 block w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 shadow-sm transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {BORDER_RADIUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900">
                Button Size
              </label>
              <p className="mt-1 text-xs text-gray-600">Determines padding</p>
              <select
                value={primaryButtonSize}
                onChange={(e) => setPrimaryButtonSize(e.target.value as 'small' | 'medium' | 'large')}
                className="mt-2 block w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 shadow-sm transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {BUTTON_SIZE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label} ({option.padding})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900">
                Border
              </label>
              <p className="mt-1 text-xs text-gray-600">Button border style</p>
              <select
                value={primaryButtonBorder}
                onChange={(e) => setPrimaryButtonBorder(e.target.value)}
                className="mt-2 block w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 shadow-sm transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {BORDER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900">
                Hover Background Color
              </label>
              <p className="mt-1 text-xs text-gray-600">Background on hover</p>
              <div className="mt-2 flex items-center gap-3">
                <input
                  type="color"
                  value={primaryButtonHoverBgColor}
                  onChange={(e) => setPrimaryButtonHoverBgColor(e.target.value)}
                  className="h-10 w-16 cursor-pointer rounded-lg border border-gray-300 shadow-sm"
                />
                <input
                  type="text"
                  value={primaryButtonHoverBgColor}
                  onChange={(e) => setPrimaryButtonHoverBgColor(e.target.value)}
                  className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 shadow-sm transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="#1d4ed8"
                />
                <button
                  type="button"
                  onClick={() => setPrimaryButtonHoverBgColor('#1d4ed8')}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
                  title="Reset to default"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900">
                Hover Text Color
              </label>
              <p className="mt-1 text-xs text-gray-600">Text color on hover</p>
              <div className="mt-2 flex items-center gap-3">
                <input
                  type="color"
                  value={primaryButtonHoverColor}
                  onChange={(e) => setPrimaryButtonHoverColor(e.target.value)}
                  className="h-10 w-16 cursor-pointer rounded-lg border border-gray-300 shadow-sm"
                />
                <input
                  type="text"
                  value={primaryButtonHoverColor}
                  onChange={(e) => setPrimaryButtonHoverColor(e.target.value)}
                  className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 shadow-sm transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="#ffffff"
                />
                <button
                  type="button"
                  onClick={() => setPrimaryButtonHoverColor('#ffffff')}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
                  title="Reset to default"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900">
                Text Transform
              </label>
              <p className="mt-1 text-xs text-gray-600">Case transformation</p>
              <select
                value={primaryButtonTextTransform}
                onChange={(e) => setPrimaryButtonTextTransform(e.target.value as any)}
                className="mt-2 block w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 shadow-sm transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
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

        {/* Secondary Button Section */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
              <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Secondary Button Styling</h3>
              <p className="mt-0.5 text-sm text-gray-600">Customize secondary button appearance</p>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-900">
                Font Family
              </label>
              <p className="mt-1 text-xs text-gray-600">Choose button font</p>
              <select
                value={secondaryButtonFontFamily}
                onChange={(e) => setSecondaryButtonFontFamily(e.target.value)}
                className="mt-2 block w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 shadow-sm transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                style={{ fontFamily: secondaryButtonFontFamily }}
              >
                {FONT_OPTIONS.map((font) => (
                  <option key={font.value} value={font.value} style={{ fontFamily: font.value }}>
                    {font.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900">
                Background Color
              </label>
              <p className="mt-1 text-xs text-gray-600">Button background</p>
              <div className="mt-2 flex items-center gap-3">
                <input
                  type="color"
                  value={secondaryButtonBgColor}
                  onChange={(e) => setSecondaryButtonBgColor(e.target.value)}
                  className="h-10 w-16 cursor-pointer rounded-lg border border-gray-300 shadow-sm"
                />
                <input
                  type="text"
                  value={secondaryButtonBgColor}
                  onChange={(e) => setSecondaryButtonBgColor(e.target.value)}
                  className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 shadow-sm transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="#ffffff"
                />
                <button
                  type="button"
                  onClick={() => setSecondaryButtonBgColor('#ffffff')}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
                  title="Reset to default"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900">
                Text Color
              </label>
              <p className="mt-1 text-xs text-gray-600">Button text color</p>
              <div className="mt-2 flex items-center gap-3">
                <input
                  type="color"
                  value={secondaryButtonColor}
                  onChange={(e) => setSecondaryButtonColor(e.target.value)}
                  className="h-10 w-16 cursor-pointer rounded-lg border border-gray-300 shadow-sm"
                />
                <input
                  type="text"
                  value={secondaryButtonColor}
                  onChange={(e) => setSecondaryButtonColor(e.target.value)}
                  className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 shadow-sm transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="#374151"
                />
                <button
                  type="button"
                  onClick={() => setSecondaryButtonColor('#374151')}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
                  title="Reset to default"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900">
                Font Size
              </label>
              <p className="mt-1 text-xs text-gray-600">Button text size</p>
              <select
                value={secondaryButtonFontSize}
                onChange={(e) => setSecondaryButtonFontSize(e.target.value)}
                className="mt-2 block w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 shadow-sm transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {FONT_SIZE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900">
                Font Weight
              </label>
              <p className="mt-1 text-xs text-gray-600">Boldness of text</p>
              <select
                value={secondaryButtonFontWeight}
                onChange={(e) => setSecondaryButtonFontWeight(parseInt(e.target.value))}
                className="mt-2 block w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 shadow-sm transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {FONT_WEIGHT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900">
                Border Radius
              </label>
              <p className="mt-1 text-xs text-gray-600">Corner rounding</p>
              <select
                value={secondaryButtonBorderRadius}
                onChange={(e) => setSecondaryButtonBorderRadius(e.target.value)}
                className="mt-2 block w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 shadow-sm transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {BORDER_RADIUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900">
                Button Size
              </label>
              <p className="mt-1 text-xs text-gray-600">Determines padding</p>
              <select
                value={secondaryButtonSize}
                onChange={(e) => setSecondaryButtonSize(e.target.value as 'small' | 'medium' | 'large')}
                className="mt-2 block w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 shadow-sm transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {BUTTON_SIZE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label} ({option.padding})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900">
                Border
              </label>
              <p className="mt-1 text-xs text-gray-600">Button border style</p>
              <select
                value={secondaryButtonBorder}
                onChange={(e) => setSecondaryButtonBorder(e.target.value)}
                className="mt-2 block w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 shadow-sm transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {BORDER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900">
                Hover Background Color
              </label>
              <p className="mt-1 text-xs text-gray-600">Background on hover</p>
              <div className="mt-2 flex items-center gap-3">
                <input
                  type="color"
                  value={secondaryButtonHoverBgColor}
                  onChange={(e) => setSecondaryButtonHoverBgColor(e.target.value)}
                  className="h-10 w-16 cursor-pointer rounded-lg border border-gray-300 shadow-sm"
                />
                <input
                  type="text"
                  value={secondaryButtonHoverBgColor}
                  onChange={(e) => setSecondaryButtonHoverBgColor(e.target.value)}
                  className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 shadow-sm transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="#f9fafb"
                />
                <button
                  type="button"
                  onClick={() => setSecondaryButtonHoverBgColor('#f9fafb')}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
                  title="Reset to default"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900">
                Hover Text Color
              </label>
              <p className="mt-1 text-xs text-gray-600">Text color on hover</p>
              <div className="mt-2 flex items-center gap-3">
                <input
                  type="color"
                  value={secondaryButtonHoverColor}
                  onChange={(e) => setSecondaryButtonHoverColor(e.target.value)}
                  className="h-10 w-16 cursor-pointer rounded-lg border border-gray-300 shadow-sm"
                />
                <input
                  type="text"
                  value={secondaryButtonHoverColor}
                  onChange={(e) => setSecondaryButtonHoverColor(e.target.value)}
                  className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 shadow-sm transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="#111827"
                />
                <button
                  type="button"
                  onClick={() => setSecondaryButtonHoverColor('#111827')}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
                  title="Reset to default"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900">
                Text Transform
              </label>
              <p className="mt-1 text-xs text-gray-600">Case transformation</p>
              <select
                value={secondaryButtonTextTransform}
                onChange={(e) => setSecondaryButtonTextTransform(e.target.value as any)}
                className="mt-2 block w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 shadow-sm transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
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
                  <h2 className="text-xl font-bold text-gray-900">Typography Live Preview</h2>
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
              <div className="overflow-hidden rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
                <h1
                  style={{
                    fontFamily: titleFontFamily,
                    fontSize: titleFontSize,
                    fontWeight: titleFontWeight,
                    color: titleColor,
                    lineHeight: titleLineHeight,
                    letterSpacing: titleLetterSpacing,
                    textTransform: titleTextTransform,
                  }}
                >
                  Sample Title Text
                </h1>
                <h2
                  style={{
                    fontFamily: subheadingFontFamily,
                    fontSize: subheadingFontSize,
                    fontWeight: subheadingFontWeight,
                    color: subheadingColor,
                    lineHeight: subheadingLineHeight,
                    letterSpacing: subheadingLetterSpacing,
                    textTransform: subheadingTextTransform,
                  }}
                >
                  Sample Subheading Text
                </h2>
                <p
                  style={{
                    fontFamily: paragraphFontFamily,
                    fontSize: paragraphFontSize,
                    fontWeight: paragraphFontWeight,
                    color: paragraphColor,
                    lineHeight: paragraphLineHeight,
                    letterSpacing: paragraphLetterSpacing,
                    textTransform: paragraphTextTransform,
                  }}
                >
                  This is sample paragraph text that demonstrates how your body text will appear on the website.
                  You can see the font family, size, weight, color, and spacing settings applied in real-time.
                  This helps you make informed decisions about your typography choices.
                </p>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', flexWrap: 'wrap' }}>
                  <button
                    style={{
                      backgroundColor: primaryButtonBgColor,
                      color: primaryButtonColor,
                      fontSize: primaryButtonFontSize,
                      fontWeight: primaryButtonFontWeight,
                      borderRadius: primaryButtonBorderRadius,
                      padding: getButtonPadding(primaryButtonSize),
                      border: primaryButtonBorder,
                      fontFamily: primaryButtonFontFamily,
                      textTransform: primaryButtonTextTransform,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = primaryButtonHoverBgColor;
                      e.currentTarget.style.color = primaryButtonHoverColor;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = primaryButtonBgColor;
                      e.currentTarget.style.color = primaryButtonColor;
                    }}
                  >
                    Primary Button
                  </button>
                  <button
                    style={{
                      backgroundColor: secondaryButtonBgColor,
                      color: secondaryButtonColor,
                      fontSize: secondaryButtonFontSize,
                      fontWeight: secondaryButtonFontWeight,
                      borderRadius: secondaryButtonBorderRadius,
                      padding: getButtonPadding(secondaryButtonSize),
                      border: secondaryButtonBorder,
                      fontFamily: secondaryButtonFontFamily,
                      textTransform: secondaryButtonTextTransform,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = secondaryButtonHoverBgColor;
                      e.currentTarget.style.color = secondaryButtonHoverColor;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = secondaryButtonBgColor;
                      e.currentTarget.style.color = secondaryButtonColor;
                    }}
                  >
                    Secondary Button
                  </button>
                </div>
              </div>
              <p className="mt-4 text-center text-sm text-gray-600">
                <svg className="inline-block h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Preview shows how your typography and buttons will appear on the website
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
