import type { CSSProperties } from 'react';
import styles from './gallery-layouts.module.css';
import {
  GalleryCaptionOverlay,
  type GalleryLayoutCommonProps,
  getAnimationStyle,
  getResolvedColumns,
} from './shared';

export function MasonryGalleryLayout({
  images,
  columns,
  gap,
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
        <div
          key={image.id || `${image.url}-${index}`}
          className={styles.masonryItem}
          style={getAnimationStyle(index)}
        >
          <button
            type="button"
            className={`${styles.cardButton} ${styles.cardReveal}`}
            onClick={() => onImageClick(index)}
          >
            <div className={`${styles.cardSurface} ${styles.cardSurfaceSoft}`}>
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
