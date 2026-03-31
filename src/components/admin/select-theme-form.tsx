'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import navbarLayoutsData from '@/data/navbar-layouts.json';
import footerLayoutsData from '@/data/footer-layouts.json';

interface ThemeSection {
  id: string;
  type: string;
  name: string;
  order?: number;
  order_index?: number;
  style?: any;
  layout_id?: string; // For navbar sections, references navbar-layouts.json
}

interface Theme {
  theme_id: string;
  name: string;
  description: string;
  tags: string[] | null;
  sections: ThemeSection[] | Record<string, ThemeSection>;
  style: {
    primaryColor?: string;
    secondaryColor?: string;
    accentColor?: string;
    backgroundColor?: string;
    textColor?: string;
    gradient?: string;
    navbarStyle?: string;
    navbarTextColor?: string;
    buttonStyle?: string;
    fontStyle?: string;
  };
  created_at: string;
  updated_at: string;
}

interface NavbarLayoutPreviewItem {
  type: string;
  width?: string;
  height?: string;
  items?: NavbarLayoutPreviewItem[];
}

interface NavbarLayoutPreview {
  type: string;
  justify?: string;
  direction?: string;
  bordered?: boolean;
  items: NavbarLayoutPreviewItem[];
}

interface NavbarLayout {
  id: string;
  name: string;
  description: string;
  preview: NavbarLayoutPreview;
}

type NavbarLayoutId = 'default' | 'centered' | 'logo-center' | 'stacked' | 'split' | 'logo-left-items-left' | 'bordered-centered';

// Get navbar layouts from JSON
const navbarLayouts: NavbarLayout[] = navbarLayoutsData.layouts;

// Helper component to render preview items
const PreviewItem = ({ item }: { item: NavbarLayoutPreviewItem }) => {
  if (item.type === 'group') {
    return (
      <div className="flex gap-0.5">
        {item.items?.map((subItem, idx) => (
          <PreviewItem key={idx} item={subItem} />
        ))}
      </div>
    );
  }

  const widthClass = `w-${item.width || '4'}`;
  const heightClass = `h-${item.height || '1.5'}`;

  if (item.type === 'logo') {
    return <div className={`${heightClass} ${widthClass} rounded bg-gray-400`}></div>;
  }

  if (item.type === 'menu-item') {
    return <div className={`${heightClass} ${widthClass} rounded bg-gray-300`}></div>;
  }

  if (item.type === 'button') {
    return <div className={`${heightClass} ${widthClass} rounded bg-purple-400`}></div>;
  }

  return null;
};

// Helper function to determine if a color is light or dark
const getContrastColor = (hexColor: string): string => {
  // Remove # if present
  const hex = hexColor.replace('#', '');

  // Convert to RGB
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);

  // Calculate relative luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  // Return black for light colors, white for dark colors
  return luminance > 0.5 ? '#000000' : '#ffffff';
};

