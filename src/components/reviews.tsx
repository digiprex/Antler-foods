/**
 * Reviews Component
 *
 * Displays customer reviews with various layout options and supports
 * website review-intent flow:
 * - 5 stars => redirect to Google review URL
 * - <5 stars => collect feedback and store as manual review
 */

'use client';

import { useEffect, useState } from 'react';
import type { ReviewConfig, Review } from '@/types/review.types';

interface ReviewsProps extends Partial<ReviewConfig> {
  reviews?: Review[];
  restaurantId?: string;
}

interface ReviewIntentGetResponse {
  success: boolean;
  data?: {
    restaurant_id: string;
    google_review_url: string | null;
  };
  error?: string;
}

interface ReviewIntentPostResponse {
  success: boolean;
  data?: {
    review_id: string;
  };
  error?: string;
}

export default function Reviews({
  title = '',
  subtitle,
  description,
  reviews = [],
  restaurantId,
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [authorName, setAuthorName] = useState('');
  const [reviewText, setReviewText] = useState('');
  const [publishedAt, setPublishedAt] = useState(
    () => new Date().toISOString().split('T')[0],
  );
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [googleReviewUrl, setGoogleReviewUrl] = useState<string | null>(null);
  const [isResolvingGoogleUrl, setIsResolvingGoogleUrl] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalSuccess, setModalSuccess] = useState<string | null>(null);
  const [liveReviews, setLiveReviews] = useState<Review[]>(reviews);

  const displayReviews = maxReviews ? liveReviews.slice(0, maxReviews) : liveReviews;

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }).map((_, index) => (
      <span
        key={index}
        style={{
          color: index < rating ? starColor : '#d1d5db',
          fontSize: '1.25rem',
        }}
      >
        {'\u2605'}
      </span>
    ));
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const fetchGoogleReviewUrl = async () => {
    if (!restaurantId) {
      return null;
    }

    try {
      const response = await fetch(
        `/api/review-intent?restaurant_id=${encodeURIComponent(restaurantId)}`,
        {
          cache: 'no-store',
        },
      );
      const payload = (await response.json()) as ReviewIntentGetResponse;
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Failed to load Google review link.');
      }

      const url = payload.data?.google_review_url ?? null;
      setGoogleReviewUrl(url);
      return url;
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : 'Failed to load Google review link.';
      setModalError(message);
      return null;
    }
  };

  useEffect(() => {
    if (!restaurantId) {
      setGoogleReviewUrl(null);
      return;
    }

    void fetchGoogleReviewUrl();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId]);

  useEffect(() => {
    setLiveReviews(reviews);
  }, [reviews]);

  const openModal = () => {
    setIsModalOpen(true);
    setSelectedRating(null);
    setShowFeedbackForm(false);
    setAuthorName('');
    setReviewText('');
    setPublishedAt(new Date().toISOString().split('T')[0]);
    setAvatarFile(null);
    setAvatarPreview('');
    setModalError(null);
    setModalSuccess(null);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedRating(null);
    setShowFeedbackForm(false);
    setAvatarFile(null);
    setAvatarPreview('');
    setModalError(null);
    setModalSuccess(null);
  };

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setAvatarFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(typeof reader.result === 'string' ? reader.result : '');
    };
    reader.readAsDataURL(file);
  };

  const routeToGoogleReview = async () => {
    setModalError(null);
    setIsResolvingGoogleUrl(true);
    const reviewWindow = window.open('about:blank', '_blank');

    if (!reviewWindow) {
      setModalError('Popup blocked. Please allow popups for this site.');
      setIsResolvingGoogleUrl(false);
      return;
    }

    try {
      reviewWindow.opener = null;
    } catch {
      // ignore
    }

    try {
      const url = googleReviewUrl || (await fetchGoogleReviewUrl());
      if (!url) {
        throw new Error('Google review link is not configured for this restaurant.');
      }

      reviewWindow.location.replace(url);
      reviewWindow.focus();
      closeModal();
    } catch (caughtError) {
      if (!reviewWindow.closed) {
        reviewWindow.close();
      }
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : 'Unable to open Google review.';
      setModalError(message);
    } finally {
      setIsResolvingGoogleUrl(false);
    }
  };

  const handleRatingSelection = async (rating: number) => {
    setSelectedRating(rating);
    setModalError(null);
    setModalSuccess(null);

    if (rating === 5) {
      await routeToGoogleReview();
      return;
    }

    setShowFeedbackForm(true);
  };

  const handleFeedbackSubmit = async () => {
    if (!restaurantId) {
      setModalError('Restaurant context missing. Please refresh this page.');
      return;
    }

    if (!selectedRating || selectedRating < 1 || selectedRating > 4) {
      setModalError('Please select a rating from 1 to 4.');
      return;
    }

    if (!authorName.trim()) {
      setModalError('Name is required.');
      return;
    }

    if (!reviewText.trim()) {
      setModalError('Review text is required.');
      return;
    }

    setModalError(null);
    setIsSubmitting(true);

    try {
      let avatarUrl: string | null = null;

      if (avatarFile) {
        const formData = new FormData();
        formData.append('file', avatarFile);
        formData.append('restaurant_id', restaurantId);
        formData.append('type', 'image');

        const uploadResponse = await fetch('/api/media/upload', {
          method: 'POST',
          body: formData,
        });
        const uploadPayload = await uploadResponse.json();

        if (
          !uploadResponse.ok ||
          !uploadPayload?.success ||
          !uploadPayload?.data?.file?.url
        ) {
          throw new Error(uploadPayload?.error || 'Failed to upload avatar image.');
        }

        avatarUrl = uploadPayload.data.file.url as string;
      }

      const response = await fetch('/api/review-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          restaurant_id: restaurantId,
          source: 'manual',
          rating: selectedRating,
          author_name: authorName.trim(),
          review_text: reviewText.trim(),
          published_at: publishedAt,
          avatar_url: avatarUrl,
        }),
      });

      const payload = (await response.json()) as ReviewIntentPostResponse;
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Failed to submit review.');
      }

      const nowIso = new Date().toISOString();
      const publishedAtIso = publishedAt
        ? new Date(`${publishedAt}T00:00:00.000Z`).toISOString()
        : nowIso;
      const newReview: Review = {
        review_id: payload.data?.review_id || `temp-${Date.now()}`,
        restaurant_id: restaurantId,
        source: 'manual',
        rating: selectedRating,
        author_name: authorName.trim(),
        review_text: reviewText.trim(),
        author_url: null,
        review_url: null,
        external_review_id: null,
        published_at: publishedAtIso,
        is_hidden: false,
        created_by_user_id: null,
        created_at: nowIso,
        updated_at: nowIso,
        is_deleted: false,
        avatar_url: avatarUrl,
        avatar_file_id: null,
      };

      setLiveReviews((prev) => [newReview, ...prev]);
      setCurrentSlide(0);
      closeModal();
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : 'Failed to submit review.';
      setModalError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section style={{ backgroundColor: bgColor, color: textColor, padding }}>
      <div style={{ maxWidth, margin: '0 auto' }}>
        {(title || subtitle || description) && (
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            {subtitle && (
              <p
                style={{
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: '0.5rem',
                  opacity: 0.7,
                }}
              >
                {subtitle}
              </p>
            )}
            {title && (
              <h2
                style={{
                  fontSize: '2.5rem',
                  fontWeight: 'bold',
                  marginBottom: '1rem',
                }}
              >
                {title}
              </h2>
            )}
            {description && (
              <p
                style={{
                  fontSize: '1.125rem',
                  opacity: 0.8,
                  maxWidth: '800px',
                  margin: '0 auto',
                }}
              >
                {description}
              </p>
            )}
          </div>
        )}

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            marginBottom: '1.25rem',
          }}
        >
          <button
            type="button"
            onClick={openModal}
            disabled={!restaurantId}
            style={{
              border: 'none',
              borderRadius: '999px',
              padding: '0.7rem 1.2rem',
              fontSize: '0.9rem',
              fontWeight: 700,
              cursor: restaurantId ? 'pointer' : 'not-allowed',
              color: '#ffffff',
              background: restaurantId
                ? 'linear-gradient(135deg, #6f4cf6, #5e3de1)'
                : '#c9ced6',
              boxShadow: restaurantId
                ? '0 8px 20px rgba(111, 76, 246, 0.25)'
                : 'none',
            }}
          >
            Add Review
          </button>
        </div>

        {displayReviews.length === 0 ? (
          <div
            style={{
              borderRadius: '0.75rem',
              border: '1px solid rgba(148, 163, 184, 0.35)',
              background: cardBgColor,
              padding: '1.25rem',
              textAlign: 'center',
              opacity: 0.86,
            }}
          >
            No reviews yet. Be the first to share your feedback.
          </div>
        ) : layout === 'slider' ? (
          <div style={{ position: 'relative' }}>
            <div
              style={{
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  transition: 'transform 0.5s ease',
                  transform: `translateX(-${currentSlide * (100 / columns)}%)`,
                  gap: '1rem',
                }}
              >
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
                    {showRating && (
                      <div
                        style={{
                          display: 'flex',
                          gap: '0.25rem',
                          marginBottom: '0.75rem',
                        }}
                      >
                        {renderStars(review.rating)}
                      </div>
                    )}

                    {review.review_text && (
                      <p
                        style={{
                          fontSize: '0.9375rem',
                          lineHeight: '1.6',
                          marginBottom: '1rem',
                          color: textColor,
                        }}
                      >
                        {`\u201C${review.review_text}\u201D`}
                      </p>
                    )}

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        paddingTop: '1rem',
                        borderTop: '1px solid rgba(0,0,0,0.1)',
                      }}
                    >
                      {showAvatar && review.avatar_url && (
                        <img
                          src={review.avatar_url}
                          alt={review.author_name || 'User'}
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            objectFit: 'cover',
                          }}
                        />
                      )}
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontWeight: '600',
                            fontSize: '0.875rem',
                          }}
                        >
                          {review.author_name || 'Anonymous'}
                        </div>
                        <div
                          style={{
                            fontSize: '0.75rem',
                            opacity: 0.7,
                            display: 'flex',
                            gap: '0.5rem',
                            flexWrap: 'wrap',
                          }}
                        >
                          {showDate && review.published_at && (
                            <span>{formatDate(review.published_at)}</span>
                          )}
                          {showSource && review.source && (
                            <span>{`\u2022 ${review.source}`}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

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
                  {'\u2039'}
                </button>
                <button
                  onClick={() =>
                    setCurrentSlide((prev) =>
                      Math.min(displayReviews.length - columns, prev + 1),
                    )
                  }
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
                    cursor:
                      currentSlide >= displayReviews.length - columns
                        ? 'not-allowed'
                        : 'pointer',
                    padding: '0.5rem 1rem',
                    borderRadius: '0.5rem',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
                    zIndex: 10,
                    opacity:
                      currentSlide >= displayReviews.length - columns ? 0.4 : 1,
                  }}
                >
                  {'\u203A'}
                </button>
              </>
            )}
          </div>
        ) : layout === 'list' ? (
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
                  <img
                    src={review.avatar_url}
                    alt={review.author_name || 'User'}
                    style={{
                      width: '60px',
                      height: '60px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      flexShrink: 0,
                    }}
                  />
                )}
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: '0.5rem',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>
                        {review.author_name || 'Anonymous'}
                      </div>
                      <div
                        style={{
                          fontSize: '0.75rem',
                          opacity: 0.7,
                          display: 'flex',
                          gap: '0.5rem',
                        }}
                      >
                        {showDate && review.published_at && (
                          <span>{formatDate(review.published_at)}</span>
                        )}
                        {showSource && review.source && (
                          <span>{`\u2022 ${review.source}`}</span>
                        )}
                      </div>
                    </div>
                    {showRating && (
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        {renderStars(review.rating)}
                      </div>
                    )}
                  </div>
                  {review.review_text && (
                    <p
                      style={{
                        fontSize: '0.9375rem',
                        lineHeight: '1.6',
                        color: textColor,
                        margin: 0,
                      }}
                    >
                      {review.review_text}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${columns}, 1fr)`,
              gap: '1rem',
            }}
          >
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
                {showRating && (
                  <div
                    style={{
                      display: 'flex',
                      gap: '0.25rem',
                      marginBottom: '0.75rem',
                    }}
                  >
                    {renderStars(review.rating)}
                  </div>
                )}

                {review.review_text && (
                  <p
                    style={{
                      fontSize: '0.9375rem',
                      lineHeight: '1.6',
                      marginBottom: '1rem',
                      color: textColor,
                      flex: 1,
                    }}
                  >
                    {`\u201C${review.review_text}\u201D`}
                  </p>
                )}

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    paddingTop: '1rem',
                    borderTop: '1px solid rgba(0,0,0,0.1)',
                  }}
                >
                  {showAvatar && review.avatar_url && (
                    <img
                      src={review.avatar_url}
                      alt={review.author_name || 'User'}
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                      }}
                    />
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', fontSize: '0.875rem' }}>
                      {review.author_name || 'Anonymous'}
                    </div>
                    <div
                      style={{
                        fontSize: '0.75rem',
                        opacity: 0.7,
                        display: 'flex',
                        gap: '0.5rem',
                        flexWrap: 'wrap',
                      }}
                    >
                      {showDate && review.published_at && (
                        <span>{formatDate(review.published_at)}</span>
                      )}
                      {showSource && review.source && (
                        <span>{`\u2022 ${review.source}`}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {isModalOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.58)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            zIndex: 1100,
          }}
          onClick={closeModal}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '560px',
              borderRadius: '16px',
              background: '#ffffff',
              padding: '1.25rem',
              boxShadow: '0 24px 60px rgba(15, 23, 42, 0.35)',
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1rem',
              }}
            >
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>
                {showFeedbackForm ? 'Share your feedback' : 'Rate your experience'}
              </h3>
              <button
                type="button"
                onClick={closeModal}
                style={{
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  fontSize: '1.2rem',
                  color: '#64748b',
                }}
                aria-label="Close"
              >
                {'\u2715'}
              </button>
            </div>

            {!showFeedbackForm ? (
              <div>
                <p
                  style={{
                    marginTop: 0,
                    marginBottom: '0.9rem',
                    color: '#475569',
                    fontSize: '0.95rem',
                  }}
                >
                  Select your rating. 5 stars takes you to Google review.
                </p>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
                    gap: '0.5rem',
                    marginBottom: '0.8rem',
                  }}
                >
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      key={rating}
                      type="button"
                      onClick={() => void handleRatingSelection(rating)}
                      disabled={isResolvingGoogleUrl}
                      style={{
                        borderRadius: '12px',
                        border:
                          selectedRating === rating
                            ? '2px solid #6f4cf6'
                            : '1px solid #d5ddea',
                        background:
                          selectedRating === rating ? '#f3f0ff' : '#ffffff',
                        padding: '0.6rem 0.4rem',
                        cursor: 'pointer',
                        color: '#111827',
                        fontWeight: 700,
                      }}
                    >
                      {`${rating} ${'\u2605'}`}
                    </button>
                  ))}
                </div>
                {isResolvingGoogleUrl ? (
                  <p style={{ margin: 0, color: '#6f4cf6', fontSize: '0.9rem' }}>
                    Opening Google review...
                  </p>
                ) : null}
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      marginBottom: '0.35rem',
                    }}
                  >
                    Name
                  </label>
                  <input
                    type="text"
                    value={authorName}
                    onChange={(event) => setAuthorName(event.target.value)}
                    placeholder="John Doe"
                    style={{
                      width: '100%',
                      borderRadius: '10px',
                      border: '1px solid #cbd5e1',
                      padding: '0.65rem 0.75rem',
                      outline: 'none',
                    }}
                  />
                </div>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      marginBottom: '0.35rem',
                    }}
                  >
                    Avatar Image
                  </label>
                  {!avatarPreview ? (
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      style={{
                        width: '100%',
                        borderRadius: '10px',
                        border: '1px solid #cbd5e1',
                        padding: '0.55rem 0.75rem',
                        background: '#ffffff',
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        border: '1px solid #cbd5e1',
                        borderRadius: '10px',
                        padding: '0.5rem 0.65rem',
                        background: '#f8fafc',
                      }}
                    >
                      <img
                        src={avatarPreview}
                        alt="Avatar preview"
                        style={{
                          width: '44px',
                          height: '44px',
                          borderRadius: '50%',
                          objectFit: 'cover',
                          border: '1px solid #cbd5e1',
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setAvatarFile(null);
                          setAvatarPreview('');
                        }}
                        style={{
                          border: '1px solid #cbd5e1',
                          borderRadius: '10px',
                          background: '#ffffff',
                          color: '#334155',
                          padding: '0.4rem 0.7rem',
                          cursor: 'pointer',
                          fontWeight: 600,
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      marginBottom: '0.35rem',
                    }}
                  >
                    Published Date
                  </label>
                  <input
                    type="date"
                    value={publishedAt}
                    onChange={(event) => setPublishedAt(event.target.value)}
                    style={{
                      width: '100%',
                      borderRadius: '10px',
                      border: '1px solid #cbd5e1',
                      padding: '0.65rem 0.75rem',
                      outline: 'none',
                    }}
                  />
                </div>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      marginBottom: '0.35rem',
                    }}
                  >
                    Review
                  </label>
                  <textarea
                    value={reviewText}
                    onChange={(event) => setReviewText(event.target.value)}
                    rows={4}
                    placeholder="This restaurant has amazing food and great service..."
                    style={{
                      width: '100%',
                      borderRadius: '10px',
                      border: '1px solid #cbd5e1',
                      padding: '0.65rem 0.75rem',
                      outline: 'none',
                      resize: 'vertical',
                    }}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setShowFeedbackForm(false)}
                    disabled={isSubmitting}
                    style={{
                      border: '1px solid #cbd5e1',
                      borderRadius: '10px',
                      background: '#ffffff',
                      color: '#334155',
                      padding: '0.55rem 0.9rem',
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleFeedbackSubmit()}
                    disabled={isSubmitting}
                    style={{
                      border: 'none',
                      borderRadius: '10px',
                      background: '#6f4cf6',
                      color: '#ffffff',
                      padding: '0.55rem 0.95rem',
                      cursor: isSubmitting ? 'not-allowed' : 'pointer',
                      fontWeight: 700,
                      opacity: isSubmitting ? 0.7 : 1,
                    }}
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit feedback'}
                  </button>
                </div>
              </div>
            )}

            {modalError ? (
              <p
                style={{
                  marginTop: '0.8rem',
                  marginBottom: 0,
                  fontSize: '0.88rem',
                  color: '#b91c1c',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '10px',
                  padding: '0.5rem 0.7rem',
                }}
              >
                {modalError}
              </p>
            ) : null}
            {modalSuccess ? (
              <p
                style={{
                  marginTop: '0.8rem',
                  marginBottom: 0,
                  fontSize: '0.88rem',
                  color: '#166534',
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: '10px',
                  padding: '0.5rem 0.7rem',
                }}
              >
                {modalSuccess}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
