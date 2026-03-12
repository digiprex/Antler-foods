import styles from './gallery-layouts.module.css';
import {
  GalleryCaptionOverlay,
  GalleryNavButton,
  type GalleryInteractiveLayoutProps,
  getAnimationStyle,
} from './shared';
import { getCircularOffset } from './pattern-utils';

export function FilmstripGalleryLayout({
  images,
  showCaptions,
  activeIndex,
  onActivate,
  onImageClick,
  onNext,
  onPrevious,
}: GalleryInteractiveLayoutProps) {
  return (
    <div>
      <div className={styles.filmstripShell}>
        <GalleryNavButton
          direction="previous"
          onClick={onPrevious}
          disabled={images.length <= 1}
          ariaLabel="Move filmstrip to previous image"
        />

        <div className={styles.filmstripViewport}>
          <div className={styles.filmstripGlow} />
          <div className={styles.filmstripTrack}>
            {images.map((image, index) => {
              const offset = getCircularOffset(index, activeIndex, images.length, 3);

              if (offset === null) {
                return null;
              }

              const distance = Math.abs(offset);

              const lift =
                distance === 0 ? -14 : distance === 1 ? 10 : distance === 2 ? 20 : 28;
              const scale = distance === 0 ? 1.05 : distance === 1 ? 0.96 : 0.86;

              return (
                <button
                  key={image.id || `${image.url}-${index}`}
                  type="button"
                  className={`${styles.cardButton} ${styles.filmstripCard} ${
                    index === activeIndex ? styles.filmstripCardActive : ''
                  }`}
                  style={{
                    opacity: distance > 3 ? 0.5 : 1 - distance * 0.12,
                    filter: distance === 0 ? 'none' : 'saturate(0.84)',
                    transform: `translateY(${lift}px) scale(${scale})`,
                  }}
                  onMouseEnter={() => onActivate(index)}
                  onFocus={() => onActivate(index)}
                  onClick={() =>
                    distance === 0 ? onImageClick(index) : onActivate(index)
                  }
                >
                  <div
                    className={`${styles.cardSurface} ${styles.filmstripSurface} ${styles.cardReveal}`}
                    style={{
                      aspectRatio: distance === 0 ? '4 / 5' : '3 / 4',
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
                      showCaptions={showCaptions && index === activeIndex}
                      variant="glass"
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <GalleryNavButton
          direction="next"
          onClick={onNext}
          disabled={images.length <= 1}
          ariaLabel="Move filmstrip to next image"
        />
      </div>

      {images.length > 1 && (
        <div className={styles.dots}>
          {images.map((image, index) => (
            <button
              key={image.id || `${image.url}-filmstrip-dot-${index}`}
              type="button"
              className={`${styles.dotButton} ${
                activeIndex === index ? styles.dotButtonActive : ''
              }`}
              onClick={() => onActivate(index)}
              aria-label={`Focus filmstrip image ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
