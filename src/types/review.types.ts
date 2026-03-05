/**
 * Type definitions for dynamic review section configuration
 */

export interface Review {
  review_id: string;
  restaurant_id: string;
  source: string;
  external_review_id?: string | null;
  rating: number;
  author_name?: string | null;
  review_text?: string | null;
  author_url?: string | null;
  review_url?: string | null;
  published_at?: string | null;
  is_hidden: boolean;
  created_by_user_id?: string | null;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  avatar_url?: string | null;
  avatar_file_id?: string | null;
}

export interface ReviewConfig {
  id?: string;
  restaurant_id?: string;
  page_id?: string | null;
  template_id?: string | null;

  // Content
  title?: string;
  subtitle?: string;
  description?: string;

  // Display options
  layout?: 'grid' | 'masonry' | 'slider' | 'list';
  columns?: 2 | 3 | 4;
  showAvatar?: boolean;
  showRating?: boolean;
  showDate?: boolean;
  showSource?: boolean;
  maxReviews?: number;

  // Styling
  bgColor?: string;
  textColor?: string;
  cardBgColor?: string;
  starColor?: string;
  padding?: string;
  maxWidth?: string;
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

  // Metadata
  created_at?: string;
  updated_at?: string;
}

export interface ReviewConfigResponse {
  success: boolean;
  data: ReviewConfig;
  error?: string;
}

export const DEFAULT_REVIEW_CONFIG: ReviewConfig = {
  title: '',
  subtitle: '',
  description: '',
  layout: 'grid',
  columns: 3,
  showAvatar: true,
  showRating: true,
  showDate: true,
  showSource: true,
  maxReviews: 6,
  bgColor: '#f9fafb',
  textColor: '#000000',
  cardBgColor: '#ffffff',
  starColor: '#fbbf24',
  padding: '4rem 2rem',
  maxWidth: '1200px',
  is_custom: false,
  buttonStyleVariant: 'primary',
  titleFontFamily: 'Inter, system-ui, sans-serif',
  titleFontSize: '2.25rem',
  titleFontWeight: 700,
  titleColor: '#111827',
  subtitleFontFamily: 'Inter, system-ui, sans-serif',
  subtitleFontSize: '1.5rem',
  subtitleFontWeight: 600,
  subtitleColor: '#374151',
  bodyFontFamily: 'Inter, system-ui, sans-serif',
  bodyFontSize: '1rem',
  bodyFontWeight: 400,
  bodyColor: '#6b7280',
};
