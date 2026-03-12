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
  const visibleCards = images
    .map((image, index) => {
      const offset = getCircularOffset(index, activeIndex, images.length, 2);

      if (offset === null) {
        return null;
      }

      return {
        image,
        index,
        offset,
        distance: Math.abs(offset),
      };
    })
    .filter(
      (
        card,
      ): card is {
        image: GalleryInteractiveLayoutProps['images'][number];
        index: number;
        offset: number;
        distance: number;
      } => Boolean(card),
    );

  const activeCard = visibleCards.find((card) => card.offset === 0);
  const leftCards = visibleCards
    .filter((card) => card.offset < 0)
    .sort((a, b) => a.offset - b.offset);
  const rightCards = visibleCards
    .filter((card) => card.offset > 0)
    .sort((a, b) => a.offset - b.offset);

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
            <div
              className={`${styles.spotlightRail} ${styles.spotlightRailLeft}`}
            >
              {leftCards.map((card) => (
                <button
                  key={card.image.id || `${card.image.url}-${card.index}`}
                  type="button"
                  className={`${styles.cardButton} ${styles.spotlightRailCard} ${
                    card.distance === 1
                      ? styles.spotlightRailCardPrimary
                      : styles.spotlightRailCardSecondary
                  }`}
                  style={{
                    ...getAnimationStyle(card.index),
                    transform:
                      card.distance === 1
                        ? 'rotate(-3deg)'
                        : 'rotate(-6deg)',
                  }}
                  onMouseEnter={() => onActivate(card.index)}
                  onFocus={() => onActivate(card.index)}
                  onClick={() => onActivate(card.index)}
                >
                  <div
                    className={`${styles.cardSurface} ${styles.cardReveal} ${
                      card.distance === 1
                        ? styles.spotlightSideSurfacePrimary
                        : styles.spotlightSideSurfaceSecondary
                    }`}
                    style={{
                      aspectRatio: card.distance === 1 ? '5 / 6' : '4 / 5',
                    }}
                  >
                    <img
                      src={card.image.url}
                      alt={
                        card.image.alt ||
                        card.image.title ||
                        `Gallery image ${card.index + 1}`
                      }
                      className={styles.cardMedia}
                    />
                    <GalleryCaptionOverlay
                      image={card.image}
                      showCaptions={showCaptions && card.distance === 1}
                      variant="glass"
                    />
                  </div>
                </button>
              ))}
            </div>

            {activeCard ? (
              <button
                type="button"
                className={`${styles.cardButton} ${styles.spotlightHeroButton}`}
                style={getAnimationStyle(activeCard.index)}
                onClick={() => onImageClick(activeCard.index)}
              >
                <div
                  className={`${styles.cardSurface} ${styles.cardReveal} ${styles.spotlightHeroSurface}`}
                  style={{ aspectRatio: '16 / 11' }}
                >
                  <img
                    src={activeCard.image.url}
                    alt={
                      activeCard.image.alt ||
                      activeCard.image.title ||
                      `Gallery image ${activeCard.index + 1}`
                    }
                    className={styles.cardMedia}
                  />
                  <GalleryCaptionOverlay
                    image={activeCard.image}
                    showCaptions={showCaptions}
                    variant="overlay"
                  />
                </div>
              </button>
            ) : null}

            <div
              className={`${styles.spotlightRail} ${styles.spotlightRailRight}`}
            >
              {rightCards.map((card) => (
                <button
                  key={card.image.id || `${card.image.url}-${card.index}`}
                  type="button"
                  className={`${styles.cardButton} ${styles.spotlightRailCard} ${
                    card.distance === 1
                      ? styles.spotlightRailCardPrimary
                      : styles.spotlightRailCardSecondary
                  }`}
                  style={{
                    ...getAnimationStyle(card.index),
                    transform:
                      card.distance === 1 ? 'rotate(3deg)' : 'rotate(6deg)',
                  }}
                  onMouseEnter={() => onActivate(card.index)}
                  onFocus={() => onActivate(card.index)}
                  onClick={() => onActivate(card.index)}
                >
                  <div
                    className={`${styles.cardSurface} ${styles.cardReveal} ${
                      card.distance === 1
                        ? styles.spotlightSideSurfacePrimary
                        : styles.spotlightSideSurfaceSecondary
                    }`}
                    style={{
                      aspectRatio: card.distance === 1 ? '5 / 6' : '4 / 5',
                    }}
                  >
                    <img
                      src={card.image.url}
                      alt={
                        card.image.alt ||
                        card.image.title ||
                        `Gallery image ${card.index + 1}`
                      }
                      className={styles.cardMedia}
                    />
                    <GalleryCaptionOverlay
                      image={card.image}
                      showCaptions={showCaptions && card.distance === 1}
                      variant="glass"
                    />
                  </div>
                </button>
              ))}
            </div>
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
