'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';

interface Template {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  category: string;
}

// Placeholder templates - will be replaced with database data in the future
const PLACEHOLDER_TEMPLATES: Template[] = [
  {
    id: 'modern-restaurant',
    name: 'Modern Restaurant',
    description: 'Clean and contemporary design perfect for upscale dining',
    thumbnail: '/templates/modern-restaurant.jpg',
    category: 'Fine Dining',
  },
  {
    id: 'casual-cafe',
    name: 'Casual Cafe',
    description: 'Warm and inviting layout ideal for cafes and bistros',
    thumbnail: '/templates/casual-cafe.jpg',
    category: 'Casual',
  },
  {
    id: 'fast-food',
    name: 'Fast Food',
    description: 'Bold and vibrant design for quick service restaurants',
    thumbnail: '/templates/fast-food.jpg',
    category: 'Quick Service',
  },
  {
    id: 'elegant-fine-dining',
    name: 'Elegant Fine Dining',
    description: 'Sophisticated and luxurious design for premium restaurants',
    thumbnail: '/templates/elegant-fine-dining.jpg',
    category: 'Fine Dining',
  },
  {
    id: 'pizzeria',
    name: 'Pizzeria Classic',
    description: 'Traditional Italian-inspired layout for pizza restaurants',
    thumbnail: '/templates/pizzeria.jpg',
    category: 'Italian',
  },
  {
    id: 'asian-fusion',
    name: 'Asian Fusion',
    description: 'Modern design with Asian aesthetic elements',
    thumbnail: '/templates/asian-fusion.jpg',
    category: 'Asian',
  },
];

export default function SelectThemeForm() {
  const searchParams = useSearchParams();
  const restaurantId = searchParams.get('restaurant_id');
  const restaurantName = searchParams.get('restaurant_name');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplate(templateId);
  };

  const handleContinue = async () => {
    if (!selectedTemplate || !restaurantId || !restaurantName) {
      return;
    }

    setIsCreating(true);
    setErrorMessage(null);

    try {
      // Initialize website: create staging domain and system pages
      const response = await fetch(`/api/restaurants/${encodeURIComponent(restaurantId)}/initialize-website`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          restaurantName,
          templateId: selectedTemplate,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to initialize website');
      }

      // Navigate to restaurant list page without selecting the restaurant
      window.location.href = `/dashboard/admin/restaurants`;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to initialize website';
      setErrorMessage(message);
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg">
          <svg className="h-7 w-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
          </svg>
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Select a Theme
          </h1>
          <p className="text-sm text-gray-600">
            Choose a template for {restaurantName || 'your restaurant'}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-6 py-5">
          <h2 className="text-xl font-bold text-gray-900">Available Templates</h2>
          <p className="mt-1 text-sm text-gray-600">
            Select a template to start building your restaurant website
          </p>
        </div>

        <div className="grid gap-6 p-6 md:grid-cols-2 lg:grid-cols-3">
          {PLACEHOLDER_TEMPLATES.map((template) => (
            <button
              key={template.id}
              type="button"
              onClick={() => handleSelectTemplate(template.id)}
              className={`group relative overflow-hidden rounded-xl border-2 transition-all ${
                selectedTemplate === template.id
                  ? 'border-purple-500 bg-purple-50 shadow-lg'
                  : 'border-gray-200 bg-white hover:border-purple-300 hover:shadow-md'
              }`}
            >
              <div className="aspect-[4/3] overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200">
                <div className="flex h-full items-center justify-center">
                  <svg className="h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                  </svg>
                </div>
              </div>

              {selectedTemplate === template.id && (
                <div className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-purple-600 shadow-lg">
                  <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}

              <div className="p-4">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-lg font-bold text-gray-900">{template.name}</h3>
                  <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-semibold text-purple-700">
                    {template.category}
                  </span>
                </div>
                <p className="text-sm text-gray-600">{template.description}</p>
              </div>
            </button>
          ))}
        </div>

        {errorMessage && (
          <div className="mx-6 mb-0 mt-6 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
            <svg className="h-5 w-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-sm font-medium text-red-900">{errorMessage}</p>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-6 py-4">
          <button
            type="button"
            onClick={() => window.history.back()}
            disabled={isCreating}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>

          <button
            type="button"
            onClick={handleContinue}
            disabled={!selectedTemplate || isCreating}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-500 to-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:from-purple-600 hover:to-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isCreating ? (
              <>
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Initializing Website...
              </>
            ) : (
              <>
                Continue
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
