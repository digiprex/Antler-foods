import type { CSSProperties } from 'react';
import styles from './gallery-layouts.module.css';
import {
  GalleryCaptionOverlay,
  type GalleryLayoutCommonProps,
  getAnimationStyle,
} from './shared';
import { getMosaicTilePattern } from './pattern-utils';

export function MosaicGalleryLayout({
  images,
  gap,
  showCaptions,
  onImageClick,
}: GalleryLayoutCommonProps) {
  return (
    <div
      className={styles.mosaicLayout}
      style={{ '--gallery-gap': gap } as CSSProperties}
    >
      {images.map((image, index) => {
        const tilePattern = getMosaicTilePattern(images.length, index);

        return (
          <button
            key={image.id || `${image.url}-${index}`}
            type="button"
            className={`${styles.cardButton} ${styles.tiledCardButton}`}
            style={tilePattern}
            onClick={() => onImageClick(index)}
          >
            <div
              className={`${styles.cardSurface} ${styles.mosaicSurface} ${styles.cardReveal}`}
              style={getAnimationStyle(index)}
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
        );
      })}
    </div>
  );
}
