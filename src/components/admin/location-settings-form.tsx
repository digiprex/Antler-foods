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
import Image from 'next/image';
import Toast from '@/components/ui/toast';
import type { LocationConfig } from '@/types/location.types';
import { DEFAULT_LOCATION_CONFIG } from '@/types/location.types';
import styles from './location-settings-form.module.css';


interface LocationSettingsFormProps {
  restaurantId: string;
  pageId?: string;
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

export default function LocationSettingsForm({ restaurantId, pageId }: LocationSettingsFormProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<LocationConfig>(DEFAULT_LOCATION_CONFIG);
  const [placeDetails, setPlaceDetails] = useState<PlaceDetails | null>(null);
  const [googlePlaceId, setGooglePlaceId] = useState<string>('');
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
        });

        const response = await fetch(`/api/location-config?${params}`);
        const data = await response.json();

        if (data.success) {
          setConfig(data.data);

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
  }, [restaurantId, pageId]);

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
          restaurant_id: restaurantId,
          page_id: pageId,
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
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <span style={{ marginLeft: '0.5rem' }}>Loading location settings...</span>
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
          This restaurant doesn&apos;t have a Google Place ID set. The location settings feature requires a Google Place ID to fetch and display location information.
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
      <form onSubmit={handleSubmit} className={styles.form}>
        {/* Header */}
        <div className={styles.formHeader}>
          <div>
            <h1 className={styles.formTitle}>Location Settings</h1>
            <p className={styles.formSubtitle}>
              Configure how your restaurant location is displayed
            </p>
          </div>
          <div className={styles.headerActions}>
            <button
              type="button"
              onClick={() => setShowPreviewModal(true)}
              className={styles.previewToggleButton}
              disabled={!placeDetails}
              title={placeDetails ? 'Preview Layout' : 'Preview disabled - location not loaded'}
            >
              👁️ Preview Layout
            </button>
          </div>
        </div>

        {/* Location Information */}
  

        {/* Display Settings */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>⚙️</span>
            Display Settings
          </h2>

          <div className={styles.formGroup}>
            <label className={styles.label}>
              <span>Enable Location Display</span>
              <span className={styles.labelHint}>Show location section on the page</span>
            </label>
            <input
              type="checkbox"
              checked={config.enabled || false}
              onChange={(e) => updateConfig({ enabled: e.target.checked })}
              style={{ width: '24px', height: '24px' }}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>
              <span>Section Title</span>
              <span className={styles.labelHint}>Main heading for the location section</span>
            </label>
            <input
              type="text"
              className={styles.textInput}
              value={config.title || ''}
              onChange={(e) => updateConfig({ title: e.target.value })}
              placeholder="Our Location"
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>
              <span>Description</span>
              <span className={styles.labelHint}>Brief description for the location section</span>
            </label>
            <textarea
              className={styles.textArea}
              value={config.description || ''}
              onChange={(e) => updateConfig({ description: e.target.value })}
              placeholder="Visit us at our location"
              rows={3}
            />
          </div>
        </div>

        {/* Layout Selection */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>📐</span>
            Layout Style
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            {layoutOptions.map((option) => (
              <div
                key={option.value}
                onClick={() => updateConfig({ layout: option.value as LocationConfig['layout'] })}
                style={{
                  padding: '1rem',
                  border: config.layout === option.value ? '3px solid #667eea' : '2px solid #e5e7eb',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  backgroundColor: config.layout === option.value ? '#f0f4ff' : '#fff',
                }}
              >
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem', textAlign: 'center' }}>
                  {option.icon}
                </div>
                <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.25rem', textAlign: 'center' }}>
                  {option.name}
                </h3>
                <p style={{ fontSize: '0.8125rem', color: '#6b7280', textAlign: 'center', margin: 0 }}>
                  {option.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Styling Options */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>🎨</span>
            Styling Options
          </h2>

          <div className={styles.formGroup}>
            <label className={styles.label}>
              <span>Background Color</span>
            </label>
            <input
              type="color"
              value={config.bgColor || '#ffffff'}
              onChange={(e) => updateConfig({ bgColor: e.target.value })}
              style={{ width: '100px', height: '44px', cursor: 'pointer' }}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>
              <span>Text Color</span>
            </label>
            <input
              type="color"
              value={config.textColor || '#000000'}
              onChange={(e) => updateConfig({ textColor: e.target.value })}
              style={{ width: '100px', height: '44px', cursor: 'pointer' }}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>
              <span>Maximum Width</span>
              <span className={styles.labelHint}>Maximum width of the content area</span>
            </label>
            <input
              type="text"
              className={styles.textInput}
              value={config.maxWidth || ''}
              onChange={(e) => updateConfig({ maxWidth: e.target.value })}
              placeholder="1200px"
            />
          </div>
        </div>

        {/* Save Button */}
        <div className={styles.formActions}>
          <button
            type="submit"
            className={styles.saveButton}
            disabled={saving}
          >
            {saving ? (
              <>
                <div className={styles.spinner}></div>
                Saving...
              </>
            ) : (
              <>💾 Save Location Settings</>
            )}
          </button>
        </div>
      </form>

      {/* Preview Modal */}
      {showPreviewModal && placeDetails && (
        <div className={styles.modal} onClick={() => setShowPreviewModal(false)}>
          <div
            className={styles.modalContent}
            style={{ maxWidth: '1400px', maxHeight: '90vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                Layout Preview: {layoutOptions.find(opt => opt.value === config.layout)?.name}
              </h2>
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className={styles.modalCloseButton}
              >
                ×
              </button>
            </div>

            <div className={styles.modalBody} style={{ padding: 0, overflow: 'auto' }}>
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

            <div className={styles.modalFooter}>
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className={`${styles.button} ${styles.primaryButton}`}
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
      <Image
        src={staticMapUrl}
        alt={`Map showing ${name}`}
        fill
        style={{
          objectFit: 'cover',
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
