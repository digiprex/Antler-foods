import type { CSSProperties } from 'react';
import styles from './gallery-layouts.module.css';
import {
  GalleryCaptionOverlay,
  type GalleryLayoutCommonProps,
  getAnimationStyle,
} from './shared';
import { getEditorialTilePattern } from './pattern-utils';

export function EditorialGalleryLayout({
  images,
  gap,
  showCaptions,
  onImageClick,
}: GalleryLayoutCommonProps) {
  return (
    <div
      className={styles.editorialLayout}
      style={{ '--gallery-gap': gap } as CSSProperties}
    >
      {images.map((image, index) => {
        const tilePattern = getEditorialTilePattern(images.length, index);

        return (
          <button
            key={image.id || `${image.url}-${index}`}
            type="button"
            className={`${styles.cardButton} ${styles.tiledCardButton} ${styles.cardReveal}`}
            style={{ ...getAnimationStyle(index), ...tilePattern }}
            onClick={() => onImageClick(index)}
          >
            <div
              className={`${styles.cardSurface} ${styles.editorialSurface} ${
                index === 0 ? styles.editorialLeadSurface : ''
              }`}
            >
              <img
                src={image.url}
                alt={image.alt || image.title || `Gallery image ${index + 1}`}
                className={styles.cardMedia}
              />
              <GalleryCaptionOverlay
                image={image}
                showCaptions={showCaptions}
                variant={index === 0 ? 'overlay' : 'glass'}
              />
            </div>
          </button>
        );
      })}
    </div>
  );
}
