/**
 * Custom React Hook for Menu Configuration
 *
 * This hook provides an easy way to fetch and manage menu configuration
 * from the API. It can be used in any component that needs menu data.
 *
 * @example
 * ```tsx
 * const { config, loading, error, refetch } = useMenuConfig();
 *
 * if (loading) return <LoadingSkeleton />;
 * if (error) return <div>Error: {error}</div>;
 *
 * return <Menu {...config} />;
 * ```
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import type { MenuConfig } from '@/types/menu.types';
import { DEFAULT_MENU_CONFIG } from '@/types/menu.types';

interface UseMenuConfigOptions {
  /**
   * API endpoint to fetch configuration from
   * @default '/api/menu-config'
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
  overrideConfig?: Partial<MenuConfig>;

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
  onSuccess?: (config: MenuConfig) => void;

  /**
   * Callback when fetch fails
   */
  onError?: (error: Error) => void;
}

interface UseMenuConfigReturn {
  /**
   * The menu configuration (merged with defaults)
   */
  config: MenuConfig | null;

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
  updateConfig: (updates: Partial<MenuConfig>) => void;
}

export function useMenuConfig(
  options: UseMenuConfigOptions = {}
): UseMenuConfigReturn {
  const {
    apiEndpoint = '/api/menu-config',
    fetchOnMount = true,
    overrideConfig,
    restaurantId,
    pageId,
    templateId,
    onSuccess,
    onError,
  } = options;

  // If overrideConfig is provided, initialize with it immediately
  const [config, setConfig] = useState<MenuConfig | null>(
    overrideConfig ? { ...DEFAULT_MENU_CONFIG, ...overrideConfig } : null
  );
  const [loading, setLoading] = useState(fetchOnMount && !overrideConfig);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    // If override config is provided, use it directly
    if (overrideConfig) {
      const mergedConfig = { ...DEFAULT_MENU_CONFIG, ...overrideConfig };
      setConfig(mergedConfig);
      setLoading(false);
      onSuccess?.(mergedConfig);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Build URL with restaurant_id and page_id if provided
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
        console.log('[useMenuConfig] Auto-detected url_slug:', urlSlug);
      }

      const response = await fetch(url.toString());

      if (!response.ok) {
        throw new Error(`API returned ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success && data.data) {
        // Merge with defaults to ensure all required fields are present
        const mergedConfig = { ...DEFAULT_MENU_CONFIG, ...data.data };
        setConfig(mergedConfig);
        onSuccess?.(mergedConfig);
      } else {
        throw new Error(data.error || 'Invalid API response structure');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('Failed to fetch menu config:', err);
      setError(errorMessage);

      // Fallback to default configuration
      setConfig(DEFAULT_MENU_CONFIG);
      onError?.(err instanceof Error ? err : new Error(errorMessage));
    } finally {
      setLoading(false);
    }
  }, [apiEndpoint, overrideConfig, restaurantId, pageId, templateId, onSuccess, onError]);

  const updateConfig = useCallback((updates: Partial<MenuConfig>) => {
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
      const mergedConfig = { ...DEFAULT_MENU_CONFIG, ...overrideConfig };
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
 * Hook for updating menu configuration via API
 *
 * @example
 * ```tsx
 * const { updateMenu, updating, error } = useUpdateMenuConfig();
 *
 * const handleSave = async () => {
 *   await updateMenu({
 *     title: "New Menu Title",
 *     layout: "grid",
 *     bgColor: "#ffffff"
 *   });
 * };
 * ```
 */
export function useUpdateMenuConfig(apiEndpoint = '/api/menu-config') {
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateMenu = useCallback(async (updates: Partial<MenuConfig>) => {
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
        throw new Error(data.error || 'Failed to update menu configuration');
      }

      return data.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('Failed to update menu config:', err);
      setError(errorMessage);
      throw err;
    } finally {
      setUpdating(false);
    }
  }, [apiEndpoint]);

  return {
    updateMenu,
    updating,
    error,
  };
}

/**
 * Hook for managing menu configuration with both fetch and update capabilities
 *
 * @example
 * ```tsx
 * const { config, loading, saving, error, updateAndSave } = useMenuManager();
 *
 * const handleSave = async (newConfig) => {
 *   await updateAndSave(newConfig);
 * };
 * ```
 */
export function useMenuManager(options: UseMenuConfigOptions = {}) {
  const { config, loading, error, refetch, updateConfig } = useMenuConfig(options);
  const { updateMenu, updating, error: updateError } = useUpdateMenuConfig(options.apiEndpoint);

  const updateAndSave = useCallback(async (updates: Partial<MenuConfig>) => {
    // Update local state immediately for optimistic updates
    updateConfig(updates);

    try {
      // Save to API
      const savedConfig = await updateMenu(updates);

      // Update local state with server response
      updateConfig(savedConfig);

      return savedConfig;
    } catch (err) {
      // Revert optimistic update on error
      await refetch();
      throw err;
    }
  }, [updateConfig, updateMenu, refetch]);

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
