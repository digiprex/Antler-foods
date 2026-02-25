'use client';

/**
 * Home Page
 *
 * Dynamic page demonstrating the dynamic navbar and hero in action
 * Automatically resolves restaurant ID from domain
 */

import { useEffect, useState } from 'react';
import DynamicHero from '@/components/dynamic-hero';
import DynamicFAQ from '@/components/dynamic-faq';

export default function HomePage() {
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Get restaurant ID from domain and fetch page_id for the home page
    const fetchRestaurantData = async () => {
      try {
        setLoading(true);
        
        // Get current domain
        const domain = window.location.host;
        
        // Resolve restaurant ID from domain using hero config API (which has domain resolution built-in)
        // Don't encode the domain since it should match exactly what's in the database
        // Also pass the URL slug to get page_id
        const heroResponse = await fetch(`/api/hero-config?domain=${domain}&url_slug=home`);
        
        if (!heroResponse.ok) {
          throw new Error('Failed to resolve restaurant from domain');
        }
        
        const heroData = await heroResponse.json();
        
        if (!heroData.success) {
          throw new Error(heroData.error || 'Failed to get restaurant configuration');
        }
        
        // Extract restaurant_id from hero config response
        const resolvedRestaurantId = heroData.data?.restaurant_id;
        
        if (!resolvedRestaurantId) {
          throw new Error('No restaurant found for this domain');
        }
        
        setRestaurantId(resolvedRestaurantId);
        console.log('Successfully resolved restaurant from domain:', domain, '->', resolvedRestaurantId);
        
        // Page lookup is now handled by the hero config API itself
        console.log('Page lookup will be handled by configuration APIs');
        
      } catch (error) {
        console.error('Error fetching restaurant data:', error);
        setError(error instanceof Error ? error.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchRestaurantData();
  }, []);

  // Show loading state
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#f9fafb',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ textAlign: 'center' }}>
          <h2>Loading...</h2>
        </div>
      </div>
    );
  }

  // Show error state
  if (error || !restaurantId) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#f9fafb',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ textAlign: 'center', color: '#dc2626' }}>
          <h2>Error</h2>
          <p>{error || 'No restaurant found for this domain'}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      {/* Navbar is automatically rendered by ConditionalNavbar in root layout */}
      
      {/* Dynamic Hero Section */}
      <DynamicHero
        restaurantId={restaurantId}
        showLoading={true}
        fallbackConfig={{
          headline: "Welcome to Antler Foods",
          subheadline: "Experience culinary excellence",
          description: "Experience the finest dining with our carefully curated menu and exceptional service.",
          primaryButton: {
            label: 'View Menu',
            href: '/menu',
            variant: 'primary'
          },
          secondaryButton: {
            label: 'Order Online',
            href: '/order',
            variant: 'outline'
          },
          layout: 'centered-large',
          bgColor: '#ffffff',
          textColor: '#000000',
          textAlign: 'center',
          minHeight: '600px'
        }}
      />


      {/* FAQ Section */}
      <DynamicFAQ
        restaurantId={restaurantId}
        showLoading={true}
      />


    </div>
  );
}
