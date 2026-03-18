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
import type { CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import type { ReviewConfig, Review } from '@/types/review.types';
import { DEFAULT_REVIEW_CONFIG } from '@/types/review.types';
import { useGlobalStyleConfig } from '@/hooks/use-global-style-config';
import { useSectionReveal } from '@/hooks/use-section-reveal';
import { useSectionViewport } from '@/hooks/use-section-viewport';
import {
  getSectionTypographyStyles,
  getSelectedGlobalButtonStyle,
  getButtonInlineStyle,
  mergeGlobalStyleConfig,
} from '@/lib/section-style';
import { resolveSharedSectionSpacing } from '@/lib/shared-section-spacing';

type PreviewViewport = 'desktop' | 'mobile';

interface ReviewsProps extends Partial<ReviewConfig> {
  reviews?: Review[];
  restaurantId?: string;
  previewViewport?: PreviewViewport;
  isPreview?: boolean;
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

type ReviewLayoutMode = 'grid' | 'slider' | 'list';

function normalizeReviewLayout(layout: ReviewConfig['layout']): ReviewLayoutMode {
  if (layout === 'slider') {
    return 'slider';
  }

  if (layout === 'list' || layout === 'masonry') {
    return 'list';
  }

  return 'grid';
}

function truncateReviewText(text: string | null | undefined, limit: number) {
  if (!text) {
    return '';
  }

  if (text.length <= limit) {
    return text;
  }

  return `${text.slice(0, limit).trim()}...`;
}

function parseCssColorChannels(color?: string | null): [number, number, number] | null {
  if (!color) {
    return null;
  }

  const value = color.trim();
  const hexMatch = value.match(/^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i);
  if (hexMatch) {
    const hex = hexMatch[1];
    const expand = (segment: string) => Number.parseInt(segment.repeat(2), 16);

    if (hex.length === 3 || hex.length === 4) {
      return [expand(hex[0]), expand(hex[1]), expand(hex[2])];
    }

    return [
      Number.parseInt(hex.slice(0, 2), 16),
      Number.parseInt(hex.slice(2, 4), 16),
      Number.parseInt(hex.slice(4, 6), 16),
    ];
  }

  const rgbMatch = value.match(
    /^rgba?\(\s*([0-9]+(?:\.[0-9]+)?)\s*,\s*([0-9]+(?:\.[0-9]+)?)\s*,\s*([0-9]+(?:\.[0-9]+)?)(?:\s*,\s*[0-9.]+\s*)?\)$/i,
  );
  if (!rgbMatch) {
    return null;
  }

  return [
    Math.max(0, Math.min(255, Number(rgbMatch[1]))),
    Math.max(0, Math.min(255, Number(rgbMatch[2]))),
    Math.max(0, Math.min(255, Number(rgbMatch[3]))),
  ];
}

function withAlpha(color: string | undefined | null, alpha: number, fallback: string) {
  const channels = parseCssColorChannels(color);
  if (!channels) {
    return fallback;
  }

  return `rgba(${channels[0]}, ${channels[1]}, ${channels[2]}, ${alpha})`;
}

function extractBorderColor(border: string | undefined | null, fallback: string) {
  if (!border) {
    return fallback;
  }

  const tokens = border.trim().split(/\s+/);
  const parsedToken = tokens.find((token) => parseCssColorChannels(token));
  return parsedToken || fallback;
}

function createSpotlightPlaceholder(
  label: string,
  accentColor: string,
  accentColorDark: string,
) {
  const safeLabel = label
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900">
      <defs>
        <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="#0f172a" />
          <stop offset="45%" stop-color="${accentColorDark}" />
          <stop offset="100%" stop-color="${accentColor}" />
        </linearGradient>
      </defs>
      <rect width="1200" height="900" rx="48" fill="url(#bg)" />
      <rect x="120" y="140" width="960" height="620" rx="28" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.18)" />
      <rect x="210" y="260" width="780" height="260" rx="18" fill="rgba(15,23,42,0.48)" />
      <rect x="240" y="310" width="320" height="24" rx="12" fill="rgba(255,255,255,0.72)" />
      <rect x="240" y="354" width="410" height="18" rx="9" fill="rgba(255,255,255,0.46)" />
      <rect x="240" y="390" width="380" height="18" rx="9" fill="rgba(255,255,255,0.46)" />
      <rect x="240" y="462" width="220" height="54" rx="27" fill="${accentColor}" />
      <text x="240" y="625" fill="rgba(255,255,255,0.88)" font-family="Arial, sans-serif" font-size="44" font-weight="700">${safeLabel}</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export default function Reviews({
  title = '',
  subtitle,
  description,
  reviews = [],
  restaurantId,
  layout = 'grid',
  showAvatar = true,
  showRating = true,
  showDate = true,
  showSource = true,
  maxReviews,
  highlightImageUrl,
  enableAnimations = true,
  animationStyle = 'fade-up',
  animationSpeed = 'normal',
  bgColor = '#f9fafb',
  textColor = '#000000',
  cardBgColor = '#ffffff',
  starColor = '#fbbf24',
  is_custom = false,
  buttonStyleVariant,
  titleFontFamily,
  titleFontSize,
  titleFontWeight,
  titleColor,
  subtitleFontFamily,
  subtitleFontSize,
  subtitleFontWeight,
  subtitleColor,
  bodyFontFamily,
  bodyFontSize,
  bodyFontWeight,
  bodyColor,
  previewViewport,
  enableScrollReveal = false,
  scrollRevealAnimation = 'fade-up',
  isPreview = false,
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
  const globalStyleEndpoint = restaurantId
    ? `/api/global-style-config?restaurant_id=${encodeURIComponent(restaurantId)}`
    : '/api/global-style-config';
  const { config: globalStyles } = useGlobalStyleConfig({
    apiEndpoint: globalStyleEndpoint,
    fetchOnMount: Boolean(restaurantId),
  });
  const mergedGlobalStyles = mergeGlobalStyleConfig(globalStyles);

  const displayReviews = maxReviews ? liveReviews.slice(0, maxReviews) : liveReviews;
  const resolvedBgColor =
    bgColor && bgColor !== DEFAULT_REVIEW_CONFIG.bgColor
      ? bgColor
      : globalStyles?.backgroundColor ||
        bgColor ||
        DEFAULT_REVIEW_CONFIG.bgColor ||
        '#f9fafb';
  const effectiveBodyColor = bodyColor || textColor;
  const sectionStyleConfig = {
    is_custom,
    buttonStyleVariant,
    titleFontFamily,
    titleFontSize,
    titleFontWeight,
    titleColor,
    subtitleFontFamily,
    subtitleFontSize,
    subtitleFontWeight,
    subtitleColor,
    bodyFontFamily,
    bodyFontSize,
    bodyFontWeight,
    bodyColor: effectiveBodyColor,
  };
  const { titleStyle, subtitleStyle, bodyStyle } = getSectionTypographyStyles(
    sectionStyleConfig,
    globalStyles,
  );
  const selectedButtonStyle = getButtonInlineStyle(
    getSelectedGlobalButtonStyle(sectionStyleConfig, globalStyles),
  );
  const reveal = useSectionReveal({
    enabled: enableScrollReveal,
    animation: scrollRevealAnimation,
    isPreview,
  });
  const resolvedViewport = useSectionViewport(previewViewport);
  const isPreviewMobile = resolvedViewport === 'mobile';
  const sharedSpacing = resolveSharedSectionSpacing(resolvedViewport);
  const effectiveLayout = normalizeReviewLayout(layout);
  const sectionPadding = sharedSpacing.sectionPadding;
  const sectionGap = sharedSpacing.sectionGap;
  const cardBorder = '1px solid rgba(148, 163, 184, 0.18)';
  const cardShadow = 'none';
  const cardRadius = isPreviewMobile ? '20px' : '28px';
  const cardPadding = isPreviewMobile ? '1.15rem' : '1.45rem';
  const stripTargetCount = isPreviewMobile ? 1 : 3;
  const cardRailTargetCount = isPreviewMobile ? 1 : 3;
  const stripGapPx = isPreviewMobile ? 16 : 36;
  const cardRailGapPx = isPreviewMobile ? 16 : 24;
  const stripVisibleCount = Math.max(
    1,
    Math.min(stripTargetCount, displayReviews.length || stripTargetCount),
  );
  const cardRailVisibleCount = Math.max(
    1,
    Math.min(cardRailTargetCount, displayReviews.length || cardRailTargetCount),
  );
  const hasStripOverflow = displayReviews.length > stripVisibleCount;
  const hasCardRailOverflow = displayReviews.length > cardRailVisibleCount;
  const stripCardWidth = isPreviewMobile
    ? '100%'
    : hasStripOverflow
      ? 'calc((100% - 72px) / 3.18)'
      : `calc((100% - ${(stripVisibleCount - 1) * stripGapPx}px) / ${stripVisibleCount})`;
  const cardRailWidth = isPreviewMobile
    ? '100%'
    : hasCardRailOverflow
      ? 'calc((100% - 48px) / 3.2)'
      : `calc((100% - ${(cardRailVisibleCount - 1) * cardRailGapPx}px) / ${cardRailVisibleCount})`;
  const layoutMaxStart =
    effectiveLayout === 'slider'
      ? Math.max(0, displayReviews.length - 1)
      : effectiveLayout === 'grid'
        ? Math.max(0, displayReviews.length - stripVisibleCount)
        : Math.max(0, displayReviews.length - cardRailVisibleCount);
  const primaryReviewAccent =
    mergedGlobalStyles.primaryButton?.backgroundColor ||
    mergedGlobalStyles.primaryColor ||
    '#2563eb';
  const primaryReviewAccentDark =
    mergedGlobalStyles.primaryButton?.hoverBackgroundColor || primaryReviewAccent;
  const primaryReviewBorderAccent = extractBorderColor(
    mergedGlobalStyles.primaryButton?.border,
    primaryReviewAccent,
  );
  const spotlightImage =
    highlightImageUrl?.trim() ||
    createSpotlightPlaceholder(
      title || subtitle || 'Restaurant Spotlight',
      primaryReviewAccent,
      primaryReviewAccentDark,
    );
  const subtleSurface = 'rgba(255, 255, 255, 0.92)';
  const reviewAccent = {
    solid: primaryReviewAccent,
    solidDark: primaryReviewAccentDark,
    soft: withAlpha(primaryReviewAccent, 0.1, 'rgba(37, 99, 235, 0.1)'),
    border: primaryReviewBorderAccent,
    text: primaryReviewAccentDark,
    textSoft: primaryReviewAccent,
    shadow: withAlpha(primaryReviewAccent, 0.24, 'rgba(37, 99, 235, 0.24)'),
    shadowSoft: withAlpha(primaryReviewAccent, 0.12, 'rgba(37, 99, 235, 0.12)'),
    progressSoft: withAlpha(primaryReviewAccent, 0.24, 'rgba(37, 99, 235, 0.24)'),
    navBorder: withAlpha(primaryReviewBorderAccent, 0.7, 'rgba(37, 99, 235, 0.7)'),
    navDisabled: withAlpha(primaryReviewAccent, 0.4, 'rgba(37, 99, 235, 0.4)'),
  };
  const layoutFrameStyle: CSSProperties = {
    width: '100%',
    maxWidth: '100%',
    minWidth: 0,
    boxSizing: 'border-box',
    borderRadius: isPreviewMobile ? '26px' : '32px',
    border: 'none',
    background: 'transparent',
    boxShadow: 'none',
    padding: isPreviewMobile ? '1.35rem 1rem' : '2rem 2rem 1.8rem',
  };
  const reviewTextStyle: CSSProperties = {
    fontSize: isPreviewMobile ? '0.92rem' : '0.98rem',
    lineHeight: 1.8,
    color: effectiveBodyColor,
    margin: 0,
  };
  const motionDurationMs =
    animationSpeed === 'fast' ? 260 : animationSpeed === 'slow' ? 560 : 380;
  const motionEnabled = enableAnimations !== false;
  const [isMotionReady, setIsMotionReady] = useState(false);

  useEffect(() => {
    setCurrentSlide((prev) => Math.min(prev, layoutMaxStart));
  }, [layoutMaxStart]);

  useEffect(() => {
    setIsMotionReady(false);
    const animationFrame = window.requestAnimationFrame(() => {
      setIsMotionReady(true);
    });

    return () => window.cancelAnimationFrame(animationFrame);
  }, [effectiveLayout, currentSlide, resolvedViewport, animationStyle, animationSpeed]);

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }).map((_, index) => (
      <span
        key={index}
        style={{
          color: index < rating ? starColor : '#d1d5db',
          fontSize: isPreviewMobile ? '1rem' : '1.05rem',
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

  const renderAvatar = (review: Review, size: number) => {
    if (!showAvatar) {
      return null;
    }

    if (review.avatar_url) {
      return (
        <img
          src={review.avatar_url}
          alt={review.author_name || 'User'}
          style={{
            width: `${size}px`,
            height: `${size}px`,
            borderRadius: '999px',
            objectFit: 'cover',
            flexShrink: 0,
          }}
        />
      );
    }

    const fallbackLabel = (review.author_name || 'A').trim().charAt(0).toUpperCase();
    return (
      <div
        style={{
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: '999px',
          background:
            `linear-gradient(135deg, ${withAlpha(reviewAccent.solid, 0.14, 'rgba(37, 99, 235, 0.14)')}, ${withAlpha(reviewAccent.solidDark, 0.22, 'rgba(29, 78, 216, 0.22)')})`,
          color: reviewAccent.text,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: size >= 48 ? '1rem' : '0.875rem',
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        {fallbackLabel}
      </div>
    );
  };

  const renderGoogleMark = (size = 18) => (
    <span
      aria-hidden="true"
      style={{
        position: 'relative',
        display: 'inline-flex',
        width: `${size}px`,
        height: `${size}px`,
        flexShrink: 0,
        borderRadius: '999px',
        background:
          'conic-gradient(from 210deg, #4285f4 0deg, #34a853 140deg, #fbbc05 220deg, #ea4335 320deg, #4285f4 360deg)',
      }}
    >
      <span
        style={{
          position: 'absolute',
          inset: `${Math.max(2, Math.round(size * 0.18))}px`,
          borderRadius: '999px',
          background: '#ffffff',
        }}
      />
      <span
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#4285f4',
          fontSize: `${Math.max(10, size * 0.68)}px`,
          fontWeight: 800,
          fontFamily: 'Arial, sans-serif',
          lineHeight: 1,
        }}
      >
        G
      </span>
    </span>
  );

  const renderMetaLine = (review: Review, centered = false) => {
    const items: string[] = [];

    if (showSource && review.source) {
      items.push(review.source);
    }

    if (showDate && review.published_at) {
      items.push(formatDate(review.published_at));
    }

    if (items.length === 0) {
      return null;
    }

    return (
      <div
        style={{
          display: 'flex',
          gap: '0.45rem',
          flexWrap: 'wrap',
          justifyContent: centered ? 'center' : 'flex-start',
          fontSize: '0.72rem',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: '#94a3b8',
        }}
      >
        {items.map((item, index) => (
          <span key={`${review.review_id}-${item}`}>
            {index > 0 ? '• ' : ''}
            {item}
          </span>
        ))}
      </div>
    );
  };

  const getEntranceStyle = (index: number): CSSProperties => {
    if (!motionEnabled) {
      return {};
    }

    const delay = Math.min(index, 5) * 70;
    const hiddenTransform =
      animationStyle === 'soft-scale'
        ? 'translate3d(0, 12px, 0) scale(0.96)'
        : animationStyle === 'slide-up'
          ? 'translate3d(24px, 18px, 0)'
          : 'translate3d(0, 22px, 0)';

    return {
      opacity: isMotionReady ? 1 : 0,
      transform: isMotionReady ? 'translate3d(0, 0, 0) scale(1)' : hiddenTransform,
      transition: `opacity ${motionDurationMs}ms cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms, transform ${motionDurationMs}ms cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms`,
      willChange: 'opacity, transform',
    };
  };

  const renderReadMore = (
    review: Review,
    centered = false,
    color = '#475569',
  ) => {
    if (!review.review_text) {
      return null;
    }

    const sharedStyle: CSSProperties = {
      display: 'inline-flex',
      justifyContent: centered ? 'center' : 'flex-start',
      alignSelf: centered ? 'center' : 'flex-start',
      fontSize: '0.84rem',
      fontWeight: 600,
      color,
      textDecoration: 'none',
      marginTop: '0.25rem',
    };

    if (review.review_url) {
      return (
        <a
          href={review.review_url}
          target="_blank"
          rel="noreferrer"
          style={sharedStyle}
        >
          Read more
        </a>
      );
    }

    return <span style={sharedStyle}>Read more</span>;
  };

  const renderGoogleCta = ({
    label,
    variant,
    fullWidth = false,
  }: {
    label: string;
    variant: 'outline' | 'solid';
    fullWidth?: boolean;
  }) => {
    const isSolid = variant === 'solid';
    const isDisabled = !restaurantId;
    const primaryButtonBackground =
      selectedButtonStyle.backgroundColor || reviewAccent.solid;
    const primaryButtonText = selectedButtonStyle.color || '#ffffff';
    const primaryButtonBorder =
      selectedButtonStyle.border || `1px solid ${primaryButtonBackground}`;
    const outlineBorder = `1px solid ${primaryButtonBackground}`;
    const outlineText = primaryButtonBackground;

    return (
      <button
        type="button"
        onClick={openModal}
        disabled={isDisabled}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.7rem',
          width: fullWidth ? '100%' : undefined,
          maxWidth: '100%',
          boxSizing: 'border-box',
          borderRadius: selectedButtonStyle.borderRadius || '16px',
          border: isSolid ? primaryButtonBorder : outlineBorder,
          background: isDisabled
            ? '#d1d5db'
            : isSolid
              ? primaryButtonBackground
              : 'transparent',
          color: isDisabled ? '#64748b' : isSolid ? primaryButtonText : outlineText,
          padding: isSolid ? '1rem 1.35rem' : '0.9rem 1.2rem',
          fontFamily: selectedButtonStyle.fontFamily || bodyFontFamily,
          fontSize: selectedButtonStyle.fontSize || '0.96rem',
          fontWeight: selectedButtonStyle.fontWeight || 700,
          textTransform: selectedButtonStyle.textTransform,
          cursor: isDisabled ? 'not-allowed' : 'pointer',
          boxShadow: isDisabled
            ? 'none'
            : isSolid
              ? '0 18px 40px rgba(15, 23, 42, 0.12)'
              : 'none',
          transition: 'transform 180ms ease, box-shadow 180ms ease',
        }}
      >
        {renderGoogleMark(isSolid ? 20 : 18)}
        <span>{label}</span>
      </button>
    );
  };

  const renderNavigationButton = (
    direction: 'prev' | 'next',
    onClick: () => void,
    disabled: boolean,
  ) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        width: isPreviewMobile ? '44px' : '52px',
        height: isPreviewMobile ? '44px' : '52px',
        borderRadius: '999px',
        border: `1px solid ${reviewAccent.navBorder}`,
        background: 'transparent',
        color: disabled ? reviewAccent.navDisabled : reviewAccent.textSoft,
        boxShadow: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: isPreviewMobile ? '1rem' : '1.15rem',
        transition: 'transform 180ms ease, box-shadow 180ms ease',
      }}
      aria-label={direction === 'prev' ? 'Show previous review' : 'Show next review'}
    >
      {direction === 'prev' ? '\u2190' : '\u2192'}
    </button>
  );

  const renderEditorialReviewCard = (review: Review) => (
    <div
      style={{
        width: '100%',
        maxWidth: '100%',
        minWidth: 0,
        boxSizing: 'border-box',
        borderRadius: isPreviewMobile ? '24px' : '28px',
        border: '1px solid rgba(226, 232, 240, 0.9)',
        background: 'transparent',
        boxShadow: 'none',
        padding: isPreviewMobile ? '1.25rem 1rem' : '1.65rem 1.3rem',
        display: 'flex',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '100%',
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: '0.9rem',
          color: effectiveBodyColor,
        }}
      >
        {renderAvatar(review, isPreviewMobile ? 56 : 68)}
        {showRating ? (
          <div style={{ display: 'inline-flex', gap: '0.08rem' }}>{renderStars(review.rating)}</div>
        ) : null}
        <p style={{ ...reviewTextStyle, maxWidth: '100%' }}>
          {truncateReviewText(review.review_text, isPreviewMobile ? 120 : 165)}
        </p>
        {renderReadMore(review, true, '#334155')}
        <div
          style={{
            fontSize: isPreviewMobile ? '1rem' : '1.08rem',
            fontWeight: 800,
            letterSpacing: '0.08em',
            color: '#111827',
            textTransform: 'uppercase',
          }}
        >
          {review.author_name || 'Anonymous'}
        </div>
        {renderMetaLine(review, true)}
      </div>
    </div>
  );

  const renderSpotlightReview = (review: Review) => (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: isPreviewMobile ? '1fr' : 'minmax(0, 0.98fr) minmax(0, 1.02fr)',
        borderRadius: isPreviewMobile ? '28px' : '34px',
        overflow: 'hidden',
        border: 'none',
        background: 'transparent',
        boxShadow: 'none',
      }}
    >
      <div
        style={{
          order: isPreviewMobile ? 2 : 1,
          padding: isPreviewMobile ? '1.6rem 1.25rem' : '2.8rem 3rem',
          background: 'transparent',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: isPreviewMobile ? '1rem' : '1.25rem',
          minHeight: isPreviewMobile ? 'unset' : '100%',
          ...getEntranceStyle(0),
        }}
      >
        {(title || subtitle || description) && (
          <div style={{ marginBottom: isPreviewMobile ? '0.4rem' : '0.8rem' }}>
            {subtitle ? (
              <p
                style={{
                  ...subtitleStyle,
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                  opacity: 0.72,
                  marginBottom: '0.55rem',
                }}
              >
                {subtitle}
              </p>
            ) : null}
            {title ? (
              <h2
                style={{
                  ...titleStyle,
                  margin: 0,
                  marginBottom: description ? '0.85rem' : 0,
                }}
              >
                {title}
              </h2>
            ) : null}
            {description ? (
              <p style={{ ...bodyStyle, margin: 0, opacity: 0.82 }}>{description}</p>
            ) : null}
          </div>
        )}

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: isPreviewMobile ? 'stretch' : 'center',
            textAlign: isPreviewMobile ? 'left' : 'center',
            gap: '0.9rem',
          }}
        >
          {!isPreviewMobile ? renderAvatar(review, 74) : renderAvatar(review, 60)}
          {showRating ? (
            <div
              style={{
                display: 'inline-flex',
                gap: '0.1rem',
                justifyContent: isPreviewMobile ? 'flex-start' : 'center',
              }}
            >
              {renderStars(review.rating)}
            </div>
          ) : null}
          <p
            style={{
              ...reviewTextStyle,
              fontSize: isPreviewMobile ? '1rem' : '1.06rem',
              color: '#374151',
            }}
          >
            {truncateReviewText(review.review_text, isPreviewMobile ? 190 : 235)}
          </p>
          {renderReadMore(review, !isPreviewMobile, '#475569')}
          <div
            style={{
              fontSize: isPreviewMobile ? '1.02rem' : '1.08rem',
              fontWeight: 800,
              color: '#111827',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            {review.author_name || 'Anonymous'}
          </div>
          {renderMetaLine(review, !isPreviewMobile)}
          {displayReviews.length > 1 ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: isPreviewMobile ? 'space-between' : 'center',
                gap: '1rem',
                marginTop: '0.1rem',
              }}
            >
              {renderNavigationButton('prev', () => setCurrentSlide((prev) => Math.max(0, prev - 1)), safeCurrentSlide === 0)}
              <span
                style={{
                  width: isPreviewMobile ? '100%' : '7rem',
                  height: '6px',
                  borderRadius: '999px',
                  background: 'rgba(226, 232, 240, 0.95)',
                  overflow: 'hidden',
                }}
              >
                <span
                  style={{
                    display: 'block',
                    width: `${((safeCurrentSlide + 1) / Math.max(displayReviews.length, 1)) * 100}%`,
                    height: '100%',
                    background: reviewAccent.solid,
                    borderRadius: '999px',
                  }}
                />
              </span>
              {renderNavigationButton(
                'next',
                () => setCurrentSlide((prev) => Math.min(layoutMaxStart, prev + 1)),
                safeCurrentSlide >= layoutMaxStart,
              )}
            </div>
          ) : null}
          <div style={{ width: '100%', marginTop: '0.45rem' }}>
            {renderGoogleCta({
              label: 'Rate Us On Google',
              variant: 'solid',
              fullWidth: true,
            })}
          </div>
        </div>
      </div>

      <div
        style={{
          order: isPreviewMobile ? 1 : 2,
          minHeight: isPreviewMobile ? '260px' : '100%',
          background: '#e5e7eb',
          ...getEntranceStyle(1),
        }}
      >
        <img
          src={spotlightImage}
          alt={`${title || 'Review spotlight'} feature`}
          style={{
            display: 'block',
            width: '100%',
            height: '100%',
            minHeight: isPreviewMobile ? '260px' : '640px',
            objectFit: 'cover',
          }}
        />
      </div>
    </div>
  );

  const renderCardRailReview = (review: Review) => (
    <div
      style={{
        width: '100%',
        maxWidth: '100%',
        minWidth: 0,
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '100%',
          minWidth: 0,
          boxSizing: 'border-box',
          background: 'transparent',
          borderRadius: cardRadius,
          padding: isPreviewMobile ? '1.3rem 1.1rem' : '1.75rem 1.45rem',
          border: '1px solid rgba(226, 232, 240, 0.9)',
          boxShadow: 'none',
          minHeight: isPreviewMobile ? '100%' : '25rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: '0.92rem',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            right: isPreviewMobile ? '-10px' : '-6px',
            top: isPreviewMobile ? '-14px' : '-12px',
            fontSize: isPreviewMobile ? '4.5rem' : '5.4rem',
            lineHeight: 1,
            color: 'rgba(226, 232, 240, 0.65)',
            fontFamily: 'Georgia, serif',
          }}
        >
          "
        </span>
        {renderAvatar(review, isPreviewMobile ? 56 : 62)}
        {showRating ? (
          <div style={{ display: 'inline-flex', gap: '0.08rem' }}>{renderStars(review.rating)}</div>
        ) : null}
        <p style={{ ...reviewTextStyle, flex: 1 }}>
          {truncateReviewText(review.review_text, isPreviewMobile ? 120 : 175)}
        </p>
        {renderReadMore(review, true, '#475569')}
        <div
          style={{
            fontSize: isPreviewMobile ? '1rem' : '1.08rem',
            fontWeight: 800,
            color: '#111827',
          }}
        >
          {review.author_name || 'Anonymous'}
        </div>
        {renderMetaLine(review, true)}
      </div>
    </div>
  );

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

  const safeCurrentSlide = Math.min(currentSlide, layoutMaxStart);
  const activeReview = displayReviews[safeCurrentSlide] || displayReviews[0];
  const canGoPrev = safeCurrentSlide > 0;
  const canGoNext = safeCurrentSlide < layoutMaxStart;
  const modalWidth = showFeedbackForm ? 'min(100%, 42rem)' : 'min(100%, 38rem)';
  const modalFieldStyle: CSSProperties = {
    width: '100%',
    boxSizing: 'border-box',
    borderRadius: '10px',
    border: '1px solid #cbd5e1',
    padding: '0.65rem 0.75rem',
    outline: 'none',
  };

  return (
    <section
      ref={reveal.ref}
      style={{
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box',
        overflowX: 'clip',
        backgroundColor: resolvedBgColor,
        padding: sectionPadding,
        ...bodyStyle,
        ...reveal.style,
      }}
    >
      <div
        style={{
          display: 'grid',
          gap: sectionGap,
          width: '100%',
          maxWidth: '100%',
          minWidth: 0,
        }}
      >
        {displayReviews.length === 0 ? (
          <div
            style={{
              borderRadius: cardRadius,
              border: cardBorder,
              background: 'transparent',
              padding: cardPadding,
              textAlign: 'center',
              opacity: 0.86,
              boxShadow: cardShadow,
            }}
          >
            No reviews yet. Be the first to share your feedback.
          </div>
        ) : effectiveLayout === 'slider' && activeReview ? (
          renderSpotlightReview(activeReview)
        ) : effectiveLayout === 'grid' ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: sectionGap,
              width: '100%',
              maxWidth: '100%',
              minWidth: 0,
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: '1rem',
                ...getEntranceStyle(0),
              }}
            >
              {title ? (
                <h2
                  style={{
                    ...titleStyle,
                    margin: 0,
                    textTransform: titleStyle.textTransform || 'uppercase',
                    letterSpacing: titleStyle.letterSpacing || '0.04em',
                  }}
                >
                  {title}
                </h2>
              ) : null}
              {subtitle ? (
                <p
                  style={{
                    ...subtitleStyle,
                    margin: 0,
                    opacity: 0.72,
                    textTransform: 'uppercase',
                    letterSpacing: '0.12em',
                  }}
                >
                  {subtitle}
                </p>
              ) : null}
              {description ? (
                <p style={{ ...bodyStyle, margin: 0, opacity: 0.82 }}>{description}</p>
              ) : null}
              {renderGoogleCta({
                label: 'Rate Us On Google',
                variant: 'outline',
              })}
            </div>

              <div
                style={{
                  ...layoutFrameStyle,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: sectionGap,
                  ...getEntranceStyle(1),
                }}
              >
                <div style={{ overflow: 'hidden', width: '100%', maxWidth: '100%', minWidth: 0 }}>
                  <div
                    style={{
                      display: 'flex',
                      width: '100%',
                      minWidth: 0,
                      gap: `${stripGapPx}px`,
                      alignItems: 'stretch',
                      transition: 'transform 420ms ease',
                      transform: `translateX(calc(-${safeCurrentSlide} * (${stripCardWidth} + ${stripGapPx}px)))`,
                    }}
                  >
                    {displayReviews.map((review, index) => (
                      <div
                        key={review.review_id}
                        style={{
                          flex: `0 0 ${stripCardWidth}`,
                          display: 'flex',
                          minWidth: 0,
                          maxWidth: '100%',
                          ...getEntranceStyle(index),
                        }}
                      >
                        {renderEditorialReviewCard(review)}
                      </div>
                    ))}
                  </div>
                </div>

                {displayReviews.length > stripVisibleCount ? (
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: isPreviewMobile ? 'center' : 'flex-end',
                      alignItems: 'center',
                      gap: isPreviewMobile ? '0.8rem' : '1rem',
                    }}
                  >
                    {renderNavigationButton('prev', () => setCurrentSlide((prev) => Math.max(0, prev - 1)), !canGoPrev)}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.45rem',
                      }}
                    >
                      <span
                        style={{
                          width: isPreviewMobile ? '4rem' : '4.8rem',
                          height: '8px',
                          borderRadius: '999px',
                          background: reviewAccent.solid,
                        }}
                      />
                      {Array.from({
                        length: Math.max(1, displayReviews.length - stripVisibleCount + 1),
                      }).map((_, index) => (
                        <span
                          key={`grid-progress-${index}`}
                          style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '999px',
                            background:
                              index === safeCurrentSlide
                                ? reviewAccent.progressSoft
                                : 'rgba(226, 232, 240, 0.95)',
                          }}
                        />
                      ))}
                    </div>
                    {renderNavigationButton(
                      'next',
                      () => setCurrentSlide((prev) => Math.min(layoutMaxStart, prev + 1)),
                      !canGoNext,
                    )}
                  </div>
                ) : null}
              </div>
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: sectionGap,
              width: '100%',
              maxWidth: '100%',
              minWidth: 0,
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: '1rem',
                ...getEntranceStyle(0),
              }}
            >
              {title ? <h2 style={{ ...titleStyle, margin: 0 }}>{title}</h2> : null}
              {subtitle ? (
                <p
                  style={{
                    ...subtitleStyle,
                    margin: 0,
                    opacity: 0.76,
                  }}
                >
                  {subtitle}
                </p>
              ) : null}
              {description ? (
                <p style={{ ...bodyStyle, margin: 0, opacity: 0.84 }}>{description}</p>
              ) : null}
              {renderGoogleCta({
                label: 'Rate Us On Google',
                variant: 'outline',
              })}
            </div>

            <div
              style={{
                ...layoutFrameStyle,
                position: 'relative',
                ...getEntranceStyle(1),
              }}
            >
              {!isPreviewMobile && displayReviews.length > cardRailVisibleCount ? (
                <div
                  style={{
                    position: 'absolute',
                    left: '-18px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    zIndex: 2,
                  }}
                >
                  {renderNavigationButton('prev', () => setCurrentSlide((prev) => Math.max(0, prev - 1)), !canGoPrev)}
                </div>
              ) : null}

              {!isPreviewMobile && displayReviews.length > cardRailVisibleCount ? (
                <div
                  style={{
                    position: 'absolute',
                    right: '-18px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    zIndex: 2,
                  }}
                >
                  {renderNavigationButton(
                    'next',
                    () => setCurrentSlide((prev) => Math.min(layoutMaxStart, prev + 1)),
                    !canGoNext,
                  )}
                </div>
              ) : null}

              <div style={{ overflow: 'hidden', width: '100%', maxWidth: '100%', minWidth: 0 }}>
                <div
                  style={{
                    display: 'flex',
                    width: '100%',
                    minWidth: 0,
                    gap: `${cardRailGapPx}px`,
                    transition: 'transform 420ms ease',
                    transform: `translateX(calc(-${safeCurrentSlide} * (${cardRailWidth} + ${cardRailGapPx}px)))`,
                  }}
                >
                  {displayReviews.map((review, index) => (
                    <div
                      key={review.review_id}
                      style={{
                        flex: `0 0 ${cardRailWidth}`,
                        minWidth: 0,
                        maxWidth: '100%',
                        ...getEntranceStyle(index),
                      }}
                    >
                      {renderCardRailReview(review)}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {isPreviewMobile && displayReviews.length > cardRailVisibleCount ? (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  gap: '1rem',
                }}
              >
                {renderNavigationButton('prev', () => setCurrentSlide((prev) => Math.max(0, prev - 1)), !canGoPrev)}
                {renderNavigationButton(
                  'next',
                  () => setCurrentSlide((prev) => Math.min(layoutMaxStart, prev + 1)),
                  !canGoNext,
                )}
              </div>
            ) : null}
          </div>
        )}
      </div>

      {isModalOpen && typeof document !== 'undefined'
        ? createPortal(
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
                padding: 'clamp(0.75rem, 2vw, 1.25rem)',
                overflowY: 'auto',
                boxSizing: 'border-box',
                zIndex: 1100,
              }}
              onClick={closeModal}
            >
              <div
                style={{
                  width: modalWidth,
                  maxWidth: '100%',
                  maxHeight: 'calc(100vh - 1.5rem)',
                  overflowY: 'auto',
                  boxSizing: 'border-box',
                  borderRadius: '20px',
                  background: '#ffffff',
                  padding: 'clamp(1rem, 2vw, 1.25rem)',
                  boxShadow: '0 24px 60px rgba(15, 23, 42, 0.35)',
                }}
                onClick={(event) => event.stopPropagation()}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: '0.75rem',
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
                      flexShrink: 0,
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
                        gridTemplateColumns: 'repeat(auto-fit, minmax(5.5rem, 1fr))',
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
                            minHeight: '3.15rem',
                            boxSizing: 'border-box',
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
                        style={modalFieldStyle}
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
                            ...modalFieldStyle,
                            padding: '0.55rem 0.75rem',
                            background: '#ffffff',
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            flexWrap: 'wrap',
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
                        style={modalFieldStyle}
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
                          ...modalFieldStyle,
                          resize: 'vertical',
                        }}
                      />
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        flexWrap: 'wrap',
                        gap: '0.5rem',
                      }}
                    >
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
            </div>,
            document.body,
          )
        : null}
    </section>
  );
}
