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
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import Toast from '@/components/ui/toast';
import type { LocationConfig } from '@/types/location.types';
import { DEFAULT_LOCATION_CONFIG } from '@/types/location.types';
import { useSectionStyleDefaults } from '@/hooks/use-section-style-defaults';
import { SectionTypographyControls } from '@/components/admin/section-typography-controls';
import {
  SECTION_STYLE_KEYS,
  type SectionStyleConfig,
} from '@/types/section-style.types';

// Dynamically import Google Location Picker to avoid SSR issues
const GoogleLocationPicker = dynamic(() => import('./google-location-picker'), {
  ssr: false,
});
const DynamicLocationPreview = dynamic(() => import('../dynamic-location'), {
  ssr: false,
});

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

type PreviewViewport = 'desktop' | 'mobile';

const GLOBAL_TYPOGRAPHY_KEYS = [
  'buttonStyleVariant',
  'titleFontFamily',
  'titleFontSize',
  'titleMobileFontSize',
  'titleMobileFontFamily',
  'titleFontWeight',
  'titleMobileFontWeight',
  'titleFontStyle',
  'titleMobileFontStyle',
  'titleColor',
  'titleMobileColor',
  'titleTextTransform',
  'titleMobileTextTransform',
  'titleLineHeight',
  'titleMobileLineHeight',
  'titleLetterSpacing',
  'titleMobileLetterSpacing',
  'subtitleFontFamily',
  'subtitleFontSize',
  'subtitleMobileFontSize',
  'subtitleMobileFontFamily',
  'subtitleFontWeight',
  'subtitleMobileFontWeight',
  'subtitleFontStyle',
  'subtitleMobileFontStyle',
  'subtitleColor',
  'subtitleMobileColor',
  'subtitleTextTransform',
  'subtitleMobileTextTransform',
  'subtitleLineHeight',
  'subtitleMobileLineHeight',
  'subtitleLetterSpacing',
  'subtitleMobileLetterSpacing',
  'bodyFontFamily',
  'bodyFontSize',
  'bodyMobileFontSize',
  'bodyMobileFontFamily',
  'bodyFontWeight',
  'bodyMobileFontWeight',
  'bodyFontStyle',
  'bodyMobileFontStyle',
  'bodyColor',
  'bodyMobileColor',
  'bodyTextTransform',
  'bodyMobileTextTransform',
  'bodyLineHeight',
  'bodyMobileLineHeight',
  'bodyLetterSpacing',
  'bodyMobileLetterSpacing',
] as const satisfies ReadonlyArray<keyof SectionStyleConfig>;

function buildGlobalTypographyConfig(
  defaults: SectionStyleConfig,
): Partial<SectionStyleConfig> {
  const nextConfig: Partial<SectionStyleConfig> = {};

  for (const key of GLOBAL_TYPOGRAPHY_KEYS) {
    nextConfig[key] = defaults[key];
  }

  return nextConfig;
}

function buildSectionStyleConfig(
  source: Record<string, unknown>,
  defaults: SectionStyleConfig,
): SectionStyleConfig {
  const nextConfig: SectionStyleConfig = {
    ...defaults,
    is_custom: Boolean(source.is_custom),
    buttonStyleVariant:
      (source.buttonStyleVariant as SectionStyleConfig['buttonStyleVariant']) ??
      defaults.buttonStyleVariant ??
      'primary',
  };

  for (const key of SECTION_STYLE_KEYS) {
    const value = source[key];
    if (value !== undefined) {
      (nextConfig as Record<string, unknown>)[key] = value;
    }
  }

  nextConfig.subtitleFontFamily =
    (source.subtitleFontFamily as string | undefined) ??
    (source.descriptionFontFamily as string | undefined) ??
    nextConfig.subtitleFontFamily;
  nextConfig.subtitleFontSize =
    (source.subtitleFontSize as string | undefined) ??
    (source.descriptionFontSize as string | undefined) ??
    nextConfig.subtitleFontSize;
  nextConfig.subtitleFontWeight =
    (source.subtitleFontWeight as number | undefined) ??
    (source.descriptionFontWeight as number | undefined) ??
    nextConfig.subtitleFontWeight;
  nextConfig.subtitleColor =
    (source.subtitleColor as string | undefined) ??
    (source.descriptionColor as string | undefined) ??
    nextConfig.subtitleColor;

  if (!nextConfig.is_custom) {
    return {
      ...defaults,
      ...buildGlobalTypographyConfig(defaults),
      is_custom: false,
      buttonStyleVariant: nextConfig.buttonStyleVariant,
    };
  }

  return nextConfig;
}

