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
import styles from '@/components/admin/gallery-settings-form.module.css';
import Reviews from '@/components/reviews';

export default function ReviewSettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const restaurantId = searchParams.get('restaurant_id');
  const restaurantName = searchParams.get('restaurant_name');
  const pageId = searchParams.get('page_id');

  const [config, setConfig] = useState<ReviewConfig>(DEFAULT_REVIEW_CONFIG);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showAddReviewForm, setShowAddReviewForm] = useState(false);
  const [addingReview, setAddingReview] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const [newReview, setNewReview] = useState({
    author_name: '',
    rating: 5,
    review_text: '',
    source: 'manual',
    avatar_url: '',
    published_at: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    if (restaurantId) {
      fetchReviewConfig();
      fetchReviews();
    }
  }, [restaurantId, pageId]);

  const fetchReviewConfig = async () => {
    setLoading(true);
    try {
      const url = `/api/review-config?restaurant_id=${restaurantId}${pageId ? `&page_id=${pageId}` : ''}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.success && data.data) {
        setConfig(data.data);
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
        }),
      });

      const data = await response.json();

      if (data.success) {
        setToast({ message: 'Review settings saved successfully!', type: 'success' });
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

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddReview = async () => {
    if (!restaurantId) return;

    setAddingReview(true);
    try {
      let avatarUrl = '';

      // Upload avatar if file is selected
      if (avatarFile) {
        const formData = new FormData();
        formData.append('file', avatarFile);
        formData.append('restaurant_id', restaurantId);
        formData.append('type', 'image');

        const uploadResponse = await fetch('/api/media/upload', {
          method: 'POST',
          body: formData,
        });

        const uploadData = await uploadResponse.json();

        if (uploadData.success && uploadData.data && uploadData.data.file) {
          avatarUrl = uploadData.data.file.url;
        } else {
          setToast({ message: 'Error uploading avatar', type: 'error' });
          setTimeout(() => setToast(null), 3000);
          setAddingReview(false);
          return;
        }
      }

      const response = await fetch('/api/reviews/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newReview,
          avatar_url: avatarUrl || null,
          restaurant_id: restaurantId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setToast({ message: 'Review added successfully!', type: 'success' });
        setTimeout(() => setToast(null), 3000);

        // Reset form
        setNewReview({
          author_name: '',
          rating: 5,
          review_text: '',
          source: 'manual',
          avatar_url: '',
          published_at: new Date().toISOString().split('T')[0],
        });
        handleCloseAddReviewModal();

        // Refresh reviews list
        await fetchReviews();
      } else {
        setToast({ message: 'Error adding review: ' + data.error, type: 'error' });
        setTimeout(() => setToast(null), 3000);
      }
    } catch (error) {
      console.error('Error adding review:', error);
      setToast({ message: 'Error adding review', type: 'error' });
      setTimeout(() => setToast(null), 3000);
    } finally {
      setAddingReview(false);
    }
  };

  const handleBack = () => {
    const params = new URLSearchParams();
    if (restaurantId) params.set('restaurant_id', restaurantId);
    if (restaurantName) params.set('restaurant_name', restaurantName);
    if (pageId) params.set('page_id', pageId);
    router.push(`/admin/page-settings?${params.toString()}`);
  };

  const handleCloseAddReviewModal = () => {
    setShowAddReviewForm(false);
    setAvatarFile(null);
    setAvatarPreview('');
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
                <h1 className={styles.formTitle}>Review Settings</h1>
                <p className={styles.formSubtitle}>
                  Customize how customer reviews are displayed on your website
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
                      onChange={(e) => setConfig({ ...config, layout: e.target.value as any })}
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
                      onChange={(e) => setConfig({ ...config, columns: Number(e.target.value) as any })}
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

                {/* Add Review Button */}
                <div className={styles.section}>
                  <div className={styles.formGroup}>
                    <h3 className={styles.sectionTitle}>
                      <span className={styles.sectionIcon}>➕</span>
                      Add Review
                    </h3>
                    <button
                      onClick={() => setShowAddReviewForm(true)}
                      className={`${styles.button} ${styles.primaryButton}`}
                    >
                      + Add New Review
                    </button>
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
                              "{review.review_text}"
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
                        Save Review Settings
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

      {/* Add Review Modal */}
      {showAddReviewForm && (
        <div className={styles.modal} onClick={handleCloseAddReviewModal}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                Add New Review
              </h2>
              <button
                onClick={handleCloseAddReviewModal}
                className={styles.modalCloseButton}
              >
                ×
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Author Name
                  <span className={styles.labelHint}>Reviewer's name</span>
                </label>
                <input
                  type="text"
                  value={newReview.author_name}
                  onChange={(e) => setNewReview({ ...newReview, author_name: e.target.value })}
                  className={styles.textInput}
                  placeholder="John Doe"
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Rating
                  <span className={styles.labelHint}>1 to 5 stars</span>
                </label>
                <select
                  value={newReview.rating}
                  onChange={(e) => setNewReview({ ...newReview, rating: parseInt(e.target.value) })}
                  className={styles.select}
                >
                  <option value="5">5 Stars</option>
                  <option value="4">4 Stars</option>
                  <option value="3">3 Stars</option>
                  <option value="2">2 Stars</option>
                  <option value="1">1 Star</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Review Text
                  <span className={styles.labelHint}>Review content</span>
                </label>
                <textarea
                  value={newReview.review_text}
                  onChange={(e) => setNewReview({ ...newReview, review_text: e.target.value })}
                  rows={4}
                  className={styles.textArea}
                  placeholder="This restaurant has amazing food and great service..."
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Avatar Image
                  <span className={styles.labelHint}>Optional profile picture</span>
                </label>
                {!avatarPreview ? (
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className={styles.textInput}
                    style={{ padding: '0.75rem' }}
                  />
                ) : (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    padding: '1rem',
                    background: '#f9fafb',
                    borderRadius: '0.5rem',
                    border: '1px solid #e5e7eb'
                  }}>
                    <img
                      src={avatarPreview}
                      alt="Avatar preview"
                      style={{
                        width: '60px',
                        height: '60px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: '2px solid #e5e7eb',
                      }}
                    />
                    <button
                      onClick={() => {
                        setAvatarFile(null);
                        setAvatarPreview('');
                      }}
                      className={`${styles.button} ${styles.secondaryButton}`}
                      type="button"
                      style={{ padding: '0.5rem 1rem' }}
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Published Date
                  <span className={styles.labelHint}>When the review was published</span>
                </label>
                <input
                  type="date"
                  value={newReview.published_at}
                  onChange={(e) => setNewReview({ ...newReview, published_at: e.target.value })}
                  className={styles.textInput}
                />
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                onClick={handleCloseAddReviewModal}
                className={`${styles.button} ${styles.secondaryButton}`}
                disabled={addingReview}
              >
                Cancel
              </button>
              <button
                onClick={handleAddReview}
                disabled={addingReview || !newReview.author_name || !newReview.review_text}
                className={`${styles.button} ${styles.primaryButton}`}
              >
                {addingReview ? (
                  <>
                    <span className={styles.spinner}></span>
                    Adding...
                  </>
                ) : (
                  'Add Review'
                )}
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
