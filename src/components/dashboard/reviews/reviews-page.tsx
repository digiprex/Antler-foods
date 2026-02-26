'use client';
/* eslint-disable @next/next/no-img-element */

import { useSearchParams } from 'next/navigation';
import {
  ChangeEvent,
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

type RestaurantScope = {
  id: string;
  name: string;
};

type SaveNotice = {
  tone: 'success' | 'error';
  message: string;
};

type ReviewItem = {
  review_id: string;
  restaurant_id: string;
  source: string;
  external_review_id: string | null;
  rating: number;
  author_name: string | null;
  review_text: string | null;
  author_url: string | null;
  review_url: string | null;
  published_at: string | null;
  is_hidden: boolean;
  created_by_user_id: string | null;
  created_at: string | null;
  updated_at: string | null;
  is_deleted: boolean;
  avatar_url: string | null;
  avatar_file_id: string | null;
};

type ReviewsApiListResponse = {
  success: boolean;
  data?: ReviewItem[];
  error?: string;
};

type ReviewApiUpsertResponse = {
  success: boolean;
  data?: ReviewItem;
  error?: string;
};

type ReviewApiDeleteResponse = {
  success: boolean;
  error?: string;
};

function useRestaurantScope(): RestaurantScope | null {
  const searchParams = useSearchParams();
  const restaurantId = searchParams.get('restaurant_id')?.trim() ?? '';
  const restaurantName = searchParams.get('restaurant_name')?.trim() ?? '';

  if (!restaurantId || !restaurantName) {
    return null;
  }

  return {
    id: restaurantId,
    name: restaurantName,
  };
}

function normalizeSource(source: string | null) {
  return (source || '').trim().toLowerCase();
}

function isGoogleSource(source: string | null) {
  return normalizeSource(source) === 'google';
}

function isManualSource(source: string | null) {
  return normalizeSource(source) === 'manual';
}

function resolveAvatarUrl(review: ReviewItem) {
  if (review.avatar_url?.trim()) {
    return review.avatar_url.trim();
  }

  if (review.avatar_file_id?.trim()) {
    return `/api/image-proxy?fileId=${encodeURIComponent(review.avatar_file_id.trim())}`;
  }

  return null;
}

function formatDateTime(value: string | null) {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return date.toLocaleString();
}

function toDateTimeLocalValue(value: string | null) {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function parseDateTimeLocalValue(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

function SelectionRequiredCard() {
  return (
    <section className="space-y-5">
      <h1 className="text-5xl font-semibold tracking-tight text-[#101827]">Google Reviews</h1>
      <div className="rounded-3xl border border-[#d7e2e6] bg-white p-8">
        <h2 className="text-3xl font-semibold text-[#111827]">Select a restaurant</h2>
        <p className="mt-3 text-lg text-[#5f6c78]">
          Select a restaurant from the search box to manage reviews.
        </p>
      </div>
    </section>
  );
}

function FormMessage({ notice }: { notice: SaveNotice | null }) {
  if (!notice) {
    return null;
  }

  return (
    <p
      className={`rounded-xl px-4 py-3 text-sm ${
        notice.tone === 'success'
          ? 'bg-[#e8f6ed] text-[#25613d]'
          : 'bg-[#fde8e8] text-[#9b1c1c]'
      }`}
    >
      {notice.message}
    </p>
  );
}

function VisibilityOnIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function VisibilityOffIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10.6 6.2A11.4 11.4 0 0 1 12 6c6.5 0 10 6 10 6a17.2 17.2 0 0 1-3 3.7" />
      <path d="M6.2 7.1C3.6 9.1 2 12 2 12s3.5 6 10 6a10.5 10.5 0 0 0 5-1.2" />
      <path d="m2 2 20 20" />
      <path d="M9.9 9.9A3 3 0 0 0 14.1 14.1" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" />
    </svg>
  );
}

function DeleteIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

export default function ReviewsPage() {
  const restaurant = useRestaurantScope();

  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notice, setNotice] = useState<SaveNotice | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isAvatarUploading, setIsAvatarUploading] = useState(false);
  const [pendingActionReviewId, setPendingActionReviewId] = useState<string | null>(
    null,
  );
  const [deleteCandidateReview, setDeleteCandidateReview] = useState<ReviewItem | null>(
    null,
  );

  const [authorName, setAuthorName] = useState('');
  const [reviewText, setReviewText] = useState('');
  const [rating, setRating] = useState('5');
  const [publishedAtInput, setPublishedAtInput] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarFileId, setAvatarFileId] = useState<string | null>(null);

  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  const activeEditingReview = useMemo(
    () =>
      editingReviewId
        ? reviews.find((review) => review.review_id === editingReviewId) || null
        : null,
    [editingReviewId, reviews],
  );

  const loadReviews = useCallback(async () => {
    if (!restaurant?.id) {
      setReviews([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/admin/reviews?restaurant_id=${encodeURIComponent(restaurant.id)}`,
        {
          cache: 'no-store',
        },
      );
      const payload = (await response.json()) as ReviewsApiListResponse;

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Failed to load reviews.');
      }

      setReviews(payload.data || []);
    } catch (caughtError) {
      const message =
        caughtError instanceof Error ? caughtError.message : 'Failed to load reviews.';
      setNotice({
        tone: 'error',
        message,
      });
      setReviews([]);
    } finally {
      setIsLoading(false);
    }
  }, [restaurant?.id]);

  useEffect(() => {
    void loadReviews();
  }, [loadReviews]);

  const resetForm = () => {
    setAuthorName('');
    setReviewText('');
    setRating('5');
    setPublishedAtInput('');
    setAvatarUrl(null);
    setAvatarFileId(null);
  };

  const openCreateModal = () => {
    setEditingReviewId(null);
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (review: ReviewItem) => {
    if (!isManualSource(review.source)) {
      return;
    }

    setEditingReviewId(review.review_id);
    setAuthorName(review.author_name || '');
    setReviewText(review.review_text || '');
    setRating(String(review.rating || 5));
    setPublishedAtInput(toDateTimeLocalValue(review.published_at));
    setAvatarUrl(review.avatar_url || null);
    setAvatarFileId(review.avatar_file_id || null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingReviewId(null);
  };

  const uploadAvatar = async (file: File) => {
    if (!restaurant?.id) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      setNotice({
        tone: 'error',
        message: 'Only image files are allowed for avatars.',
      });
      return;
    }

    setIsAvatarUploading(true);
    setNotice(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('restaurant_id', restaurant.id);

      const response = await fetch('/api/upload-optimized-media', {
        method: 'POST',
        body: formData,
      });

      const payload = (await response.json()) as {
        success?: boolean;
        data?: { file_id?: string; url?: string };
        error?: string;
      };

      if (!response.ok || !payload.success || !payload.data?.file_id) {
        throw new Error(payload.error || 'Failed to upload avatar.');
      }

      setAvatarFileId(payload.data.file_id);
      setAvatarUrl(payload.data.url || null);
    } catch (caughtError) {
      const message =
        caughtError instanceof Error ? caughtError.message : 'Failed to upload avatar.';
      setNotice({
        tone: 'error',
        message,
      });
    } finally {
      setIsAvatarUploading(false);
    }
  };

  const onAvatarFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    void uploadAvatar(file);

    // Reset so selecting the same file again still fires change event.
    event.target.value = '';
  };

  const onSaveReview = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!restaurant?.id) {
      return;
    }

    const normalizedAuthorName = authorName.trim();
    const normalizedReviewText = reviewText.trim();
    const normalizedRating = Number.parseInt(rating, 10);
    const publishedAt = parseDateTimeLocalValue(publishedAtInput);

    if (!normalizedAuthorName) {
      setNotice({
        tone: 'error',
        message: 'Author name is required.',
      });
      return;
    }

    if (!normalizedReviewText) {
      setNotice({
        tone: 'error',
        message: 'Review text is required.',
      });
      return;
    }

    if (Number.isNaN(normalizedRating) || normalizedRating < 1 || normalizedRating > 5) {
      setNotice({
        tone: 'error',
        message: 'Rating must be between 1 and 5.',
      });
      return;
    }

    setIsSaving(true);
    setNotice(null);

    try {
      if (!editingReviewId) {
        const response = await fetch('/api/admin/reviews', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            restaurant_id: restaurant.id,
            author_name: normalizedAuthorName,
            review_text: normalizedReviewText,
            rating: normalizedRating,
            published_at: publishedAt,
            avatar_url: avatarUrl,
            avatar_file_id: avatarFileId,
          }),
        });
        const payload = (await response.json()) as ReviewApiUpsertResponse;

        if (!response.ok || !payload.success) {
          throw new Error(payload.error || 'Failed to create review.');
        }

        setNotice({
          tone: 'success',
          message: 'Manual review created.',
        });
      } else {
        const response = await fetch('/api/admin/reviews', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'edit_manual',
            review_id: editingReviewId,
            author_name: normalizedAuthorName,
            review_text: normalizedReviewText,
            rating: normalizedRating,
            published_at: publishedAt,
            avatar_url: avatarUrl,
            avatar_file_id: avatarFileId,
          }),
        });
        const payload = (await response.json()) as ReviewApiUpsertResponse;

        if (!response.ok || !payload.success) {
          throw new Error(payload.error || 'Failed to update manual review.');
        }

        setNotice({
          tone: 'success',
          message: 'Manual review updated.',
        });
      }

      closeModal();
      await loadReviews();
    } catch (caughtError) {
      const message =
        caughtError instanceof Error ? caughtError.message : 'Failed to save review.';
      setNotice({
        tone: 'error',
        message,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const onToggleHidden = async (review: ReviewItem) => {
    setPendingActionReviewId(review.review_id);
    setNotice(null);

    try {
      const response = await fetch('/api/admin/reviews', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'toggle_hidden',
          review_id: review.review_id,
          is_hidden: !review.is_hidden,
        }),
      });
      const payload = (await response.json()) as ReviewApiUpsertResponse;

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Failed to update visibility.');
      }

      setNotice({
        tone: 'success',
        message: review.is_hidden ? 'Review is now visible.' : 'Review has been hidden.',
      });
      await loadReviews();
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : 'Failed to update review visibility.';
      setNotice({
        tone: 'error',
        message,
      });
    } finally {
      setPendingActionReviewId(null);
    }
  };

  const onRequestDeleteManualReview = (review: ReviewItem) => {
    if (!isManualSource(review.source)) {
      return;
    }

    setDeleteCandidateReview(review);
  };

  const onCancelDeleteManualReview = () => {
    if (
      deleteCandidateReview &&
      pendingActionReviewId === deleteCandidateReview.review_id
    ) {
      return;
    }

    setDeleteCandidateReview(null);
  };

  const onConfirmDeleteManualReview = async () => {
    if (!deleteCandidateReview) {
      return;
    }

    const review = deleteCandidateReview;
    setPendingActionReviewId(review.review_id);
    setNotice(null);

    try {
      const response = await fetch('/api/admin/reviews', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          review_id: review.review_id,
        }),
      });
      const payload = (await response.json()) as ReviewApiDeleteResponse;

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Failed to delete review.');
      }

      setNotice({
        tone: 'success',
        message: 'Manual review deleted.',
      });
      setDeleteCandidateReview(null);
      await loadReviews();
    } catch (caughtError) {
      const message =
        caughtError instanceof Error ? caughtError.message : 'Failed to delete review.';
      setNotice({
        tone: 'error',
        message,
      });
    } finally {
      setPendingActionReviewId(null);
    }
  };

  if (!restaurant) {
    return <SelectionRequiredCard />;
  }

  return (
    <section className="space-y-5">
      <div className="space-y-2">
        <h1 className="text-5xl font-semibold tracking-tight text-[#101827]">Google Reviews</h1>
        <p className="text-lg text-[#5f6c78]">Manage hidden/manual review entries.</p>
        <p className="text-sm font-medium text-[#111827]">Restaurant: {restaurant.name}</p>
      </div>

      <div className="space-y-4 rounded-3xl border border-[#d7e2e6] bg-white p-8">
        <FormMessage notice={notice} />

        <div className="flex justify-end">
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center rounded-xl bg-[#5dc67d] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#4db46b]"
          >
            Add Review
          </button>
        </div>

        {isLoading ? (
          <div className="text-[#60707c]">Loading reviews...</div>
        ) : reviews.length === 0 ? (
          <div className="text-[#60707c]">No reviews found for this restaurant.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[#e6ecef]">
              <thead>
                <tr className="text-left text-sm font-semibold text-[#111827]">
                  <th className="px-4 py-3">Restaurant</th>
                  <th className="px-4 py-3">Avatar</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Text</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3">Rating</th>
                  <th className="whitespace-nowrap px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edf2f4]">
                {reviews.map((review) => {
                  const avatar = resolveAvatarUrl(review);
                  const manual = isManualSource(review.source);
                  const google = isGoogleSource(review.source);
                  const actionPending = pendingActionReviewId === review.review_id;

                  return (
                    <tr key={review.review_id} className={review.is_hidden ? 'opacity-60' : ''}>
                      <td className="px-4 py-3 align-top text-sm text-[#111827]">
                        {restaurant.name}
                      </td>
                      <td className="px-4 py-3 align-top">
                        {avatar ? (
                          <img
                            src={avatar}
                            alt={review.author_name || 'Review avatar'}
                            className="h-11 w-11 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#dfe7ec] text-xs font-semibold text-[#6b7a86]">
                            {(review.author_name || '?').slice(0, 1).toUpperCase()}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 align-top text-sm text-[#111827]">
                        <div>{review.author_name || '-'}</div>
                        <div className="mt-1 text-xs font-medium uppercase tracking-wide text-[#7c8a96]">
                          {google ? 'Google' : manual ? 'Manual' : review.source}
                        </div>
                      </td>
                      <td className="max-w-[520px] whitespace-pre-wrap px-4 py-3 align-top text-sm text-[#111827]">
                        {review.review_text || '-'}
                      </td>
                      <td className="px-4 py-3 align-top text-sm text-[#111827]">
                        {formatDateTime(review.created_at)}
                      </td>
                      <td className="px-4 py-3 align-top text-sm font-semibold text-[#111827]">
                        {review.rating || '-'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 align-top">
                        <div className="inline-flex items-center gap-2 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => void onToggleHidden(review)}
                            disabled={actionPending}
                            aria-label={review.is_hidden ? 'Unhide review' : 'Hide review'}
                            title={review.is_hidden ? 'Unhide review' : 'Hide review'}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#d0d9de] text-[#1f2937] transition hover:bg-[#f4f7f9] disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {review.is_hidden ? <VisibilityOnIcon /> : <VisibilityOffIcon />}
                          </button>

                          {manual ? (
                            <button
                              type="button"
                              onClick={() => openEditModal(review)}
                              disabled={actionPending}
                              aria-label="Edit manual review"
                              title="Edit manual review"
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#d0d9de] text-[#1f2937] transition hover:bg-[#f4f7f9] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <EditIcon />
                            </button>
                          ) : null}

                          {manual ? (
                            <button
                              type="button"
                              onClick={() => onRequestDeleteManualReview(review)}
                              disabled={actionPending}
                              aria-label="Delete manual review"
                              title="Delete manual review"
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#f2b3b3] text-[#9b1c1c] transition hover:bg-[#fef2f2] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <DeleteIcon />
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-5">
          <div
            className="absolute inset-0 bg-black/35"
            onClick={closeModal}
            aria-hidden="true"
          />

          <div className="relative z-10 w-full max-w-3xl rounded-2xl border border-[#d7e2e6] bg-white p-8 shadow-[0_24px_64px_rgba(15,23,42,0.25)]">
            <button
              type="button"
              onClick={closeModal}
              className="absolute right-4 top-4 text-2xl leading-none text-[#6c7883]"
              aria-label="Close dialog"
            >
              ×
            </button>

            <h2 className="text-4xl font-semibold tracking-tight text-[#101827]">
              {activeEditingReview ? 'Edit Review' : 'Add Review'}
            </h2>

            <form onSubmit={onSaveReview} className="mt-6 space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium text-[#111827]">Avatar</p>
                <div className="flex items-center gap-4">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={authorName || 'Avatar'}
                      className="h-14 w-14 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-14 w-14 rounded-full bg-[#dfe7ec]" />
                  )}

                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={onAvatarFileChange}
                  />
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={isAvatarUploading}
                    className="inline-flex items-center rounded-lg border border-[#d0d9de] px-4 py-2 text-sm font-semibold text-[#1f2937] transition hover:bg-[#f4f7f9] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isAvatarUploading ? 'Uploading...' : 'Edit'}
                  </button>
                  {(avatarUrl || avatarFileId) && !isAvatarUploading ? (
                    <button
                      type="button"
                      onClick={() => {
                        setAvatarUrl(null);
                        setAvatarFileId(null);
                      }}
                      className="inline-flex items-center rounded-lg border border-[#f2b3b3] px-4 py-2 text-sm font-semibold text-[#9b1c1c] transition hover:bg-[#fef2f2]"
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
              </div>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-[#111827]">* Name</span>
                <input
                  type="text"
                  value={authorName}
                  onChange={(event) => setAuthorName(event.target.value)}
                  required
                  className="w-full rounded-xl border border-[#d2dde2] bg-white px-4 py-3 text-base text-[#111827] outline-none transition focus:border-[#88c39b] focus:ring-2 focus:ring-[#cde9d7]"
                  placeholder="Author name"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-[#111827]">* Text</span>
                <textarea
                  value={reviewText}
                  onChange={(event) => setReviewText(event.target.value)}
                  required
                  rows={6}
                  className="w-full rounded-xl border border-[#d2dde2] bg-white px-4 py-3 text-base text-[#111827] outline-none transition focus:border-[#88c39b] focus:ring-2 focus:ring-[#cde9d7]"
                  placeholder="Enter review text"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-[#111827]">* Rating</span>
                <select
                  value={rating}
                  onChange={(event) => setRating(event.target.value)}
                  required
                  className="w-full rounded-xl border border-[#d2dde2] bg-white px-4 py-3 text-base text-[#111827] outline-none transition focus:border-[#88c39b] focus:ring-2 focus:ring-[#cde9d7]"
                >
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                  <option value="5">5</option>
                </select>
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-[#111827]">* Time</span>
                <input
                  type="datetime-local"
                  value={publishedAtInput}
                  onChange={(event) => setPublishedAtInput(event.target.value)}
                  required
                  className="w-full rounded-xl border border-[#d2dde2] bg-white px-4 py-3 text-base text-[#111827] outline-none transition focus:border-[#88c39b] focus:ring-2 focus:ring-[#cde9d7]"
                />
              </label>

              <button
                type="submit"
                disabled={isSaving || isAvatarUploading}
                className="inline-flex items-center rounded-xl bg-[#5dc67d] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#4db46b] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </form>
          </div>
        </div>
      ) : null}

      {deleteCandidateReview ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-5">
          <div
            className="absolute inset-0 bg-black/35"
            onClick={onCancelDeleteManualReview}
            aria-hidden="true"
          />

          <div className="relative z-10 w-full max-w-md rounded-2xl border border-[#d7e2e6] bg-white p-6 shadow-[0_24px_64px_rgba(15,23,42,0.25)]">
            <h3 className="text-2xl font-semibold text-[#101827]">Delete review?</h3>
            <p className="mt-3 text-sm leading-6 text-[#5f6c78]">
              This will permanently delete the manual review
              {deleteCandidateReview.author_name
                ? ` by ${deleteCandidateReview.author_name}`
                : ''}{' '}
              from this restaurant.
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onCancelDeleteManualReview}
                disabled={pendingActionReviewId === deleteCandidateReview.review_id}
                className="inline-flex items-center rounded-xl border border-[#cfd8df] px-4 py-2 text-sm font-semibold text-[#30414d] transition hover:bg-[#f4f7f9] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void onConfirmDeleteManualReview()}
                disabled={pendingActionReviewId === deleteCandidateReview.review_id}
                className="inline-flex items-center rounded-xl bg-[#9b1c1c] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#7f1d1d] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pendingActionReviewId === deleteCandidateReview.review_id
                  ? 'Deleting...'
                  : 'Delete review'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
