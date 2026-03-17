/**
 * Review Layout Utilities
 *
 * Provides utility functions to access review layout configurations from JSON
 */

import reviewLayoutsData from '@/data/review-layouts.json';
import type { ReviewConfig } from '@/types/review.types';

export type ReviewLayoutValue = 'grid' | 'slider' | 'list';
export type ReviewAnimationValue = NonNullable<ReviewConfig['animationStyle']>;

interface ReviewLayoutOption {
  value: ReviewLayoutValue;
  name: string;
  description: string;
  support: string;
  accent: string;
}

interface ReviewAnimationOption {
  value: ReviewAnimationValue;
  name: string;
  description: string;
}

/**
 * Get all review layout options formatted for form usage
 */
export function getReviewLayoutOptions(): ReviewLayoutOption[] {
  return reviewLayoutsData.layouts.map(layout => ({
    value: layout.id as ReviewLayoutValue,
    name: layout.name,
    description: layout.description,
    support: layout.support,
    accent: layout.accent,
  }));
}

/**
 * Get a specific review layout by ID
 */
export function getReviewLayoutById(layoutId: ReviewLayoutValue): ReviewLayoutOption | undefined {
  const layout = reviewLayoutsData.layouts.find(layout => layout.id === layoutId);
  if (!layout) return undefined;

  return {
    value: layout.id as ReviewLayoutValue,
    name: layout.name,
    description: layout.description,
    support: layout.support,
    accent: layout.accent,
  };
}

/**
 * Get review layout name by ID
 */
export function getReviewLayoutName(layoutId: ReviewLayoutValue): string {
  const layout = getReviewLayoutById(layoutId);
  return layout?.name || layoutId;
}

/**
 * Get review layout description by ID
 */
export function getReviewLayoutDescription(layoutId: ReviewLayoutValue): string {
  const layout = getReviewLayoutById(layoutId);
  return layout?.description || '';
}

/**
 * Get all review animation options formatted for form usage
 */
export function getReviewAnimationOptions(): ReviewAnimationOption[] {
  return reviewLayoutsData.animations.map(animation => ({
    value: animation.id as ReviewAnimationValue,
    name: animation.name,
    description: animation.description,
  }));
}

/**
 * Get a specific review animation by ID
 */
export function getReviewAnimationById(animationId: ReviewAnimationValue): ReviewAnimationOption | undefined {
  const animation = reviewLayoutsData.animations.find(animation => animation.id === animationId);
  if (!animation) return undefined;

  return {
    value: animation.id as ReviewAnimationValue,
    name: animation.name,
    description: animation.description,
  };
}

/**
 * Get review animation name by ID
 */
export function getReviewAnimationName(animationId: ReviewAnimationValue): string {
  const animation = getReviewAnimationById(animationId);
  return animation?.name || animationId;
}

/**
 * Check if a layout ID is valid
 */
export function isValidReviewLayout(layoutId: string): layoutId is ReviewLayoutValue {
  return reviewLayoutsData.layouts.some(layout => layout.id === layoutId);
}

/**
 * Check if an animation ID is valid
 */
export function isValidReviewAnimation(animationId: string): animationId is ReviewAnimationValue {
  return reviewLayoutsData.animations.some(animation => animation.id === animationId);
}
