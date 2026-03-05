/**
 * Custom Section Component
 *
 * Renders custom content sections based on configuration with multiple layout options
 */

'use client';

import { useState, useEffect } from 'react';
import type { CustomSectionConfig } from '@/types/custom-section.types';
import styles from './custom-section.module.scss';

interface CustomSectionProps extends Partial<CustomSectionConfig> {
  // Allow component to accept all CustomSectionConfig properties as optional
  restaurant_id?: string;
}

export default function CustomSection(props: CustomSectionProps) {
  const {
    headline = 'Custom Section Headline',
    subheadline,
    description,
    primaryButton,
    secondaryButton,
    image,
    videoUrl,
    backgroundImage,
    layout = 'layout-1',
    bgColor = '#ffffff',
    textColor = '#000000',
    overlayColor = '#000000',
    overlayOpacity = 0.5,
    textAlign = 'center',
    paddingTop = '4rem',
    paddingBottom = '4rem',
    minHeight = '400px',
    contentMaxWidth = '1200px',
    restaurant_id,
  } = props;

  // Debug logging in development
  if (process.env.NODE_ENV === 'development') {
    console.log('CustomSection component props:', {
      layout,
      hasImage: !!image,
      imageUrl: image?.url,
      hasBackgroundImage: !!backgroundImage,
      hasVideo: !!videoUrl,
      videoUrl
    });
  }

  const [isVideoLoaded, setIsVideoLoaded] = useState(false);

  // Dynamic styles using CSS variables
  const sectionStyle = {
    '--section-bg-color': bgColor,
    '--section-text-color': textColor,
    '--section-overlay-color': overlayColor,
    '--section-overlay-opacity': overlayOpacity,
    '--section-padding-top': paddingTop,
    '--section-padding-bottom': paddingBottom,
    '--section-min-height': minHeight,
    '--section-content-max-width': contentMaxWidth,
    '--section-text-align': textAlign,
  } as React.CSSProperties;

  // Add background image if provided
  if (backgroundImage && !videoUrl) {
    sectionStyle.backgroundImage = `url(${backgroundImage})`;
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
      <h2 className={styles.headline}>{headline}</h2>
      {description && <p className={styles.description}>{description}</p>}
      {renderButtons()}
    </div>
  );

  // Render image
  const renderImage = () => {
    if (!image) return null;

    return (
      <div className={styles.imageContainer}>
        <img
          src={image.url}
          alt={image.alt}
          className={styles.sectionImage}
          onError={(e) => {
            console.error('Custom section image failed to load:', image.url);
            console.error('Image error event:', e);
          }}
          onLoad={() => {
            console.log('Custom section image loaded successfully:', image.url);
          }}
        />
      </div>
    );
  };

  // Render different layouts
  const renderLayout = () => {
    switch (layout) {
      case 'layout-1':
        // Full-width image with overlay text
        return (
          <div className={styles.layout1}>
            {renderContent(styles.contentOverlay)}
          </div>
        );

      case 'layout-2':
        // Split image left, content right
        return (
          <div className={styles.layout2}>
            <div className={styles.imageSection}>
              {renderImage()}
            </div>
            <div className={styles.contentSection}>
              {renderContent(styles.contentLeft)}
            </div>
          </div>
        );

      case 'layout-3':
        // Video background with centered content
        return (
          <div className={styles.layout3}>
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

      case 'layout-4':
        // Curved green background with image
        return (
          <div className={styles.layout4}>
            <div className={styles.curvedBackground}>
              <div className={styles.contentSection}>
                {renderContent(styles.contentLeft)}
              </div>
              <div className={styles.imageSection}>
                {renderImage()}
              </div>
            </div>
          </div>
        );

      case 'layout-5':
        // Circular image with green background
        return (
          <div className={styles.layout5}>
            <div className={styles.circularImageSection}>
              {renderImage()}
            </div>
            <div className={styles.contentSection}>
              {renderContent(styles.contentLeft)}
            </div>
          </div>
        );

      case 'layout-6':
        // Image right, content left
        return (
          <div className={styles.layout6}>
            <div className={styles.contentSection}>
              {renderContent(styles.contentLeft)}
            </div>
            <div className={styles.imageSection}>
              {renderImage()}
            </div>
          </div>
        );

      case 'layout-7':
        // Image left, content right with spacing
        return (
          <div className={styles.layout7}>
            <div className={styles.imageSection}>
              {renderImage()}
            </div>
            <div className={styles.contentSection}>
              {renderContent(styles.contentLeft)}
            </div>
          </div>
        );

      case 'layout-8':
        // Centered content with side images
        return (
          <div className={styles.layout8}>
            <div className={styles.sideImageLeft}>
              {renderImage()}
            </div>
            <div className={styles.centerContent}>
              {renderContent(styles.contentCentered)}
            </div>
            <div className={styles.sideImageRight}>
              {renderImage()}
            </div>
          </div>
        );

      case 'layout-9':
        // Large image with bottom content
        return (
          <div className={styles.layout9}>
            <div className={styles.topImageSection}>
              {renderImage()}
            </div>
            <div className={styles.bottomContentSection}>
              {renderContent(styles.contentCentered)}
            </div>
          </div>
        );

      case 'layout-10':
        // Centered content with top image
        return (
          <div className={styles.layout10}>
            <div className={styles.topImageSection}>
              {renderImage()}
            </div>
            <div className={styles.contentSection}>
              {renderContent(styles.contentCentered)}
            </div>
          </div>
        );

      case 'layout-11':
        // Two column split with images
        return (
          <div className={styles.layout11}>
            <div className={styles.imageColumn}>
              {renderImage()}
            </div>
            <div className={styles.imageColumn}>
              {renderImage()}
            </div>
          </div>
        );

      case 'layout-12':
        // Boxed content with side image
        return (
          <div className={styles.layout12}>
            <div className={styles.boxedContent}>
              {renderContent(styles.contentLeft)}
            </div>
            <div className={styles.imageSection}>
              {renderImage()}
            </div>
          </div>
        );

      case 'layout-13':
        // Image grid with center content
        return (
          <div className={styles.layout13}>
            <div className={styles.sideImage}>{renderImage()}</div>
            <div className={styles.centerContent}>
              {renderContent(styles.contentCentered)}
            </div>
            <div className={styles.sideImage}>{renderImage()}</div>
          </div>
        );

      case 'layout-14':
        // Stacked cards layout
        return (
          <div className={styles.layout14}>
            <div className={styles.card}>{renderContent(styles.contentLeft)}</div>
          </div>
        );

      case 'layout-15':
        // Asymmetric split layout
        return (
          <div className={styles.layout15}>
            <div className={styles.smallColumn}>
              {renderContent(styles.contentLeft)}
            </div>
            <div className={styles.largeColumn}>
              {renderImage()}
            </div>
          </div>
        );

      case 'layout-16':
        // Featured image with sidebar
        return (
          <div className={styles.layout16}>
            <div className={styles.featuredImage}>
              {renderImage()}
            </div>
            <div className={styles.sidebar}>
              {renderContent(styles.contentLeft)}
            </div>
          </div>
        );

      case 'layout-17':
        // Magazine style layout
        return (
          <div className={styles.layout17}>
            <div className={styles.magazineRow}>
              <div className={styles.imageSection}>{renderImage()}</div>
              <div className={styles.textSection}>{renderContent(styles.contentLeft)}</div>
            </div>
          </div>
        );

      case 'layout-18':
        // Overlapping content blocks
        return (
          <div className={styles.layout18}>
            <div className={styles.imageBlock}>{renderImage()}</div>
            <div className={styles.textBlock}>{renderContent(styles.contentLeft)}</div>
          </div>
        );

      case 'layout-19':
        // Modern card style
        return (
          <div className={styles.layout19}>
            <div className={styles.modernCard}>
              {renderContent(styles.contentCentered)}
            </div>
          </div>
        );

      case 'layout-20':
        // Split with background accent
        return (
          <div className={styles.layout20}>
            <div className={styles.accentBackground}>
              <div className={styles.contentSection}>{renderContent(styles.contentLeft)}</div>
              <div className={styles.imageSection}>{renderImage()}</div>
            </div>
          </div>
        );

      case 'layout-21':
        // Hero style with bottom content
        return (
          <div className={styles.layout21}>
            <div className={styles.heroImage}>{renderImage()}</div>
            <div className={styles.bottomContent}>{renderContent(styles.contentCentered)}</div>
          </div>
        );

      case 'layout-22':
        // Zigzag pattern layout
        return (
          <div className={styles.layout22}>
            <div className={styles.zigzagRow}>
              <div className={styles.imageSection}>{renderImage()}</div>
              <div className={styles.textSection}>{renderContent(styles.contentLeft)}</div>
            </div>
            <div className={styles.zigzagRowReverse}>
              <div className={styles.textSection}>{renderContent(styles.contentLeft)}</div>
              <div className={styles.imageSection}>{renderImage()}</div>
            </div>
          </div>
        );

      case 'layout-23':
        // Centered with side panels
        return (
          <div className={styles.layout23}>
            <div className={styles.sidePanel}></div>
            <div className={styles.centerPanel}>
              {renderContent(styles.contentCentered)}
            </div>
            <div className={styles.sidePanel}></div>
          </div>
        );

      case 'layout-24':
        // Full screen video layout
        return (
          <div className={styles.layout24}>
            {videoUrl && (
              <div className={styles.fullScreenVideo}>
                <video autoPlay loop muted playsInline className={styles.video}>
                  <source src={videoUrl} type="video/mp4" />
                </video>
              </div>
            )}
            <div className={styles.videoOverlay}>
              {renderContent(styles.contentCentered)}
            </div>
          </div>
        );

      case 'layout-25':
        // Grid showcase layout
        return (
          <div className={styles.layout25}>
            <div className={styles.gridShowcase}>
              <div className={styles.gridItem}>{renderImage()}</div>
              <div className={styles.gridItem}>{renderImage()}</div>
              <div className={styles.gridItem}>{renderImage()}</div>
              <div className={styles.gridItem}>{renderImage()}</div>
            </div>
          </div>
        );

      case 'layout-26':
        // Minimal centered layout
        return (
          <div className={styles.layout26}>
            <div className={styles.minimalCenter}>
              {renderContent(styles.contentCentered)}
            </div>
          </div>
        );

      case 'layout-27':
        // Split diagonal layout
        return (
          <div className={styles.layout27}>
            <div className={styles.diagonalLeft}>
              {renderContent(styles.contentLeft)}
            </div>
            <div className={styles.diagonalRight}>
              {renderImage()}
            </div>
          </div>
        );

      case 'layout-28':
        // Triple section layout
        return (
          <div className={styles.layout28}>
            <div className={styles.tripleSection}>
              {renderContent(styles.contentCentered)}
            </div>
            <div className={styles.tripleSection}>
              {renderContent(styles.contentCentered)}
            </div>
            <div className={styles.tripleSection}>
              {renderContent(styles.contentCentered)}
            </div>
          </div>
        );

      case 'layout-29':
        // Layered content layout
        return (
          <div className={styles.layout29}>
            <div className={styles.layerBackground}>{renderImage()}</div>
            <div className={styles.layerForeground}>
              {renderContent(styles.contentLeft)}
            </div>
          </div>
        );

      case 'layout-30':
        // Full width banner style
        return (
          <div className={styles.layout30}>
            <div className={styles.fullBanner}>
              {renderContent(styles.contentCentered)}
            </div>
          </div>
        );

      case 'layout-31':
        // Image carousel layout
        return (
          <div className={styles.layout31}>
            <div className={styles.carousel}>
              <div className={styles.carouselTrack}>
                {renderImage()}
              </div>
            </div>
          </div>
        );

      case 'layout-32':
        // Interactive hover layout
        return (
          <div className={styles.layout32}>
            <div className={styles.interactiveBlock}>
              {renderImage()}
              <div className={styles.hoverOverlay}>
                {renderContent(styles.contentCentered)}
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className={styles.defaultLayout}>
            {renderContent(styles.contentCentered)}
            {image && renderImage()}
          </div>
        );
    }
  };

  // Determine section class based on layout
  const sectionClass = `${styles.customSection} ${styles[`section-${layout}`] || ''} ${
    backgroundImage ? styles.hasBackground : ''
  } ${videoUrl ? styles.hasVideo : ''}`;

  return (
    <section className={sectionClass} style={sectionStyle}>
      <div className={styles.container}>
        {renderLayout()}
      </div>
    </section>
  );
}