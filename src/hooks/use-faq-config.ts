/**
 * FAQ Configuration Hook
 * 
 * Custom hook for fetching and updating FAQ configuration from the API
 */

import { useState, useEffect, useCallback } from 'react';
import type { SectionStyleConfig } from '@/types/section-style.types';

interface FAQ {
  id: string;
  question: string;
  answer: string;
}

interface FAQConfig extends SectionStyleConfig {
  template_id?: string;
  page_id?: string;
  layout: 'list' | 'accordion' | 'grid';
  bgColor: string;
  textColor: string;
  title: string;
  subtitle: string;
  faqs: FAQ[];
  // New FAQ Card Styling options
  faqCardBgColor?: string;
  questionTextColor?: string;
  answerTextColor?: string;
  cardBorderRadius?: string;
  cardShadow?: string;
  accentColor?: string;
  hoverColor?: string;
  enableScrollAnimation?: boolean;
}

interface FAQConfigResponse {
  success: boolean;
  data: FAQConfig;
  error?: string;
}

interface UseFAQConfigProps {
  apiEndpoint?: string;
  overrideConfig?: Partial<FAQConfig>;
}

export function useFAQConfig({ apiEndpoint, overrideConfig }: UseFAQConfigProps) {
  // Initialize with overrideConfig if provided
  const [config, setConfig] = useState<FAQConfig | null>(overrideConfig as FAQConfig || null);
  const [loading, setLoading] = useState(!overrideConfig);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    // If override config is provided, use it directly
    if (overrideConfig) {
      setConfig(overrideConfig as FAQConfig);
      setLoading(false);
      return;
    }

    if (!apiEndpoint) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(apiEndpoint);

      // Treat 404 as "no configuration yet" (not an error)
      if (response.status === 404) {
        setConfig(null);
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: FAQConfigResponse = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch FAQ configuration');
      }

      setConfig(data.data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [apiEndpoint, overrideConfig]);

  useEffect(() => {
    if (!overrideConfig) {
      fetchConfig();
    }
  }, [fetchConfig, overrideConfig]);

  // Handle overrideConfig changes
  useEffect(() => {
    if (overrideConfig) {
      setConfig(overrideConfig as FAQConfig);
    }
  }, [overrideConfig]);

  const refetch = () => {
    fetchConfig();
  };

  return {
    config,
    loading,
    error,
    refetch,
  };
}

interface UpdateFAQConfigData {
  restaurant_id: string;
  page_id?: string;
  template_id?: string;
  layout: 'list' | 'accordion' | 'grid';
  bgColor: string;
  textColor: string;
  title: string;
  subtitle: string;
  faqs: FAQ[];
  is_custom?: boolean;
  buttonStyleVariant?: 'primary' | 'secondary';
  titleFontFamily?: string;
  titleFontSize?: string;
  titleFontWeight?: number;
  titleColor?: string;
  subtitleFontFamily?: string;
  subtitleFontSize?: string;
  subtitleFontWeight?: number;
  subtitleColor?: string;
  bodyFontFamily?: string;
  bodyFontSize?: string;
  bodyFontWeight?: number;
  bodyColor?: string;
  // New FAQ Card Styling options
  faqCardBgColor?: string;
  questionTextColor?: string;
  answerTextColor?: string;
  cardBorderRadius?: string;
  cardShadow?: string;
  accentColor?: string;
  hoverColor?: string;
  enableScrollAnimation?: boolean;
}

export function useUpdateFAQConfig() {
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateFAQ = async (data: UpdateFAQConfigData): Promise<FAQConfig> => {
    try {
      setUpdating(true);
      setError(null);

      const response = await fetch('/api/faq-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: FAQConfigResponse = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to update FAQ configuration');
      }

      return result.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setUpdating(false);
    }
  };

  return {
    updateFAQ,
    updating,
    error,
  };
}
