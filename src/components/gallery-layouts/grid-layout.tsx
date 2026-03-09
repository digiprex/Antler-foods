import type { CSSProperties } from 'react';
import styles from './gallery-layouts.module.css';
import {
  GalleryCaptionOverlay,
  type GalleryLayoutCommonProps,
  getAnimationStyle,
  getAspectRatioValue,
  getResolvedColumns,
} from './shared';

export function GridGalleryLayout({
  images,
  columns,
  gap,
  aspectRatio,
  showCaptions,
  onImageClick,
}: GalleryLayoutCommonProps) {
  const resolvedColumns = getResolvedColumns(columns, 5);

  return (
    <div
      className={styles.gridLayout}
      style={
        {
          '--gallery-gap': gap,
          '--gallery-columns': resolvedColumns,
          '--gallery-tablet-columns': Math.max(2, Math.min(resolvedColumns, 3)),
          '--gallery-mobile-columns': 1,
        } as CSSProperties
      }
    >
      {images.map((image, index) => (
        <button
          key={image.id || `${image.url}-${index}`}
          type="button"
          className={`${styles.cardButton} ${styles.cardReveal}`}
          style={getAnimationStyle(index)}
          onClick={() => onImageClick(index)}
        >
          <div
            className={styles.cardSurface}
            style={{ aspectRatio: getAspectRatioValue(aspectRatio) }}
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
  );
}
