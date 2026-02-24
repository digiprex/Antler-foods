/**
 * Home Page
 *
 * Dynamic page demonstrating the dynamic navbar and hero in action
 */

import DynamicHero from '@/components/dynamic-hero';

export default function HomePage() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      {/* Navbar is automatically rendered by ConditionalNavbar in root layout */}
      
      {/* Dynamic Hero Section */}
      <DynamicHero
        restaurantId="92e9160e-0afa-4f78-824f-b28e32885353"
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

      {/* Features Section */}
      <section style={{ 
        backgroundColor: '#fff',
        padding: '80px 2rem',
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h2 style={{ 
            fontSize: '2rem', 
            fontWeight: 'bold', 
            textAlign: 'center',
            marginBottom: '3rem',
            color: '#1a1a1a'
          }}>
            Why Choose Us
          </h2>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '2rem'
          }}>
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <div style={{ 
                fontSize: '3rem', 
                marginBottom: '1rem'
              }}>🍽️</div>
              <h3 style={{ 
                fontSize: '1.25rem', 
                fontWeight: '600',
                marginBottom: '0.5rem',
                color: '#1a1a1a'
              }}>
                Fresh Ingredients
              </h3>
              <p style={{ color: '#666' }}>
                We source only the finest, freshest ingredients for our dishes.
              </p>
            </div>
            
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <div style={{ 
                fontSize: '3rem', 
                marginBottom: '1rem'
              }}>👨‍🍳</div>
              <h3 style={{ 
                fontSize: '1.25rem', 
                fontWeight: '600',
                marginBottom: '0.5rem',
                color: '#1a1a1a'
              }}>
                Expert Chefs
              </h3>
              <p style={{ color: '#666' }}>
                Our experienced chefs bring passion and creativity to every plate.
              </p>
            </div>
            
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <div style={{ 
                fontSize: '3rem', 
                marginBottom: '1rem'
              }}>⭐</div>
              <h3 style={{ 
                fontSize: '1.25rem', 
                fontWeight: '600',
                marginBottom: '0.5rem',
                color: '#1a1a1a'
              }}>
                Top Rated
              </h3>
              <p style={{ color: '#666' }}>
                Consistently rated as one of the best restaurants in the area.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section style={{ 
        padding: '80px 2rem',
        textAlign: 'center',
        backgroundColor: '#000',
        color: '#fff'
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ 
            fontSize: '2rem', 
            fontWeight: 'bold', 
            marginBottom: '1rem'
          }}>
            Ready to Experience Great Food?
          </h2>
          <p style={{ 
            fontSize: '1.125rem', 
            marginBottom: '2rem',
            opacity: 0.9
          }}>
            Order online now or visit us at one of our locations.
          </p>
          <a 
            href="/order" 
            style={{
              padding: '0.75rem 2rem',
              backgroundColor: '#fff',
              color: '#000',
              borderRadius: '0.25rem',
              textDecoration: 'none',
              fontWeight: '600',
              display: 'inline-block'
            }}
          >
            Order Now
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ 
        padding: '2rem',
        textAlign: 'center',
        backgroundColor: '#f9fafb',
        color: '#666',
        fontSize: '0.875rem'
      }}>
        <p>© 2026 Antler Foods. All rights reserved.</p>
      </footer>
    </div>
  );
}
