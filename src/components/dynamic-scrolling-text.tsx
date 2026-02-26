/**
 * Dynamic Scrolling Text Component
 *
 * Displays scrolling text banner dynamically based on page configuration:
 * - Fetches configuration from database per page
 * - Continuous left-to-right scroll animation
 * - Customizable colors and speed
 * - Responsive design
 */

'use client';

import { useState, useEffect } from 'react';
import type { ScrollingTextConfig } from '@/types/scrolling-text.types';
import { SCROLL_SPEEDS } from '@/types/scrolling-text.types';
import styles from './scrolling-text.module.css';

interface DynamicScrollingTextProps {
  restaurantId: string;
  pageId: string;
  showLoading?: boolean;
}

export default function DynamicScrollingText({
  restaurantId,
  pageId,
  showLoading = false
}: DynamicScrollingTextProps) {
  const [scrollingConfig, setScrollingConfig] = useState<ScrollingTextConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch config
  useEffect(() => {
    fetchScrollingTextConfig();
  }, [restaurantId, pageId]);

  const fetchScrollingTextConfig = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/scrolling-text-config?restaurant_id=${restaurantId}&page_id=${pageId}`
      );
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
  };

  // Show loading state if enabled
  if (loading && showLoading) {
    return (
      <div style={{
        padding: '12px 0',
        backgroundColor: '#f3f4f6',
        textAlign: 'center',
        color: '#6b7280',
        fontSize: '14px'
      }}>
        Loading scrolling text...
      </div>
    );
  }

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
