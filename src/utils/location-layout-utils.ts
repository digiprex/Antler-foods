/**
 * Location Layout Utilities
 *
 * Provides utility functions to access location layout configurations from JSON
 */

import React from 'react';
import locationLayoutsData from '@/data/location-layouts.json';
import type { LocationConfig } from '@/types/location.types';

export type LocationLayoutValue = NonNullable<LocationConfig['layout']>;

interface LocationLayoutOption {
  value: LocationLayoutValue;
  name: string;
  description: string;
  icon: string;
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

/**
 * Get all location layout options formatted for form usage
 */
export function getLocationLayoutOptions(): LocationLayoutOption[] {
  return locationLayoutsData.layouts.map(layout => ({
    value: layout.id as LocationLayoutValue,
    name: layout.name,
    description: layout.description,
    icon: layout.icon,
  }));
}

/**
 * Get a specific location layout by ID
 */
export function getLocationLayoutById(layoutId: LocationLayoutValue): LocationLayoutOption | undefined {
  const layout = locationLayoutsData.layouts.find(layout => layout.id === layoutId);
  if (!layout) return undefined;

  return {
    value: layout.id as LocationLayoutValue,
    name: layout.name,
    description: layout.description,
    icon: layout.icon,
  };
}

/**
 * Get location layout name by ID
 */
export function getLocationLayoutName(layoutId: LocationLayoutValue): string {
  const layout = getLocationLayoutById(layoutId);
  return layout?.name || layoutId;
}

/**
 * Get location layout description by ID
 */
export function getLocationLayoutDescription(layoutId: LocationLayoutValue): string {
  const layout = getLocationLayoutById(layoutId);
  return layout?.description || '';
}

/**
 * Get location layout support text by ID
 */
export function getLocationLayoutSupportText(layoutId: LocationLayoutValue): string {
  const layout = locationLayoutsData.layouts.find(layout => layout.id === layoutId);
  return layout?.supportText || '';
}

/**
 * Get all layout support texts as a record
 */
export function getLocationLayoutSupportTexts(): Record<string, string> {
  const supportTexts: Record<string, string> = {};
  locationLayoutsData.layouts.forEach(layout => {
    supportTexts[layout.id] = layout.supportText;
  });
  return supportTexts;
}

/**
 * Check if a layout ID is valid
 */
export function isValidLocationLayout(layoutId: string): layoutId is LocationLayoutValue {
  return locationLayoutsData.layouts.some(layout => layout.id === layoutId);
}

/**
 * Get preview configuration for a layout
 */
export function getLocationLayoutPreviewConfig(layoutId: LocationLayoutValue): PreviewConfig | undefined {
  const layout = locationLayoutsData.layouts.find(layout => layout.id === layoutId);
  return layout?.previewConfig as PreviewConfig | undefined;
}

/**
 * Generate preview styles from JSON configuration
 */
export function getLocationLayoutPreviewStyles(layoutValue: string, active = false) {
  const previewConfig = getLocationLayoutPreviewConfig(layoutValue as LocationLayoutValue);
  
  if (!previewConfig) {
    return getFallbackPreviewStyles(active);
  }

  return {
    frameStyle: {
      position: 'relative' as const,
      height: '130px',
      borderRadius: '18px',
      overflow: 'hidden',
      border: active
        ? '1px solid rgba(167, 139, 250, 0.55)'
        : '1px solid #dbe3ec',
      background: active
        ? 'linear-gradient(180deg, #ffffff 0%, #faf5ff 100%)'
        : 'linear-gradient(180deg, #fdfefe 0%, #f7f9fc 100%)',
      boxShadow: active
        ? '0 18px 36px rgba(124, 58, 237, 0.14)'
        : '0 12px 26px rgba(15, 23, 42, 0.07)',
    },
    boardStyle: {
      position: 'absolute' as const,
      inset: '44px 10px 10px',
      overflow: 'hidden',
      borderRadius: '12px',
      background: active ? '#f8f5ff' : '#f3f6f8',
      border: active ? '1px solid #eadcff' : '1px solid #edf2f6',
      padding: '8px',
    },
    chromeStyle: {
      position: 'absolute' as const,
      top: 0,
      left: 0,
      right: 0,
      height: '18px',
      borderBottom: '1px solid #e5e9f0',
      background: '#ffffff',
      display: 'flex',
      alignItems: 'center',
      padding: '0 8px',
      gap: '4px',
    },
    config: previewConfig,
    active
  };
}

/**
 * Get element styles for preview rendering
 */
export function getPreviewElementStyles(element: PreviewElement, active: boolean) {
  switch (element.type) {
    case 'address':
      return {
        background: active ? '#7c3aed' : '#9ca3af',
        borderRadius: '999px',
        width: element.width || '100%',
        height: element.height || '10px',
        opacity: active ? 0.72 : 1,
        margin: element.centered ? '0 auto' : undefined,
        marginTop: element.marginTop,
      };
    case 'map':
      return {
        background: 'linear-gradient(135deg, #a7f3d0 0%, #6ee7b7 100%)',
        borderRadius: '6px',
        height: element.height || '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '16px',
        flex: element.flex,
      };
    case 'hours':
      return {
        background: active ? '#d8b4fe' : '#d1d5db',
        borderRadius: '999px',
        width: element.width || '100%',
        height: element.height || '8px',
        opacity: active ? 0.84 : 1,
        marginTop: element.marginTop,
      };
    default:
      return {};
  }
}

/**
 * Get container styles for preview rendering
 */
export function getPreviewContainerStyles(element: PreviewElement, active: boolean): React.CSSProperties {
  let containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    height: '100%',
    marginTop: element.marginTop,
  };

  if (element.type === 'info-card') {
    containerStyle = {
      ...containerStyle,
      background: '#ffffff',
      borderRadius: '8px',
      border: active ? '1px solid #e9d5ff' : '1px solid #e5e7eb',
      padding: '6px',
    };

    if (element.nested) {
      containerStyle.border = active ? '1px solid #d8b4fe' : '1px solid #e5e7eb';
    }
  }

  if (element.type === 'sidebar-panel') {
    containerStyle = {
      ...containerStyle,
      background: '#f8fafc',
      borderRadius: '8px',
      border: '1px solid #e5e7eb',
      padding: '5px',
    };
  }

  return containerStyle;
}

/**
 * Get fallback preview styles
 */
function getFallbackPreviewStyles(active: boolean) {
  return {
    frameStyle: {
      position: 'relative' as const,
      height: '130px',
      borderRadius: '18px',
      overflow: 'hidden',
      border: active
        ? '1px solid rgba(167, 139, 250, 0.55)'
        : '1px solid #dbe3ec',
      background: active
        ? 'linear-gradient(180deg, #ffffff 0%, #faf5ff 100%)'
        : 'linear-gradient(180deg, #fdfefe 0%, #f7f9fc 100%)',
      boxShadow: active
        ? '0 18px 36px rgba(124, 58, 237, 0.14)'
        : '0 12px 26px rgba(15, 23, 42, 0.07)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '2rem',
    },
    config: null,
    active
  };
}
