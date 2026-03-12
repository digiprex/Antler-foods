import type { CSSProperties } from 'react';
import styles from './gallery-layouts.module.css';
import {
  GalleryCaptionOverlay,
  type GalleryInteractiveLayoutProps,
  getAnimationStyle,
} from './shared';

function getWrappedIndex(index: number, total: number) {
  return (index + total) % total;
}

function ArrowIcon({ direction }: { direction: 'previous' | 'next' }) {
  return (
    <svg
      className="h-6 w-6"
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
  );
}

export function ShowcaseGalleryLayout({
  images,
  showCaptions,
  activeIndex,
  onActivate,
  onImageClick,
  onNext,
  onPrevious,
}: GalleryInteractiveLayoutProps) {
  const totalImages = images.length;

  if (totalImages === 0) {
    return null;
  }

  const safeActiveIndex = activeIndex >= totalImages ? 0 : activeIndex;
  const activeImage = images[safeActiveIndex];
  const previousIndex = getWrappedIndex(safeActiveIndex - 1, totalImages);
  const nextIndex = getWrappedIndex(safeActiveIndex + 1, totalImages);
  const sidePreviewIndices =
    totalImages <= 1
      ? []
      : totalImages === 2
        ? [previousIndex]
        : [previousIndex, nextIndex];
  const stageStyle = {
    '--showcase-stage-columns':
      sidePreviewIndices.length === 0
        ? 'minmax(0, 1fr)'
        : sidePreviewIndices.length === 1
          ? 'minmax(9rem, 0.5fr) minmax(0, 2.4fr)'
          : 'minmax(9rem, 0.52fr) minmax(0, 2.75fr) minmax(9rem, 0.52fr)',
    '--showcase-hero-column': sidePreviewIndices.length === 0 ? '1' : '2',
    '--showcase-left-column': '1',
    '--showcase-right-column': '3',
    '--showcase-stage-mobile-columns':
      sidePreviewIndices.length === 0
        ? 'minmax(0, 1fr)'
        : 'repeat(2, minmax(0, 1fr))',
  } as CSSProperties;

  return (
    <div className={styles.showcaseShell}>
      {totalImages > 1 && (
        <div className={styles.showcaseProgress}>
          {images.map((image, index) => (
            <button
              key={image.id || `${image.url}-showcase-progress-${index}`}
              type="button"
              className={styles.showcaseProgressButton}
              onClick={() => onActivate(index)}
              aria-label={`Show gallery image ${index + 1}`}
              aria-pressed={safeActiveIndex === index}
            >
              <span className={styles.showcaseProgressTrack}>
                <span
                  className={styles.showcaseProgressFill}
                  style={{
                    transform: `scaleX(${safeActiveIndex === index ? 1 : 0})`,
                  }}
                />
              </span>
            </button>
          ))}
        </div>
      )}

      <div className={styles.showcaseViewport}>
        <div className={styles.showcaseGlow} />
        <div className={styles.showcasePattern} />
        <div className={styles.showcaseStage} style={stageStyle}>
          {sidePreviewIndices.map((index, previewIndex) => {
            const image = images[index];

            if (!image) {
              return null;
            }

            const alignmentClassName =
              previewIndex === 0
                ? styles.showcaseSideCardLeft
                : styles.showcaseSideCardRight;

            return (
              <button
                key={image.id || `${image.url}-showcase-side-${index}`}
                type="button"
                className={`${styles.cardButton} ${styles.showcaseSideCard} ${alignmentClassName}`}
                style={getAnimationStyle(index)}
                onMouseEnter={() => onActivate(index)}
                onFocus={() => onActivate(index)}
                onClick={() => onActivate(index)}
                aria-label={`Preview gallery image ${index + 1}`}
              >
                <div
                  className={`${styles.cardSurface} ${styles.showcaseSideSurface} ${styles.cardReveal}`}
                  style={{ aspectRatio: '7 / 10.5' }}
                >
                  <img
                    src={image.url}
                    alt={image.alt || image.title || `Gallery image ${index + 1}`}
                    className={styles.cardMedia}
                  />
                </div>
              </button>
            );
          })}

          <button
            type="button"
            className={`${styles.cardButton} ${styles.showcaseHeroButton}`}
            style={getAnimationStyle(safeActiveIndex)}
            onClick={() => onImageClick(safeActiveIndex)}
            aria-label={`Open gallery image ${safeActiveIndex + 1}`}
          >
            <div
              className={`${styles.cardSurface} ${styles.showcaseHeroSurface} ${styles.cardReveal}`}
              style={{ aspectRatio: '16 / 9.1' }}
            >
              <img
                src={activeImage.url}
                alt={
                  activeImage.alt ||
                  activeImage.title ||
                  `Gallery image ${safeActiveIndex + 1}`
                }
                className={styles.cardMedia}
              />
              <GalleryCaptionOverlay
                image={activeImage}
                showCaptions={showCaptions}
                variant="overlay"
              />
            </div>
          </button>
        </div>

        {totalImages > 1 && (
          <>
            <button
              type="button"
              className={`${styles.showcaseArrow} ${styles.showcaseArrowPrevious}`}
              onClick={onPrevious}
              aria-label="Show previous gallery image"
            >
              <ArrowIcon direction="previous" />
            </button>
            <button
              type="button"
              className={`${styles.showcaseArrow} ${styles.showcaseArrowNext}`}
              onClick={onNext}
              aria-label="Show next gallery image"
            >
              <ArrowIcon direction="next" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
