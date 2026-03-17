/**
 * Custom React Hook for Global Style Configuration
 * 
 * This hook provides an easy way to fetch and manage global style configuration
 * from the API. It handles title, subheading, and paragraph styling.
 * 
 * @example
 * ```tsx
 * const { config, loading, error, refetch } = useGlobalStyleConfig();
 * 
 * if (loading) return <LoadingSkeleton />;
 * if (error) return <div>Error: {error}</div>;
 * 
 * return <StylePreview config={config} />;
 * ```
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import type { GlobalStyleConfig } from '@/types/global-style.types';
import { DEFAULT_GLOBAL_STYLE_CONFIG } from '@/types/global-style.types';

interface UseGlobalStyleConfigOptions {
  /**
   * API endpoint to fetch configuration from
   * @default '/api/global-style-config'
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
  overrideConfig?: Partial<GlobalStyleConfig>;
  
  /**
   * Callback when fetch succeeds
   */
  onSuccess?: (config: GlobalStyleConfig) => void;
  
  /**
   * Callback when fetch fails
   */
  onError?: (error: Error) => void;
}

interface UseGlobalStyleConfigReturn {
  /**
   * The global style configuration (merged with defaults)
   */
  config: GlobalStyleConfig | null;
  
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
  updateConfig: (updates: Partial<GlobalStyleConfig>) => void;
}

export function useGlobalStyleConfig(
  options: UseGlobalStyleConfigOptions = {}
): UseGlobalStyleConfigReturn {
  const {
    apiEndpoint = '/api/global-style-config',
    fetchOnMount = true,
    overrideConfig,
    onSuccess,
    onError,
  } = options;

  const [config, setConfig] = useState<GlobalStyleConfig | null>(null);
  const [loading, setLoading] = useState(fetchOnMount && !overrideConfig);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    // If override config is provided, use it directly
    if (overrideConfig) {
      const mergedConfig = { ...DEFAULT_GLOBAL_STYLE_CONFIG, ...overrideConfig };
      setConfig(mergedConfig);
      setLoading(false);
      onSuccess?.(mergedConfig);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const requestUrl = new URL(apiEndpoint, window.location.origin);
      requestUrl.searchParams.set('_ts', Date.now().toString());
      const response = await fetch(requestUrl.toString(), { cache: 'no-store' });

      if (!response.ok) {
        throw new Error(`API returned ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success && data.data) {
        // Merge with defaults to ensure all required fields are present
        const mergedConfig = { ...DEFAULT_GLOBAL_STYLE_CONFIG, ...data.data };
        setConfig(mergedConfig);
        onSuccess?.(mergedConfig);
      } else {
        throw new Error(data.error || 'Invalid API response structure');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('Failed to fetch global style config:', err);
      setError(errorMessage);
      
      // Fallback to default configuration
      setConfig(DEFAULT_GLOBAL_STYLE_CONFIG);
      onError?.(err instanceof Error ? err : new Error(errorMessage));
    } finally {
      setLoading(false);
    }
  }, [apiEndpoint, overrideConfig, onSuccess, onError]);

  const updateConfig = useCallback((updates: Partial<GlobalStyleConfig>) => {
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
 * Hook for updating global style configuration via API
 * 
 * @example
 * ```tsx
 * const { updateGlobalStyle, updating, error } = useUpdateGlobalStyleConfig();
 * 
 * const handleSave = async () => {
 *   await updateGlobalStyle({
 *     title: { fontSize: '3rem', color: '#000' },
 *     paragraph: { fontSize: '1.125rem' }
 *   });
 * };
 * ```
 */
export function useUpdateGlobalStyleConfig(apiEndpoint = '/api/global-style-config') {
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateGlobalStyle = useCallback(async (updates: Partial<GlobalStyleConfig>) => {
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
        throw new Error(data.error || 'Failed to update global style configuration');
      }

      return data.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('Failed to update global style config:', err);
      setError(errorMessage);
      throw err;
    } finally {
      setUpdating(false);
    }
  }, [apiEndpoint]);

  return {
    updateGlobalStyle,
    updating,
    error,
  };
}
