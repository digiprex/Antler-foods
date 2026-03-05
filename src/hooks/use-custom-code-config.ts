/**
 * Custom hooks for custom code configuration management
 * Provides data fetching and update functionality for custom code settings
 */

import { useState, useEffect } from 'react';
import type { CustomCodeConfig, CustomCodeConfigResponse } from '@/types/custom-code.types';

/**
 * Hook to fetch custom code configuration
 */
export function useCustomCodeConfig({ apiEndpoint }: { apiEndpoint: string }) {
  const [config, setConfig] = useState<CustomCodeConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(apiEndpoint);
      const data: CustomCodeConfigResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      if (data.success) {
        setConfig(data.data);
      } else {
        throw new Error(data.error || 'Failed to fetch custom code configuration');
      }
    } catch (err) {
      console.error('Error fetching custom code config:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      setConfig(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (apiEndpoint) {
      fetchConfig();
    } else {
      // If no endpoint provided (new section), set loading to false
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiEndpoint]);

  return {
    config,
    loading,
    error,
    refetch: fetchConfig,
  };
}

/**
 * Hook to update custom code configuration
 */
export function useUpdateCustomCodeConfig() {
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateCustomCode = async (config: Partial<CustomCodeConfig> & { restaurant_id: string; page_id: string; template_id?: string }) => {
    try {
      setUpdating(true);
      setError(null);

      const response = await fetch('/api/custom-code-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      const data: CustomCodeConfigResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to update custom code configuration');
      }

      return data.data;
    } catch (err) {
      console.error('Error updating custom code config:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setUpdating(false);
    }
  };

  return {
    updateCustomCode,
    updating,
    error,
  };
}
