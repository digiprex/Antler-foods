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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!restaurantId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        let nextConfig: ReviewConfig | null = null;

        if (configData) {
          nextConfig = configData as ReviewConfig;
          setConfig(nextConfig);
        } else {
          // Fetch review config
          const configUrl = `/api/review-config?restaurant_id=${restaurantId}${pageId ? `&page_id=${pageId}` : ''}`;
          const configResponse = await fetch(configUrl);
          const fetchedConfigData = await configResponse.json();

          if (fetchedConfigData.success && fetchedConfigData.data) {
            nextConfig = fetchedConfigData.data;
            setConfig(nextConfig);
          } else {
            setConfig(null);
          }
        }

        if (nextConfig) {
          // Always fetch reviews, including when config is passed from page template
          const reviewsUrl = `/api/reviews?restaurant_id=${restaurantId}${nextConfig.maxReviews ? `&limit=${nextConfig.maxReviews}` : ''}`;
          const reviewsResponse = await fetch(reviewsUrl);
          const reviewsData = await reviewsResponse.json();

          if (reviewsData.success) {
            setReviews(Array.isArray(reviewsData.data) ? reviewsData.data : []);
          } else {
            setReviews([]);
          }
        } else {
          setReviews([]);
        }
      } catch (error) {
        console.error('Error fetching reviews:', error);
        setReviews([]);
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

  if (!config) {
    return null;
  }

  return <Reviews {...config} reviews={reviews} restaurantId={restaurantId} />;
}
