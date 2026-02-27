/**
 * Custom hooks for timeline configuration management
 * Provides data fetching and update functionality for timeline settings
 */

import { useState, useEffect, useCallback } from 'react';
import type { TimelineConfig, TimelineConfigResponse } from '@/types/timeline.types';

/**
 * Hook to fetch timeline configuration
 */
export function useTimelineConfig({ apiEndpoint }: { apiEndpoint: string }) {
  const [config, setConfig] = useState<TimelineConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(apiEndpoint);
      const data: TimelineConfigResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      if (data.success) {
        setConfig(data.data || null);
      } else {
        throw new Error(data.error || 'Failed to fetch timeline configuration');
      }
    } catch (err) {
      console.error('Error fetching timeline config:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      setConfig(null);
    } finally {
      setLoading(false);
    }
  }, [apiEndpoint]);

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
 * Hook to update timeline configuration
 */
export function useUpdateTimelineConfig() {
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateTimeline = async (config: Partial<TimelineConfig> & { restaurant_id: string; page_id: string }) => {
    try {
      setUpdating(true);
      setError(null);

      const response = await fetch('/api/timeline-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      const data: TimelineConfigResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to update timeline configuration');
      }

      return data.data;
    } catch (err) {
      console.error('Error updating timeline config:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setUpdating(false);
    }
  };

  return {
    updateTimeline,
    updating,
    error,
  };
}
