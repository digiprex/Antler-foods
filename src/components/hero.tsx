/**
 * Hero Component
 *
 * Renders hero section based on configuration with multiple layout options.
 */

'use client';

import type { CSSProperties } from 'react';
import type { HeroConfig } from '@/types/hero.types';
import styles from './hero.module.scss';
import { useGlobalStyleConfig } from '@/hooks/use-global-style-config';
import { getHeroLayoutMediaCapabilities } from '@/lib/hero-layout-media';
import { getSectionTypographyStyles } from '@/lib/section-style';

interface HeroProps extends Partial<HeroConfig> {
  restaurant_id?: string;
  previewMode?: 'desktop' | 'mobile';
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
    restaurant_id,
    previewMode,
    is_custom,
    titleFontFamily,
    titleFontSize,
    titleFontWeight,
    titleColor,
    subtitleFontFamily,
    subtitleFontSize,
    subtitleFontWeight,
    subtitleColor,
    bodyFontFamily,
    bodyFontSize,
    bodyFontWeight,
    bodyColor,
  } = props;

  if (process.env.NODE_ENV === 'development') {
    console.log('Hero component props:', {
      layout,
      hasImage: Boolean(image),
      imageUrl: image?.url,
      hasBackgroundImage: Boolean(backgroundImage),
      backgroundImageUrl: backgroundImage,
      hasVideo: Boolean(videoUrl),
      videoUrl,
      previewMode,
    });
  }

  const globalStyleEndpoint = restaurant_id
    ? `/api/global-style-config?restaurant_id=${encodeURIComponent(restaurant_id)}`
    : '/api/global-style-config';
  const { config: globalStyles } = useGlobalStyleConfig({
    apiEndpoint: globalStyleEndpoint,
    fetchOnMount: Boolean(restaurant_id),
  });
  const { titleStyle, subtitleStyle, bodyStyle } = getSectionTypographyStyles(
    {
      is_custom,
      titleFontFamily,
      titleFontSize,
      titleFontWeight,
      titleColor,
      subtitleFontFamily,
      subtitleFontSize,
      subtitleFontWeight,
      subtitleColor,
      bodyFontFamily,
      bodyFontSize,
      bodyFontWeight,
      bodyColor,
    },
    globalStyles,
  );

  const scrollToContent = () => {
    window.scrollBy({ top: window.innerHeight, behavior: 'smooth' });
  };

  const mediaCapabilities = getHeroLayoutMediaCapabilities(layout);
  const activeImage = mediaCapabilities.showHeroImage ? image : undefined;
  const activeVideoUrl = mediaCapabilities.showBackgroundVideo ? videoUrl : undefined;
  const allowBackgroundFallback = layout === 'video-background' && !activeVideoUrl;
  const activeBackgroundImage =
    mediaCapabilities.showBackgroundImage || allowBackgroundFallback ? backgroundImage : undefined;

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
    '--hero-screen-height':
      previewMode === 'mobile' ? '780px' : previewMode === 'desktop' ? '720px' : '100svh',
  } as CSSProperties;

  if (activeBackgroundImage && !activeVideoUrl) {
    heroStyle.backgroundImage = `url(${activeBackgroundImage})`;
  }

  const renderButtons = () => {
    if (!primaryButton && !secondaryButton) return null;

    return (
      <div className={styles.buttonGroup}>
        {primaryButton && (
          <a
            href={primaryButton.href || '#'}
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
            href={secondaryButton.href || '#'}
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

  const renderContent = (additionalClass?: string) => (
    <div className={`${styles.content} ${additionalClass || ''}`}>
      {subheadline ? (
        <p className={styles.subheadline} style={subtitleStyle}>
          {subheadline}
        </p>
      ) : null}
      <h1 className={styles.headline} style={titleStyle}>
        {headline}
      </h1>
      {description ? (
        <p className={styles.description} style={bodyStyle}>
          {description}
        </p>
      ) : null}
      {renderButtons()}
    </div>
  );

  const renderImage = () => {
    if (!activeImage) return null;

    return (
      <div className={styles.imageContainer}>
        <img
          src={activeImage.url}
          alt={activeImage.alt}
          className={styles.heroImage}
          onError={(event) => {
            console.error('Hero image failed to load:', activeImage.url);
            console.error('Image error event:', event);
          }}
          onLoad={() => {
            console.log('Hero image loaded successfully:', activeImage.url);
          }}
        />
      </div>
    );
  };

  const renderFeatures = () => {
    if (!features || features.length === 0) return null;

    return (
      <div className={styles.featuresGrid}>
        {features.map((feature, index) => (
          <div key={feature.id || index} className={styles.featureCard}>
            {feature.icon ? <div className={styles.featureIcon}>{feature.icon}</div> : null}
            <h3 className={styles.featureTitle}>{feature.title}</h3>
            {feature.description ? (
              <p className={styles.featureDescription}>{feature.description}</p>
            ) : null}
          </div>
        ))}
      </div>
    );
  };

  const renderLayout = () => {
    switch (layout) {
      case 'split':
        return (
          <div className={styles.splitLayout}>
            <div className={styles.splitContent}>{renderContent(styles.contentLeft)}</div>
            <div className={styles.splitImage}>{renderImage()}</div>
          </div>
        );

      case 'split-reverse':
        return (
          <div className={styles.splitLayout}>
            <div className={styles.splitImage}>{renderImage()}</div>
            <div className={styles.splitContent}>{renderContent(styles.contentLeft)}</div>
          </div>
        );

      case 'minimal':
        return <div className={styles.minimalLayout}>{renderContent(styles.contentCentered)}</div>;

      case 'video-background':
        return (
          <div className={styles.videoBackgroundLayout}>
            {activeVideoUrl ? (
              <div className={styles.videoContainer}>
                <video autoPlay loop muted playsInline className={styles.backgroundVideo}>
                  <source src={activeVideoUrl} type="video/mp4" />
                </video>
                <div className={styles.videoOverlay} />
              </div>
            ) : null}
            {renderContent(styles.contentCentered)}
          </div>
        );

      case 'side-by-side':
        return (
          <div className={styles.sideBySideLayout}>
            <div className={styles.sideBySideContent}>{renderContent(styles.contentLeft)}</div>
            <div className={styles.sideBySideImage}>{renderImage()}</div>
          </div>
        );

      case 'offset':
        return (
          <div className={styles.offsetLayout}>
            <div className={styles.offsetContent}>{renderContent(styles.contentLeft)}</div>
            <div className={styles.offsetImage}>{renderImage()}</div>
          </div>
        );

      case 'full-height':
        return <div className={styles.fullHeightLayout}>{renderContent(styles.contentCentered)}</div>;

      case 'with-features':
        return (
          <div className={styles.withFeaturesLayout}>
            <div className={styles.mainContent}>
              {renderContent(styles.contentCentered)}
              {activeImage ? renderImage() : null}
            </div>
            {renderFeatures()}
          </div>
        );

      case 'centered-large':
        return (
          <div className={styles.centeredLargeLayout}>
            {renderContent(styles.contentCentered)}
            {activeImage ? renderImage() : null}
          </div>
        );

      case 'default':
      default:
        return (
          <div className={styles.defaultLayout}>
            {renderContent(styles.contentCentered)}
            {activeImage ? renderImage() : null}
          </div>
        );
    }
  };

  const heroClass = [
    styles.hero,
    activeBackgroundImage ? styles.hasBackground : '',
    activeVideoUrl ? styles.hasVideo : '',
    previewMode === 'desktop' ? styles.previewDesktop : '',
    previewMode === 'mobile' ? styles.previewMobile : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <section className={heroClass} style={heroStyle}>
      {activeBackgroundImage && !activeVideoUrl ? <div className={styles.backgroundOverlay} aria-hidden="true" /> : null}
      <div className={styles.container}>{renderLayout()}</div>

      {showScrollIndicator ? (
        <button onClick={scrollToContent} className={styles.scrollIndicator} aria-label="Scroll to content">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M12 5V19M12 19L19 12M12 19L5 12"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      ) : null}
    </section>
  );
}
