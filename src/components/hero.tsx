/**
 * Hero Component
 *
 * Renders hero section based on configuration with multiple layout options
 */

'use client';

import { useState } from 'react';
import Image from 'next/image';
import type { HeroConfig } from '@/types/hero.types';
import styles from './hero.module.scss';

interface HeroProps extends Partial<HeroConfig> {
  // Allow component to accept all HeroConfig properties as optional
  restaurant_id?: string;
}

export default function Hero(props: HeroProps) {
  const {
    headline = 'Welcome to Our Restaurant',
    subheadline,
    description,
    primaryButton,
    secondaryButton,
    image,
    videoUrl,
    backgroundImage,
    features = [],
    layout = 'centered-large',
    bgColor = '#ffffff',
    textColor = '#000000',
    overlayColor = '#000000',
    overlayOpacity = 0.5,
    textAlign = 'center',
    paddingTop = '6rem',
    paddingBottom = '6rem',
    minHeight = '600px',
    showScrollIndicator = false,
    contentMaxWidth = '1200px',
    restaurant_id: _restaurant_id, // eslint-disable-line @typescript-eslint/no-unused-vars
  } = props;

  // Debug logging in development
  if (process.env.NODE_ENV === 'development') {
    console.log('Hero component props:', {
      layout,
      hasImage: !!image,
      imageUrl: image?.url,
      hasBackgroundImage: !!backgroundImage,
      backgroundImageUrl: backgroundImage,
      hasVideo: !!videoUrl,
      videoUrl
    });
  }

  const [isVideoLoaded, setIsVideoLoaded] = useState(false); // eslint-disable-line @typescript-eslint/no-unused-vars

  // Scroll indicator handler
  const scrollToContent = () => {
    window.scrollBy({ top: window.innerHeight, behavior: 'smooth' });
  };

  // Dynamic styles using CSS variables
  const heroStyle = {
    '--hero-bg-color': bgColor,
    '--hero-text-color': textColor,
    '--hero-overlay-color': overlayColor,
    '--hero-overlay-opacity': overlayOpacity,
    '--hero-padding-top': paddingTop,
    '--hero-padding-bottom': paddingBottom,
    '--hero-min-height': minHeight,
    '--hero-content-max-width': contentMaxWidth,
    '--hero-text-align': textAlign,
  } as React.CSSProperties;

  // Add background image if provided
  if (backgroundImage && !videoUrl) {
    heroStyle.backgroundImage = `url(${backgroundImage})`;
  }

  // Render buttons
  const renderButtons = () => {
    if (!primaryButton && !secondaryButton) return null;

    return (
      <div className={styles.buttonGroup}>
        {primaryButton && (
          <a
            href={primaryButton.href}
            className={`${styles.button} ${styles.buttonPrimary} ${
              primaryButton.variant === 'outline' ? styles.buttonOutline : ''
            } ${primaryButton.variant === 'secondary' ? styles.buttonSecondary : ''}`}
            style={{
              backgroundColor: primaryButton.bgColor,
              color: primaryButton.textColor,
              borderColor: primaryButton.borderColor,
            }}
          >
            {primaryButton.label}
          </a>
        )}
        {secondaryButton && (
          <a
            href={secondaryButton.href}
            className={`${styles.button} ${styles.buttonSecondary} ${
              secondaryButton.variant === 'outline' ? styles.buttonOutline : ''
            }`}
            style={{
              backgroundColor: secondaryButton.bgColor,
              color: secondaryButton.textColor,
              borderColor: secondaryButton.borderColor,
            }}
          >
            {secondaryButton.label}
          </a>
        )}
      </div>
    );
  };

  // Render content (headline, subheadline, description, buttons)
  const renderContent = (additionalClass?: string) => (
    <div className={`${styles.content} ${additionalClass || ''}`}>
      {subheadline && <p className={styles.subheadline}>{subheadline}</p>}
      <h1 className={styles.headline}>{headline}</h1>
      {description && <p className={styles.description}>{description}</p>}
      {renderButtons()}
    </div>
  );

  // Render image
  const renderImage = () => {
    if (!image) return null;

    return (
      <div className={styles.imageContainer}>
        <Image
          src={image.url}
          alt={image.alt}
          className={styles.heroImage}
          width={600}
          height={400}
          style={{ objectFit: 'cover' }}
          onError={(e) => {
            console.error('Hero image failed to load:', image.url);
            console.error('Image error event:', e);
          }}
          onLoad={() => {
            console.log('Hero image loaded successfully:', image.url);
          }}
        />
      </div>
    );
  };

  // Render features
  const renderFeatures = () => {
    if (!features || features.length === 0) return null;

    return (
      <div className={styles.featuresGrid}>
        {features.map((feature, index) => (
          <div key={index} className={styles.featureCard}>
            {feature.icon && (
              <div className={styles.featureIcon}>{feature.icon}</div>
            )}
            <h3 className={styles.featureTitle}>{feature.title}</h3>
            {feature.description && (
              <p className={styles.featureDescription}>{feature.description}</p>
            )}
          </div>
        ))}
      </div>
    );
  };

  // Render different layouts
  const renderLayout = () => {
    switch (layout) {
      case 'split':
        return (
          <div className={styles.splitLayout}>
            <div className={styles.splitContent}>
              {renderContent(styles.contentLeft)}
            </div>
            <div className={styles.splitImage}>
              {renderImage()}
            </div>
          </div>
        );

      case 'split-reverse':
        return (
          <div className={styles.splitLayout}>
            <div className={styles.splitImage}>
              {renderImage()}
            </div>
            <div className={styles.splitContent}>
              {renderContent(styles.contentLeft)}
            </div>
          </div>
        );

      case 'minimal':
        return (
          <div className={styles.minimalLayout}>
            {renderContent(styles.contentCentered)}
          </div>
        );

      case 'video-background':
        return (
          <div className={styles.videoBackgroundLayout}>
            {videoUrl && (
              <div className={styles.videoContainer}>
                <video
                  autoPlay
                  loop
                  muted
                  playsInline
                  className={styles.backgroundVideo}
                  onLoadedData={() => setIsVideoLoaded(true)}
                >
                  <source src={videoUrl} type="video/mp4" />
                </video>
                <div className={styles.videoOverlay} />
              </div>
            )}
            {renderContent(styles.contentCentered)}
          </div>
        );

      case 'side-by-side':
        return (
          <div className={styles.sideBySideLayout}>
            <div className={styles.sideBySideContent}>
              {renderContent(styles.contentLeft)}
            </div>
            <div className={styles.sideBySideImage}>
              {renderImage()}
            </div>
          </div>
        );

      case 'offset':
        return (
          <div className={styles.offsetLayout}>
            <div className={styles.offsetContent}>
              {renderContent(styles.contentLeft)}
            </div>
            <div className={styles.offsetImage}>
              {renderImage()}
            </div>
          </div>
        );

      case 'full-height':
        return (
          <div className={styles.fullHeightLayout}>
            {renderContent(styles.contentCentered)}
          </div>
        );

      case 'with-features':
        return (
          <div className={styles.withFeaturesLayout}>
            <div className={styles.mainContent}>
              {renderContent(styles.contentCentered)}
              {image && renderImage()}
            </div>
            {renderFeatures()}
          </div>
        );

      case 'centered-large':
        return (
          <div className={styles.centeredLargeLayout}>
            {renderContent(styles.contentCentered)}
            {image && renderImage()}
          </div>
        );

      case 'default':
      default:
        return (
          <div className={styles.defaultLayout}>
            {renderContent(styles.contentCentered)}
            {image && renderImage()}
          </div>
        );
    }
  };

  // Determine hero class based on layout
  const heroClass = `${styles.hero} ${styles[`hero-${layout}`] || ''} ${
    backgroundImage ? styles.hasBackground : ''
  } ${videoUrl ? styles.hasVideo : ''}`;

  return (
    <section className={heroClass} style={heroStyle}>
      <div className={styles.container}>
        {renderLayout()}
      </div>

      {/* Scroll Indicator */}
      {showScrollIndicator && (
        <button
          onClick={scrollToContent}
          className={styles.scrollIndicator}
          aria-label="Scroll to content"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12 5V19M12 19L19 12M12 19L5 12"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}
    </section>
  );
}
