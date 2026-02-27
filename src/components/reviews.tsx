/**
 * Reviews Component
 *
 * Displays customer reviews with various layout options
 */

'use client';

import { useState } from 'react';
import Image from 'next/image';
import type { ReviewConfig, Review } from '@/types/review.types';

interface ReviewsProps extends Partial<ReviewConfig> {
  reviews?: Review[];
}

export default function Reviews({
  title = '',
  subtitle,
  description,
  reviews = [],
  layout = 'grid',
  columns = 3,
  showAvatar = true,
  showRating = true,
  showDate = true,
  showSource = true,
  maxReviews,
  bgColor = '#f9fafb',
  textColor = '#000000',
  cardBgColor = '#ffffff',
  starColor = '#fbbf24',
  padding = '4rem 2rem',
  maxWidth = '1200px',
}: ReviewsProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  if (reviews.length === 0) {
    return null;
  }

  const displayReviews = maxReviews ? reviews.slice(0, maxReviews) : reviews;

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }).map((_, index) => (
      <span
        key={index}
        style={{
          color: index < rating ? starColor : '#d1d5db',
          fontSize: '1.25rem',
        }}
      >
        ★
      </span>
    ));
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
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

        {/* Reviews Layout */}
        {layout === 'slider' ? (
          // Slider Layout
          <div style={{ position: 'relative' }}>
            <div style={{
              overflow: 'hidden',
              position: 'relative',
            }}>
              <div style={{
                display: 'flex',
                transition: 'transform 0.5s ease',
                transform: `translateX(-${currentSlide * (100 / columns)}%)`,
                gap: '1rem',
              }}>
                {displayReviews.map((review) => (
                  <div
                    key={review.review_id}
                    style={{
                      minWidth: `calc((100% - 1rem * ${columns - 1}) / ${columns})`,
                      background: cardBgColor,
                      borderRadius: '0.75rem',
                      padding: '1.5rem',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                    }}
                  >
                    {/* Rating */}
                    {showRating && (
                      <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '0.75rem' }}>
                        {renderStars(review.rating)}
                      </div>
                    )}

                    {/* Review Text */}
                    {review.review_text && (
                      <p style={{ fontSize: '0.9375rem', lineHeight: '1.6', marginBottom: '1rem', color: textColor }}>
                        &ldquo;{review.review_text}&rdquo;
                      </p>
                    )}

                    {/* Author Info */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', paddingTop: '1rem', borderTop: `1px solid rgba(0,0,0,0.1)` }}>
                      {showAvatar && review.avatar_url && (
                        <Image
                          src={review.avatar_url}
                          alt={review.author_name || 'User'}
                          width={40}
                          height={40}
                          style={{
                            borderRadius: '50%',
                            objectFit: 'cover',
                          }}
                        />
                      )}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '600', fontSize: '0.875rem' }}>
                          {review.author_name || 'Anonymous'}
                        </div>
                        <div style={{ fontSize: '0.75rem', opacity: 0.7, display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          {showDate && review.published_at && <span>{formatDate(review.published_at)}</span>}
                          {showSource && review.source && <span>• {review.source}</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Slider Navigation */}
            {displayReviews.length > columns && (
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
                  onClick={() => setCurrentSlide((prev) => Math.min(displayReviews.length - columns, prev + 1))}
                  disabled={currentSlide >= displayReviews.length - columns}
                  style={{
                    position: 'absolute',
                    right: '-1.25rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'rgba(255, 255, 255, 0.9)',
                    border: 'none',
                    color: '#000',
                    fontSize: '2rem',
                    cursor: currentSlide >= displayReviews.length - columns ? 'not-allowed' : 'pointer',
                    padding: '0.5rem 1rem',
                    borderRadius: '0.5rem',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
                    zIndex: 10,
                    opacity: currentSlide >= displayReviews.length - columns ? 0.4 : 1,
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
                  {Array.from({ length: Math.ceil((displayReviews.length - columns + 1)) }).map((_, index) => (
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
        ) : layout === 'list' ? (
          // List Layout
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {displayReviews.map((review) => (
              <div
                key={review.review_id}
                style={{
                  background: cardBgColor,
                  borderRadius: '0.75rem',
                  padding: '1.5rem',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                  display: 'flex',
                  gap: '1.5rem',
                }}
              >
                {showAvatar && review.avatar_url && (
                  <Image
                    src={review.avatar_url}
                    alt={review.author_name || 'User'}
                    width={60}
                    height={60}
                    style={{
                      borderRadius: '50%',
                      objectFit: 'cover',
                      flexShrink: 0,
                    }}
                  />
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <div>
                      <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>
                        {review.author_name || 'Anonymous'}
                      </div>
                      <div style={{ fontSize: '0.75rem', opacity: 0.7, display: 'flex', gap: '0.5rem' }}>
                        {showDate && review.published_at && <span>{formatDate(review.published_at)}</span>}
                        {showSource && review.source && <span>• {review.source}</span>}
                      </div>
                    </div>
                    {showRating && (
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        {renderStars(review.rating)}
                      </div>
                    )}
                  </div>
                  {review.review_text && (
                    <p style={{ fontSize: '0.9375rem', lineHeight: '1.6', color: textColor, margin: 0 }}>
                      {review.review_text}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          // Grid/Masonry Layout
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${columns}, 1fr)`,
            gap: '1rem',
          }}>
            {displayReviews.map((review) => (
              <div
                key={review.review_id}
                style={{
                  background: cardBgColor,
                  borderRadius: '0.75rem',
                  padding: '1.5rem',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {/* Rating */}
                {showRating && (
                  <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '0.75rem' }}>
                    {renderStars(review.rating)}
                  </div>
                )}

                {/* Review Text */}
                {review.review_text && (
                  <p style={{ fontSize: '0.9375rem', lineHeight: '1.6', marginBottom: '1rem', color: textColor, flex: 1 }}>
                    &ldquo;{review.review_text}&rdquo;
                  </p>
                )}

                {/* Author Info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', paddingTop: '1rem', borderTop: `1px solid rgba(0,0,0,0.1)` }}>
                  {showAvatar && review.avatar_url && (
                    <Image
                      src={review.avatar_url}
                      alt={review.author_name || 'User'}
                      width={40}
                      height={40}
                      style={{
                        borderRadius: '50%',
                        objectFit: 'cover',
                      }}
                    />
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', fontSize: '0.875rem' }}>
                      {review.author_name || 'Anonymous'}
                    </div>
                    <div style={{ fontSize: '0.75rem', opacity: 0.7, display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {showDate && review.published_at && <span>{formatDate(review.published_at)}</span>}
                      {showSource && review.source && <span>• {review.source}</span>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
