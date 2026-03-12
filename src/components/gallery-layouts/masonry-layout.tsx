import type { CSSProperties } from 'react';
import styles from './gallery-layouts.module.css';
import {
  GalleryCaptionOverlay,
  type GalleryLayoutCommonProps,
  getAnimationStyle,
  getAspectRatioValue,
  getResolvedColumns,
} from './shared';

export function MasonryGalleryLayout({
  images,
  columns,
  gap,
  aspectRatio,
  showCaptions,
  onImageClick,
}: GalleryLayoutCommonProps) {
  const resolvedColumns = getResolvedColumns(columns, 4);

  return (
    <div
      className={styles.masonryLayout}
      style={
        {
          '--gallery-gap': gap,
          '--gallery-columns': resolvedColumns,
          '--gallery-tablet-columns': Math.max(2, Math.min(resolvedColumns, 2)),
          '--gallery-mobile-columns': 1,
        } as CSSProperties
      }
    >
      {images.map((image, index) => (
        <div key={image.id || `${image.url}-${index}`} className={styles.masonryItem}>
          <button
            type="button"
            className={styles.cardButton}
            onClick={() => onImageClick(index)}
          >
            <div
              className={`${styles.cardSurface} ${styles.cardSurfaceSoft} ${styles.cardReveal}`}
              style={{
                aspectRatio:
                  aspectRatio === 'auto'
                    ? undefined
                    : getAspectRatioValue(aspectRatio),
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
                variant="glass"
              />
            </div>
          </button>
        </div>
      ))}
    </div>
  );
}
