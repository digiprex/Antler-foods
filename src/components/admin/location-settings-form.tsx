/**
 * Location Settings Form Component
 *
 * Displays restaurant location from Google Place ID:
 * - Fetches location details from Google Places API using place_id
 * - Shows location on interactive map
 * - Layout selection (default, grid, list, cards, map)
 * - Customization options for display
 */

'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Toast from '@/components/ui/toast';
import type { LocationConfig } from '@/types/location.types';
import { DEFAULT_LOCATION_CONFIG } from '@/types/location.types';
import { useSectionStyleDefaults } from '@/hooks/use-section-style-defaults';
import { SectionTypographyControls } from '@/components/admin/section-typography-controls';
import type { SectionStyleConfig } from '@/types/section-style.types';

// Dynamically import Google Location Picker to avoid SSR issues
const GoogleLocationPicker = dynamic(() => import('./google-location-picker'), { ssr: false });

interface LocationSettingsFormProps {
  restaurantId: string;
  pageId?: string;
  templateId?: string;
  isNewSection?: boolean;
}

interface PlaceDetails {
  name: string;
  formatted_address: string;
  formatted_phone_number?: string;
  website?: string;
  opening_hours?: {
    weekday_text: string[];
  };
  geometry: {
    location: {
      lat: (() => number) | number;
      lng: (() => number) | number;
    };
  };
  address_components: Array<{
    long_name: string;
    short_name: string;
    types: string[];
  }>;
  photos?: Array<{
    getUrl: (options: { maxWidth: number }) => string;
  }>;
}

