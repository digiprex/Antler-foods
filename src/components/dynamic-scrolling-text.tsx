/**
 * Dynamic Scrolling Text Component
 * 
 * Fetches scrolling text configuration from API and renders the scrolling text section
 */

'use client';

import { useEffect, useState } from 'react';

interface ScrollingTextConfig {
  isEnabled?: boolean;
  text?: string;
  backgroundColor?: string;
  textColor?: string;
  speed?: string;
}

interface DynamicScrollingTextProps {
  restaurantId?: string;
  pageId?: string;
  showLoading?: boolean;
}

export default function DynamicScrollingText({
  restaurantId,
  pageId,
  showLoading = true
}: DynamicScrollingTextProps) {
  const [config, setConfig] = useState<ScrollingTextConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchConfig = async () => {
      if (!restaurantId) {
        setLoading(false);
        return;
      }

      try {
        const url = pageId 
          ? `/api/scrolling-text-config?restaurant_id=${restaurantId}&page_id=${pageId}`
          : `/api/scrolling-text-config?restaurant_id=${restaurantId}`;
        
        const response = await fetch(url);
        const data = await response.json();

        if (data.success && data.data) {
          setConfig(data.data);
        } else {
          setError('Failed to load scrolling text configuration');
        }
      } catch (err) {
        console.error('Error fetching scrolling text config:', err);
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, [restaurantId, pageId]);

  // Show loading state
  if (loading && showLoading) {
    return (
      <div style={{
        minHeight: '60px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f9fafb'
      }}>
        <div style={{
          textAlign: 'center',
          color: '#6b7280'
        }}>
          <p>Loading scrolling text...</p>
        </div>
      </div>
    );
  }

  // Show error state or if disabled
  if (error || !config || !config.isEnabled) {
    return (
      <div style={{
        minHeight: '60px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f3f4f6',
        border: '2px dashed #d1d5db',
        borderRadius: '8px'
      }}>
        <div style={{
          textAlign: 'center',
          color: '#6b7280'
        }}>
          <p>📜 Scrolling Text (Not configured or disabled)</p>
        </div>
      </div>
    );
  }

  // Render scrolling text
  const {
    text = 'Sample scrolling text',
    backgroundColor = '#000000',
    textColor = '#ffffff',
    speed = 'medium'
  } = config;

  const getAnimationDuration = () => {
    switch (speed) {
      case 'slow': return '20s';
      case 'fast': return '8s';
      default: return '12s';
    }
  };

  return (
    <div
      style={{
        backgroundColor,
        color: textColor,
        padding: '12px 0',
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        position: 'relative'
      }}
    >
      <div
        style={{
          display: 'inline-block',
          animation: `scroll-left ${getAnimationDuration()} linear infinite`,
          paddingLeft: '100%'
        }}
      >
        {text}
      </div>
      
      <style jsx>{`
        @keyframes scroll-left {
          0% {
            transform: translate3d(100%, 0, 0);
          }
          100% {
            transform: translate3d(-100%, 0, 0);
          }
        }
      `}</style>
    </div>
  );
}
