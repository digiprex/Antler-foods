import type { CSSProperties } from 'react';
import styles from './gallery-layouts.module.css';
import {
  GalleryCaptionOverlay,
  GalleryNavButton,
  type GalleryCarouselLayoutProps,
  getAnimationStyle,
  getAspectRatioValue,
  getResolvedColumns,
} from './shared';

export function CarouselGalleryLayout({
  images,
  columns,
  gap,
  aspectRatio,
  layoutViewport,
  showCaptions,
  currentSlide,
  onImageClick,
  onNext,
  onPrevious,
  onSelectSlide,
}: GalleryCarouselLayoutProps) {
  const resolvedDesktopColumns = getResolvedColumns(columns, 4);
  const visibleCards =
    layoutViewport === 'mobile'
      ? 1
      : layoutViewport === 'tablet'
        ? Math.min(resolvedDesktopColumns, 2)
        : resolvedDesktopColumns;
  const maxSlide = Math.max(images.length - visibleCards, 0);
  const itemWidth = `calc((100% - (${visibleCards - 1} * ${gap})) / ${visibleCards})`;

  return (
    <div>
      <div className={styles.carouselShell}>
        <GalleryNavButton
          direction="previous"
          onClick={onPrevious}
          disabled={currentSlide === 0}
          ariaLabel="Show previous gallery slide"
        />

        <div className={styles.carouselViewport}>
          <div
            className={styles.carouselTrack}
            style={
              {
                '--gallery-gap': gap,
                '--gallery-carousel-width': itemWidth,
                transform: `translateX(calc(-${currentSlide} * (var(--gallery-carousel-width) + var(--gallery-gap))))`,
              } as CSSProperties
            }
          >
            {images.map((image, index) => (
              <button
                key={image.id || `${image.url}-${index}`}
                type="button"
                className={`${styles.cardButton} ${styles.carouselCard}`}
                onClick={() => onImageClick(index)}
              >
                <div
                  className={`${styles.cardSurface} ${styles.cardReveal}`}
                  style={{
                    aspectRatio: getAspectRatioValue(aspectRatio),
                    ...getAnimationStyle(index),
                  }}
                >
                  <img
                    src={image.url}
                    alt={image.alt || image.title || `Gallery image ${index + 1}`}
                    className={styles.cardMedia}
                  />
                  <GalleryCaptionOverlay
                    image={image}
                    showCaptions={showCaptions}
                  />
                </div>
              </button>
            ))}
          </div>
        </div>

        <GalleryNavButton
          direction="next"
          onClick={onNext}
          disabled={currentSlide >= maxSlide}
          ariaLabel="Show next gallery slide"
        />
      </div>

      {maxSlide > 0 && (
        <div className={styles.dots}>
          {Array.from({ length: maxSlide + 1 }).map((_, index) => (
            <button
              key={index}
              type="button"
              className={`${styles.dotButton} ${
                currentSlide === index ? styles.dotButtonActive : ''
              }`}
              onClick={() => onSelectSlide(index)}
              aria-label={`Go to gallery slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
