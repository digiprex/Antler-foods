/**
 * Dynamic Timeline Component
 *
 * Renders timeline section dynamically based on page configuration:
 * - Fetches configuration from database per page
 * - Supports multiple layouts (alternating, left, right, center)
 * - Customizable colors and styling
 */

'use client';

import { useState, useEffect } from 'react';
import type { TimelineConfig, TimelineItem } from '@/types/timeline.types';

interface DynamicTimelineProps {
  restaurantId?: string;
  pageId?: string;
  templateId?: string;
  showLoading?: boolean;
  configData?: Partial<TimelineConfig>;
}

export default function DynamicTimeline({
  restaurantId,
  pageId,
  templateId,
  showLoading = false,
  configData
}: DynamicTimelineProps) {
  const [timelineConfig, setTimelineConfig] = useState<TimelineConfig | null>((configData as TimelineConfig) || null);
  const [loading, setLoading] = useState(!configData);
  const [error, setError] = useState<string | null>(null);

  const fetchTimelineConfig = async () => {
    // If configData is provided, use it directly
    if (configData) {
      setTimelineConfig(configData as TimelineConfig);
      setLoading(false);
      return;
    }

    if (!restaurantId || !pageId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Build API URL with appropriate parameters
      let url = `/api/timeline-config?restaurant_id=${restaurantId}`;

      // If templateId is provided, use it for specific template fetch
      if (templateId) {
        url += `&template_id=${templateId}`;
        console.log('[Timeline] Fetching by template_id:', templateId);
      } else if (pageId) {
        url += `&page_id=${pageId}`;
        console.log('[Timeline] Fetching by page_id:', pageId);
      }

      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      if (data.success && data.data) {
        setTimelineConfig(data.data);
      } else {
        setTimelineConfig(null);
      }
    } catch (err) {
      console.error('Error fetching timeline config:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      setTimelineConfig(null);
    } finally {
      setLoading(false);
    }
  };

  // Fetch config
  useEffect(() => {
    fetchTimelineConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId, pageId, templateId, configData]);

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
        Loading timeline...
      </div>
    );
  }

  // Don't render if loading, error, disabled, or no config
  if (loading || error || !timelineConfig || !timelineConfig.isEnabled || timelineConfig.items.length === 0) {
    return null;
  }

  const {
    layout,
    title,
    subtitle,
    items,
    backgroundColor,
    textColor,
    accentColor,
    lineColor,
  } = timelineConfig;

  return (
    <section
      style={{
        width: '100%',
        padding: '4rem 2rem',
        backgroundColor: backgroundColor || '#ffffff',
        color: textColor || '#111827',
      }}
    >
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Section Title */}
        {title && (
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <h2 style={{
              margin: 0,
              fontSize: '2.5rem',
              fontWeight: 'bold',
              color: textColor || '#111827'
            }}>
              {title}
            </h2>
            {subtitle && (
              <p style={{
                margin: '1rem 0 0',
                fontSize: '1.25rem',
                color: textColor || '#111827',
                opacity: 0.7
              }}>
                {subtitle}
              </p>
            )}
          </div>
        )}

        {/* Timeline */}
        {layout === 'alternating' && (
          <AlternatingTimeline
            items={items}
            textColor={textColor || '#111827'}
            accentColor={accentColor || '#10b981'}
            lineColor={lineColor || '#d1d5db'}
          />
        )}

        {layout === 'left' && (
          <LeftAlignedTimeline
            items={items}
            textColor={textColor || '#111827'}
            accentColor={accentColor || '#10b981'}
            lineColor={lineColor || '#d1d5db'}
          />
        )}

        {layout === 'right' && (
          <RightAlignedTimeline
            items={items}
            textColor={textColor || '#111827'}
            accentColor={accentColor || '#10b981'}
            lineColor={lineColor || '#d1d5db'}
          />
        )}

        {layout === 'center' && (
          <CenterTimeline
            items={items}
            textColor={textColor || '#111827'}
            accentColor={accentColor || '#10b981'}
            lineColor={lineColor || '#d1d5db'}
          />
        )}
      </div>
    </section>
  );
}

