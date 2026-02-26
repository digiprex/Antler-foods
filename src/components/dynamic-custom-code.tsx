/**
 * Dynamic Custom Code Component
 *
 * Renders custom code section dynamically based on page configuration:
 * - Fetches configuration from database per page
 * - Supports HTML/CSS/JS or iframe embed
 * - Safely renders custom code
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import type { CustomCodeConfig } from '@/types/custom-code.types';

interface DynamicCustomCodeProps {
  restaurantId: string;
  pageId: string;
  showLoading?: boolean;
}

// Component to render HTML/CSS/JS with proper script execution
function CustomHTMLRenderer({ htmlCode, cssCode, jsCode }: { htmlCode: string; cssCode?: string; jsCode?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const htmlContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Execute JavaScript code if provided
    if (jsCode && containerRef.current && htmlContainerRef.current) {
      // Wait for HTML to be rendered and DOM to be ready
      const timeoutId = setTimeout(() => {
        try {
          // Create a new script element
          const script = document.createElement('script');

          // Wrap the code to ensure DOM elements are available
          // Use a longer timeout to ensure HTML is fully rendered
          const wrappedCode = `
            (function() {
              // Wait a bit more to ensure DOM elements are available
              setTimeout(function() {
                try {
                  ${jsCode}
                } catch (error) {
                  console.error('Error in custom JavaScript:', error);
                }
              }, 100);
            })();
          `;

          script.textContent = wrappedCode;
          script.async = false;

          // Append to container
          if (containerRef.current) {
            containerRef.current.appendChild(script);
          }
        } catch (error) {
          console.error('Error executing custom JavaScript:', error);
        }
      }, 50); // Increased timeout to ensure HTML is rendered first

      // Cleanup: remove script on unmount
      return () => {
        clearTimeout(timeoutId);
        const scripts = containerRef.current?.getElementsByTagName('script');
        if (scripts && scripts.length > 0) {
          Array.from(scripts).forEach(script => {
            script.parentNode?.removeChild(script);
          });
        }
      };
    }
  }, [jsCode, htmlCode]);

  return (
    <div ref={containerRef} style={{ width: '100%', padding: '2rem 0' }}>
      {/* Inject CSS if provided */}
      {cssCode && <style dangerouslySetInnerHTML={{ __html: cssCode }} />}

      {/* Render HTML */}
      <div ref={htmlContainerRef} dangerouslySetInnerHTML={{ __html: htmlCode }} />
    </div>
  );
}

export default function DynamicCustomCode({
  restaurantId,
  pageId,
  showLoading = false
}: DynamicCustomCodeProps) {
  const [customCodeConfig, setCustomCodeConfig] = useState<CustomCodeConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch config
  useEffect(() => {
    fetchCustomCodeConfig();
  }, [restaurantId, pageId]);

  const fetchCustomCodeConfig = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/custom-code-config?restaurant_id=${restaurantId}&page_id=${pageId}`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      if (data.success && data.data) {
        setCustomCodeConfig(data.data);
      } else {
        setCustomCodeConfig(null);
      }
    } catch (err) {
      console.error('Error fetching custom code config:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      setCustomCodeConfig(null);
    } finally {
      setLoading(false);
    }
  };

  // Show loading state if enabled
  if (loading && showLoading) {
    return (
      <div style={{
        padding: '2rem',
        backgroundColor: '#f3f4f6',
        textAlign: 'center',
        color: '#6b7280',
        fontSize: '14px'
      }}>
        Loading custom code...
      </div>
    );
  }

  // Don't render if loading, error, disabled, or no config
  if (loading || error || !customCodeConfig || !customCodeConfig.isEnabled) {
    return null;
  }

  // HTML/CSS/JS Code Type
  if (customCodeConfig.codeType === 'html') {
    const hasCode = customCodeConfig.htmlCode?.trim();

    if (!hasCode) {
      return null;
    }

    return (
      <CustomHTMLRenderer
        htmlCode={customCodeConfig.htmlCode || ''}
        cssCode={customCodeConfig.cssCode}
        jsCode={customCodeConfig.jsCode}
      />
    );
  }

  // iframe Code Type
  if (customCodeConfig.codeType === 'iframe') {
    const hasUrl = customCodeConfig.iframeUrl?.trim();

    if (!hasUrl) {
      return null;
    }

    return (
      <div style={{
        width: '100%',
        padding: '2rem 0',
        display: 'flex',
        justifyContent: 'center',
      }}>
        <iframe
          src={customCodeConfig.iframeUrl}
          width={customCodeConfig.iframeWidth || '100%'}
          height={customCodeConfig.iframeHeight || '500px'}
          frameBorder="0"
          style={{
            border: 'none',
            maxWidth: '100%',
            display: 'block',
          }}
          title="Custom Embed Content"
          loading="lazy"
        />
      </div>
    );
  }

  return null;
}
