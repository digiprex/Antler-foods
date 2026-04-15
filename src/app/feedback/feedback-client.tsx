'use client';

import { useState } from 'react';

type Step = 'rating' | 'review' | 'thankyou' | 'google';

interface FeedbackClientProps {
  restaurantId: string;
  restaurantName: string;
  restaurantLogo: string | null;
}

export default function FeedbackClient({ restaurantId, restaurantName, restaurantLogo }: FeedbackClientProps) {
  const [step, setStep] = useState<Step>('rating');
  const [rating, setRating] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [name, setName] = useState('');
  const [reviewText, setReviewText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [googleReviewUrl, setGoogleReviewUrl] = useState<string | null>(null);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [bonusPointsAwarded, setBonusPointsAwarded] = useState(0);

  const handleStarClick = async (star: number) => {
    setRating(star);

    // 4-5 stars: redirect straight to Google review
    if (star >= 4) {
      setLoadingGoogle(true);
      try {
        const res = await fetch(`/api/review-intent?restaurant_id=${encodeURIComponent(restaurantId)}`);
        const data = await res.json();
        if (data.success && data.data?.google_review_url) {
          window.location.href = data.data.google_review_url;
          return;
        } else {
          // No Google review URL configured, fall back to site form
          setStep('review');
        }
      } catch {
        setStep('review');
      } finally {
        setLoadingGoogle(false);
      }
      return;
    }

    // 1-3 stars: show on-site review form
    setStep('review');
  };

  const handleSubmit = async () => {
    if (!name.trim() || !reviewText.trim()) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/review-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurant_id: restaurantId,
          rating,
          author_name: name.trim(),
          review_text: reviewText.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to submit');

      setBonusPointsAwarded(data.data?.bonus_points_awarded ?? 0);
      setStep('thankyou');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  const StarIcon = ({ filled }: { filled: boolean }) => (
    <svg
      className={`h-10 w-10 transition-colors ${filled ? 'text-yellow-400' : 'text-gray-200'}`}
      fill="currentColor"
      viewBox="0 0 20 20"
    >
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  );

  return (
    <div className={`min-h-screen bg-gray-50 flex justify-center px-4 ${step === 'review' ? 'items-start pt-24 pb-12' : 'items-center py-12'}`}>
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">

          {/* Header */}
          <div className="px-6 pt-8 pb-4 text-center">
            {restaurantLogo ? (
              <img
                src={restaurantLogo}
                alt={restaurantName}
                className="h-14 mx-auto mb-4 object-contain"
              />
            ) : (
              <div className="h-14 w-14 mx-auto mb-4 rounded-full bg-gray-900 flex items-center justify-center">
                <span className="text-white text-xl font-bold">
                  {restaurantName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <h1 className="text-lg font-semibold text-gray-900">{restaurantName}</h1>
          </div>

          {/* ── Step: Rating ── */}
          {step === 'rating' && (
            <div className="px-6 pb-8 text-center">
              <p className="text-sm text-gray-500 mb-6">How was your experience?</p>
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    disabled={loadingGoogle}
                    onMouseEnter={() => setHoveredStar(star)}
                    onMouseLeave={() => setHoveredStar(0)}
                    onClick={() => handleStarClick(star)}
                    className="transition-transform hover:scale-110 focus:outline-none disabled:opacity-50"
                  >
                    <StarIcon filled={star <= (hoveredStar || rating)} />
                  </button>
                ))}
              </div>
              {loadingGoogle ? (
                <div className="mt-3 inline-flex items-center gap-2 text-xs text-gray-400">
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
                  Redirecting to Google...
                </div>
              ) : (
                <p className="mt-3 text-xs text-gray-400">Tap a star to rate</p>
              )}
            </div>
          )}

          {/* ── Step: Review Form ── */}
          {step === 'review' && (
            <div className="px-6 pb-6">
              {/* Selected stars */}
              <div className="flex justify-center gap-1 mb-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => handleStarClick(star)}
                    className="focus:outline-none"
                  >
                    <svg
                      className={`h-7 w-7 transition-colors ${star <= rating ? 'text-yellow-400' : 'text-gray-200'}`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  </button>
                ))}
              </div>

              <p className="text-sm text-gray-500 text-center mb-5">
                {rating >= 4
                  ? 'Glad you enjoyed it! Share your thoughts.'
                  : 'We\'re sorry to hear that. Tell us how we can improve.'}
              </p>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Your Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Your Review</label>
                  <textarea
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    placeholder="Tell us about your experience..."
                    rows={4}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 resize-none"
                  />
                </div>
              </div>

              {error && (
                <p className="mt-3 text-xs text-red-600">{error}</p>
              )}

              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting || !name.trim() || !reviewText.trim()}
                className="mt-4 w-full rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Submitting...
                  </span>
                ) : (
                  'Submit Review'
                )}
              </button>

              <button
                type="button"
                onClick={() => { setStep('rating'); setRating(0); }}
                className="mt-2 w-full text-xs text-gray-400 hover:text-gray-600 transition"
              >
                Go back
              </button>
            </div>
          )}

          {/* ── Step: Thank You (1-3 stars, saved to site only) ── */}
          {step === 'thankyou' && (
            <div className="px-6 pb-8 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
                <svg className="h-7 w-7 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-900 mb-1">Thank You!</h2>
              <p className="text-sm text-gray-500">
                Your feedback means a lot to us. We&apos;ll use it to improve your experience.
              </p>
              {bonusPointsAwarded > 0 && (
                <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-amber-50 border border-amber-200 px-4 py-2">
                  <svg className="h-4 w-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <span className="text-sm font-medium text-amber-700">
                    You earned {bonusPointsAwarded} bonus points!
                  </span>
                </div>
              )}
            </div>
          )}

          {/* ── Step: Google Redirect (4-5 stars, saved to site + Google prompt) ── */}
          {step === 'google' && (
            <div className="px-6 pb-8 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
                <svg className="h-7 w-7 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-900 mb-1">Thank You!</h2>
              <p className="text-sm text-gray-500 mb-5">
                We&apos;d love it if you could also share your review on Google to help others discover us.
              </p>
              {googleReviewUrl && (
                <a
                  href={googleReviewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  Review on Google
                </a>
              )}
            </div>
          )}
        </div>

        <p className="mt-4 text-center text-[11px] text-gray-400">
          Powered by {restaurantName}
        </p>
      </div>
    </div>
  );
}
