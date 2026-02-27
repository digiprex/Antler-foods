/**
 * Custom hooks for announcement bar configuration management
 * Provides data fetching and update functionality for announcement bar settings
 */

import { useState, useEffect, useCallback } from 'react';
import type { AnnouncementBarConfig, AnnouncementBarConfigResponse } from '@/types/announcement-bar.types';

/**
 * Hook to fetch announcement bar configuration
 */
export function useAnnouncementBarConfig({ apiEndpoint }: { apiEndpoint: string }) {
  const [config, setConfig] = useState<AnnouncementBarConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(apiEndpoint);
      const data: AnnouncementBarConfigResponse = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }
      
      if (data.success) {
        setConfig(data.data);
      } else {
        throw new Error(data.error || 'Failed to fetch announcement bar configuration');
      }
    } catch (err) {
      console.error('Error fetching announcement bar config:', err);
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
 * Hook to update announcement bar configuration
 */
export function useUpdateAnnouncementBarConfig() {
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateAnnouncementBar = async (config: Partial<AnnouncementBarConfig> & { restaurant_id: string }) => {
    try {
      setUpdating(true);
      setError(null);

      const response = await fetch('/api/announcement-bar-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      const data: AnnouncementBarConfigResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to update announcement bar configuration');
      }

      return data.data;
    } catch (err) {
      console.error('Error updating announcement bar config:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setUpdating(false);
    }
  };

  return {
    updateAnnouncementBar,
    updating,
    error,
  };
}