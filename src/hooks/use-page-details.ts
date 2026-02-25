/**
 * Custom hook for fetching page details and templates by URL slug
 */

import { useState, useEffect } from 'react';

export interface PageDetails {
  page_id: string;
  url_slug: string;
  name: string;
  meta_title?: string;
  meta_description?: string;
  restaurant_id: string;
  is_system_page: boolean;
  show_on_navbar: boolean;
  show_on_footer: boolean;
  keywords?: Record<string, any>;
  og_image?: string;
  published: boolean;
  created_at: string;
  updated_at: string;
}

export interface PageTemplate {
  template_id: string;
  name: string;
  config: Record<string, any>;
  menu_items?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface PageDetailsResponse {
  page: PageDetails;
  templates: Record<string, PageTemplate>;
  template_count: number;
}

export interface UsePageDetailsResult {
  data: PageDetailsResponse | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function usePageDetails(
  restaurantId: string,
  urlSlug: string,
  domain?: string
): UsePageDetailsResult {
  const [data, setData] = useState<PageDetailsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPageDetails = async () => {
    if (!restaurantId || !urlSlug) {
      setError('Restaurant ID and URL slug are required');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        restaurant_id: restaurantId,
        url_slug: urlSlug,
      });

      if (domain) {
        params.append('domain', domain);
      }

      const response = await fetch(`/api/page-details?${params.toString()}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `HTTP ${response.status}`);
      }

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch page details');
      }

      setData(result.data);
    } catch (err: any) {
      console.error('Error fetching page details:', err);
      setError(err.message || 'Failed to fetch page details');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPageDetails();
  }, [restaurantId, urlSlug, domain]);

  const refetch = () => {
    fetchPageDetails();
  };

  return {
    data,
    loading,
    error,
    refetch,
  };
}

/**
 * Helper function to get a specific template by category
 */
export function getTemplateByCategory(
  templates: Record<string, PageTemplate>,
  category: string
): PageTemplate | null {
  return templates[category] || null;
}

/**
 * Helper function to check if a template exists for a category
 */
export function hasTemplate(
  templates: Record<string, PageTemplate>,
  category: string
): boolean {
  return Boolean(templates[category]);
}