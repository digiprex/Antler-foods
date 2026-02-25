/**
 * Home Page
 *
 * Dynamic page demonstrating the dynamic navbar and hero in action
 */

import DynamicHero from '@/components/dynamic-hero';
import DynamicFAQ from '@/components/dynamic-faq';
import DynamicFaw from '@/components/dynamic-faw';

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

      {/* Features Section (Font Awesome UI) */}
      <DynamicFaw
        restaurantId="92e9160e-0afa-4f78-824f-b28e32885353"
        urlSlug="home"
        categoryKey="faw"
        fallbackConfig={{
          title: 'Why Choose Us',
          items: [
            { id: '1', icon: 'fa-solid fa-utensils', title: 'Fresh Ingredients', text: 'We source only the finest, freshest ingredients for our dishes.' },
            { id: '2', icon: 'fa-solid fa-hat-chef', title: 'Expert Chefs', text: 'Our experienced chefs bring passion and creativity to every plate.' },
            { id: '3', icon: 'fa-solid fa-star', title: 'Top Rated', text: 'Consistently rated as one of the best restaurants in the area.' },
          ],
          bgColor: '#fff',
          textColor: '#1a1a1a'
        }}
      />

      {/* FAQ Section */}
      <DynamicFAQ
        restaurantId="92e9160e-0afa-4f78-824f-b28e32885353"
        showLoading={true}
      />

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
