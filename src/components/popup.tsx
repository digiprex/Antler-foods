/**
 * Universal Popup Component
 *
 * Displays a configurable popup based on settings from the database
 * Shows on homepage with configurable delay and frequency
 */

'use client';

import { useEffect, useState } from 'react';
import type { PopupConfig } from '@/types/popup.types';

interface PopupProps {
  restaurantId: string;
}

export default function Popup({ restaurantId }: PopupProps) {
  const [config, setConfig] = useState<PopupConfig | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetchPopupConfig();
  }, [restaurantId]);

  const fetchPopupConfig = async () => {
    try {
      const response = await fetch(
        `/api/popup-config?restaurant_id=${encodeURIComponent(restaurantId)}`
      );
      const data = await response.json();

      if (data.success && data.data && data.data.enabled) {
        setConfig(data.data);

        // Check if popup should be shown based on frequency
        if (shouldShowPopup(data.data.frequency || 'once')) {
          // Show popup after delay
          if (data.data.showOnLoad) {
            const delay = (data.data.delay || 2) * 1000;
            setTimeout(() => {
              setIsVisible(true);
              recordPopupView(data.data.frequency || 'once');
            }, delay);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching popup config:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const shouldShowPopup = (frequency: string): boolean => {
    const storageKey = `popup_${restaurantId}_last_shown`;
    const lastShown = localStorage.getItem(storageKey);

    if (!lastShown) return true;

    if (frequency === 'always') return true;
    if (frequency === 'once') return false;

    const lastShownDate = new Date(lastShown);
    const now = new Date();
    const daysDiff = Math.floor((now.getTime() - lastShownDate.getTime()) / (1000 * 60 * 60 * 24));

    if (frequency === 'daily' && daysDiff >= 1) return true;
    if (frequency === 'weekly' && daysDiff >= 7) return true;

    return false;
  };

  const recordPopupView = (frequency: string) => {
    if (frequency !== 'always') {
      const storageKey = `popup_${restaurantId}_last_shown`;
      localStorage.setItem(storageKey, new Date().toISOString());
    }
  };

  const handleClose = () => {
    setIsVisible(false);
  };

  const handleNewsletterSubmit = async () => {
    if (!email.trim()) {
      setSubmitMessage({ text: 'Please enter your email address', type: 'error' });
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setSubmitMessage({ text: 'Please enter a valid email address', type: 'error' });
      return;
    }

    setIsSubmitting(true);
    setSubmitMessage(null);

    try {
      const response = await fetch('/api/newsletter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          restaurant_id: restaurantId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSubmitMessage({ text: 'Successfully subscribed to newsletter!', type: 'success' });
        setEmail('');
        // Close popup after a short delay
        setTimeout(() => {
          handleClose();
        }, 2000);
      } else {
        setSubmitMessage({ text: data.error || 'Failed to subscribe', type: 'error' });
      }
    } catch (error) {
      console.error('Error subscribing to newsletter:', error);
      setSubmitMessage({ text: 'Failed to subscribe. Please try again.', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleButtonClick = () => {
    const isNewsletterLayout = config?.layout === 'newsletter-image' || config?.layout === 'newsletter-text';
    
    if (isNewsletterLayout) {
      handleNewsletterSubmit();
    } else {
      if (config?.buttonUrl) {
        window.location.href = config.buttonUrl;
      }
      handleClose();
    }
  };

  const renderPopupContent = () => {
    if (!config) return null;

    const layout = config.layout || 'default';

    // Common button component
    const renderButton = () => {
      if (config.showButton === false || !config.buttonText) return null;
      return (
        <button
          onClick={handleButtonClick}
          disabled={isSubmitting}
          style={{
            backgroundColor: config.buttonBgColor || '#000000',
            color: config.buttonTextColor || '#ffffff',
            padding: '0.875rem 2rem',
            borderRadius: '8px',
            border: 'none',
            fontSize: '1rem',
            fontWeight: '600',
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            width: '100%',
            transition: 'opacity 0.2s',
            opacity: isSubmitting ? 0.7 : 1,
          }}
          onMouseEnter={(e) => {
            if (!isSubmitting) {
              e.currentTarget.style.opacity = '0.9';
            }
          }}
          onMouseLeave={(e) => {
            if (!isSubmitting) {
              e.currentTarget.style.opacity = '1';
            }
          }}
        >
          {isSubmitting ? 'Submitting...' : config.buttonText}
        </button>
      );
    };

    // Submit message component
    const renderSubmitMessage = () => {
      if (!submitMessage) return null;
      return (
        <div
          style={{
            padding: '0.75rem',
            borderRadius: '6px',
            marginBottom: '1rem',
            backgroundColor: submitMessage.type === 'success' ? '#dcfce7' : '#fef2f2',
            color: submitMessage.type === 'success' ? '#166534' : '#dc2626',
            border: `1px solid ${submitMessage.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
            fontSize: '0.875rem',
            textAlign: 'center',
          }}
        >
          {submitMessage.text}
        </div>
      );
    };

    // Default Layout - Image on top
    if (layout === 'default') {
      return (
        <>
          {config.imageUrl && (
            <div style={{ marginBottom: '1.5rem' }}>
              <img
                src={config.imageUrl}
                alt={config.title || 'Popup'}
                style={{
                  width: '100%',
                  height: 'auto',
                  borderRadius: '12px 12px 0 0',
                  objectFit: 'cover',
                  maxHeight: '300px',
                }}
              />
            </div>
          )}
          <div style={{ padding: config.imageUrl ? '0 2rem 2rem' : '3rem 2rem 2rem' }}>
            {config.title && (
              <h2 style={{ fontSize: '1.875rem', fontWeight: '700', marginBottom: '1rem', color: config.textColor || '#000000' }}>
                {config.title}
              </h2>
            )}
            {config.description && (
              <p style={{ fontSize: '1.125rem', lineHeight: '1.75', marginBottom: '1.5rem', color: config.textColor || '#000000', opacity: 0.9 }}>
                {config.description}
              </p>
            )}
            {renderButton()}
          </div>
        </>
      );
    }

    // Image Left Layout
    if (layout === 'image-left') {
      return (
        <div style={{ display: 'flex', flexDirection: 'row', gap: '2rem', padding: '2rem' }}>
          {config.imageUrl && (
            <div style={{ flex: '0 0 40%' }}>
              <img
                src={config.imageUrl}
                alt={config.title || 'Popup'}
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '8px',
                  objectFit: 'cover',
                  minHeight: '250px',
                }}
              />
            </div>
          )}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            {config.title && (
              <h2 style={{ fontSize: '1.875rem', fontWeight: '700', marginBottom: '1rem', color: config.textColor || '#000000' }}>
                {config.title}
              </h2>
            )}
            {config.description && (
              <p style={{ fontSize: '1.125rem', lineHeight: '1.75', marginBottom: '1.5rem', color: config.textColor || '#000000', opacity: 0.9 }}>
                {config.description}
              </p>
            )}
            {renderButton()}
          </div>
        </div>
      );
    }

    // Image Right Layout
    if (layout === 'image-right') {
      return (
        <div style={{ display: 'flex', flexDirection: 'row-reverse', gap: '2rem', padding: '2rem' }}>
          {config.imageUrl && (
            <div style={{ flex: '0 0 40%' }}>
              <img
                src={config.imageUrl}
                alt={config.title || 'Popup'}
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '8px',
                  objectFit: 'cover',
                  minHeight: '250px',
                }}
              />
            </div>
          )}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            {config.title && (
              <h2 style={{ fontSize: '1.875rem', fontWeight: '700', marginBottom: '1rem', color: config.textColor || '#000000' }}>
                {config.title}
              </h2>
            )}
            {config.description && (
              <p style={{ fontSize: '1.125rem', lineHeight: '1.75', marginBottom: '1.5rem', color: config.textColor || '#000000', opacity: 0.9 }}>
                {config.description}
              </p>
            )}
            {renderButton()}
          </div>
        </div>
      );
    }

    // Background Image Layout
    if (layout === 'image-bg') {
      return (
        <div
          style={{
            backgroundImage: config.imageUrl ? `url(${config.imageUrl})` : 'none',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            borderRadius: '12px',
            padding: '3rem 2rem',
            minHeight: '400px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            position: 'relative',
          }}
        >
          <div
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              padding: '2rem',
              borderRadius: '8px',
            }}
          >
            {config.title && (
              <h2 style={{ fontSize: '1.875rem', fontWeight: '700', marginBottom: '1rem', color: '#ffffff' }}>
                {config.title}
              </h2>
            )}
            {config.description && (
              <p style={{ fontSize: '1.125rem', lineHeight: '1.75', marginBottom: '1.5rem', color: '#ffffff', opacity: 0.9 }}>
                {config.description}
              </p>
            )}
            {renderButton()}
          </div>
        </div>
      );
    }

    // Image Only Layout
    if (layout === 'image-only') {
      return (
        <div style={{ padding: 0 }}>
          {config.imageUrl && (
            <img
              src={config.imageUrl}
              alt={config.title || 'Popup'}
              style={{
                width: '100%',
                height: 'auto',
                borderRadius: '12px',
                objectFit: 'cover',
                maxHeight: '500px',
              }}
            />
          )}
        </div>
      );
    }

    // Newsletter with Image
    if (layout === 'newsletter-image') {
      return (
        <div style={{ padding: '2rem' }}>
          {config.imageUrl && (
            <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
              <img
                src={config.imageUrl}
                alt={config.title || 'Popup'}
                style={{
                  width: '120px',
                  height: '120px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  margin: '0 auto',
                }}
              />
            </div>
          )}
          <div style={{ textAlign: 'center' }}>
            {config.title && (
              <h2 style={{ fontSize: '1.875rem', fontWeight: '700', marginBottom: '1rem', color: config.textColor || '#000000' }}>
                {config.title}
              </h2>
            )}
            {config.description && (
              <p style={{ fontSize: '1.125rem', lineHeight: '1.75', marginBottom: '1.5rem', color: config.textColor || '#000000', opacity: 0.9 }}>
                {config.description}
              </p>
            )}
            {renderSubmitMessage()}
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting}
              style={{
                width: '100%',
                padding: '0.875rem',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                fontSize: '1rem',
                marginBottom: '1rem',
                opacity: isSubmitting ? 0.7 : 1,
              }}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleButtonClick();
                }
              }}
            />
            {renderButton()}
          </div>
        </div>
      );
    }

    // Newsletter Text Only
    if (layout === 'newsletter-text') {
      return (
        <div style={{ padding: '3rem 2rem', textAlign: 'center' }}>
          {config.title && (
            <h2 style={{ fontSize: '1.875rem', fontWeight: '700', marginBottom: '1rem', color: config.textColor || '#000000' }}>
              {config.title}
            </h2>
          )}
          {config.description && (
            <p style={{ fontSize: '1.125rem', lineHeight: '1.75', marginBottom: '1.5rem', color: config.textColor || '#000000', opacity: 0.9 }}>
              {config.description}
            </p>
          )}
          {renderSubmitMessage()}
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isSubmitting}
            style={{
              width: '100%',
              padding: '0.875rem',
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
              fontSize: '1rem',
              marginBottom: '1rem',
              opacity: isSubmitting ? 0.7 : 1,
            }}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleButtonClick();
              }
            }}
          />
          {renderButton()}
        </div>
      );
    }

    return null;
  };

  if (isLoading || !config || !isVisible) {
    return null;
  }

  return (
    <>
      {/* Overlay */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: config.overlayColor || 'rgba(0, 0, 0, 0.5)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          animation: 'fadeIn 0.3s ease-in-out',
        }}
        onClick={handleClose}
      >
        {/* Popup Content */}
        <div
          style={{
            backgroundColor: config.bgColor || '#ffffff',
            color: config.textColor || '#000000',
            borderRadius: '12px',
            maxWidth: config.maxWidth || '500px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto',
            position: 'relative',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            animation: 'slideUp 0.3s ease-out',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <button
            onClick={handleClose}
            style={{
              position: 'absolute',
              top: '1rem',
              right: '1rem',
              background: 'transparent',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              color: config.layout === 'image-bg' ? '#ffffff' : config.textColor || '#000000',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%',
              transition: 'background-color 0.2s',
              zIndex: 10,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            ×
          </button>

          {/* Dynamic Content Based on Layout */}
          {renderPopupContent()}
        </div>
      </div>

      {/* Animations */}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideUp {
          from {
            transform: translateY(30px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </>
  );
}
