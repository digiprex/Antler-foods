/**
 * YouTube Settings Page
 *
 * Dashboard-integrated interface for configuring YouTube video settings.
 * Access: /admin/youtube-settings
 */

'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { useState, useEffect } from 'react';
import type { YouTubeConfig } from '@/types/youtube.types';
import { DEFAULT_YOUTUBE_CONFIG } from '@/types/youtube.types';
import styles from '@/components/admin/gallery-settings-form.module.css';

export default function YouTubeSettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const restaurantId = searchParams.get('restaurant_id');
  const restaurantName = searchParams.get('restaurant_name');

  const [config, setConfig] = useState<YouTubeConfig>(DEFAULT_YOUTUBE_CONFIG);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (restaurantId) {
      fetchYouTubeConfig();
    }
  }, [restaurantId]);

  const fetchYouTubeConfig = async () => {
    setLoading(true);
    try {
      const url = `/api/youtube-config?restaurant_id=${restaurantId}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.success && data.data) {
        setConfig(data.data);
      }
    } catch (error) {
      console.error('Error fetching YouTube config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!restaurantId) return;

    setSaving(true);
    try {
      const response = await fetch('/api/youtube-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...config,
          restaurant_id: restaurantId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setToast({ message: 'YouTube settings saved successfully!', type: 'success' });
        setTimeout(() => setToast(null), 3000);
      } else {
        setToast({ message: 'Error saving settings: ' + data.error, type: 'error' });
        setTimeout(() => setToast(null), 3000);
      }
    } catch (error) {
      console.error('Error saving YouTube config:', error);
      setToast({ message: 'Error saving settings', type: 'error' });
      setTimeout(() => setToast(null), 3000);
    } finally {
      setSaving(false);
    }
  };

  const extractVideoId = (url: string): string => {
    if (!url) return '';

    // If it's already just an ID
    if (url.length === 11 && !url.includes('/') && !url.includes('=')) {
      return url;
    }

    // Extract from various YouTube URL formats
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/shorts\/([^&\n?#]+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return url;
  };

  const getEmbedUrl = (videoUrl: string): string => {
    const videoId = extractVideoId(videoUrl);
    if (!videoId) return '';

    const params = new URLSearchParams();
    if (config.autoplay) params.append('autoplay', '1');
    if (config.mute) params.append('mute', '1');
    if (config.loop) params.append('loop', '1');
    if (config.loop) params.append('playlist', videoId); // Required for loop
    if (!config.controls) params.append('controls', '0');

    return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
  };

  if (!restaurantId) {
    return (
      <DashboardLayout>
        <div className={styles.emptyState}>
          <div className={styles.emptyStateIcon}>📺</div>
          <h2 className={styles.emptyStateTitle}>No Restaurant Selected</h2>
          <p className={styles.emptyStateDescription}>
            Please select a restaurant from the dashboard to configure YouTube settings.
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
            <div className={styles.formHeader}>
              <div>
                <h1 className={styles.formTitle}>YouTube Settings</h1>
                <p className={styles.formSubtitle}>
                  Configure YouTube video display for your restaurant website
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
                type="button"
                style={{ whiteSpace: 'nowrap' }}
                disabled={!config.videoUrl}
              >
                <span>👁️</span>
                Preview Video
              </button>
            </div>

            {loading ? (
              <div className={styles.loading}>Loading...</div>
            ) : (
              <div className={styles.form}>
                {/* Enable/Disable */}
                <div className={styles.section}>
                  <h3 className={styles.sectionTitle}>
                    <span className={styles.sectionIcon}>⚙️</span>
                    Display Settings
                  </h3>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>
                      Enable YouTube Section
                      <span className={styles.labelHint}>Show YouTube video on website</span>
                    </label>
                    <select
                      value={config.enabled ? 'true' : 'false'}
                      onChange={(e) => setConfig({ ...config, enabled: e.target.value === 'true' })}
                      className={styles.select}
                    >
                      <option value="true">Enabled</option>
                      <option value="false">Disabled</option>
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>
                      Layout
                      <span className={styles.labelHint}>Video layout style</span>
                    </label>
                    <select
                      value={config.layout || 'default'}
                      onChange={(e) => setConfig({ ...config, layout: e.target.value as any })}
                      className={styles.select}
                    >
                      <option value="default">Default (Centered)</option>
                      <option value="theater">Theater Mode (Wide)</option>
                      <option value="split-left">Split (Video Left)</option>
                      <option value="split-right">Split (Video Right)</option>
                      <option value="background">Background Video</option>
                      <option value="grid">Grid (Multiple Videos)</option>
                    </select>
                  </div>
                </div>

                {/* Video Content */}
                <div className={styles.section}>
                  <h3 className={styles.sectionTitle}>
                    <span className={styles.sectionIcon}>🎬</span>
                    Video Content
                  </h3>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>
                      YouTube URL or Video ID
                      <span className={styles.labelHint}>Full YouTube URL or just the video ID</span>
                    </label>
                    <input
                      type="text"
                      value={config.videoUrl || ''}
                      onChange={(e) => setConfig({ ...config, videoUrl: e.target.value })}
                      className={styles.textInput}
                      placeholder="https://www.youtube.com/watch?v=... or dQw4w9WgXcQ"
                    />
                  </div>

                  {config.showTitle !== false && (
                    <>
                      <div className={styles.formGroup}>
                        <label className={styles.label}>
                          Title
                          <span className={styles.labelHint}>Section heading</span>
                        </label>
                        <input
                          type="text"
                          value={config.title || ''}
                          onChange={(e) => setConfig({ ...config, title: e.target.value })}
                          className={styles.textInput}
                          placeholder="Watch Our Story"
                        />
                      </div>

                      <div className={styles.formGroup}>
                        <label className={styles.label}>
                          Description
                          <span className={styles.labelHint}>Optional description below video</span>
                        </label>
                        <textarea
                          value={config.description || ''}
                          onChange={(e) => setConfig({ ...config, description: e.target.value })}
                          rows={3}
                          className={styles.textArea}
                          placeholder="Discover what makes us special"
                        />
                      </div>
                    </>
                  )}

                  <div className={styles.formGroup}>
                    <label className={styles.label}>
                      Show Title & Description
                      <span className={styles.labelHint}>Display text content above video</span>
                    </label>
                    <select
                      value={config.showTitle !== false ? 'true' : 'false'}
                      onChange={(e) => setConfig({ ...config, showTitle: e.target.value === 'true' })}
                      className={styles.select}
                    >
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </select>
                  </div>
                </div>

                {/* Playback Options */}
                <div className={styles.section}>
                  <h3 className={styles.sectionTitle}>
                    <span className={styles.sectionIcon}>▶️</span>
                    Playback Options
                  </h3>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>
                      Autoplay
                      <span className={styles.labelHint}>Start playing automatically</span>
                    </label>
                    <select
                      value={config.autoplay ? 'true' : 'false'}
                      onChange={(e) => setConfig({ ...config, autoplay: e.target.value === 'true' })}
                      className={styles.select}
                    >
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>
                      Mute
                      <span className={styles.labelHint}>Start with sound muted</span>
                    </label>
                    <select
                      value={config.mute ? 'true' : 'false'}
                      onChange={(e) => setConfig({ ...config, mute: e.target.value === 'true' })}
                      className={styles.select}
                    >
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>
                      Loop
                      <span className={styles.labelHint}>Repeat video continuously</span>
                    </label>
                    <select
                      value={config.loop ? 'true' : 'false'}
                      onChange={(e) => setConfig({ ...config, loop: e.target.value === 'true' })}
                      className={styles.select}
                    >
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>
                      Show Controls
                      <span className={styles.labelHint}>Display video player controls</span>
                    </label>
                    <select
                      value={config.controls !== false ? 'true' : 'false'}
                      onChange={(e) => setConfig({ ...config, controls: e.target.value === 'true' })}
                      className={styles.select}
                    >
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>
                      Aspect Ratio
                      <span className={styles.labelHint}>Video dimensions</span>
                    </label>
                    <select
                      value={config.aspectRatio || '16:9'}
                      onChange={(e) => setConfig({ ...config, aspectRatio: e.target.value as any })}
                      className={styles.select}
                    >
                      <option value="16:9">16:9 (Standard)</option>
                      <option value="4:3">4:3 (Classic)</option>
                      <option value="21:9">21:9 (Ultrawide)</option>
                    </select>
                  </div>
                </div>

                {/* Styling */}
                <div className={styles.section}>
                  <h3 className={styles.sectionTitle}>
                    <span className={styles.sectionIcon}>🎨</span>
                    Styling
                  </h3>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>
                      Background Color
                      <span className={styles.labelHint}>Section background</span>
                    </label>
                    <input
                      type="color"
                      value={config.bgColor || '#000000'}
                      onChange={(e) => setConfig({ ...config, bgColor: e.target.value })}
                      className={styles.textInput}
                      style={{ height: '50px', cursor: 'pointer' }}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>
                      Text Color
                      <span className={styles.labelHint}>Title and description color</span>
                    </label>
                    <input
                      type="color"
                      value={config.textColor || '#ffffff'}
                      onChange={(e) => setConfig({ ...config, textColor: e.target.value })}
                      className={styles.textInput}
                      style={{ height: '50px', cursor: 'pointer' }}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>
                      Max Width
                      <span className={styles.labelHint}>Maximum container width</span>
                    </label>
                    <input
                      type="text"
                      value={config.maxWidth || '1200px'}
                      onChange={(e) => setConfig({ ...config, maxWidth: e.target.value })}
                      className={styles.textInput}
                      placeholder="1200px"
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className={styles.formActions} style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
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
                        Save YouTube Settings
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
      {showPreview && config.videoUrl && (
        <>
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '2rem',
            }}
            onClick={() => setShowPreview(false)}
          >
            <div
              style={{
                maxWidth: config.maxWidth || '1200px',
                width: '100%',
                position: 'relative',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowPreview(false)}
                style={{
                  position: 'absolute',
                  top: '-3rem',
                  right: '0',
                  background: 'white',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: '#000',
                  width: '40px',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '50%',
                }}
              >
                ×
              </button>

              {config.showTitle !== false && (config.title || config.description) && (
                <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
                  {config.title && (
                    <h2 style={{ fontSize: '2.5rem', fontWeight: '700', color: config.textColor || '#ffffff', marginBottom: '0.5rem' }}>
                      {config.title}
                    </h2>
                  )}
                  {config.description && (
                    <p style={{ fontSize: '1.25rem', color: config.textColor || '#ffffff', opacity: 0.9 }}>
                      {config.description}
                    </p>
                  )}
                </div>
              )}

              <div
                style={{
                  position: 'relative',
                  paddingBottom: config.aspectRatio === '4:3' ? '75%' : config.aspectRatio === '21:9' ? '42.85%' : '56.25%',
                  height: 0,
                  overflow: 'hidden',
                  borderRadius: '12px',
                }}
              >
                <iframe
                  src={getEmbedUrl(config.videoUrl)}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    border: 'none',
                    borderRadius: '12px',
                  }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>
          </div>
        </>
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
