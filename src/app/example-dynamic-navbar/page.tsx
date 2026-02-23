/**
 * Example Page Using Dynamic Navbar
 * 
 * This page demonstrates how to use the DynamicNavbar component
 * in a real application.
 */

import DynamicNavbar from '@/components/dynamic-navbar';

export default function ExamplePage() {
  return (
    <div>
      {/* Dynamic Navbar - fetches configuration from API */}
      <DynamicNavbar showLoadingSkeleton={true} />
      
      {/* Page Content */}
      <main style={{ paddingTop: '100px', minHeight: '100vh' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
          <h1>Dynamic Navbar Example</h1>
          
          <section style={{ marginTop: '2rem' }}>
            <h2>Features</h2>
            <ul>
              <li>✅ Logo dynamically loaded from database/API</li>
              <li>✅ Menu items fetched from database</li>
              <li>✅ "Order Online" button text and link configurable</li>
              <li>✅ All styling options controllable via API</li>
              <li>✅ Automatic fallback to defaults on error</li>
              <li>✅ Loading state with skeleton</li>
            </ul>
          </section>
          
          <section style={{ marginTop: '2rem' }}>
            <h2>Current Configuration</h2>
            <p>
              The navbar above is loading its configuration from{' '}
              <code>/api/navbar-config</code>
            </p>
            <p>
              To customize it, edit the API response or connect it to your database.
            </p>
          </section>
          
          <section style={{ marginTop: '2rem' }}>
            <h2>How It Works</h2>
            <ol>
              <li>Component mounts and fetches config from API</li>
              <li>API returns navbar configuration (logo, menu items, button)</li>
              <li>Component renders navbar with fetched data</li>
              <li>If API fails, falls back to default configuration</li>
            </ol>
          </section>
          
          <section style={{ marginTop: '2rem' }}>
            <h2>Database Integration</h2>
            <p>
              To connect to your database, update the API route at{' '}
              <code>src/app/api/navbar-config/route.ts</code>
            </p>
            <p>
              Example database schemas are available in{' '}
              <code>src/lib/database/navbar-schema-examples.ts</code>
            </p>
          </section>
          
          <section style={{ marginTop: '2rem' }}>
            <h2>Testing Different Configurations</h2>
            <p>
              You can test different configurations by modifying the mock data
              in the API route or by using the <code>overrideConfig</code> prop:
            </p>
            <pre style={{ 
              background: '#f5f5f5', 
              padding: '1rem', 
              borderRadius: '4px',
              overflow: 'auto'
            }}>
{`<DynamicNavbar 
  overrideConfig={{
    restaurantName: "My Restaurant",
    ctaButton: {
      label: "Book Now",
      href: "/reservations"
    }
  }}
/>`}
            </pre>
          </section>
        </div>
      </main>
    </div>
  );
}
