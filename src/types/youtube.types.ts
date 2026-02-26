/**
 * Type definitions for YouTube video configuration
 */

export interface YouTubeConfig {
  id?: string;
  restaurant_id?: string;

  // Video content
  videoUrl?: string; // Full YouTube URL or video ID
  title?: string;
  description?: string;

  // Display options
  enabled?: boolean;
  layout?: 'default' | 'theater' | 'split-left' | 'split-right' | 'background' | 'grid';
  autoplay?: boolean;
  mute?: boolean;
  loop?: boolean;
  controls?: boolean;
  showTitle?: boolean;

  // Styling
  bgColor?: string;
  textColor?: string;
  maxWidth?: string;
  aspectRatio?: '16:9' | '4:3' | '21:9';

  // Metadata
  created_at?: string;
  updated_at?: string;
}

export interface YouTubeConfigResponse {
  success: boolean;
  data: YouTubeConfig;
  error?: string;
}

export const DEFAULT_YOUTUBE_CONFIG: YouTubeConfig = {
  title: 'Watch Our Story',
  description: 'Discover what makes us special',
  videoUrl: '',
  enabled: false,
  layout: 'default',
  autoplay: false,
  mute: false,
  loop: false,
  controls: true,
  showTitle: true,
  bgColor: '#000000',
  textColor: '#ffffff',
  maxWidth: '1200px',
  aspectRatio: '16:9',
};
