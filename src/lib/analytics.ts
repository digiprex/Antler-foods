/**
 * Analytics Tracking Utilities
 * 
 * Provides utilities for tracking custom events with Umami analytics.
 * This includes "add to cart", "signup", and other user interaction events.
 */

'use client';

import { useCallback } from 'react';

declare global {
  interface Window {
    umami?: {
      track: (eventName: string, eventData?: Record<string, any>) => void;
    };
  }
}

export interface AddToCartEventData {
  item_name: string;
  item_id?: string;
  category?: string;
  price?: number;
  quantity?: number;
  restaurant_id?: string;
  restaurant_name?: string;
}

export interface SignupEventData {
  method?: 'email' | 'google' | 'facebook' | 'other';
  user_type?: 'customer' | 'restaurant_owner' | 'admin';
  restaurant_id?: string;
  source?: string;
}

export interface AnalyticsEventData {
  event_type: 'add_to_cart' | 'signup' | 'custom';
  data?: Record<string, any>;
}

/**
 * Hook for tracking analytics events
 */
export function useAnalytics() {
  const trackEvent = useCallback((eventName: string, eventData?: Record<string, any>) => {
    try {
      // Check if Umami is available
      if (typeof window !== 'undefined' && window.umami?.track) {
        window.umami.track(eventName, eventData);
        console.log('📊 Analytics event tracked:', eventName, eventData);
      } else {
        console.log('📊 Analytics not available, event would be:', eventName, eventData);
      }
    } catch (error) {
      console.error('Failed to track analytics event:', error);
    }
  }, []);

  const trackAddToCart = useCallback((data: AddToCartEventData) => {
    trackEvent('add_to_cart', {
      item_name: data.item_name,
      item_id: data.item_id,
      category: data.category,
      price: data.price,
      quantity: data.quantity || 1,
      restaurant_id: data.restaurant_id,
      restaurant_name: data.restaurant_name,
      timestamp: new Date().toISOString(),
    });
  }, [trackEvent]);

  const trackSignup = useCallback((data: SignupEventData) => {
    trackEvent('signup', {
      method: data.method || 'email',
      user_type: data.user_type || 'customer',
      restaurant_id: data.restaurant_id,
      source: data.source,
      timestamp: new Date().toISOString(),
    });
  }, [trackEvent]);

  const trackCustomEvent = useCallback((eventName: string, eventData?: Record<string, any>) => {
    trackEvent(eventName, {
      ...eventData,
      timestamp: new Date().toISOString(),
    });
  }, [trackEvent]);

  return {
    trackEvent,
    trackAddToCart,
    trackSignup,
    trackCustomEvent,
  };
}

/**
 * Utility function to track events without hooks (for use in non-React contexts)
 */
export function trackAnalyticsEvent(eventName: string, eventData?: Record<string, any>) {
  try {
    if (typeof window !== 'undefined' && window.umami?.track) {
      window.umami.track(eventName, eventData);
      console.log('📊 Analytics event tracked:', eventName, eventData);
    } else {
      console.log('📊 Analytics not available, event would be:', eventName, eventData);
    }
  } catch (error) {
    console.error('Failed to track analytics event:', error);
  }
}

/**
 * Utility function to track add to cart events
 */
export function trackAddToCartEvent(data: AddToCartEventData) {
  trackAnalyticsEvent('add_to_cart', {
    item_name: data.item_name,
    item_id: data.item_id,
    category: data.category,
    price: data.price,
    quantity: data.quantity || 1,
    restaurant_id: data.restaurant_id,
    restaurant_name: data.restaurant_name,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Utility function to track signup events
 */
export function trackSignupEvent(data: SignupEventData) {
  trackAnalyticsEvent('signup', {
    method: data.method || 'email',
    user_type: data.user_type || 'customer',
    restaurant_id: data.restaurant_id,
    source: data.source,
    timestamp: new Date().toISOString(),
  });
}