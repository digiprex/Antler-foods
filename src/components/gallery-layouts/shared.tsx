import type { CSSProperties, ReactNode } from 'react';
import type { GalleryConfig, GalleryImage } from '@/types/gallery.types';
import styles from './gallery-layouts.module.css';

export interface GalleryLayoutCommonProps {
  images: GalleryImage[];
  columns: number;
  gap: string;
  aspectRatio: NonNullable<GalleryConfig['aspectRatio']>;
  showCaptions: boolean;
  enableLightbox: boolean;
  onImageClick: (index: number) => void;
}

export interface GalleryCarouselLayoutProps extends GalleryLayoutCommonProps {
  currentSlide: number;
  onNext: () => void;
  onPrevious: () => void;
  onSelectSlide: (index: number) => void;
}

export interface GalleryInteractiveLayoutProps extends GalleryLayoutCommonProps {
  activeIndex: number;
  onActivate: (index: number) => void;
  onNext: () => void;
  onPrevious: () => void;
}

export function getAspectRatioValue(
  aspectRatio: GalleryConfig['aspectRatio'],
): string {
  switch (aspectRatio) {
    case '16:9':
      return '16 / 9';
    case '4:3':
      return '4 / 3';
    case 'auto':
      return 'auto';
    case 'square':
    default:
      return '1 / 1';
  }
}

export function getResolvedColumns(columns?: number, max = 4) {
  return Math.max(1, Math.min(columns || 3, max));
}

export function getAnimationStyle(index: number): CSSProperties {
  return {
    animationDelay: `${Math.min(index, 10) * 90}ms`,
  };
}

export function GalleryCaptionOverlay({
  image,
  showCaptions,
  variant = 'overlay',
}: {
  image: GalleryImage;
  showCaptions: boolean;
  variant?: 'overlay' | 'glass';
}) {
  if (!showCaptions || (!image.title && !image.description)) {
    return null;
  }

  return (
    <div
      className={
        variant === 'glass' ? styles.cardCaptionGlass : styles.cardCaption
      }
    >
      {image.title && <p className={styles.cardCaptionTitle}>{image.title}</p>}
      {image.description && (
        <p className={styles.cardCaptionDescription}>{image.description}</p>
      )}
    </div>
  );
}

export function GallerySectionHeader({
  title,
  subtitle,
  description,
  titleStyle,
  subtitleStyle,
  bodyStyle,
}: {
  title?: string;
  subtitle?: string;
  description?: string;
  titleStyle: CSSProperties;
  subtitleStyle: CSSProperties;
  bodyStyle: CSSProperties;
}) {
  if (!title && !subtitle && !description) {
    return null;
  }

  return (
    <div className={styles.galleryHeader}>
      {subtitle && (
        <p className={styles.gallerySubtitle} style={subtitleStyle}>
          {subtitle}
        </p>
      )}
      {title && (
        <h2 className={styles.galleryTitle} style={titleStyle}>
          {title}
        </h2>
      )}
      {description && (
        <p className={styles.galleryDescription} style={bodyStyle}>
          {description}
        </p>
      )}
    </div>
  );
}

export function GalleryNavButton({
  direction,
  onClick,
  disabled = false,
  ariaLabel,
  children,
}: {
  direction: 'previous' | 'next';
  onClick: () => void;
  disabled?: boolean;
  ariaLabel: string;
  children?: ReactNode;
}) {
  return (
    <button
      type="button"
      className={styles.navButton}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
    >
      {children || (
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={2}
        >
          {direction === 'previous' ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 19.5L8.25 12l7.5-7.5"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8.25 4.5l7.5 7.5-7.5 7.5"
            />
          )}
        </svg>
      )}
    </button>
  );
}

export function GalleryLightbox({
  images,
  index,
  showCaptions,
  onClose,
  onNext,
  onPrevious,
}: {
  images: GalleryImage[];
  index: number | null;
  showCaptions: boolean;
  onClose: () => void;
  onNext: () => void;
  onPrevious: () => void;
}) {
  if (index === null || !images[index]) {
    return null;
  }

  const image = images[index];

  return (
    <div className={styles.lightboxOverlay}>
      <button
        type="button"
        className={styles.lightboxBackdrop}
        onClick={onClose}
        aria-label="Close gallery lightbox"
      />
      <div className={styles.lightboxInner}>
        <div className={styles.lightboxFrame}>
          <button
            type="button"
            className={styles.lightboxClose}
            onClick={onClose}
            aria-label="Close lightbox"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>

          {images.length > 1 && (
            <div className="pointer-events-none absolute inset-y-0 left-0 right-0 z-10 flex items-center justify-between px-3 sm:px-5">
              <div className="pointer-events-auto">
                <GalleryNavButton
                  direction="previous"
                  onClick={onPrevious}
                  ariaLabel="Show previous image"
                />
              </div>
              <div className="pointer-events-auto">
                <GalleryNavButton
                  direction="next"
                  onClick={onNext}
                  ariaLabel="Show next image"
                />
              </div>
            </div>
          )}

          <img
            src={image.url}
            alt={image.alt || image.title || 'Gallery image'}
            className={styles.lightboxImage}
          />

          {showCaptions && (image.title || image.description) && (
            <div className={styles.lightboxMeta}>
              {image.title && (
                <p className={styles.lightboxTitle}>{image.title}</p>
              )}
              {image.description && (
                <p className={styles.lightboxDescription}>
                  {image.description}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
