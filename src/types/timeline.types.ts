/**
 * Timeline Types
 *
 * Type definitions for the timeline feature
 */

export type TimelineLayout = 'alternating' | 'left' | 'right' | 'center';

export interface TimelineItem {
  id: string;
  title: string;
  date: string;
  description: string;
  order: number;
}

export interface TimelineConfig {
  restaurant_id: string;
  page_id: string;
  isEnabled: boolean;
  layout: TimelineLayout;
  title?: string;
  subtitle?: string;
  items: TimelineItem[];
  // Styling
  backgroundColor?: string;
  textColor?: string;
  accentColor?: string;
  lineColor?: string;
}

export interface TimelineConfigResponse {
  success: boolean;
  data?: TimelineConfig;
  error?: string;
}

// Layout configurations
export const TIMELINE_LAYOUTS = {
  alternating: {
    name: 'Alternating',
    description: 'Items alternate between left and right sides',
  },
  left: {
    name: 'Left Aligned',
    description: 'All items on the left side of the timeline',
  },
  right: {
    name: 'Right Aligned',
    description: 'All items on the right side of the timeline',
  },
  center: {
    name: 'Center',
    description: 'Items centered with timeline in middle',
  },
} as const;
