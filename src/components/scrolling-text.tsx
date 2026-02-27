/**
 * Scrolling Text Component
 *
 * Displays a horizontally scrolling text banner:
 * - Continuous left-to-right scroll animation
 * - Customizable colors and speed
 * - Responsive design
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { ScrollingTextConfig } from '@/types/scrolling-text.types';
import { SCROLL_SPEEDS } from '@/types/scrolling-text.types';
import styles from './scrolling-text.module.css';

interface ScrollingTextProps {
  config?: ScrollingTextConfig;
  restaurantId?: string;
  domain?: string;
}

export default function ScrollingText({ config, restaurantId, domain }: ScrollingTextProps) {
  const [scrollingConfig, setScrollingConfig] = useState<ScrollingTextConfig | null>(config || null);
  const [loading, setLoading] = useState(!config);
  const [error, setError] = useState<string | null>(null);
  const barRef = useRef<HTMLDivElement>(null);

  const fetchScrollingTextConfig = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (restaurantId) {
        params.append('restaurant_id', restaurantId);
      }
      if (domain) {
        params.append('domain', domain);
      }

      const response = await fetch(`/api/scrolling-text-config?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      if (data.success && data.data) {
        setScrollingConfig(data.data);
      } else {
        setScrollingConfig(null);
      }
    } catch (err) {
      console.error('Error fetching scrolling text config:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      setScrollingConfig(null);
    } finally {
      setLoading(false);
    }
  }, [restaurantId, domain]);

  // Fetch config if not provided as prop
  useEffect(() => {
    if (!config && (restaurantId || domain)) {
      fetchScrollingTextConfig();
    }
  }, [config, restaurantId, domain, fetchScrollingTextConfig]);

  // Update CSS variable for navbar positioning
  useEffect(() => {
    if (scrollingConfig && scrollingConfig.isEnabled && !loading && barRef.current) {
      const updateHeight = () => {
        if (barRef.current) {
          const height = barRef.current.offsetHeight;
          document.documentElement.style.setProperty('--scrolling-text-height', `${height}px`);
        }
      };

      const timer = setTimeout(updateHeight, 50);
      window.addEventListener('resize', updateHeight);

      return () => {
        clearTimeout(timer);
        window.removeEventListener('resize', updateHeight);
      };
    } else {
      document.documentElement.style.setProperty('--scrolling-text-height', '0px');
    }
  }, [scrollingConfig, loading]);

  // Don't render if loading, error, disabled, or no config
  if (loading || error || !scrollingConfig || !scrollingConfig.isEnabled) {
    return null;
  }

  // Don't render if no text
  if (!scrollingConfig.text?.trim()) {
    return null;
  }

  const speed = SCROLL_SPEEDS[scrollingConfig.scrollSpeed] || SCROLL_SPEEDS.medium;

  const containerStyle: React.CSSProperties = {
    backgroundColor: scrollingConfig.bgColor || '#000000',
    color: scrollingConfig.textColor || '#ffffff',
    fontSize: scrollingConfig.fontSize || '16px',
    position: 'relative',
    width: '100%',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    padding: '12px 0',
  };

  return (
    <div
      ref={barRef}
      className={styles.scrollingText}
      style={containerStyle}
    >
      <div
        className={styles.scrollingContent}
        style={{
          animationDuration: `${100 / speed}s`,
        }}
      >
        <span className={styles.scrollingItem}>{scrollingConfig.text}</span>
        <span className={styles.scrollingItem}>{scrollingConfig.text}</span>
        <span className={styles.scrollingItem}>{scrollingConfig.text}</span>
      </div>
    </div>
  );
}
