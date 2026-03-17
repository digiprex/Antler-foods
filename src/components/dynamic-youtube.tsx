/**
 * Dynamic YouTube Component
 * 
 * Fetches YouTube configuration from API and renders the YouTube section
 * Similar to other Dynamic components used in page settings
 */

'use client';

import { useEffect, useState } from 'react';
import YouTubeSection from '@/components/youtube-section';
import type { YouTubeConfig } from '@/types/youtube.types';

interface DynamicYouTubeProps {
  /**
   * Restaurant ID to fetch configuration for
   */
  restaurantId?: string;

  /**
   * Page ID for page-specific configuration
   */
  pageId?: string;

  /**
   * Template ID for template-specific configuration
   */
  templateId?: string;

  /**
   * Pre-fetched YouTube configuration (skips API call)
   */
  configData?: Partial<YouTubeConfig>;

  /**
   * Whether to show loading state
   */
  showLoading?: boolean;
}

export default function DynamicYouTube({
  restaurantId,
  pageId,
  templateId,
  configData,
  showLoading = true
}: DynamicYouTubeProps) {
  const [config, setConfig] = useState<YouTubeConfig | null>(null);
  const [loading, setLoading] = useState(!configData);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If configData is provided, use it directly
    if (configData) {
      setConfig(configData as YouTubeConfig);
      setLoading(false);
      return;
    }

    // Otherwise fetch from API
    if (restaurantId) {
      fetchYouTubeConfig();
    }
  }, [restaurantId, pageId, templateId, configData]);

  const fetchYouTubeConfig = async () => {
    if (!restaurantId) return;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.append('restaurant_id', restaurantId);
      
      if (templateId) {
        params.append('template_id', templateId);
      } else if (pageId) {
        params.append('page_id', pageId);
      }

      const response = await fetch(`/api/youtube-config?${params.toString()}`);
      const data = await response.json();

      if (data.success && data.data) {
        setConfig(data.data);
      } else {
        setError(data.error || 'Failed to fetch YouTube configuration');
      }
    } catch (err) {
      console.error('Error fetching YouTube config:', err);
      setError('Failed to fetch YouTube configuration');
    } finally {
      setLoading(false);
    }
  };

  // Show loading state
  if (loading && showLoading) {
    return (
      <div style={{
        minHeight: '300px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f9fafb',
        padding: '2rem'
      }}>
        <div style={{
          textAlign: 'center',
          color: '#6b7280'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid #e5e7eb',
            borderTop: '3px solid #ef4444',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem'
          }}></div>
          <p>Loading YouTube section...</p>
        </div>
      </div>
    );
  }

  // Show error state or empty state
  if (error || !config || (!config.videoUrl && !config.secondaryVideoUrl)) {
    return (
      <div style={{
        padding: '3rem 1.5rem',
        textAlign: 'center',
        backgroundColor: '#f9fafb',
        color: '#6b7280',
        minHeight: '200px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎥</div>
        <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem', color: '#374151' }}>
          YouTube Video Section
        </h3>
        <p style={{ fontSize: '0.875rem', maxWidth: '400px', margin: '0 auto' }}>
          {error ? error : 'Configure this section to display YouTube videos'}
        </p>
      </div>
    );
  }

  // Render YouTube section with configuration
  return (
    <YouTubeSection
      restaurantId={restaurantId || ''}
      pageId={pageId}
      templateId={templateId}
      configData={config}
    />
  );
}
