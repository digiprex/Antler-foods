'use client';

/**
 * Dashboard Error Boundary
 * Catches errors in the dashboard routes
 */

import { useEffect } from 'react';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Dashboard error:', error);
  }, [error]);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
    }}>
      <div style={{
        maxWidth: '600px',
        textAlign: 'center',
      }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>
          Something went wrong!
        </h2>
        <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
          {error.message || 'An error occurred while loading the dashboard.'}
        </p>
        <button
          onClick={reset}
          style={{
            backgroundColor: '#667eea',
            color: 'white',
            padding: '0.5rem 1.5rem',
            borderRadius: '0.5rem',
            border: 'none',
            cursor: 'pointer',
            fontSize: '1rem',
          }}
        >
          Try again
        </button>
      </div>
    </div>
  );
}