export default function SelectThemeForm() {
  const searchParams = useSearchParams() ?? new URLSearchParams();
  const restaurantId = searchParams.get('restaurant_id');
  const restaurantName = searchParams.get('restaurant_name');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [previewTheme, setPreviewTheme] = useState<Theme | null>(null);
  const [previewNavbarLayout, setPreviewNavbarLayout] = useState<NavbarLayoutId>('bordered-centered');
  const [themes, setThemes] = useState<Theme[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [stepStatus, setStepStatus] = useState<('pending' | 'loading' | 'completed' | 'error')[]>([]);

  const initializationSteps = [
    { title: 'Applying Theme', description: 'Setting up your selected theme and global styles' },
    { title: 'Creating Domain', description: 'Generating staging domain for your website' },
    { title: 'Setting Up Pages', description: 'Creating default pages (Home, About, Menu, Contact)' },
    { title: 'Building Navigation', description: 'Configuring navbar and footer from theme' },
    { title: 'Adding Content', description: 'Generating AI-powered content for sections' },
    { title: 'Finalizing Setup', description: 'Completing website initialization' },
  ];

  // Fetch themes from API on mount
  useEffect(() => {
    const fetchThemes = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/themes');
        const data = await response.json();

        if (data.success && data.data) {
          setThemes(data.data);
        } else {
          setErrorMessage('Failed to load themes');
        }
      } catch (error) {
        console.error('Error fetching themes:', error);
        setErrorMessage('Failed to load themes');
      } finally {
        setLoading(false);
      }
    };

    fetchThemes();
  }, []);

  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplate(templateId);
  };

  // Helper function to generate global_styles from theme
  const generateGlobalStyles = (theme: Theme, restaurantId: string) => {
    const style = theme.style || {};
    const primaryColor = style.primaryColor || '#6366f1';
    const secondaryColor = style.secondaryColor || '#e5e7eb';
    const accentColor = style.accentColor || '#8b5cf6';
    const backgroundColor = style.backgroundColor || '#ffffff';
    const textColor = style.textColor || '#1f2937';
    const buttonStyle = style.buttonStyle || 'rounded';
    const fontStyle = style.fontStyle || 'modern';

    // Determine font family based on fontStyle
    const fontFamily = fontStyle === 'elegant' ? 'Playfair Display, Georgia, serif' :
                       fontStyle === 'classic' ? 'Times New Roman, serif' :
                       'Inter, system-ui, sans-serif'; // modern

    // Determine button border radius based on buttonStyle
    const buttonRadius = buttonStyle === 'sharp' ? '0' :
                        buttonStyle === 'pill' ? '9999px' :
                        '0.5rem'; // rounded

    // Get contrasting colors for buttons
    const primaryButtonColor = getContrastColor(accentColor);
    const secondaryButtonColor = textColor;

    // Create darker version for hover states
    const darkenColor = (hex: string, amount: number = 20) => {
      const num = parseInt(hex.replace('#', ''), 16);
      const r = Math.max(0, (num >> 16) - amount);
      const g = Math.max(0, ((num >> 8) & 0x00FF) - amount);
      const b = Math.max(0, (num & 0x0000FF) - amount);
      return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
    };

    return {
      id: `global-style-${restaurantId}`,
      restaurant_id: restaurantId,
      updatedAt: new Date().toISOString(),
      title: {
        color: textColor,
        fontSize: '2.25rem',
        fontFamily: fontFamily,
        fontWeight: 700,
        lineHeight: '1.2',
        letterSpacing: '-0.025em',
        textTransform: 'none'
      },
      subheading: {
        color: getContrastColor(backgroundColor) === '#ffffff' ? textColor : primaryColor,
        fontSize: '1.5rem',
        fontFamily: fontFamily,
        fontWeight: 600,
        lineHeight: '1.3',
        letterSpacing: '-0.015em',
        textTransform: 'uppercase'
      },
      paragraph: {
        color: '#6b7280',
        fontSize: '1rem',
        fontFamily: fontFamily,
        fontWeight: 400,
        lineHeight: '1.6',
        letterSpacing: '0',
        textTransform: 'none'
      },
      primaryButton: {
        size: 'medium',
        color: primaryButtonColor,
        backgroundColor: accentColor,
        hoverBackgroundColor: darkenColor(accentColor, 15),
        hoverColor: primaryButtonColor,
        border: 'none',
        borderRadius: buttonRadius,
        fontSize: '1rem',
        fontFamily: fontFamily,
        fontWeight: 600,
        textTransform: 'none'
      },
      secondaryButton: {
        size: 'medium',
        color: secondaryButtonColor,
        backgroundColor: backgroundColor,
        hoverBackgroundColor: secondaryColor,
        hoverColor: textColor,
        border: `1px solid ${secondaryColor}`,
        borderRadius: buttonRadius,
        fontSize: '1rem',
        fontFamily: fontFamily,
        fontWeight: 600,
        textTransform: 'none'
      },
      primaryColor: primaryColor,
      secondaryColor: secondaryColor,
      accentColor: accentColor,
      backgroundColor: backgroundColor,
      textColor: textColor,
      navbarTextColor: (style.navbarStyle === 'transparent') ? '#ffffff' : (style.navbarTextColor || getContrastColor(primaryColor)),
      navbarStyle: style.navbarStyle || 'solid'
    };
  };

  const handleContinue = async () => {
    if (!selectedTemplate || !restaurantId || !restaurantName) {
      return;
    }

    setIsCreating(true);
    setErrorMessage(null);
    setCurrentStep(0);
    setStepStatus(initializationSteps.map(() => 'pending'));

    const updateStepStatus = (stepIndex: number, status: 'loading' | 'completed' | 'error') => {
      setCurrentStep(stepIndex);
      setStepStatus(prev => prev.map((s, i) => i === stepIndex ? status : s));
    };

    try {
      // Find the selected theme
      const selectedTheme = themes.find(t => t.theme_id === selectedTemplate);
      if (!selectedTheme) {
        throw new Error('Selected theme not found');
      }

      // Step 1: Apply the selected theme to the restaurant
      updateStepStatus(0, 'loading');
      const globalStyles = generateGlobalStyles(selectedTheme, restaurantId);

      const applyThemeResponse = await fetch('/api/themes/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          restaurant_id: restaurantId,
          theme_id: selectedTemplate,
          global_styles: globalStyles,
        }),
      });

      const applyThemeData = await applyThemeResponse.json();

      if (!applyThemeData.success) {
        updateStepStatus(0, 'error');
        throw new Error(applyThemeData.error || 'Failed to apply theme');
      }
      updateStepStatus(0, 'completed');

      // Step 2-6: Initialize website with simulated progress tracking
      // The API call handles steps 1-5 in one request, so we simulate
      // step progression on the UI side to keep the user informed.
      updateStepStatus(1, 'loading');

      const stepDelays = [3000, 4000, 5000, 4000]; // delays before advancing to steps 2,3,4,5
      let stepTimers: ReturnType<typeof setTimeout>[] = [];
      let currentSimStep = 1;

      const simulateProgress = () => {
        stepDelays.forEach((delay, i) => {
          const targetStep = i + 2; // steps 2,3,4,5
          const cumulativeDelay = stepDelays.slice(0, i + 1).reduce((a, b) => a + b, 0);
          const timer = setTimeout(() => {
            currentSimStep = targetStep;
            // Mark previous step completed, mark current step loading
            setStepStatus(prev => prev.map((s, idx) => {
              if (idx < targetStep) return 'completed';
              if (idx === targetStep) return 'loading';
              return s;
            }));
            setCurrentStep(targetStep);
          }, cumulativeDelay);
          stepTimers.push(timer);
        });
      };

      simulateProgress();

      const response = await fetch(`/api/restaurants/${encodeURIComponent(restaurantId)}/initialize-website`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          restaurantName,
          templateId: selectedTemplate,
        }),
      });

      // Clear any pending step timers
      stepTimers.forEach(t => clearTimeout(t));

      const data = await response.json();

      if (!response.ok) {
        updateStepStatus(currentSimStep, 'error');
        throw new Error(data.error || 'Failed to initialize website');
      }

      setCurrentStep(initializationSteps.length - 1);
      setStepStatus(initializationSteps.map(() => 'completed'));

      // Navigate to restaurant list page with the newly created restaurant auto-selected
      const params = new URLSearchParams({
        restaurant_id: restaurantId,
        restaurant_name: restaurantName,
      });
      window.location.href = `/dashboard/admin/restaurants?${params.toString()}`;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to initialize website';
      setErrorMessage(message);
      setIsCreating(false);
      setCurrentStep(0);
      setStepStatus([]);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 via-purple-600 to-indigo-600 shadow-lg">
            <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
              Select Your Theme
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Choose the perfect design for <span className="font-semibold text-gray-900">{restaurantName || 'your restaurant'}</span>
            </p>
          </div>
        </div>
        {!loading && themes.length > 0 && (
          <div className="text-right">
            <p className="text-sm font-medium text-gray-900">{themes.length} Themes Available</p>
            <p className="text-xs text-gray-600">All fully customizable</p>
          </div>
        )}
      </div>

      {/* Step-by-step loader - Show only when creating */}
      {isCreating ? (
        <div className="rounded-2xl border border-purple-200 bg-gradient-to-r from-purple-50 to-indigo-50 shadow-sm">
          <div className="border-b border-purple-200 bg-gradient-to-r from-purple-100 to-indigo-100 px-6 py-5">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900">Creating Your Website</h2>
              <p className="text-sm text-gray-600 mt-2">Please wait while we set up your restaurant website...</p>
            </div>
          </div>
          
          <div className="p-8">
            <div className="space-y-4 max-w-2xl mx-auto">
              {initializationSteps.map((step, index) => {
                const status = stepStatus[index] || 'pending';
                const isActive = currentStep === index;
                
                return (
                  <div key={index} className={`flex items-center gap-4 p-4 rounded-lg transition-all ${
                    status === 'completed' ? 'bg-green-50 border border-green-200' :
                    status === 'loading' ? 'bg-purple-50 border border-purple-200 shadow-md' :
                    status === 'error' ? 'bg-red-50 border border-red-200' :
                    'bg-gray-50 border border-gray-200'
                  }`}>
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
                      status === 'completed' ? 'bg-green-500' :
                      status === 'loading' ? 'bg-purple-500' :
                      status === 'error' ? 'bg-red-500' :
                      'bg-gray-300'
                    }`}>
                      {status === 'completed' ? (
                        <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : status === 'loading' ? (
                        <svg className="h-6 w-6 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : status === 'error' ? (
                        <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      ) : (
                        <span className="text-sm font-bold text-white">{index + 1}</span>
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <h4 className={`font-semibold ${
                        status === 'completed' ? 'text-green-900' :
                        status === 'loading' ? 'text-purple-900' :
                        status === 'error' ? 'text-red-900' :
                        'text-gray-600'
                      }`}>
                        {step.title}
                      </h4>
                      <p className={`text-sm ${
                        status === 'completed' ? 'text-green-700' :
                        status === 'loading' ? 'text-purple-700' :
                        status === 'error' ? 'text-red-700' :
                        'text-gray-500'
                      }`}>
                        {step.description}
                      </p>
                    </div>
                    
                    {status === 'loading' && (
                      <div className="flex items-center gap-1">
                        <div className="h-2 w-2 bg-purple-500 rounded-full animate-bounce"></div>
                        <div className="h-2 w-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="h-2 w-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            
            <div className="mt-8 text-center">
              <p className="text-sm text-gray-600">
                This process may take a few moments. Please don't close this window.
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* Theme selection section - Hide when creating */
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 bg-gradient-to-r from-purple-50 to-white px-6 py-5">
            <h2 className="text-xl font-bold text-gray-900">Available Themes</h2>
            <p className="mt-1 text-sm text-gray-600">
              Choose from our professionally designed themes - each one is fully customizable
            </p>
          </div>

          {loading ? (
          <div className="flex items-center justify-center p-12">
            <div className="text-center">
              <svg className="mx-auto h-12 w-12 animate-spin text-purple-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="mt-4 text-sm font-medium text-gray-600">Loading themes...</p>
            </div>
          </div>
        ) : themes.length === 0 ? (
          <div className="flex items-center justify-center p-16">
            <div className="text-center max-w-md">
              <div className="mx-auto h-24 w-24 rounded-full bg-gradient-to-br from-purple-100 to-indigo-100 flex items-center justify-center mb-6">
                <svg className="h-12 w-12 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">No Themes Available Yet</h3>
              <p className="text-sm text-gray-600 mb-6">We're working on adding beautiful themes for your restaurant. Please check back soon or contact support for assistance.</p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:from-purple-700 hover:to-indigo-700"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
                Refresh Page
              </button>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 p-6 sm:grid-cols-2 lg:grid-cols-3">
            {themes.map((theme) => {
              const sectionCount = Array.isArray(theme.sections)
                ? theme.sections.length
                : Object.keys(theme.sections || {}).length;

              const gradient = theme.style?.gradient || 'from-gray-100 to-gray-200';

              return (
                <div
                  key={theme.theme_id}
                  className={`group relative overflow-hidden rounded-xl border-2 transition-all ${
                    selectedTemplate === theme.theme_id
                      ? 'border-purple-500 bg-purple-50 shadow-lg ring-2 ring-purple-200'
                      : 'border-gray-200 bg-white hover:border-purple-300 hover:shadow-xl'
                  }`}
                >
                  <div className="relative aspect-[4/3] overflow-hidden">
                    {(() => {
                      const sections = Array.isArray(theme.sections)
                        ? theme.sections
                        : Object.values(theme.sections || {});

                      const style = theme.style || {};
                      const primaryColor = style.primaryColor || '#6366f1';
                      const secondaryColor = style.secondaryColor || '#e5e7eb';
                      const accentColor = style.accentColor || '#8b5cf6';
                      const backgroundColor = style.backgroundColor || '#ffffff';
                      const textColor = style.textColor || '#1f2937';
                      const navbarStyle = style.navbarStyle || 'solid';
                      const buttonStyle = style.buttonStyle || 'rounded';

                      return (
                        <div className={`h-full bg-gradient-to-br ${gradient} p-3`}>
                          <div className="h-full rounded-lg bg-white/95 backdrop-blur-sm shadow-xl overflow-hidden">
                            {sections.length === 0 ? (
                              <div className="flex h-full items-center justify-center">
                                <div className="text-center">
                                  <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                                  </svg>
                                  <p className="mt-2 text-xs font-medium text-gray-500">Blank Canvas</p>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-1 p-1.5">
                                {sections.slice(0, 6).map((section: ThemeSection, idx: number) => {
                                  const sectionType = section.type;

                                  // Navbar - use layout from navbar-layouts.json
                                  if (sectionType === 'navbar') {
                                    // Find the layout configuration from JSON based on section.id
                                    const layoutId = section.id || 'default';
                                    const navbarLayout = navbarLayouts.find(l => l.id === layoutId);

                                    if (navbarLayout) {
                                      const preview = navbarLayout.preview;
                                      return (
                                        <div
                                          key={idx}
                                          className={`h-2.5 px-1.5 ${preview.bordered ? 'border border-gray-300' : ''} ${
                                            navbarStyle === 'transparent' ? 'bg-white/10 backdrop-blur-sm border-b border-gray-200/20' :
                                            navbarStyle === 'minimal' ? 'bg-transparent border-b border-gray-200' :
                                            'rounded-sm shadow-sm'
                                          }`}
                                          style={navbarStyle === 'solid' || navbarStyle === 'gradient' ? { backgroundColor: primaryColor } : {}}
                                        >
                                          <div className={`flex items-center gap-0.5 h-full ${
                                            preview.direction === 'column' ? 'flex-col justify-center' : ''
                                          } ${
                                            preview.justify === 'center' ? 'justify-center' :
                                            preview.justify === 'between' ? 'justify-between' : ''
                                          }`}>
                                            {preview.items.map((item, itemIdx) => {
                                              if (item.type === 'group') {
                                                return (
                                                  <div key={itemIdx} className="flex gap-0.5">
                                                    {item.items?.map((subItem, subIdx) => {
                                                      if (subItem.type === 'logo') {
                                                        return <div key={subIdx} className={`w-3 h-0.5 rounded-full ${navbarStyle === 'minimal' ? 'bg-gray-800' : 'bg-white/90'}`}></div>;
                                                      }
                                                      if (subItem.type === 'menu-item') {
                                                        return <div key={subIdx} className={`w-1.5 h-0.5 rounded-full ${navbarStyle === 'minimal' ? 'bg-gray-600' : 'bg-white/80'}`}></div>;
                                                      }
                                                      if (subItem.type === 'button') {
                                                        return <div key={subIdx} className="w-2 h-0.5 rounded-full" style={{ backgroundColor: accentColor, opacity: 0.9 }}></div>;
                                                      }
                                                      return null;
                                                    })}
                                                  </div>
                                                );
                                              }
                                              if (item.type === 'logo') {
                                                return <div key={itemIdx} className={`w-3 h-0.5 rounded-full ${navbarStyle === 'minimal' ? 'bg-gray-800' : 'bg-white/90'}`}></div>;
                                              }
                                              if (item.type === 'menu-item') {
                                                return <div key={itemIdx} className={`w-1.5 h-0.5 rounded-full ${navbarStyle === 'minimal' ? 'bg-gray-600' : 'bg-white/80'}`}></div>;
                                              }
                                              if (item.type === 'button') {
                                                return <div key={itemIdx} className="w-2 h-0.5 rounded-full" style={{ backgroundColor: accentColor, opacity: 0.9 }}></div>;
                                              }
                                              return null;
                                            })}
                                          </div>
                                        </div>
                                      );
                                    }

                                    // Fallback to default navbar if layout not found
                                    return (
                                      <div
                                        key={idx}
                                        className={`h-2.5 flex items-center px-1.5 gap-1 ${
                                          navbarStyle === 'transparent' ? 'bg-white/10 backdrop-blur-sm border-b border-gray-200/20' :
                                          navbarStyle === 'minimal' ? 'bg-transparent border-b border-gray-200' :
                                          'rounded-sm shadow-sm'
                                        }`}
                                        style={navbarStyle === 'solid' || navbarStyle === 'gradient' ? { backgroundColor: primaryColor } : {}}
                                      >
                                        <div className={`w-3 h-0.5 rounded-full ${navbarStyle === 'minimal' ? 'bg-gray-800' : 'bg-white/90'}`}></div>
                                        <div className="ml-auto flex gap-0.5">
                                          <div className={`w-1.5 h-0.5 rounded-full ${navbarStyle === 'minimal' ? 'bg-gray-600' : 'bg-white/80'}`}></div>
                                          <div className={`w-1.5 h-0.5 rounded-full ${navbarStyle === 'minimal' ? 'bg-gray-600' : 'bg-white/80'}`}></div>
                                          <div className={`w-1.5 h-0.5 rounded-full ${navbarStyle === 'minimal' ? 'bg-gray-600' : 'bg-white/80'}`}></div>
                                        </div>
                                      </div>
                                    );
                                  }

                                  // Hero
                                  if (sectionType === 'hero') {
                                    return (
                                      <div key={idx} className={`rounded-md bg-gradient-to-br ${gradient} h-12 flex flex-col items-center justify-center gap-1 shadow-sm overflow-hidden relative`}>
                                        <div className="absolute inset-0 bg-white/5"></div>
                                        <div className="text-center space-y-0.5 relative z-10">
                                          <div className="w-16 h-0.5 bg-white/95 rounded-full mx-auto shadow-sm"></div>
                                          <div className="w-10 h-0.5 bg-white/75 rounded-full mx-auto"></div>
                                        </div>
                                        <div
                                          className={`w-8 h-1.5 mt-0.5 shadow-sm relative z-10 ${
                                            buttonStyle === 'pill' ? 'rounded-full' :
                                            buttonStyle === 'sharp' ? 'rounded-none' :
                                            buttonStyle === 'outlined' ? 'rounded border border-white bg-white/10 backdrop-blur-sm' :
                                            'rounded-sm'
                                          }`}
                                          style={buttonStyle !== 'outlined' ? { backgroundColor: accentColor } : {}}
                                        ></div>
                                      </div>
                                    );
                                  }

                                  // About
                                  if (sectionType === 'about') {
                                    return (
                                      <div key={idx} className="space-y-0.5 p-1.5 rounded-md shadow-sm" style={{ backgroundColor: backgroundColor }}>
                                        <div className="h-0.5 rounded-full w-1/4 opacity-90" style={{ backgroundColor: primaryColor }}></div>
                                        <div className="h-0.5 rounded-full opacity-50" style={{ backgroundColor: textColor }}></div>
                                        <div className="h-0.5 rounded-full w-3/4 opacity-50" style={{ backgroundColor: textColor }}></div>
                                      </div>
                                    );
                                  }

                                  // Menu/Dine-in
                                  if (sectionType === 'dine-in' || sectionType === 'menu') {
                                    return (
                                      <div key={idx} className="space-y-0.5">
                                        <div className="h-0.5 rounded-full w-1/4 opacity-90" style={{ backgroundColor: accentColor }}></div>
                                        <div className="grid grid-cols-2 gap-0.5">
                                          <div className="h-5 rounded-md border shadow-sm" style={{ backgroundColor: backgroundColor, borderColor: secondaryColor }}></div>
                                          <div className="h-5 rounded-md border shadow-sm" style={{ backgroundColor: backgroundColor, borderColor: secondaryColor }}></div>
                                        </div>
                                      </div>
                                    );
                                  }

                                  // Gallery
                                  if (sectionType === 'gallery') {
                                    return (
                                      <div key={idx} className="grid grid-cols-3 gap-0.5">
                                        <div className="aspect-square rounded-md shadow-sm" style={{ backgroundColor: secondaryColor, opacity: 0.8 }}></div>
                                        <div className="aspect-square rounded-md shadow-sm" style={{ backgroundColor: secondaryColor, opacity: 0.9 }}></div>
                                        <div className="aspect-square rounded-md shadow-sm" style={{ backgroundColor: secondaryColor, opacity: 0.85 }}></div>
                                      </div>
                                    );
                                  }

                                  // Reviews
                                  if (sectionType === 'review') {
                                    return (
                                      <div key={idx} className="space-y-0.5 p-1 bg-amber-50/80 rounded-md shadow-sm">
                                        <div className="flex gap-0.5">
                                          {[1, 2, 3, 4, 5].map((i) => (
                                            <div key={i} className="w-1 h-1 rounded-sm" style={{ backgroundColor: accentColor, opacity: 0.9 }}></div>
                                          ))}
                                        </div>
                                        <div className="h-0.5 rounded-full w-3/4 opacity-40" style={{ backgroundColor: textColor }}></div>
                                      </div>
                                    );
                                  }

                                  // Catering/Events
                                  if (sectionType === 'catering' || sectionType === 'events') {
                                    return (
                                      <div key={idx} className="space-y-0.5 p-1.5 rounded-md shadow-sm" style={{ backgroundColor: backgroundColor }}>
                                        <div className="h-0.5 rounded-full w-1/3 opacity-90" style={{ backgroundColor: primaryColor }}></div>
                                        <div className="grid grid-cols-3 gap-0.5">
                                          <div className="h-4 rounded-md border shadow-sm" style={{ backgroundColor: '#ffffff', borderColor: secondaryColor }}></div>
                                          <div className="h-4 rounded-md border shadow-sm" style={{ backgroundColor: '#ffffff', borderColor: secondaryColor }}></div>
                                          <div className="h-4 rounded-md border shadow-sm" style={{ backgroundColor: '#ffffff', borderColor: secondaryColor }}></div>
                                        </div>
                                      </div>
                                    );
                                  }

                                  // Reservation
                                  if (sectionType === 'reservation' || sectionType === 'reservations') {
                                    return (
                                      <div key={idx} className="space-y-0.5 p-1.5 rounded-md shadow-sm" style={{ backgroundColor: backgroundColor }}>
                                        <div className="h-0.5 rounded-full w-1/4 opacity-90" style={{ backgroundColor: primaryColor }}></div>
                                        <div className="grid grid-cols-2 gap-0.5">
                                          <div className="h-2 rounded-sm bg-gray-200 opacity-60"></div>
                                          <div className="h-2 rounded-sm bg-gray-200 opacity-60"></div>
                                        </div>
                                        <div className="h-1 rounded-sm mt-0.5" style={{ backgroundColor: accentColor, opacity: 0.8 }}></div>
                                      </div>
                                    );
                                  }

                                  // Opening Hours
                                  if (sectionType === 'hours' || sectionType === 'opening hours' || sectionType === 'opening_hours' || sectionType === 'openinghours' || sectionType.includes('hours')) {
                                    return (
                                      <div key={idx} className="space-y-0.5 p-1 bg-gray-50 rounded-md shadow-sm">
                                        <div className="h-0.5 rounded-full w-1/4 opacity-90" style={{ backgroundColor: primaryColor }}></div>
                                        <div className="space-y-0.5">
                                          {[1, 2, 3].map((i) => (
                                            <div key={i} className="flex items-center justify-between px-1">
                                              <div className="h-0.5 w-3 rounded-full" style={{ backgroundColor: textColor, opacity: 0.5 }}></div>
                                              <div className="h-0.5 w-4 rounded-full bg-gray-300"></div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    );
                                  }

                                  // Contact
                                  if (sectionType === 'contact' || sectionType === 'contact us' || sectionType === 'contact_us') {
                                    return (
                                      <div key={idx} className="space-y-0.5 p-1.5 rounded-md shadow-sm" style={{ backgroundColor: backgroundColor }}>
                                        <div className="h-0.5 rounded-full w-1/3 opacity-90" style={{ backgroundColor: primaryColor }}></div>
                                        <div className="grid grid-cols-2 gap-0.5">
                                          <div className="space-y-0.5">
                                            <div className="flex items-center gap-0.5">
                                              <div className="w-1 h-1 rounded-sm" style={{ backgroundColor: primaryColor, opacity: 0.8 }}></div>
                                              <div className="h-0.5 w-3 rounded-full bg-gray-300"></div>
                                            </div>
                                            <div className="flex items-center gap-0.5">
                                              <div className="w-1 h-1 rounded-sm" style={{ backgroundColor: primaryColor, opacity: 0.8 }}></div>
                                              <div className="h-0.5 w-3 rounded-full bg-gray-300"></div>
                                            </div>
                                          </div>
                                          <div className="h-6 rounded-md bg-white border shadow-sm" style={{ borderColor: secondaryColor }}></div>
                                        </div>
                                      </div>
                                    );
                                  }

                                  // Footer
                                  if (sectionType === 'footer') {
                                    const layoutId = section.id || 'default';
                                    const footerLayout = footerLayoutsData.layouts.find(l => l.id === layoutId);

                                    // Render different footer miniatures based on layout
                                    if (layoutId === 'centered') {
                                      return (
                                        <div key={idx} className="h-3.5 rounded-md flex flex-col items-center justify-center gap-0.5 shadow-sm" style={{ backgroundColor: primaryColor }}>
                                          <div className="w-5 h-0.5 bg-white/70 rounded-full"></div>
                                          <div className="flex gap-0.5">
                                            <div className="w-0.5 h-0.5 bg-white/70 rounded-full"></div>
                                            <div className="w-0.5 h-0.5 bg-white/70 rounded-full"></div>
                                            <div className="w-0.5 h-0.5 bg-white/70 rounded-full"></div>
                                          </div>
                                        </div>
                                      );
                                    }

                                    if (layoutId === 'restaurant') {
                                      return (
                                        <div key={idx} className="h-3.5 rounded-md grid grid-cols-4 gap-0.5 px-1.5 py-1 shadow-sm" style={{ backgroundColor: primaryColor }}>
                                          <div className="w-2 h-0.5 bg-white/70 rounded-full"></div>
                                          <div className="w-2 h-0.5 bg-white/50 rounded-full"></div>
                                          <div className="w-2 h-0.5 bg-white/50 rounded-full"></div>
                                          <div className="w-2 h-0.5 bg-purple-300 rounded-full"></div>
                                        </div>
                                      );
                                    }

                                    if (layoutId === 'columns-4') {
                                      return (
                                        <div key={idx} className="h-3.5 rounded-md grid grid-cols-4 gap-0.5 px-1.5 py-1 shadow-sm" style={{ backgroundColor: primaryColor }}>
                                          <div className="w-2 h-0.5 bg-white/70 rounded-full"></div>
                                          <div className="w-2 h-0.5 bg-white/50 rounded-full"></div>
                                          <div className="w-2 h-0.5 bg-white/50 rounded-full"></div>
                                          <div className="w-2 h-0.5 bg-purple-300 rounded-full"></div>
                                        </div>
                                      );
                                    }

                                    // Default (three section) layout
                                    return (
                                      <div key={idx} className="h-3 rounded-md grid grid-cols-3 gap-0.5 px-1.5 py-1 shadow-sm" style={{ backgroundColor: primaryColor }}>
                                        <div className="w-3 h-0.5 bg-white/70 rounded-full"></div>
                                        <div className="w-3 h-0.5 bg-white/50 rounded-full"></div>
                                        <div className="w-3 h-0.5 bg-white/50 rounded-full"></div>
                                      </div>
                                    );
                                  }

                                  // Generic section fallback
                                  return (
                                    <div key={idx} className="h-2.5 rounded-md shadow-sm" style={{ backgroundColor: secondaryColor, opacity: 0.7 }}></div>
                                  );
                                })}

                                {sections.length > 6 && (
                                  <div className="flex items-center justify-center rounded-md bg-gradient-to-r from-white/40 to-white/60 backdrop-blur-sm p-1 text-[9px] font-bold shadow-sm" style={{ color: primaryColor }}>
                                    +{sections.length - 6} more section{sections.length - 6 !== 1 ? 's' : ''}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {selectedTemplate === theme.theme_id && (
                    <div className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-purple-600 shadow-lg">
                      <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}

                  <div className="p-4">
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <h3 className="text-lg font-bold text-gray-900">{theme.name}</h3>
                      <span className="flex-shrink-0 rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-semibold text-purple-700">
                        {sectionCount} {sectionCount === 1 ? 'section' : 'sections'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2">{theme.description}</p>

                    {theme.tags && theme.tags.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {theme.tags.slice(0, 3).map((tag, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="mt-4 flex gap-2">
                      <button
                        type="button"
                        onClick={() => setPreviewTheme(theme)}
                        className="flex-1 rounded-lg border border-purple-200 bg-white px-3 py-2 text-sm font-semibold text-purple-600 transition hover:bg-purple-50 hover:border-purple-300"
                      >
                        Preview
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSelectTemplate(theme.theme_id)}
                        className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                          selectedTemplate === theme.theme_id
                            ? 'bg-purple-600 text-white shadow-md'
                            : 'bg-gradient-to-r from-purple-600 to-purple-700 text-white hover:from-purple-700 hover:to-purple-800 shadow-sm'
                        }`}
                      >
                        {selectedTemplate === theme.theme_id ? (
                          <span className="flex items-center justify-center gap-1.5">
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                            Selected
                          </span>
                        ) : (
                          'Select Theme'
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {errorMessage && (
          <div className="mx-6 mb-0 mt-6 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
            <svg className="h-5 w-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-sm font-medium text-red-900">{errorMessage}</p>
          </div>
        )}

        {/* Step-by-step loader */}
        {isCreating && (
          <div className="mx-6 my-6 rounded-xl border border-purple-200 bg-gradient-to-r from-purple-50 to-indigo-50 p-6">
            <div className="mb-6 text-center">
              <h3 className="text-lg font-bold text-gray-900">Creating Your Website</h3>
              <p className="text-sm text-gray-600 mt-1">Please wait while we set up your restaurant website...</p>
            </div>
            
            <div className="space-y-4">
              {initializationSteps.map((step, index) => {
                const status = stepStatus[index] || 'pending';
                const isActive = currentStep === index;
                
                return (
                  <div key={index} className={`flex items-center gap-4 p-4 rounded-lg transition-all ${
                    status === 'completed' ? 'bg-green-50 border border-green-200' :
                    status === 'loading' ? 'bg-purple-50 border border-purple-200' :
                    status === 'error' ? 'bg-red-50 border border-red-200' :
                    'bg-gray-50 border border-gray-200'
                  }`}>
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                      status === 'completed' ? 'bg-green-500' :
                      status === 'loading' ? 'bg-purple-500' :
                      status === 'error' ? 'bg-red-500' :
                      'bg-gray-300'
                    }`}>
                      {status === 'completed' ? (
                        <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : status === 'loading' ? (
                        <svg className="h-5 w-5 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : status === 'error' ? (
                        <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      ) : (
                        <span className="text-sm font-bold text-white">{index + 1}</span>
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <h4 className={`font-semibold ${
                        status === 'completed' ? 'text-green-900' :
                        status === 'loading' ? 'text-purple-900' :
                        status === 'error' ? 'text-red-900' :
                        'text-gray-600'
                      }`}>
                        {step.title}
                      </h4>
                      <p className={`text-sm ${
                        status === 'completed' ? 'text-green-700' :
                        status === 'loading' ? 'text-purple-700' :
                        status === 'error' ? 'text-red-700' :
                        'text-gray-500'
                      }`}>
                        {step.description}
                      </p>
                    </div>
                    
                    {status === 'loading' && (
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 bg-purple-500 rounded-full animate-bounce"></div>
                        <div className="h-2 w-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="h-2 w-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                This process may take a few moments. Please don't close this window.
              </p>
            </div>
          </div>
        )}

          <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-6 py-4">
          <button
            type="button"
            onClick={() => window.history.back()}
            disabled={isCreating || loading}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>

          <button
            type="button"
            onClick={handleContinue}
            disabled={!selectedTemplate || isCreating || loading}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-500 to-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:from-purple-600 hover:to-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isCreating ? (
              <>
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Applying Theme & Initializing...
              </>
            ) : (
              <>
                Continue
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </>
            )}
          </button>
          </div>
        </div>
      )}

      {/* Theme Preview Modal */}
      {previewTheme && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="fixed inset-0" onClick={() => setPreviewTheme(null)} />
          <div className="relative w-full max-w-6xl z-50 max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
            {/* Modal Header */}
            <div className="sticky top-0 z-30 flex items-center justify-between border-b border-gray-200 bg-gradient-to-r from-purple-50 to-white px-6 py-5">
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900">{previewTheme.name}</h2>
                <p className="mt-1 text-sm text-gray-600">{previewTheme.description}</p>
              </div>
              <button
                onClick={() => setPreviewTheme(null)}
                className="ml-4 rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {(() => {
                const sections = Array.isArray(previewTheme.sections)
                  ? previewTheme.sections
                  : Object.values(previewTheme.sections || {});
                const style = previewTheme.style || {};
                const gradient = style.gradient || 'from-gray-100 to-gray-200';

                return (
                  <div className="space-y-6">
                    {/* Theme Colors */}
                    <div>
                      <h3 className="mb-4 text-lg font-bold text-gray-900">Theme Colors</h3>
                      <div className="grid grid-cols-5 gap-3">
                        <div>
                          <div className="h-20 rounded-lg shadow-md border border-gray-200" style={{ backgroundColor: style.primaryColor || '#6366f1' }}></div>
                          <p className="mt-2 text-xs font-medium text-gray-600 text-center">Primary</p>
                          <p className="text-xs text-gray-500 text-center">{style.primaryColor || '#6366f1'}</p>
                        </div>
                        <div>
                          <div className="h-20 rounded-lg shadow-md border border-gray-200" style={{ backgroundColor: style.secondaryColor || '#e5e7eb' }}></div>
                          <p className="mt-2 text-xs font-medium text-gray-600 text-center">Secondary</p>
                          <p className="text-xs text-gray-500 text-center">{style.secondaryColor || '#e5e7eb'}</p>
                        </div>
                        <div>
                          <div className="h-20 rounded-lg shadow-md border border-gray-200" style={{ backgroundColor: style.accentColor || '#8b5cf6' }}></div>
                          <p className="mt-2 text-xs font-medium text-gray-600 text-center">Accent</p>
                          <p className="text-xs text-gray-500 text-center">{style.accentColor || '#8b5cf6'}</p>
                        </div>
                        <div>
                          <div className="h-20 rounded-lg shadow-md border border-gray-200" style={{ backgroundColor: style.backgroundColor || '#ffffff' }}></div>
                          <p className="mt-2 text-xs font-medium text-gray-600 text-center">Background</p>
                          <p className="text-xs text-gray-500 text-center">{style.backgroundColor || '#ffffff'}</p>
                        </div>
                        <div>
                          <div className="h-20 rounded-lg shadow-md border border-gray-200" style={{ backgroundColor: style.textColor || '#1f2937' }}></div>
                          <p className="mt-2 text-xs font-medium text-gray-600 text-center">Text</p>
                          <p className="text-xs text-gray-500 text-center">{style.textColor || '#1f2937'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Theme Styles */}
                    <div>
                      <h3 className="mb-4 text-lg font-bold text-gray-900">Design Style</h3>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                          <p className="text-xs font-medium text-gray-600 mb-2">Navbar Style</p>
                          <p className="text-sm font-bold text-gray-900 capitalize">{style.navbarStyle || 'Solid'}</p>
                        </div>
                        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                          <p className="text-xs font-medium text-gray-600 mb-2">Button Style</p>
                          <p className="text-sm font-bold text-gray-900 capitalize">{style.buttonStyle || 'Rounded'}</p>
                        </div>
                        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                          <p className="text-xs font-medium text-gray-600 mb-2">Font Style</p>
                          <p className="text-sm font-bold text-gray-900 capitalize">{style.fontStyle || 'Modern'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Preview */}
                    <div>
                      <h3 className="mb-4 text-lg font-bold text-gray-900">Website Preview</h3>
                      <div className={`rounded-xl bg-gradient-to-br ${gradient} p-8 shadow-xl`}>
                        <div className="mx-auto max-w-5xl rounded-lg bg-white shadow-2xl overflow-hidden">
                          {sections.length === 0 ? (
                            <div className="flex items-center justify-center h-96">
                              <div className="text-center">
                                <svg className="mx-auto h-16 w-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                                </svg>
                                <p className="mt-3 text-sm font-medium text-gray-500">Blank Canvas</p>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-0">
                              {sections.map((section: ThemeSection, idx: number) => {
                                const sectionType = section.type?.toLowerCase() || '';
                                const primaryColor = style.primaryColor || '#6366f1';
                                const secondaryColor = style.secondaryColor || '#e5e7eb';
                                const accentColor = style.accentColor || '#8b5cf6';
                                const backgroundColor = style.backgroundColor || '#ffffff';
                                const textColor = style.textColor || '#1f2937';
                                const navbarStyle = style.navbarStyle || 'solid';
                                const buttonStyle = style.buttonStyle || 'rounded';

                                // Navbar - use layout from section.id matching navbar-layouts.json
                                if (sectionType === 'navbar') {
                                  const navBgColor = navbarStyle === 'minimal' ? backgroundColor : primaryColor;
                                  const navTextColor = navbarStyle === 'minimal' ? textColor : getContrastColor(primaryColor);
                                  const buttonBg = accentColor;
                                  const buttonText = getContrastColor(accentColor);

                                  // Get layout ID from section.id or use previewNavbarLayout for preview
                                  const layoutId = section.id || previewNavbarLayout || 'default';

                                  // Stacked layout
                                  if (layoutId === 'stacked') {
                                    return (
                                      <div
                                        key={idx}
                                        className="px-8 py-4 flex flex-col items-center gap-3"
                                        style={{ backgroundColor: navBgColor }}
                                      >
                                        <div className="text-xl font-bold" style={{ color: navTextColor }}>
                                          Restaurant Name
                                        </div>
                                        <div className="flex items-center gap-6">
                                          {['Home', 'Menu', 'About', 'Contact'].map((item, i) => (
                                            <span key={i} className="text-sm font-medium" style={{ color: navTextColor }}>
                                              {item}
                                            </span>
                                          ))}
                                          <button
                                            className="px-4 py-1.5 text-sm font-semibold rounded-lg"
                                            style={{ backgroundColor: buttonBg, color: buttonText }}
                                          >
                                            Order Now
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  }

                                  // Centered layout
                                  if (layoutId === 'centered') {
                                    return (
                                      <div
                                        key={idx}
                                        className="px-8 py-4 flex items-center justify-center gap-8"
                                        style={{ backgroundColor: navBgColor }}
                                      >
                                        <div className="text-xl font-bold" style={{ color: navTextColor }}>
                                          Logo
                                        </div>
                                        <div className="flex items-center gap-6">
                                          {['Home', 'Menu', 'About', 'Contact'].map((item, i) => (
                                            <span key={i} className="text-sm font-medium" style={{ color: navTextColor }}>
                                              {item}
                                            </span>
                                          ))}
                                        </div>
                                        <button
                                          className="px-4 py-1.5 text-sm font-semibold rounded-lg"
                                          style={{ backgroundColor: buttonBg, color: buttonText }}
                                        >
                                          Order Now
                                        </button>
                                      </div>
                                    );
                                  }

                                  // Logo Center layout
                                  if (layoutId === 'logo-center') {
                                    return (
                                      <div
                                        key={idx}
                                        className="px-8 py-4 flex items-center justify-between"
                                        style={{ backgroundColor: navBgColor }}
                                      >
                                        <div className="flex items-center gap-6">
                                          {['Home', 'Menu'].map((item, i) => (
                                            <span key={i} className="text-sm font-medium" style={{ color: navTextColor }}>
                                              {item}
                                            </span>
                                          ))}
                                        </div>
                                        <div className="text-xl font-bold" style={{ color: navTextColor }}>
                                          Logo
                                        </div>
                                        <div className="flex items-center gap-6">
                                          {['About', 'Contact'].map((item, i) => (
                                            <span key={i} className="text-sm font-medium" style={{ color: navTextColor }}>
                                              {item}
                                            </span>
                                          ))}
                                          <button
                                            className="px-4 py-1.5 text-sm font-semibold rounded-lg"
                                            style={{ backgroundColor: buttonBg, color: buttonText }}
                                          >
                                            Order Now
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  }

                                  // Bordered Centered layout
                                  if (layoutId === 'bordered-centered') {
                                    return (
                                      <div
                                        key={idx}
                                        className="px-8 py-4"
                                        style={{ backgroundColor: navBgColor }}
                                      >
                                        <div className="max-w-6xl mx-auto border-2 rounded-lg px-6 py-3 flex items-center justify-center gap-8" style={{ borderColor: textColor }}>
                                          <div className="text-xl font-bold" style={{ color: navTextColor }}>
                                            Logo
                                          </div>
                                          <div className="flex items-center gap-6">
                                            {['Home', 'Menu', 'About', 'Contact'].map((item, i) => (
                                              <span key={i} className="text-sm font-medium" style={{ color: navTextColor }}>
                                                {item}
                                              </span>
                                            ))}
                                          </div>
                                          <button
                                            className="px-4 py-1.5 text-sm font-semibold rounded-lg"
                                            style={{ backgroundColor: buttonBg, color: buttonText }}
                                          >
                                            Order Now
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  }

                                  // Split layout
                                  if (layoutId === 'split') {
                                    return (
                                      <div
                                        key={idx}
                                        className="px-8 py-4 flex items-center justify-between"
                                        style={{ backgroundColor: navBgColor }}
                                      >
                                        <div className="flex items-center gap-6">
                                          {['Home', 'Menu', 'About', 'Contact'].map((item, i) => (
                                            <span key={i} className="text-sm font-medium" style={{ color: navTextColor }}>
                                              {item}
                                            </span>
                                          ))}
                                        </div>
                                        <div className="text-xl font-bold" style={{ color: navTextColor }}>
                                          Logo
                                        </div>
                                        <div className="flex items-center gap-4">
                                          <span className="text-sm font-medium" style={{ color: navTextColor }}>Location: NY</span>
                                          <button
                                            className="px-4 py-1.5 text-sm font-semibold rounded-lg"
                                            style={{ backgroundColor: buttonBg, color: buttonText }}
                                          >
                                            Order Now
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  }

                                  // Default layout
                                  return (
                                    <div
                                      key={idx}
                                      className="px-8 py-4 flex items-center justify-between"
                                      style={{ backgroundColor: navBgColor }}
                                    >
                                      <div className="text-xl font-bold" style={{ color: navTextColor }}>
                                        Restaurant Name
                                      </div>
                                      <div className="flex items-center gap-6">
                                        {['Home', 'Menu', 'About', 'Contact'].map((item, i) => (
                                          <span key={i} className="text-sm font-medium" style={{ color: navTextColor }}>
                                            {item}
                                          </span>
                                        ))}
                                        <button
                                          className="px-4 py-1.5 text-sm font-semibold rounded-lg"
                                          style={{ backgroundColor: buttonBg, color: buttonText }}
                                        >
                                          Order Now
                                        </button>
                                      </div>
                                    </div>
                                  );
                                }

                                // Hero
                                if (sectionType === 'hero') {
                                  return (
                                    <div
                                      key={idx}
                                      className={`relative bg-gradient-to-br ${gradient} px-8 py-32 text-center overflow-hidden`}
                                      style={{ backgroundColor: primaryColor }}
                                    >
                                      <div className="absolute inset-0 opacity-10">
                                        <img
                                          src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200&h=600&fit=crop"
                                          alt="Restaurant"
                                          className="w-full h-full object-cover"
                                        />
                                      </div>
                                      <div className="relative z-10">
                                        <h1 className="text-5xl font-bold text-white mb-4">
                                          Welcome to Our Restaurant
                                        </h1>
                                        <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
                                          Experience exquisite cuisine crafted with passion and served with love
                                        </p>
                                        <button
                                          className={`px-8 py-3 font-semibold shadow-lg transition hover:scale-105 ${
                                            buttonStyle === 'pill' ? 'rounded-full' :
                                            buttonStyle === 'sharp' ? 'rounded-none' :
                                            buttonStyle === 'outlined' ? 'rounded-lg border-2 border-white bg-white/10 backdrop-blur-sm text-white' :
                                            'rounded-lg'
                                          }`}
                                          style={buttonStyle !== 'outlined' ? { backgroundColor: accentColor, color: getContrastColor(accentColor) } : {}}
                                        >
                                          View Menu
                                        </button>
                                      </div>
                                    </div>
                                  );
                                }

                                // About
                                if (sectionType === 'about') {
                                  return (
                                    <div key={idx} className="px-8 py-16" style={{ backgroundColor: backgroundColor }}>
                                      <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
                                        <div>
                                          <div className="text-sm font-bold mb-2" style={{ color: primaryColor }}>
                                            OUR STORY
                                          </div>
                                          <h2 className="text-3xl font-bold mb-4" style={{ color: textColor }}>
                                            About Our Restaurant
                                          </h2>
                                          <p className="text-gray-600 mb-4 leading-relaxed">
                                            We've been serving delicious food and creating memorable dining experiences for over 20 years. Our passion for quality ingredients and exceptional service sets us apart.
                                          </p>
                                          <p className="text-gray-600 leading-relaxed">
                                            Every dish is prepared with care, using locally sourced ingredients and traditional cooking methods that have been perfected over generations.
                                          </p>
                                        </div>
                                        <div className="rounded-lg overflow-hidden shadow-xl">
                                          <img
                                            src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&h=400&fit=crop"
                                            alt="Restaurant interior"
                                            className="w-full h-80 object-cover"
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  );
                                }

                                // Menu/Dine-in
                                if (sectionType === 'dine-in' || sectionType === 'menu') {
                                  // Use darker color for better visibility on light gray-50 background
                                  const menuHeadingColor = getContrastColor(textColor) === '#ffffff' ? '#1f2937' : textColor;

                                  return (
                                    <div key={idx} className="px-8 py-16 bg-gray-50">
                                      <div className="max-w-6xl mx-auto">
                                        <div className="text-center mb-12">
                                          <div className="text-sm font-bold mb-2" style={{ color: primaryColor }}>
                                            DISCOVER OUR FLAVORS
                                          </div>
                                          <h2 className="text-3xl font-bold" style={{ color: menuHeadingColor }}>
                                            Our Menu
                                          </h2>
                                        </div>
                                        <div className="grid md:grid-cols-3 gap-6">
                                          {[
                                            { name: 'Grilled Salmon', price: '$24.99', img: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400&h=300&fit=crop' },
                                            { name: 'Pasta Carbonara', price: '$18.99', img: 'https://images.unsplash.com/photo-1612874742237-6526221588e3?w=400&h=300&fit=crop' },
                                            { name: 'Beef Steak', price: '$32.99', img: 'https://images.unsplash.com/photo-1600891964092-4316c288032e?w=400&h=300&fit=crop' }
                                          ].map((item, i) => (
                                            <div key={i} className="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-xl transition">
                                              <img src={item.img} alt={item.name} className="w-full h-48 object-cover" />
                                              <div className="p-4">
                                                <div className="flex items-center justify-between">
                                                  <h3 className="font-bold text-lg" style={{ color: menuHeadingColor }}>{item.name}</h3>
                                                  <span className="font-bold" style={{ color: primaryColor }}>{item.price}</span>
                                                </div>
                                                <p className="text-sm text-gray-600 mt-2">
                                                  Fresh ingredients, expertly prepared
                                                </p>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                }

                                // Gallery
                                if (sectionType === 'gallery') {
                                  return (
                                    <div key={idx} className="px-8 py-16" style={{ backgroundColor: backgroundColor }}>
                                      <div className="max-w-6xl mx-auto">
                                        <h2 className="text-3xl font-bold text-center mb-12" style={{ color: textColor }}>
                                          Gallery
                                        </h2>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                          {[
                                            'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=400&fit=crop',
                                            'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=400&fit=crop',
                                            'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=400&h=400&fit=crop',
                                            'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&h=400&fit=crop',
                                            'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=400&h=400&fit=crop',
                                            'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=400&h=400&fit=crop',
                                            'https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?w=400&h=400&fit=crop',
                                            'https://images.unsplash.com/photo-1529042410759-befb1204b468?w=400&h=400&fit=crop'
                                          ].map((img, i) => (
                                            <div key={i} className="aspect-square rounded-lg overflow-hidden shadow-md hover:shadow-xl transition">
                                              <img src={img} alt={`Gallery ${i + 1}`} className="w-full h-full object-cover hover:scale-110 transition duration-300" />
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                }

                                // Reviews
                                if (sectionType === 'review' || sectionType === 'reviews') {
                                  // Use darker color for better visibility on light amber background
                                  const reviewHeadingColor = getContrastColor(textColor) === '#ffffff' ? '#1f2937' : textColor;

                                  return (
                                    <div key={idx} className="px-8 py-16 bg-gradient-to-br from-amber-50 to-orange-50">
                                      <div className="max-w-6xl mx-auto">
                                        <h2 className="text-3xl font-bold text-center mb-12" style={{ color: reviewHeadingColor }}>
                                          What Our Customers Say
                                        </h2>
                                        <div className="grid md:grid-cols-3 gap-6">
                                          {[
                                            { name: 'Sarah Johnson', review: 'Amazing food and excellent service! The atmosphere is perfect for a special dinner.' },
                                            { name: 'Michael Chen', review: 'Best restaurant in town. Fresh ingredients and incredible flavors in every dish.' },
                                            { name: 'Emma Davis', review: 'A truly memorable dining experience. The staff went above and beyond to make our evening special.' }
                                          ].map((review, i) => (
                                            <div key={i} className="bg-white rounded-lg p-6 shadow-md">
                                              <div className="flex gap-1 mb-3">
                                                {[1, 2, 3, 4, 5].map((star) => (
                                                  <svg key={star} className="w-5 h-5" style={{ color: accentColor }} fill="currentColor" viewBox="0 0 20 20">
                                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                                  </svg>
                                                ))}
                                              </div>
                                              <p className="text-gray-600 mb-4 leading-relaxed">"{review.review}"</p>
                                              <p className="font-semibold" style={{ color: reviewHeadingColor }}>- {review.name}</p>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                }

                                // Reservation
                                if (sectionType === 'reservation' || sectionType === 'reservations') {
                                  // Use darker color for form labels on white background
                                  const formLabelColor = getContrastColor(textColor) === '#ffffff' ? '#1f2937' : textColor;

                                  return (
                                    <div key={idx} className="px-8 py-16" style={{ backgroundColor: backgroundColor }}>
                                      <div className="max-w-4xl mx-auto">
                                        <div className="text-center mb-12">
                                          <div className="text-sm font-bold mb-2" style={{ color: primaryColor }}>
                                            RESERVE YOUR TABLE
                                          </div>
                                          <h2 className="text-3xl font-bold" style={{ color: textColor }}>
                                            Make a Reservation
                                          </h2>
                                          <p className="mt-3 text-gray-600">
                                            Book your dining experience with us
                                          </p>
                                        </div>
                                        <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-200">
                                          <div className="grid md:grid-cols-2 gap-6">
                                            <div>
                                              <label className="block text-sm font-semibold mb-2" style={{ color: formLabelColor }}>
                                                Name
                                              </label>
                                              <div className="w-full h-10 rounded-lg bg-gray-50 border border-gray-300"></div>
                                            </div>
                                            <div>
                                              <label className="block text-sm font-semibold mb-2" style={{ color: formLabelColor }}>
                                                Email
                                              </label>
                                              <div className="w-full h-10 rounded-lg bg-gray-50 border border-gray-300"></div>
                                            </div>
                                            <div>
                                              <label className="block text-sm font-semibold mb-2" style={{ color: formLabelColor }}>
                                                Date
                                              </label>
                                              <div className="w-full h-10 rounded-lg bg-gray-50 border border-gray-300"></div>
                                            </div>
                                            <div>
                                              <label className="block text-sm font-semibold mb-2" style={{ color: formLabelColor }}>
                                                Time
                                              </label>
                                              <div className="w-full h-10 rounded-lg bg-gray-50 border border-gray-300"></div>
                                            </div>
                                            <div>
                                              <label className="block text-sm font-semibold mb-2" style={{ color: formLabelColor }}>
                                                Guests
                                              </label>
                                              <div className="w-full h-10 rounded-lg bg-gray-50 border border-gray-300"></div>
                                            </div>
                                            <div>
                                              <label className="block text-sm font-semibold mb-2" style={{ color: formLabelColor }}>
                                                Phone
                                              </label>
                                              <div className="w-full h-10 rounded-lg bg-gray-50 border border-gray-300"></div>
                                            </div>
                                          </div>
                                          <div className="mt-6">
                                            <button
                                              className={`w-full py-3 font-semibold shadow-lg transition ${
                                                buttonStyle === 'pill' ? 'rounded-full' :
                                                buttonStyle === 'sharp' ? 'rounded-none' :
                                                'rounded-lg'
                                              }`}
                                              style={{ backgroundColor: accentColor, color: getContrastColor(accentColor) }}
                                            >
                                              Confirm Reservation
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                }

                                // Opening Hours
                                if (
                                  sectionType === 'hours' ||
                                  sectionType === 'opening hours' ||
                                  sectionType === 'opening_hours' ||
                                  sectionType === 'openinghours' ||
                                  sectionType === 'operating hours' ||
                                  sectionType === 'operating_hours' ||
                                  sectionType === 'business hours' ||
                                  sectionType === 'business_hours' ||
                                  sectionType.includes('hours')
                                ) {
                                  // Use darker color for better visibility on light gray-50 background
                                  const hoursHeadingColor = getContrastColor(textColor) === '#ffffff' ? '#1f2937' : textColor;

                                  return (
                                    <div key={idx} className="px-8 py-16 bg-gray-50">
                                      <div className="max-w-4xl mx-auto">
                                        <div className="text-center mb-12">
                                          <div className="text-sm font-bold mb-2" style={{ color: primaryColor }}>
                                            VISIT US
                                          </div>
                                          <h2 className="text-3xl font-bold" style={{ color: hoursHeadingColor }}>
                                            Opening Hours
                                          </h2>
                                        </div>
                                        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                                          <div className="divide-y divide-gray-200">
                                            {[
                                              { day: 'Monday', hours: '11:00 AM - 10:00 PM' },
                                              { day: 'Tuesday', hours: '11:00 AM - 10:00 PM' },
                                              { day: 'Wednesday', hours: '11:00 AM - 10:00 PM' },
                                              { day: 'Thursday', hours: '11:00 AM - 10:00 PM' },
                                              { day: 'Friday', hours: '11:00 AM - 11:00 PM' },
                                              { day: 'Saturday', hours: '10:00 AM - 11:00 PM' },
                                              { day: 'Sunday', hours: '10:00 AM - 9:00 PM' }
                                            ].map((item, i) => (
                                              <div key={i} className="flex items-center justify-between px-8 py-4 hover:bg-gray-50 transition">
                                                <div className="flex items-center gap-3">
                                                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: primaryColor }}></div>
                                                  <span className="font-semibold" style={{ color: hoursHeadingColor }}>{item.day}</span>
                                                </div>
                                                <span className="text-gray-600 font-medium">{item.hours}</span>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                }

                                // Catering/Events
                                if (sectionType === 'catering' || sectionType === 'events') {
                                  // Use darker color for card titles on white background
                                  const cateringCardColor = getContrastColor(textColor) === '#ffffff' ? '#1f2937' : textColor;

                                  return (
                                    <div key={idx} className="px-8 py-16" style={{ backgroundColor: backgroundColor }}>
                                      <div className="max-w-6xl mx-auto">
                                        <div className="text-center mb-12">
                                          <div className="text-sm font-bold mb-2" style={{ color: primaryColor }}>
                                            SPECIAL EVENTS
                                          </div>
                                          <h2 className="text-3xl font-bold mb-4" style={{ color: textColor }}>
                                            Catering Services
                                          </h2>
                                          <p className="text-gray-600 max-w-2xl mx-auto">
                                            Make your event unforgettable with our professional catering services. From intimate gatherings to grand celebrations, we bring exceptional cuisine to your venue.
                                          </p>
                                        </div>
                                        <div className="grid md:grid-cols-3 gap-6 mb-12">
                                          {[
                                            {
                                              title: 'Corporate Events',
                                              description: 'Professional catering for business meetings, conferences, and corporate gatherings',
                                              icon: '🏢'
                                            },
                                            {
                                              title: 'Weddings & Parties',
                                              description: 'Elegant dining experiences for your special celebrations and memorable occasions',
                                              icon: '🎉'
                                            },
                                            {
                                              title: 'Private Functions',
                                              description: 'Customized menus for intimate gatherings and private events at your location',
                                              icon: '🍽️'
                                            }
                                          ].map((service, i) => (
                                            <div key={i} className="bg-white rounded-xl p-6 shadow-md hover:shadow-xl transition border border-gray-200">
                                              <div className="text-4xl mb-4">{service.icon}</div>
                                              <h3 className="text-xl font-bold mb-3" style={{ color: cateringCardColor }}>
                                                {service.title}
                                              </h3>
                                              <p className="text-gray-600 text-sm leading-relaxed mb-4">
                                                {service.description}
                                              </p>
                                              <button
                                                className={`text-sm font-semibold px-4 py-2 transition ${
                                                  buttonStyle === 'pill' ? 'rounded-full' :
                                                  buttonStyle === 'sharp' ? 'rounded-none' :
                                                  'rounded-lg'
                                                }`}
                                                style={{ color: accentColor, borderColor: accentColor, borderWidth: '2px' }}
                                              >
                                                Learn More
                                              </button>
                                            </div>
                                          ))}
                                        </div>
                                        <div className="text-center">
                                          <button
                                            className={`px-8 py-3 font-semibold shadow-lg transition hover:scale-105 ${
                                              buttonStyle === 'pill' ? 'rounded-full' :
                                              buttonStyle === 'sharp' ? 'rounded-none' :
                                              'rounded-lg'
                                            }`}
                                            style={{ backgroundColor: accentColor, color: getContrastColor(accentColor) }}
                                          >
                                            Request Catering Quote
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                }

                                // Contact
                                if (sectionType === 'contact' || sectionType === 'contact us' || sectionType === 'contact_us') {
                                  const contactHeadingColor = getContrastColor(textColor) === '#ffffff' ? '#1f2937' : textColor;

                                  return (
                                    <div key={idx} className="px-8 py-16" style={{ backgroundColor: backgroundColor }}>
                                      <div className="max-w-6xl mx-auto">
                                        <div className="text-center mb-12">
                                          <div className="text-sm font-bold mb-2" style={{ color: primaryColor }}>
                                            GET IN TOUCH
                                          </div>
                                          <h2 className="text-3xl font-bold mb-4" style={{ color: textColor }}>
                                            Contact Us
                                          </h2>
                                          <p className="text-gray-600 max-w-2xl mx-auto">
                                            We'd love to hear from you. Reach out for reservations, inquiries, or just to say hello.
                                          </p>
                                        </div>
                                        <div className="grid md:grid-cols-2 gap-12">
                                          <div className="space-y-6">
                                            <div className="flex items-start gap-4">
                                              <div className="flex h-12 w-12 items-center justify-center rounded-lg shadow-md" style={{ backgroundColor: primaryColor }}>
                                                <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                </svg>
                                              </div>
                                              <div>
                                                <h3 className="font-bold mb-1" style={{ color: contactHeadingColor }}>Address</h3>
                                                <p className="text-gray-600 text-sm">123 Restaurant Street<br />City, State 12345</p>
                                              </div>
                                            </div>
                                            <div className="flex items-start gap-4">
                                              <div className="flex h-12 w-12 items-center justify-center rounded-lg shadow-md" style={{ backgroundColor: primaryColor }}>
                                                <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                                </svg>
                                              </div>
                                              <div>
                                                <h3 className="font-bold mb-1" style={{ color: contactHeadingColor }}>Phone</h3>
                                                <p className="text-gray-600 text-sm">(555) 123-4567</p>
                                              </div>
                                            </div>
                                            <div className="flex items-start gap-4">
                                              <div className="flex h-12 w-12 items-center justify-center rounded-lg shadow-md" style={{ backgroundColor: primaryColor }}>
                                                <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                                </svg>
                                              </div>
                                              <div>
                                                <h3 className="font-bold mb-1" style={{ color: contactHeadingColor }}>Email</h3>
                                                <p className="text-gray-600 text-sm">info@restaurant.com</p>
                                              </div>
                                            </div>
                                          </div>
                                          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                                            <h3 className="font-bold mb-4" style={{ color: contactHeadingColor }}>Send us a message</h3>
                                            <div className="space-y-4">
                                              <div>
                                                <label className="block text-sm font-semibold mb-2" style={{ color: contactHeadingColor }}>Name</label>
                                                <div className="w-full h-10 rounded-lg bg-gray-50 border border-gray-300"></div>
                                              </div>
                                              <div>
                                                <label className="block text-sm font-semibold mb-2" style={{ color: contactHeadingColor }}>Email</label>
                                                <div className="w-full h-10 rounded-lg bg-gray-50 border border-gray-300"></div>
                                              </div>
                                              <div>
                                                <label className="block text-sm font-semibold mb-2" style={{ color: contactHeadingColor }}>Message</label>
                                                <div className="w-full h-24 rounded-lg bg-gray-50 border border-gray-300"></div>
                                              </div>
                                              <button
                                                className={`w-full py-3 font-semibold shadow-lg transition ${
                                                  buttonStyle === 'pill' ? 'rounded-full' :
                                                  buttonStyle === 'sharp' ? 'rounded-none' :
                                                  'rounded-lg'
                                                }`}
                                                style={{ backgroundColor: accentColor, color: getContrastColor(accentColor) }}
                                              >
                                                Send Message
                                              </button>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                }

                                // Footer
                                if (sectionType === 'footer') {
                                  const layoutId = section.id || 'default';

                                  // Centered footer layout
                                  if (layoutId === 'centered') {
                                    return (
                                      <div key={idx} className="px-8 py-12" style={{ backgroundColor: primaryColor }}>
                                        <div className="max-w-4xl mx-auto text-center text-white">
                                          <h3 className="text-2xl font-bold mb-4">Restaurant Name</h3>
                                          <p className="text-white/80 text-sm mb-6">
                                            Serving excellence since 2000
                                          </p>
                                          <div className="flex justify-center gap-6 mb-6 text-sm">
                                            <a href="#" className="hover:text-white/80 transition">Home</a>
                                            <a href="#" className="hover:text-white/80 transition">Menu</a>
                                            <a href="#" className="hover:text-white/80 transition">About</a>
                                            <a href="#" className="hover:text-white/80 transition">Contact</a>
                                          </div>
                                          <div className="flex justify-center gap-3 mb-6">
                                            {['F', 'I', 'T'].map((social, i) => (
                                              <div key={i} className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition">
                                                <span className="text-sm font-semibold">{social}</span>
                                              </div>
                                            ))}
                                          </div>
                                          <div className="border-t border-white/20 pt-6 text-sm text-white/70">
                                            © 2026 Restaurant Name. All rights reserved.
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  }

                                  // Restaurant footer layout (4 columns with newsletter)
                                  if (layoutId === 'restaurant') {
                                    return (
                                      <div key={idx} className="px-8 py-12" style={{ backgroundColor: primaryColor }}>
                                        <div className="max-w-6xl mx-auto">
                                          <div className="grid md:grid-cols-4 gap-8 text-white mb-8">
                                            <div>
                                              <h3 className="text-xl font-bold mb-4">Restaurant Name</h3>
                                              <p className="text-white/80 text-sm">
                                                Serving excellence since 2000
                                              </p>
                                            </div>
                                            <div>
                                              <h4 className="font-bold mb-4">Quick Links</h4>
                                              <div className="space-y-2 text-sm text-white/80">
                                                <div>Home</div>
                                                <div>Menu</div>
                                                <div>About</div>
                                                <div>Contact</div>
                                              </div>
                                            </div>
                                            <div>
                                              <h4 className="font-bold mb-4">Contact</h4>
                                              <div className="space-y-2 text-sm text-white/80">
                                                <div>123 Main St</div>
                                                <div>Phone: (555) 123-4567</div>
                                                <div>Email: info@restaurant.com</div>
                                              </div>
                                            </div>
                                            <div>
                                              <h4 className="font-bold mb-4">Newsletter</h4>
                                              <p className="text-white/80 text-sm mb-3">Stay updated with our latest offers</p>
                                              <div className="flex">
                                                <div className="flex-1 h-8 rounded-l-lg bg-white/20 border border-white/30"></div>
                                                <button className="px-3 h-8 rounded-r-lg text-xs font-semibold" style={{ backgroundColor: accentColor, color: getContrastColor(accentColor) }}>
                                                  Subscribe
                                                </button>
                                              </div>
                                            </div>
                                          </div>
                                          <div className="border-t border-white/20 pt-6 text-center text-sm text-white/70">
                                            © 2026 Restaurant Name. All rights reserved.
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  }

                                  // Columns-4 footer layout (4 columns with newsletter)
                                  if (layoutId === 'columns-4') {
                                    return (
                                      <div key={idx} className="px-8 py-12" style={{ backgroundColor: primaryColor }}>
                                        <div className="max-w-6xl mx-auto">
                                          <div className="grid md:grid-cols-4 gap-8 text-white mb-8">
                                            <div>
                                              <h3 className="text-xl font-bold mb-4">Restaurant Name</h3>
                                              <p className="text-white/80 text-sm">
                                                Serving excellence since 2000
                                              </p>
                                            </div>
                                            <div>
                                              <h4 className="font-bold mb-4">Menu</h4>
                                              <div className="space-y-2 text-sm text-white/80">
                                                <div>Appetizers</div>
                                                <div>Main Course</div>
                                                <div>Desserts</div>
                                                <div>Beverages</div>
                                              </div>
                                            </div>
                                            <div>
                                              <h4 className="font-bold mb-4">Services</h4>
                                              <div className="space-y-2 text-sm text-white/80">
                                                <div>Dine In</div>
                                                <div>Takeout</div>
                                                <div>Delivery</div>
                                                <div>Catering</div>
                                              </div>
                                            </div>
                                            <div>
                                              <h4 className="font-bold mb-4">Newsletter</h4>
                                              <p className="text-white/80 text-sm mb-3">Get the latest updates</p>
                                              <div className="flex">
                                                <div className="flex-1 h-8 rounded-l-lg bg-white/20 border border-white/30"></div>
                                                <button className="px-3 h-8 rounded-r-lg text-xs font-semibold" style={{ backgroundColor: accentColor, color: getContrastColor(accentColor) }}>
                                                  Subscribe
                                                </button>
                                              </div>
                                            </div>
                                          </div>
                                          <div className="border-t border-white/20 pt-6 text-center text-sm text-white/70">
                                            © 2026 Restaurant Name. All rights reserved.
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  }

                                  // Default (three section) footer layout
                                  return (
                                    <div key={idx} className="px-8 py-12" style={{ backgroundColor: primaryColor }}>
                                      <div className="max-w-6xl mx-auto">
                                        <div className="grid md:grid-cols-3 gap-8 text-white mb-8">
                                          <div>
                                            <h3 className="text-xl font-bold mb-4">Restaurant Name</h3>
                                            <p className="text-white/80 text-sm">
                                              Serving excellence since 2000
                                            </p>
                                          </div>
                                          <div>
                                            <h4 className="font-bold mb-4">Location</h4>
                                            <div className="space-y-2 text-sm text-white/80">
                                              <div>123 Main Street</div>
                                              <div>City, State 12345</div>
                                              <div>Phone: (555) 123-4567</div>
                                            </div>
                                          </div>
                                          <div>
                                            <h4 className="font-bold mb-4">Contact</h4>
                                            <div className="space-y-2 text-sm text-white/80">
                                              <div>Email: info@restaurant.com</div>
                                              <div className="flex gap-3 mt-3">
                                                {['F', 'I', 'T'].map((social, i) => (
                                                  <div key={i} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition">
                                                    <span className="text-xs font-semibold">{social}</span>
                                                  </div>
                                                ))}
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                        <div className="border-t border-white/20 pt-6 text-center text-sm text-white/70">
                                          © 2026 Restaurant Name. All rights reserved.
                                        </div>
                                      </div>
                                    </div>
                                  );
                                }

                                // Generic section fallback
                                return (
                                  <div key={idx} className="px-8 py-16 bg-gray-50 border-t border-gray-200">
                                    <div className="max-w-6xl mx-auto text-center">
                                      <div className="inline-flex items-center gap-3 bg-white rounded-lg px-6 py-4 shadow-md border border-gray-200">
                                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 text-white font-bold text-lg">
                                          {idx + 1}
                                        </div>
                                        <div className="text-left">
                                          <h4 className="font-semibold text-gray-900 capitalize text-lg">{section.type}</h4>
                                          <p className="text-sm text-gray-600">{section.name}</p>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Tags */}
                    {previewTheme.tags && previewTheme.tags.length > 0 && (
                      <div>
                        <h3 className="mb-4 text-lg font-bold text-gray-900">Tags</h3>
                        <div className="flex flex-wrap gap-2">
                          {previewTheme.tags.map((tag, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center rounded-lg bg-purple-100 px-3 py-1.5 text-sm font-medium text-purple-700"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Select Button */}
                    <div className="flex gap-3 pt-4">
                      <button
                        type="button"
                        onClick={() => setPreviewTheme(null)}
                        className="flex-1 rounded-lg border border-gray-300 bg-white px-6 py-3 text-base font-semibold text-gray-700 transition hover:bg-gray-50"
                      >
                        Close
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          handleSelectTemplate(previewTheme.theme_id);
                          setPreviewTheme(null);
                        }}
                        className="flex-1 rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-3 text-base font-semibold text-white shadow-md transition hover:from-purple-700 hover:to-purple-800"
                      >
                        Select This Theme
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
