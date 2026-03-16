/**
 * Dynamic Location Component
 *
 * Displays configurable location information based on Google Places data from templates table
 * Supports multiple layouts and customization options
 */

'use client';

import { useEffect, useState } from 'react';
import type { LocationConfig } from '@/types/location.types';
import { useGlobalStyleConfig } from '@/hooks/use-global-style-config';
import {
  getSectionTypographyStyles,
  getSelectedGlobalButtonStyle,
  getButtonInlineStyle,
} from '@/lib/section-style';

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
  photos?: Array<{
    getUrl: (options: { maxWidth: number }) => string;
  }>;
}

type PreviewViewport = 'desktop' | 'mobile';

interface DynamicLocationProps {
  restaurantId?: string;
  pageId?: string;
  templateId?: string;
  showLoading?: boolean;
  configData?: Partial<LocationConfig>;
  placeDetailsData?: PlaceDetails;
  previewViewport?: PreviewViewport;
}

interface GoogleMapTarget {
  placeId?: string;
  lat?: number;
  lng?: number;
  address?: string;
  name?: string;
}

function normalizeText(value?: string | null) {
  return typeof value === 'string' && value.trim() ? value.trim() : '';
}

function hasValidCoordinates(lat?: number, lng?: number) {
  return Number.isFinite(lat) && Number.isFinite(lng);
}

function buildMapQuery({ placeId, lat, lng, address, name }: GoogleMapTarget) {
  if (hasValidCoordinates(lat, lng)) {
    return `${lat},${lng}`;
  }

  const textQuery = [normalizeText(name), normalizeText(address)].filter(Boolean).join(', ');
  if (textQuery) {
    return textQuery;
  }

  const normalizedPlaceId = normalizeText(placeId);
  if (normalizedPlaceId) {
    return `place_id:${normalizedPlaceId}`;
  }

  return '';
}

function buildGoogleMapsEmbedUrl(target: GoogleMapTarget) {
  const query = buildMapQuery(target);
  if (!query) {
    return null;
  }

  const zoom = hasValidCoordinates(target.lat, target.lng) ? '17' : '15';
  return `https://www.google.com/maps?q=${encodeURIComponent(query)}&z=${zoom}&output=embed`;
}

