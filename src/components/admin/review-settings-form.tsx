/**
 * Review Settings Form
 *
 * Enhanced interface for configuring review section settings:
 * - Layout selection (three Google review presentation styles)
 * - Content configuration (title, subtitle, description)
 * - Display options (avatar, rating, date, source)
 * - Styling options (colors, typography)
 * - Live preview functionality
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Reviews from '@/components/reviews';
import Toast from '@/components/ui/toast';
import { SectionTypographyControls } from '@/components/admin/section-typography-controls';
import { SectionAppearanceControls } from '@/components/admin/section-appearance-controls';
import { ImageGalleryModal } from '@/components/admin/image-gallery-modal';
import { useSectionStyleDefaults } from '@/hooks/use-section-style-defaults';
import { useGlobalStyleConfig } from '@/hooks/use-global-style-config';
import type { ReviewConfig, Review } from '@/types/review.types';
import { DEFAULT_REVIEW_CONFIG } from '@/types/review.types';
import { DEFAULT_GLOBAL_STYLE_CONFIG } from '@/types/global-style.types';
import { getReviewLayoutOptions, getReviewAnimationOptions, type ReviewLayoutValue } from '@/utils/review-layout-utils';

type PreviewViewport = 'desktop' | 'mobile';
type SupportedReviewLayout = ReviewLayoutValue;

interface ReviewSettingsFormProps {
  pageId?: string;
  templateId?: string;
  isNewSection?: boolean;
}

const normalizeReviewLayout = (
  layout: ReviewConfig['layout'],
): SupportedReviewLayout => {
  if (layout === 'slider') {
    return 'slider';
  }

  if (layout === 'list' || layout === 'masonry') {
    return 'list';
  }

  return 'grid';
};

// Get review layout and animation options from JSON
const reviewLayoutOptions = getReviewLayoutOptions();
const reviewAnimationStyles = getReviewAnimationOptions();

const reviewAnimationSpeeds: Array<{
  value: NonNullable<ReviewConfig['animationSpeed']>;
  label: string;
}> = [
    { value: 'fast', label: 'Fast' },
    { value: 'normal', label: 'Normal' },
    { value: 'slow', label: 'Slow' },
  ];

const reviewCountOptions = [3, 4, 6] as const;
type ReviewCountOption = (typeof reviewCountOptions)[number];

const REVIEW_GLOBAL_TYPOGRAPHY_KEYS = [
  'titleFontFamily',
  'titleFontSize',
  'titleFontWeight',
  'titleColor',
  'subtitleFontFamily',
  'subtitleFontSize',
  'subtitleFontWeight',
  'subtitleColor',
  'bodyFontFamily',
  'bodyFontSize',
  'bodyFontWeight',
  'bodyColor',
] as const satisfies ReadonlyArray<keyof ReviewConfig>;

function buildGlobalTypographyConfig(
  defaults: Partial<ReviewConfig>,
): Partial<ReviewConfig> {
  const nextConfig: Partial<ReviewConfig> = {};

  for (const key of REVIEW_GLOBAL_TYPOGRAPHY_KEYS) {
    (nextConfig as any)[key] = defaults[key] ?? DEFAULT_REVIEW_CONFIG[key];
  }

  return nextConfig;
}

function resolveButtonStyleVariant(
  variant?: ReviewConfig['buttonStyleVariant'],
): ReviewConfig['buttonStyleVariant'] {
  return variant === 'secondary' ? 'secondary' : 'primary';
}

function normalizeReviewCount(value?: number): ReviewCountOption {
  if (value === 4) {
    return 4;
  }

  if (value !== undefined && value >= 5) {
    return 6;
  }

  return 3;
}

function renderReviewLayoutPreview(
  layout: SupportedReviewLayout,
  active: boolean,
) {
  const boardTone = active
    ? 'border-purple-200 bg-[linear-gradient(180deg,rgba(255,255,255,1)_0%,rgba(250,245,255,1)_100%)]'
    : 'border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,1)_0%,rgba(248,250,252,1)_100%)]';
  const cardTone = active
    ? 'border-purple-100/90 bg-white shadow-[0_14px_30px_rgba(168,85,247,0.12)]'
    : 'border-slate-200/90 bg-white shadow-[0_14px_30px_rgba(15,23,42,0.06)]';
  const softTone = active ? 'bg-purple-200/80' : 'bg-slate-200';
  const paleTone = active ? 'bg-purple-100/90' : 'bg-slate-100';
  const titleTone = active ? 'bg-slate-900' : 'bg-slate-700';
  const buttonTone = active
    ? 'border-purple-300 bg-purple-50 text-purple-700'
    : 'border-purple-200 bg-white text-purple-600';

  return (
    <div className={`overflow-hidden rounded-2xl border ${boardTone}`}>
      <div className="flex items-center justify-between border-b border-slate-200/80 bg-white/90 px-3 py-2">
        <div className="flex gap-1">
          <span className="h-2 w-2 rounded-full bg-purple-300" />
          <span className="h-2 w-2 rounded-full bg-amber-300" />
          <span className="h-2 w-2 rounded-full bg-emerald-300" />
        </div>
        <div className={`h-2 w-20 rounded-full ${softTone}`} />
      </div>
      <div className="h-36 p-3">
        {layout === 'grid' ? (
          <div className="flex h-full flex-col gap-2">
            <div className={`h-3 w-40 rounded-full ${titleTone}`} />
            <div
              className={`inline-flex w-fit items-center gap-2 rounded-xl border px-2.5 py-1.5 text-[10px] font-semibold ${buttonTone}`}
            >
              <span className="h-3 w-3 rounded-full bg-[conic-gradient(from_210deg,#4285f4_0deg,#34a853_140deg,#fbbc05_220deg,#ea4335_320deg,#4285f4_360deg)]" />
              Rate Us
            </div>
            <div className="mt-1 grid flex-1 grid-cols-3 gap-2">
              {[0, 1, 2].map((index) => (
                <div
                  key={index}
                  className={`rounded-2xl border px-2 py-2.5 text-center ${cardTone}`}
                >
                  <div
                    className={`mx-auto mb-2 h-6 w-6 rounded-full ${paleTone}`}
                  />
                  <div className="mb-2 flex justify-center gap-1">
                    {Array.from({ length: 5 }).map((_, star) => (
                      <span
                        key={star}
                        className={`h-1.5 w-1.5 rounded-full ${star < 4 ? 'bg-amber-400' : softTone}`}
                      />
                    ))}
                  </div>
                  <div
                    className={`mx-auto mb-1.5 h-2 rounded-full ${softTone} ${index === 1 ? 'w-full' : 'w-5/6'}`}
                  />
                  <div
                    className={`mx-auto h-2 rounded-full ${softTone} ${index === 0 ? 'w-3/4' : 'w-2/3'}`}
                  />
                </div>
              ))}
            </div>
            <div className="flex items-center justify-end gap-2">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 bg-white text-[10px] text-slate-500 shadow-sm">
                ←
              </span>
              <span className="h-1.5 w-10 rounded-full bg-purple-500" />
              <span className="h-1.5 w-1.5 rounded-full bg-slate-200" />
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 bg-white text-[10px] text-slate-500 shadow-sm">
                →
              </span>
            </div>
          </div>
        ) : null}

        {layout === 'slider' ? (
          <div className="grid h-full grid-cols-[1.05fr_0.95fr] gap-2">
            <div className={`rounded-[1.35rem] border px-3 py-3 ${cardTone}`}>
              <div
                className={`mx-auto mb-2 h-5 w-5 rounded-full ${paleTone}`}
              />
              <div className="mb-2 flex justify-center gap-1">
                {Array.from({ length: 5 }).map((_, star) => (
                  <span
                    key={star}
                    className={`h-1.5 w-1.5 rounded-full ${star < 5 ? 'bg-amber-400' : softTone}`}
                  />
                ))}
              </div>
              <div
                className={`mx-auto mb-1.5 h-2 w-full rounded-full ${softTone}`}
              />
              <div
                className={`mx-auto mb-1.5 h-2 w-11/12 rounded-full ${softTone}`}
              />
              <div className={`mx-auto h-2 w-2/3 rounded-full ${softTone}`} />
              <div className="mt-3 flex items-center justify-between">
                <span className="text-[10px] text-slate-400">←</span>
                <span className={`h-2 w-14 rounded-full ${softTone}`} />
                <span className="text-[10px] text-slate-400">→</span>
              </div>
              <div
                className={`mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border px-2.5 py-2 text-[10px] font-semibold ${active ? 'border-purple-300 bg-purple-600 text-white' : 'border-purple-200 bg-purple-500 text-white'}`}
              >
                <span className="h-3 w-3 rounded-full bg-white/70" />
                Review On Google
              </div>
            </div>
            <div className="rounded-[1.5rem] bg-[linear-gradient(135deg,#0f172a,#6d28d9_52%,#a855f7)]" />
          </div>
        ) : null}

        {layout === 'list' ? (
          <div className="flex h-full flex-col gap-2">
            <div className={`h-3 w-44 rounded-full ${titleTone}`} />
            <div
              className={`inline-flex w-fit items-center gap-2 rounded-xl border px-2.5 py-1.5 text-[10px] font-semibold ${buttonTone}`}
            >
              <span className="h-3 w-3 rounded-full bg-[conic-gradient(from_210deg,#4285f4_0deg,#34a853_140deg,#fbbc05_220deg,#ea4335_320deg,#4285f4_360deg)]" />
              Google CTA
            </div>
            <div className="relative mt-1 flex flex-1 items-center gap-2">
              <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-[10px] text-slate-500 shadow-sm">
                ←
              </span>
              {[0, 1, 2].map((index) => (
                <div
                  key={index}
                  className={`min-w-0 flex-1 rounded-2xl border px-2 py-2 ${cardTone}`}
                >
                  <div
                    className={`mx-auto mb-2 h-6 w-6 rounded-full ${paleTone}`}
                  />
                  <div className="mb-2 flex justify-center gap-1">
                    {Array.from({ length: 5 }).map((_, star) => (
                      <span
                        key={star}
                        className={`h-1.5 w-1.5 rounded-full ${star < 3 ? 'bg-amber-400' : softTone}`}
                      />
                    ))}
                  </div>
                  <div
                    className={`mx-auto mb-1.5 h-2 rounded-full ${softTone} ${index === 0 ? 'w-4/5' : 'w-full'}`}
                  />
                  <div
                    className={`mx-auto h-2 rounded-full ${softTone} ${index === 1 ? 'w-3/4' : 'w-2/3'}`}
                  />
                </div>
              ))}
              <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-[10px] text-slate-500 shadow-sm">
                →
              </span>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function buildSampleReviews(restaurantId: string): Review[] {
  const now = Date.now();

  return [
    {
      review_id: 'sample-1',
      restaurant_id: restaurantId,
      author_name: 'Sarah Johnson',
      rating: 5,
      review_text:
        'Absolutely amazing experience. The food was incredible and the service felt thoughtful from start to finish.',
      published_at: new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString(),
      source: 'Google',
      avatar_url:
        'https://ui-avatars.com/api/?name=Sarah+Johnson&background=a855f7&color=fff',
      is_hidden: false,
      created_at: new Date(now).toISOString(),
      updated_at: new Date(now).toISOString(),
      is_deleted: false,
    },
    {
      review_id: 'sample-2',
      restaurant_id: restaurantId,
      author_name: 'Michael Chen',
      rating: 5,
      review_text:
        'Best restaurant in town. Beautiful atmosphere, polished plating, and every course felt memorable.',
      published_at: new Date(now - 14 * 24 * 60 * 60 * 1000).toISOString(),
      source: 'Google',
      avatar_url:
        'https://ui-avatars.com/api/?name=Michael+Chen&background=8b5cf6&color=fff',
      is_hidden: false,
      created_at: new Date(now).toISOString(),
      updated_at: new Date(now).toISOString(),
      is_deleted: false,
    },
    {
      review_id: 'sample-3',
      restaurant_id: restaurantId,
      author_name: 'Emily Rodriguez',
      rating: 4,
      review_text:
        'Great food, warm staff, and a space that feels lively without being loud. We will definitely come back.',
      published_at: new Date(now - 21 * 24 * 60 * 60 * 1000).toISOString(),
      source: 'Google',
      avatar_url:
        'https://ui-avatars.com/api/?name=Emily+Rodriguez&background=7c3aed&color=fff',
      is_hidden: false,
      created_at: new Date(now).toISOString(),
      updated_at: new Date(now).toISOString(),
      is_deleted: false,
    },
    {
      review_id: 'sample-4',
      restaurant_id: restaurantId,
      author_name: 'David Thompson',
      rating: 5,
      review_text:
        'Outstanding in every way. Friendly service, strong menu guidance, and dishes that genuinely surprised us.',
      published_at: new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString(),
      source: 'Google',
      avatar_url:
        'https://ui-avatars.com/api/?name=David+Thompson&background=6d28d9&color=fff',
      is_hidden: false,
      created_at: new Date(now).toISOString(),
      updated_at: new Date(now).toISOString(),
      is_deleted: false,
    },
    {
      review_id: 'sample-5',
      restaurant_id: restaurantId,
      author_name: 'Jessica Martinez',
      rating: 5,
      review_text:
        'Exceptional dining experience. Fresh ingredients, creative menu, and presentation that felt premium without being stiff.',
      published_at: new Date(now - 45 * 24 * 60 * 60 * 1000).toISOString(),
      source: 'Google',
      avatar_url:
        'https://ui-avatars.com/api/?name=Jessica+Martinez&background=5b21b6&color=fff',
      is_hidden: false,
      created_at: new Date(now).toISOString(),
      updated_at: new Date(now).toISOString(),
      is_deleted: false,
    },
    {
      review_id: 'sample-6',
      restaurant_id: restaurantId,
      author_name: 'Olivia Carter',
      rating: 5,
      review_text:
        'Elegant atmosphere, smooth service, and a menu that feels carefully curated from start to finish.',
      published_at: new Date(now - 60 * 24 * 60 * 60 * 1000).toISOString(),
      source: 'Google',
      avatar_url:
        'https://ui-avatars.com/api/?name=Olivia+Carter&background=4c1d95&color=fff',
      is_hidden: false,
      created_at: new Date(now).toISOString(),
      updated_at: new Date(now).toISOString(),
      is_deleted: false,
    },
  ];
}

export default function ReviewSettingsForm({
  pageId,
  templateId,
  isNewSection,
}: ReviewSettingsFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams() ?? new URLSearchParams();
  const restaurantId = searchParams?.get('restaurant_id') || '';
  const restaurantName = searchParams?.get('restaurant_name') || '';
  const globalStyleEndpoint = restaurantId
    ? `/api/global-style-config?restaurant_id=${encodeURIComponent(restaurantId)}`
    : '/api/global-style-config';

  // Get section style defaults
  const sectionStyleDefaults = useSectionStyleDefaults(restaurantId);
  const { config: globalStyles } = useGlobalStyleConfig({
    apiEndpoint: globalStyleEndpoint,
    fetchOnMount: Boolean(restaurantId),
  });
  const globalBackgroundColor =
    globalStyles?.backgroundColor ||
    DEFAULT_GLOBAL_STYLE_CONFIG.backgroundColor ||
    DEFAULT_REVIEW_CONFIG.bgColor ||
    '#f9fafb';

  const [config, setConfig] = useState<ReviewConfig>({
    ...DEFAULT_REVIEW_CONFIG,
    ...sectionStyleDefaults,
    bgColor: globalBackgroundColor,
  });
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showHighlightGallery, setShowHighlightGallery] = useState(false);
  const [uploadingHighlightImage, setUploadingHighlightImage] = useState(false);
  const [previewViewport, setPreviewViewport] =
    useState<PreviewViewport>('desktop');

  // Toast state
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  // Validate that restaurant ID is provided
  if (!restaurantId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <svg
              className="h-6 w-6 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-red-900">Error</h2>
          <p className="mt-1 text-sm text-red-700">
            Restaurant ID is required. Please provide it via URL parameter.
          </p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    if (restaurantId) {
      fetchReviewConfig();
      fetchReviews();
    }
  }, [restaurantId, pageId, templateId, isNewSection, sectionStyleDefaults]);

  useEffect(() => {
    if (!isNewSection) return;
    setConfig((prev) => ({
      ...DEFAULT_REVIEW_CONFIG,
      ...sectionStyleDefaults,
      bgColor: globalBackgroundColor,
      ...prev,
    }));
  }, [globalBackgroundColor, isNewSection, sectionStyleDefaults]);

  useEffect(() => {
    setConfig((previous) => {
      const nextBackgroundColor =
        !previous.bgColor || previous.bgColor === DEFAULT_REVIEW_CONFIG.bgColor
          ? globalBackgroundColor
          : previous.bgColor;

      if (previous.bgColor === nextBackgroundColor) {
        return previous;
      }

      return {
        ...previous,
        bgColor: nextBackgroundColor,
      };
    });
  }, [globalBackgroundColor]);

  useEffect(() => {
    const globalTypography = buildGlobalTypographyConfig(sectionStyleDefaults);
    const defaultButtonStyleVariant = resolveButtonStyleVariant(
      sectionStyleDefaults.buttonStyleVariant,
    );

    setConfig((previous) => {
      if (previous.is_custom) {
        return previous;
      }

      const nextButtonStyleVariant = defaultButtonStyleVariant;
      const typographyChanged = REVIEW_GLOBAL_TYPOGRAPHY_KEYS.some(
        (key) => previous[key] !== globalTypography[key],
      );
      const buttonChanged =
        previous.buttonStyleVariant !== nextButtonStyleVariant;
      const customChanged = previous.is_custom !== false;

      if (!typographyChanged && !buttonChanged && !customChanged) {
        return previous;
      }

      return {
        ...previous,
        ...globalTypography,
        is_custom: false,
        buttonStyleVariant: nextButtonStyleVariant,
      };
    });
  }, [sectionStyleDefaults]);

  const fetchReviewConfig = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (restaurantId) params.append('restaurant_id', restaurantId);
      if (pageId) params.append('page_id', pageId);
      if (templateId) params.append('template_id', templateId);
      if (isNewSection) params.append('new_section', 'true');

      const url = `/api/review-config?${params.toString()}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.success && data.data) {
        setConfig({
          ...DEFAULT_REVIEW_CONFIG,
          ...sectionStyleDefaults,
          ...data.data,
          layout: normalizeReviewLayout(data.data.layout),
          maxReviews: undefined,
        });
      }
    } catch (error) {
      console.error('Error fetching review config:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    if (!restaurantId) return;

    try {
      const url = `/api/reviews?restaurant_id=${restaurantId}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        setReviews(data.data);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    }
  };

  const handleHighlightImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file || !restaurantId) return;

    setUploadingHighlightImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('restaurant_id', restaurantId);

      const response = await fetch('/api/media/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success && data.data?.file?.url) {
        updateConfig({ highlightImageUrl: data.data.file.url });
        setToastMessage('Spotlight image uploaded successfully!');
        setToastType('success');
        setShowToast(true);
      } else {
        setToastMessage(
          `Failed to upload image: ${data.error || 'Unknown error'}`,
        );
        setToastType('error');
        setShowToast(true);
      }
    } catch (error) {
      console.error('Error uploading spotlight image:', error);
      setToastMessage('Error uploading spotlight image');
      setToastType('error');
      setShowToast(true);
    } finally {
      setUploadingHighlightImage(false);
      event.target.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setSaving(true);
    try {
      const response = await fetch('/api/review-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...config,
          maxReviews: undefined,
          restaurant_id: restaurantId,
          page_id: pageId || null,
          template_id: templateId || null,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setToastMessage(
          isNewSection
            ? 'Review section created successfully!'
            : 'Review settings saved successfully!',
        );
        setToastType('success');
        setShowToast(true);

        // Navigate back to page settings after successful save
        setTimeout(() => {
          const params = new URLSearchParams();
          if (restaurantId) params.set('restaurant_id', restaurantId);
          if (restaurantName) params.set('restaurant_name', restaurantName);
          if (pageId) params.set('page_id', pageId);
          router.replace(`/admin/page-settings?${params.toString()}`);
        }, 1500);
      } else {
        setToastMessage('Error saving settings: ' + data.error);
        setToastType('error');
        setShowToast(true);
      }
    } catch (error) {
      console.error('Error saving review config:', error);
      setToastMessage('Error saving settings');
      setToastType('error');
      setShowToast(true);
    } finally {
      setSaving(false);
    }
  };

  const updateConfig = (updates: Partial<ReviewConfig>) => {
    setConfig((prev) => ({
      ...prev,
      ...updates,
      layout:
        updates.layout !== undefined
          ? normalizeReviewLayout(updates.layout)
          : prev.layout,
    }));
  };

  const handleCustomTypographyToggle = (enabled: boolean) => {
    if (!enabled) {
      updateConfig({ is_custom: false });
      return;
    }

    setConfig((previous) => ({
      ...previous,
      ...buildGlobalTypographyConfig(sectionStyleDefaults),
      is_custom: true,
      buttonStyleVariant: resolveButtonStyleVariant(
        sectionStyleDefaults.buttonStyleVariant,
      ),
    }));
  };

  const activeLayout = normalizeReviewLayout(config.layout);
  const activeLayoutOption =
    reviewLayoutOptions.find((option) => option.value === activeLayout) ||
    reviewLayoutOptions[0];
  const selectedAnimationStyle =
    reviewAnimationStyles.find(
      (option) => option.value === config.animationStyle,
    ) || reviewAnimationStyles[0];
  const sampleReviews = buildSampleReviews(restaurantId);
  const previewReviews = reviews.length > 0 ? reviews : sampleReviews;
  const motionStatusLabel =
    config.enableAnimations === false
      ? 'Disabled'
      : `${selectedAnimationStyle.name} • ${(config.animationSpeed || 'normal').charAt(0).toUpperCase()}${(config.animationSpeed || 'normal').slice(1)}`;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="inline-flex items-center gap-3 rounded-xl border border-purple-200 bg-purple-50 px-5 py-3.5">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-purple-600 border-t-transparent"></div>
          <p className="text-sm font-medium text-gray-700">
            Loading review settings...
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Toast Notification */}
      {showToast && (
        <Toast
          message={toastMessage}
          type={toastType}
          onClose={() => setShowToast(false)}
        />
      )}

      {/* Page Header */}
      <div className="mb-8 flex items-start">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg">
            <svg
              className="h-7 w-7 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {isNewSection
                ? 'Add New Review Section'
                : 'Review Section Settings'}
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              {isNewSection
                ? 'Create a new review section for this page'
                : 'Customize how customer reviews are displayed on your website'}
            </p>
            {restaurantName && (
              <p className="mt-1 text-sm text-gray-500">
                Restaurant: {restaurantName}
              </p>
            )}
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 pb-40">
        {/* Layout Settings Section */}
        <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,rgba(250,245,255,0.82),rgba(255,255,255,1)_44%),linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-6 shadow-[0_28px_70px_rgba(15,23,42,0.07)] sm:p-7">
          <div className="mb-7 flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-[0_16px_32px_rgba(168,85,247,0.28)]">
                <svg
                  className="h-5 w-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  Layout Configuration
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Choose the review presentation, density, media, and motion
                  system.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <label className="text-sm font-medium text-slate-700">
                  Layout Type
                </label>
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
                  Pick the closest reference layout first
                </p>
              </div>
              <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
                {reviewLayoutOptions.map((option) => {
                  const isActive = activeLayout === option.value;

                  return (
                    <button
                      type="button"
                      key={option.value}
                      onClick={() => updateConfig({ layout: option.value })}
                      aria-pressed={isActive}
                      className={`group w-full rounded-[26px] border p-4 text-left transition-all ${isActive
                          ? 'border-purple-400 bg-[linear-gradient(180deg,rgba(250,245,255,1)_0%,rgba(255,255,255,1)_100%)] shadow-[0_22px_48px_rgba(124,58,237,0.14)]'
                          : 'border-slate-200/90 bg-white/90 hover:-translate-y-0.5 hover:border-purple-200 hover:bg-white hover:shadow-[0_20px_40px_rgba(15,23,42,0.08)]'
                        }`}
                    >
                      <div className="mb-4 rounded-[24px] border border-white/70 bg-white/70 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                        {renderReviewLayoutPreview(option.value, isActive)}
                      </div>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div
                            className={`text-sm font-semibold ${isActive ? 'text-purple-700' : 'text-slate-900'}`}
                          >
                            {option.name}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            {option.description}
                          </div>
                        </div>
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${isActive
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-slate-100 text-slate-500'
                            }`}
                        >
                          {isActive ? option.accent : 'Layout'}
                        </span>
                      </div>
                      <div className="mt-3 rounded-2xl border border-slate-200/80 bg-white/80 px-3 py-2 text-xs text-slate-500">
                        {option.support}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 items-start gap-6">
              <div className="space-y-5">
                {activeLayout === 'slider' ? (
                  <div className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_24px_55px_rgba(15,23,42,0.06)]">
                    <div className="px-5 py-5">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="max-w-xl">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Spotlight Media
                          </p>
                          <h4 className="mt-2 text-lg font-semibold text-slate-900">
                            Split Spotlight Image
                          </h4>
                          <p className="mt-3 text-sm leading-6 text-slate-600">
                            Add a restaurant exterior or signature ambience
                            image to give the split layout a premium, editorial
                            feel.
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-700 ring-1 ring-purple-100">
                            Active in preview
                          </span>
                          <button
                            type="button"
                            onClick={() => setShowHighlightGallery(true)}
                            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-purple-200 hover:text-purple-700"
                          >
                            <svg
                              className="h-4 w-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              strokeWidth={2}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M3 16.5V5.25A2.25 2.25 0 015.25 3h13.5A2.25 2.25 0 0121 5.25v13.5A2.25 2.25 0 0118.75 21H8.25M3 16.5l3.879-3.879a1.5 1.5 0 012.121 0L12 15.621m-9 0V18.75A2.25 2.25 0 005.25 21H18.75"
                              />
                            </svg>
                            Choose from library
                          </button>
                          <label
                            className={`inline-flex cursor-pointer items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${uploadingHighlightImage
                                ? 'cursor-wait border border-purple-200 bg-purple-50 text-purple-700'
                                : 'border border-purple-200 bg-purple-600 text-white hover:bg-purple-700'
                              }`}
                          >
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={handleHighlightImageUpload}
                              disabled={uploadingHighlightImage}
                            />
                            {uploadingHighlightImage ? (
                              <>
                                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                Uploading...
                              </>
                            ) : (
                              <>
                                <svg
                                  className="h-4 w-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                  strokeWidth={2}
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M12 16V4m0 0l-4 4m4-4l4 4m5 8v1.5A2.5 2.5 0 0118.5 20h-13A2.5 2.5 0 013 17.5V16"
                                  />
                                </svg>
                                Upload image
                              </>
                            )}
                          </label>
                          {config.highlightImageUrl ? (
                            <button
                              type="button"
                              onClick={() =>
                                updateConfig({ highlightImageUrl: '' })
                              }
                              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-500 transition-colors hover:border-purple-200 hover:text-purple-700"
                            >
                              Remove
                            </button>
                          ) : null}
                        </div>
                      </div>

                      <div className="mt-5">
                        <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-slate-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                          {config.highlightImageUrl ? (
                            <img
                              src={config.highlightImageUrl}
                              alt="Split spotlight preview"
                              className="h-72 w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-72 w-full items-end bg-[linear-gradient(135deg,#0f172a_0%,#6d28d9_48%,#a855f7_100%)] p-5">
                              <div className="rounded-2xl bg-black/20 px-4 py-2.5 text-sm font-semibold text-white/90 backdrop-blur-sm">
                                Split Spotlight placeholder
                              </div>
                            </div>
                          )}

                          <div className="flex flex-col gap-2 border-t border-slate-200 bg-white/90 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="text-sm font-semibold text-slate-900">
                                {config.highlightImageUrl
                                  ? 'Spotlight image ready'
                                  : 'No spotlight image selected'}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                {config.highlightImageUrl
                                  ? 'The split spotlight preview and storefront will use this image.'
                                  : 'Upload an image or choose one from the media library to replace the placeholder artwork.'}
                              </p>
                            </div>
                            <span className="inline-flex w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                              {config.highlightImageUrl
                                ? 'Custom image'
                                : 'Placeholder'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

              <div>
                <div className="rounded-[30px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#faf5ff_100%)] p-5 shadow-[0_24px_60px_rgba(15,23,42,0.06)]">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Motion System
                      </p>
                      <h4 className="mt-2 text-lg font-semibold text-slate-900">
                        Entrance Animation
                      </h4>
                      <p className="mt-2 text-sm text-slate-600">
                        Use subtle motion to make the review section feel more
                        polished without becoming distracting.
                      </p>
                    </div>
                    <label className="relative inline-flex cursor-pointer items-center rounded-full bg-white/80 p-1 ring-1 ring-purple-100">
                      <input
                        type="checkbox"
                        checked={config.enableAnimations ?? true}
                        onChange={(e) =>
                          updateConfig({ enableAnimations: e.target.checked })
                        }
                        className="peer sr-only"
                      />
                      <div className="peer h-7 w-12 rounded-full bg-slate-200 after:absolute after:left-[2px] after:top-[2px] after:h-6 after:w-6 after:rounded-full after:bg-white after:shadow-sm after:transition-all after:content-[''] peer-checked:bg-purple-600 peer-checked:after:translate-x-5 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-500 peer-focus:ring-offset-2"></div>
                    </label>
                  </div>

                  <div
                    className={`mt-5 grid grid-cols-1 gap-4 ${config.enableAnimations === false ? 'opacity-55' : ''}`}
                  >
                    <div className="rounded-[24px] border border-slate-200 bg-white/90 p-4">
                      <label className="mb-2 block text-sm font-medium text-slate-700">
                        Animation Style
                      </label>
                      <select
                        value={config.animationStyle || 'fade-up'}
                        onChange={(e) =>
                          updateConfig({
                            animationStyle:
                              e.target.value === 'soft-scale'
                                ? 'soft-scale'
                                : e.target.value === 'slide-up'
                                  ? 'slide-up'
                                  : 'fade-up',
                            enableAnimations: true,
                          })
                        }
                        disabled={config.enableAnimations === false}
                        className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-900 transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-20 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                      >
                        {reviewAnimationStyles.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.name}
                          </option>
                        ))}
                      </select>
                      <p className="mt-2 text-xs text-slate-500">
                        {selectedAnimationStyle.description}
                      </p>
                    </div>

                    <div className="rounded-[24px] border border-slate-200 bg-white/90 p-4">
                      <label className="mb-2 block text-sm font-medium text-slate-700">
                        Animation Speed
                      </label>
                      <select
                        value={config.animationSpeed || 'normal'}
                        onChange={(e) =>
                          updateConfig({
                            animationSpeed:
                              e.target.value === 'fast'
                                ? 'fast'
                                : e.target.value === 'slow'
                                  ? 'slow'
                                  : 'normal',
                            enableAnimations: true,
                          })
                        }
                        disabled={config.enableAnimations === false}
                        className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-900 transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-20 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                      >
                        {reviewAnimationSpeeds.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <p className="mt-2 text-xs text-slate-500">
                        Control how quickly the review cards animate into view.
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-[22px] border border-white/70 bg-white/90 px-4 py-3 text-sm text-slate-600 shadow-sm">
                    Current motion:{' '}
                    <span className="font-semibold text-slate-900">
                      {motionStatusLabel}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Basic Information Section */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
              <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Content Configuration</h2>
              <p className="text-sm text-gray-600">Set section title, subtitle and description</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-gray-700">
                <span>Title</span>
                <span className="text-xs font-normal text-gray-500">Section title</span>
              </label>
              <input
                type="text"
                value={config.title || ''}
                onChange={(e) => updateConfig({ title: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-20"
                placeholder="Customer Reviews"
              />
            </div>

            <div>
              <label className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-gray-700">
                <span>Subtitle</span>
                <span className="text-xs font-normal text-gray-500">Optional subtitle text</span>
              </label>
              <input
                type="text"
                value={config.subtitle || ''}
                onChange={(e) => updateConfig({ subtitle: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-20"
                placeholder="What our customers say"
              />
            </div>

            <div>
              <label className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-gray-700">
                <span>Description</span>
                <span className="text-xs font-normal text-gray-500">Optional description text</span>
              </label>
              <textarea
                value={config.description || ''}
                onChange={(e) => updateConfig({ description: e.target.value })}
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-20"
                placeholder="Read what our satisfied customers have to say..."
              />
            </div>
          </div>
        </div>

        {/* Display Options Section */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
              <svg
                className="h-5 w-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Display Options
              </h2>
              <p className="text-sm text-gray-600">
                Configure what elements to show in reviews
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {[
              {
                key: 'showAvatar',
                label: 'Show Avatar',
                description: 'Display reviewer profile pictures',
              },
              {
                key: 'showRating',
                label: 'Show Rating',
                description: 'Display star ratings',
              },
              {
                key: 'showDate',
                label: 'Show Date',
                description: 'Display review date',
              },
              {
                key: 'showSource',
                label: 'Show Source',
                description: 'Display review source (e.g., Google)',
              },
            ].map(({ key, label, description }) => (
              <div key={key} className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    {label}
                  </label>
                  <p className="text-xs text-gray-500">{description}</p>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={config[key as keyof ReviewConfig] as boolean}
                    onChange={(e) => updateConfig({ [key]: e.target.checked })}
                    className="peer sr-only"
                  />
                  <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-purple-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-500 peer-focus:ring-offset-2"></div>
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Styling Options Section */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
              <svg
                className="h-5 w-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Styling Options
              </h2>
              <p className="text-sm text-gray-600">
                Keep the review section background aligned with your theme, with one optional section-level override.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-gray-700">
                <span>Background Color</span>
                <span className="text-xs font-normal text-gray-500">
                  Section background color
                </span>
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={config.bgColor || globalBackgroundColor}
                  onChange={(e) => updateConfig({ bgColor: e.target.value })}
                  className="h-10 w-16 cursor-pointer rounded-lg border border-gray-300 bg-white"
                />
                <input
                  type="text"
                  value={config.bgColor || globalBackgroundColor}
                  onChange={(e) => updateConfig({ bgColor: e.target.value })}
                  className="flex-1 rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-20"
                  placeholder={globalBackgroundColor}
                />
                <button
                  type="button"
                  onClick={() => updateConfig({ bgColor: globalBackgroundColor })}
                  className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                  title="Reset to global background"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                    />
                  </svg>
                </button>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Reset restores the current global background color from your theme settings.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
              <svg
                className="h-5 w-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.5 4.5L6 12l7.5 7.5M6 12h12"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Section Animation
              </h2>
              <p className="text-sm text-gray-600">
                Add a section-level reveal animation for the whole review block, separate from the internal card motion.
              </p>
            </div>
          </div>

          <SectionAppearanceControls
            value={config}
            onChange={(updates) => updateConfig(updates as Partial<ReviewConfig>)}
            viewport="desktop"
          />
        </div>

        {/* Typography & Buttons Section */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
              <svg
                className="h-5 w-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Typography & Buttons
              </h2>
              <p className="text-sm text-gray-600">
                Keep review typography aligned with the global theme by default,
                then opt into section-specific overrides only when needed.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Custom Typography & Styles
                  </label>
                  <p className="text-xs text-gray-500">
                    Override global CSS with review-specific styling only when
                    this section needs it.
                  </p>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={config.is_custom || false}
                    onChange={(e) =>
                      handleCustomTypographyToggle(e.target.checked)
                    }
                    className="peer sr-only"
                  />
                  <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-purple-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-500 peer-focus:ring-offset-2"></div>
                </label>
              </div>
            </div>

            {!config.is_custom ? (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                <div className="flex items-start gap-3">
                  <svg
                    className="h-5 w-5 shrink-0 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
                    />
                  </svg>
                  <div>
                    <h4 className="text-sm font-medium text-blue-900">
                      Using Global Styles
                    </h4>
                    <p className="mt-1 text-xs text-blue-700">
                      This section and its preview are currently using the
                      global styles from your theme settings. Enable custom
                      typography above only when the review section needs its
                      own type scale or color treatment.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-purple-100 bg-purple-50 px-4 py-3 text-xs text-purple-800">
                Custom typography starts from your current global styles so you
                can make smaller review-specific adjustments without rebuilding
                the whole section style from scratch.
              </div>
            )}

            {config.is_custom ? (
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <SectionTypographyControls
                  value={config}
                  onChange={(updates) => updateConfig(updates)}
                />
              </div>
            ) : null}
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg border border-purple-200 bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-3 text-sm font-medium text-white shadow-sm transition-all hover:from-purple-700 hover:to-purple-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                Saving...
              </>
            ) : (
              <>
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z"
                  />
                </svg>
                {isNewSection
                  ? 'Create Review Section'
                  : 'Save Review Settings'}
              </>
            )}
          </button>
        </div>
      </form>

      <ImageGalleryModal
        isOpen={showHighlightGallery}
        onClose={() => setShowHighlightGallery(false)}
        onSelect={(imageUrl) => {
          updateConfig({ highlightImageUrl: imageUrl });
          setShowHighlightGallery(false);
          setToastMessage('Spotlight image selected successfully!');
          setToastType('success');
          setShowToast(true);
        }}
        restaurantId={restaurantId}
        title="Select Spotlight Image"
        description="Choose an image from your media library or upload a new one for the Split Spotlight layout."
      />

      {!showPreview ? (
        <button
          type="button"
          onClick={() => {
            setPreviewViewport('desktop');
            setShowPreview(true);
          }}
          className="fixed bottom-24 right-4 z-40 inline-flex items-center gap-3 rounded-full border border-purple-200 bg-white/95 px-5 py-3 text-sm font-semibold text-purple-700 shadow-[0_18px_45px_rgba(15,23,42,0.18)] backdrop-blur transition-all hover:-translate-y-0.5 hover:border-purple-300 hover:bg-white sm:right-6"
          aria-label="Open review preview"
        >
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-purple-600 to-purple-700 text-white shadow-sm">
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </span>
          <span className="flex flex-col items-start leading-tight">
            <span>Live Preview</span>
            <span className="text-xs font-medium text-purple-500">
              {`Preview desktop and mobile ${activeLayoutOption.name.toLowerCase()}`}
            </span>
          </span>
        </button>
      ) : null}

      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
            onClick={() => setShowPreview(false)}
          />
          <div className="relative z-10 flex h-[min(92vh,980px)] w-full max-w-7xl flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_35px_120px_rgba(15,23,42,0.35)]">
            <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Live Preview
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Switch between desktop and mobile to verify the{' '}
                  {activeLayoutOption.name.toLowerCase()} layout.
                  {reviews.length === 0 ? (
                    <span className="ml-1 text-purple-600">
                      (showing sample reviews)
                    </span>
                  ) : null}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="inline-flex rounded-full bg-slate-100 p-1">
                  {(['desktop', 'mobile'] as PreviewViewport[]).map(
                    (viewport) => (
                      <button
                        key={viewport}
                        type="button"
                        onClick={() => setPreviewViewport(viewport)}
                        className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${previewViewport === viewport
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                          }`}
                      >
                        {viewport === 'desktop' ? 'Desktop' : 'Mobile'}
                      </button>
                    ),
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setShowPreview(false)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                  aria-label="Close preview"
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto bg-slate-950 p-4 sm:p-6">
              <div
                className={`mx-auto overflow-hidden border border-white/10 bg-slate-900 shadow-[0_24px_80px_rgba(15,23,42,0.35)] ${previewViewport === 'mobile'
                    ? 'max-w-[430px] rounded-[32px]'
                    : 'max-w-[1240px] rounded-[32px]'
                  }`}
              >
                <div className="flex items-center justify-between border-b border-white/10 bg-slate-950/90 px-4 py-3 text-xs uppercase tracking-[0.24em] text-slate-400">
                  <span>
                    {previewViewport === 'mobile'
                      ? 'Phone Preview'
                      : 'Desktop Preview'}
                  </span>
                  <span>
                    {activeLayoutOption.name} •{' '}
                    {previewViewport === 'mobile' ? '390 x 780' : '1280 x 720'}
                  </span>
                </div>
                <div className="bg-white">
                  <Reviews
                    {...config}
                    isPreview
                    restaurantId={restaurantId}
                    reviews={previewReviews}
                    previewViewport={previewViewport}
                  />
                </div>
              </div>
            </div>
            <div className="border-t border-slate-200 bg-white/95 px-5 py-4 backdrop-blur-sm sm:px-6">
              <div className="flex flex-col gap-2 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <svg
                    className="h-5 w-5 text-purple-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  {reviews.length === 0
                    ? 'Sample reviews fill empty states so you can evaluate spacing, hierarchy, and motion before publishing.'
                    : 'Live preview reflects your current review content, layout, and typography changes.'}
                </div>
                <div className="text-xs uppercase tracking-[0.18em] text-slate-400">
                  {previewViewport === 'mobile'
                    ? 'Mobile responsiveness check'
                    : 'Desktop composition check'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
