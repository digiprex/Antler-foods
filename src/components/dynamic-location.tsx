/**
 * Dynamic Location Component
 *
 * Displays configurable location information based on settings from the database
 * Supports multiple layouts and customization options
 */

'use client';

import { useEffect, useState } from 'react';
import type { LocationConfig, LocationItem } from '@/types/location.types';

interface DynamicLocationProps {
  restaurantId: string;
  pageId?: string;
  showLoading?: boolean;
}

export default function DynamicLocation({ restaurantId, pageId, showLoading = false }: DynamicLocationProps) {
  const [config, setConfig] = useState<LocationConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchLocationConfig();
  }, [restaurantId, pageId]);

  const fetchLocationConfig = async () => {
    try {
      const params = new URLSearchParams();
      if (restaurantId) params.append('restaurant_id', restaurantId);
      if (pageId) params.append('page_id', pageId);

      const response = await fetch(`/api/location-config?${params.toString()}`);
      const data = await response.json();

      if (data.success && data.data && data.data.enabled) {
        setConfig(data.data);
      }
    } catch (error) {
      console.error('Error fetching location config:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderLocationCard = (location: LocationItem) => {
    return (
      <div
        key={location.id || location.name}
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          padding: '1.5rem',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        }}
      >
        {location.image && (
          <img
            src={location.image}
            alt={location.name}
            style={{
              width: '100%',
              height: '200px',
              objectFit: 'cover',
              borderRadius: '8px',
              marginBottom: '1rem',
            }}
          />
        )}
        
        <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem', color: config?.textColor || '#000000' }}>
          {location.name}
        </h3>
        
        <div style={{ marginBottom: '1rem', color: config?.textColor || '#666666' }}>
          <p>{location.address}</p>
          <p>{location.city}, {location.state} {location.zipCode}</p>
          {location.country && <p>{location.country}</p>}
        </div>

        {location.phone && (
          <p style={{ marginBottom: '0.5rem', color: config?.textColor || '#666666' }}>
            <strong>Phone:</strong> <a href={`tel:${location.phone}`} style={{ color: '#3b82f6' }}>{location.phone}</a>
          </p>
        )}

        {location.email && (
          <p style={{ marginBottom: '0.5rem', color: config?.textColor || '#666666' }}>
            <strong>Email:</strong> <a href={`mailto:${location.email}`} style={{ color: '#3b82f6' }}>{location.email}</a>
          </p>
        )}

        {location.hours && (
          <p style={{ marginBottom: '0.5rem', color: config?.textColor || '#666666' }}>
            <strong>Hours:</strong> {location.hours}
          </p>
        )}

        {location.description && (
          <p style={{ marginTop: '1rem', color: config?.textColor || '#666666' }}>
            {location.description}
          </p>
        )}

        {config?.showDirections && (location.latitude && location.longitude) && (
          <div style={{ marginTop: '1rem' }}>
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${location.latitude},${location.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-block',
                padding: '0.5rem 1rem',
                backgroundColor: '#3b82f6',
                color: '#ffffff',
                textDecoration: 'none',
                borderRadius: '6px',
                fontSize: '0.875rem',
                fontWeight: '500',
              }}
            >
              Get Directions
            </a>
          </div>
        )}
      </div>
    );
  };

  const renderContent = () => {
    if (!config || !config.locations?.length) return null;

    const layout = config.layout || 'default';

    // Default Layout - Grid of cards
    if (layout === 'default' || layout === 'grid') {
      return (
        <div style={{ maxWidth: config.maxWidth || '1200px', margin: '0 auto', padding: '4rem 1.5rem' }}>
          {config.showTitle !== false && (config.title || config.description) && (
            <div style={{ marginBottom: '3rem', textAlign: 'center' }}>
              {config.title && (
                <h2 style={{ fontSize: '2.5rem', fontWeight: '700', color: config.textColor || '#000000', marginBottom: '1rem' }}>
                  {config.title}
                </h2>
              )}
              {config.description && (
                <p style={{ fontSize: '1.25rem', color: config.textColor || '#666666', maxWidth: '800px', margin: '0 auto' }}>
                  {config.description}
                </p>
              )}
            </div>
          )}
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '2rem',
          }}>
            {config.locations.map(renderLocationCard)}
          </div>
        </div>
      );
    }

    // List Layout - Vertical list
    if (layout === 'list') {
      return (
        <div style={{ maxWidth: config.maxWidth || '800px', margin: '0 auto', padding: '4rem 1.5rem' }}>
          {config.showTitle !== false && (config.title || config.description) && (
            <div style={{ marginBottom: '3rem', textAlign: 'center' }}>
              {config.title && (
                <h2 style={{ fontSize: '2.5rem', fontWeight: '700', color: config.textColor || '#000000', marginBottom: '1rem' }}>
                  {config.title}
                </h2>
              )}
              {config.description && (
                <p style={{ fontSize: '1.25rem', color: config.textColor || '#666666' }}>
                  {config.description}
                </p>
              )}
            </div>
          )}
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {config.locations.map(renderLocationCard)}
          </div>
        </div>
      );
    }

    // Cards Layout - Horizontal cards
    if (layout === 'cards') {
      return (
        <div style={{ maxWidth: config.maxWidth || '1400px', margin: '0 auto', padding: '4rem 1.5rem' }}>
          {config.showTitle !== false && (config.title || config.description) && (
            <div style={{ marginBottom: '3rem', textAlign: 'center' }}>
              {config.title && (
                <h2 style={{ fontSize: '2.5rem', fontWeight: '700', color: config.textColor || '#000000', marginBottom: '1rem' }}>
                  {config.title}
                </h2>
              )}
              {config.description && (
                <p style={{ fontSize: '1.25rem', color: config.textColor || '#666666' }}>
                  {config.description}
                </p>
              )}
            </div>
          )}
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
            gap: '2rem',
          }}>
            {config.locations.map(renderLocationCard)}
          </div>
        </div>
      );
    }

    return null;
  };

  if (isLoading && showLoading) {
    return (
      <div style={{ padding: '4rem 1.5rem', textAlign: 'center' }}>
        <div style={{ fontSize: '1.125rem', color: '#6b7280' }}>Loading locations...</div>
      </div>
    );
  }

  if (!config) {
    return null;
  }

  return (
    <section
      style={{
        backgroundColor: config.bgColor || '#ffffff',
        width: '100%',
      }}
    >
      {renderContent()}
    </section>
  );
}