// Alternating Layout Component
function AlternatingTimeline({
  items,
  textColor,
  accentColor,
  lineColor,
}: {
  items: TimelineItem[];
  textColor: string;
  accentColor: string;
  lineColor: string;
}) {
  return (
    <div style={{ position: 'relative' }}>
      {/* Center line */}
      <div style={{
        position: 'absolute',
        left: '50%',
        top: 0,
        bottom: 0,
        width: '2px',
        backgroundColor: lineColor,
        transform: 'translateX(-50%)'
      }} />

      {/* Items */}
      {items.map((item, index) => {
        const isLeft = index % 2 === 0;
        return (
          <div
            key={item.id}
            style={{
              position: 'relative',
              display: 'flex',
              justifyContent: isLeft ? 'flex-end' : 'flex-start',
              marginBottom: '3rem',
            }}
          >
            <div style={{
              width: 'calc(50% - 40px)',
              padding: '1.5rem',
              backgroundColor: 'rgba(0,0,0,0.02)',
              borderRadius: '12px',
              ...(isLeft ? { textAlign: 'right', marginRight: '40px' } : { textAlign: 'left', marginLeft: '40px' })
            }}>
              <p style={{
                margin: 0,
                fontSize: '0.875rem',
                fontWeight: '600',
                color: accentColor,
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                {item.date}
              </p>
              <h3 style={{
                margin: '0.5rem 0',
                fontSize: '1.5rem',
                fontWeight: '700',
                color: textColor
              }}>
                {item.title}
              </h3>
              <p style={{
                margin: '0.75rem 0 0',
                fontSize: '1rem',
                lineHeight: '1.6',
                color: textColor,
                opacity: 0.8
              }}>
                {item.description}
              </p>
            </div>

            {/* Center dot */}
            <div style={{
              position: 'absolute',
              left: '50%',
              top: '2rem',
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              backgroundColor: accentColor,
              border: `4px solid ${lineColor}`,
              transform: 'translate(-50%, -50%)',
              zIndex: 1,
              boxShadow: '0 0 0 4px rgba(255,255,255,0.8)'
            }} />
          </div>
        );
      })}
    </div>
  );
}

// Left Aligned Timeline Component
function LeftAlignedTimeline({
  items,
  textColor,
  accentColor,
  lineColor,
}: {
  items: TimelineItem[];
  textColor: string;
  accentColor: string;
  lineColor: string;
}) {
  return (
    <div style={{ position: 'relative', paddingLeft: '40px' }}>
      {/* Left line */}
      <div style={{
        position: 'absolute',
        left: '0',
        top: 0,
        bottom: 0,
        width: '2px',
        backgroundColor: lineColor,
      }} />

      {/* Items */}
      {items.map((item) => (
        <div
          key={item.id}
          style={{
            position: 'relative',
            marginBottom: '3rem',
            paddingLeft: '40px'
          }}
        >
          <div style={{
            padding: '1.5rem',
            backgroundColor: 'rgba(0,0,0,0.02)',
            borderRadius: '12px',
          }}>
            <p style={{
              margin: 0,
              fontSize: '0.875rem',
              fontWeight: '600',
              color: accentColor,
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              {item.date}
            </p>
            <h3 style={{
              margin: '0.5rem 0',
              fontSize: '1.5rem',
              fontWeight: '700',
              color: textColor
            }}>
              {item.title}
            </h3>
            <p style={{
              margin: '0.75rem 0 0',
              fontSize: '1rem',
              lineHeight: '1.6',
              color: textColor,
              opacity: 0.8
            }}>
              {item.description}
            </p>
          </div>

          {/* Left dot */}
          <div style={{
            position: 'absolute',
            left: '-9px',
            top: '2rem',
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            backgroundColor: accentColor,
            border: `4px solid ${lineColor}`,
            zIndex: 1,
            boxShadow: '0 0 0 4px rgba(255,255,255,0.8)'
          }} />
        </div>
      ))}
    </div>
  );
}

// Right Aligned Timeline Component
function RightAlignedTimeline({
  items,
  textColor,
  accentColor,
  lineColor,
}: {
  items: TimelineItem[];
  textColor: string;
  accentColor: string;
  lineColor: string;
}) {
  return (
    <div style={{ position: 'relative', paddingRight: '40px' }}>
      {/* Right line */}
      <div style={{
        position: 'absolute',
        right: '0',
        top: 0,
        bottom: 0,
        width: '2px',
        backgroundColor: lineColor,
      }} />

      {/* Items */}
      {items.map((item) => (
        <div
          key={item.id}
          style={{
            position: 'relative',
            marginBottom: '3rem',
            paddingRight: '40px'
          }}
        >
          <div style={{
            padding: '1.5rem',
            backgroundColor: 'rgba(0,0,0,0.02)',
            borderRadius: '12px',
            textAlign: 'right'
          }}>
            <p style={{
              margin: 0,
              fontSize: '0.875rem',
              fontWeight: '600',
              color: accentColor,
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              {item.date}
            </p>
            <h3 style={{
              margin: '0.5rem 0',
              fontSize: '1.5rem',
              fontWeight: '700',
              color: textColor
            }}>
              {item.title}
            </h3>
            <p style={{
              margin: '0.75rem 0 0',
              fontSize: '1rem',
              lineHeight: '1.6',
              color: textColor,
              opacity: 0.8
            }}>
              {item.description}
            </p>
          </div>

          {/* Right dot */}
          <div style={{
            position: 'absolute',
            right: '-9px',
            top: '2rem',
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            backgroundColor: accentColor,
            border: `4px solid ${lineColor}`,
            zIndex: 1,
            boxShadow: '0 0 0 4px rgba(255,255,255,0.8)'
          }} />
        </div>
      ))}
    </div>
  );
}

// Center Timeline Component
function CenterTimeline({
  items,
  textColor,
  accentColor,
  lineColor,
}: {
  items: TimelineItem[];
  textColor: string;
  accentColor: string;
  lineColor: string;
}) {
  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', position: 'relative', paddingLeft: '40px' }}>
      {/* Center line */}
      <div style={{
        position: 'absolute',
        left: '0',
        top: 0,
        bottom: 0,
        width: '2px',
        backgroundColor: lineColor,
      }} />

      {/* Items */}
      {items.map((item) => (
        <div
          key={item.id}
          style={{
            position: 'relative',
            marginBottom: '3rem',
            paddingLeft: '40px'
          }}
        >
          <div style={{
            padding: '1.5rem',
            backgroundColor: 'rgba(0,0,0,0.02)',
            borderRadius: '12px',
            textAlign: 'center'
          }}>
            <p style={{
              margin: 0,
              fontSize: '0.875rem',
              fontWeight: '600',
              color: accentColor,
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              {item.date}
            </p>
            <h3 style={{
              margin: '0.5rem 0',
              fontSize: '1.5rem',
              fontWeight: '700',
              color: textColor
            }}>
              {item.title}
            </h3>
            <p style={{
              margin: '0.75rem 0 0',
              fontSize: '1rem',
              lineHeight: '1.6',
              color: textColor,
              opacity: 0.8
            }}>
              {item.description}
            </p>
          </div>

          {/* Left dot */}
          <div style={{
            position: 'absolute',
            left: '-9px',
            top: '2rem',
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            backgroundColor: accentColor,
            border: `4px solid ${lineColor}`,
            zIndex: 1,
            boxShadow: '0 0 0 4px rgba(255,255,255,0.8)'
          }} />
        </div>
      ))}
    </div>
  );
}
