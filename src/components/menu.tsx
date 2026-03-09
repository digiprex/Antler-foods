/**
 * Menu Component
 *
 * Displays menu items with different layout options.
 */

'use client';

import React, { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { MenuButton, MenuCategory, MenuConfig, MenuItem } from '@/types/menu.types';
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

interface PreparedMenuItem extends MenuItem {
  categoryName: string;
  categoryDescription?: string;
  categoryIcon?: string;
}

const PRESET_CATEGORY_SYMBOLS = ['M', 'S', 'F', 'D'];

function joinClasses(...classNames: Array<string | false | null | undefined>) {
  return classNames.filter(Boolean).join(' ');
}

function formatPrice(value?: string) {
  if (!value) return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  if (/^[\d.,]+$/.test(trimmed)) {
    return `$${trimmed}`;
  }

  return trimmed;
}

function getItemIdentifier(item: MenuItem) {
  return item.id ? `id:${item.id}` : `name:${item.name}`;
}

function withFeaturedFlags(
  categories: MenuCategory[] | undefined,
  featuredItems: MenuItem[] | undefined,
) {
  const featuredKeys = new Set((featuredItems || []).map(getItemIdentifier));

  return (categories || []).map((category) => ({
    ...category,
    items: (category.items || []).map((item) => ({
      ...item,
      featured: item.featured || featuredKeys.has(getItemIdentifier(item)),
    })),
  }));
}

function buildPreparedCategories(
  categories: MenuCategory[] | undefined,
  featuredItems: MenuItem[] | undefined,
  title: string,
  options?: {
    preserveEmptyCategories?: boolean;
  },
) {
  const hydratedCategories = withFeaturedFlags(categories, featuredItems);

  if (options?.preserveEmptyCategories) {
    return hydratedCategories.filter(
      (category) =>
        Boolean(category.name?.trim()) ||
        Boolean(category.description?.trim()) ||
        Boolean(category.icon?.trim()) ||
        (category.items || []).length > 0,
    );
  }

  const populatedCategories = hydratedCategories.filter(
    (category) => (category.items || []).length > 0,
  );

  if (populatedCategories.length > 0) {
    return populatedCategories;
  }

  if ((featuredItems || []).length > 0) {
    return [
      {
        name: title || 'Featured Menu',
        description: 'Highlighted items from your menu',
        items: featuredItems,
      },
    ] satisfies MenuCategory[];
  }

  return [] as MenuCategory[];
}

function prepareItems(categories: MenuCategory[]) {
  return categories.flatMap((category) =>
    (category.items || []).map(
      (item): PreparedMenuItem => ({
        ...item,
        categoryName: item.category || category.name,
        categoryDescription: category.description,
        categoryIcon: category.icon,
      }),
    ),
  );
}

function buildFeaturedItems(
  featuredItems: MenuItem[] | undefined,
  allItems: PreparedMenuItem[],
) {
  if ((featuredItems || []).length > 0) {
    return featuredItems!.map((item) => {
      const matched = allItems.find(
        (candidate) =>
          (item.id && candidate.id === item.id) ||
          (!item.id && candidate.name === item.name),
      );

      return (
        matched || {
          ...item,
          categoryName: item.category || 'Featured',
          categoryDescription: undefined,
          categoryIcon: undefined,
        }
      );
    });
  }

  const flaggedItems = allItems.filter((item) => item.featured);
  return flaggedItems.length > 0 ? flaggedItems : allItems;
}

function hasRenderableItemContent(item: MenuItem) {
  return Boolean(
    item.name?.trim() ||
      item.description?.trim() ||
      item.image ||
      item.ctaLabel?.trim() ||
      item.ctaLink?.trim(),
  );
}

function buildDirectLayoutItems(
  layoutItems: MenuItem[] | undefined,
  title: string,
) {
  return (layoutItems || [])
    .filter(hasRenderableItemContent)
    .map(
      (item, index): PreparedMenuItem => ({
        ...item,
        name: item.name?.trim() || `Menu ${index + 1}`,
        categoryName: item.category || title || 'Menu Highlights',
        categoryDescription: undefined,
        categoryIcon: undefined,
      }),
    );
}

function getFallbackSymbol(item: PreparedMenuItem, index: number) {
  if (item.categoryIcon?.trim()) {
    return item.categoryIcon.trim().slice(0, 2);
  }

  const firstLetter = item.name?.trim().charAt(0);
  return firstLetter || PRESET_CATEGORY_SYMBOLS[index % PRESET_CATEGORY_SYMBOLS.length];
}

function resolveItemMedia(
  item: PreparedMenuItem,
  headerImage?: string,
  backgroundImage?: string,
) {
  return item.image || item.backgroundImage || headerImage || backgroundImage;
}

function buildCardAction(item: PreparedMenuItem, ctaButton?: MenuButton) {
  const label = item.ctaLabel || ctaButton?.label || '';
  const href = item.ctaLink || ctaButton?.href || '#menu';

  if (!label) {
    return null;
  }

  return { label, href };
}

export default function Menu({
  restaurant_id,
  title = 'Our Menu',
  subtitle,
  description,
  categories = [],
  featuredItems = [],
  layoutItems = [],
  ctaButton,
  headerImage,
  backgroundImage,
  layout = 'grid',
  bgColor = '#ffffff',
  textColor = '#000000',
  accentColor = '#3b82f6',
  cardBgColor = '#f9fafb',
  overlayColor = '#0f172a',
  overlayOpacity = 0.52,
  showPrices = true,
  showImages = true,
  showDescriptions = true,
  showDietaryInfo = false,
  showCategoryIcons = false,
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

  const categoryDrivenLayout = layout === 'tabs' || layout === 'accordion';
  const preparedCategories = buildPreparedCategories(
    categories,
    featuredItems,
    title || 'Our Menu',
    { preserveEmptyCategories: categoryDrivenLayout },
  );
  const preparedItems = prepareItems(preparedCategories);
  const spotlightItems = buildFeaturedItems(featuredItems, preparedItems);
  const preparedLayoutItems = buildDirectLayoutItems(layoutItems, title || 'Our Menu');
  const highlightedItems = spotlightItems.slice(0, 8);
  const directItems = preparedLayoutItems.length > 0 ? preparedLayoutItems : preparedItems;
  const spotlightDirectItems =
    preparedLayoutItems.length > 0 ? preparedLayoutItems : highlightedItems;

  const [activeCategoryIndex, setActiveCategoryIndex] = useState(0);
  const [expandedCategoryIndex, setExpandedCategoryIndex] = useState(0);
  const carouselTrackRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (activeCategoryIndex >= preparedCategories.length) {
      setActiveCategoryIndex(0);
    }
  }, [activeCategoryIndex, preparedCategories.length]);

  useEffect(() => {
    if (expandedCategoryIndex >= preparedCategories.length) {
      setExpandedCategoryIndex(0);
    }
  }, [expandedCategoryIndex, preparedCategories.length]);

  const activeCategory =
    preparedCategories[activeCategoryIndex] || preparedCategories[0] || null;

  const containerStyle: CSSProperties = {
    backgroundColor: bgColor,
    ...bodyStyle,
    ['--menu-accent' as string]: accentColor,
    ['--menu-card-bg' as string]: cardBgColor,
    ['--menu-text' as string]: textColor,
    ['--menu-body' as string]: bodyColor || textColor,
  };

  const globalButtonInlineStyle: CSSProperties = {
    ...ctaButtonStyle,
    backgroundColor:
      ctaButtonStyle.backgroundColor || ctaButton?.bgColor || accentColor,
    color: ctaButtonStyle.color || ctaButton?.textColor || '#ffffff',
    borderColor:
      ctaButtonStyle.borderColor || ctaButton?.borderColor || 'transparent',
  };

  const cardButtonInlineStyle: CSSProperties = {
    color: accentColor,
    borderColor: accentColor,
    backgroundColor: '#ffffff',
  };

  const backdropOverlayOpacity = backgroundImage
    ? Math.max(0.16, Math.min(overlayOpacity ?? 0.52, 0.85))
    : 0;

  const scrollCarousel = (direction: 'prev' | 'next') => {
    if (!carouselTrackRef.current) return;

    carouselTrackRef.current.scrollBy({
      left: direction === 'next' ? 340 : -340,
      behavior: 'smooth',
    });
  };

  const renderPrice = (item: PreparedMenuItem) => {
    if (!showPrices) return null;

    const price = formatPrice(item.price);
    if (!price) return null;

    return (
      <span className={styles.cardPrice} style={{ color: accentColor }}>
        {price}
      </span>
    );
  };

  const renderDietary = (item: PreparedMenuItem) => {
    if (!showDietaryInfo || !item.dietary?.length) return null;

    return (
      <div className={styles.cardDietary}>
        {item.dietary.map((diet) => (
          <span
            key={`${item.name}-${diet}`}
            className={styles.dietaryBadge}
            style={{ borderColor: accentColor, color: accentColor }}
          >
            {diet}
          </span>
        ))}
      </div>
    );
  };

  const renderCardAction = (
    item: PreparedMenuItem,
    variant: 'outline' | 'solid' = 'outline',
  ) => {
    const action = buildCardAction(item, ctaButton);
    if (!action) return null;

    return (
      <a
        href={action.href}
        className={joinClasses(
          styles.itemButton,
          variant === 'solid' ? styles.itemButtonSolid : styles.itemButtonOutline,
        )}
        style={variant === 'solid' ? globalButtonInlineStyle : cardButtonInlineStyle}
      >
        {action.label}
      </a>
    );
  };

  const renderSymbol = (item: PreparedMenuItem, index: number) => {
    const media = showImages ? resolveItemMedia(item, headerImage, backgroundImage) : undefined;

    if (media) {
      return (
        <div className={styles.featureThumb}>
          <img src={media} alt={item.name} />
        </div>
      );
    }

    return <div className={styles.featureIcon}>{getFallbackSymbol(item, index)}</div>;
  };

  const renderImageCard = (
    item: PreparedMenuItem,
    index: number,
    options?: { overlay?: boolean; compact?: boolean; centered?: boolean },
  ) => {
    const media = showImages ? resolveItemMedia(item, headerImage, backgroundImage) : undefined;
    const mediaHref = item.imageLink?.trim();
    const mediaContent = media ? (
      <img src={media} alt={item.name} />
    ) : (
      <div className={styles.cardPlaceholder}>
        <span>{getFallbackSymbol(item, index)}</span>
      </div>
    );

    return (
      <article
        key={`${item.categoryName}-${item.name}-${index}`}
        className={joinClasses(
          styles.imageCard,
          options?.overlay && styles.imageCardOverlay,
          options?.compact && styles.imageCardCompact,
          options?.centered && styles.imageCardCentered,
        )}
        style={{ backgroundColor: cardBgColor }}
      >
        <div className={styles.cardMedia}>
          {mediaHref ? (
            <a href={mediaHref} className={styles.cardMediaLink} aria-label={`Open ${item.name}`}>
              {mediaContent}
              {options?.overlay ? <div className={styles.cardScrim} /> : null}
            </a>
          ) : (
            <>
              {mediaContent}
              {options?.overlay ? <div className={styles.cardScrim} /> : null}
            </>
          )}
        </div>
        <div
          className={joinClasses(
            styles.cardBody,
            options?.overlay && styles.cardBodyOverlay,
          )}
        >
          <div className={styles.cardEyebrow}>
            {showCategoryIcons && item.categoryIcon
              ? `${item.categoryIcon} ${item.categoryName}`
              : item.categoryName}
          </div>
          <div className={styles.cardTitleRow}>
            <h3 className={styles.cardTitle} style={{ color: textColor }}>
              {item.name}
            </h3>
            {renderPrice(item)}
          </div>
          {showDescriptions && item.description ? (
            <p className={styles.cardDescription} style={{ color: textColor }}>
              {item.description}
            </p>
          ) : null}
          {renderDietary(item)}
          {renderCardAction(item)}
        </div>
      </article>
    );
  };

  const renderPromoCard = (item: PreparedMenuItem, index: number) => (
    <article
      key={`${item.categoryName}-${item.name}-${index}`}
      className={styles.promoCard}
      style={{ backgroundColor: accentColor }}
    >
      <div className={styles.cardEyebrow} style={{ color: 'rgba(255,255,255,0.86)' }}>
        {item.categoryName}
      </div>
      <h3 className={styles.promoTitle}>{item.name}</h3>
      {showDescriptions && item.description ? (
        <p className={styles.promoDescription}>{item.description}</p>
      ) : null}
      {renderCardAction(item, 'solid')}
    </article>
  );

  const renderCategoryBlock = (
    category: MenuCategory,
    items: PreparedMenuItem[],
    itemsClassName: string,
    renderer: (item: PreparedMenuItem, index: number) => React.ReactNode,
    showCategoryHeader = preparedCategories.length > 1,
  ) => (
    <section key={category.name} className={styles.menuCategory}>
      {showCategoryHeader ? (
        <div className={styles.categoryHeader}>
          <div>
            <div className={styles.cardEyebrow}>
              {showCategoryIcons && category.icon ? `${category.icon} Menu Category` : 'Menu Category'}
            </div>
            <h3 className={styles.categoryName} style={{ color: textColor }}>
              {category.name}
            </h3>
            {category.description ? (
              <p className={styles.categoryDescription} style={{ color: textColor }}>
                {category.description}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
      <div className={itemsClassName}>{items.map(renderer)}</div>
    </section>
  );

  const renderGridLayouts = (
    itemsClassName: string,
    rendererOptions?: Parameters<typeof renderImageCard>[2],
  ) =>
    preparedCategories.map((category) =>
      renderCategoryBlock(
        category,
        (category.items || []).map(
          (item): PreparedMenuItem => ({
            ...item,
            categoryName: item.category || category.name,
            categoryDescription: category.description,
            categoryIcon: category.icon,
          }),
        ),
        itemsClassName,
        (item, index) => renderImageCard(item, index, rendererOptions),
      ),
    );

  const renderLayoutContent = () => {
    switch (layout) {
      case 'list':
        if (preparedLayoutItems.length > 0) {
          return (
            <div className={styles.layoutBody}>
              <div className={styles.promoGrid}>
                {directItems.map(renderPromoCard)}
              </div>
            </div>
          );
        }
        return (
          <div className={styles.layoutBody}>
            {preparedCategories.map((category) =>
              renderCategoryBlock(
                category,
                (category.items || []).map(
                  (item): PreparedMenuItem => ({
                    ...item,
                    categoryName: item.category || category.name,
                    categoryDescription: category.description,
                    categoryIcon: category.icon,
                  }),
                ),
                styles.promoGrid,
                renderPromoCard,
              ),
            )}
          </div>
        );

      case 'masonry':
        if (preparedLayoutItems.length > 0) {
          return (
            <div className={styles.layoutBody}>
              <div className={styles.twoColumnGrid}>
                {directItems.map((item, index) => renderImageCard(item, index))}
              </div>
            </div>
          );
        }
        return (
          <div className={styles.layoutBody}>
            {preparedCategories.map((category) =>
              renderCategoryBlock(
                category,
                (category.items || []).map(
                  (item): PreparedMenuItem => ({
                    ...item,
                    categoryName: item.category || category.name,
                    categoryDescription: category.description,
                    categoryIcon: category.icon,
                  }),
                ),
                styles.masonryGrid,
                (item, index) => renderImageCard(item, index, { overlay: true }),
              ),
            )}
          </div>
        );

      case 'carousel':
        return (
          <div className={styles.layoutBody}>
            <div className={styles.carouselShell}>
              <div className={styles.carouselIntro}>
                <div className={styles.cardEyebrow}>{subtitle || 'Curated picks'}</div>
                <h3 className={styles.carouselTitle} style={{ color: textColor }}>
                  {title || 'Best menu selections in town'}
                </h3>
                {description ? (
                  <p className={styles.carouselDescription} style={{ color: textColor }}>
                    {description}
                  </p>
                ) : null}
              </div>
              <div className={styles.carouselViewport}>
                <button
                  type="button"
                  className={joinClasses(styles.carouselNav, styles.carouselNavPrev)}
                  onClick={() => scrollCarousel('prev')}
                  aria-label="Scroll previous menu items"
                >
                  {'<'}
                </button>
                <div ref={carouselTrackRef} className={styles.carouselTrack}>
                  {spotlightDirectItems.map((item, index) => {
                    const media =
                      showImages && resolveItemMedia(item, headerImage, backgroundImage);

                    return (
                      <article
                        key={`${item.categoryName}-${item.name}-${index}`}
                        className={styles.carouselCard}
                      >
                        <div className={styles.carouselCardMedia}>
                          {media ? (
                            <img src={media} alt={item.name} />
                          ) : (
                            <div className={styles.cardPlaceholder}>
                              <span>{getFallbackSymbol(item, index)}</span>
                            </div>
                          )}
                          <div className={styles.cardScrim} />
                        </div>
                        <div className={styles.carouselCardBody}>
                          <div className={styles.cardEyebrow}>{item.categoryName}</div>
                          <h3 className={styles.cardTitle} style={{ color: '#ffffff' }}>
                            {item.name}
                          </h3>
                          {showDescriptions && item.description ? (
                            <p className={styles.carouselCardDescription}>{item.description}</p>
                          ) : null}
                          {renderCardAction(item)}
                        </div>
                      </article>
                    );
                  })}
                </div>
                <button
                  type="button"
                  className={joinClasses(styles.carouselNav, styles.carouselNavNext)}
                  onClick={() => scrollCarousel('next')}
                  aria-label="Scroll next menu items"
                >
                  {'>'}
                </button>
              </div>
            </div>
          </div>
        );

      case 'tabs':
        return (
          <div className={styles.layoutBody}>
            <div className={styles.tabShell}>
              <div
                className={styles.tabIntro}
                style={
                  headerImage
                    ? {
                        backgroundImage: `linear-gradient(180deg, rgba(15,23,42,0.32) 0%, rgba(15,23,42,0.78) 100%), url(${headerImage})`,
                      }
                    : undefined
                }
              >
                <div className={styles.tabEyebrow}>
                  {subtitle || 'Order directly from our website'}
                </div>
                <h3 className={styles.tabIntroTitle}>
                  {title || 'Best menu selections in town'}
                </h3>
                <p className={styles.tabIntroDescription}>
                  {description ||
                    'Use categories to highlight different collections and help guests scan faster.'}
                </p>
                {ctaButton?.label ? (
                  <a href={ctaButton.href} className={styles.itemButton} style={globalButtonInlineStyle}>
                    {ctaButton.label}
                  </a>
                ) : null}
              </div>
              <div className={styles.tabSelectors}>
                {preparedCategories.map((category, index) => (
                  <button
                    type="button"
                    key={category.name}
                    className={joinClasses(
                      styles.tabButton,
                      index === activeCategoryIndex && styles.tabButtonActive,
                    )}
                    onClick={() => setActiveCategoryIndex(index)}
                  >
                    <div className={styles.tabButtonCopy}>
                      <span className={styles.tabButtonTitle}>{category.name}</span>
                      <span className={styles.tabButtonDescription}>
                        {category.description ||
                          `${(category.items || []).length} item${(category.items || []).length === 1 ? '' : 's'} available`}
                      </span>
                    </div>
                    <span className={styles.tabButtonArrow}>{'>'}</span>
                  </button>
                ))}
              </div>
            </div>
            {activeCategory ? (
              <div className={styles.tabContent}>
                <div className={styles.tabContentHeader}>
                  <div className={styles.cardEyebrow}>Active Category</div>
                  <h3 className={styles.categoryName} style={{ color: textColor }}>
                    {activeCategory.name}
                  </h3>
                  {activeCategory.description ? (
                    <p className={styles.categoryDescription} style={{ color: textColor }}>
                      {activeCategory.description}
                    </p>
                  ) : null}
                </div>
                <div className={styles.tabItemsGrid}>
                  {(activeCategory.items || []).map((item, index) =>
                    renderImageCard(
                      {
                        ...item,
                        categoryName: item.category || activeCategory.name,
                        categoryDescription: activeCategory.description,
                        categoryIcon: activeCategory.icon,
                      },
                      index,
                    ),
                  )}
                </div>
              </div>
            ) : null}
          </div>
        );

      case 'accordion':
        return (
          <div className={styles.layoutBody}>
            <div className={styles.accordionStack}>
              {preparedCategories.map((category, categoryIndex) => {
                const isOpen = categoryIndex === expandedCategoryIndex;

                return (
                  <article key={category.name} className={styles.accordionPanel}>
                    <button
                      type="button"
                      className={joinClasses(
                        styles.accordionTrigger,
                        isOpen && styles.accordionTriggerActive,
                      )}
                      onClick={() =>
                        setExpandedCategoryIndex(isOpen ? -1 : categoryIndex)
                      }
                    >
                      <div className={styles.accordionTriggerCopy}>
                        <span className={styles.tabButtonTitle}>{category.name}</span>
                        <span className={styles.tabButtonDescription}>
                          {category.description ||
                            `${(category.items || []).length} item${(category.items || []).length === 1 ? '' : 's'} in this group`}
                        </span>
                      </div>
                      <span className={styles.accordionArrow}>{isOpen ? '-' : '+'}</span>
                    </button>
                    {isOpen ? (
                      <div className={styles.accordionBody}>
                        {(category.items || []).map((item, index) => {
                          const preparedItem: PreparedMenuItem = {
                            ...item,
                            categoryName: item.category || category.name,
                            categoryDescription: category.description,
                            categoryIcon: category.icon,
                          };
                          const media =
                            showImages && resolveItemMedia(preparedItem, headerImage, backgroundImage);

                          return (
                            <div
                              key={`${category.name}-${item.name}-${index}`}
                              className={styles.accordionItemRow}
                            >
                              <div className={styles.accordionItemRowMain}>
                                {media ? (
                                  <div className={styles.accordionThumb}>
                                    <img src={media} alt={item.name} />
                                  </div>
                                ) : null}
                                <div>
                                  <h4 className={styles.accordionItemTitle} style={{ color: textColor }}>
                                    {item.name}
                                  </h4>
                                  {showDescriptions && item.description ? (
                                    <p className={styles.accordionItemDescription} style={{ color: textColor }}>
                                      {item.description}
                                    </p>
                                  ) : null}
                                </div>
                              </div>
                              <div className={styles.accordionItemMeta}>
                                {renderPrice(preparedItem)}
                                {renderCardAction(preparedItem)}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </div>
        );

      case 'two-column':
        if (preparedLayoutItems.length > 0) {
          return (
            <div className={styles.layoutBody}>
              <div className={styles.twoColumnGrid}>
                {directItems.map((item, index) => renderImageCard(item, index))}
              </div>
            </div>
          );
        }
        return <div className={styles.layoutBody}>{renderGridLayouts(styles.twoColumnGrid)}</div>;

      case 'single-column':
        if (preparedLayoutItems.length > 0) {
          return (
            <div className={styles.layoutBody}>
              <div className={styles.singleColumnGrid}>
                {directItems.map((item, index) =>
                  renderImageCard(item, index, { centered: true }),
                )}
              </div>
            </div>
          );
        }
        return (
          <div className={styles.layoutBody}>
            {preparedCategories.map((category) =>
              renderCategoryBlock(
                category,
                (category.items || []).map(
                  (item): PreparedMenuItem => ({
                    ...item,
                    categoryName: item.category || category.name,
                    categoryDescription: category.description,
                    categoryIcon: category.icon,
                  }),
                ),
                styles.singleColumnGrid,
                (item, index) => renderImageCard(item, index, { centered: true }),
              ),
            )}
          </div>
        );

      case 'featured-grid':
        return (
          <div className={styles.layoutBody}>
            <div className={styles.featuredIntro}>
              <div className={styles.cardEyebrow}>{subtitle || 'Featured favorites'}</div>
              <h3 className={styles.featuredTitle} style={{ color: textColor }}>
                {title || 'Best menu selections in town'}
              </h3>
            </div>
            <div className={styles.featureGrid}>
              {spotlightDirectItems.slice(0, 3).map((item, index) => (
                <article
                  key={`${item.categoryName}-${item.name}-${index}`}
                  className={styles.featureCard}
                  style={{ backgroundColor: cardBgColor }}
                >
                  {renderSymbol(item, index)}
                  <h3 className={styles.featureTitle} style={{ color: textColor }}>
                    {item.name}
                  </h3>
                  {showDescriptions && item.description ? (
                    <p className={styles.featureDescription} style={{ color: textColor }}>
                      {item.description}
                    </p>
                  ) : null}
                </article>
              ))}
            </div>
          </div>
        );

      case 'minimal':
        return (
          <div className={styles.layoutBody}>
            <div className={styles.minimalGrid}>
              {spotlightDirectItems.slice(0, 3).map((item, index) => (
                <article
                  key={`${item.categoryName}-${item.name}-${index}`}
                  className={styles.minimalCard}
                >
                  {renderSymbol(item, index)}
                  <h3 className={styles.minimalTitle} style={{ color: textColor }}>
                    {item.name}
                  </h3>
                  {showDescriptions && item.description ? (
                    <p className={styles.minimalDescription} style={{ color: textColor }}>
                      {item.description}
                    </p>
                  ) : null}
                </article>
              ))}
            </div>
            <div className={styles.minimalDivider} />
          </div>
        );

      case 'grid':
      default:
        if (preparedLayoutItems.length > 0) {
          return (
            <div className={styles.layoutBody}>
              <div className={styles.twoColumnGrid}>
                {directItems.map((item, index) => renderImageCard(item, index, { overlay: true }))}
              </div>
            </div>
          );
        }
        return <div className={styles.layoutBody}>{renderGridLayouts(styles.gridLayout)}</div>;
    }
  };

  return (
    <section className={joinClasses(styles.menuSection, className)} style={containerStyle}>
      {backgroundImage ? (
        <>
          <div
            className={styles.menuBackdrop}
            style={{ backgroundImage: `url(${backgroundImage})` }}
          />
          <div
            className={styles.menuBackdropOverlay}
            style={{ backgroundColor: overlayColor, opacity: backdropOverlayOpacity }}
          />
        </>
      ) : null}

      <div className={styles.menuContainer}>
        <div
          className={joinClasses(
            styles.menuHeader,
            textAlign === 'left'
              ? styles.alignLeft
              : textAlign === 'right'
                ? styles.alignRight
                : styles.alignCenter,
          )}
        >
          {title ? (
            <h2 className={styles.menuTitle} style={titleStyle}>
              {title}
            </h2>
          ) : null}
          {subtitle ? (
            <p className={styles.menuSubtitle} style={{ ...subtitleStyle, color: subtitleStyle.color || textColor }}>
              {subtitle}
            </p>
          ) : null}
          {description ? (
            <p className={styles.menuDescription} style={{ ...bodyStyle, color: bodyStyle.color || textColor }}>
              {description}
            </p>
          ) : null}
        </div>

        {(categoryDrivenLayout ? preparedCategories.length > 0 : directItems.length > 0) ? (
          renderLayoutContent()
        ) : (
          <div className={styles.emptyState}>
            <p style={{ color: textColor }}>No menu items available.</p>
          </div>
        )}

        {ctaButton?.label && categoryDrivenLayout ? (
          <div className={styles.menuCta}>
            <a href={ctaButton.href} className={styles.ctaButton} style={globalButtonInlineStyle}>
              {ctaButton.label}
            </a>
          </div>
        ) : null}
      </div>
    </section>
  );
}
