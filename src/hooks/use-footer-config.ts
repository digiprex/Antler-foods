/**
 * Custom React Hook for Footer Configuration
 *
 * This hook provides an easy way to fetch and manage footer configuration
 * from the API. It can be used in any component that needs footer data.
 *
 * @example
 * ```tsx
 * const { config, loading, error, refetch } = useFooterConfig();
 *
 * if (loading) return <LoadingSkeleton />;
 * if (error) return <div>Error: {error}</div>;
 *
 * return <Footer {...config} />;
 * ```
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import type { FooterConfig } from '@/types/footer.types';
import { DEFAULT_FOOTER_CONFIG } from '@/types/footer.types';

interface UseFooterConfigOptions {
  /**
   * API endpoint to fetch configuration from
   * @default '/api/footer-config'
   */
  apiEndpoint?: string;

  /**
   * Whether to fetch on mount
   * @default true
   */
  fetchOnMount?: boolean;

  /**
   * Override configuration (skips API call if provided)
   */
  overrideConfig?: Partial<FooterConfig>;

  /**
   * Callback when fetch succeeds
   */
  onSuccess?: (config: FooterConfig) => void;

  /**
   * Callback when fetch fails
   */
  onError?: (error: Error) => void;
}

interface UseFooterConfigReturn {
  /**
   * The footer configuration (merged with defaults)
   */
  config: FooterConfig | null;

  /**
   * Whether the configuration is currently being fetched
   */
  loading: boolean;

  /**
   * Error message if fetch failed
   */
  error: string | null;

  /**
   * Function to manually refetch the configuration
   */
  refetch: () => Promise<void>;

  /**
   * Function to update the configuration locally
   */
  updateConfig: (updates: Partial<FooterConfig>) => void;
}

export function useFooterConfig(
  options: UseFooterConfigOptions = {}
): UseFooterConfigReturn {
  const {
    apiEndpoint = '/api/footer-config',
    fetchOnMount = true,
    overrideConfig,
    onSuccess,
    onError,
  } = options;

  const [config, setConfig] = useState<FooterConfig | null>(null);
  const [loading, setLoading] = useState(fetchOnMount && !overrideConfig);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    // If override config is provided, use it directly
    if (overrideConfig) {
      const mergedConfig = { ...DEFAULT_FOOTER_CONFIG, ...overrideConfig };
      setConfig(mergedConfig);
      setLoading(false);
      onSuccess?.(mergedConfig);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(apiEndpoint);

      if (!response.ok) {
        throw new Error(`API returned ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success && data.data) {
        // Merge with defaults to ensure all required fields are present
        const mergedConfig = { ...DEFAULT_FOOTER_CONFIG, ...data.data };
        setConfig(mergedConfig);
        onSuccess?.(mergedConfig);
      } else {
        throw new Error(data.error || 'Invalid API response structure');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('Failed to fetch footer config:', err);
      setError(errorMessage);

      // Fallback to default configuration
      setConfig(DEFAULT_FOOTER_CONFIG);
      onError?.(err instanceof Error ? err : new Error(errorMessage));
    } finally {
      setLoading(false);
    }
  }, [apiEndpoint, overrideConfig, onSuccess, onError]);

  const updateConfig = useCallback((updates: Partial<FooterConfig>) => {
    setConfig(prev => prev ? { ...prev, ...updates } : null);
  }, []);

  useEffect(() => {
    if (fetchOnMount) {
      fetchConfig();
    }
  }, [fetchOnMount, fetchConfig]);

  return {
    config,
    loading,
    error,
    refetch: fetchConfig,
    updateConfig,
  };
}

/**
 * Hook for updating footer configuration via API
 *
 * @example
 * ```tsx
 * const { updateFooter, updating, error } = useUpdateFooterConfig();
 *
 * const handleSave = async () => {
 *   await updateFooter({
 *     restaurantName: "New Name",
 *     email: "new@email.com"
 *   });
 * };
 * ```
 */
export function useUpdateFooterConfig(apiEndpoint = '/api/footer-config') {
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateFooter = useCallback(async (updates: Partial<FooterConfig>) => {
    setUpdating(true);
    setError(null);

    try {
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error(`API returned ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to update footer configuration');
      }

      return data.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('Failed to update footer config:', err);
      setError(errorMessage);
      throw err;
    } finally {
      setUpdating(false);
    }
  }, [apiEndpoint]);

  return {
    updateFooter,
    updating,
    error,
  };
}
