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
import type { TimelineConfig, TimelineLayout, TimelineItem } from '@/types/timeline.types';
import { TIMELINE_LAYOUTS } from '@/types/timeline.types';
import { useSectionStyleDefaults } from '@/hooks/use-section-style-defaults';
import type { SectionStyleConfig } from '@/types/section-style.types';
import { SectionTypographyControls } from '@/components/admin/section-typography-controls';
import Toast from '@/components/ui/toast';

export default function TimelineSettingsForm() {
  const searchParams = useSearchParams();
  const restaurantIdFromQuery = searchParams.get('restaurant_id')?.trim() ?? '';
  const restaurantNameFromQuery = searchParams.get('restaurant_name')?.trim() ?? '';
  const pageIdFromQuery = searchParams.get('page_id')?.trim() ?? '';
  const restaurantId = restaurantIdFromQuery || '';
  const pageId = pageIdFromQuery || '';
  const sectionStyleDefaults = useSectionStyleDefaults(restaurantId);

  // Check if this is a new section being created or editing existing
  const isNewSection = searchParams.get('new_section') === 'true';
  const templateId = searchParams.get('template_id') || null;

  const configApiEndpoint = useMemo(() => {
    if (isNewSection) {
      // For new sections, return empty endpoint to skip fetching
      return '';
    }
    let endpoint = `/api/timeline-config?restaurant_id=${encodeURIComponent(restaurantId)}`;
    if (templateId) {
      endpoint += `&template_id=${encodeURIComponent(templateId)}`;
    } else if (pageId) {
      endpoint += `&page_id=${encodeURIComponent(pageId)}`;
    }
    return endpoint;
  }, [restaurantId, pageId, templateId, isNewSection]);

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
  const [sectionStyle, setSectionStyle] = useState<SectionStyleConfig>(
    sectionStyleDefaults,
  );

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
      setSectionStyle((prev) => ({
        ...sectionStyleDefaults,
        ...prev,
        ...config,
      }));
    }
  }, [config, sectionStyleDefaults]);

  useEffect(() => {
    setSectionStyle((prev) => ({
      ...sectionStyleDefaults,
      ...prev,
    }));
  }, [sectionStyleDefaults]);

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
        template_id: templateId || undefined,
        isEnabled,
        layout,
        title,
        subtitle,
        items,
        backgroundColor,
        textColor,
        accentColor,
        lineColor,
        ...sectionStyle,
      });

      setToastMessage(
        isNewSection
          ? 'Timeline section created successfully!'
          : 'Timeline settings saved successfully!'
      );
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

  if (!restaurantId || !pageId) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#dc2626' }}>
        <h2>Error</h2>
        <p>Restaurant ID and Page ID are required. Please provide them via URL parameters.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <svg className="h-8 w-8 animate-spin text-purple-600" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span className="ml-2 text-gray-700">Loading settings...</span>
      </div>
    );
  }

  return (
    <div>
      {/* Toast Notification */}
      {showToast && (
        <Toast
          message={toastMessage}
          type={toastType}
          onClose={() => setShowToast(false)}
        />
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg">
              <svg className="h-7 w-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-7.5h.008v.008H12v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 0h.008v.008H12v-.008z" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {isNewSection ? 'Add Timeline Section' : 'Timeline Settings'}
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                {isNewSection
                  ? 'Create a new timeline section for this page'
                  : 'Configure timeline display and content'
                }
              </p>
              {restaurantNameFromQuery && (
                <p className="mt-0.5 text-xs text-gray-500">
                  Restaurant: {restaurantNameFromQuery}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            title={showPreview ? 'Hide Preview' : 'Show Live Preview'}
            className="inline-flex items-center gap-2 rounded-lg border border-purple-200 bg-white px-4 py-2.5 text-sm font-medium text-purple-700 shadow-sm transition-all hover:border-purple-300 hover:bg-purple-50"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {showPreview ? 'Hide' : 'Show'} Preview
          </button>
        </div>

        {/* Error Messages */}
        {fetchError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <div className="flex items-start gap-3">
              <svg className="h-5 w-5 shrink-0 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              <span className="text-sm text-red-800">Error loading settings: {fetchError}</span>
            </div>
          </div>
        )}

        {updateError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <div className="flex items-start gap-3">
              <svg className="h-5 w-5 shrink-0 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              <span className="text-sm text-red-800">Error saving settings: {updateError}</span>
            </div>
          </div>
        )}
        {/* General Settings */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
              <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">General Settings</h2>
              <p className="text-sm text-gray-600">Configure basic timeline options</p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Enable/Disable Toggle */}
            <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Enable Timeline</label>
                <p className="text-xs text-gray-500">Show/hide the timeline section</p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={isEnabled}
                  onChange={(e) => setIsEnabled(e.target.checked)}
                  className="peer sr-only"
                />
                <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-purple-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-500 peer-focus:ring-offset-2"></div>
              </label>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <label className="block">
                <span className="text-sm font-medium text-gray-700">Section Title</span>
                <span className="mt-0.5 block text-xs text-gray-500">Main heading for the timeline section</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 shadow-sm transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Our Journey"
              />
            </div>

            {/* Subtitle */}
            <div className="space-y-2">
              <label className="block">
                <span className="text-sm font-medium text-gray-700">Section Subtitle (Optional)</span>
                <span className="mt-0.5 block text-xs text-gray-500">Subtitle text below the title</span>
              </label>
              <input
                type="text"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 shadow-sm transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Key milestones in our story"
              />
            </div>

            {/* Layout Selection */}
            <div className="space-y-3">
              <label className="block">
                <span className="text-sm font-medium text-gray-700">Timeline Layout</span>
                <span className="mt-0.5 block text-xs text-gray-500">Choose how timeline items are displayed</span>
              </label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {Object.entries(TIMELINE_LAYOUTS).map(([key, value]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setLayout(key as TimelineLayout)}
                    className={`group relative rounded-lg border-2 p-4 text-left transition-all ${
                      layout === key
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 bg-white hover:border-purple-300 hover:bg-purple-50/50'
                    }`}
                  >
                    {layout === key && (
                      <div className="absolute right-3 top-3">
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-purple-500">
                          <svg className="h-3 w-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                        </div>
                      </div>
                    )}
                    <div className="pr-8">
                      <h4 className={`text-sm font-semibold ${
                        layout === key ? 'text-purple-900' : 'text-gray-900'
                      }`}>
                        {value.name}
                      </h4>
                      <p className={`mt-1 text-xs ${
                        layout === key ? 'text-purple-700' : 'text-gray-600'
                      }`}>
                        {value.description}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Timeline Items */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
                <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Timeline Items</h2>
                <p className="text-sm text-gray-600">Add and manage timeline events</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleAddItem}
              className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-purple-700"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add Item
            </button>
          </div>

          {items.length === 0 ? (
            <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-8 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="mt-2 text-sm text-gray-600">No timeline items yet. Click "Add Item" to create your first one.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item, index) => (
                <div
                  key={item.id}
                  className="rounded-lg border border-gray-200 bg-gray-50 p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">
                        {item.title || 'Untitled'}
                      </h4>
                      <p className="mt-1 text-sm text-gray-600">
                        {item.date}
                      </p>
                      <p className="mt-2 text-sm text-gray-700">
                        {item.description}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => moveItem(index, 'up')}
                        disabled={index === 0}
                        className="rounded-lg border border-gray-300 bg-white p-2 text-gray-600 shadow-sm transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                        title="Move up"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => moveItem(index, 'down')}
                        disabled={index === items.length - 1}
                        className="rounded-lg border border-gray-300 bg-white p-2 text-gray-600 shadow-sm transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                        title="Move down"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEditItem(item)}
                        className="rounded-lg border border-gray-300 bg-white p-2 text-gray-600 shadow-sm transition-colors hover:bg-gray-50"
                        title="Edit"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteItem(item.id)}
                        className="rounded-lg border border-red-300 bg-white p-2 text-red-600 shadow-sm transition-colors hover:bg-red-50"
                        title="Delete"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Color Customization */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
              <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Color Customization</h2>
              <p className="text-sm text-gray-600">Customize timeline colors</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Background Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={backgroundColor}
                  onChange={(e) => setBackgroundColor(e.target.value)}
                  className="h-10 w-20 cursor-pointer rounded-lg border border-gray-300 shadow-sm"
                />
                <input
                  type="text"
                  value={backgroundColor}
                  onChange={(e) => setBackgroundColor(e.target.value)}
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-900 shadow-sm transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="#ffffff"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Accent Color (Dots/Icons)</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="h-10 w-20 cursor-pointer rounded-lg border border-gray-300 shadow-sm"
                />
                <input
                  type="text"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-900 shadow-sm transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="#10b981"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Timeline Line Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={lineColor}
                  onChange={(e) => setLineColor(e.target.value)}
                  className="h-10 w-20 cursor-pointer rounded-lg border border-gray-300 shadow-sm"
                />
                <input
                  type="text"
                  value={lineColor}
                  onChange={(e) => setLineColor(e.target.value)}
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-900 shadow-sm transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="#d1d5db"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Typography & Buttons */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
              <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Typography & Buttons</h2>
              <p className="text-sm text-gray-600">Customize text styles and button appearance</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Custom Typography & Styles</label>
                <p className="text-xs text-gray-500">Override global CSS with custom styling options</p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={sectionStyle.is_custom || false}
                  onChange={(e) =>
                    setSectionStyle((prev) => ({ ...prev, is_custom: e.target.checked }))
                  }
                  className="peer sr-only"
                />
                <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-purple-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-500 peer-focus:ring-offset-2"></div>
              </label>
            </div>

            {!sectionStyle.is_custom ? (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                <div className="flex items-start gap-3">
                  <svg className="h-5 w-5 shrink-0 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                  </svg>
                  <div>
                    <h4 className="text-sm font-medium text-blue-900">Using Global Styles</h4>
                    <p className="mt-1 text-xs text-blue-700">
                      This section is currently using the global CSS styles defined in your theme settings.
                      Enable custom typography above to override these styles with section-specific options.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <SectionTypographyControls
                  value={sectionStyle}
                  onChange={(updates) =>
                    setSectionStyle((prev) => ({ ...prev, ...updates }))
                  }
                />
              </div>
            )}
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={updating}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:from-purple-700 hover:to-purple-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {updating ? (
              <>
                <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </>
            ) : (
              <>
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
                </svg>
                {isNewSection ? 'Create Timeline Section' : 'Save Changes'}
              </>
            )}
          </button>
        </div>
      </form>

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl rounded-2xl border border-gray-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
              <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900">
              {item.title ? 'Edit Timeline Item' : 'Add Timeline Item'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            aria-label="Close modal"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Title *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 shadow-sm transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Event title"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Date *</label>
              <input
                type="text"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 shadow-sm transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="e.g., January 2023, 2023, Q1 2023"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Description *</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 shadow-sm transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Describe this milestone..."
                rows={4}
                required
              />
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 px-4 py-2 text-sm font-semibold text-white shadow-lg transition-all hover:from-purple-700 hover:to-purple-800"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
                </svg>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-6xl rounded-2xl border border-gray-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
              <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Timeline Live Preview</h2>
              <p className="text-xs text-gray-500">Live Preview</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            aria-label="Close preview"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="max-h-[80vh] overflow-y-auto p-6">
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 shadow-inner">
            <div className="overflow-hidden rounded-lg border-2 border-gray-300 bg-white shadow-sm">
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

                {/* Use placeholder items if no items added yet */}
                {(() => {
                  const displayItems = items.length === 0 ? [
                    { id: 'placeholder-1', title: 'First Milestone', date: 'January 2023', description: 'Add your timeline item description here', order: 0 },
                    { id: 'placeholder-2', title: 'Second Milestone', date: 'March 2023', description: 'Describe what happened at this point', order: 1 },
                    { id: 'placeholder-3', title: 'Third Milestone', date: 'June 2023', description: 'Share more details about this event', order: 2 }
                  ] : items;

                  return (
                    <>
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

                          {displayItems.map((item, index) => {
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

                          {displayItems.map((item) => (
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

                          {displayItems.map((item) => (
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

                          {displayItems.map((item) => (
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
                    </>
                  );
                })()}
              </div>
            )}
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-lg border border-purple-100 bg-purple-50 p-4 mt-4">
            <svg className="h-5 w-5 shrink-0 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p className="text-sm text-purple-900">
              Preview shows how your timeline layout will appear on the website
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
