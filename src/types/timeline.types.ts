/**
 * Timeline Types
 *
 * Type definitions for the timeline feature
 */

import type { SectionStyleConfig } from '@/types/section-style.types';

export type TimelineLayout =
  | 'vertical'
  | 'horizontal'
  | 'compact'
  | 'alternating'
  | 'left'
  | 'right'
  | 'center';

export interface TimelineItem {
  id: string;
  title: string;
  date: string;
  description: string;
  order: number;
}

export interface TimelineConfig extends SectionStyleConfig {
  restaurant_id: string;
  page_id: string;
  isEnabled: boolean;
  layout: TimelineLayout;
  title?: string;
  subtitle?: string;
  items: TimelineItem[];
  // Styling
  backgroundColor?: string;
  mobileBackgroundColor?: string;
  textColor?: string;
  mobileTextColor?: string;
  accentColor?: string;
  mobileAccentColor?: string;
  lineColor?: string;
  mobileLineColor?: string;
  cardBackgroundColor?: string;
  mobileCardBackgroundColor?: string;
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
    description: 'Items alternate between the left and right sides of the timeline.',
  },
  left: {
    name: 'Left Aligned',
    description: 'All items stay on the left side of the timeline.',
  },
  right: {
    name: 'Right Aligned',
    description: 'All items stay on the right side of the timeline.',
  },
  center: {
    name: 'Center',
    description: 'Items stay centered with the timeline in the middle.',
  },
} as const;
