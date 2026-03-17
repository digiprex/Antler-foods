'use client';

import type { CSSProperties, ReactNode } from 'react';
import type {
  CustomSectionButton,
  CustomSectionConfig,
  CustomSectionImage,
  CustomSectionItem,
  CustomSectionMediaShape,
} from '@/types/custom-section.types';

export function getShapeRadius(
  shape: CustomSectionMediaShape | undefined,
  fallback = '0',
) {
  switch (shape) {
    case 'circle':
      return '999px';
    case 'arched':
      return '2.5rem';
    case 'rounded':
      return '0.5rem';
    case 'soft':
    default:
      return fallback;
  }
}

export function CustomSectionMedia({
  image,
  label,
  aspectRatio,
  shape,
  accentColor,
  borderColor,
  overlay,
  fit = 'cover',
  className = '',
}: {
  image?: CustomSectionImage;
  label: string;
  aspectRatio?: string;
  shape?: CustomSectionMediaShape;
  accentColor: string;
  borderColor: string;
  overlay?: ReactNode;
  fit?: 'cover' | 'contain';
  className?: string;
}) {
  const radius = getShapeRadius(shape);
  const style: CSSProperties = {
    aspectRatio: aspectRatio || '4 / 3',
    borderRadius: radius,
    border: `1px solid ${borderColor}`,
  };

  return (
    <div
      className={`relative overflow-hidden bg-slate-100 ${className}`}
      style={style}
    >
      {image?.url ? (
        <img
          src={image.url}
          alt={image.alt || label}
          className={`h-full w-full ${fit === 'contain' ? 'object-contain' : 'object-cover'}`}
        />
      ) : (
        <div
          className="flex h-full w-full items-end bg-gradient-to-br from-white via-slate-50 to-slate-100 p-5"
          style={{
            backgroundImage: `linear-gradient(135deg, ${accentColor}22, rgba(248,250,252,0.96))`,
          }}
        >
          <span className="rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm">
            {label}
          </span>
        </div>
      )}
      {overlay}
    </div>
  );
}

function Button({
  button,
  fallbackStyle,
}: {
  button: CustomSectionButton;
  fallbackStyle: {
    backgroundColor: string;
    color: string;
    borderColor: string;
  };
}) {
  const variant = button.variant || 'primary';
  const backgroundColor =
    button.bgColor ||
    (variant === 'outline' || variant === 'ghost'
      ? 'transparent'
      : fallbackStyle.backgroundColor);
  const color =
    button.textColor ||
    (variant === 'outline' || variant === 'ghost'
      ? fallbackStyle.borderColor
      : fallbackStyle.color);
  const borderColor = button.borderColor || fallbackStyle.borderColor;

  return (
    <a
      href={button.href || '#'}
      className={`inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-semibold transition-all ${
        variant === 'ghost'
          ? 'hover:bg-slate-900/[0.06]'
          : 'hover:-translate-y-0.5 hover:shadow-lg'
      }`}
      style={{
        backgroundColor,
        color,
        border:
          variant === 'ghost'
            ? '1px solid transparent'
            : `1px solid ${borderColor}`,
      }}
    >
      {button.label}
    </a>
  );
}

export function CustomSectionButtons({
  primaryButton,
  secondaryButton,
  buttonStyles,
  align = 'left',
}: {
  primaryButton?: CustomSectionButton;
  secondaryButton?: CustomSectionButton;
  buttonStyles: {
    primary: { backgroundColor: string; color: string; borderColor: string };
    secondary: { backgroundColor: string; color: string; borderColor: string };
  };
  align?: 'left' | 'center' | 'right';
}) {
  if (!primaryButton?.label && !secondaryButton?.label) {
    return null;
  }

  const justify =
    align === 'center'
      ? 'justify-center'
      : align === 'right'
        ? 'justify-end'
        : 'justify-start';

  return (
    <div className={`mt-6 flex flex-wrap gap-3 ${justify}`}>
      {primaryButton?.label ? (
        <Button button={primaryButton} fallbackStyle={buttonStyles.primary} />
      ) : null}
      {secondaryButton?.label ? (
        <Button
          button={secondaryButton}
          fallbackStyle={buttonStyles.secondary}
        />
      ) : null}
    </div>
  );
}

