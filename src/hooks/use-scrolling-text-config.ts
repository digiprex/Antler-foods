/**
 * Custom hooks for scrolling text configuration management
 * Provides data fetching and update functionality for scrolling text settings
 */

import { useState, useEffect } from 'react';
import type { ScrollingTextConfig, ScrollingTextConfigResponse } from '@/types/scrolling-text.types';

/**
 * Hook to fetch scrolling text configuration
 */
export function useScrollingTextConfig({ apiEndpoint }: { apiEndpoint: string }) {
  const [config, setConfig] = useState<ScrollingTextConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(apiEndpoint);
      const data: ScrollingTextConfigResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      if (data.success) {
        setConfig(data.data);
      } else {
        throw new Error(data.error || 'Failed to fetch scrolling text configuration');
      }
    } catch (err) {
      console.error('Error fetching scrolling text config:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      setConfig(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (apiEndpoint) {
      fetchConfig();
    }
  }, [apiEndpoint, fetchConfig]);

  return {
    config,
    loading,
    error,
    refetch: fetchConfig,
  };
}

/**
 * Hook to update scrolling text configuration
 */
export function useUpdateScrollingTextConfig() {
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateScrollingText = async (config: Partial<ScrollingTextConfig> & { restaurant_id: string; page_id: string; template_id?: string | null }) => {
    try {
      setUpdating(true);
      setError(null);

      const response = await fetch('/api/scrolling-text-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      const data: ScrollingTextConfigResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to update scrolling text configuration');
      }

      return data.data;
    } catch (err) {
      console.error('Error updating scrolling text config:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setUpdating(false);
    }
  };

  return {
    updateScrollingText,
    updating,
    error,
  };
}
