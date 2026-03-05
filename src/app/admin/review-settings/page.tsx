/**
 * Review Settings Page
 *
 * Dashboard-integrated interface for configuring review section settings.
 * Access: /admin/review-settings
 */

'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { useState, useEffect } from 'react';
import type { ReviewConfig, Review } from '@/types/review.types';
import { DEFAULT_REVIEW_CONFIG } from '@/types/review.types';
import { useSectionStyleDefaults } from '@/hooks/use-section-style-defaults';
import styles from '@/components/admin/gallery-settings-form.module.css';
import Reviews from '@/components/reviews';

const FONT_FAMILY_OPTIONS = [
  { value: 'Inter, system-ui, sans-serif', label: 'Inter (Default)' },
  { value: 'Poppins, sans-serif', label: 'Poppins' },
  { value: 'Montserrat, sans-serif', label: 'Montserrat' },
  { value: 'Open Sans, sans-serif', label: 'Open Sans' },
  { value: 'Roboto, sans-serif', label: 'Roboto' },
  { value: 'Lato, sans-serif', label: 'Lato' },
  { value: 'Playfair Display, serif', label: 'Playfair Display' },
];

const FONT_SIZE_OPTIONS = [
  { value: '0.875rem', label: 'Small (14px)' },
  { value: '1rem', label: 'Base (16px)' },
  { value: '1.125rem', label: 'Medium (18px)' },
  { value: '1.25rem', label: 'Large (20px)' },
  { value: '1.5rem', label: 'XL (24px)' },
  { value: '1.875rem', label: '2XL (30px)' },
  { value: '2.25rem', label: '3XL (36px)' },
];

const FONT_WEIGHT_OPTIONS = [
  { value: 300, label: 'Light (300)' },
  { value: 400, label: 'Normal (400)' },
  { value: 500, label: 'Medium (500)' },
  { value: 600, label: 'Semi Bold (600)' },
  { value: 700, label: 'Bold (700)' },
  { value: 800, label: 'Extra Bold (800)' },
];

