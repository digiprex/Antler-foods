/**
 * Custom React Hook for Hero Configuration
 * 
 * This hook provides an easy way to fetch and manage hero configuration
 * from the API. It can be used in any component that needs hero data.
 * 
 * @example
 * ```tsx
 * const { config, loading, error, refetch } = useHeroConfig();
 * 
 * if (loading) return <LoadingSkeleton />;
 * if (error) return <div>Error: {error}</div>;
 * 
 * return <Hero {...config} />;
 * ```
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import type { HeroConfig } from '@/types/hero.types';
import { DEFAULT_HERO_CONFIG } from '@/types/hero.types';
import { mergeHeroConfig } from '@/lib/hero-config';

interface UseHeroConfigOptions {
  /**
   * API endpoint to fetch configuration from
   * @default '/api/hero-config'
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
  overrideConfig?: Partial<HeroConfig>;
  
  /**
   * Restaurant ID to fetch configuration for
   */
  restaurantId?: string;

  /**
   * Page ID to fetch configuration for
   */
  pageId?: string;

  /**
   * Template ID to fetch a specific section instance
   */
  templateId?: string;
  
  /**
   * Callback when fetch succeeds
   */
  onSuccess?: (config: HeroConfig) => void;
  
  /**
   * Callback when fetch fails
   */
  onError?: (error: Error) => void;
}

interface UseHeroConfigReturn {
  /**
   * The hero configuration (merged with defaults)
   */
  config: HeroConfig | null;
  
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
  updateConfig: (updates: Partial<HeroConfig>) => void;
}

export function useHeroConfig(
  options: UseHeroConfigOptions = {}
): UseHeroConfigReturn {
  const {
    apiEndpoint = '/api/hero-config',
    fetchOnMount = true,
    overrideConfig,
    restaurantId,
    pageId,
    templateId,
    onSuccess,
    onError,
  } = options;

  // If overrideConfig is provided, initialize with it immediately
  const [config, setConfig] = useState<HeroConfig | null>(
    overrideConfig ? mergeHeroConfig(overrideConfig) : null
  );
  const [loading, setLoading] = useState(fetchOnMount && !overrideConfig);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    // If override config is provided, use it directly
    if (overrideConfig) {
      const mergedConfig = mergeHeroConfig(overrideConfig);
      setConfig(mergedConfig);
      setLoading(false);
      onSuccess?.(mergedConfig);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Build URL with restaurant_id if provided
      const url = new URL(apiEndpoint, window.location.origin);
      if (restaurantId) {
        url.searchParams.set('restaurant_id', restaurantId);
      }
      if (templateId) {
        url.searchParams.set('template_id', templateId);
      } else if (pageId) {
        url.searchParams.set('page_id', pageId);
      }
      
      // Automatically detect URL slug from current page
      const currentPath = window.location.pathname;
      const pathSegments = currentPath.split('/').filter(Boolean);
      if (pathSegments.length > 0) {
        const urlSlug = pathSegments[pathSegments.length - 1];
        url.searchParams.set('url_slug', urlSlug);
        console.log('[useHeroConfig] Auto-detected url_slug:', urlSlug);
      }

      const response = await fetch(url.toString());

      if (!response.ok) {
        throw new Error(`API returned ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success && data.data) {
        const mergedConfig = mergeHeroConfig(data.data);
        setConfig(mergedConfig);
        onSuccess?.(mergedConfig);
      } else {
        throw new Error(data.error || 'Invalid API response structure');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('Failed to fetch hero config:', err);
      setError(errorMessage);
      
      // Fallback to default configuration
      setConfig(mergeHeroConfig(DEFAULT_HERO_CONFIG));
      onError?.(err instanceof Error ? err : new Error(errorMessage));
    } finally {
      setLoading(false);
    }
  }, [apiEndpoint, overrideConfig, restaurantId, pageId, templateId, onSuccess, onError]);

  const updateConfig = useCallback((updates: Partial<HeroConfig>) => {
    setConfig(prev => prev ? { ...prev, ...updates } : null);
  }, []);

  useEffect(() => {
    if (fetchOnMount) {
      fetchConfig();
    }
  }, [fetchOnMount, fetchConfig]);

  // Handle overrideConfig changes
  useEffect(() => {
    if (overrideConfig) {
      const mergedConfig = mergeHeroConfig(overrideConfig);
      setConfig(mergedConfig);
      onSuccess?.(mergedConfig);
    }
  }, [overrideConfig, onSuccess]);

  return {
    config,
    loading,
    error,
    refetch: fetchConfig,
    updateConfig,
  };
}

/**
 * Hook for updating hero configuration via API
 * 
 * @example
 * ```tsx
 * const { updateHero, updating, error } = useUpdateHeroConfig();
 * 
 * const handleSave = async () => {
 *   await updateHero({
 *     headline: "New Headline",
 *     layout: "centered-large",
 *     bgColor: "#ffffff"
 *   });
 * };
 * ```
 */
export function useUpdateHeroConfig(apiEndpoint = '/api/hero-config') {
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateHero = useCallback(async (updates: Partial<HeroConfig>) => {
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
        throw new Error(data.error || 'Failed to update hero configuration');
      }

      return data.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('Failed to update hero config:', err);
      setError(errorMessage);
      throw err;
    } finally {
      setUpdating(false);
    }
  }, [apiEndpoint]);

  return {
    updateHero,
    updating,
    error,
  };
}

/**
 * Hook for managing hero configuration with both fetch and update capabilities
 * 
 * @example
 * ```tsx
 * const { config, loading, saving, error, updateAndSave } = useHeroManager();
 * 
 * const handleSave = async (newConfig) => {
 *   await updateAndSave(newConfig);
 * };
 * ```
 */
export function useHeroManager(options: UseHeroConfigOptions = {}) {
  const { config, loading, error, refetch, updateConfig } = useHeroConfig(options);
  const { updateHero, updating, error: updateError } = useUpdateHeroConfig(options.apiEndpoint);

  const updateAndSave = useCallback(async (updates: Partial<HeroConfig>) => {
    // Update local state immediately for optimistic updates
    updateConfig(updates);
    
    try {
      // Save to API
      const savedConfig = await updateHero(updates);
      
      // Update local state with server response
      updateConfig(savedConfig);
      
      return savedConfig;
    } catch (err) {
      // Revert optimistic update on error
      await refetch();
      throw err;
    }
  }, [updateConfig, updateHero, refetch]);

  return {
    config,
    loading,
    saving: updating,
    error: error || updateError,
    refetch,
    updateConfig,
    updateAndSave,
  };
}
