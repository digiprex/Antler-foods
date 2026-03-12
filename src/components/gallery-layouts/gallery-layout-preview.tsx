import type { CSSProperties, ReactNode } from 'react';
import { normalizeGalleryLayout } from './gallery-layout-options';
import type { GalleryConfig } from '@/types/gallery.types';

interface GalleryLayoutPreviewProps {
  layout?: GalleryConfig['layout'];
  columns?: number;
  size?: 'card' | 'panel';
}

const PHOTO_PALETTES = [
  {
    base: '#28544b',
    accent: '#4d8a74',
    warm: '#efc06d',
    plate: '#f4f5e7',
  },
  {
    base: '#23437a',
    accent: '#4f7fe0',
    warm: '#74c8f8',
    plate: '#eef7ff',
  },
  {
    base: '#71411f',
    accent: '#be7426',
    warm: '#efc750',
    plate: '#fff3d9',
  },
  {
    base: '#8a2449',
    accent: '#d75b79',
    warm: '#ff9eb2',
    plate: '#fff0f4',
  },
  {
    base: '#365a7f',
    accent: '#69a4c8',
    warm: '#d7bf93',
    plate: '#eff8fb',
  },
  {
    base: '#5b1c20',
    accent: '#bf5f31',
    warm: '#efb36b',
    plate: '#fff3df',
  },
];

function getPhotoBackground(index: number) {
  const palette = PHOTO_PALETTES[index % PHOTO_PALETTES.length];

  return `
    radial-gradient(circle at 82% 20%, rgba(255,255,255,0.2) 0 9%, transparent 10%),
    linear-gradient(135deg, ${palette.base} 0%, ${palette.accent} 54%, ${palette.warm} 100%)
  `;
}

