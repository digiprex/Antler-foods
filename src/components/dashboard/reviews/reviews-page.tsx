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
import { createPortal } from 'react-dom';
import { PurpleDotSpinner } from '@/components/dashboard/purple-dot-spinner';
import Toast from '@/components/ui/toast';

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
  const searchParams = useSearchParams() ?? new URLSearchParams();
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

function formatReviewDate(value: string | null) {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return date.toLocaleDateString();
}

function getReviewDisplayDate(review: ReviewItem) {
  return review.published_at || review.created_at;
}

function toDateInputValue(value: string | null) {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateInputValue(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, monthIndex, day, 12, 0, 0, 0);

  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== monthIndex ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date.toISOString();
}

function SelectionRequiredCard() {
  return (
    <section className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg">
          <svg className="h-7 w-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
          </svg>
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Google Reviews
          </h1>
          <p className="text-sm text-gray-600">Manage restaurant reviews</p>
        </div>
      </div>
      <div className="rounded-2xl border border-purple-100 bg-gradient-to-br from-purple-50 to-white p-8 shadow-sm">
        <div className="flex items-center gap-3">
          <svg className="h-10 w-10 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Select a restaurant
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Choose a restaurant from the search box above to manage reviews.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function FormMessage({ notice }: { notice: SaveNotice | null }) {
  if (!notice) {
    return null;
  }

  return (
    <div
      className={`flex items-start gap-3 rounded-xl px-4 py-3.5 text-sm font-medium ${
        notice.tone === 'success'
          ? 'bg-purple-50 text-purple-800'
          : 'bg-red-50 text-red-800'
      }`}
    >
      {notice.tone === 'success' ? (
        <svg className="h-5 w-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ) : (
        <svg className="h-5 w-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
      )}
      <p>{notice.message}</p>
    </div>
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
  const [isMounted, setIsMounted] = useState(false);

  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notice, setNotice] = useState<SaveNotice | null>(null);
  const [toastNotice, setToastNotice] = useState<SaveNotice | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isAvatarUploading, setIsAvatarUploading] = useState(false);
  const [pendingActionReviewId, setPendingActionReviewId] = useState<
    string | null
  >(null);
  const [deleteCandidateReview, setDeleteCandidateReview] =
    useState<ReviewItem | null>(null);

  const [authorName, setAuthorName] = useState('');
  const [reviewText, setReviewText] = useState('');
  const [rating, setRating] = useState('5');
  const [publishedAtInput, setPublishedAtInput] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarFileId, setAvatarFileId] = useState<string | null>(null);

  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  const activeEditingReview = useMemo(
    () =>
      editingReviewId
        ? reviews.find((review) => review.review_id === editingReviewId) || null
        : null,
    [editingReviewId, reviews],
  );

  const showToast = useCallback(
    (tone: SaveNotice['tone'], message: string) => {
      setToastNotice({ tone, message });
    },
    [],
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
        caughtError instanceof Error
          ? caughtError.message
          : 'Failed to load reviews.';
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

  useEffect(() => {
    if (!isModalOpen) {
      return;
    }

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [isModalOpen]);

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
    setPublishedAtInput(toDateInputValue(review.published_at));
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
        caughtError instanceof Error
          ? caughtError.message
          : 'Failed to upload avatar.';
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
    const publishedAt = parseDateInputValue(publishedAtInput);

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

    if (
      Number.isNaN(normalizedRating) ||
      normalizedRating < 1 ||
      normalizedRating > 5
    ) {
      setNotice({
        tone: 'error',
        message: 'Rating must be between 1 and 5.',
      });
      return;
    }

    setIsSaving(true);
    setNotice(null);
    const currentEditingReviewId = editingReviewId;

    try {
      if (!currentEditingReviewId) {
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

        if (!payload.data) {
          throw new Error('Failed to receive created review.');
        }

        const createdReview = payload.data;
        setReviews((previous) => [createdReview, ...previous]);
        showToast('success', 'Review added successfully.');
      } else {
        const response = await fetch('/api/admin/reviews', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'edit_manual',
            review_id: currentEditingReviewId,
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

        if (!payload.data) {
          throw new Error('Failed to receive updated review.');
        }

        const updatedReview = payload.data;
        setReviews((previous) =>
          previous.map((item) =>
            item.review_id === updatedReview.review_id ? updatedReview : item,
          ),
        );
        showToast('success', 'Review updated successfully.');
      }

      closeModal();
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : 'Failed to save review.';
      setNotice({
        tone: 'error',
        message,
      });
      showToast('error', message);
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

      if (!payload.data) {
        throw new Error('Failed to receive updated review visibility.');
      }

      const updatedReview = payload.data;
      setReviews((previous) =>
        previous.map((item) =>
          item.review_id === review.review_id ? updatedReview : item,
        ),
      );
      showToast(
        'success',
        updatedReview.is_hidden
          ? 'Review hidden successfully.'
          : 'Review is now visible.',
      );
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : 'Failed to update review visibility.';
      setNotice({
        tone: 'error',
        message,
      });
      showToast('error', message);
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

      setReviews((previous) =>
        previous.filter((item) => item.review_id !== review.review_id),
      );
      setDeleteCandidateReview(null);
      showToast('success', 'Review deleted successfully.');
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : 'Failed to delete review.';
      setNotice({
        tone: 'error',
        message,
      });
      showToast('error', message);
    } finally {
      setPendingActionReviewId(null);
    }
  };

  if (!restaurant) {
    return <SelectionRequiredCard />;
  }

  return (
    <section className="space-y-6">
      {toastNotice ? (
        <Toast
          message={toastNotice.message}
          type={toastNotice.tone === 'success' ? 'success' : 'error'}
          onClose={() => setToastNotice(null)}
        />
      ) : null}

      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg">
          <svg className="h-7 w-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
          </svg>
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Google Reviews
          </h1>
          <p className="text-sm text-gray-600">Manage hidden/manual review entries</p>
          <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-purple-700">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            {restaurant.name}
          </p>
        </div>
      </div>

      <div className="space-y-5 rounded-2xl border border-purple-100 bg-white p-8 shadow-sm">
        <FormMessage notice={notice} />

        <div className="flex justify-end">
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-purple-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:from-purple-700 hover:to-purple-800"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add Review
          </button>
        </div>

        {isLoading ? (
          <div
            className="flex min-h-[180px] items-center justify-center"
            role="status"
            aria-live="polite"
          >
            <div className="inline-flex items-center gap-3 rounded-xl border border-purple-200 bg-purple-50 px-5 py-3.5 text-sm font-medium text-gray-700">
              <PurpleDotSpinner size="sm" label="Loading reviews" />
              Loading reviews...
            </div>
          </div>
        ) : reviews.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-purple-200 bg-purple-50/30 py-12">
            <svg className="h-16 w-16 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
            </svg>
            <p className="mt-4 text-base font-medium text-gray-700">No reviews found for this restaurant.</p>
            <p className="mt-1 text-sm text-gray-500">Add your first review or sync from Google.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-purple-50 to-purple-100/50">
                <tr className="text-left text-xs font-bold uppercase tracking-wider text-gray-700">
                  <th className="px-4 py-3.5">Restaurant</th>
                  <th className="px-4 py-3.5">Avatar</th>
                  <th className="px-4 py-3.5">Name</th>
                  <th className="px-4 py-3.5">Text</th>
                  <th className="px-4 py-3.5">Created</th>
                  <th className="px-4 py-3.5">Rating</th>
                  <th className="whitespace-nowrap px-4 py-3.5">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {reviews.map((review) => {
                  const avatar = resolveAvatarUrl(review);
                  const manual = isManualSource(review.source);
                  const google = isGoogleSource(review.source);
                  const actionPending =
                    pendingActionReviewId === review.review_id;

                  return (
                    <tr
                      key={review.review_id}
                      className={`transition hover:bg-purple-50/50 ${review.is_hidden ? 'opacity-60' : ''}`}
                    >
                      <td className="px-4 py-4 align-top text-sm font-medium text-gray-900">
                        {restaurant.name}
                      </td>
                      <td className="px-4 py-4 align-top">
                        {avatar ? (
                          <img
                            src={avatar}
                            alt={review.author_name || 'Review avatar'}
                            className="h-12 w-12 rounded-full object-cover ring-2 ring-purple-100"
                          />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-purple-100 to-purple-200 text-sm font-bold text-purple-700">
                            {(review.author_name || '?')
                              .slice(0, 1)
                              .toUpperCase()}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4 align-top text-sm text-gray-900">
                        <div className="font-semibold">{review.author_name || '-'}</div>
                        <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-xs font-semibold text-purple-700">
                          {google ? (
                            <>
                              <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                              </svg>
                              Google
                            </>
                          ) : manual ? (
                            <>
                              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                              </svg>
                              Manual
                            </>
                          ) : (
                            review.source
                          )}
                        </div>
                      </td>
                      <td className="max-w-[520px] whitespace-pre-wrap px-4 py-4 align-top text-sm text-gray-700">
                        {review.review_text || '-'}
                      </td>
                      <td className="px-4 py-4 align-top text-xs text-gray-600">
                        {formatReviewDate(getReviewDisplayDate(review))}
                      </td>
                      <td className="px-4 py-4 align-top">
                        <div className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2.5 py-1 text-sm font-bold text-yellow-700">
                          <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                          {review.rating || '-'}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 align-top">
                        <div className="inline-flex items-center gap-2 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => void onToggleHidden(review)}
                            disabled={actionPending}
                            aria-label={
                              review.is_hidden ? 'Unhide review' : 'Hide review'
                            }
                            title={
                              review.is_hidden ? 'Unhide review' : 'Hide review'
                            }
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-purple-200 text-purple-600 transition hover:bg-purple-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {review.is_hidden ? (
                              <VisibilityOnIcon />
                            ) : (
                              <VisibilityOffIcon />
                            )}
                          </button>

                          {manual ? (
                            <button
                              type="button"
                              onClick={() => openEditModal(review)}
                              disabled={actionPending}
                              aria-label="Edit manual review"
                              title="Edit manual review"
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-purple-200 text-purple-600 transition hover:bg-purple-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <EditIcon />
                            </button>
                          ) : null}

                          {manual ? (
                            <button
                              type="button"
                              onClick={() =>
                                onRequestDeleteManualReview(review)
                              }
                              disabled={actionPending}
                              aria-label="Delete manual review"
                              title="Delete manual review"
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
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

      {isModalOpen && isMounted && typeof document !== 'undefined' && document.body ? createPortal(
        <div className="fixed inset-0 top-0 z-[100] flex items-center justify-center p-4 backdrop-blur-sm sm:p-5">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={closeModal}
            aria-hidden="true"
          />

          <div className="relative z-10 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-purple-200 bg-white p-6 shadow-2xl sm:p-8">
            <button
              type="button"
              onClick={closeModal}
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
              aria-label="Close dialog"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-purple-600">
                <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-gray-900">
                {activeEditingReview ? 'Edit Review' : 'Add Review'}
              </h2>
            </div>

            <form onSubmit={onSaveReview} className="mt-6 space-y-5">
              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-700">Avatar</p>
                <div className="flex items-center gap-4">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={authorName || 'Avatar'}
                      className="h-16 w-16 rounded-full object-cover ring-2 ring-purple-200"
                    />
                  ) : (
                    <div className="h-16 w-16 rounded-full bg-gradient-to-br from-purple-100 to-purple-200" />
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
                    className="inline-flex items-center gap-2 rounded-lg border border-purple-200 px-4 py-2 text-sm font-semibold text-purple-700 transition hover:bg-purple-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isAvatarUploading ? (
                      <>
                        <PurpleDotSpinner size="inline" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                        </svg>
                        Upload
                      </>
                    )}
                  </button>
                  {(avatarUrl || avatarFileId) && !isAvatarUploading ? (
                    <button
                      type="button"
                      onClick={() => {
                        setAvatarUrl(null);
                        setAvatarFileId(null);
                      }}
                      className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                      Remove
                    </button>
                  ) : null}
                </div>
              </div>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-gray-700">
                  <span className="text-red-500">*</span> Name
                </span>
                <input
                  type="text"
                  value={authorName}
                  onChange={(event) => setAuthorName(event.target.value)}
                  required
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-base text-gray-900 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                  placeholder="Author name"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-gray-700">
                  <span className="text-red-500">*</span> Review Text
                </span>
                <textarea
                  value={reviewText}
                  onChange={(event) => setReviewText(event.target.value)}
                  required
                  rows={5}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-base text-gray-900 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                  placeholder="Enter review text"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-gray-700">
                  <span className="text-red-500">*</span> Rating
                </span>
                <select
                  value={rating}
                  onChange={(event) => setRating(event.target.value)}
                  required
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-base text-gray-900 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                >
                  <option value="1">⭐ 1 Star</option>
                  <option value="2">⭐⭐ 2 Stars</option>
                  <option value="3">⭐⭐⭐ 3 Stars</option>
                  <option value="4">⭐⭐⭐⭐ 4 Stars</option>
                  <option value="5">⭐⭐⭐⭐⭐ 5 Stars</option>
                </select>
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-gray-700">
                  <span className="text-red-500">*</span> Published Date
                </span>
                <input
                  type="date"
                  value={publishedAtInput}
                  onChange={(event) => setPublishedAtInput(event.target.value)}
                  required
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-base text-gray-900 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                />
              </label>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isSaving || isAvatarUploading}
                  className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:from-purple-700 hover:to-purple-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? (
                    <>
                      <PurpleDotSpinner size="inline" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      Save Review
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={isSaving || isAvatarUploading}
                  className="inline-flex items-center rounded-lg border border-gray-300 px-6 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      , document.body) : null}

      {deleteCandidateReview && isMounted && typeof document !== 'undefined' && document.body ? createPortal(
        <div className="fixed inset-0 top-0 z-[110] flex items-center justify-center p-5 backdrop-blur-sm">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={onCancelDeleteManualReview}
            aria-hidden="true"
          />

          <div className="relative z-10 w-full max-w-md rounded-2xl border border-red-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-100">
                <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900">
                Delete Review?
              </h3>
            </div>
            <p className="mt-4 text-sm leading-6 text-gray-600">
              This will permanently delete the manual review
              {deleteCandidateReview.author_name
                ? ` by <strong class="font-semibold text-gray-900">${deleteCandidateReview.author_name}</strong>`
                : ''}{' '}
              from this restaurant. This action cannot be undone.
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onCancelDeleteManualReview}
                disabled={
                  pendingActionReviewId === deleteCandidateReview.review_id
                }
                className="inline-flex items-center rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void onConfirmDeleteManualReview()}
                disabled={
                  pendingActionReviewId === deleteCandidateReview.review_id
                }
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pendingActionReviewId === deleteCandidateReview.review_id ? (
                  <>
                    <PurpleDotSpinner size="inline" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                    Delete Review
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      , document.body) : null}
    </section>
  );
}
