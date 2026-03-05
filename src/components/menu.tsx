/**
 * Menu Component
 *
 * Displays menu items with different layout options
 */

'use client';

import React from 'react';
import type { MenuConfig } from '@/types/menu.types';
import styles from './menu.module.css';
import { useGlobalStyleConfig } from '@/hooks/use-global-style-config';
import {
  getSectionTypographyStyles,
  getSelectedGlobalButtonStyle,
  getButtonInlineStyle,
} from '@/lib/section-style';

interface MenuProps extends Partial<MenuConfig> {
  className?: string;
}

export default function Menu({
  restaurant_id,
  title = 'Our Menu',
  subtitle,
  description,
  categories = [],
  ctaButton,
  layout = 'grid',
  bgColor = '#ffffff',
  textColor = '#000000',
  accentColor = '#3b82f6',
  cardBgColor = '#f9fafb',
  showPrices = true,
  showImages = true,
  showDescriptions = true,
  showDietaryInfo = false,
  textAlign = 'center',
  className,
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
  bodyColor,
}: MenuProps) {
  const globalStyleEndpoint = restaurant_id
    ? `/api/global-style-config?restaurant_id=${encodeURIComponent(restaurant_id)}`
    : '/api/global-style-config';
  const { config: globalStyles } = useGlobalStyleConfig({
    apiEndpoint: globalStyleEndpoint,
    fetchOnMount: Boolean(restaurant_id),
  });
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
    bodyColor,
  };
  const { titleStyle, subtitleStyle, bodyStyle } = getSectionTypographyStyles(
    sectionStyleConfig,
    globalStyles,
  );
  const ctaButtonStyle = getButtonInlineStyle(
    getSelectedGlobalButtonStyle(sectionStyleConfig, globalStyles),
  );

  const containerStyle = {
    backgroundColor: bgColor,
    ...bodyStyle,
  };

  const renderMenuItem = (item: any, index: number) => (
    <div key={index} className={styles.menuItem} style={{ backgroundColor: cardBgColor }}>
      {showImages && item.image && (
        <div className={styles.menuItemImage}>
          <img src={item.image} alt={item.name} />
        </div>
      )}
      <div className={styles.menuItemContent}>
        <div className={styles.menuItemHeader}>
          <h4 className={styles.menuItemName} style={{ color: textColor }}>
            {item.name}
          </h4>
          {showPrices && item.price && (
            <span className={styles.menuItemPrice} style={{ color: accentColor }}>
              ${item.price}
            </span>
          )}
        </div>
        {showDescriptions && item.description && (
          <p className={styles.menuItemDescription} style={{ color: textColor, opacity: 0.8 }}>
            {item.description}
          </p>
        )}
        {showDietaryInfo && item.dietary && item.dietary.length > 0 && (
          <div className={styles.menuItemDietary}>
            {item.dietary.map((diet: string, i: number) => (
              <span key={i} className={styles.dietaryBadge} style={{ borderColor: accentColor, color: accentColor }}>
                {diet}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderCategory = (category: any, categoryIndex: number) => {
    if (!category.items || category.items.length === 0) return null;

    return (
      <div key={categoryIndex} className={styles.menuCategory}>
        <div className={styles.categoryHeader}>
          {category.icon && <span className={styles.categoryIcon}>{category.icon}</span>}
          <h3 className={styles.categoryName} style={{ color: textColor }}>
            {category.name}
          </h3>
        </div>
        {category.description && (
          <p className={styles.categoryDescription} style={{ color: textColor, opacity: 0.7 }}>
            {category.description}
          </p>
        )}
        <div className={`${styles.categoryItems} ${styles[`layout-${layout}`]}`}>
          {category.items.map((item: any, index: number) => renderMenuItem(item, index))}
        </div>
      </div>
    );
  };

  return (
    <section className={`${styles.menuSection} ${className || ''}`} style={containerStyle}>
      <div className={styles.menuContainer}>
        {/* Header */}
        <div className={styles.menuHeader} style={{ textAlign }}>
          {title && (
            <h2 className={styles.menuTitle} style={titleStyle}>
              {title}
            </h2>
          )}
          {subtitle && (
            <p className={styles.menuSubtitle} style={{ opacity: 0.8, ...subtitleStyle }}>
              {subtitle}
            </p>
          )}
          {description && (
            <p className={styles.menuDescription} style={{ opacity: 0.7, ...bodyStyle }}>
              {description}
            </p>
          )}
        </div>

        {/* Categories */}
        {categories && categories.length > 0 ? (
          <div className={styles.menuCategories}>
            {categories.map((category, index) => renderCategory(category, index))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <p style={{ color: textColor, opacity: 0.6 }}>No menu items available.</p>
          </div>
        )}

        {/* CTA Button */}
        {ctaButton && ctaButton.label && (
          <div className={styles.menuCta}>
            <a
              href={ctaButton.href}
              className={styles.ctaButton}
              style={{
                ...ctaButtonStyle,
                backgroundColor:
                  ctaButtonStyle.backgroundColor ||
                  ctaButton.bgColor ||
                  accentColor,
                color: ctaButtonStyle.color || ctaButton.textColor || '#ffffff',
                borderColor: ctaButtonStyle.borderColor || ctaButton.borderColor || 'transparent',
              }}
            >
              {ctaButton.label}
            </a>
          </div>
        )}
      </div>
    </section>
  );
}