export default function LocationSettingsForm({ restaurantId, pageId, templateId, isNewSection = false }: LocationSettingsFormProps) {
  const sectionStyleDefaults = useSectionStyleDefaults(restaurantId);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<LocationConfig>({
    ...DEFAULT_LOCATION_CONFIG,
    ...sectionStyleDefaults,
  });
  const [sectionStyle, setSectionStyle] = useState<SectionStyleConfig>({
    ...sectionStyleDefaults,
    is_custom: sectionStyleDefaults.is_custom ?? false,
    buttonStyleVariant: sectionStyleDefaults.buttonStyleVariant ?? 'primary',
  });
  const [placeDetails, setPlaceDetails] = useState<PlaceDetails | null>(null);
  const [googlePlaceId, setGooglePlaceId] = useState<string>('');
  const [loadingPlace, setLoadingPlace] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // Toast state
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  // Layout options with descriptions
  const layoutOptions = [
    { value: 'default', name: 'Default', description: 'Simple location display', icon: '📄' },
    { value: 'grid', name: 'Grid', description: 'Grid layout with details', icon: '⊞' },
    { value: 'list', name: 'List', description: 'Detailed list view', icon: '☰' },
    { value: 'cards', name: 'Cards', description: 'Card-based layout', icon: '🗃️' },
    { value: 'map', name: 'Map View', description: 'Interactive map', icon: '🗺️' },
    { value: 'compact', name: 'Compact', description: 'Minimal card view', icon: '📋' },
    { value: 'sidebar', name: 'Sidebar', description: 'Sidebar with map focus', icon: '⊟' },
    { value: 'fullscreen', name: 'Fullscreen', description: 'Full-width immersive', icon: '🖼️' },
  ];

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  // Load configuration and restaurant place_id from API
  useEffect(() => {
    const loadConfig = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          restaurant_id: restaurantId,
          ...(pageId && { page_id: pageId }),
          ...(templateId && { template_id: templateId }),
          ...(isNewSection && { new_section: 'true' }),
        });

        const response = await fetch(`/api/location-config?${params}`);
        const data = await response.json();

        if (data.success) {
          setConfig({
            ...DEFAULT_LOCATION_CONFIG,
            ...sectionStyleDefaults,
            ...data.data,
          });

          // Set section style from loaded config
          setSectionStyle({
            ...sectionStyleDefaults,
            is_custom: data.data.is_custom ?? false,
            buttonStyleVariant: data.data.buttonStyleVariant ?? 'primary',
            titleFontFamily: data.data.titleFontFamily,
            titleFontSize: data.data.titleFontSize,
            titleFontWeight: data.data.titleFontWeight,
            titleColor: data.data.titleColor,
            subtitleFontFamily: data.data.descriptionFontFamily,
            subtitleFontSize: data.data.descriptionFontSize,
            subtitleFontWeight: data.data.descriptionFontWeight,
            subtitleColor: data.data.descriptionColor,
            bodyFontFamily: data.data.bodyFontFamily,
            bodyFontSize: data.data.bodyFontSize,
            bodyFontWeight: data.data.bodyFontWeight,
            bodyColor: data.data.bodyColor,
          });

          // Get google_place_id from restaurant data
          if (data.data.google_place_id) {
            setGooglePlaceId(data.data.google_place_id);
            fetchPlaceDetails(data.data.google_place_id);
          }
        }
      } catch (error) {
        console.error('Failed to load location config:', error);
        setToastMessage('Failed to load location settings');
        setToastType('error');
        setShowToast(true);
      } finally {
        setLoading(false);
      }
    };

    loadConfig();
  }, [restaurantId, pageId, templateId, isNewSection, sectionStyleDefaults]);

  useEffect(() => {
    if (!isNewSection) return;
    setConfig((prev) => ({
      ...DEFAULT_LOCATION_CONFIG,
      ...sectionStyleDefaults,
      ...prev,
    }));
  }, [isNewSection, sectionStyleDefaults]);

  // Fetch place details from Google Places API
  const fetchPlaceDetails = async (placeId: string) => {
    if (!apiKey) {
      console.error('Google Maps API key not configured');
      return;
    }

    // Check if Google Maps is already loaded
    if (typeof window !== 'undefined' && window.google?.maps && (window.google.maps as any).places) {
      getPlaceDetails(placeId);
      return;
    }

    // Load Google Maps script if not already loaded
    if (!document.querySelector(`script[src*="maps.googleapis.com"]`)) {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
      script.async = true;
      script.defer = true;

      script.onload = () => {
        getPlaceDetails(placeId);
      };

      script.onerror = () => {
        setToastMessage('Failed to load Google Maps');
        setToastType('error');
        setShowToast(true);
      };

      document.head.appendChild(script);
    } else {
      // Wait for Google Maps to be available
      const checkGoogle = setInterval(() => {
        if (typeof window !== 'undefined' && window.google?.maps && (window.google.maps as any).places) {
          clearInterval(checkGoogle);
          getPlaceDetails(placeId);
        }
      }, 100);
    }
  };

  const getPlaceDetails = (placeId: string) => {
    if (typeof window === 'undefined' || !window.google?.maps || !(window.google.maps as any).places) {
      console.error('Google Maps not loaded');
      return;
    }

    setLoadingPlace(true);

    // Create a temporary div for PlacesService
    const mapDiv = document.createElement('div');
    const service = new (window.google.maps as any).places.PlacesService(mapDiv);

    const request = {
      placeId: placeId,
      fields: [
        'name',
        'formatted_address',
        'formatted_phone_number',
        'website',
        'opening_hours',
        'geometry',
        'address_components',
        'photos',
      ],
    };

    service.getDetails(request, (place: any, status: any) => {
      if (status === (window.google?.maps as any)?.places?.PlacesServiceStatus?.OK && place) {
        setPlaceDetails(place);
      } else {
        console.error('Failed to fetch place details:', status);
        setToastMessage('Failed to fetch location details from Google');
        setToastType('error');
        setShowToast(true);
      }
      setLoadingPlace(false);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSaving(true);
      const response = await fetch('/api/location-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...config,
          ...sectionStyle,
          // Map subtitle back to description for location config
          descriptionFontFamily: sectionStyle.subtitleFontFamily,
          descriptionFontSize: sectionStyle.subtitleFontSize,
          descriptionFontWeight: sectionStyle.subtitleFontWeight,
          descriptionColor: sectionStyle.subtitleColor,
          restaurant_id: restaurantId,
          page_id: pageId,
          template_id: templateId,
          google_place_id: googlePlaceId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setToastMessage('Location settings saved successfully!');
        setToastType('success');
        setShowToast(true);
      } else {
        throw new Error(data.error || 'Failed to save');
      }
    } catch (error) {
      console.error('Failed to save location config:', error);
      setToastMessage('Failed to save location settings');
      setToastType('error');
      setShowToast(true);
    } finally {
      setSaving(false);
    }
  };

  const updateConfig = (updates: Partial<LocationConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <svg className="h-8 w-8 animate-spin text-purple-600" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span className="ml-2 text-gray-700">Loading location settings...</span>
      </div>
    );
  }

  // Show message if no Google Place ID is configured
  if (!googlePlaceId) {
    return (
      <div style={{
        padding: '3rem',
        backgroundColor: '#fff3cd',
        borderRadius: '12px',
        border: '2px solid #ffc107',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>⚠️</div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1rem', color: '#111827' }}>
          No Google Place ID Configured
        </h2>
        <p style={{ fontSize: '1rem', color: '#6b7280', marginBottom: '1.5rem', maxWidth: '600px', margin: '0 auto 1.5rem' }}>
          This restaurant doesn't have a Google Place ID set. The location settings feature requires a Google Place ID to fetch and display location information.
        </p>
        <div style={{
          backgroundColor: '#fff',
          padding: '1.5rem',
          borderRadius: '8px',
          textAlign: 'left',
          maxWidth: '600px',
          margin: '0 auto',
        }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem' }}>
            How to add a Google Place ID:
          </h3>
          <ol style={{ paddingLeft: '1.5rem', color: '#6b7280', lineHeight: '1.8' }}>
            <li>Go to <a href="https://developers.google.com/maps/documentation/places/web-service/place-id" target="_blank" rel="noopener noreferrer" style={{ color: '#667eea' }}>Google Place ID Finder</a></li>
            <li>Search for your restaurant location</li>
            <li>Copy the Place ID</li>
            <li>Update the restaurant record with the <code style={{ backgroundColor: '#f3f4f6', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>google_place_id</code> field</li>
          </ol>
        </div>
      </div>
    );
  }

  if (!apiKey) {
    return (
      <div style={{
        padding: '3rem',
        backgroundColor: '#fff3cd',
        borderRadius: '12px',
        border: '2px solid #ffc107',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>⚠️</div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1rem', color: '#111827' }}>
          Google Maps API Key Required
        </h2>
        <p style={{ fontSize: '1rem', color: '#6b7280', marginBottom: '1.5rem' }}>
          To use location features, add your Google Maps API key to the .env.local file:
        </p>
        <code style={{
          display: 'block',
          padding: '1rem',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          fontSize: '0.9rem',
          fontFamily: 'monospace',
          maxWidth: '600px',
          margin: '0 auto',
        }}>
          NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_api_key_here
        </code>
      </div>
    );
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg">
              <svg className="h-7 w-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Location Settings</h1>
              <p className="mt-1 text-sm text-gray-600">
                Configure how your restaurant location is displayed
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowPreviewModal(true)}
            disabled={!placeDetails}
            title={placeDetails ? 'Preview Layout' : 'Preview disabled - location not loaded'}
            className="inline-flex items-center gap-2 rounded-lg border border-purple-200 bg-white px-4 py-2.5 text-sm font-medium text-purple-700 shadow-sm transition-all hover:border-purple-300 hover:bg-purple-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Preview Layout
          </button>
        </div>

        {/* Location Information */}
  

        {/* Display Settings */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
              <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Display Settings</h2>
              <p className="text-sm text-gray-600">Configure visibility and content</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700">
                  Enable Location Display
                </label>
                <p className="mt-1 text-xs text-gray-500">Show location section on the page</p>
              </div>
              <input
                type="checkbox"
                checked={config.enabled || false}
                onChange={(e) => updateConfig({ enabled: e.target.checked })}
                className="h-6 w-6 rounded border-gray-300 text-purple-600 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Section Title
              </label>
              <p className="mt-1 text-xs text-gray-500">Main heading for the location section</p>
              <input
                type="text"
                className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                value={config.title || ''}
                onChange={(e) => updateConfig({ title: e.target.value })}
                placeholder="Our Location"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <p className="mt-1 text-xs text-gray-500">Brief description for the location section</p>
              <textarea
                className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                value={config.description || ''}
                onChange={(e) => updateConfig({ description: e.target.value })}
                placeholder="Visit us at our location"
                rows={3}
              />
            </div>
          </div>
        </div>

        {/* Layout Selection */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
              <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Layout Style</h2>
              <p className="text-sm text-gray-600">Choose how location is displayed</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {layoutOptions.map((option) => (
              <div
                key={option.value}
                onClick={() => updateConfig({ layout: option.value as LocationConfig['layout'] })}
                className={`cursor-pointer rounded-lg border-2 p-4 transition-all ${
                  config.layout === option.value
                    ? 'border-purple-500 bg-purple-50 shadow-md'
                    : 'border-gray-200 bg-white hover:border-purple-300 hover:shadow-sm'
                }`}
              >
                <div className="mb-2 text-center text-3xl">
                  {option.icon}
                </div>
                <h3 className="mb-1 text-center text-base font-semibold text-gray-900">
                  {option.name}
                </h3>
                <p className="m-0 text-center text-sm text-gray-600">
                  {option.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Styling Options */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
              <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.098 19.902a3.75 3.75 0 005.304 0l6.401-6.402M6.75 21A3.75 3.75 0 013 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 003.75-3.75V8.197M6.75 21h13.125c.621 0 1.125-.504 1.125-1.125v-5.25c0-.621-.504-1.125-1.125-1.125h-4.072M10.5 8.197l2.88-2.88c.438-.439 1.15-.439 1.59 0l3.712 3.713c.44.44.44 1.152 0 1.59l-2.879 2.88M6.75 17.25h.008v.008H6.75v-.008z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Styling Options</h2>
              <p className="text-sm text-gray-600">Customize colors and dimensions</p>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Background Color
              </label>
              <input
                type="color"
                value={config.bgColor || '#ffffff'}
                onChange={(e) => updateConfig({ bgColor: e.target.value })}
                className="mt-2 h-11 w-24 cursor-pointer rounded-lg border border-gray-300"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Maximum Width
              </label>
              <p className="mt-1 text-xs text-gray-500">Maximum width of the content area</p>
              <input
                type="text"
                className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                value={config.maxWidth || ''}
                onChange={(e) => updateConfig({ maxWidth: e.target.value })}
                placeholder="1200px"
              />
            </div>
          </div>
        </div>

        {/* Typography & Buttons */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
              <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Typography & Buttons</h2>
              <p className="text-sm text-gray-600">Customize text styles and button appearance</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Custom Typography & Styles</label>
                <p className="text-xs text-gray-500">Override global CSS with custom styling options</p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={sectionStyle.is_custom || false}
                  onChange={(e) => setSectionStyle((prev) => ({ ...prev, is_custom: e.target.checked }))}
                  className="peer sr-only"
                />
                <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-purple-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-500 peer-focus:ring-offset-2"></div>
              </label>
            </div>

            {!sectionStyle.is_custom ? (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                <div className="flex items-start gap-3">
                  <svg className="h-5 w-5 shrink-0 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                  </svg>
                  <div>
                    <h4 className="text-sm font-medium text-blue-900">Using Global Styles</h4>
                    <p className="mt-1 text-xs text-blue-700">
                      This section is currently using the global CSS styles defined in your theme settings.
                      Enable custom typography above to override these styles with section-specific options.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <SectionTypographyControls
                  value={sectionStyle}
                  onChange={(updates) =>
                    setSectionStyle((prev) => ({ ...prev, ...updates }))
                  }
                />
              </div>
            )}
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end gap-3 border-t border-gray-200 pt-6">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:from-purple-700 hover:to-purple-800 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? (
              <>
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16v2a2 2 0 01-2 2H5a2 2 0 01-2-2v-7a2 2 0 012-2h2m3-4H5a2 2 0 00-2 2v7a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Save Location Settings
              </>
            )}
          </button>
        </div>
      </form>

      {/* Preview Modal */}
      {showPreviewModal && placeDetails && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowPreviewModal(false)}
        >
          <div
            className="relative w-full max-w-6xl max-h-[90vh] overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-200 bg-gradient-to-r from-purple-50 to-white p-6">
              <h2 className="text-xl font-bold text-gray-900">
                Layout Preview: {layoutOptions.find(opt => opt.value === config.layout)?.name}
              </h2>
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="overflow-auto p-0" style={{ maxHeight: 'calc(90vh - 180px)' }}>
              <div style={{
                backgroundColor: config.bgColor || '#ffffff',
                color: config.textColor || '#000000',
                minHeight: '500px',
                padding: '3rem 2rem',
              }}>
                <LocationLayoutPreview
                  layout={config.layout || 'default'}
                  placeDetails={placeDetails}
                  title={config.title || 'Our Location'}
                  description={config.description || 'Visit us at our location'}
                  textColor={config.textColor || '#000000'}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-gray-200 bg-gray-50 p-6">
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:from-purple-700 hover:to-purple-800 hover:shadow-xl"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {showToast && (
        <Toast
          message={toastMessage}
          type={toastType}
          onClose={() => setShowToast(false)}
        />
      )}
    </>
  );
}

// Static Map Preview Component for Layout Previews
function SimpleMapPreview({ lat, lng, name }: { lat: number; lng: number; name: string }) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  
  // Check if we have valid coordinates
  if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
    return (
      <div style={{
        width: '100%',
        height: '100%',
        minHeight: '200px',
        backgroundColor: '#e8e8e8',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{ textAlign: 'center', opacity: 0.6 }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🗺️</div>
          <p style={{ fontSize: '0.875rem', color: '#666' }}>Map Preview</p>
          <p style={{ fontSize: '0.75rem', color: '#999' }}>Invalid coordinates</p>
        </div>
      </div>
    );
  }

  // If no API key, show placeholder
  if (!apiKey) {
    return (
      <div style={{
        width: '100%',
        height: '100%',
        minHeight: '200px',
        backgroundColor: '#e8e8e8',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{ textAlign: 'center', opacity: 0.6 }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🗺️</div>
          <p style={{ fontSize: '0.875rem', color: '#666' }}>Map Preview</p>
          <p style={{ fontSize: '0.75rem', color: '#999' }}>
            {name} - Lat: {lat.toFixed(4)}, Lng: {lng.toFixed(4)}
          </p>
        </div>
      </div>
    );
  }

  // Use Google Static Maps API for preview (no DOM conflicts)
  const staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?` +
    `center=${lat},${lng}&` +
    `zoom=15&` +
    `size=600x400&` +
    `markers=color:red%7C${lat},${lng}&` +
    `key=${apiKey}&` +
    `style=feature:poi|visibility:off&` +
    `style=feature:transit|visibility:off`;

  return (
    <div style={{
      width: '100%',
      height: '100%',
      minHeight: '200px',
      backgroundColor: '#e8e8e8',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <img
        src={staticMapUrl}
        alt={`Map showing ${name}`}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block',
        }}
        onError={(e) => {
          // Fallback if static map fails to load
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
          const parent = target.parentElement;
          if (parent) {
            parent.innerHTML = `
              <div style="
                width: 100%;
                height: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
                text-align: center;
              ">
                <div style="opacity: 0.6;">
                  <div style="font-size: 2rem; margin-bottom: 0.5rem;">🗺️</div>
                  <p style="font-size: 0.875rem; color: #666; margin: 0;">Map Preview</p>
                  <p style="font-size: 0.75rem; color: #999; margin: 0.25rem 0 0 0;">
                    ${name} - Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}
                  </p>
                </div>
              </div>
            `;
          }
        }}
      />
    </div>
  );
}

// Layout Preview Component
function LocationLayoutPreview({
  layout,
  placeDetails,
  title,
  description,
  textColor,
}: {
  layout: string;
  placeDetails: PlaceDetails;
  title: string;
  description: string;
  textColor: string;
}) {
  const lat = typeof placeDetails.geometry.location.lat === 'function'
    ? placeDetails.geometry.location.lat()
    : placeDetails.geometry.location.lat;
  const lng = typeof placeDetails.geometry.location.lng === 'function'
    ? placeDetails.geometry.location.lng()
    : placeDetails.geometry.location.lng;

  // Default Layout
  if (layout === 'default') {
    return (
      <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '1rem', color: textColor }}>
          {title}
        </h2>
        <p style={{ fontSize: '1.125rem', marginBottom: '2rem', opacity: 0.8 }}>
          {description}
        </p>
        <div style={{
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          padding: '2rem',
          textAlign: 'left',
        }}>
          <h3 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1rem' }}>
            {placeDetails.name}
          </h3>
          <p style={{ marginBottom: '0.5rem', opacity: 0.9 }}>
            📍 {placeDetails.formatted_address}
          </p>
          {placeDetails.formatted_phone_number && (
            <p style={{ marginBottom: '0.5rem', opacity: 0.9 }}>
              📞 {placeDetails.formatted_phone_number}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Grid Layout
  if (layout === 'grid') {
    return (
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <h2 style={{ fontSize: '2.5rem', fontWeight: '700', marginBottom: '1rem', textAlign: 'center', color: textColor }}>
          {title}
        </h2>
        <p style={{ fontSize: '1.125rem', marginBottom: '3rem', textAlign: 'center', opacity: 0.8 }}>
          {description}
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', alignItems: 'start' }}>
          <div style={{
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            padding: '2rem',
          }}>
            <h3 style={{ fontSize: '1.75rem', fontWeight: '600', marginBottom: '1.5rem' }}>
              {placeDetails.name}
            </h3>
            <div style={{ display: 'grid', gap: '1rem' }}>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'start' }}>
                <span style={{ fontSize: '1.25rem' }}>📍</span>
                <span>{placeDetails.formatted_address}</span>
              </div>
              {placeDetails.formatted_phone_number && (
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <span style={{ fontSize: '1.25rem' }}>📞</span>
                  <span>{placeDetails.formatted_phone_number}</span>
                </div>
              )}
              {placeDetails.website && (
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <span style={{ fontSize: '1.25rem' }}>🌐</span>
                  <a href={placeDetails.website} style={{ color: 'inherit', textDecoration: 'underline' }}>Visit Website</a>
                </div>
              )}
              {placeDetails.opening_hours?.weekday_text && (
                <div style={{ marginTop: '1rem' }}>
                  <div style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                    🕒 Hours:
                  </div>
                  <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>
                    {placeDetails.opening_hours.weekday_text.slice(0, 3).map((text, i) => (
                      <div key={i}>{text}</div>
                    ))}
                    {placeDetails.opening_hours.weekday_text.length > 3 && (
                      <div style={{ fontStyle: 'italic', marginTop: '0.25rem' }}>
                        + {placeDetails.opening_hours.weekday_text.length - 3} more days
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
          <div style={{
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            padding: '1rem',
            height: '400px',
            overflow: 'hidden',
          }}>
            <SimpleMapPreview lat={lat} lng={lng} name={placeDetails.name} />
          </div>
        </div>
      </div>
    );
  }

  // List Layout
  if (layout === 'list') {
    return (
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <h2 style={{ fontSize: '2.5rem', fontWeight: '700', marginBottom: '1rem', color: textColor }}>
          {title}
        </h2>
        <p style={{ fontSize: '1.125rem', marginBottom: '3rem', opacity: 0.8 }}>
          {description}
        </p>
        <div style={{
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          padding: '2rem',
        }}>
          <h3 style={{ fontSize: '2rem', fontWeight: '600', marginBottom: '1.5rem' }}>
            {placeDetails.name}
          </h3>
          <div style={{ display: 'grid', gap: '1.5rem' }}>
            <div>
              <div style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.5rem', opacity: 0.7 }}>
                Address
              </div>
              <div style={{ fontSize: '1.125rem' }}>
                📍 {placeDetails.formatted_address}
              </div>
            </div>
            {placeDetails.formatted_phone_number && (
              <div>
                <div style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.5rem', opacity: 0.7 }}>
                  Phone
                </div>
                <div style={{ fontSize: '1.125rem' }}>
                  📞 {placeDetails.formatted_phone_number}
                </div>
              </div>
            )}
            {placeDetails.opening_hours?.weekday_text && (
              <div>
                <div style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.5rem', opacity: 0.7 }}>
                  Hours
                </div>
                <div style={{ fontSize: '0.9375rem', lineHeight: '1.6', opacity: 0.9 }}>
                  {placeDetails.opening_hours.weekday_text.map((text, i) => (
                    <div key={i}>🕒 {text}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Cards Layout
  if (layout === 'cards') {
    return (
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <h2 style={{ fontSize: '2.5rem', fontWeight: '700', marginBottom: '1rem', textAlign: 'center', color: textColor }}>
          {title}
        </h2>
        <p style={{ fontSize: '1.125rem', marginBottom: '3rem', textAlign: 'center', opacity: 0.8 }}>
          {description}
        </p>
        <div style={{
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          padding: '3rem',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        }}>
          <h3 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '2rem', textAlign: 'center' }}>
            {placeDetails.name}
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
            <div style={{
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              padding: '1.5rem',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📍</div>
              <div style={{ fontWeight: '600', marginBottom: '0.5rem' }}>Address</div>
              <div style={{ fontSize: '0.9375rem', opacity: 0.8 }}>{placeDetails.formatted_address}</div>
            </div>
            {placeDetails.formatted_phone_number && (
              <div style={{
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                padding: '1.5rem',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📞</div>
                <div style={{ fontWeight: '600', marginBottom: '0.5rem' }}>Phone</div>
                <div style={{ fontSize: '0.9375rem', opacity: 0.8 }}>{placeDetails.formatted_phone_number}</div>
              </div>
            )}
            {placeDetails.website && (
              <div style={{
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                padding: '1.5rem',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🌐</div>
                <div style={{ fontWeight: '600', marginBottom: '0.5rem' }}>Website</div>
                <div style={{ fontSize: '0.9375rem', opacity: 0.8 }}>
                  <a href={placeDetails.website} style={{ color: 'inherit', textDecoration: 'underline' }}>Visit Site</a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Map Layout
  if (layout === 'map') {
    return (
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <h2 style={{ fontSize: '2.5rem', fontWeight: '700', marginBottom: '1rem', textAlign: 'center', color: textColor }}>
          {title}
        </h2>
        <p style={{ fontSize: '1.125rem', marginBottom: '3rem', textAlign: 'center', opacity: 0.8 }}>
          {description}
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
          <div style={{
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            padding: '2rem',
          }}>
            <h3 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1.5rem' }}>
              {placeDetails.name}
            </h3>
            <div style={{ display: 'grid', gap: '1rem', fontSize: '0.9375rem' }}>
              <div>
                <strong>📍 Address:</strong>
                <div style={{ marginTop: '0.25rem', opacity: 0.9 }}>{placeDetails.formatted_address}</div>
              </div>
              {placeDetails.formatted_phone_number && (
                <div>
                  <strong>📞 Phone:</strong>
                  <div style={{ marginTop: '0.25rem', opacity: 0.9 }}>{placeDetails.formatted_phone_number}</div>
                </div>
              )}
              {placeDetails.opening_hours?.weekday_text && (
                <div>
                  <strong>🕒 Hours:</strong>
                  <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', opacity: 0.8 }}>
                    {placeDetails.opening_hours.weekday_text.slice(0, 2).map((text, i) => (
                      <div key={i}>{text}</div>
                    ))}
                    <div style={{ fontStyle: 'italic', marginTop: '0.5rem' }}>
                      View full hours on map
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div style={{
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            padding: '1rem',
            height: '500px',
            overflow: 'hidden',
          }}>
            <SimpleMapPreview lat={lat} lng={lng} name={placeDetails.name} />
          </div>
        </div>
      </div>
    );
  }

  // Compact Layout - Minimal card with left info and right map
  if (layout === 'compact') {
    return (
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '2rem', textAlign: 'center', color: textColor }}>
          {title}
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '1.5rem', alignItems: 'stretch' }}>
          {/* Info Card */}
          <div style={{
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            border: '1px solid rgba(0, 0, 0, 0.1)',
            borderRadius: '8px',
            padding: '2rem',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
          }}>
            <h3 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.25rem', color: '#1a1a1a' }}>
              {placeDetails.name}
            </h3>
            <p style={{ fontSize: '0.75rem', color: '#666', marginBottom: '1.5rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {description}
            </p>
            <div style={{ display: 'grid', gap: '1rem', fontSize: '0.875rem', color: '#333' }}>
              <div>
                <div style={{ fontWeight: '600', marginBottom: '0.25rem', fontSize: '0.75rem', color: '#999' }}>INFORMATION</div>
                <div>📍 {placeDetails.formatted_address}</div>
              </div>
              {placeDetails.formatted_phone_number && (
                <div>📞 {placeDetails.formatted_phone_number}</div>
              )}
              {placeDetails.opening_hours?.weekday_text && (
                <div>
                  <div style={{ fontWeight: '600', marginBottom: '0.5rem', fontSize: '0.75rem', color: '#999' }}>HOURS</div>
                  {placeDetails.opening_hours.weekday_text.slice(0, 3).map((text, i) => (
                    <div key={i} style={{ fontSize: '0.8125rem', lineHeight: '1.6' }}>{text}</div>
                  ))}
                </div>
              )}
              <button style={{
                marginTop: '1rem',
                padding: '0.75rem 1.5rem',
                backgroundColor: '#8b0000',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontWeight: '600',
                cursor: 'pointer',
              }}>
                GET DIRECTIONS
              </button>
            </div>
          </div>

          {/* Map */}
          <div style={{
            backgroundColor: '#e8e8e8',
            borderRadius: '8px',
            overflow: 'hidden',
            position: 'relative',
            minHeight: '400px',
          }}>
            <SimpleMapPreview lat={lat} lng={lng} name={placeDetails.name} />
          </div>
        </div>
      </div>
    );
  }

  // Sidebar Layout - Vertical list of locations with map emphasis
  if (layout === 'sidebar') {
    return (
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <h2 style={{ fontSize: '2.5rem', fontWeight: '700', marginBottom: '0.5rem', textAlign: 'center', color: textColor }}>
          {title}
        </h2>
        <p style={{ fontSize: '1rem', marginBottom: '3rem', textAlign: 'center', opacity: 0.7 }}>
          {description}
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr', gap: '0', border: '1px solid rgba(0, 0, 0, 0.1)', borderRadius: '12px', overflow: 'hidden', backgroundColor: '#fff' }}>
          {/* Sidebar with location list */}
          <div style={{
            backgroundColor: '#f8f9fa',
            padding: '2rem',
            borderRight: '1px solid rgba(0, 0, 0, 0.1)',
            overflowY: 'auto',
            maxHeight: '600px',
          }}>
            <div style={{
              backgroundColor: '#fff',
              borderRadius: '8px',
              padding: '1.5rem',
              marginBottom: '1rem',
              border: '2px solid #dc3545',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
            }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: '700', marginBottom: '0.75rem', color: '#1a1a1a' }}>
                {placeDetails.name}
              </h3>
              <div style={{ fontSize: '0.875rem', color: '#666', lineHeight: '1.6' }}>
                <div style={{ marginBottom: '0.5rem' }}>
                  <strong>📍</strong> {placeDetails.formatted_address}
                </div>
                {placeDetails.formatted_phone_number && (
                  <div style={{ marginBottom: '0.5rem' }}>
                    <strong>📞</strong> {placeDetails.formatted_phone_number}
                  </div>
                )}
                {placeDetails.opening_hours?.weekday_text && (
                  <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #e5e7eb' }}>
                    <div style={{ fontWeight: '600', marginBottom: '0.5rem', color: '#1a1a1a' }}>Hours:</div>
                    {placeDetails.opening_hours.weekday_text.slice(0, 2).map((text, i) => (
                      <div key={i} style={{ fontSize: '0.8125rem' }}>{text}</div>
                    ))}
                  </div>
                )}
                <button style={{
                  marginTop: '1rem',
                  width: '100%',
                  padding: '0.625rem',
                  backgroundColor: '#8b0000',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}>
                  SELECT LOCATION
                </button>
              </div>
            </div>
          </div>

          {/* Map area */}
          <div style={{
            backgroundColor: '#e8e8e8',
            minHeight: '600px',
            position: 'relative',
          }}>
            <SimpleMapPreview lat={lat} lng={lng} name={placeDetails.name} />
          </div>
        </div>
      </div>
    );
  }

  // Fullscreen Layout - Dark immersive map with minimal UI
  if (layout === 'fullscreen') {
    return (
      <div style={{ margin: '-3rem -2rem', minHeight: '700px', position: 'relative' }}>
        {/* Full-bleed map background */}
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: '#1a2332',
          backgroundImage: 'radial-gradient(circle at 20% 30%, rgba(255, 107, 107, 0.1), transparent 50%), radial-gradient(circle at 80% 70%, rgba(107, 148, 255, 0.1), transparent 50%)',
        }}>
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: 0.3,
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '6rem', marginBottom: '1rem' }}>🗺️</div>
              <p style={{ fontSize: '1.5rem', color: '#fff' }}>Full-Screen Map Experience</p>
              <p style={{ fontSize: '1rem', marginTop: '0.5rem', color: 'rgba(255, 255, 255, 0.7)' }}>
                Location: {lat.toFixed(4)}, {lng.toFixed(4)}
              </p>
            </div>
          </div>
        </div>

        {/* Floating location card */}
        <div style={{
          position: 'relative',
          padding: '3rem 2rem',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '700px',
        }}>
          <div style={{
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            borderRadius: '16px',
            padding: '2.5rem',
            maxWidth: '500px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
          }}>
            <h2 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '0.5rem', color: '#1a1a1a' }}>
              {title}
            </h2>
            <p style={{ fontSize: '0.9375rem', marginBottom: '2rem', color: '#666' }}>
              {description}
            </p>
            <h3 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '1.5rem', color: '#1a1a1a' }}>
              {placeDetails.name}
            </h3>
            <div style={{ display: 'grid', gap: '1rem', fontSize: '0.9375rem', color: '#333' }}>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'start' }}>
                <span style={{ fontSize: '1.25rem' }}>📍</span>
                <span>{placeDetails.formatted_address}</span>
              </div>
              {placeDetails.formatted_phone_number && (
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <span style={{ fontSize: '1.25rem' }}>📞</span>
                  <span>{placeDetails.formatted_phone_number}</span>
                </div>
              )}
            </div>
            <button style={{
              marginTop: '2rem',
              width: '100%',
              padding: '1rem',
              backgroundColor: '#8b0000',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(139, 0, 0, 0.3)',
            }}>
              GET DIRECTIONS
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
