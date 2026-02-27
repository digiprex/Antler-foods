/**
 * Dynamic Hero Component
 * 
 * Fetches hero configuration from API and renders the hero section
 * Similar to DynamicNavbar and DynamicFooter components
 */

'use client';

import Hero from '@/components/hero';
import { useHeroConfig } from '@/hooks/use-hero-config';
import type { HeroConfig } from '@/types/hero.types';

interface DynamicHeroProps {
  /**
   * Restaurant ID to fetch configuration for
   */
  restaurantId?: string;

  /**
   * Fallback configuration if API fails
   */
  fallbackConfig?: Partial<HeroConfig>;

  /**
   * Pre-fetched hero configuration (skips API call)
   */
  configData?: Partial<HeroConfig>;

  /**
   * Whether to show loading state
   */
  showLoading?: boolean;
}

export default function DynamicHero({
  restaurantId, // Restaurant ID should be provided dynamically
  fallbackConfig,
  configData,
  showLoading = true
}: DynamicHeroProps) {
  console.log('[DynamicHero] Component rendered with configData:', configData);

  const { config, loading, error } = useHeroConfig({
    restaurantId,
    fetchOnMount: !configData, // Skip fetch if config data is provided
    overrideConfig: configData, // Use provided config if available
  });

  console.log('[DynamicHero] Hook returned - config:', config, 'loading:', loading, 'error:', error);

  // Show loading state
  if (loading && showLoading) {
    return (
      <div style={{
        minHeight: '400px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f9fafb'
      }}>
        <div style={{
          textAlign: 'center',
          color: '#6b7280'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid #e5e7eb',
            borderTop: '3px solid #667eea',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem'
          }}></div>
          <p>Loading hero section...</p>
        </div>
      </div>
    );
  }

  // Show error state with fallback
  if (error && !config) {
    // Use fallback configuration if provided
    if (fallbackConfig) {
      return <Hero {...fallbackConfig} />;
    }
    
    // Default fallback hero
    return (
      <Hero
        headline="Welcome to Our Restaurant"
        subheadline="Experience culinary excellence"
        description="Discover exceptional dining with fresh ingredients and innovative flavors"
        primaryButton={{
          label: 'View Menu',
          href: '/menu',
          variant: 'primary'
        }}
        secondaryButton={{
          label: 'Book a Table',
          href: '/reservations',
          variant: 'outline'
        }}
        layout="centered-large"
        bgColor="#ffffff"
        textColor="#000000"
        textAlign="center"
        minHeight="600px"
      />
    );
  }

  // Render hero with fetched configuration
  if (config) {
    return <Hero {...config} />;
  }

  // Fallback if no config available
  return null;
}