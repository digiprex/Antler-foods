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

import { useState, useEffect, useRef } from 'react';
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
  const barRef = useRef<HTMLDivElement>(null);
  const [currentContactIndex, setCurrentContactIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  // Fetch config if not provided as prop
  useEffect(() => {
    if (!config && (restaurantId || domain)) {
      fetchAnnouncementBarConfig();
    }
  }, [config, restaurantId, domain]);

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Auto carousel for contact information on mobile
  useEffect(() => {
    if (!isMobile || !announcementConfig) return;

    // Count available contact items
    const hasAddress = (announcementConfig.showAddress !== false) && announcementConfig.address?.trim();
    const hasPhone = (announcementConfig.showPhone !== false) && announcementConfig.phone?.trim();
    const hasEmail = (announcementConfig.showEmail !== false) && announcementConfig.email?.trim();

    const contactItems = [hasAddress, hasPhone, hasEmail].filter(Boolean);

    if (contactItems.length <= 1) return; // No need for carousel if only one item

    const interval = setInterval(() => {
      setCurrentContactIndex((prev) => (prev + 1) % contactItems.length);
    }, 3000); // Change every 3 seconds

    return () => clearInterval(interval);
  }, [isMobile, announcementConfig]);

  // Update CSS variable when component renders with data and handle resize
  useEffect(() => {
    if (announcementConfig && announcementConfig.isEnabled && !loading && barRef.current) {
      const updateHeight = () => {
        if (barRef.current) {
          const height = barRef.current.offsetHeight;
          document.documentElement.style.setProperty('--announcement-bar-height', `${height}px`);
        }
      };

      // Initial measurement after a short delay
      const timer = setTimeout(updateHeight, 50);

      // Listen for window resize
      window.addEventListener('resize', updateHeight);

      return () => {
        clearTimeout(timer);
        window.removeEventListener('resize', updateHeight);
      };
    } else {
      // Reset if bar is not showing
      document.documentElement.style.setProperty('--announcement-bar-height', '0px');
    }
  }, [announcementConfig, loading]);

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

  // Check if there's any content to display based on visibility settings
  const hasText = announcementConfig.text?.trim();
  const hasAddress = (announcementConfig.showAddress !== false) && announcementConfig.address?.trim();
  const hasPhone = (announcementConfig.showPhone !== false) && announcementConfig.phone?.trim();
  const hasEmail = (announcementConfig.showEmail !== false) && announcementConfig.email?.trim();
  const hasSocialMedia = (announcementConfig.showSocialMedia !== false) && announcementConfig.socialMediaIcons?.some(icon => icon.url?.trim());

  const hasContent = hasText || hasAddress || hasPhone || hasEmail || hasSocialMedia;

  if (!hasContent) {
    return null;
  }

  // Determine what content to show based on layout
  const showText = hasText && (
    announcementConfig.layout === 'text-only' ||
    announcementConfig.layout === 'full'
  );

  const showContactInfo = (hasAddress || hasPhone || hasEmail) && (
    announcementConfig.layout === 'contact-info' ||
    announcementConfig.layout === 'contact-social' ||
    announcementConfig.layout === 'full'
  );

  const showSocialMedia = hasSocialMedia && (
    announcementConfig.layout === 'social-only' ||
    announcementConfig.layout === 'contact-social' ||
    announcementConfig.layout === 'full'
  );

  const containerStyle: React.CSSProperties = {
    backgroundColor: announcementConfig.bgColor || '#000000',
    color: announcementConfig.textColor || '#ffffff',
    fontFamily: announcementConfig.fontFamily || 'Inter, system-ui, sans-serif',
    fontSize: announcementConfig.fontSize || '14px',
    fontWeight: announcementConfig.fontWeight || 400,
    textTransform: announcementConfig.textTransform || 'none',
    padding: announcementConfig.padding || '8px 16px',
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1100, // Higher than navbar to ensure it appears on top
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

  // Prepare contact items for carousel
  const contactItems = [];
  if (hasAddress) {
    contactItems.push({
      type: 'address',
      content: (
        <span className={styles.contactItem} key="address">
          <span className={styles.contactIcon}>📍</span>
          {announcementConfig.address}
        </span>
      )
    });
  }
  if (hasPhone) {
    contactItems.push({
      type: 'phone',
      content: (
        <a
          href={`tel:${announcementConfig.phone}`}
          style={linkStyle}
          className={styles.contactItem}
          key="phone"
        >
          <span className={styles.contactIcon}>📞</span>
          {announcementConfig.phone}
        </a>
      )
    });
  }
  if (hasEmail) {
    contactItems.push({
      type: 'email',
      content: (
        <a
          href={`mailto:${announcementConfig.email}`}
          style={linkStyle}
          className={styles.contactItem}
          key="email"
        >
          <span className={styles.contactIcon}>✉️</span>
          {announcementConfig.email}
        </a>
      )
    });
  }

  return (
    <div
      ref={barRef}
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
      {showContactInfo && contactItems.length > 0 && (
        <div className={`${styles.contactInfo} ${isMobile && contactItems.length > 1 ? styles.carouselMode : ''}`}>
          {isMobile && contactItems.length > 1 ? (
            // Mobile: Show only current item with fade animation
            <div className={styles.carouselItem} key={currentContactIndex}>
              {contactItems[currentContactIndex].content}
            </div>
          ) : (
            // Desktop: Show all items
            contactItems.map(item => item.content)
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