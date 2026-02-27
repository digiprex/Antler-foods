/**
 * Dynamic Reviews Component
 *
 * Fetches and displays reviews based on restaurant configuration
 */

'use client';

import { useEffect, useState } from 'react';
import Reviews from './reviews';
import type { ReviewConfig, Review } from '@/types/review.types';

interface DynamicReviewsProps {
  restaurantId?: string;
  pageId?: string;
  showLoading?: boolean;
  configData?: Partial<ReviewConfig>;
}

export default function DynamicReviews({ restaurantId, pageId, showLoading = false, configData }: DynamicReviewsProps) {
  const [config, setConfig] = useState<ReviewConfig | null>(configData || null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(!configData);

  useEffect(() => {
    // If configData is provided, use it directly
    if (configData) {
      setConfig(configData as ReviewConfig);
      setLoading(false);
      // Note: We don't fetch reviews here because configData might already include them
      // or they should be fetched separately if needed
      return;
    }

    const fetchData = async () => {
      if (!restaurantId) return;

      setLoading(true);
      try {
        // Fetch review config
        const configUrl = `/api/review-config?restaurant_id=${restaurantId}${pageId ? `&page_id=${pageId}` : ''}`;
        const configResponse = await fetch(configUrl);
        const configData = await configResponse.json();

        if (configData.success && configData.data) {
          setConfig(configData.data);

          // Fetch reviews
          const reviewsUrl = `/api/reviews?restaurant_id=${restaurantId}${configData.data.maxReviews ? `&limit=${configData.data.maxReviews}` : ''}`;
          const reviewsResponse = await fetch(reviewsUrl);
          const reviewsData = await reviewsResponse.json();

          if (reviewsData.success) {
            setReviews(reviewsData.data);
          }
        }
      } catch (error) {
        console.error('Error fetching reviews:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [restaurantId, pageId, configData]);

  if (loading && showLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
        Loading reviews...
      </div>
    );
  }

  if (!config || reviews.length === 0) {
    return null;
  }

  return <Reviews {...config} reviews={reviews} />;
}