export default function ReviewSettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const restaurantId = searchParams.get('restaurant_id');
  const restaurantName = searchParams.get('restaurant_name');
  const pageId = searchParams.get('page_id');
  
  // Check if this is a new section being created or editing existing
  const isNewSection = searchParams.get('new_section') === 'true';
  const templateId = searchParams.get('template_id') || null;
  const sectionStyleDefaults = useSectionStyleDefaults(restaurantId);

  const [config, setConfig] = useState<ReviewConfig>({
    ...DEFAULT_REVIEW_CONFIG,
    ...sectionStyleDefaults,
  });
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (restaurantId) {
      fetchReviewConfig();
    }
    if (restaurantId) {
      fetchReviews();
    }
  }, [restaurantId, pageId, templateId, isNewSection, sectionStyleDefaults]);

  useEffect(() => {
    if (!isNewSection) return;
    setConfig((prev) => ({
      ...DEFAULT_REVIEW_CONFIG,
      ...sectionStyleDefaults,
      ...prev,
    }));
  }, [isNewSection, sectionStyleDefaults]);

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

  const handleSave = async () => {
    if (!restaurantId) return;

    setSaving(true);
    try {
      const response = await fetch('/api/review-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...config,
          restaurant_id: restaurantId,
          page_id: pageId || null,
          template_id: templateId || null,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setToast({
          message: isNewSection ? 'Review section created successfully!' : 'Review settings saved successfully!',
          type: 'success'
        });
        setTimeout(() => setToast(null), 3000);
      } else {
        setToast({ message: 'Error saving settings: ' + data.error, type: 'error' });
        setTimeout(() => setToast(null), 3000);
      }
    } catch (error) {
      console.error('Error saving review config:', error);
      setToast({ message: 'Error saving settings', type: 'error' });
      setTimeout(() => setToast(null), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleTypographyChange = (field: keyof ReviewConfig, value: string | number) => {
    setConfig((prev) => ({
      ...prev,
      [field]: value,
      is_custom: true,
    }));
  };

  const handleBack = () => {
    const params = new URLSearchParams();
    if (restaurantId) params.set('restaurant_id', restaurantId);
    if (restaurantName) params.set('restaurant_name', restaurantName);
    if (pageId) params.set('page_id', pageId);
    router.push(`/admin/page-settings?${params.toString()}`);
  };

  if (!restaurantId) {
    return (
      <DashboardLayout>
        <div className={styles.emptyState}>
          <div className={styles.emptyStateIcon}>⭐</div>
          <h2 className={styles.emptyStateTitle}>No Restaurant Selected</h2>
          <p className={styles.emptyStateDescription}>
            Please select a restaurant from the dashboard to configure review settings.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className={styles.container}>
        <div className={styles.singleLayout}>
          <div className={styles.formSection}>
            <button
              onClick={handleBack}
              className={`${styles.button} ${styles.secondaryButton} ${styles.backButton}`}
            >
              ← Back to Page Settings
            </button>

            <div className={styles.formHeader}>
              <div>
                <h1 className={styles.formTitle}>
                  {isNewSection ? 'Add New Review Section' : 'Edit Review Settings'}
                </h1>
                <p className={styles.formSubtitle}>
                  {isNewSection
                    ? 'Create a new review section for this page'
                    : 'Customize how customer reviews are displayed on your website'
                  }
                </p>
                {restaurantName && (
                  <p className={styles.formSubtitle}>
                    Restaurant: {restaurantName}
                  </p>
                )}
              </div>
              <button
                onClick={() => setShowPreview(true)}
                className={`${styles.button} ${styles.secondaryButton}`}
                disabled={reviews.length === 0}
              >
                👁️ Preview Reviews
              </button>
            </div>

            {loading ? (
              <div className={styles.loading}>Loading...</div>
            ) : (
              <div className={styles.form}>
                {/* Basic Information */}
                <div className={styles.section}>
                  <h3 className={styles.sectionTitle}>
                    <span className={styles.sectionIcon}>📝</span>
                    Basic Information
                  </h3>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>
                      Title
                      <span className={styles.labelHint}>Section title</span>
                    </label>
                    <input
                      type="text"
                      value={config.title || ''}
                      onChange={(e) => setConfig({ ...config, title: e.target.value })}
                      className={styles.textInput}
                      placeholder="Customer Reviews"
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>
                      Sub Heading
                      <span className={styles.labelHint}>Optional subtitle text</span>
                    </label>
                    <input
                      type="text"
                      value={config.subtitle || ''}
                      onChange={(e) => setConfig({ ...config, subtitle: e.target.value })}
                      className={styles.textInput}
                      placeholder="What our customers say"
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>
                      Description
                      <span className={styles.labelHint}>Optional description text</span>
                    </label>
                    <textarea
                      value={config.description || ''}
                      onChange={(e) => setConfig({ ...config, description: e.target.value })}
                      rows={3}
                      className={styles.textArea}
                      placeholder="Read what our satisfied customers have to say..."
                    />
                  </div>
                </div>

                {/* Layout Settings */}
                <div className={styles.section}>
                  <h3 className={styles.sectionTitle}>
                    <span className={styles.sectionIcon}>⚙️</span>
                    Layout Settings
                  </h3>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>
                      Layout Type
                      <span className={styles.labelHint}>Choose display style</span>
                    </label>
                    <select
                      value={config.layout}
                      onChange={(e) => setConfig({ ...config, layout: e.target.value as ReviewConfig['layout'] })}
                      className={styles.select}
                    >
                      <option value="grid">Grid - Card layout</option>
                      <option value="masonry">Masonry - Varied heights</option>
                      <option value="slider">Slider - Carousel with navigation</option>
                      <option value="list">List - Horizontal cards</option>
                    </select>
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>
                      Columns
                      <span className={styles.labelHint}>Number of columns</span>
                    </label>
                    <select
                      value={config.columns}
                      onChange={(e) => setConfig({ ...config, columns: Number(e.target.value) as ReviewConfig['columns'] })}
                      className={styles.select}
                    >
                      <option value="2">2 Columns</option>
                      <option value="3">3 Columns</option>
                      <option value="4">4 Columns</option>
                    </select>
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>
                      Max Reviews
                      <span className={styles.labelHint}>Maximum number to display</span>
                    </label>
                    <input
                      type="number"
                      value={config.maxReviews || 6}
                      onChange={(e) => setConfig({ ...config, maxReviews: parseInt(e.target.value) || 6 })}
                      className={styles.textInput}
                      min="1"
                      max="50"
                    />
                  </div>
                </div>

                {/* Display Options */}
                <div className={styles.section}>
                  <h3 className={styles.sectionTitle}>
                    <span className={styles.sectionIcon}>👁️</span>
                    Display Options
                  </h3>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>
                      Show Avatar
                      <span className={styles.labelHint}>Display reviewer profile pictures</span>
                    </label>
                    <select
                      value={config.showAvatar ? 'true' : 'false'}
                      onChange={(e) => setConfig({ ...config, showAvatar: e.target.value === 'true' })}
                      className={styles.select}
                    >
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </select>
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>
                      Show Rating
                      <span className={styles.labelHint}>Display star ratings</span>
                    </label>
                    <select
                      value={config.showRating ? 'true' : 'false'}
                      onChange={(e) => setConfig({ ...config, showRating: e.target.value === 'true' })}
                      className={styles.select}
                    >
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </select>
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>
                      Show Date
                      <span className={styles.labelHint}>Display review date</span>
                    </label>
                    <select
                      value={config.showDate ? 'true' : 'false'}
                      onChange={(e) => setConfig({ ...config, showDate: e.target.value === 'true' })}
                      className={styles.select}
                    >
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </select>
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>
                      Show Source
                      <span className={styles.labelHint}>Display review source (e.g., Google)</span>
                    </label>
                    <select
                      value={config.showSource ? 'true' : 'false'}
                      onChange={(e) => setConfig({ ...config, showSource: e.target.value === 'true' })}
                      className={styles.select}
                    >
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </select>
                  </div>
                </div>

                {/* Styling Options */}
                <div className={styles.section}>
                  <h3 className={styles.sectionTitle}>
                    <span className={styles.sectionIcon}>🎨</span>
                    Styling Options
                  </h3>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>
                      Background Color
                      <span className={styles.labelHint}>Section background color</span>
                    </label>
                    <input
                      type="color"
                      value={config.bgColor || '#f9fafb'}
                      onChange={(e) => setConfig({ ...config, bgColor: e.target.value })}
                      className={styles.textInput}
                      style={{ height: '50px', cursor: 'pointer' }}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>
                      Text Color
                      <span className={styles.labelHint}>Title and text color</span>
                    </label>
                    <input
                      type="color"
                      value={config.textColor || '#000000'}
                      onChange={(e) => setConfig({ ...config, textColor: e.target.value })}
                      className={styles.textInput}
                      style={{ height: '50px', cursor: 'pointer' }}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>
                      Card Background
                      <span className={styles.labelHint}>Review card background color</span>
                    </label>
                    <input
                      type="color"
                      value={config.cardBgColor || '#ffffff'}
                      onChange={(e) => setConfig({ ...config, cardBgColor: e.target.value })}
                      className={styles.textInput}
                      style={{ height: '50px', cursor: 'pointer' }}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>
                      Star Color
                      <span className={styles.labelHint}>Rating star color</span>
                    </label>
                    <input
                      type="color"
                      value={config.starColor || '#fbbf24'}
                      onChange={(e) => setConfig({ ...config, starColor: e.target.value })}
                      className={styles.textInput}
                      style={{ height: '50px', cursor: 'pointer' }}
                    />
                  </div>
                </div>

                {/* Typography Settings */}
                <div className={styles.section}>
                  <h3 className={styles.sectionTitle}>
                    <span className={styles.sectionIcon}>Aa</span>
                    Typography
                  </h3>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>
                      Use Section Custom Typography
                      <span className={styles.labelHint}>
                        When disabled, this section uses live global typography settings
                      </span>
                    </label>
                    <select
                      value={config.is_custom ? 'true' : 'false'}
                      onChange={(e) =>
                        setConfig({ ...config, is_custom: e.target.value === 'true' })
                      }
                      className={styles.select}
                    >
                      <option value="false">No - Use Global Typography</option>
                      <option value="true">Yes - Use Custom Typography</option>
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>
                      Button Style Source
                      <span className={styles.labelHint}>
                        Use global primary or secondary button style for section buttons
                      </span>
                    </label>
                    <select
                      value={config.buttonStyleVariant || 'primary'}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          buttonStyleVariant:
                            e.target.value === 'secondary' ? 'secondary' : 'primary',
                        })
                      }
                      className={styles.select}
                    >
                      <option value="primary">Global Primary Button</option>
                      <option value="secondary">Global Secondary Button</option>
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Title Font Family</label>
                    <select
                      value={config.titleFontFamily || DEFAULT_REVIEW_CONFIG.titleFontFamily}
                      onChange={(e) => handleTypographyChange('titleFontFamily', e.target.value)}
                      className={styles.select}
                      disabled={!config.is_custom}
                    >
                      {FONT_FAMILY_OPTIONS.map((font) => (
                        <option key={`review-title-font-${font.value}`} value={font.value}>
                          {font.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Title Font Size</label>
                    <select
                      value={config.titleFontSize || DEFAULT_REVIEW_CONFIG.titleFontSize}
                      onChange={(e) => handleTypographyChange('titleFontSize', e.target.value)}
                      className={styles.select}
                      disabled={!config.is_custom}
                    >
                      {FONT_SIZE_OPTIONS.map((fontSize) => (
                        <option key={`review-title-size-${fontSize.value}`} value={fontSize.value}>
                          {fontSize.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Title Font Weight</label>
                    <select
                      value={config.titleFontWeight || DEFAULT_REVIEW_CONFIG.titleFontWeight}
                      onChange={(e) => handleTypographyChange('titleFontWeight', Number(e.target.value))}
                      className={styles.select}
                      disabled={!config.is_custom}
                    >
                      {FONT_WEIGHT_OPTIONS.map((weight) => (
                        <option key={`review-title-weight-${weight.value}`} value={weight.value}>
                          {weight.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Title Color</label>
                    <input
                      type="color"
                      value={config.titleColor || DEFAULT_REVIEW_CONFIG.titleColor}
                      onChange={(e) => handleTypographyChange('titleColor', e.target.value)}
                      className={styles.textInput}
                      style={{ height: '50px', cursor: 'pointer' }}
                      disabled={!config.is_custom}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Subtitle Font Family</label>
                    <select
                      value={config.subtitleFontFamily || DEFAULT_REVIEW_CONFIG.subtitleFontFamily}
                      onChange={(e) => handleTypographyChange('subtitleFontFamily', e.target.value)}
                      className={styles.select}
                      disabled={!config.is_custom}
                    >
                      {FONT_FAMILY_OPTIONS.map((font) => (
                        <option key={`review-subtitle-font-${font.value}`} value={font.value}>
                          {font.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Subtitle Font Size</label>
                    <select
                      value={config.subtitleFontSize || DEFAULT_REVIEW_CONFIG.subtitleFontSize}
                      onChange={(e) => handleTypographyChange('subtitleFontSize', e.target.value)}
                      className={styles.select}
                      disabled={!config.is_custom}
                    >
                      {FONT_SIZE_OPTIONS.map((fontSize) => (
                        <option key={`review-subtitle-size-${fontSize.value}`} value={fontSize.value}>
                          {fontSize.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Subtitle Font Weight</label>
                    <select
                      value={config.subtitleFontWeight || DEFAULT_REVIEW_CONFIG.subtitleFontWeight}
                      onChange={(e) => handleTypographyChange('subtitleFontWeight', Number(e.target.value))}
                      className={styles.select}
                      disabled={!config.is_custom}
                    >
                      {FONT_WEIGHT_OPTIONS.map((weight) => (
                        <option key={`review-subtitle-weight-${weight.value}`} value={weight.value}>
                          {weight.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Subtitle Color</label>
                    <input
                      type="color"
                      value={config.subtitleColor || DEFAULT_REVIEW_CONFIG.subtitleColor}
                      onChange={(e) => handleTypographyChange('subtitleColor', e.target.value)}
                      className={styles.textInput}
                      style={{ height: '50px', cursor: 'pointer' }}
                      disabled={!config.is_custom}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Body Font Family</label>
                    <select
                      value={config.bodyFontFamily || DEFAULT_REVIEW_CONFIG.bodyFontFamily}
                      onChange={(e) => handleTypographyChange('bodyFontFamily', e.target.value)}
                      className={styles.select}
                      disabled={!config.is_custom}
                    >
                      {FONT_FAMILY_OPTIONS.map((font) => (
                        <option key={`review-body-font-${font.value}`} value={font.value}>
                          {font.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Body Font Size</label>
                    <select
                      value={config.bodyFontSize || DEFAULT_REVIEW_CONFIG.bodyFontSize}
                      onChange={(e) => handleTypographyChange('bodyFontSize', e.target.value)}
                      className={styles.select}
                      disabled={!config.is_custom}
                    >
                      {FONT_SIZE_OPTIONS.map((fontSize) => (
                        <option key={`review-body-size-${fontSize.value}`} value={fontSize.value}>
                          {fontSize.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Body Font Weight</label>
                    <select
                      value={config.bodyFontWeight || DEFAULT_REVIEW_CONFIG.bodyFontWeight}
                      onChange={(e) => handleTypographyChange('bodyFontWeight', Number(e.target.value))}
                      className={styles.select}
                      disabled={!config.is_custom}
                    >
                      {FONT_WEIGHT_OPTIONS.map((weight) => (
                        <option key={`review-body-weight-${weight.value}`} value={weight.value}>
                          {weight.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Body Color</label>
                    <input
                      type="color"
                      value={config.bodyColor || DEFAULT_REVIEW_CONFIG.bodyColor}
                      onChange={(e) => handleTypographyChange('bodyColor', e.target.value)}
                      className={styles.textInput}
                      style={{ height: '50px', cursor: 'pointer' }}
                      disabled={!config.is_custom}
                    />
                  </div>
                </div>

                {/* Available Reviews */}
                <div className={styles.section}>
                  <h3 className={styles.sectionTitle}>
                    <span className={styles.sectionIcon}>⭐</span>
                    Available Reviews ({reviews.length})
                  </h3>

                  {reviews.length === 0 ? (
                    <div className={styles.emptyState}>
                      <div className={styles.emptyStateIcon}>⭐</div>
                      <h3 className={styles.emptyStateTitle}>No reviews found</h3>
                      <p className={styles.emptyStateDescription}>
                        No reviews are available for this restaurant yet.
                      </p>
                    </div>
                  ) : (
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                      gap: '1rem',
                    }}>
                      {reviews.map((review) => (
                        <div
                          key={review.review_id}
                          style={{
                            background: 'white',
                            borderRadius: '0.5rem',
                            padding: '1rem',
                            border: '2px solid #e5e7eb',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.75rem',
                          }}
                        >
                          {/* Rating */}
                          <div style={{ display: 'flex', gap: '0.25rem' }}>
                            {Array.from({ length: 5 }).map((_, index) => (
                              <span
                                key={index}
                                style={{
                                  color: index < review.rating ? '#fbbf24' : '#d1d5db',
                                  fontSize: '1.125rem',
                                }}
                              >
                                ★
                              </span>
                            ))}
                          </div>

                          {/* Review Text */}
                          {review.review_text && (
                            <p style={{
                              fontSize: '0.875rem',
                              lineHeight: '1.5',
                              color: '#374151',
                              margin: 0,
                              display: '-webkit-box',
                              WebkitLineClamp: 3,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                            }}>
                              &quot;{review.review_text}&quot;
                            </p>
                          )}

                          {/* Author Info */}
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            paddingTop: '0.75rem',
                            borderTop: '1px solid #e5e7eb',
                          }}>
                            {review.avatar_url ? (
                              <img
                                src={review.avatar_url}
                                alt={review.author_name || 'User'}
                                style={{
                                  width: '32px',
                                  height: '32px',
                                  borderRadius: '50%',
                                  objectFit: 'cover',
                                }}
                              />
                            ) : (
                              <div style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                background: '#e5e7eb',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.875rem',
                                color: '#6b7280',
                                fontWeight: 600,
                              }}>
                                {review.author_name?.charAt(0)?.toUpperCase() || '?'}
                              </div>
                            )}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{
                                fontWeight: 600,
                                fontSize: '0.8125rem',
                                color: '#1f2937',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}>
                                {review.author_name || 'Anonymous'}
                              </div>
                              <div style={{
                                fontSize: '0.75rem',
                                color: '#6b7280',
                                display: 'flex',
                                gap: '0.5rem',
                                flexWrap: 'wrap',
                              }}>
                                {review.published_at && (
                                  <span>
                                    {new Date(review.published_at).toLocaleDateString('en-US', {
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric'
                                    })}
                                  </span>
                                )}
                                {review.source && (
                                  <span>• {review.source}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Save Button */}
                <div className={styles.formActions}>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className={styles.saveButton}
                  >
                    {saving ? (
                      <>
                        <span className={styles.spinner}></span>
                        Saving...
                      </>
                    ) : (
                      <>
                        <span>💾</span>
                        {isNewSection ? 'Create Review Section' : 'Save Review Settings'}
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <div className={styles.modal} onClick={() => setShowPreview(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '1400px' }}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                Reviews Preview
              </h2>
              <button
                onClick={() => setShowPreview(false)}
                className={styles.modalCloseButton}
              >
                ×
              </button>
            </div>

            <div className={styles.modalBody}>
              <Reviews {...config} reviews={reviews} />
            </div>

            <div className={styles.modalFooter}>
              <button
                onClick={() => setShowPreview(false)}
                className={`${styles.button} ${styles.secondaryButton}`}
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className={`${styles.toast} ${toast.type === 'success' ? styles.success : styles.error}`}>
          <span style={{ fontSize: '1.25rem' }}>
            {toast.type === 'success' ? '✓' : '✕'}
          </span>
          {toast.message}
        </div>
      )}
    </DashboardLayout>
  );
}