function buildGoogleMapsDirectionsUrl(target: GoogleMapTarget) {
  const normalizedPlaceId = normalizeText(target.placeId);
  if (normalizedPlaceId) {
    return `https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(normalizedPlaceId)}`;
  }

  if (hasValidCoordinates(target.lat, target.lng)) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${target.lat},${target.lng}`)}`;
  }

  const locationText = [normalizeText(target.name), normalizeText(target.address)]
    .filter(Boolean)
    .join(', ');

  if (locationText) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationText)}`;
  }

  return 'https://www.google.com/maps';
}

export default function DynamicLocation({
  restaurantId,
  pageId,
  templateId,
  showLoading = false,
  configData,
  placeDetailsData,
  previewViewport = 'desktop',
}: DynamicLocationProps) {
  const [config, setConfig] = useState<LocationConfig | null>(null);
  const [placeDetails, setPlaceDetails] = useState<PlaceDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const globalStyleEndpoint = restaurantId
    ? `/api/global-style-config?restaurant_id=${encodeURIComponent(restaurantId)}`
    : '/api/global-style-config';
  const { config: globalStyles } = useGlobalStyleConfig({
    apiEndpoint: globalStyleEndpoint,
    fetchOnMount: Boolean(restaurantId),
  });

  const fetchLocationConfig = async () => {
    // If configData is provided, use it directly
    if (configData) {
      console.log('[Location] configData provided:', {
        enabled: configData.enabled,
        hasGooglePlaceId: !!configData.google_place_id,
        googlePlaceId: configData.google_place_id,
        layout: configData.layout,
        fullConfigData: configData
      });

      // Check if the config is enabled before setting it
      if (configData.enabled !== false && configData.google_place_id) {
        console.log('[Location] Config is enabled and has place ID, setting config and fetching details');
        setConfig(configData as LocationConfig);
        if (placeDetailsData) {
          setPlaceDetails(placeDetailsData);
          setIsLoading(false);
        } else {
          fetchPlaceDetails(configData.google_place_id);
          // Don't set isLoading to false here - wait for place details to load
        }
      } else {
        console.log('[Location] Config disabled or missing place ID:', {
          enabled: configData.enabled,
          hasPlaceId: !!configData.google_place_id
        });
        setIsLoading(false);
      }
      return;
    }

    if (!restaurantId) {
      setIsLoading(false);
      return;
    }

    try {
      // Build API URL with appropriate parameters
      const params = new URLSearchParams();
      if (restaurantId) params.append('restaurant_id', restaurantId);

      // If templateId is provided, use it for specific template fetch
      if (templateId) {
        params.append('template_id', templateId);
        console.log('[Location] Fetching location config by template_id:', { restaurantId, templateId });
      } else if (pageId) {
        params.append('page_id', pageId);
        console.log('[Location] Fetching location config by page_id:', { restaurantId, pageId });
      } else {
        console.log('[Location] Fetching restaurant-level location config:', { restaurantId });
      }

      const response = await fetch(`/api/location-config?${params.toString()}`);
      const data = await response.json();

      console.log('[Location] API response:', data);

      if (data.success && data.data && data.data.enabled && data.data.google_place_id) {
        console.log('[Location] Config enabled, fetching place details for:', data.data.google_place_id);
        setConfig(data.data);
        fetchPlaceDetails(data.data.google_place_id);
      } else {
        console.log('[Location] Config not enabled or missing data:', {
          success: data.success,
          hasData: !!data.data,
          enabled: data.data?.enabled,
          hasGooglePlaceId: !!data.data?.google_place_id
        });
      }
    } catch (error) {
      console.error('[Location] Error fetching location config:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLocationConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId, pageId, templateId, configData, placeDetailsData]);

  const fetchPlaceDetails = async (placeId: string) => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.error('[Location] Google Maps API key not configured');
      setIsLoading(false);
      return;
    }

    console.log('[Location] Fetching Google Places details for:', placeId);

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
        console.error('[Location] Failed to load Google Maps');
        setIsLoading(false);
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
      console.error('[Location] Google Maps not loaded');
      setIsLoading(false);
      return;
    }

    console.log('[Location] Getting place details from Google Places API');

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
        'photos',
      ],
    };

    service.getDetails(request, (place: any, status: any) => {
      if (status === (window.google?.maps as any)?.places?.PlacesServiceStatus?.OK && place) {
        console.log('[Location] Successfully fetched place details:', place.name);
        setPlaceDetails(place);
        setIsLoading(false);
      } else {
        console.error('[Location] Failed to fetch place details:', status);
        setIsLoading(false);
      }
    });
  };

  // Simple map preview with resilient provider fallback.
  const SimpleMapPreview = ({
    lat,
    lng,
    name,
    address,
    placeId,
    directionsUrl,
  }: {
    lat?: number;
    lng?: number;
    name: string;
    address?: string;
    placeId?: string;
    directionsUrl: string;
  }) => {
    const embedUrl = buildGoogleMapsEmbedUrl({ placeId, lat, lng, address, name });
    const mapLabel = normalizeText(name) || 'Our location';

    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          minHeight: '220px',
          backgroundColor: '#e8e8e8',
          position: 'relative',
          overflow: 'hidden',
          aspectRatio: '16 / 10',
        }}
      >
        {embedUrl ? (
          <iframe
            src={embedUrl}
            title={`Map showing ${mapLabel}`}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              display: 'block',
            }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              color: '#4b5563',
              padding: '1rem',
            }}
          >
            Map preview unavailable
          </div>
        )}

        <a
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Open ${mapLabel} in Google Maps`}
          style={{
            position: 'absolute',
            right: '0.75rem',
            bottom: '0.75rem',
            zIndex: 2,
            backgroundColor: 'rgba(17, 24, 39, 0.84)',
            color: '#ffffff',
            textDecoration: 'none',
            fontSize: '0.75rem',
            fontWeight: 600,
            letterSpacing: '0.02em',
            padding: '0.45rem 0.65rem',
            borderRadius: '999px',
          }}
        >
          Open in Maps
        </a>
      </div>
    );
  };

  const renderContent = () => {
    if (!config || !placeDetails) return null;

    const layout = config.layout || 'default';
    const lat = typeof placeDetails.geometry.location.lat === 'function'
      ? placeDetails.geometry.location.lat()
      : placeDetails.geometry.location.lat;
    const lng = typeof placeDetails.geometry.location.lng === 'function'
      ? placeDetails.geometry.location.lng()
      : placeDetails.geometry.location.lng;
    const mapTarget = {
      placeId: config.google_place_id,
      lat,
      lng,
      address: placeDetails.formatted_address,
      name: placeDetails.name,
    };
    const directionsUrl = buildGoogleMapsDirectionsUrl(mapTarget);
    const isPreviewMobile = previewViewport === 'mobile';
    const sectionStyleInput = {
      ...config,
      subtitleFontFamily:
        config.subtitleFontFamily || config.descriptionFontFamily,
      subtitleFontSize:
        config.subtitleFontSize || config.descriptionFontSize,
      subtitleFontWeight:
        config.subtitleFontWeight ?? config.descriptionFontWeight,
      subtitleColor: config.subtitleColor || config.descriptionColor,
    };
    const { titleStyle, subtitleStyle } = getSectionTypographyStyles(
      sectionStyleInput,
      globalStyles,
    );
    const buttonStyle = getButtonInlineStyle(
      getSelectedGlobalButtonStyle(config, globalStyles),
    );
    const titleTypography = titleStyle;
    const descriptionTypography = subtitleStyle;
    if (layout === 'default') {
      return (
        <div
          style={{
            maxWidth: config.maxWidth || '800px',
            margin: '0 auto',
            padding: '4rem 1.5rem',
            textAlign: 'center',
          }}
        >
          <h2
            style={{
              ...titleTypography,
              fontSize: '2rem',
              fontWeight: '700',
              marginBottom: '1rem',
            }}
          >
            {config.title}
          </h2>
          <p
            style={{
              ...descriptionTypography,
              fontSize: '1.125rem',
              marginBottom: '2rem',
              opacity: 0.8,
            }}
          >
            {config.description}
          </p>
          <div
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              border: '1px solid rgba(0, 0, 0, 0.1)',
              borderRadius: '12px',
              padding: '2rem',
              textAlign: 'left',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
            }}
          >
            <h3
              style={{
                ...titleTypography,
                fontSize: '1.5rem',
                fontWeight: '600',
                marginBottom: '1rem',
              }}
            >
              {placeDetails.name}
            </h3>
            {config.showAddress !== false ? (
              <p
                style={{
                  marginBottom: '0.5rem',
                  opacity: 0.9,
                  color: config.textColor || '#666666',
                }}
              >
                {'ðŸ“'} {placeDetails.formatted_address}
              </p>
            ) : null}
            {placeDetails.formatted_phone_number ? (
              <p
                style={{
                  marginBottom: '0.5rem',
                  opacity: 0.9,
                  color: config.textColor || '#666666',
                }}
              >
                {'ðŸ“ž'} {placeDetails.formatted_phone_number}
              </p>
            ) : null}
            {placeDetails.website ? (
              <p style={{ marginBottom: '0.5rem', opacity: 0.9 }}>
                {'ðŸŒ'}{' '}
                <a
                  href={placeDetails.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#3b82f6' }}
                >
                  Visit Website
                </a>
              </p>
            ) : null}
            {config.showHours !== false &&
            placeDetails.opening_hours?.weekday_text ? (
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
                  <span style={{ fontSize: '1.25rem' }}>{'ðŸ•’'}</span>
                  <span>Opening Hours:</span>
                </p>
                <div
                  style={{
                    fontSize: '0.875rem',
                    lineHeight: '1.6',
                    paddingLeft: '1.75rem',
                    color: config.textColor || '#666666',
                  }}
                >
                  {placeDetails.opening_hours.weekday_text.map((text, i) => (
                    <div key={i}>{text}</div>
                  ))}
                </div>
              </div>
            ) : null}
            {config.showMap !== false ? (
              <div
                style={{
                  marginTop: '1.5rem',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  minHeight: isPreviewMobile ? '220px' : '280px',
                  backgroundColor: '#e8e8e8',
                }}
              >
                <SimpleMapPreview
                  lat={lat}
                  lng={lng}
                  name={placeDetails.name}
                  address={placeDetails.formatted_address}
                  placeId={config.google_place_id}
                  directionsUrl={directionsUrl}
                />
              </div>
            ) : null}
          </div>
        </div>
      );
    }
    // Default Layout
    if (layout === '__legacy_default__') {
      return (
        <div style={{ maxWidth: config.maxWidth || '800px', margin: '0 auto', padding: '4rem 1.5rem', textAlign: 'center' }}>
          <h2 style={{ ...titleTypography, fontSize: '2rem', fontWeight: '700', marginBottom: '1rem' }}>
            {config.title}
          </h2>
          <p style={{ ...descriptionTypography, fontSize: '1.125rem', marginBottom: '2rem', opacity: 0.8 }}>
            {config.description}
          </p>
          <div style={{
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            border: '1px solid rgba(0, 0, 0, 0.1)',
            borderRadius: '12px',
            padding: '2rem',
            textAlign: 'left',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
          }}>
            <h3 style={{ ...titleTypography, fontSize: '1.5rem', fontWeight: '600', marginBottom: '1rem' }}>
              {placeDetails.name}
            </h3>
            <p style={{ marginBottom: '0.5rem', opacity: 0.9, color: config.textColor || '#666666' }}>
              📍 {placeDetails.formatted_address}
            </p>
            {placeDetails.formatted_phone_number && (
              <p style={{ marginBottom: '0.5rem', opacity: 0.9, color: config.textColor || '#666666' }}>
                📞 {placeDetails.formatted_phone_number}
              </p>
            )}
            {placeDetails.website && (
              <p style={{ marginBottom: '0.5rem', opacity: 0.9 }}>
                🌐 <a href={placeDetails.website} target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6' }}>Visit Website</a>
              </p>
            )}
          </div>
        </div>
      );
    }

    // Grid Layout
    if (layout === 'grid') {
      return (
        <div style={{ maxWidth: config.maxWidth || '1200px', margin: '0 auto', padding: '4rem 1.5rem' }}>
          <h2 style={{ ...titleTypography, fontSize: '2.5rem', fontWeight: '700', marginBottom: '1rem', textAlign: 'center' }}>
            {config.title}
          </h2>
          <p style={{ ...descriptionTypography, fontSize: '1.125rem', marginBottom: '3rem', textAlign: 'center', opacity: 0.8 }}>
            {config.description}
          </p>
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2" style={{ alignItems: 'start' }}>
            <div style={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              border: '1px solid rgba(0, 0, 0, 0.1)',
              borderRadius: '12px',
              padding: '2rem',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
            }}>
              <h3 style={{ ...titleTypography, fontSize: '1.75rem', fontWeight: '600', marginBottom: '1.5rem' }}>
                {placeDetails.name}
              </h3>
              <div style={{ display: 'grid', gap: '1rem' }}>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'start' }}>
                  <span style={{ fontSize: '1.25rem' }}>📍</span>
                  <span style={{ color: config.textColor || '#666666' }}>{placeDetails.formatted_address}</span>
                </div>
                {placeDetails.formatted_phone_number && (
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '1.25rem' }}>📞</span>
                    <span style={{ color: config.textColor || '#666666' }}>{placeDetails.formatted_phone_number}</span>
                  </div>
                )}
                {placeDetails.website && (
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '1.25rem' }}>🌐</span>
                    <a href={placeDetails.website} target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6' }}>Visit Website</a>
                  </div>
                )}
                {placeDetails.opening_hours?.weekday_text && (
                  <div style={{ marginTop: '1rem' }}>
                    <div style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.5rem', color: config.textColor || '#000000' }}>
                      🕒 Hours:
                    </div>
                    <div style={{ fontSize: '0.875rem', opacity: 0.9, color: config.textColor || '#666666' }}>
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
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              border: '1px solid rgba(0, 0, 0, 0.1)',
              borderRadius: '12px',
              padding: '1rem',
              minHeight: 'clamp(280px, 52vw, 400px)',
              overflow: 'hidden',
            }}>
              <SimpleMapPreview
                lat={lat}
                lng={lng}
                name={placeDetails.name}
                address={placeDetails.formatted_address}
                placeId={config.google_place_id}
                directionsUrl={directionsUrl}
              />
            </div>
          </div>
        </div>
      );
    }

    // List Layout
    if (layout === 'list') {
      return (
        <div style={{ maxWidth: config.maxWidth || '900px', margin: '0 auto', padding: '4rem 1.5rem' }}>
          <h2 style={{ ...titleTypography, fontSize: '2.5rem', fontWeight: '700', marginBottom: '1rem' }}>
            {config.title}
          </h2>
          <p style={{ ...descriptionTypography, fontSize: '1.125rem', marginBottom: '3rem', opacity: 0.8 }}>
            {config.description}
          </p>
          <div style={{
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            border: '1px solid rgba(0, 0, 0, 0.1)',
            borderRadius: '12px',
            padding: '2rem',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
          }}>
            <h3 style={{ ...titleTypography, fontSize: '2rem', fontWeight: '600', marginBottom: '1.5rem' }}>
              {placeDetails.name}
            </h3>
            <div style={{ display: 'grid', gap: '1.5rem' }}>
              <div>
                <div style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.5rem', opacity: 0.7, color: config.textColor || '#999999' }}>
                  Address
                </div>
                <div style={{ fontSize: '1.125rem', color: config.textColor || '#666666' }}>
                  📍 {placeDetails.formatted_address}
                </div>
              </div>
              {placeDetails.formatted_phone_number && (
                <div>
                  <div style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.5rem', opacity: 0.7, color: config.textColor || '#999999' }}>
                    Phone
                  </div>
                  <div style={{ fontSize: '1.125rem', color: config.textColor || '#666666' }}>
                    📞 {placeDetails.formatted_phone_number}
                  </div>
                </div>
              )}
              {placeDetails.opening_hours?.weekday_text && (
                <div>
                  <div style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.5rem', opacity: 0.7, color: config.textColor || '#999999' }}>
                    Hours
                  </div>
                  <div style={{ fontSize: '0.9375rem', lineHeight: '1.6', opacity: 0.9, color: config.textColor || '#666666' }}>
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

    // Map Layout
    if (layout === 'map') {
      return (
        <div style={{ maxWidth: config.maxWidth || '1400px', margin: '0 auto', padding: '4rem 1.5rem' }}>
          <h2 style={{ ...titleTypography, fontSize: '2.5rem', fontWeight: '700', marginBottom: '1rem', textAlign: 'center' }}>
            {config.title}
          </h2>
          <p style={{ ...descriptionTypography, fontSize: '1.125rem', marginBottom: '3rem', textAlign: 'center', opacity: 0.8 }}>
            {config.description}
          </p>
          <div
            style={{
              display: 'grid',
              gap: isPreviewMobile ? '1.5rem' : '2rem',
              gridTemplateColumns: isPreviewMobile ? '1fr' : 'minmax(0,1fr) minmax(0,2fr)',
            }}
          >
            <div style={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              border: '1px solid rgba(0, 0, 0, 0.1)',
              borderRadius: '12px',
              padding: '2rem',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
            }}>
              <h3 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1.5rem', color: config.textColor || '#000000' }}>
                {placeDetails.name}
              </h3>
              <div style={{ display: 'grid', gap: '1rem', fontSize: '0.9375rem' }}>
                <div>
                  <strong>📍 Address:</strong>
                  <div style={{ marginTop: '0.25rem', opacity: 0.9, color: config.textColor || '#666666' }}>{placeDetails.formatted_address}</div>
                </div>
                {placeDetails.formatted_phone_number && (
                  <div>
                    <strong>📞 Phone:</strong>
                    <div style={{ marginTop: '0.25rem', opacity: 0.9, color: config.textColor || '#666666' }}>{placeDetails.formatted_phone_number}</div>
                  </div>
                )}
                {placeDetails.opening_hours?.weekday_text && (
                  <div>
                    <strong>🕒 Hours:</strong>
                    <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', opacity: 0.8, color: config.textColor || '#666666' }}>
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
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              border: '1px solid rgba(0, 0, 0, 0.1)',
              borderRadius: '12px',
              padding: '1rem',
              minHeight: 'clamp(320px, 56vw, 500px)',
              overflow: 'hidden',
            }}>
              <SimpleMapPreview
                lat={lat}
                lng={lng}
                name={placeDetails.name}
                address={placeDetails.formatted_address}
                placeId={config.google_place_id}
                directionsUrl={directionsUrl}
              />
            </div>
          </div>
        </div>
      );
    }

    // Compact Layout - matches the layout from location settings form
    if (layout === 'compact') {
      return (
        <div style={{ maxWidth: config.maxWidth || '1100px', margin: '0 auto', padding: '4rem 1.5rem' }}>
          <h2 style={{ ...titleTypography, fontSize: '2rem', fontWeight: '700', marginBottom: '2rem', textAlign: 'center' }}>
            {config.title}
          </h2>
          <div
            style={{
              display: 'grid',
              gap: isPreviewMobile ? '1.5rem' : '1.5rem',
              gridTemplateColumns: isPreviewMobile ? '1fr' : 'minmax(0,1fr) minmax(0,1.2fr)',
              alignItems: 'stretch',
            }}
          >
            {/* Info Card */}
            <div style={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              border: '1px solid rgba(0, 0, 0, 0.1)',
              borderRadius: '8px',
              padding: '2rem',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
            }}>
              <h3 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.25rem', color: config.textColor || '#1a1a1a' }}>
                {placeDetails.name}
              </h3>
              <p style={{ ...descriptionTypography, fontSize: '0.75rem', marginBottom: '1.5rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {config.description}
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
                <a
                  href={directionsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Get directions to ${placeDetails.name}`}
                  style={{
                    marginTop: '1rem',
                    padding: '0.75rem 1.5rem',
                    backgroundColor: buttonStyle.backgroundColor || '#8b0000',
                    color: buttonStyle.color || '#fff',
                    border: buttonStyle.border,
                    borderRadius: buttonStyle.borderRadius || '6px',
                    fontWeight: buttonStyle.fontWeight || '600',
                    fontFamily: buttonStyle.fontFamily,
                    textTransform: buttonStyle.textTransform,
                    textAlign: 'center',
                    textDecoration: 'none',
                    display: 'inline-block',
                  }}
                >
                  GET DIRECTIONS
                </a>
              </div>
            </div>

            {/* Map */}
            <div style={{
              backgroundColor: '#e8e8e8',
              borderRadius: '8px',
              overflow: 'hidden',
              position: 'relative',
              minHeight: 'clamp(280px, 58vw, 420px)',
            }}>
              <SimpleMapPreview
                lat={lat}
                lng={lng}
                name={placeDetails.name}
                address={placeDetails.formatted_address}
                placeId={config.google_place_id}
                directionsUrl={directionsUrl}
              />
            </div>
          </div>
        </div>
      );
    }

    // Cards Layout
    if (layout === 'cards') {
      return (
        <div style={{ maxWidth: config.maxWidth || '1200px', margin: '0 auto', padding: '4rem 1.5rem' }}>
          <h2 style={{ ...titleTypography, fontSize: '2.5rem', fontWeight: '700', marginBottom: '1rem', textAlign: 'center' }}>
            {config.title}
          </h2>
          <p style={{ ...descriptionTypography, fontSize: '1.125rem', marginBottom: '3rem', textAlign: 'center', opacity: 0.8 }}>
            {config.description}
          </p>
          <div style={{
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            border: '1px solid rgba(0, 0, 0, 0.1)',
            borderRadius: '16px',
            padding: isPreviewMobile ? '2rem 1.25rem' : '3rem',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.08)',
          }}>
            <h3 style={{ ...titleTypography, fontSize: '2rem', fontWeight: '700', marginBottom: '2rem', textAlign: 'center' }}>
              {placeDetails.name}
            </h3>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: isPreviewMobile
                  ? '1fr'
                  : 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '1.5rem',
              }}
            >
              <div style={{
                backgroundColor: 'rgba(0, 0, 0, 0.03)',
                border: '1px solid rgba(0, 0, 0, 0.1)',
                borderRadius: '12px',
                padding: '1.5rem',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📍</div>
                <div style={{ fontWeight: '600', marginBottom: '0.5rem', color: config.textColor || '#000000' }}>Address</div>
                <div style={{ fontSize: '0.9375rem', opacity: 0.8, color: config.textColor || '#666666' }}>{placeDetails.formatted_address}</div>
              </div>
              {placeDetails.formatted_phone_number && (
                <div style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.03)',
                  border: '1px solid rgba(0, 0, 0, 0.1)',
                  borderRadius: '12px',
                  padding: '1.5rem',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📞</div>
                  <div style={{ fontWeight: '600', marginBottom: '0.5rem', color: config.textColor || '#000000' }}>Phone</div>
                  <div style={{ fontSize: '0.9375rem', opacity: 0.8, color: config.textColor || '#666666' }}>{placeDetails.formatted_phone_number}</div>
                </div>
              )}
              {placeDetails.website && (
                <div style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.03)',
                  border: '1px solid rgba(0, 0, 0, 0.1)',
                  borderRadius: '12px',
                  padding: '1.5rem',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🌐</div>
                  <div style={{ fontWeight: '600', marginBottom: '0.5rem', color: config.textColor || '#000000' }}>Website</div>
                  <div style={{ fontSize: '0.9375rem', opacity: 0.8 }}>
                    <a href={placeDetails.website} target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6' }}>Visit Site</a>
                  </div>
                </div>
              )}
              {placeDetails.opening_hours?.weekday_text && (
                <div style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.03)',
                  border: '1px solid rgba(0, 0, 0, 0.1)',
                  borderRadius: '12px',
                  padding: '1.5rem',
                  textAlign: 'center',
                  gridColumn: isPreviewMobile ? 'auto' : 'span 2',
                }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🕒</div>
                  <div style={{ fontWeight: '600', marginBottom: '0.5rem', color: config.textColor || '#000000' }}>Hours</div>
                  <div style={{ fontSize: '0.875rem', opacity: 0.8, color: config.textColor || '#666666' }}>
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
        </div>
      );
    }

    // Sidebar Layout
    if (layout === 'sidebar') {
      return (
        <div style={{ maxWidth: config.maxWidth || '1400px', margin: '0 auto', padding: '4rem 1.5rem' }}>
          <h2 style={{ ...titleTypography, fontSize: '2.5rem', fontWeight: '700', marginBottom: '0.5rem', textAlign: 'center' }}>
            {config.title}
          </h2>
          <p style={{ ...descriptionTypography, fontSize: '1rem', marginBottom: '3rem', textAlign: 'center', opacity: 0.7 }}>
            {config.description}
          </p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isPreviewMobile ? '1fr' : '350px minmax(0,1fr)',
              gap: '0',
              border: '1px solid rgba(0, 0, 0, 0.1)',
              borderRadius: '12px',
              backgroundColor: '#fff',
              overflow: 'hidden',
            }}
          >
            {/* Sidebar with location list */}
            <div style={{
              backgroundColor: '#f8f9fa',
              padding: isPreviewMobile ? '1.5rem' : '2rem',
              borderRight: isPreviewMobile ? 'none' : '1px solid rgba(0, 0, 0, 0.1)',
              overflowY: 'auto',
              maxHeight: isPreviewMobile ? 'none' : '600px',
            }}>
              <div style={{
                backgroundColor: '#fff',
                borderRadius: '8px',
                padding: '1.5rem',
                marginBottom: '1rem',
                border: '2px solid #dc3545',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
              }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: '700', marginBottom: '0.75rem', color: config.textColor || '#1a1a1a' }}>
                  {placeDetails.name}
                </h3>
                <div style={{ fontSize: '0.875rem', color: config.textColor || '#666', lineHeight: '1.6' }}>
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
                      <div style={{ fontWeight: '600', marginBottom: '0.5rem', color: config.textColor || '#1a1a1a' }}>Hours:</div>
                      {placeDetails.opening_hours.weekday_text.slice(0, 2).map((text, i) => (
                        <div key={i} style={{ fontSize: '0.8125rem' }}>{text}</div>
                      ))}
                    </div>
                  )}
                  <a
                    href={directionsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Open ${placeDetails.name} on Google Maps`}
                    style={{
                      marginTop: '1rem',
                      width: '100%',
                      padding: '0.625rem',
                      backgroundColor: buttonStyle.backgroundColor || '#8b0000',
                      color: buttonStyle.color || '#fff',
                      border: buttonStyle.border,
                      borderRadius: buttonStyle.borderRadius || '6px',
                      fontSize: buttonStyle.fontSize || '0.875rem',
                      fontWeight: buttonStyle.fontWeight || '600',
                      fontFamily: buttonStyle.fontFamily,
                      textTransform: buttonStyle.textTransform,
                      textAlign: 'center',
                      textDecoration: 'none',
                      display: 'inline-block',
                    }}
                  >
                    SELECT LOCATION
                  </a>
                </div>
              </div>
            </div>

            {/* Map area */}
            <div style={{
              backgroundColor: '#e8e8e8',
              minHeight: isPreviewMobile ? '320px' : 'clamp(320px, 60vw, 600px)',
              position: 'relative',
            }}>
              <SimpleMapPreview
                lat={lat}
                lng={lng}
                name={placeDetails.name}
                address={placeDetails.formatted_address}
                placeId={config.google_place_id}
                directionsUrl={directionsUrl}
              />
            </div>
          </div>
        </div>
      );
    }

    // Fullscreen Layout
    if (layout === 'fullscreen') {
      return (
        <div style={{
          margin: isPreviewMobile ? '-2.75rem -1rem' : '-4rem -1.5rem',
          minHeight: isPreviewMobile ? '760px' : '100vh',
          position: 'relative',
          backgroundColor: config.bgColor || '#1a2332',
          backgroundImage: 'radial-gradient(circle at 20% 30%, rgba(255, 107, 107, 0.1), transparent 50%), radial-gradient(circle at 80% 70%, rgba(107, 148, 255, 0.1), transparent 50%)',
        }}>
          {/* Full-bleed map background */}
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: 0.3,
          }}>
            <SimpleMapPreview
              lat={lat}
              lng={lng}
              name={placeDetails.name}
              address={placeDetails.formatted_address}
              placeId={config.google_place_id}
              directionsUrl={directionsUrl}
            />
          </div>

          {/* Floating location card */}
          <div style={{
            position: 'relative',
            padding: isPreviewMobile ? '2rem 1.25rem' : '3rem 2rem',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: isPreviewMobile ? '760px' : '100vh',
          }}>
            <div style={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(10px)',
              borderRadius: '16px',
              padding: isPreviewMobile ? '1.75rem 1.25rem' : '2.5rem',
              maxWidth: isPreviewMobile ? '100%' : '500px',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
            }}>
              <h2 style={{ ...titleTypography, fontSize: '2rem', fontWeight: '700', marginBottom: '0.5rem' }}>
                {config.title}
              </h2>
              <p style={{ ...descriptionTypography, fontSize: '0.9375rem', marginBottom: '2rem' }}>
                {config.description}
              </p>
              <h3 style={{ ...titleTypography, fontSize: '1.5rem', fontWeight: '700', marginBottom: '1.5rem' }}>
                {placeDetails.name}
              </h3>
              <div style={{ display: 'grid', gap: '1rem', fontSize: '0.9375rem', color: config.textColor || '#333' }}>
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
                    <a href={placeDetails.website} target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6' }}>Visit Website</a>
                  </div>
                )}
              </div>
              <a
                href={directionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Get directions to ${placeDetails.name}`}
                style={{
                  marginTop: '2rem',
                  width: '100%',
                  padding: '1rem',
                  backgroundColor: buttonStyle.backgroundColor || '#8b0000',
                  color: buttonStyle.color || '#fff',
                  border: buttonStyle.border,
                  borderRadius: buttonStyle.borderRadius || '8px',
                  fontSize: buttonStyle.fontSize || '1rem',
                  fontWeight: buttonStyle.fontWeight || '600',
                  fontFamily: buttonStyle.fontFamily,
                  textTransform: buttonStyle.textTransform,
                  boxShadow: '0 4px 12px rgba(139, 0, 0, 0.3)',
                  display: 'inline-block',
                  textAlign: 'center',
                  textDecoration: 'none',
                }}
              >
                GET DIRECTIONS
              </a>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  console.log('[Location] Component render state:', {
    isLoading,
    showLoading,
    hasConfig: !!config,
    hasPlaceDetails: !!placeDetails,
    restaurantId,
    pageId,
    configLayout: config?.layout
  });

  if (isLoading && showLoading) {
    return (
      <div style={{ padding: '4rem 1.5rem', textAlign: 'center' }}>
        <div style={{ fontSize: '1.125rem', color: '#6b7280' }}>Loading location...</div>
      </div>
    );
  }

  if (!config || !placeDetails) {
    console.log('[Location] Not rendering - missing config or place details:', {
      hasConfig: !!config,
      hasPlaceDetails: !!placeDetails,
      configEnabled: config?.enabled,
      configData: config,
      isStillLoading: isLoading
    });

    // If still loading and showLoading is false, render nothing silently
    // Otherwise, we already showed the loading state above
    return null;
  }

  console.log('[Location] Rendering location section with layout:', config.layout);
  const { bodyStyle } = getSectionTypographyStyles(config, globalStyles);

  return (
    <section
      style={{
        backgroundColor: config.bgColor || '#ffffff',
        width: '100%',
        ...bodyStyle,
      }}
    >
      {renderContent()}
    </section>
  );
}