export default function LocationSettingsForm({
  restaurantId,
  pageId,
  templateId,
  isNewSection = false,
}: LocationSettingsFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sectionStyleDefaults = useSectionStyleDefaults(restaurantId);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<LocationConfig>({
    ...DEFAULT_LOCATION_CONFIG,
    ...sectionStyleDefaults,
  });
  const [sectionStyle, setSectionStyle] = useState<SectionStyleConfig>({
    ...buildGlobalTypographyConfig(sectionStyleDefaults),
    is_custom: false,
    buttonStyleVariant: sectionStyleDefaults.buttonStyleVariant ?? 'primary',
  });
  const [placeDetails, setPlaceDetails] = useState<PlaceDetails | null>(null);
  const [googlePlaceId, setGooglePlaceId] = useState<string>('');
  const [loadingPlace, setLoadingPlace] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewViewport, setPreviewViewport] =
    useState<PreviewViewport>('desktop');

  // Toast state
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  // Layout options with descriptions
  const layoutOptions = [
    {
      value: 'default',
      name: 'Default',
      description: 'Simple location display',
      icon: '📄',
    },
    {
      value: 'grid',
      name: 'Grid',
      description: 'Grid layout with details',
      icon: '⊞',
    },
    {
      value: 'list',
      name: 'List',
      description: 'Detailed list view',
      icon: '☰',
    },
    {
      value: 'cards',
      name: 'Cards',
      description: 'Card-based layout',
      icon: '🗃️',
    },
    {
      value: 'map',
      name: 'Map View',
      description: 'Interactive map',
      icon: '🗺️',
    },
    {
      value: 'compact',
      name: 'Compact',
      description: 'Minimal card view',
      icon: '📋',
    },
    {
      value: 'sidebar',
      name: 'Sidebar',
      description: 'Sidebar with map focus',
      icon: '⊟',
    },
    {
      value: 'fullscreen',
      name: 'Fullscreen',
      description: 'Full-width immersive',
      icon: '🖼️',
    },
  ];

  const layoutSupportText: Record<string, string> = {
    default: 'Balanced address-first presentation',
    grid: 'Best for clean map and info balance',
    list: 'Great for long-form location details',
    cards: 'Modular highlights with more breathing room',
    map: 'Map-first experience with supporting info',
    compact: 'Tight footprint for denser pages',
    sidebar: 'Strong for multi-column page composition',
    fullscreen: 'Best for bold destination-style sections',
  };

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  // Render layout preview artwork with address, map, and hours
  const renderLocationLayoutPreview = (layoutValue: string, active = false) => {
    const frameStyle = {
      position: 'relative' as const,
      height: '130px',
      borderRadius: '18px',
      overflow: 'hidden',
      border: active
        ? '1px solid rgba(167, 139, 250, 0.55)'
        : '1px solid #dbe3ec',
      background: active
        ? 'linear-gradient(180deg, #ffffff 0%, #faf5ff 100%)'
        : 'linear-gradient(180deg, #fdfefe 0%, #f7f9fc 100%)',
      boxShadow: active
        ? '0 18px 36px rgba(124, 58, 237, 0.14)'
        : '0 12px 26px rgba(15, 23, 42, 0.07)',
    };

    const boardStyle = {
      position: 'absolute' as const,
      inset: '44px 10px 10px',
      overflow: 'hidden',
      borderRadius: '12px',
      background: active ? '#f8f5ff' : '#f3f6f8',
      border: active ? '1px solid #eadcff' : '1px solid #edf2f6',
      padding: '8px',
    };

    const chrome = (
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '18px',
          borderBottom: '1px solid #e5e9f0',
          background: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          padding: '0 8px',
          gap: '4px',
        }}
      >
        <div
          style={{
            width: '4px',
            height: '4px',
            borderRadius: '50%',
            background: '#ef4444',
          }}
        />
        <div
          style={{
            width: '4px',
            height: '4px',
            borderRadius: '50%',
            background: '#f59e0b',
          }}
        />
        <div
          style={{
            width: '4px',
            height: '4px',
            borderRadius: '50%',
            background: '#10b981',
          }}
        />
      </div>
    );

    // Address bar (darker gray) - represents address text
    const addressBox = (width = '100%', height = '10px') => (
      <div
        style={{
          background: active ? '#7c3aed' : '#9ca3af',
          borderRadius: '999px',
          width,
          height,
          opacity: active ? 0.72 : 1,
        }}
      />
    );

    // Map area (green gradient with pin)
    const mapBox = (height = '100%') => (
      <div
        style={{
          background: 'linear-gradient(135deg, #a7f3d0 0%, #6ee7b7 100%)',
          borderRadius: '6px',
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '16px',
        }}
      >
        📍
      </div>
    );

    // Hours/info box (lighter gray) - represents opening hours
    const hoursBox = (width = '100%', height = '8px') => (
      <div
        style={{
          background: active ? '#d8b4fe' : '#d1d5db',
          borderRadius: '999px',
          width,
          height,
          opacity: active ? 0.84 : 1,
        }}
      />
    );

    switch (layoutValue) {
      case 'default':
        return (
          <div style={frameStyle}>
            {chrome}
            <div style={boardStyle}>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '5px',
                  height: '100%',
                }}
              >
                {addressBox('90%', '12px')}
                {mapBox('45px')}
                {hoursBox('70%', '8px')}
              </div>
            </div>
          </div>
        );

      case 'grid':
        return (
          <div style={frameStyle}>
            {chrome}
            <div style={boardStyle}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '6px',
                  height: '100%',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    padding: '4px',
                  }}
                >
                  {addressBox('100%', '8px')}
                  {hoursBox('80%', '6px')}
                  {hoursBox('70%', '6px')}
                </div>
                {mapBox()}
              </div>
            </div>
          </div>
        );

      case 'list':
        return (
          <div style={frameStyle}>
            {chrome}
            <div style={boardStyle}>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '5px',
                  height: '100%',
                }}
              >
                {addressBox('100%', '10px')}
                <div style={{ flex: 1, minHeight: 0 }}>{mapBox()}</div>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '3px',
                  }}
                >
                  {hoursBox('80%', '6px')}
                  {hoursBox('70%', '6px')}
                </div>
              </div>
            </div>
          </div>
        );

      case 'cards':
        return (
          <div style={frameStyle}>
            {chrome}
            <div style={boardStyle}>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  height: '100%',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  {addressBox('52%', '8px')}
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '6px',
                    flex: 1,
                  }}
                >
                  {[0, 1, 2].map((index) => (
                    <div
                      key={index}
                      style={{
                        background: '#ffffff',
                        borderRadius: '8px',
                        border: active
                          ? '1px solid #e9d5ff'
                          : '1px solid #e5e7eb',
                        padding: '6px 5px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <div
                        style={{
                          width: '22px',
                          height: '22px',
                          borderRadius: '7px',
                          background: index === 0 ? '#d1fae5' : '#ede9fe',
                        }}
                      />
                      {addressBox(index === 0 ? '85%' : '72%', '5px')}
                      {hoursBox(index === 2 ? '88%' : '68%', '4px')}
                      {hoursBox(index === 1 ? '78%' : '60%', '4px')}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case 'map':
        return (
          <div style={frameStyle}>
            {chrome}
            <div style={boardStyle}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '0.92fr 1.18fr',
                  gap: '6px',
                  height: '100%',
                }}
              >
                <div
                  style={{
                    background: '#ffffff',
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                    padding: '6px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                  }}
                >
                  {addressBox('92%', '7px')}
                  {hoursBox('72%', '5px')}
                  {hoursBox('88%', '5px')}
                  <div
                    style={{
                      marginTop: 'auto',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '3px',
                    }}
                  >
                    {hoursBox('68%', '4px')}
                    {hoursBox('54%', '4px')}
                  </div>
                </div>
                {mapBox()}
              </div>
            </div>
          </div>
        );

      case 'compact':
        return (
          <div style={frameStyle}>
            {chrome}
            <div style={boardStyle}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '0.95fr 1.05fr',
                  gap: '6px',
                  height: '100%',
                }}
              >
                <div
                  style={{
                    background: '#ffffff',
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                    padding: '6px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                  }}
                >
                  {addressBox('72%', '7px')}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '3px',
                      marginTop: '2px',
                    }}
                  >
                    {hoursBox('90%', '4px')}
                    {hoursBox('82%', '4px')}
                    {hoursBox('64%', '4px')}
                  </div>
                  <div style={{ marginTop: 'auto' }}>
                    {hoursBox('56%', '6px')}
                  </div>
                </div>
                {mapBox()}
              </div>
            </div>
          </div>
        );

      case 'sidebar':
        return (
          <div style={frameStyle}>
            {chrome}
            <div style={boardStyle}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1.8fr',
                  gap: '6px',
                  height: '100%',
                }}
              >
                <div
                  style={{
                    background: '#f8fafc',
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                    padding: '5px',
                  }}
                >
                  <div
                    style={{
                      background: '#ffffff',
                      borderRadius: '6px',
                      border: active
                        ? '1px solid #d8b4fe'
                        : '1px solid #e5e7eb',
                      padding: '5px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      height: '100%',
                    }}
                  >
                    {addressBox('90%', '6px')}
                    {hoursBox('72%', '5px')}
                    {hoursBox('84%', '5px')}
                    <div style={{ marginTop: 'auto' }}>
                      {hoursBox('58%', '5px')}
                    </div>
                  </div>
                </div>
                {mapBox()}
              </div>
            </div>
          </div>
        );

      case 'fullscreen':
        return (
          <div style={frameStyle}>
            {chrome}
            <div style={boardStyle}>
              <div style={{ position: 'relative', height: '100%' }}>
                <div style={{ position: 'absolute', inset: 0 }}>{mapBox()}</div>
                <div
                  style={{
                    position: 'absolute',
                    inset: '14px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <div
                    style={{
                      width: '70%',
                      background: 'rgba(255, 255, 255, 0.92)',
                      borderRadius: '8px',
                      border: '1px solid rgba(255,255,255,0.7)',
                      boxShadow: '0 10px 24px rgba(15, 23, 42, 0.14)',
                      padding: '6px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    }}
                  >
                    {addressBox('74%', '6px')}
                    {hoursBox('92%', '5px')}
                    {hoursBox('68%', '5px')}
                    <div style={{ marginTop: '2px' }}>
                      {hoursBox('100%', '8px')}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
    }
  };

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

          setSectionStyle(
            buildSectionStyleConfig(
              data.data as Record<string, unknown>,
              sectionStyleDefaults,
            ),
          );

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

  useEffect(() => {
    setSectionStyle((previous) =>
      previous.is_custom
        ? {
            ...previous,
            buttonStyleVariant:
              previous.buttonStyleVariant ??
              sectionStyleDefaults.buttonStyleVariant ??
              'primary',
          }
        : {
            ...buildGlobalTypographyConfig(sectionStyleDefaults),
            is_custom: false,
            buttonStyleVariant:
              previous.buttonStyleVariant ??
              sectionStyleDefaults.buttonStyleVariant ??
              'primary',
          },
    );
  }, [sectionStyleDefaults]);

  // Fetch place details from Google Places API
  const fetchPlaceDetails = async (placeId: string) => {
    if (!apiKey) {
      console.error('Google Maps API key not configured');
      return;
    }

    // Check if Google Maps is already loaded
    if (
      typeof window !== 'undefined' &&
      window.google?.maps &&
      (window.google.maps as any).places
    ) {
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
        if (
          typeof window !== 'undefined' &&
          window.google?.maps &&
          (window.google.maps as any).places
        ) {
          clearInterval(checkGoogle);
          getPlaceDetails(placeId);
        }
      }, 100);
    }
  };

  const getPlaceDetails = (placeId: string) => {
    if (
      typeof window === 'undefined' ||
      !window.google?.maps ||
      !(window.google.maps as any).places
    ) {
      console.error('Google Maps not loaded');
      return;
    }

    setLoadingPlace(true);

    // Create a temporary div for PlacesService
    const mapDiv = document.createElement('div');
    const service = new (window.google.maps as any).places.PlacesService(
      mapDiv,
    );

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
      if (
        status ===
          (window.google?.maps as any)?.places?.PlacesServiceStatus?.OK &&
        place
      ) {
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
        window.setTimeout(() => {
          const params = new URLSearchParams();
          params.set('restaurant_id', restaurantId);

          const restaurantName = searchParams.get('restaurant_name');
          if (restaurantName) {
            params.set('restaurant_name', restaurantName);
          }

          if (pageId) {
            params.set('page_id', pageId);
          }

          router.replace(`/admin/page-settings?${params.toString()}`);
        }, 1200);
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
    setConfig((prev) => ({ ...prev, ...updates }));
  };

  const handleCustomTypographyToggle = (enabled: boolean) => {
    setSectionStyle((previous) =>
      enabled
        ? {
            ...previous,
            ...buildGlobalTypographyConfig(sectionStyleDefaults),
            is_custom: true,
            buttonStyleVariant:
              previous.buttonStyleVariant ??
              sectionStyleDefaults.buttonStyleVariant ??
              'primary',
          }
        : {
            ...previous,
            is_custom: false,
          },
    );
  };

  const activeLayout: NonNullable<LocationConfig['layout']> =
    config.layout || 'default';
  const activeLayoutOption =
    layoutOptions.find((option) => option.value === activeLayout) ??
    layoutOptions[0];
  const previewUsesLiveRenderer = true;
  const previewConfigData: Partial<LocationConfig> = {
    ...config,
    ...sectionStyle,
    enabled: true,
    google_place_id: googlePlaceId || config.google_place_id,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <svg
          className="h-8 w-8 animate-spin text-purple-600"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
        <span className="ml-2 text-gray-700">Loading location settings...</span>
      </div>
    );
  }

  // Show message if no Google Place ID is configured
  if (!googlePlaceId) {
    return (
      <div
        style={{
          padding: '3rem',
          backgroundColor: '#fff3cd',
          borderRadius: '12px',
          border: '2px solid #ffc107',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>⚠️</div>
        <h2
          style={{
            fontSize: '1.5rem',
            fontWeight: '600',
            marginBottom: '1rem',
            color: '#111827',
          }}
        >
          No Google Place ID Configured
        </h2>
        <p
          style={{
            fontSize: '1rem',
            color: '#6b7280',
            marginBottom: '1.5rem',
            maxWidth: '600px',
            margin: '0 auto 1.5rem',
          }}
        >
          This restaurant doesn't have a Google Place ID set. The location
          settings feature requires a Google Place ID to fetch and display
          location information.
        </p>
        <div
          style={{
            backgroundColor: '#fff',
            padding: '1.5rem',
            borderRadius: '8px',
            textAlign: 'left',
            maxWidth: '600px',
            margin: '0 auto',
          }}
        >
          <h3
            style={{
              fontSize: '1rem',
              fontWeight: '600',
              marginBottom: '1rem',
            }}
          >
            How to add a Google Place ID:
          </h3>
          <ol
            style={{
              paddingLeft: '1.5rem',
              color: '#6b7280',
              lineHeight: '1.8',
            }}
          >
            <li>
              Go to{' '}
              <a
                href="https://developers.google.com/maps/documentation/places/web-service/place-id"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#667eea' }}
              >
                Google Place ID Finder
              </a>
            </li>
            <li>Search for your restaurant location</li>
            <li>Copy the Place ID</li>
            <li>
              Update the restaurant record with the{' '}
              <code
                style={{
                  backgroundColor: '#f3f4f6',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '4px',
                }}
              >
                google_place_id
              </code>{' '}
              field
            </li>
          </ol>
        </div>
      </div>
    );
  }

  if (!apiKey) {
    return (
      <div
        style={{
          padding: '3rem',
          backgroundColor: '#fff3cd',
          borderRadius: '12px',
          border: '2px solid #ffc107',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>⚠️</div>
        <h2
          style={{
            fontSize: '1.5rem',
            fontWeight: '600',
            marginBottom: '1rem',
            color: '#111827',
          }}
        >
          Google Maps API Key Required
        </h2>
        <p
          style={{ fontSize: '1rem', color: '#6b7280', marginBottom: '1.5rem' }}
        >
          To use location features, add your Google Maps API key to the
          .env.local file:
        </p>
        <code
          style={{
            display: 'block',
            padding: '1rem',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            fontSize: '0.9rem',
            fontFamily: 'monospace',
            maxWidth: '600px',
            margin: '0 auto',
          }}
        >
          NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_api_key_here
        </code>
      </div>
    );
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6 pb-40">
        {/* Header */}
        <div className="mb-8 flex items-start">
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
                  d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Location Settings
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Configure how your restaurant location is displayed
              </p>
            </div>
          </div>
        </div>

        {/* Layout Selection */}
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
                  d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Layout Style
              </h2>
              <p className="text-sm text-gray-600">
                Choose how location is displayed
              </p>
            </div>
          </div>

          <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-slate-900">
                Selected Layout
              </p>
              <p className="text-xs text-slate-500">
                {activeLayoutOption.name}: {activeLayoutOption.description}
              </p>
            </div>
            <span className="inline-flex rounded-full border border-purple-200 bg-white px-3 py-1.5 text-xs font-semibold text-purple-700">
              Preview matches live output
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {layoutOptions.map((option) => {
              const isActive = activeLayout === option.value;

              return (
                <button
                  type="button"
                  key={option.value}
                  onClick={() =>
                    updateConfig({
                      layout: option.value as LocationConfig['layout'],
                    })
                  }
                  className={`group w-full rounded-2xl border p-3 text-left transition-all ${
                    isActive
                      ? 'border-purple-500 bg-purple-50 shadow-[0_20px_45px_rgba(124,58,237,0.12)]'
                      : 'border-slate-200 bg-white hover:-translate-y-0.5 hover:border-purple-300 hover:shadow-[0_18px_35px_rgba(15,23,42,0.08)]'
                  }`}
                  aria-pressed={isActive}
                >
                  <div className="mb-4">
                    {renderLocationLayoutPreview(option.value, isActive)}
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div
                        className={`text-sm font-semibold ${isActive ? 'text-purple-700' : 'text-slate-900'}`}
                      >
                        {option.name}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {option.description}
                      </div>
                    </div>
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        isActive
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {isActive ? 'Selected' : 'Layout'}
                    </span>
                  </div>
                  <div className="mt-3 rounded-2xl border border-slate-200/80 bg-white/75 px-3 py-2 text-xs text-slate-500">
                    {layoutSupportText[option.value]}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Display Settings */}
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
              <h2 className="text-lg font-semibold text-gray-900">
                Display Settings
              </h2>
              <p className="text-sm text-gray-600">
                Configure visibility and content
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700">
                  Enable Location Display
                </label>
                <p className="mt-1 text-xs text-gray-500">
                  Show location section on the page
                </p>
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
              <p className="mt-1 text-xs text-gray-500">
                Main heading for the location section
              </p>
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
                Subtitle
              </label>
              <p className="mt-1 text-xs text-gray-500">
                Optional subheading below the title
              </p>
              <input
                type="text"
                className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                value={config.subtitle || ''}
                onChange={(e) => updateConfig({ subtitle: e.target.value })}
                placeholder="Find us here"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <p className="mt-1 text-xs text-gray-500">
                Brief description for the location section
              </p>
              <textarea
                className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                value={config.description || ''}
                onChange={(e) => updateConfig({ description: e.target.value })}
                placeholder="Visit us at our location"
                rows={3}
              />
            </div>

            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <h3 className="mb-3 text-sm font-semibold text-gray-900">
                Display Components
              </h3>
              <p className="mb-4 text-xs text-gray-500">
                Choose which information to show
              </p>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Show Address
                    </label>
                    <p className="text-xs text-gray-500">
                      Display the location address
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.showAddress !== false}
                    onChange={(e) =>
                      updateConfig({ showAddress: e.target.checked })
                    }
                    className="h-5 w-5 rounded border-gray-300 text-purple-600 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Show Opening Hours
                    </label>
                    <p className="text-xs text-gray-500">
                      Display opening hours
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.showHours !== false}
                    onChange={(e) =>
                      updateConfig({ showHours: e.target.checked })
                    }
                    className="h-5 w-5 rounded border-gray-300 text-purple-600 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Show Map
                    </label>
                    <p className="text-xs text-gray-500">
                      Display interactive map
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.showMap !== false}
                    onChange={(e) =>
                      updateConfig({ showMap: e.target.checked })
                    }
                    className="h-5 w-5 rounded border-gray-300 text-purple-600 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Styling Options */}
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
              <h2 className="text-lg font-semibold text-gray-900">
                Styling Options
              </h2>
              <p className="text-sm text-gray-600">Customize section colors</p>
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
          </div>
        </div>

        {/* Typography & Buttons */}
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
              <h2 className="text-lg font-semibold text-gray-900">
                Typography & Buttons
              </h2>
              <p className="text-sm text-gray-600">
                Keep location typography aligned with the global theme by
                default, then opt into section-specific overrides only when
                needed.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Custom Typography & Styles
                  </label>
                  <p className="text-xs text-gray-500">
                    Override global CSS with section-specific styling only when
                    this location block needs it.
                  </p>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={sectionStyle.is_custom || false}
                    onChange={(e) =>
                      handleCustomTypographyToggle(e.target.checked)
                    }
                    className="peer sr-only"
                  />
                  <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-purple-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-500 peer-focus:ring-offset-2"></div>
                </label>
              </div>
            </div>

            {!sectionStyle.is_custom ? (
              <div>
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                  <div className="flex items-start gap-3">
                    <svg
                      className="h-5 w-5 shrink-0 text-blue-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
                      />
                    </svg>
                    <div>
                      <h4 className="text-sm font-medium text-blue-900">
                        Using Global Styles
                      </h4>
                      <p className="mt-1 text-xs text-blue-700">
                        This section and its preview are currently using the
                        global styles from your theme settings. Enable custom
                        typography above when you want location-specific
                        overrides.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="mb-4 rounded-lg border border-purple-100 bg-purple-50 px-4 py-3 text-xs text-purple-800">
                  Custom typography starts from your current global styles. Use
                  this only when the location section needs section-specific
                  text treatment.
                </div>
                <SectionTypographyControls
                  value={sectionStyle}
                  onChange={(updates) =>
                    setSectionStyle((prev) => ({ ...prev, ...updates }))
                  }
                  showAdvancedControls
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
                <svg
                  className="h-4 w-4 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Saving...
              </>
            ) : (
              <>
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
                    d="M17 16v2a2 2 0 01-2 2H5a2 2 0 01-2-2v-7a2 2 0 012-2h2m3-4H5a2 2 0 00-2 2v7a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
                Save Location Settings
              </>
            )}
          </button>
        </div>
      </form>

      {!showPreviewModal ? (
        <button
          type="button"
          onClick={() => {
            if (!placeDetails) return;
            setPreviewViewport('desktop');
            setShowPreviewModal(true);
          }}
          disabled={!placeDetails}
          title={
            placeDetails
              ? 'Open location preview'
              : 'Preview disabled until location details load'
          }
          className={`fixed bottom-24 right-4 z-40 inline-flex items-center gap-3 rounded-full px-5 py-3 text-sm font-semibold shadow-[0_18px_45px_rgba(15,23,42,0.18)] backdrop-blur transition-all sm:right-6 ${
            placeDetails
              ? 'border border-purple-200 bg-white/95 text-purple-700 hover:-translate-y-0.5 hover:border-purple-300 hover:bg-white'
              : 'cursor-not-allowed border border-slate-200 bg-white/90 text-slate-400'
          }`}
          aria-label="Open location preview"
        >
          <span
            className={`inline-flex h-10 w-10 items-center justify-center rounded-full shadow-sm ${
              placeDetails
                ? 'bg-gradient-to-br from-purple-600 to-purple-700 text-white'
                : 'bg-slate-200 text-slate-500'
            }`}
          >
            <svg
              className="h-5 w-5"
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
          </span>
          <span className="flex flex-col items-start leading-tight">
            <span>Live Preview</span>
            <span
              className={`text-xs font-medium ${placeDetails ? 'text-purple-500' : 'text-slate-400'}`}
            >
              {placeDetails
                ? `Preview the ${activeLayoutOption.name.toLowerCase()}`
                : 'Waiting for location data'}
            </span>
          </span>
        </button>
      ) : null}

      {showPreviewModal && placeDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
            onClick={() => setShowPreviewModal(false)}
          />
          <div className="relative z-10 flex h-[min(92vh,980px)] w-full max-w-7xl flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_35px_120px_rgba(15,23,42,0.35)]">
            <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Live Preview
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Switch between desktop and mobile to verify map placement,
                  spacing, and hierarchy for the {activeLayoutOption.name}{' '}
                  layout.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="inline-flex rounded-full bg-slate-100 p-1">
                  {(['desktop', 'mobile'] as PreviewViewport[]).map(
                    (viewport) => (
                      <button
                        key={viewport}
                        type="button"
                        onClick={() => setPreviewViewport(viewport)}
                        className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                          previewViewport === viewport
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        {viewport === 'desktop' ? 'Desktop' : 'Mobile'}
                      </button>
                    ),
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setShowPreviewModal(false)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                  aria-label="Close preview"
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-slate-950 p-4 sm:p-6">
              <div
                className={`mx-auto overflow-hidden border border-white/10 bg-slate-900 shadow-[0_24px_80px_rgba(15,23,42,0.35)] ${
                  previewViewport === 'mobile'
                    ? 'max-w-[430px] rounded-[32px]'
                    : 'max-w-[1240px] rounded-[32px]'
                }`}
              >
                <div className="flex items-center justify-between border-b border-white/10 bg-slate-950/90 px-4 py-3 text-xs uppercase tracking-[0.24em] text-slate-400">
                  <span>
                    {previewViewport === 'mobile'
                      ? 'Phone Preview'
                      : 'Desktop Preview'}
                  </span>
                  <span>
                    {previewViewport === 'mobile' ? '390 x 780' : '1280 x 720'}
                  </span>
                </div>
                <div className="bg-white">
                  {previewUsesLiveRenderer ? (
                    <DynamicLocationPreview
                      restaurantId={restaurantId}
                      pageId={pageId}
                      templateId={templateId}
                      configData={previewConfigData}
                      placeDetailsData={placeDetails}
                      previewViewport={previewViewport}
                    />
                  ) : (
                    <LocationFullPreview
                      layout={activeLayout}
                      placeDetails={placeDetails}
                      title={config.title || 'Our Location'}
                      subtitle={config.subtitle || ''}
                      description={
                        config.description || 'Visit us at our location'
                      }
                      textColor={config.textColor || '#000000'}
                      bgColor={config.bgColor || '#ffffff'}
                      maxWidth={config.maxWidth}
                      viewport={previewViewport}
                      showAddress={config.showAddress !== false}
                      showHours={config.showHours !== false}
                      showMap={config.showMap !== false}
                    />
                  )}
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200 bg-white/95 px-5 py-4 backdrop-blur-sm sm:px-6">
              <div className="flex flex-col gap-2 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <svg
                    className="h-5 w-5 text-purple-500"
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
                  Live preview reflects your current location content, layout,
                  and visibility settings.
                </div>
                <div className="text-xs uppercase tracking-[0.18em] text-slate-400">
                  {previewViewport === 'mobile'
                    ? 'Mobile responsiveness check'
                    : 'Desktop composition check'}
                </div>
              </div>
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

// Full Location Preview Component with Real Data
function LocationFullPreview({
  layout,
  placeDetails,
  title,
  subtitle,
  description,
  textColor,
  bgColor,
  maxWidth,
  viewport,
  showAddress,
  showHours,
  showMap,
}: {
  layout: string;
  placeDetails: PlaceDetails;
  title: string;
  subtitle: string;
  description: string;
  textColor: string;
  bgColor: string;
  maxWidth?: string;
  viewport: 'desktop' | 'mobile';
  showAddress: boolean;
  showHours: boolean;
  showMap: boolean;
}) {
  const lat =
    typeof placeDetails.geometry.location.lat === 'function'
      ? placeDetails.geometry.location.lat()
      : placeDetails.geometry.location.lat;
  const lng =
    typeof placeDetails.geometry.location.lng === 'function'
      ? placeDetails.geometry.location.lng()
      : placeDetails.geometry.location.lng;

  const isMobile = viewport === 'mobile';
  const contentMaxWidth = maxWidth || '1400px';

  // Common styles
  const containerStyle: React.CSSProperties = {
    backgroundColor: bgColor,
    color: textColor,
    padding: isMobile ? '2rem 1.5rem' : '4rem 2rem',
    minHeight: isMobile ? 'auto' : '600px',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: isMobile ? '1.75rem' : '2.5rem',
    fontWeight: '700',
    marginBottom: subtitle ? '0.5rem' : '0.75rem',
    color: textColor,
  };

  const subtitleStyle: React.CSSProperties = {
    fontSize: isMobile ? '1rem' : '1.25rem',
    fontWeight: '500',
    marginBottom: '0.5rem',
    opacity: 0.9,
    color: textColor,
  };

  const descStyle: React.CSSProperties = {
    fontSize: isMobile ? '0.95rem' : '1.125rem',
    marginBottom: isMobile ? '2rem' : '3rem',
    opacity: 0.8,
  };

  const cardStyle: React.CSSProperties = {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(0, 0, 0, 0.1)',
    borderRadius: '12px',
    padding: isMobile ? '1.5rem' : '2rem',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
  };

  // Default Layout
  if (layout === 'default') {
    return (
      <div style={containerStyle}>
        <div
          style={{
            maxWidth: contentMaxWidth,
            margin: '0 auto',
            textAlign: 'center',
          }}
        >
          <h2 style={titleStyle}>{title}</h2>
          {subtitle && <p style={subtitleStyle}>{subtitle}</p>}
          <p style={descStyle}>{description}</p>
          <div style={cardStyle}>
            <h3
              style={{
                fontSize: isMobile ? '1.25rem' : '1.5rem',
                fontWeight: '600',
                marginBottom: '1rem',
                color: '#1a1a1a',
              }}
            >
              {placeDetails.name}
            </h3>
            <div style={{ textAlign: 'left', color: '#333' }}>
              {showAddress && (
                <p
                  style={{
                    marginBottom: '0.75rem',
                    display: 'flex',
                    gap: '0.5rem',
                    alignItems: 'start',
                  }}
                >
                  <span style={{ fontSize: '1.25rem' }}>📍</span>
                  <span>{placeDetails.formatted_address}</span>
                </p>
              )}
              {placeDetails.formatted_phone_number && (
                <p
                  style={{
                    marginBottom: '0.75rem',
                    display: 'flex',
                    gap: '0.5rem',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ fontSize: '1.25rem' }}>📞</span>
                  <span>{placeDetails.formatted_phone_number}</span>
                </p>
              )}
              {showHours && placeDetails.opening_hours?.weekday_text && (
                <div
                  style={{
                    marginTop: '1rem',
                    paddingTop: '1rem',
                    borderTop: '1px solid rgba(0, 0, 0, 0.1)',
                  }}
                >
                  <p
                    style={{
                      fontWeight: '600',
                      marginBottom: '0.5rem',
                      display: 'flex',
                      gap: '0.5rem',
                      alignItems: 'center',
                    }}
                  >
                    <span style={{ fontSize: '1.25rem' }}>🕒</span>
                    <span>Opening Hours:</span>
                  </p>
                  <div
                    style={{
                      fontSize: '0.875rem',
                      lineHeight: '1.6',
                      paddingLeft: '1.75rem',
                    }}
                  >
                    {placeDetails.opening_hours.weekday_text.map((text, i) => (
                      <div key={i}>{text}</div>
                    ))}
                  </div>
                </div>
              )}
              {showMap && (
                <div
                  style={{
                    marginTop: '1.5rem',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    minHeight: isMobile ? '250px' : '350px',
                    backgroundColor: '#e8e8e8',
                  }}
                >
                  <SimpleMapPreview
                    lat={lat}
                    lng={lng}
                    name={placeDetails.name}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Grid Layout
  if (layout === 'grid') {
    return (
      <div style={containerStyle}>
        <div style={{ maxWidth: contentMaxWidth, margin: '0 auto' }}>
          <h2 style={{ ...titleStyle, textAlign: 'center' }}>{title}</h2>
          {subtitle && (
            <p style={{ ...subtitleStyle, textAlign: 'center' }}>{subtitle}</p>
          )}
          <p style={{ ...descStyle, textAlign: 'center' }}>{description}</p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile
                ? '1fr'
                : showMap
                  ? '1fr 1fr'
                  : '1fr',
              gap: isMobile ? '1.5rem' : '2rem',
            }}
          >
            <div style={cardStyle}>
              <h3
                style={{
                  fontSize: '1.5rem',
                  fontWeight: '600',
                  marginBottom: '1.5rem',
                  color: '#1a1a1a',
                }}
              >
                {placeDetails.name}
              </h3>
              <div
                style={{
                  display: 'grid',
                  gap: '1rem',
                  fontSize: '0.9375rem',
                  color: '#333',
                }}
              >
                {showAddress && (
                  <div
                    style={{
                      display: 'flex',
                      gap: '0.75rem',
                      alignItems: 'start',
                    }}
                  >
                    <span style={{ fontSize: '1.25rem' }}>📍</span>
                    <span>{placeDetails.formatted_address}</span>
                  </div>
                )}
                {placeDetails.formatted_phone_number && (
                  <div
                    style={{
                      display: 'flex',
                      gap: '0.75rem',
                      alignItems: 'center',
                    }}
                  >
                    <span style={{ fontSize: '1.25rem' }}>📞</span>
                    <span>{placeDetails.formatted_phone_number}</span>
                  </div>
                )}
                {showHours && placeDetails.opening_hours?.weekday_text && (
                  <div style={{ marginTop: '0.5rem' }}>
                    <div
                      style={{
                        fontWeight: '600',
                        marginBottom: '0.5rem',
                        display: 'flex',
                        gap: '0.5rem',
                        alignItems: 'center',
                      }}
                    >
                      <span style={{ fontSize: '1.25rem' }}>🕒</span>
                      <span>Hours:</span>
                    </div>
                    <div
                      style={{
                        fontSize: '0.875rem',
                        lineHeight: '1.6',
                        paddingLeft: '1.75rem',
                      }}
                    >
                      {placeDetails.opening_hours.weekday_text
                        .slice(0, isMobile ? 3 : 7)
                        .map((text, i) => (
                          <div key={i}>{text}</div>
                        ))}
                      {isMobile &&
                        placeDetails.opening_hours.weekday_text.length > 3 && (
                          <div
                            style={{
                              fontStyle: 'italic',
                              marginTop: '0.25rem',
                              opacity: 0.7,
                            }}
                          >
                            +{' '}
                            {placeDetails.opening_hours.weekday_text.length - 3}{' '}
                            more days
                          </div>
                        )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            {showMap && (
              <div
                style={{
                  ...cardStyle,
                  padding: '0.5rem',
                  minHeight: isMobile ? '300px' : '400px',
                  overflow: 'hidden',
                }}
              >
                <SimpleMapPreview
                  lat={lat}
                  lng={lng}
                  name={placeDetails.name}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // List Layout
  if (layout === 'list') {
    return (
      <div style={containerStyle}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <h2 style={titleStyle}>{title}</h2>
          {subtitle && <p style={subtitleStyle}>{subtitle}</p>}
          <p style={descStyle}>{description}</p>
          <div style={cardStyle}>
            <h3
              style={{
                fontSize: '1.75rem',
                fontWeight: '600',
                marginBottom: '1.5rem',
                color: '#1a1a1a',
              }}
            >
              {placeDetails.name}
            </h3>
            <div style={{ display: 'grid', gap: '1.5rem' }}>
              <div>
                <div
                  style={{
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    marginBottom: '0.5rem',
                    opacity: 0.7,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Address
                </div>
                <div
                  style={{
                    fontSize: '1rem',
                    display: 'flex',
                    gap: '0.5rem',
                    alignItems: 'start',
                    color: '#333',
                  }}
                >
                  <span style={{ fontSize: '1.25rem' }}>📍</span>
                  <span>{placeDetails.formatted_address}</span>
                </div>
              </div>
              {placeDetails.formatted_phone_number && (
                <div>
                  <div
                    style={{
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      marginBottom: '0.5rem',
                      opacity: 0.7,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    Phone
                  </div>
                  <div
                    style={{
                      fontSize: '1rem',
                      display: 'flex',
                      gap: '0.5rem',
                      alignItems: 'center',
                      color: '#333',
                    }}
                  >
                    <span style={{ fontSize: '1.25rem' }}>📞</span>
                    <span>{placeDetails.formatted_phone_number}</span>
                  </div>
                </div>
              )}
              {placeDetails.opening_hours?.weekday_text && (
                <div>
                  <div
                    style={{
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      marginBottom: '0.5rem',
                      opacity: 0.7,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    Opening Hours
                  </div>
                  <div
                    style={{
                      fontSize: '0.9375rem',
                      lineHeight: '1.8',
                      color: '#333',
                    }}
                  >
                    {placeDetails.opening_hours.weekday_text.map((text, i) => (
                      <div key={i} style={{ display: 'flex', gap: '0.5rem' }}>
                        <span style={{ fontSize: '1rem' }}>🕒</span>
                        <span>{text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <div
                  style={{
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    marginBottom: '0.5rem',
                    opacity: 0.7,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Location Map
                </div>
                <div
                  style={{
                    borderRadius: '8px',
                    overflow: 'hidden',
                    minHeight: isMobile ? '250px' : '350px',
                    backgroundColor: '#e8e8e8',
                  }}
                >
                  <SimpleMapPreview
                    lat={lat}
                    lng={lng}
                    name={placeDetails.name}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Cards Layout
  if (layout === 'cards') {
    return (
      <div style={containerStyle}>
        <div style={{ maxWidth: contentMaxWidth, margin: '0 auto' }}>
          <h2 style={{ ...titleStyle, textAlign: 'center' }}>{title}</h2>
          {subtitle && (
            <p style={{ ...subtitleStyle, textAlign: 'center' }}>{subtitle}</p>
          )}
          <p style={{ ...descStyle, textAlign: 'center' }}>{description}</p>
          <div
            style={{ ...cardStyle, padding: isMobile ? '2rem 1.5rem' : '3rem' }}
          >
            <h3
              style={{
                fontSize: isMobile ? '1.5rem' : '2rem',
                fontWeight: '700',
                marginBottom: '2rem',
                textAlign: 'center',
                color: '#1a1a1a',
              }}
            >
              {placeDetails.name}
            </h3>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: isMobile
                  ? '1fr'
                  : 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '1.5rem',
              }}
            >
              <div
                style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.02)',
                  border: '1px solid rgba(0, 0, 0, 0.1)',
                  borderRadius: '12px',
                  padding: '1.5rem',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>
                  📍
                </div>
                <div
                  style={{
                    fontWeight: '600',
                    marginBottom: '0.5rem',
                    color: '#1a1a1a',
                  }}
                >
                  Address
                </div>
                <div style={{ fontSize: '0.9375rem', color: '#666' }}>
                  {placeDetails.formatted_address}
                </div>
              </div>
              {placeDetails.formatted_phone_number && (
                <div
                  style={{
                    backgroundColor: 'rgba(0, 0, 0, 0.02)',
                    border: '1px solid rgba(0, 0, 0, 0.1)',
                    borderRadius: '12px',
                    padding: '1.5rem',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>
                    📞
                  </div>
                  <div
                    style={{
                      fontWeight: '600',
                      marginBottom: '0.5rem',
                      color: '#1a1a1a',
                    }}
                  >
                    Phone
                  </div>
                  <div style={{ fontSize: '0.9375rem', color: '#666' }}>
                    {placeDetails.formatted_phone_number}
                  </div>
                </div>
              )}
              {placeDetails.opening_hours?.weekday_text && (
                <div
                  style={{
                    backgroundColor: 'rgba(0, 0, 0, 0.02)',
                    border: '1px solid rgba(0, 0, 0, 0.1)',
                    borderRadius: '12px',
                    padding: '1.5rem',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>
                    🕒
                  </div>
                  <div
                    style={{
                      fontWeight: '600',
                      marginBottom: '0.5rem',
                      color: '#1a1a1a',
                    }}
                  >
                    Hours
                  </div>
                  <div
                    style={{
                      fontSize: '0.875rem',
                      color: '#666',
                      textAlign: 'left',
                    }}
                  >
                    {placeDetails.opening_hours.weekday_text
                      .slice(0, 3)
                      .map((text, i) => (
                        <div key={i}>{text}</div>
                      ))}
                    {placeDetails.opening_hours.weekday_text.length > 3 && (
                      <div style={{ fontStyle: 'italic', marginTop: '0.5rem' }}>
                        + {placeDetails.opening_hours.weekday_text.length - 3}{' '}
                        more
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Map Layout
  if (layout === 'map') {
    return (
      <div style={containerStyle}>
        <div style={{ maxWidth: contentMaxWidth, margin: '0 auto' }}>
          <h2 style={{ ...titleStyle, textAlign: 'center' }}>{title}</h2>
          {subtitle && (
            <p style={{ ...subtitleStyle, textAlign: 'center' }}>{subtitle}</p>
          )}
          <p style={{ ...descStyle, textAlign: 'center' }}>{description}</p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : '1fr 2fr',
              gap: isMobile ? '1.5rem' : '2rem',
            }}
          >
            <div style={cardStyle}>
              <h3
                style={{
                  fontSize: '1.5rem',
                  fontWeight: '600',
                  marginBottom: '1.5rem',
                  color: '#1a1a1a',
                }}
              >
                {placeDetails.name}
              </h3>
              <div
                style={{
                  display: 'grid',
                  gap: '1rem',
                  fontSize: '0.9375rem',
                  color: '#333',
                }}
              >
                <div>
                  <strong
                    style={{
                      display: 'flex',
                      gap: '0.5rem',
                      alignItems: 'center',
                      marginBottom: '0.25rem',
                    }}
                  >
                    <span style={{ fontSize: '1.25rem' }}>📍</span>
                    Address:
                  </strong>
                  <div style={{ paddingLeft: '1.75rem' }}>
                    {placeDetails.formatted_address}
                  </div>
                </div>
                {placeDetails.formatted_phone_number && (
                  <div>
                    <strong
                      style={{
                        display: 'flex',
                        gap: '0.5rem',
                        alignItems: 'center',
                        marginBottom: '0.25rem',
                      }}
                    >
                      <span style={{ fontSize: '1.25rem' }}>📞</span>
                      Phone:
                    </strong>
                    <div style={{ paddingLeft: '1.75rem' }}>
                      {placeDetails.formatted_phone_number}
                    </div>
                  </div>
                )}
                {placeDetails.opening_hours?.weekday_text && (
                  <div>
                    <strong
                      style={{
                        display: 'flex',
                        gap: '0.5rem',
                        alignItems: 'center',
                        marginBottom: '0.5rem',
                      }}
                    >
                      <span style={{ fontSize: '1.25rem' }}>🕒</span>
                      Hours:
                    </strong>
                    <div
                      style={{
                        fontSize: '0.875rem',
                        lineHeight: '1.6',
                        paddingLeft: '1.75rem',
                      }}
                    >
                      {placeDetails.opening_hours.weekday_text
                        .slice(0, isMobile ? 3 : 7)
                        .map((text, i) => (
                          <div key={i}>{text}</div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div
              style={{
                ...cardStyle,
                padding: '0.5rem',
                minHeight: isMobile ? '300px' : '500px',
                overflow: 'hidden',
              }}
            >
              <SimpleMapPreview lat={lat} lng={lng} name={placeDetails.name} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Compact Layout
  if (layout === 'compact') {
    return (
      <div style={containerStyle}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <h2 style={{ ...titleStyle, textAlign: 'center' }}>{title}</h2>
          {subtitle && (
            <p style={{ ...subtitleStyle, textAlign: 'center' }}>{subtitle}</p>
          )}
          <p style={{ ...descStyle, textAlign: 'center' }}>{description}</p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : '1fr 1.2fr',
              gap: isMobile ? '1.5rem' : '1.5rem',
              alignItems: 'stretch',
            }}
          >
            <div style={cardStyle}>
              <h3
                style={{
                  fontSize: isMobile ? '1.25rem' : '1.5rem',
                  fontWeight: '700',
                  marginBottom: '0.5rem',
                  color: '#1a1a1a',
                }}
              >
                {placeDetails.name}
              </h3>
              <div
                style={{
                  display: 'grid',
                  gap: '1rem',
                  fontSize: '0.875rem',
                  color: '#333',
                  marginTop: '1.5rem',
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      marginBottom: '0.25rem',
                      color: '#999',
                      textTransform: 'uppercase',
                    }}
                  >
                    Information
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      gap: '0.5rem',
                      alignItems: 'start',
                    }}
                  >
                    <span style={{ fontSize: '1rem' }}>📍</span>
                    <span>{placeDetails.formatted_address}</span>
                  </div>
                </div>
                {placeDetails.formatted_phone_number && (
                  <div
                    style={{
                      display: 'flex',
                      gap: '0.5rem',
                      alignItems: 'center',
                    }}
                  >
                    <span style={{ fontSize: '1rem' }}>📞</span>
                    <span>{placeDetails.formatted_phone_number}</span>
                  </div>
                )}
                {placeDetails.opening_hours?.weekday_text && (
                  <div>
                    <div
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        marginBottom: '0.5rem',
                        color: '#999',
                        textTransform: 'uppercase',
                      }}
                    >
                      Hours
                    </div>
                    <div style={{ fontSize: '0.8125rem', lineHeight: '1.6' }}>
                      {placeDetails.opening_hours.weekday_text
                        .slice(0, 3)
                        .map((text, i) => (
                          <div key={i}>{text}</div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div
              style={{
                borderRadius: '8px',
                overflow: 'hidden',
                minHeight: isMobile ? '300px' : '400px',
                backgroundColor: '#e8e8e8',
              }}
            >
              <SimpleMapPreview lat={lat} lng={lng} name={placeDetails.name} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Sidebar Layout
  if (layout === 'sidebar') {
    return (
      <div style={containerStyle}>
        <div style={{ maxWidth: contentMaxWidth, margin: '0 auto' }}>
          <h2 style={{ ...titleStyle, textAlign: 'center' }}>{title}</h2>
          {subtitle && (
            <p style={{ ...subtitleStyle, textAlign: 'center' }}>{subtitle}</p>
          )}
          <p style={{ ...descStyle, textAlign: 'center' }}>{description}</p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : '350px 1fr',
              gap: 0,
              border: '1px solid rgba(0, 0, 0, 0.1)',
              borderRadius: '12px',
              overflow: 'hidden',
              backgroundColor: '#fff',
            }}
          >
            <div
              style={{
                backgroundColor: '#f8f9fa',
                padding: isMobile ? '1.5rem' : '2rem',
                borderRight: isMobile ? 'none' : '1px solid rgba(0, 0, 0, 0.1)',
                overflowY: 'auto',
                maxHeight: isMobile ? 'auto' : '600px',
              }}
            >
              <div
                style={{
                  backgroundColor: '#fff',
                  borderRadius: '8px',
                  padding: '1.5rem',
                  border: '2px solid #dc3545',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                }}
              >
                <h3
                  style={{
                    fontSize: '1.125rem',
                    fontWeight: '700',
                    marginBottom: '0.75rem',
                    color: '#1a1a1a',
                  }}
                >
                  {placeDetails.name}
                </h3>
                <div
                  style={{
                    fontSize: '0.875rem',
                    color: '#666',
                    lineHeight: '1.6',
                  }}
                >
                  <div
                    style={{
                      marginBottom: '0.5rem',
                      display: 'flex',
                      gap: '0.5rem',
                    }}
                  >
                    <strong>📍</strong>
                    <span>{placeDetails.formatted_address}</span>
                  </div>
                  {placeDetails.formatted_phone_number && (
                    <div
                      style={{
                        marginBottom: '0.5rem',
                        display: 'flex',
                        gap: '0.5rem',
                      }}
                    >
                      <strong>📞</strong>
                      <span>{placeDetails.formatted_phone_number}</span>
                    </div>
                  )}
                  {placeDetails.opening_hours?.weekday_text && (
                    <div
                      style={{
                        marginTop: '0.75rem',
                        paddingTop: '0.75rem',
                        borderTop: '1px solid #e5e7eb',
                      }}
                    >
                      <div
                        style={{
                          fontWeight: '600',
                          marginBottom: '0.5rem',
                          color: '#1a1a1a',
                        }}
                      >
                        Hours:
                      </div>
                      {placeDetails.opening_hours.weekday_text
                        .slice(0, 2)
                        .map((text, i) => (
                          <div key={i} style={{ fontSize: '0.8125rem' }}>
                            {text}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div
              style={{
                backgroundColor: '#e8e8e8',
                minHeight: isMobile ? '300px' : '600px',
                position: 'relative',
              }}
            >
              <SimpleMapPreview lat={lat} lng={lng} name={placeDetails.name} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Fullscreen Layout
  if (layout === 'fullscreen') {
    return (
      <div
        style={{
          backgroundColor: '#1a2332',
          backgroundImage:
            'radial-gradient(circle at 20% 30%, rgba(255, 107, 107, 0.1), transparent 50%), radial-gradient(circle at 80% 70%, rgba(107, 148, 255, 0.1), transparent 50%)',
          padding: isMobile ? '2rem 1.5rem' : '4rem 2rem',
          minHeight: isMobile ? 'auto' : '700px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: 0.2,
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                fontSize: isMobile ? '4rem' : '6rem',
                marginBottom: '1rem',
              }}
            >
              🗺️
            </div>
            <p
              style={{ fontSize: isMobile ? '1rem' : '1.5rem', color: '#fff' }}
            >
              Full-Screen Map Experience
            </p>
          </div>
        </div>

        <div
          style={{
            position: 'relative',
            zIndex: 1,
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            borderRadius: '16px',
            padding: isMobile ? '2rem 1.5rem' : '2.5rem',
            maxWidth: '500px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
          }}
        >
          <h2
            style={{
              fontSize: isMobile ? '1.5rem' : '2rem',
              fontWeight: '700',
              marginBottom: subtitle ? '0.25rem' : '0.5rem',
              color: '#1a1a1a',
            }}
          >
            {title}
          </h2>
          {subtitle && (
            <p
              style={{
                fontSize: isMobile ? '0.9rem' : '1.1rem',
                fontWeight: '500',
                marginBottom: '0.5rem',
                color: '#333',
              }}
            >
              {subtitle}
            </p>
          )}
          <p
            style={{
              fontSize: '0.9375rem',
              marginBottom: '2rem',
              color: '#666',
            }}
          >
            {description}
          </p>
          <h3
            style={{
              fontSize: isMobile ? '1.25rem' : '1.5rem',
              fontWeight: '700',
              marginBottom: '1.5rem',
              color: '#1a1a1a',
            }}
          >
            {placeDetails.name}
          </h3>
          <div
            style={{
              display: 'grid',
              gap: '1rem',
              fontSize: '0.9375rem',
              color: '#333',
            }}
          >
            <div
              style={{ display: 'flex', gap: '0.75rem', alignItems: 'start' }}
            >
              <span style={{ fontSize: '1.25rem' }}>📍</span>
              <span>{placeDetails.formatted_address}</span>
            </div>
            {placeDetails.formatted_phone_number && (
              <div
                style={{
                  display: 'flex',
                  gap: '0.75rem',
                  alignItems: 'center',
                }}
              >
                <span style={{ fontSize: '1.25rem' }}>📞</span>
                <span>{placeDetails.formatted_phone_number}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Fallback for any other layouts
  return (
    <div style={containerStyle}>
      <div
        style={{
          maxWidth: contentMaxWidth,
          margin: '0 auto',
          textAlign: 'center',
        }}
      >
        <h2 style={titleStyle}>{title}</h2>
        <p style={descStyle}>{description}</p>
        <div style={cardStyle}>
          <h3
            style={{
              fontSize: '1.5rem',
              fontWeight: '600',
              marginBottom: '1rem',
              color: '#1a1a1a',
            }}
          >
            {placeDetails.name}
          </h3>
          <div style={{ textAlign: 'left', color: '#333' }}>
            <p
              style={{
                marginBottom: '0.75rem',
                display: 'flex',
                gap: '0.5rem',
                alignItems: 'start',
              }}
            >
              <span style={{ fontSize: '1.25rem' }}>📍</span>
              <span>{placeDetails.formatted_address}</span>
            </p>
            {placeDetails.formatted_phone_number && (
              <p
                style={{
                  marginBottom: '0.75rem',
                  display: 'flex',
                  gap: '0.5rem',
                  alignItems: 'center',
                }}
              >
                <span style={{ fontSize: '1.25rem' }}>📞</span>
                <span>{placeDetails.formatted_phone_number}</span>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Static Map Preview Component for Layout Previews
function SimpleMapPreview({
  lat,
  lng,
  name,
}: {
  lat: number;
  lng: number;
  name: string;
}) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const hasValidCoordinates = Number.isFinite(lat) && Number.isFinite(lng);

  // Check if we have valid coordinates
  if (!hasValidCoordinates) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          minHeight: '200px',
          backgroundColor: '#e8e8e8',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ textAlign: 'center', opacity: 0.6 }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🗺️</div>
          <p style={{ fontSize: '0.875rem', color: '#666' }}>Map Preview</p>
          <p style={{ fontSize: '0.75rem', color: '#999' }}>
            Invalid coordinates
          </p>
        </div>
      </div>
    );
  }

  const embedUrl = `https://www.google.com/maps?q=${encodeURIComponent(`${lat},${lng}`)}&z=15&output=embed`;
  const mapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lng}`)}`;
  const useIframePreview = typeof window !== 'undefined';

  if (useIframePreview) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          minHeight: '200px',
          backgroundColor: '#e8e8e8',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <iframe
          src={embedUrl}
          title={`Map showing ${name}`}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          style={{
            width: '100%',
            height: '100%',
            minHeight: '200px',
            border: 'none',
            display: 'block',
          }}
        />
        <a
          href={mapsLink}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            borderRadius: '999px',
            background: 'rgba(15, 23, 42, 0.82)',
            color: '#ffffff',
            padding: '0.45rem 0.8rem',
            fontSize: '0.75rem',
            fontWeight: 600,
            textDecoration: 'none',
            boxShadow: '0 12px 28px rgba(15, 23, 42, 0.18)',
            backdropFilter: 'blur(10px)',
          }}
        >
          Open in Maps
        </a>
      </div>
    );
  }

  // If no API key, show placeholder
  if (!apiKey) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          minHeight: '200px',
          backgroundColor: '#e8e8e8',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
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
  const staticMapUrl =
    `https://maps.googleapis.com/maps/api/staticmap?` +
    `center=${lat},${lng}&` +
    `zoom=15&` +
    `size=600x400&` +
    `markers=color:red%7C${lat},${lng}&` +
    `key=${apiKey}&` +
    `style=feature:poi|visibility:off&` +
    `style=feature:transit|visibility:off`;

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        minHeight: '200px',
        backgroundColor: '#e8e8e8',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
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
