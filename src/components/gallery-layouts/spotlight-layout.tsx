import styles from './gallery-layouts.module.css';
import {
  GalleryCaptionOverlay,
  GalleryNavButton,
  type GalleryInteractiveLayoutProps,
  getAnimationStyle,
} from './shared';
import { getCircularOffset } from './pattern-utils';

export function SpotlightGalleryLayout({
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
      <div className={styles.spotlightShell}>
        <GalleryNavButton
          direction="previous"
          onClick={onPrevious}
          disabled={images.length <= 1}
          ariaLabel="Highlight previous image"
        />

        <div className={styles.spotlightViewport}>
          <div className={styles.spotlightGlow} />
          <div className={styles.spotlightMesh} />
          <div className={styles.spotlightStage}>
            {images.map((image, index) => {
              const offset = getCircularOffset(index, activeIndex, images.length, 2);

              if (offset === null) {
                return null;
              }

              const distance = Math.abs(offset);

              const width =
                distance === 0
                  ? 'min(55%, 42rem)'
                  : distance === 1
                    ? 'min(22%, 14rem)'
                    : 'min(13%, 8.75rem)';
              const translateX =
                distance === 0
                  ? 0
                  : distance === 1
                    ? offset * 34
                    : offset * 49;
              const translateY =
                distance === 0 ? -50 : distance === 1 ? -47 : -43;
              const scale = distance === 0 ? 1 : distance === 1 ? 0.9 : 0.78;
              const opacity =
                distance === 0 ? 1 : distance === 1 ? 0.62 : 0.24;
              const rotate = distance === 0 ? 0 : offset * -6;
              const aspectRatio =
                distance === 0 ? '16 / 10' : distance === 1 ? '5 / 7' : '4 / 7';

              return (
                <button
                  key={image.id || `${image.url}-${index}`}
                  type="button"
                  className={`${styles.cardButton} ${styles.spotlightCard} ${
                    distance === 0 ? styles.spotlightCardActive : ''
                  } ${styles.cardReveal}`}
                  style={{
                    ...getAnimationStyle(index),
                    zIndex: 30 - distance,
                    width,
                    opacity,
                    filter:
                      distance === 0
                        ? 'none'
                        : distance === 1
                          ? 'saturate(0.82) blur(0.2px)'
                          : 'saturate(0.7) blur(0.4px)',
                    transform: `translate(-50%, ${translateY}%) translateX(${translateX}%) scale(${scale}) rotate(${rotate}deg)`,
                  }}
                  onMouseEnter={() => onActivate(index)}
                  onFocus={() => onActivate(index)}
                  onClick={() =>
                    distance === 0 ? onImageClick(index) : onActivate(index)
                  }
                >
                  <div
                    className={`${styles.cardSurface} ${
                      distance === 0 ? styles.spotlightSurfaceActive : styles.spotlightSurface
                    }`}
                    style={{ aspectRatio }}
                  >
                    <img
                      src={image.url}
                      alt={image.alt || image.title || `Gallery image ${index + 1}`}
                      className={styles.cardMedia}
                    />
                    <GalleryCaptionOverlay
                      image={image}
                      showCaptions={showCaptions && distance <= 1}
                      variant={distance === 0 ? 'overlay' : 'glass'}
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
          ariaLabel="Highlight next image"
        />
      </div>

      {images.length > 1 && (
        <div className={styles.dots}>
          {images.map((image, index) => (
            <button
              key={image.id || `${image.url}-dot-${index}`}
              type="button"
              className={`${styles.dotButton} ${
                activeIndex === index ? styles.dotButtonActive : ''
              }`}
              onClick={() => onActivate(index)}
              aria-label={`Highlight gallery image ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