export function CustomSectionIntro({
  config,
  align,
  badgeStyle,
  eyebrowStyle,
  titleStyle,
  subtitleStyle,
  bodyStyle,
  buttonStyles,
  hideEyebrow = false,
  hideBadge = false,
  order = 'default',
}: {
  config: CustomSectionConfig;
  align: 'left' | 'center' | 'right';
  badgeStyle: CSSProperties;
  eyebrowStyle: CSSProperties;
  titleStyle: CSSProperties;
  subtitleStyle: CSSProperties;
  bodyStyle: CSSProperties;
  buttonStyles: {
    primary: { backgroundColor: string; color: string; borderColor: string };
    secondary: { backgroundColor: string; color: string; borderColor: string };
  };
  hideEyebrow?: boolean;
  hideBadge?: boolean;
  order?: 'default' | 'subheadline-first';
}) {
  const alignment =
    align === 'center'
      ? 'items-center text-center'
      : align === 'right'
        ? 'items-end text-right'
        : 'items-start text-left';
  const showBadge = Boolean(config.badgeText) && !hideBadge;
  const showEyebrow = Boolean(config.eyebrow) && !hideEyebrow;
  const renderHeadline = (
    <h2 className="text-balance" style={titleStyle}>
      {config.headline}
    </h2>
  );
  const renderSubheadline = config.subheadline ? (
    <p
      className={order === 'subheadline-first' ? 'mb-3 text-balance' : 'mt-3 text-balance'}
      style={subtitleStyle}
    >
      {config.subheadline}
    </p>
  ) : null;
  const renderDescription = config.description ? (
    <p className="mt-4 text-pretty" style={bodyStyle}>
      {config.description}
    </p>
  ) : null;

  return (
    <div className={`flex flex-col ${alignment}`}>
      {showBadge ? (
        <span
          className="mb-3 inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]"
          style={badgeStyle}
        >
          {config.badgeText}
        </span>
      ) : null}
      {showEyebrow ? (
        <p
          className="mb-3 text-sm font-semibold uppercase tracking-[0.22em]"
          style={eyebrowStyle}
        >
          {config.eyebrow}
        </p>
      ) : null}
      {order === 'subheadline-first' ? (
        <>
          {renderSubheadline}
          {renderHeadline}
        </>
      ) : (
        <>
          {renderHeadline}
          {renderSubheadline}
        </>
      )}
      {renderDescription}
      <CustomSectionButtons
        primaryButton={
          config.primaryButtonEnabled === false ? undefined : config.primaryButton
        }
        secondaryButton={
          config.secondaryButtonEnabled === false
            ? undefined
            : config.secondaryButton
        }
        buttonStyles={buttonStyles}
        align={align}
      />
    </div>
  );
}

export function CustomSectionItemCard({
  item,
  accentColor,
  borderColor,
  backgroundColor,
  radius,
  shadow,
  titleStyle,
  bodyStyle,
  showMedia = true,
  showBorder = true,
  showMeta = false,
}: {
  item: CustomSectionItem;
  accentColor: string;
  borderColor: string;
  backgroundColor: string;
  radius: string;
  shadow: string;
  titleStyle: CSSProperties;
  bodyStyle: CSSProperties;
  showMedia?: boolean;
  showBorder?: boolean;
  showMeta?: boolean;
}) {
  return (
    <div
      className={`flex h-full flex-col gap-4 p-5 ${showBorder ? 'border' : ''}`}
      style={{
        backgroundColor,
        borderColor: showBorder ? borderColor : 'transparent',
        borderRadius: radius,
        boxShadow: showBorder ? shadow : 'none',
      }}
    >
      {showMedia && item.image ? (
        <CustomSectionMedia
          image={item.image}
          label={item.title}
          aspectRatio="4 / 3"
          shape="soft"
          accentColor={accentColor}
          borderColor={borderColor}
        />
      ) : null}
      {showMeta ? (
        <div className="flex items-center justify-between gap-3">
          {item.badge ? (
            <span
              className="inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]"
              style={{ backgroundColor: `${accentColor}18`, color: accentColor }}
            >
              {item.badge}
            </span>
          ) : null}
          {item.statValue ? (
            <span
              className="text-xs font-semibold uppercase tracking-[0.18em]"
              style={{ color: accentColor }}
            >
              {item.statValue}{' '}
              {item.statLabel ? (
                <span className="text-slate-500">{item.statLabel}</span>
              ) : null}
            </span>
          ) : null}
        </div>
      ) : null}
      {item.eyebrow ? (
        <p
          className="text-xs font-semibold uppercase tracking-[0.18em]"
          style={{ color: accentColor }}
        >
          {item.eyebrow}
        </p>
      ) : null}
      <h3 style={titleStyle}>{item.title}</h3>
      {item.description ? <p style={bodyStyle}>{item.description}</p> : null}
      {item.ctaLabel ? (
        <a
          href={item.ctaHref || '#'}
          className="mt-auto text-sm font-semibold"
          style={{ color: accentColor }}
        >
          {item.ctaLabel}
        </a>
      ) : null}
    </div>
  );
}