function PreviewFrame({
  children,
  isPanel,
}: {
  children: ReactNode;
  isPanel: boolean;
}) {
  return (
    <div className={isPanel ? 'mx-auto w-full max-w-5xl' : 'h-full w-full'}>
      <div
        style={{
          borderRadius: isPanel ? '1.6rem' : '1.15rem',
          border: '1px solid rgba(226, 232, 240, 0.95)',
          background:
            'linear-gradient(145deg, rgba(255,255,255,0.99), rgba(246,248,252,0.97) 58%, rgba(235,240,248,0.94))',
          boxShadow: isPanel
            ? '0 24px 64px rgba(15, 23, 42, 0.1)'
            : '0 16px 32px rgba(15, 23, 42, 0.08)',
          padding: isPanel ? '0.85rem' : '0.5rem',
        }}
      >
        <div
          style={{
            overflow: 'hidden',
            borderRadius: isPanel ? '1.25rem' : '0.9rem',
            border: '1px solid rgba(226, 232, 240, 0.92)',
            background:
              'linear-gradient(180deg, rgba(255,255,255,0.98), rgba(244,247,251,0.98))',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: isPanel
                ? '0.7rem 0.8rem 0.55rem'
                : '0.42rem 0.5rem 0.34rem',
              borderBottom: '1px solid rgba(226, 232, 240, 0.88)',
            }}
          >
            <div style={{ display: 'grid', gap: isPanel ? '0.25rem' : '0.13rem' }}>
              <span
                style={{
                  width: isPanel ? '5.2rem' : '2.3rem',
                  height: isPanel ? '0.42rem' : '0.19rem',
                  borderRadius: 999,
                  background: 'rgba(148, 163, 184, 0.36)',
                }}
              />
              <span
                style={{
                  width: isPanel ? '8rem' : '3.6rem',
                  height: isPanel ? '0.32rem' : '0.14rem',
                  borderRadius: 999,
                  background: 'rgba(203, 213, 225, 0.92)',
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: isPanel ? '0.24rem' : '0.12rem' }}>
              {Array.from({ length: 3 }).map((_, index) => (
                <span
                  key={index}
                  style={{
                    width: isPanel ? '0.34rem' : '0.16rem',
                    height: isPanel ? '0.34rem' : '0.16rem',
                    borderRadius: 999,
                    background:
                      index === 0
                        ? 'rgba(99, 102, 241, 0.48)'
                        : 'rgba(203, 213, 225, 0.92)',
                  }}
                />
              ))}
            </div>
          </div>

          <div
            style={{
              padding: isPanel ? '0.85rem' : '0.48rem',
              background:
                'linear-gradient(180deg, rgba(244,247,251,0.96), rgba(238,242,247,0.98))',
              minHeight: isPanel ? '13.8rem' : '5.55rem',
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

function PhotoTile({
  index,
  featured = false,
  portrait = false,
  style,
}: {
  index: number;
  featured?: boolean;
  portrait?: boolean;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: featured ? '1rem' : '0.85rem',
        border: '1px solid rgba(255, 255, 255, 0.52)',
        background: getPhotoBackground(index),
        boxShadow: featured
          ? '0 18px 34px rgba(15, 23, 42, 0.16)'
          : '0 10px 22px rgba(15, 23, 42, 0.1)',
        ...style,
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(180deg, rgba(255,255,255,0.15), rgba(255,255,255,0.04) 28%, rgba(15,23,42,0.2) 100%)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: portrait ? '14%' : featured ? '10%' : '8%',
          bottom: portrait ? '12%' : featured ? '14%' : '10%',
          width: portrait ? '58%' : featured ? '46%' : '38%',
          aspectRatio: portrait ? '4 / 5' : '1 / 1',
          borderRadius: portrait ? '40%' : 999,
          background:
            portrait
              ? 'linear-gradient(180deg, rgba(255,255,255,0.82), rgba(255,255,255,0.2))'
              : 'radial-gradient(circle, rgba(255,255,255,0.86), rgba(255,255,255,0.2) 62%, rgba(255,255,255,0.04) 100%)',
          boxShadow: '0 10px 24px rgba(15, 23, 42, 0.18)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: portrait ? '20%' : featured ? '18%' : '13%',
          bottom: portrait ? '18%' : featured ? '18%' : '13%',
          width: portrait ? '30%' : featured ? '14%' : '12%',
          height: portrait ? '10%' : '12%',
          borderRadius: 999,
          background: 'rgba(255,255,255,0.24)',
          filter: 'blur(6px)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 'auto 0 0 0',
          height: featured ? '42%' : '36%',
          background:
            'linear-gradient(180deg, rgba(15,23,42,0), rgba(15,23,42,0.24) 48%, rgba(15,23,42,0.42) 100%)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: '8%',
          right: '8%',
          bottom: '9%',
          display: 'grid',
          gap: '0.22rem',
        }}
      >
        <span
          style={{
            width: featured ? '42%' : portrait ? '54%' : '48%',
            height: '0.3rem',
            borderRadius: 999,
            background: 'rgba(255,255,255,0.88)',
          }}
        />
        <span
          style={{
            width: featured ? '56%' : portrait ? '70%' : '64%',
            height: '0.24rem',
            borderRadius: 999,
            background: 'rgba(255,255,255,0.56)',
          }}
        />
      </div>
    </div>
  );
}

export function GalleryLayoutPreview({
  layout,
  columns = 3,
  size = 'card',
}: GalleryLayoutPreviewProps) {
  const normalizedLayout = normalizeGalleryLayout(layout);
  const isPanel = size === 'panel';
  const gap = isPanel ? '0.75rem' : '0.35rem';
  const gridColumns = Math.max(2, Math.min(columns, 4));
  const baseHeight = isPanel ? '11.4rem' : '4rem';

  const renderGrid = () => (
    <div
      style={{
        display: 'grid',
        gap,
        gridTemplateColumns: isPanel
          ? `repeat(${gridColumns}, minmax(0, 1fr))`
          : 'repeat(2, minmax(0, 1fr))',
        minHeight: baseHeight,
      }}
    >
      {Array.from({ length: isPanel ? gridColumns * 2 : 4 }).map((_, index) => (
        <PhotoTile
          key={index}
          index={index}
          featured={!isPanel && index === 0}
          style={{ minHeight: isPanel ? '4.7rem' : index === 0 ? '2.4rem' : '1.95rem' }}
        />
      ))}
    </div>
  );

  const renderShowcase = () => (
    <div
      style={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: isPanel ? '1.35rem' : '0.95rem',
        padding: isPanel ? '0.9rem 1rem 1.1rem' : '0.42rem 0.46rem 0.82rem',
        minHeight: baseHeight,
        background:
          'radial-gradient(circle at center, rgba(255,245,182,0.75), transparent 34%), linear-gradient(135deg, #f6df2b 0%, #f3cd1d 46%, #ffd742 100%)',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: '-8% -4%',
          opacity: 0.64,
          backgroundImage:
            'radial-gradient(circle at 0% 50%, transparent 0 28%, rgba(255,255,255,0.22) 28.5% 29%, transparent 29.4%), radial-gradient(circle at 100% 50%, transparent 0 28%, rgba(255,255,255,0.22) 28.5% 29%, transparent 29.4%), repeating-linear-gradient(90deg, transparent 0 0.9rem, rgba(255,255,255,0.12) 0.9rem 0.96rem)',
        }}
      />

      <div
        style={{
          position: 'relative',
          display: 'flex',
          gap: isPanel ? '0.38rem' : '0.2rem',
          width: 'min(100%, 74%)',
          margin: '0 auto',
        }}
      >
        {Array.from({ length: 4 }).map((_, index) => (
          <span
            key={index}
            style={{
              flex: 1,
              height: isPanel ? '0.32rem' : '0.17rem',
              borderRadius: 999,
              background:
                index === 0 ? 'rgba(15,23,42,0.96)' : 'rgba(15,23,42,0.14)',
            }}
          />
        ))}
      </div>

      <div
        style={{
          position: 'relative',
          display: 'grid',
          gridTemplateColumns: isPanel ? '0.42fr 2.18fr 0.42fr' : '0.38fr 1.92fr 0.38fr',
          gap: 0,
          alignItems: 'center',
          minHeight: isPanel ? '10.4rem' : '4.05rem',
          paddingTop: isPanel ? '1.15rem' : '0.55rem',
        }}
      >
        <PhotoTile
          index={1}
          style={{
            height: isPanel ? '8rem' : '3rem',
            transform: isPanel
              ? 'translateX(1.1rem) translateY(0.85rem)'
              : 'translateX(0.45rem) translateY(0.3rem)',
            opacity: 1,
            zIndex: 1,
          }}
        />
        <PhotoTile
          index={0}
          featured
          style={{
            height: isPanel ? '11.2rem' : '4.5rem',
            zIndex: 2,
          }}
        />
        <PhotoTile
          index={2}
          style={{
            height: isPanel ? '8rem' : '3rem',
            transform: isPanel
              ? 'translateX(-1.1rem) translateY(0.85rem)'
              : 'translateX(-0.45rem) translateY(0.3rem)',
            opacity: 1,
            zIndex: 1,
          }}
        />

        <span
          style={{
            position: 'absolute',
            left: isPanel ? '0.4rem' : '0.12rem',
            top: '50%',
            transform: 'translateY(-10%)',
            width: isPanel ? '2rem' : '0.88rem',
            height: isPanel ? '2rem' : '0.88rem',
            borderRadius: 999,
            background: 'rgba(255,255,255,0.96)',
            boxShadow: '0 10px 24px rgba(146, 96, 4, 0.18)',
          }}
        />
        <span
          style={{
            position: 'absolute',
            right: isPanel ? '0.4rem' : '0.12rem',
            top: '50%',
            transform: 'translateY(-10%)',
            width: isPanel ? '2rem' : '0.88rem',
            height: isPanel ? '2rem' : '0.88rem',
            borderRadius: 999,
            background: 'rgba(255,255,255,0.96)',
            boxShadow: '0 10px 24px rgba(146, 96, 4, 0.18)',
          }}
        />
      </div>
    </div>
  );

  const renderSpotlight = () => (isPanel ? (
    <div
      style={{
        display: 'grid',
        gap,
        gridTemplateColumns: '1.05fr 1.2fr 1.7fr 1.2fr 1.05fr',
        alignItems: 'end',
        minHeight: baseHeight,
      }}
    >
      <PhotoTile
        index={1}
        portrait
        style={{ height: isPanel ? '7rem' : '2.45rem', opacity: 0.68 }}
      />
      <PhotoTile
        index={2}
        portrait
        style={{ height: isPanel ? '8.2rem' : '2.95rem', opacity: 0.84 }}
      />
      <PhotoTile
        index={0}
        featured
        portrait
        style={{ height: isPanel ? '11.3rem' : '4rem' }}
      />
      <PhotoTile
        index={3}
        portrait
        style={{ height: isPanel ? '8.2rem' : '2.95rem', opacity: 0.84 }}
      />
      <PhotoTile
        index={4}
        portrait
        style={{ height: isPanel ? '7rem' : '2.45rem', opacity: 0.68 }}
      />
    </div>
  ) : (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '0.85fr 1.25fr 0.85fr',
        gap,
        alignItems: 'center',
        minHeight: '5rem',
      }}
    >
      <div style={{ display: 'grid', gap: gap }}>
        <PhotoTile index={1} portrait style={{ height: '1.7rem', opacity: 0.9 }} />
        <PhotoTile index={2} portrait style={{ height: '1.5rem', opacity: 0.72 }} />
      </div>
      <PhotoTile index={0} featured portrait style={{ height: '4.4rem' }} />
      <div style={{ display: 'grid', gap: gap }}>
        <PhotoTile index={3} portrait style={{ height: '1.7rem', opacity: 0.9 }} />
        <PhotoTile index={4} portrait style={{ height: '1.5rem', opacity: 0.72 }} />
      </div>
    </div>
  ));

  const renderMosaic = () => (isPanel ? (
    <div
      style={{
        display: 'grid',
        gap,
        gridTemplateColumns: 'repeat(12, minmax(0, 1fr))',
        minHeight: baseHeight,
      }}
    >
      <PhotoTile
        index={0}
        featured
        style={{ gridColumn: 'span 5 / span 5', minHeight: isPanel ? '9.8rem' : '3.5rem' }}
      />
      <PhotoTile
        index={1}
        style={{ gridColumn: 'span 4 / span 4', minHeight: isPanel ? '4.5rem' : '1.6rem' }}
      />
      <PhotoTile
        index={2}
        style={{ gridColumn: 'span 3 / span 3', minHeight: isPanel ? '4.5rem' : '1.6rem' }}
      />
      <PhotoTile
        index={3}
        style={{ gridColumn: 'span 3 / span 3', minHeight: isPanel ? '4.5rem' : '1.6rem' }}
      />
      <PhotoTile
        index={4}
        style={{ gridColumn: 'span 4 / span 4', minHeight: isPanel ? '4.5rem' : '1.6rem' }}
      />
      <PhotoTile
        index={5}
        style={{ gridColumn: 'span 5 / span 5', minHeight: isPanel ? '4.5rem' : '1.6rem' }}
      />
    </div>
  ) : (
    <div
      style={{
        display: 'grid',
        gap,
        gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
        gridAutoRows: '1.2rem',
        minHeight: '5rem',
      }}
    >
      <PhotoTile
        index={0}
        featured
        style={{ gridColumn: 'span 2', gridRow: 'span 2' }}
      />
      <PhotoTile index={1} style={{ gridColumn: 'span 2' }} />
      <PhotoTile index={2} style={{ gridColumn: 'span 1' }} />
      <PhotoTile index={3} style={{ gridColumn: 'span 1' }} />
      <PhotoTile index={4} style={{ gridColumn: 'span 2' }} />
    </div>
  ));

  const renderEditorial = () => (isPanel ? (
    <div
      style={{
        display: 'grid',
        gap,
        gridTemplateColumns: 'repeat(12, minmax(0, 1fr))',
        minHeight: baseHeight,
      }}
    >
      <PhotoTile
        index={0}
        featured
        style={{ gridColumn: '1 / -1', minHeight: isPanel ? '6.3rem' : '2.25rem' }}
      />
      {Array.from({ length: 4 }).map((_, index) => (
        <PhotoTile
          key={index}
          index={index + 1}
          style={{
            gridColumn: 'span 3 / span 3',
            minHeight: isPanel ? '4.4rem' : '1.55rem',
          }}
        />
      ))}
    </div>
  ) : (
    <div
      style={{
        display: 'grid',
        gap,
        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
        gridAutoRows: '1.35rem',
        minHeight: '5rem',
      }}
    >
      <PhotoTile
        index={0}
        featured
        style={{ gridColumn: '1 / -1', gridRow: 'span 2' }}
      />
      <PhotoTile index={1} style={{ gridColumn: 'span 1' }} />
      <PhotoTile index={2} style={{ gridColumn: 'span 1' }} />
      <PhotoTile index={3} style={{ gridColumn: 'span 1' }} />
    </div>
  ));

  const renderFilmstrip = () => (
    <div
      style={{
        display: 'flex',
        alignItems: 'end',
        justifyContent: 'center',
        gap,
        minHeight: baseHeight,
      }}
    >
      {Array.from({ length: isPanel ? 5 : 4 }).map((_, index) => (
        <PhotoTile
          key={index}
          index={index}
          portrait
          featured={index === (isPanel ? 2 : 1)}
          style={{
            width: index === (isPanel ? 2 : 1)
              ? (isPanel ? '22%' : '25%')
              : isPanel
                ? '16%'
                : '18%',
            height:
              index === (isPanel ? 2 : 1)
                ? isPanel
                  ? '10.4rem'
                  : '4.2rem'
                : isPanel
                  ? '7.4rem'
                  : index === 0 || index === 3
                    ? '2.9rem'
                    : '3.45rem',
            opacity: index === (isPanel ? 2 : 1) ? 1 : 0.84,
          }}
        />
      ))}
    </div>
  );

  const renderMasonry = () => {
    const heights = isPanel
      ? ['6.8rem', '4.6rem', '5.9rem', '5rem', '4.4rem', '6.3rem', '4.9rem', '5.8rem']
      : ['2.4rem', '1.55rem', '2.05rem', '1.85rem', '1.45rem', '2.2rem'];

    return (
      <div
        style={{
          display: 'grid',
          gap,
          gridTemplateColumns: isPanel
            ? `repeat(${Math.min(gridColumns, 4)}, minmax(0, 1fr))`
            : 'repeat(3, minmax(0, 1fr))',
          minHeight: baseHeight,
        }}
      >
        {heights
          .slice(0, isPanel ? Math.min(gridColumns, 4) * 2 : 6)
          .map((height, index) => (
            <PhotoTile
              key={index}
              index={index}
              featured={!isPanel && index === 0}
              style={{ height }}
            />
          ))}
      </div>
    );
  };

  const renderCarousel = () => (
    <div style={{ display: 'grid', gap, minHeight: baseHeight }}>
      <div
        style={{
          display: 'grid',
          gap,
          gridTemplateColumns: isPanel ? '1.7fr 1fr 1fr' : '1.5fr 1fr',
          minHeight: isPanel ? '9rem' : '3.15rem',
        }}
      >
        <PhotoTile index={0} featured style={{ minHeight: '100%' }} />
        <div style={{ display: 'grid', gap }}>
          <PhotoTile index={1} style={{ minHeight: isPanel ? '100%' : '1.45rem' }} />
          {isPanel ? (
            <PhotoTile index={2} style={{ minHeight: '100%' }} />
          ) : (
            <PhotoTile index={2} style={{ minHeight: '1.45rem' }} />
          )}
        </div>
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: isPanel ? '0.38rem' : '0.22rem',
        }}
      >
        {Array.from({ length: 4 }).map((_, index) => (
          <span
            key={index}
            style={{
              width:
                index === 0
                  ? isPanel
                    ? '1.8rem'
                    : '0.78rem'
                  : isPanel
                    ? '0.48rem'
                    : '0.24rem',
              height: isPanel ? '0.36rem' : '0.18rem',
              borderRadius: 999,
              background:
                index === 0
                  ? 'rgba(99, 102, 241, 0.7)'
                  : 'rgba(148, 163, 184, 0.34)',
            }}
          />
        ))}
      </div>
    </div>
  );

  return (
    <PreviewFrame isPanel={isPanel}>
      {normalizedLayout === 'showcase'
        ? renderShowcase()
        : normalizedLayout === 'spotlight'
        ? renderSpotlight()
        : normalizedLayout === 'mosaic'
          ? renderMosaic()
          : normalizedLayout === 'editorial'
            ? renderEditorial()
            : normalizedLayout === 'filmstrip'
              ? renderFilmstrip()
              : normalizedLayout === 'masonry'
                ? renderMasonry()
                : normalizedLayout === 'carousel'
                  ? renderCarousel()
                  : renderGrid()}
    </PreviewFrame>
  );
}
