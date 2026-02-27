/**
 * Gallery Component
 *
 * Displays a responsive image gallery with various layout options
 */

'use client';

import { useState } from 'react';
import Image from 'next/image';
import type { GalleryConfig } from '@/types/gallery.types';

type GalleryProps = Partial<GalleryConfig>;

export default function Gallery({
  title = 'Our Gallery',
  subtitle,
  description,
  images = [],
  layout = 'grid',
  columns = 3,
  gap = '1rem',
  aspectRatio = 'square',
  bgColor = '#ffffff',
  textColor = '#000000',
  padding = '4rem 2rem',
  maxWidth = '1200px',
  showCaptions = true,
  enableLightbox = true,
}: GalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);

  if (images.length === 0) {
    return null;
  }

  const openLightbox = (index: number) => {
    if (enableLightbox) {
      setLightboxIndex(index);
    }
  };

  const closeLightbox = () => setLightboxIndex(null);

  const nextImage = () => {
    if (lightboxIndex !== null) {
      setLightboxIndex((lightboxIndex + 1) % images.length);
    }
  };

  const prevImage = () => {
    if (lightboxIndex !== null) {
      setLightboxIndex((lightboxIndex - 1 + images.length) % images.length);
    }
  };

  const getAspectRatioClass = () => {
    switch (aspectRatio) {
      case 'square':
        return '1 / 1';
      case '16:9':
        return '16 / 9';
      case '4:3':
        return '4 / 3';
      default:
        return 'auto';
    }
  };

  return (
    <section style={{ backgroundColor: bgColor, color: textColor, padding }}>
      <div style={{ maxWidth, margin: '0 auto' }}>
        {/* Header */}
        {(title || subtitle || description) && (
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            {subtitle && (
              <p style={{ fontSize: '0.875rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem', opacity: 0.7 }}>
                {subtitle}
              </p>
            )}
            {title && (
              <h2 style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>
                {title}
              </h2>
            )}
            {description && (
              <p style={{ fontSize: '1.125rem', opacity: 0.8, maxWidth: '800px', margin: '0 auto' }}>
                {description}
              </p>
            )}
          </div>
        )}

        {/* Gallery Layout */}
        {layout === 'masonry' ? (
          // Masonry Layout - Pinterest style with CSS columns
          <div style={{
            columnCount: columns,
            columnGap: gap,
            width: '100%',
          }}>
            {images.map((image, index) => (
              <div
                key={image.id || index}
                style={{
                  cursor: enableLightbox ? 'pointer' : 'default',
                  overflow: 'hidden',
                  borderRadius: '0.5rem',
                  position: 'relative',
                  marginBottom: gap,
                  breakInside: 'avoid',
                  pageBreakInside: 'avoid',
                  display: 'block',
                  width: '100%',
                }}
                onClick={() => openLightbox(index)}
              >
              <Image
                src={image.url}
                alt={image.alt}
                width={400}
                height={300}
                style={{
                  width: '100%',
                  height: 'auto',
                  display: 'block',
                  borderRadius: '0.5rem',
                  transition: 'transform 0.3s ease',
                  objectFit: 'cover',
                }}
                onMouseEnter={(e) => {
                  if (enableLightbox) {
                    e.currentTarget.style.transform = 'scale(1.02)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              />
                {showCaptions && (image.title || image.description) && (
                  <div style={{
                    position: 'absolute',
                    bottom: '0.5rem',
                    left: '0.5rem',
                    right: '0.5rem',
                    background: 'rgba(0, 0, 0, 0.7)',
                    borderRadius: '0.375rem',
                    padding: '0.75rem',
                    color: 'white',
                  }}>
                    {image.title && <div style={{ fontWeight: 'bold', marginBottom: '0.25rem', fontSize: '0.875rem' }}>{image.title}</div>}
                    {image.description && <div style={{ fontSize: '0.75rem', opacity: 0.9 }}>{image.description}</div>}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : layout === 'carousel' ? (
          // Carousel Layout - Multi-item slider
          <div style={{ position: 'relative' }}>
            <div style={{
              overflow: 'hidden',
              position: 'relative',
              borderRadius: '0.5rem',
            }}>
              <div style={{
                display: 'flex',
                transition: 'transform 0.5s ease',
                transform: `translateX(-${currentSlide * (100 / columns)}%)`,
                gap,
              }}>
                {images.map((image, index) => (
                  <div
                    key={image.id || index}
                    style={{
                      minWidth: `calc((100% - ${gap} * ${columns - 1}) / ${columns})`,
                      cursor: enableLightbox ? 'pointer' : 'default',
                      position: 'relative',
                      overflow: 'hidden',
                      borderRadius: '0.5rem',
                    }}
                    onClick={() => openLightbox(index)}
                  >
                    <Image
                      src={image.url}
                      alt={image.alt}
                      width={400}
                      height={400}
                      style={{
                        width: '100%',
                        height: '400px',
                        objectFit: 'cover',
                        display: 'block',
                      }}
                    />
                    {showCaptions && (image.title || image.description) && (
                      <div style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)',
                        padding: '1rem',
                        color: 'white',
                      }}>
                        {image.title && <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>{image.title}</div>}
                        {image.description && <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>{image.description}</div>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Carousel Navigation */}
            {images.length > columns && (
              <>
                <button
                  onClick={() => setCurrentSlide((prev) => Math.max(0, prev - 1))}
                  disabled={currentSlide === 0}
                  style={{
                    position: 'absolute',
                    left: '-1.25rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'rgba(255, 255, 255, 0.9)',
                    border: 'none',
                    color: '#000',
                    fontSize: '2rem',
                    cursor: currentSlide === 0 ? 'not-allowed' : 'pointer',
                    padding: '0.5rem 1rem',
                    borderRadius: '0.5rem',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
                    zIndex: 10,
                    opacity: currentSlide === 0 ? 0.4 : 1,
                  }}
                >
                  ‹
                </button>
                <button
                  onClick={() => setCurrentSlide((prev) => Math.min(images.length - columns, prev + 1))}
                  disabled={currentSlide >= images.length - columns}
                  style={{
                    position: 'absolute',
                    right: '-1.25rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'rgba(255, 255, 255, 0.9)',
                    border: 'none',
                    color: '#000',
                    fontSize: '2rem',
                    cursor: currentSlide >= images.length - columns ? 'not-allowed' : 'pointer',
                    padding: '0.5rem 1rem',
                    borderRadius: '0.5rem',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
                    zIndex: 10,
                    opacity: currentSlide >= images.length - columns ? 0.4 : 1,
                  }}
                >
                  ›
                </button>

                {/* Dots Indicator */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  marginTop: '1.5rem',
                }}>
                  {Array.from({ length: Math.ceil((images.length - columns + 1)) }).map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentSlide(index)}
                      style={{
                        width: currentSlide === index ? '2rem' : '0.75rem',
                        height: '0.75rem',
                        borderRadius: '0.375rem',
                        border: 'none',
                        background: currentSlide === index ? textColor : 'rgba(0, 0, 0, 0.2)',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                      }}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        ) : (
          // Grid Layout (default)
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${columns}, 1fr)`,
            gap,
          }}>
            {images.map((image, index) => (
              <div
                key={image.id || index}
                style={{
                  cursor: enableLightbox ? 'pointer' : 'default',
                  overflow: 'hidden',
                  borderRadius: '0.5rem',
                  position: 'relative',
                  aspectRatio: getAspectRatioClass(),
                }}
                onClick={() => openLightbox(index)}
              >
                <Image
                  src={image.url}
                  alt={image.alt}
                  fill
                  style={{
                    objectFit: 'cover',
                    transition: 'transform 0.3s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (enableLightbox) {
                      e.currentTarget.style.transform = 'scale(1.05)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                />
                {showCaptions && (image.title || image.description) && (
                  <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)',
                    padding: '1rem',
                    color: 'white',
                  }}>
                    {image.title && <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>{image.title}</div>}
                    {image.description && <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>{image.description}</div>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Lightbox */}
        {enableLightbox && lightboxIndex !== null && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.95)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '2rem',
            }}
            onClick={closeLightbox}
          >
            {/* Close button */}
            <button
              onClick={closeLightbox}
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                background: 'transparent',
                border: 'none',
                color: 'white',
                fontSize: '2rem',
                cursor: 'pointer',
                padding: '0.5rem',
                lineHeight: 1,
              }}
            >
              ×
            </button>

            {/* Previous button */}
            {images.length > 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); prevImage(); }}
                style={{
                  position: 'absolute',
                  left: '1rem',
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: 'none',
                  color: 'white',
                  fontSize: '2rem',
                  cursor: 'pointer',
                  padding: '0.5rem 1rem',
                  borderRadius: '0.5rem',
                }}
              >
                ‹
              </button>
            )}

            {/* Image */}
            <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '90%', maxHeight: '90%', position: 'relative' }}>
              <Image
                src={images[lightboxIndex].url}
                alt={images[lightboxIndex].alt}
                width={1200}
                height={800}
                style={{
                  maxWidth: '100%',
                  maxHeight: '85vh',
                  width: 'auto',
                  height: 'auto',
                  objectFit: 'contain',
                }}
              />
              {showCaptions && (images[lightboxIndex].title || images[lightboxIndex].description) && (
                <div style={{
                  color: 'white',
                  textAlign: 'center',
                  marginTop: '1rem',
                }}>
                  {images[lightboxIndex].title && <div style={{ fontWeight: 'bold', fontSize: '1.125rem', marginBottom: '0.5rem' }}>{images[lightboxIndex].title}</div>}
                  {images[lightboxIndex].description && <div style={{ opacity: 0.9 }}>{images[lightboxIndex].description}</div>}
                </div>
              )}
            </div>

            {/* Next button */}
            {images.length > 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); nextImage(); }}
                style={{
                  position: 'absolute',
                  right: '1rem',
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: 'none',
                  color: 'white',
                  fontSize: '2rem',
                  cursor: 'pointer',
                  padding: '0.5rem 1rem',
                  borderRadius: '0.5rem',
                }}
              >
                ›
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
