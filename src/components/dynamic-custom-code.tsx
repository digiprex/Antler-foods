/**
 * Dynamic Custom Code Component
 * 
 * Fetches custom code configuration from API and renders the custom code section
 */

'use client';

import { useEffect, useState, useRef } from 'react';

interface CustomCodeConfig {
  isEnabled?: boolean;
  codeType?: 'html' | 'iframe';
  htmlCode?: string;
  cssCode?: string;
  jsCode?: string;
  iframeUrl?: string;
  iframeWidth?: string;
  iframeHeight?: string;
}

interface DynamicCustomCodeProps {
  restaurantId?: string;
  pageId?: string;
  templateId?: string;
  showLoading?: boolean;
  configData?: Partial<CustomCodeConfig>;
}

// Safe HTML renderer component
function SafeHTMLRenderer({ htmlCode, cssCode, jsCode }: { htmlCode: string; cssCode?: string; jsCode?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    
    // Clear previous content
    container.innerHTML = '';

    // Create a safe container
    const wrapper = document.createElement('div');
    wrapper.innerHTML = htmlCode;

    // Add CSS if provided
    if (cssCode) {
      const style = document.createElement('style');
      style.textContent = cssCode;
      wrapper.appendChild(style);
    }

    container.appendChild(wrapper);

    // Execute JavaScript safely (basic execution)
    if (jsCode) {
      try {
        // Create a safe execution context
        const script = document.createElement('script');
        script.textContent = `
          (function() {
            try {
              ${jsCode}
            } catch (error) {
              console.warn('Custom code execution error:', error);
            }
          })();
        `;
        container.appendChild(script);
      } catch (error) {
        console.warn('Error executing custom JavaScript:', error);
      }
    }

    // Cleanup function
    return () => {
      if (container) {
        container.innerHTML = '';
      }
    };
  }, [htmlCode, cssCode, jsCode]);

  return <div ref={containerRef} style={{ width: '100%' }} />;
}

export default function DynamicCustomCode({
  restaurantId,
  pageId,
  templateId,
  showLoading = true,
  configData
}: DynamicCustomCodeProps) {
  const [config, setConfig] = useState<CustomCodeConfig | null>(configData || null);
  const [loading, setLoading] = useState(!configData);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If configData is provided, use it directly
    if (configData) {
      setConfig(configData as CustomCodeConfig);
      setLoading(false);
      return;
    }

    const fetchConfig = async () => {
      if (!restaurantId) {
        setLoading(false);
        return;
      }

      try {
        // Build API URL with appropriate parameters
        let url = `/api/custom-code-config?restaurant_id=${restaurantId}`;

        // If templateId is provided, use it for specific template fetch
        if (templateId) {
          url += `&template_id=${templateId}`;
          console.log('[CustomCode] Fetching by template_id:', templateId);
        } else if (pageId) {
          url += `&page_id=${pageId}`;
          console.log('[CustomCode] Fetching by page_id:', pageId);
        }

        const response = await fetch(url);
        const data = await response.json();

        if (data.success && data.data) {
          setConfig(data.data);
        } else {
          setError('Failed to load custom code configuration');
        }
      } catch (err) {
        console.error('Error fetching custom code config:', err);
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, [restaurantId, pageId, templateId, configData]);

  // Show loading state
  if (loading && showLoading) {
    return (
      <div style={{
        minHeight: '200px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f9fafb'
      }}>
        <div style={{
          textAlign: 'center',
          color: '#6b7280'
        }}>
          <p>Loading custom code...</p>
        </div>
      </div>
    );
  }

  // Show error state or if disabled
  if (error || !config || !config.isEnabled) {
    return (
      <div style={{
        minHeight: '200px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f3f4f6',
        border: '2px dashed #d1d5db',
        borderRadius: '8px'
      }}>
        <div style={{
          textAlign: 'center',
          color: '#6b7280'
        }}>
          <p>💻 Custom Code (Not configured or disabled)</p>
        </div>
      </div>
    );
  }

  // Render custom code based on type
  const { codeType, htmlCode, cssCode, jsCode, iframeUrl, iframeWidth, iframeHeight } = config;

  if (codeType === 'iframe' && iframeUrl) {
    return (
      <div style={{ width: '100%', textAlign: 'center' }}>
        <iframe
          src={iframeUrl}
          width={iframeWidth || '100%'}
          height={iframeHeight || '400px'}
          style={{
            border: 'none',
            borderRadius: '8px',
            maxWidth: '100%'
          }}
          title="Custom Code iframe"
          sandbox="allow-scripts allow-same-origin allow-forms"
        />
      </div>
    );
  }

  if (codeType === 'html' && htmlCode) {
    return (
      <div style={{ width: '100%', minHeight: '100px' }}>
        <SafeHTMLRenderer
          htmlCode={htmlCode}
          cssCode={cssCode}
          jsCode={jsCode}
        />
      </div>
    );
  }

  // Fallback if no valid content
  return (
    <div style={{
      minHeight: '100px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f3f4f6',
      border: '2px dashed #d1d5db',
      borderRadius: '8px'
    }}>
      <div style={{
        textAlign: 'center',
        color: '#6b7280'
      }}>
        <p>💻 Custom Code (No content configured)</p>
      </div>
    </div>
  );
}
