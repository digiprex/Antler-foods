/**
 * Location Layout Preview Component
 * 
 * Renders location layout previews based on JSON configuration
 */

import React from 'react';
import { getLocationLayoutPreviewStyles, getPreviewElementStyles, getPreviewContainerStyles, getLocationLayoutPreviewConfig } from '@/utils/location-layout-utils';

interface LocationLayoutPreviewProps {
  layoutValue: string;
  active?: boolean;
}

interface PreviewElement {
  type: string;
  width?: string;
  height?: string;
  flex?: number;
  centered?: boolean;
  marginTop?: string;
  elements?: PreviewElement[];
  columns?: string;
  cards?: Array<{
    icon: string;
    elements: PreviewElement[];
  }>;
  position?: string;
  fullscreen?: boolean;
  nested?: boolean;
}

interface PreviewConfig {
  layout: string;
  columns?: string;
  elements: PreviewElement[];
}

export function LocationLayoutPreview({ layoutValue, active = false }: LocationLayoutPreviewProps) {
  const styles = getLocationLayoutPreviewStyles(layoutValue, active);
  
  if (!styles.config) {
    // Fallback preview
    return <div style={styles.frameStyle}>🗺️</div>;
  }

  return (
    <div style={styles.frameStyle}>
      {/* Chrome dots */}
      <div style={styles.chromeStyle}>
        <div
          style={{
            width: '4px',
            height: '4px',
            borderRadius: '50%',
            background: '#ef4444',
          }}
        />
        <div
          style={{
            width: '4px',
            height: '4px',
            borderRadius: '50%',
            background: '#f59e0b',
          }}
        />
        <div
          style={{
            width: '4px',
            height: '4px',
            borderRadius: '50%',
            background: '#10b981',
          }}
        />
      </div>
      
      {/* Main content */}
      <div style={styles.boardStyle}>
        <PreviewElements elements={styles.config.elements} config={styles.config} active={active} />
      </div>
    </div>
  );
}

function PreviewElements({ elements, config, active }: { elements: PreviewElement[], config: PreviewConfig, active: boolean }) {
  const containerStyle: React.CSSProperties = {
    display: config.layout === 'grid' ? 'grid' : 'flex',
    flexDirection: config.layout === 'column' ? 'column' : undefined,
    gridTemplateColumns: config.columns,
    gap: config.layout === 'grid' ? '6px' : '5px',
    height: '100%',
  };

  return (
    <div style={containerStyle}>
      {elements.map((element, index) => (
        <PreviewElement key={index} element={element} active={active} />
      ))}
    </div>
  );
}

function PreviewElement({ element, active }: { element: PreviewElement, active: boolean }) {
  switch (element.type) {
    case 'address':
      return <div style={getPreviewElementStyles(element, active)} />;
      
    case 'map':
      return (
        <div style={getPreviewElementStyles(element, active)}>
          📍
        </div>
      );
      
    case 'hours':
      return <div style={getPreviewElementStyles(element, active)} />;
      
    case 'info-panel':
    case 'info-card':
    case 'hours-group':
    case 'sidebar-panel':
      return (
        <div style={getPreviewContainerStyles(element, active)}>
          {element.elements?.map((child, index) => (
            <PreviewElement key={index} element={child} active={active} />
          ))}
        </div>
      );
      
    case 'overlay-card':
      const overlayStyle: React.CSSProperties = {
        position: 'absolute',
        inset: '14px 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: element.width || 'auto',
        height: 'auto',
        margin: '0 auto',
      };

      const cardStyle: React.CSSProperties = {
        background: 'rgba(255, 255, 255, 0.92)',
        borderRadius: '8px',
        border: '1px solid rgba(255,255,255,0.7)',
        boxShadow: '0 10px 24px rgba(15, 23, 42, 0.14)',
        padding: '6px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        width: '100%',
      };

      return (
        <div style={overlayStyle}>
          <div style={cardStyle}>
            {element.elements?.map((child, index) => (
              <PreviewElement key={index} element={child} active={active} />
            ))}
          </div>
        </div>
      );
      
    case 'card-grid':
      const containerStyle: React.CSSProperties = {
        display: 'grid',
        gridTemplateColumns: element.columns || 'repeat(3, 1fr)',
        gap: '6px',
        flex: 1,
      };

      return (
        <div style={containerStyle}>
          {element.cards?.map((card, index) => {
            const cardStyle: React.CSSProperties = {
              background: '#ffffff',
              borderRadius: '8px',
              border: active ? '1px solid #e9d5ff' : '1px solid #e5e7eb',
              padding: '6px 5px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
            };

            const iconStyle: React.CSSProperties = {
              width: '22px',
              height: '22px',
              borderRadius: '7px',
              background: index === 0 ? '#d1fae5' : '#ede9fe',
            };

            return (
              <div key={index} style={cardStyle}>
                <div style={iconStyle} />
                {card.elements.map((cardElement, cardIndex) => (
                  <PreviewElement key={cardIndex} element={cardElement} active={active} />
                ))}
              </div>
            );
          })}
        </div>
      );
      
    default:
      return <div />;
  }
}