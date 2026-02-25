/**
 * FAQ Settings Form
 *
 * Enhanced interface for configuring FAQ settings:
 * - Layout selection (list, accordion, grid)
 * - FAQ management (add, edit, delete)
 * - Color customization
 * - Live preview modal
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { getPageById } from '@/lib/graphql/queries';
import type { PageItem } from '@/types/pages.types';
import { useFAQConfig, useUpdateFAQConfig } from '@/hooks/use-faq-config';
import Toast from '@/components/ui/toast';
import styles from './faq-settings-form.module.css';

interface FAQFormProps {
  pageId?: string;
  restaurantId?: string;
}

interface FAQ {
  id: string;
  question: string;
  answer: string;
}

// Restaurant ID should be provided dynamically - no default static ID

export default function FAQSettingsForm({ pageId, restaurantId }: FAQFormProps) {
  const searchParams = useSearchParams();
  const restaurantNameFromQuery = searchParams.get('restaurant_name') || undefined;
  const domainParamRaw = searchParams.get('domain') || searchParams.get('staging_domain') || searchParams.get('url') || null;
  const urlSlugFromParams = searchParams.get('url_slug') || searchParams.get('slug') || searchParams.get('path') || null;
  const pageIdFromParams = searchParams.get('page_id') || searchParams.get('page') || null;
  const [resolvedPageId, setResolvedPageId] = useState<string | null>(pageId || null);
  const restaurantIdFromQuery = searchParams.get('restaurant_id')?.trim() ?? '';
  const finalRestaurantId = restaurantIdFromQuery || restaurantId || '';
  
  // Validate that restaurant ID is provided
  if (!finalRestaurantId) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#dc2626' }}>
        <h2>Error</h2>
        <p>Restaurant ID is required. Please provide it via URL parameter or props.</p>
      </div>
    );
  }
  
  const configApiEndpoint = useMemo(
    () => {
      const params = new URLSearchParams({ restaurant_id: finalRestaurantId });
      const currentPageId = pageId || resolvedPageId;
      if (currentPageId) {
        params.append('page_id', currentPageId);
      }
      return `/api/faq-config?${params.toString()}`;
    },
    [finalRestaurantId, pageId, resolvedPageId],
  );

  const { config, loading: fetchLoading, error: fetchError } = useFAQConfig({
    apiEndpoint: configApiEndpoint,
  });
  const { updateFAQ: updateFAQConfig, updating, error: updateError } = useUpdateFAQConfig();
  
  // Form state
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [layout, setLayout] = useState<'list' | 'accordion' | 'grid'>('accordion');
  const [bgColor, setBgColor] = useState<string>('#ffffff');
  const [textColor, setTextColor] = useState<string>('#111827');
  const [title, setTitle] = useState<string>('Frequently Asked Questions');
  const [subtitle, setSubtitle] = useState<string>('Find answers to common questions');
  
  // Toast state
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  // Preview visibility state
  const [showPreview, setShowPreview] = useState(false);

  // Initialize form with fetched config
  useEffect(() => {
    if (config) {
      setLayout(config.layout || 'accordion');
      setBgColor(config.bgColor || '#ffffff');
      setTextColor(config.textColor || '#111827');
      setTitle(config.title || 'Frequently Asked Questions');
      setSubtitle(config.subtitle || 'Find answers to common questions');
      setFaqs(config.faqs || []);
    }
  }, [config]);

  const addFAQ = () => {
    setFaqs((s) => [...s, { id: String(Date.now()), question: '', answer: '' }]);
  };

  // Resolve page_id from domain/url params if pageId prop not provided
  useEffect(() => {
    if (pageId) {
      setResolvedPageId(pageId);
      return;
    }

    if (pageIdFromParams) {
      setResolvedPageId(pageIdFromParams);
      return;
    }

    const tryResolve = async () => {
      try {
        if (!finalRestaurantId) return;

        let domain = domainParamRaw;
        let urlSlug = urlSlugFromParams;

        // If domain param contains a full URL with path, extract path as url slug
        if (domain && !urlSlug) {
          try {
            const parsed = new URL(domain);
            const p = parsed.pathname.replace(/^\//, '');
            if (p) urlSlug = p;
            // use hostname as domain if needed
            domain = parsed.hostname;
          } catch (e) {
            // not a full URL, keep domain as-is
          }
        }

        if (!urlSlug) return; // url_slug is required by page-details API

        const res = await fetch(`/api/page-details?restaurant_id=${encodeURIComponent(finalRestaurantId)}&url_slug=${encodeURIComponent(urlSlug)}${domain ? `&domain=${encodeURIComponent(domain)}` : ''}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data?.success && data?.data?.page?.page_id) {
          setResolvedPageId(data.data.page.page_id);
        }
      } catch (err) {
        console.error('Failed to resolve page_id from domain params', err);
      }
    };

    tryResolve();
  }, [pageId, domainParamRaw, urlSlugFromParams, finalRestaurantId]);

  const updateFAQ = (id: string, field: 'question' | 'answer', value: string) => {
    setFaqs((s) => s.map((f) => (f.id === id ? { ...f, [field]: value } : f)));
  };

  const removeFAQ = (id: string) => setFaqs((s) => s.filter((f) => f.id !== id));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!finalRestaurantId) {
      setToastMessage('Restaurant ID not found. Please refresh the page.');
      setToastType('error');
      setShowToast(true);
      return;
    }

    try {
      const payload: any = {
        restaurant_id: finalRestaurantId,
        layout,
        bgColor,
        textColor,
        title,
        subtitle,
        faqs,
      };

      if (pageId) payload.page_id = pageId;
      else if (resolvedPageId) payload.page_id = resolvedPageId;

      // Debug: log payload so developer can verify page_id presence
      try {
        // eslint-disable-next-line no-console
        console.debug('FAQ save payload:', payload);
      } catch (e) {}

      await updateFAQConfig(payload);
      
      setToastMessage('FAQ settings saved successfully!');
      setToastType('success');
      setShowToast(true);
    } catch (err) {
      console.error('Failed to update FAQ:', err);
      setToastMessage('Failed to save settings. Please try again.');
      setToastType('error');
      setShowToast(true);
    }
  };

  const renderPreviewContent = () => {
    const previewStyle = {
      backgroundColor: bgColor,
      color: textColor,
      padding: '1.5rem',
      borderRadius: '8px'
    };

    const headerSection = (
      <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
        {title && (
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: 'bold',
            marginBottom: subtitle ? '0.5rem' : '0',
            color: textColor
          }}>
            {title}
          </h2>
        )}
        {subtitle && (
          <p style={{
            fontSize: '0.95rem',
            color: textColor,
            opacity: 0.8
          }}>
            {subtitle}
          </p>
        )}
      </div>
    );

    if (faqs.length === 0) {
      return (
        <div style={previewStyle}>
          {headerSection}
          <div style={{ fontSize: '0.875rem', color: textColor, opacity: 0.5, textAlign: 'center', padding: '1rem' }}>
            No FAQs to preview. Add some FAQs to see how they will appear.
          </div>
        </div>
      );
    }

    if (layout === 'grid') {
      return (
        <div style={previewStyle}>
          {headerSection}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {faqs.map((f) => (
              <div key={f.id} className="p-3 border rounded" style={{ background: 'rgba(255,255,255,0.1)' }}>
                <div className="font-semibold mb-2">{f.question || 'Question'}</div>
                <div className="text-sm">{f.answer || 'Answer content...'}</div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (layout === 'list') {
      return (
        <div style={previewStyle}>
          {headerSection}
          <div className="space-y-4">
            {faqs.map((f) => (
              <div key={f.id}>
                <div className="font-semibold mb-1">{f.question || 'Question'}</div>
                <div className="text-sm">{f.answer || 'Answer content...'}</div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // accordion layout
    return (
      <div style={previewStyle}>
        {headerSection}
        <div className="space-y-2">
          {faqs.map((f) => (
            <details key={f.id} className="border rounded p-3" style={{ background: 'rgba(255,255,255,0.1)' }}>
              <summary className="font-medium cursor-pointer">{f.question || 'Question'}</summary>
              <div className="text-sm mt-2">{f.answer || 'Answer content...'}</div>
            </details>
          ))}
        </div>
      </div>
    );
  };

  if (fetchLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Toast Notification */}
      {showToast && (
        <Toast
          message={toastMessage}
          type={toastType}
          onClose={() => setShowToast(false)}
        />
      )}

      <div className={styles.singleLayout}>
        {/* Settings Form */}
        <div className={styles.formSection}>
          <div className={styles.formHeader}>
            <div>
              <h1 className={styles.formTitle}>FAQ Settings</h1>
              <p className={styles.formSubtitle}>Manage frequently asked questions</p>
              {restaurantNameFromQuery && (
                <p className={styles.formSubtitle}>
                  Restaurant: {restaurantNameFromQuery}
                </p>
              )}
            </div>
            <div className={styles.headerActions}>
              <button
                type="button"
                onClick={() => setShowPreview(!showPreview)}
                className={styles.previewToggleButton}
                title={showPreview ? 'Hide Preview' : 'Show Live Preview'}
              >
                {showPreview ? '👁️‍🗨️' : '👁️'} {showPreview ? 'Hide' : 'Show'} Preview
              </button>
            </div>
          </div>

          {fetchError && (
            <div className={styles.errorMessage}>
              <span className={styles.errorIcon}>⚠</span>
              <span>Error loading settings: {fetchError}</span>
            </div>
          )}

          {updateError && (
            <div className={styles.errorMessage}>
              <span className={styles.errorIcon}>⚠</span>
              <span>Error saving settings: {updateError}</span>
            </div>
          )}

          <form onSubmit={handleSave} className={styles.form}>
            {/* Layout Configuration */}
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>
                <span className={styles.sectionIcon}>⚙</span>
                Layout Configuration
              </h3>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Layout Type
                  <span className={styles.labelHint}>Choose how FAQs are displayed</span>
                </label>
                <div className={styles.layoutButtons}>
                  <button
                    type="button"
                    onClick={() => setLayout('list')}
                    className={`${styles.layoutButton} ${layout === 'list' ? styles.active : ''}`}
                  >
                    List
                  </button>
                  <button
                    type="button"
                    onClick={() => setLayout('accordion')}
                    className={`${styles.layoutButton} ${layout === 'accordion' ? styles.active : ''}`}
                  >
                    Accordion
                  </button>
                  <button
                    type="button"
                    onClick={() => setLayout('grid')}
                    className={`${styles.layoutButton} ${layout === 'grid' ? styles.active : ''}`}
                  >
                    Grid
                  </button>
                </div>
              </div>
            </div>

            {/* Content Section */}
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>
                <span className={styles.sectionIcon}>📝</span>
                Content
              </h3>

              {/* Title */}
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Section Title
                  <span className={styles.labelHint}>Main heading for the FAQ section</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={styles.textInput}
                  placeholder="Frequently Asked Questions"
                />
              </div>

              {/* Subtitle */}
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Section Subtitle
                  <span className={styles.labelHint}>Subheading text below the title</span>
                </label>
                <input
                  type="text"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  className={styles.textInput}
                  placeholder="Find answers to common questions"
                />
              </div>
            </div>

            {/* Styling Section */}
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>
                <span className={styles.sectionIcon}>🎨</span>
                Colors & Styling
              </h3>

              {/* Background Color */}
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Background Color
                  <span className={styles.labelHint}>FAQ section background</span>
                </label>
                <div className={styles.colorInputGroup}>
                  <input
                    type="color"
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    className={styles.colorInput}
                  />
                  <input
                    type="text"
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    className={styles.colorHexInput}
                    placeholder="#ffffff"
                  />
                  <button
                    type="button"
                    onClick={() => setBgColor('#ffffff')}
                    className={styles.clearButton}
                    title="Reset to default"
                  >
                    ↺
                  </button>
                </div>
              </div>

              {/* Text Color */}
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Text Color
                  <span className={styles.labelHint}>FAQ text color</span>
                </label>
                <div className={styles.colorInputGroup}>
                  <input
                    type="color"
                    value={textColor}
                    onChange={(e) => setTextColor(e.target.value)}
                    className={styles.colorInput}
                  />
                  <input
                    type="text"
                    value={textColor}
                    onChange={(e) => setTextColor(e.target.value)}
                    className={styles.colorHexInput}
                    placeholder="#111827"
                  />
                  <button
                    type="button"
                    onClick={() => setTextColor('#111827')}
                    className={styles.clearButton}
                    title="Reset to default"
                  >
                    ↺
                  </button>
                </div>
              </div>
            </div>

            {/* FAQ Management Section */}
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>
                <span className={styles.sectionIcon}>❓</span>
                FAQ Management
              </h3>

              <div className={styles.faqItems}>
                {faqs.map((faq) => (
                  <div key={faq.id} className={styles.faqItem}>
                    <div className={styles.faqItemHeader}>
                      <h4 className={styles.faqItemTitle}>FAQ Item</h4>
                      <button
                        type="button"
                        onClick={() => removeFAQ(faq.id)}
                        className={styles.removeButton}
                      >
                        Remove
                      </button>
                    </div>
                    <div className={styles.faqItemFields}>
                      <div className={styles.fieldGroup}>
                        <label className={styles.fieldLabel}>Question</label>
                        <input
                          type="text"
                          value={faq.question}
                          onChange={(e) => updateFAQ(faq.id, 'question', e.target.value)}
                          className={styles.textInput}
                          placeholder="Enter your question here..."
                        />
                      </div>
                      <div className={styles.fieldGroup}>
                        <label className={styles.fieldLabel}>Answer</label>
                        <textarea
                          value={faq.answer}
                          onChange={(e) => updateFAQ(faq.id, 'answer', e.target.value)}
                          className={styles.textarea}
                          placeholder="Enter the answer here..."
                          rows={3}
                        />
                      </div>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addFAQ}
                  className={styles.addButton}
                >
                  <span>➕</span>
                  Add FAQ
                </button>
              </div>
            </div>

            {/* Save Button */}
            <div className={styles.formActions}>
              <button
                type="submit"
                disabled={updating}
                className={styles.saveButton}
              >
                {updating ? (
                  <>
                    <span className={styles.spinner}></span>
                    Saving...
                  </>
                ) : (
                  <>
                    <span>💾</span>
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Preview Modal Popup */}
      {showPreview && (
        <div className={styles.previewModal}>
          <div className={styles.previewModalOverlay} onClick={() => setShowPreview(false)} />
          <div className={styles.previewModalContent}>
            <div className={styles.previewModalHeader}>
              <h2 className={styles.previewModalTitle}>FAQ Live Preview</h2>
              <div className={styles.previewModalActions}>
                <span className={styles.previewBadge}>Updates in real-time</span>
                <button
                  onClick={() => setShowPreview(false)}
                  className={styles.previewModalClose}
                  aria-label="Close preview"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className={styles.previewModalBody}>
              <div className={styles.previewDevice}>
                <div className={styles.previewContainer}>
                  {renderPreviewContent()}
                </div>
              </div>
              <p className={styles.previewNote}>
                <span className={styles.previewIcon}>👁</span>
                Preview shows how your FAQ section will appear on the website
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
