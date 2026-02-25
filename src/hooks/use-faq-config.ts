/**
 * FAQ Configuration Hook
 * 
 * Custom hook for fetching and updating FAQ configuration from the API
 */

import { useState, useEffect, useCallback } from 'react';

interface FAQ {
  id: string;
  question: string;
  answer: string;
}

interface FAQConfig {
  layout: 'list' | 'accordion' | 'grid';
  bgColor: string;
  textColor: string;
  title: string;
  subtitle: string;
  faqs: FAQ[];
}

interface FAQConfigResponse {
  success: boolean;
  data: FAQConfig;
  error?: string;
}

interface UseFAQConfigProps {
  apiEndpoint: string;
}

export function useFAQConfig({ apiEndpoint }: UseFAQConfigProps) {
  const [config, setConfig] = useState<FAQConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
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
      console.error('Error fetching FAQ config:', err);
    } finally {
      setLoading(false);
    }
  }, [apiEndpoint]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

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
  layout: 'list' | 'accordion' | 'grid';
  bgColor: string;
  textColor: string;
  title: string;
  subtitle: string;
  faqs: FAQ[];
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
      console.error('Error updating FAQ config:', err);
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