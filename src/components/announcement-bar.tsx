/**
 * Announcement Bar Component
 *
 * Displays the announcement bar with configurable content:
 * - Text messages
 * - Contact information (address, phone)
 * - Social media icons
 * - Customizable styling and positioning
 * - Responsive design
 */

'use client';

import { useState, useEffect } from 'react';
import type { AnnouncementBarConfig } from '@/types/announcement-bar.types';
import { SOCIAL_MEDIA_PLATFORMS } from '@/types/announcement-bar.types';
import styles from './announcement-bar.module.css';

interface AnnouncementBarProps {
  config?: AnnouncementBarConfig;
  restaurantId?: string;
  domain?: string;
}

export default function AnnouncementBar({ config, restaurantId, domain }: AnnouncementBarProps) {
  const [announcementConfig, setAnnouncementConfig] = useState<AnnouncementBarConfig | null>(config || null);
  const [loading, setLoading] = useState(!config);
  const [error, setError] = useState<string | null>(null);

  // Fetch config if not provided as prop
  useEffect(() => {
    if (!config && (restaurantId || domain)) {
      fetchAnnouncementBarConfig();
    }
  }, [config, restaurantId, domain]);

  const fetchAnnouncementBarConfig = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (restaurantId) {
        params.append('restaurant_id', restaurantId);
      }
      if (domain) {
        params.append('domain', domain);
      }

      const response = await fetch(`/api/announcement-bar-config?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      if (data.success && data.data) {
        setAnnouncementConfig(data.data);
      } else {
        // No configuration found or disabled
        setAnnouncementConfig(null);
      }
    } catch (err) {
      console.error('Error fetching announcement bar config:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      setAnnouncementConfig(null);
    } finally {
      setLoading(false);
    }
  };

  // Don't render if loading, error, disabled, or no config
  if (loading || error || !announcementConfig || !announcementConfig.isEnabled) {
    return null;
  }

  // Check if there's any content to display
  const hasText = announcementConfig.text?.trim();
  const hasAddress = announcementConfig.address?.trim();
  const hasPhone = announcementConfig.phone?.trim();
  const hasSocialMedia = announcementConfig.socialMediaIcons?.some(icon => icon.url?.trim());
  
  const hasContent = hasText || hasAddress || hasPhone || hasSocialMedia;
  
  if (!hasContent) {
    return null;
  }

  // Determine what content to show based on layout
  const showText = hasText && (
    announcementConfig.layout === 'text-only' || 
    announcementConfig.layout === 'full'
  );
  
  const showContactInfo = (hasAddress || hasPhone) && (
    announcementConfig.layout === 'contact-info' || 
    announcementConfig.layout === 'full'
  );
  
  const showSocialMedia = hasSocialMedia && (
    announcementConfig.layout === 'social-only' || 
    announcementConfig.layout === 'full'
  );

  const containerStyle: React.CSSProperties = {
    backgroundColor: announcementConfig.bgColor || '#000000',
    color: announcementConfig.textColor || '#ffffff',
    fontSize: announcementConfig.fontSize || '14px',
    fontWeight: announcementConfig.fontWeight || 'normal',
    padding: announcementConfig.padding || '8px 16px',
    position: 'relative',
    zIndex: 1000,
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: '1rem',
    minHeight: '40px',
  };

  const linkStyle: React.CSSProperties = {
    color: announcementConfig.linkColor || '#ffffff',
    textDecoration: 'none',
    transition: 'opacity 0.2s ease',
  };

  return (
    <div 
      className={`${styles.announcementBar} ${styles[announcementConfig.position || 'top']}`}
      style={containerStyle}
    >
      {/* Text Content */}
      {showText && (
        <span className={styles.text}>
          {announcementConfig.text}
        </span>
      )}

      {/* Contact Information */}
      {showContactInfo && (
        <div className={styles.contactInfo}>
          {hasAddress && (
            <span className={styles.contactItem}>
              <span className={styles.contactIcon}>📍</span>
              {announcementConfig.address}
            </span>
          )}
          {hasPhone && (
            <a 
              href={`tel:${announcementConfig.phone}`}
              style={linkStyle}
              className={styles.contactItem}
            >
              <span className={styles.contactIcon}>📞</span>
              {announcementConfig.phone}
            </a>
          )}
        </div>
      )}

      {/* Social Media Icons */}
      {showSocialMedia && (
        <div className={styles.socialMedia}>
          {announcementConfig.socialMediaIcons
            ?.filter(icon => icon.url?.trim())
            .map((icon, index) => (
              <a
                key={index}
                href={icon.url}
                target="_blank"
                rel="noopener noreferrer"
                style={linkStyle}
                className={styles.socialIcon}
                title={`Visit our ${SOCIAL_MEDIA_PLATFORMS[icon.platform]?.name || 'social media'}`}
              >
                {SOCIAL_MEDIA_PLATFORMS[icon.platform]?.icon || '🔗'}
              </a>
            ))}
        </div>
      )}
    </div>
  );
}