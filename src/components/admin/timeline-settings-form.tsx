/**
 * Timeline Settings Form
 *
 * Interface for configuring timeline settings:
 * - Enable/disable toggle
 * - Layout selection
 * - Timeline items management (add, edit, delete, reorder)
 * - Color customization
 * - Live preview
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTimelineConfig, useUpdateTimelineConfig } from '@/hooks/use-timeline-config';
import type { TimelineLayout, TimelineItem } from '@/types/timeline.types';
import { TIMELINE_LAYOUTS } from '@/types/timeline.types';
import Toast from '@/components/ui/toast';
import styles from './announcement-bar-settings-form.module.css';

export default function TimelineSettingsForm() {
  const searchParams = useSearchParams();
  const restaurantIdFromQuery = searchParams.get('restaurant_id')?.trim() ?? '';
  const pageIdFromQuery = searchParams.get('page_id')?.trim() ?? '';
  const restaurantId = restaurantIdFromQuery || '';
  const pageId = pageIdFromQuery || '';

  const configApiEndpoint = useMemo(
    () => `/api/timeline-config?restaurant_id=${encodeURIComponent(restaurantId)}&page_id=${encodeURIComponent(pageId)}`,
    [restaurantId, pageId],
  );

  const { config, loading, error: fetchError } = useTimelineConfig({
    apiEndpoint: configApiEndpoint,
  });
  const { updateTimeline, updating, error: updateError } = useUpdateTimelineConfig();

  // Form state
  const [isEnabled, setIsEnabled] = useState(false);
  const [layout, setLayout] = useState<TimelineLayout>('alternating');
  const [title, setTitle] = useState('Our Journey');
  const [subtitle, setSubtitle] = useState('Key milestones in our story');
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  const [textColor, setTextColor] = useState('#111827');
  const [accentColor, setAccentColor] = useState('#10b981');
  const [lineColor, setLineColor] = useState('#d1d5db');

  // Toast state
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  // Preview visibility state
  const [showPreview, setShowPreview] = useState(false);

  // Edit item modal state
  const [editingItem, setEditingItem] = useState<TimelineItem | null>(null);
  const [showItemModal, setShowItemModal] = useState(false);

  // Initialize form with fetched config
  useEffect(() => {
    if (config) {
      setIsEnabled(config.isEnabled ?? false);
      setLayout(config.layout || 'alternating');
      setTitle(config.title || 'Our Journey');
      setSubtitle(config.subtitle || 'Key milestones in our story');
      setItems(config.items || []);
      setBackgroundColor(config.backgroundColor || '#ffffff');
      setTextColor(config.textColor || '#111827');
      setAccentColor(config.accentColor || '#10b981');
      setLineColor(config.lineColor || '#d1d5db');
    }
  }, [config]);

  if (!restaurantId || !pageId) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#dc2626' }}>
        <h2>Error</h2>
        <p>Restaurant ID and Page ID are required. Please provide them via URL parameters.</p>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!restaurantId || !pageId) {
      setToastMessage('Restaurant ID or Page ID not found. Please refresh the page.');
      setToastType('error');
      setShowToast(true);
      return;
    }

    try {
      await updateTimeline({
        restaurant_id: restaurantId,
        page_id: pageId,
        isEnabled,
        layout,
        title,
        subtitle,
        items,
        backgroundColor,
        textColor,
        accentColor,
        lineColor,
      });

      setToastMessage('Timeline settings saved successfully!');
      setToastType('success');
      setShowToast(true);
    } catch (err) {
      console.error('Failed to update timeline:', err);
      setToastMessage('Failed to save settings. Please try again.');
      setToastType('error');
      setShowToast(true);
    }
  };

  const handleAddItem = () => {
    const newItem: TimelineItem = {
      id: `item-${Date.now()}`,
      title: '',
      date: '',
      description: '',
      order: items.length,
    };
    setEditingItem(newItem);
    setShowItemModal(true);
  };

  const handleEditItem = (item: TimelineItem) => {
    setEditingItem(item);
    setShowItemModal(true);
  };

  const handleDeleteItem = (itemId: string) => {
    setItems(items.filter(item => item.id !== itemId));
  };

  const handleSaveItem = (item: TimelineItem) => {
    const existingIndex = items.findIndex(i => i.id === item.id);
    if (existingIndex >= 0) {
      const updatedItems = [...items];
      updatedItems[existingIndex] = item;
      setItems(updatedItems);
    } else {
      setItems([...items, item]);
    }
    setShowItemModal(false);
    setEditingItem(null);
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const newItems = [...items];
    const newIndex = direction === 'up' ? index - 1 : index + 1;

    if (newIndex < 0 || newIndex >= newItems.length) return;

    [newItems[index], newItems[newIndex]] = [newItems[newIndex], newItems[index]];
    newItems.forEach((item, i) => item.order = i);
    setItems(newItems);
  };

  if (loading) {
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
              <h1 className={styles.formTitle}>Timeline Settings</h1>
              <p className={styles.formSubtitle}>Configure timeline display and content</p>
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

          <form onSubmit={handleSubmit} className={styles.form}>
            {/* General Settings */}
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>
                <span className={styles.sectionIcon}>⚙</span>
                General Settings
              </h3>

              {/* Enable/Disable Toggle */}
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Enable Timeline
                  <span className={styles.labelHint}>Show/hide the timeline section</span>
                </label>
                <label className={styles.toggleSwitch}>
                  <input
                    type="checkbox"
                    checked={isEnabled}
                    onChange={(e) => setIsEnabled(e.target.checked)}
                    className={styles.toggleInput}
                  />
                  <span className={styles.toggleSlider}></span>
                </label>
              </div>

              {/* Title */}
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Section Title
                  <span className={styles.labelHint}>Main heading for the timeline section</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={styles.select}
                  placeholder="Our Journey"
                />
              </div>

              {/* Subtitle */}
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Section Subtitle (Optional)
                  <span className={styles.labelHint}>Subtitle text below the title</span>
                </label>
                <input
                  type="text"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  className={styles.select}
                  placeholder="Key milestones in our story"
                />
              </div>

              {/* Layout Selection */}
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Timeline Layout
                  <span className={styles.labelHint}>Choose how timeline items are displayed</span>
                </label>
                <select
                  value={layout}
                  onChange={(e) => setLayout(e.target.value as TimelineLayout)}
                  className={styles.select}
                >
                  {Object.entries(TIMELINE_LAYOUTS).map(([key, value]) => (
                    <option key={key} value={key}>
                      {value.name} - {value.description}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Timeline Items */}
            <div className={styles.section}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 className={styles.sectionTitle}>
                  <span className={styles.sectionIcon}>📅</span>
                  Timeline Items
                </h3>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className={styles.previewToggleButton}
                  style={{ marginLeft: 'auto' }}
                >
                  ➕ Add Item
                </button>
              </div>

              {items.length === 0 ? (
                <div style={{
                  padding: '2rem',
                  textAlign: 'center',
                  color: '#6b7280',
                  background: '#f9fafb',
                  borderRadius: '8px',
                  border: '2px dashed #e5e7eb'
                }}>
                  No timeline items yet. Click &quot;Add Item&quot; to create your first one.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {items.map((item, index) => (
                    <div
                      key={item.id}
                      style={{
                        padding: '1rem',
                        background: '#f9fafb',
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                        <div style={{ flex: 1 }}>
                          <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#111827' }}>
                            {item.title || 'Untitled'}
                          </h4>
                          <p style={{ margin: '0.25rem 0', fontSize: '14px', color: '#6b7280' }}>
                            {item.date}
                          </p>
                          <p style={{ margin: '0.5rem 0 0', fontSize: '14px', color: '#374151' }}>
                            {item.description}
                          </p>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', marginLeft: '1rem' }}>
                          <button
                            type="button"
                            onClick={() => moveItem(index, 'up')}
                            disabled={index === 0}
                            style={{
                              padding: '0.5rem',
                              background: index === 0 ? '#e5e7eb' : '#ffffff',
                              border: '1px solid #d1d5db',
                              borderRadius: '4px',
                              cursor: index === 0 ? 'not-allowed' : 'pointer'
                            }}
                            title="Move up"
                          >
                            ⬆️
                          </button>
                          <button
                            type="button"
                            onClick={() => moveItem(index, 'down')}
                            disabled={index === items.length - 1}
                            style={{
                              padding: '0.5rem',
                              background: index === items.length - 1 ? '#e5e7eb' : '#ffffff',
                              border: '1px solid #d1d5db',
                              borderRadius: '4px',
                              cursor: index === items.length - 1 ? 'not-allowed' : 'pointer'
                            }}
                            title="Move down"
                          >
                            ⬇️
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEditItem(item)}
                            style={{
                              padding: '0.5rem',
                              background: '#ffffff',
                              border: '1px solid #d1d5db',
                              borderRadius: '4px',
                              cursor: 'pointer'
                            }}
                            title="Edit"
                          >
                            ✏️
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(item.id)}
                            style={{
                              padding: '0.5rem',
                              background: '#ffffff',
                              border: '1px solid #d1d5db',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              color: '#dc2626'
                            }}
                            title="Delete"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Color Customization */}
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>
                <span className={styles.sectionIcon}>🎨</span>
                Color Customization
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    Background Color
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input
                      type="color"
                      value={backgroundColor}
                      onChange={(e) => setBackgroundColor(e.target.value)}
                      style={{ width: '60px', height: '40px', border: '1px solid #d1d5db', borderRadius: '4px' }}
                    />
                    <input
                      type="text"
                      value={backgroundColor}
                      onChange={(e) => setBackgroundColor(e.target.value)}
                      className={styles.select}
                      placeholder="#ffffff"
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    Text Color
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input
                      type="color"
                      value={textColor}
                      onChange={(e) => setTextColor(e.target.value)}
                      style={{ width: '60px', height: '40px', border: '1px solid #d1d5db', borderRadius: '4px' }}
                    />
                    <input
                      type="text"
                      value={textColor}
                      onChange={(e) => setTextColor(e.target.value)}
                      className={styles.select}
                      placeholder="#111827"
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    Accent Color (Dots/Icons)
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input
                      type="color"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      style={{ width: '60px', height: '40px', border: '1px solid #d1d5db', borderRadius: '4px' }}
                    />
                    <input
                      type="text"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className={styles.select}
                      placeholder="#10b981"
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    Timeline Line Color
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input
                      type="color"
                      value={lineColor}
                      onChange={(e) => setLineColor(e.target.value)}
                      style={{ width: '60px', height: '40px', border: '1px solid #d1d5db', borderRadius: '4px' }}
                    />
                    <input
                      type="text"
                      value={lineColor}
                      onChange={(e) => setLineColor(e.target.value)}
                      className={styles.select}
                      placeholder="#d1d5db"
                    />
                  </div>
                </div>
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

      {/* Item Edit Modal */}
      {showItemModal && editingItem && (
        <ItemEditModal
          item={editingItem}
          onSave={handleSaveItem}
          onClose={() => {
            setShowItemModal(false);
            setEditingItem(null);
          }}
        />
      )}

      {/* Preview Modal */}
      {showPreview && (
        <TimelinePreviewModal
          isEnabled={isEnabled}
          layout={layout}
          title={title}
          subtitle={subtitle}
          items={items}
          backgroundColor={backgroundColor}
          textColor={textColor}
          accentColor={accentColor}
          lineColor={lineColor}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
}

// Item Edit Modal Component
function ItemEditModal({
  item,
  onSave,
  onClose,
}: {
  item: TimelineItem;
  onSave: (item: TimelineItem) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(item.title);
  const [date, setDate] = useState(item.date);
  const [description, setDescription] = useState(item.description);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...item,
      title,
      date,
      description,
    });
  };

  return (
    <div className={styles.previewModal}>
      <div className={styles.previewModalOverlay} onClick={onClose} />
      <div className={styles.previewModalContent} style={{ maxWidth: '600px' }}>
        <div className={styles.previewModalHeader}>
          <h2 className={styles.previewModalTitle}>
            {item.title ? 'Edit Timeline Item' : 'Add Timeline Item'}
          </h2>
          <button
            onClick={onClose}
            className={styles.previewModalClose}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>
        <div className={styles.previewModalBody}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Title *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={styles.select}
                placeholder="Event title"
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Date *</label>
              <input
                type="text"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={styles.select}
                placeholder="e.g., January 2023, 2023, Q1 2023"
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Description *</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={styles.textarea}
                placeholder="Describe this milestone..."
                rows={4}
                required
              />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: '#ffffff',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={styles.saveButton}
              >
                Save Item
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Timeline Preview Modal Component
function TimelinePreviewModal({
  isEnabled,
  layout,
  title,
  subtitle,
  items,
  backgroundColor,
  textColor,
  accentColor,
  lineColor,
  onClose,
}: {
  isEnabled: boolean;
  layout: TimelineLayout;
  title: string;
  subtitle: string;
  items: TimelineItem[];
  backgroundColor: string;
  textColor: string;
  accentColor: string;
  lineColor: string;
  onClose: () => void;
}) {
  return (
    <div className={styles.previewModal}>
      <div className={styles.previewModalOverlay} onClick={onClose} />
      <div className={styles.previewModalContent}>
        <div className={styles.previewModalHeader}>
          <h2 className={styles.previewModalTitle}>Timeline Live Preview</h2>
          <div className={styles.previewModalActions}>
            <span className={styles.previewBadge}>Live Preview</span>
            <button
              onClick={onClose}
              className={styles.previewModalClose}
              aria-label="Close preview"
            >
              ✕
            </button>
          </div>
        </div>
        <div className={styles.previewModalBody}>
          <div className={styles.previewDevice}>
            {!isEnabled ? (
              <div style={{
                padding: '2rem',
                textAlign: 'center',
                color: '#6b7280',
                fontStyle: 'italic',
                background: '#f9fafb',
                borderRadius: '8px',
                border: '2px dashed #e5e7eb'
              }}>
                Timeline is disabled
              </div>
            ) : items.length === 0 ? (
              <div style={{
                padding: '2rem',
                textAlign: 'center',
                color: '#6b7280',
                fontStyle: 'italic',
                background: '#f9fafb',
                borderRadius: '8px',
                border: '2px dashed #e5e7eb'
              }}>
                No timeline items to display
              </div>
            ) : (
              <div style={{ background: backgroundColor, padding: '3rem 1rem', color: textColor }}>
                {/* Title and Subtitle */}
                <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                  <h2 style={{ margin: 0, fontSize: '32px', fontWeight: 'bold', color: textColor }}>
                    {title}
                  </h2>
                  {subtitle && (
                    <p style={{ margin: '0.5rem 0 0', fontSize: '18px', color: textColor, opacity: 0.7 }}>
                      {subtitle}
                    </p>
                  )}
                </div>

                {/* Timeline Items Preview - Different layouts */}
                {layout === 'alternating' && (
                  <div style={{ maxWidth: '800px', margin: '0 auto', position: 'relative' }}>
                    {/* Center line */}
                    <div style={{
                      position: 'absolute',
                      left: '50%',
                      top: 0,
                      bottom: 0,
                      width: '2px',
                      backgroundColor: lineColor,
                      transform: 'translateX(-50%)'
                    }} />

                    {items.map((item, index) => {
                      const isLeft = index % 2 === 0;
                      return (
                        <div key={item.id} style={{
                          position: 'relative',
                          display: 'flex',
                          justifyContent: isLeft ? 'flex-end' : 'flex-start',
                          marginBottom: '2rem',
                        }}>
                          <div style={{
                            width: 'calc(50% - 30px)',
                            padding: '1rem',
                            backgroundColor: 'rgba(0,0,0,0.02)',
                            borderRadius: '8px',
                            ...(isLeft ? { textAlign: 'right', marginRight: '30px' } : { textAlign: 'left', marginLeft: '30px' })
                          }}>
                            <p style={{ margin: 0, fontSize: '12px', fontWeight: '600', color: accentColor }}>
                              {item.date}
                            </p>
                            <h3 style={{ margin: '0.25rem 0', fontSize: '16px', fontWeight: '600', color: textColor }}>
                              {item.title}
                            </h3>
                            <p style={{ margin: '0.5rem 0 0', fontSize: '14px', color: textColor, opacity: 0.8 }}>
                              {item.description}
                            </p>
                          </div>
                          {/* Center dot */}
                          <div style={{
                            position: 'absolute',
                            left: '50%',
                            top: '1rem',
                            width: '12px',
                            height: '12px',
                            borderRadius: '50%',
                            backgroundColor: accentColor,
                            transform: 'translateX(-50%)',
                            border: `2px solid ${lineColor}`,
                            zIndex: 1
                          }} />
                        </div>
                      );
                    })}
                  </div>
                )}

                {layout === 'left' && (
                  <div style={{ maxWidth: '800px', margin: '0 auto', paddingLeft: '30px', position: 'relative' }}>
                    {/* Left line */}
                    <div style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: '2px',
                      backgroundColor: lineColor,
                    }} />

                    {items.map((item) => (
                      <div key={item.id} style={{ position: 'relative', marginBottom: '2rem', paddingLeft: '30px' }}>
                        <div style={{
                          padding: '1rem',
                          backgroundColor: 'rgba(0,0,0,0.02)',
                          borderRadius: '8px',
                        }}>
                          <p style={{ margin: 0, fontSize: '12px', fontWeight: '600', color: accentColor }}>
                            {item.date}
                          </p>
                          <h3 style={{ margin: '0.25rem 0', fontSize: '16px', fontWeight: '600', color: textColor }}>
                            {item.title}
                          </h3>
                          <p style={{ margin: '0.5rem 0 0', fontSize: '14px', color: textColor, opacity: 0.8 }}>
                            {item.description}
                          </p>
                        </div>
                        {/* Left dot */}
                        <div style={{
                          position: 'absolute',
                          left: '-6px',
                          top: '1rem',
                          width: '12px',
                          height: '12px',
                          borderRadius: '50%',
                          backgroundColor: accentColor,
                          border: `2px solid ${lineColor}`,
                          zIndex: 1
                        }} />
                      </div>
                    ))}
                  </div>
                )}

                {layout === 'right' && (
                  <div style={{ maxWidth: '800px', margin: '0 auto', paddingRight: '30px', position: 'relative' }}>
                    {/* Right line */}
                    <div style={{
                      position: 'absolute',
                      right: 0,
                      top: 0,
                      bottom: 0,
                      width: '2px',
                      backgroundColor: lineColor,
                    }} />

                    {items.map((item) => (
                      <div key={item.id} style={{ position: 'relative', marginBottom: '2rem', paddingRight: '30px' }}>
                        <div style={{
                          padding: '1rem',
                          backgroundColor: 'rgba(0,0,0,0.02)',
                          borderRadius: '8px',
                          textAlign: 'right'
                        }}>
                          <p style={{ margin: 0, fontSize: '12px', fontWeight: '600', color: accentColor }}>
                            {item.date}
                          </p>
                          <h3 style={{ margin: '0.25rem 0', fontSize: '16px', fontWeight: '600', color: textColor }}>
                            {item.title}
                          </h3>
                          <p style={{ margin: '0.5rem 0 0', fontSize: '14px', color: textColor, opacity: 0.8 }}>
                            {item.description}
                          </p>
                        </div>
                        {/* Right dot */}
                        <div style={{
                          position: 'absolute',
                          right: '-6px',
                          top: '1rem',
                          width: '12px',
                          height: '12px',
                          borderRadius: '50%',
                          backgroundColor: accentColor,
                          border: `2px solid ${lineColor}`,
                          zIndex: 1
                        }} />
                      </div>
                    ))}
                  </div>
                )}

                {layout === 'center' && (
                  <div style={{ maxWidth: '600px', margin: '0 auto', paddingLeft: '30px', position: 'relative' }}>
                    {/* Center line */}
                    <div style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: '2px',
                      backgroundColor: lineColor,
                    }} />

                    {items.map((item) => (
                      <div key={item.id} style={{ position: 'relative', marginBottom: '2rem', paddingLeft: '30px' }}>
                        <div style={{
                          padding: '1rem',
                          backgroundColor: 'rgba(0,0,0,0.02)',
                          borderRadius: '8px',
                          textAlign: 'center'
                        }}>
                          <p style={{ margin: 0, fontSize: '12px', fontWeight: '600', color: accentColor }}>
                            {item.date}
                          </p>
                          <h3 style={{ margin: '0.25rem 0', fontSize: '16px', fontWeight: '600', color: textColor }}>
                            {item.title}
                          </h3>
                          <p style={{ margin: '0.5rem 0 0', fontSize: '14px', color: textColor, opacity: 0.8 }}>
                            {item.description}
                          </p>
                        </div>
                        {/* Left dot */}
                        <div style={{
                          position: 'absolute',
                          left: '-6px',
                          top: '1rem',
                          width: '12px',
                          height: '12px',
                          borderRadius: '50%',
                          backgroundColor: accentColor,
                          border: `2px solid ${lineColor}`,
                          zIndex: 1
                        }} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <p className={styles.previewNote}>
            <span className={styles.previewIcon}>👁</span>
            Preview shows how your timeline layout will appear on the website
          </p>
        </div>
      </div>
    </div>
  );
}
