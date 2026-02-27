/**
 * Admin Panel for Navbar Configuration
 * 
 * This component provides a UI for administrators to edit navbar configuration
 * including logo, menu items, and CTA button.
 * 
 * Features:
 * - Edit restaurant name and logo URL
 * - Add/remove/reorder menu items
 * - Configure CTA button text and link
 * - Customize colors and styling
 * - Live preview
 * - Save to database via API
 */

'use client';

import { useState, useEffect } from 'react';
import { useNavbarConfig, useUpdateNavbarConfig } from '@/hooks/use-navbar-config';
import Navbar from '@/components/navbar';
import type { NavItem } from '@/types/navbar.types';

export default function NavbarAdmin() {
  const { config, loading, error: fetchError, refetch } = useNavbarConfig();
  const { updateNavbar, updating, error: updateError } = useUpdateNavbarConfig();

  // Form state
  const [restaurantName, setRestaurantName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [leftNavItems, setLeftNavItems] = useState<NavItem[]>([]);
  const [ctaLabel, setCtaLabel] = useState('');
  const [ctaHref, setCtaHref] = useState('');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [textColor, setTextColor] = useState('#000000');
  const [buttonBgColor, setButtonBgColor] = useState('#000000');
  const [buttonTextColor, setButtonTextColor] = useState('#ffffff');

  // Initialize form with fetched config
  useEffect(() => {
    if (config) {
      setRestaurantName(config.restaurantName);
      setLogoUrl(config.logoUrl || '');
      setLeftNavItems(config.leftNavItems);
      setCtaLabel(config.ctaButton?.label || '');
      setCtaHref(config.ctaButton?.href || '');
      setBgColor(config.bgColor || '#ffffff');
      setTextColor(config.textColor || '#000000');
      setButtonBgColor(config.buttonBgColor || '#000000');
      setButtonTextColor(config.buttonTextColor || '#ffffff');
    }
  }, [config]);

  const handleAddNavItem = () => {
    setLeftNavItems([
      ...leftNavItems,
      { label: 'New Item', href: '#', order: leftNavItems.length + 1 },
    ]);
  };

  const handleRemoveNavItem = (index: number) => {
    setLeftNavItems(leftNavItems.filter((_, i) => i !== index));
  };

  const handleUpdateNavItem = (index: number, field: 'label' | 'href', value: string) => {
    const updated = [...leftNavItems];
    updated[index] = { ...updated[index], [field]: value };
    setLeftNavItems(updated);
  };

  const handleMoveNavItem = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === leftNavItems.length - 1)
    ) {
      return;
    }

    const updated = [...leftNavItems];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    setLeftNavItems(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await updateNavbar({
        restaurantName,
        logoUrl: logoUrl || undefined,
        leftNavItems: leftNavItems.map((item, index) => ({
          ...item,
          order: index + 1,
        })),
        rightNavItems: [],
        ctaButton: {
          label: ctaLabel,
          href: ctaHref,
        },
        bgColor,
        textColor,
        buttonBgColor,
        buttonTextColor,
      });

      alert('Navbar configuration updated successfully!');
      refetch();
    } catch (err) {
      console.error('Failed to update navbar:', err);
    }
  };

  if (loading) {
    return <div style={{ padding: '2rem' }}>Loading...</div>;
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      {/* Live Preview */}
      <div style={{ position: 'sticky', top: 0, zIndex: 100, backgroundColor: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <Navbar
          restaurantName={restaurantName}
          logoUrl={logoUrl || undefined}
          leftNavItems={leftNavItems}
          rightNavItems={[]}
          ctaButton={{ label: ctaLabel, href: ctaHref }}
          bgColor={bgColor}
          textColor={textColor}
          buttonBgColor={buttonBgColor}
          buttonTextColor={buttonTextColor}
          position="relative"
          layout="bordered-centered"
        />
      </div>

      {/* Admin Form */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '2rem' }}>
          Navbar Configuration
        </h1>

        {fetchError && (
          <div style={{ padding: '1rem', backgroundColor: '#fee', color: '#c00', borderRadius: '4px', marginBottom: '1rem' }}>
            Error loading config: {fetchError}
          </div>
        )}

        {updateError && (
          <div style={{ padding: '1rem', backgroundColor: '#fee', color: '#c00', borderRadius: '4px', marginBottom: '1rem' }}>
            Error updating config: {updateError}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Restaurant Info */}
          <section style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>
              Restaurant Information
            </h2>
            
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                Restaurant Name
              </label>
              <input
                type="text"
                value={restaurantName}
                onChange={(e) => setRestaurantName(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                Logo URL (optional)
              </label>
              <input
                type="url"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="Leave empty to use restaurant name initials"
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
              />
              <small style={{ color: '#666', fontSize: '0.875rem' }}>
                Leave empty to display restaurant name initials
              </small>
            </div>
          </section>

          {/* Menu Items */}
          <section style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '600' }}>Menu Items</h2>
              <button
                type="button"
                onClick={handleAddNavItem}
                style={{ padding: '0.5rem 1rem', backgroundColor: '#000', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                + Add Item
              </button>
            </div>

            {leftNavItems.map((item, index) => (
              <div key={index} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', alignItems: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <button
                    type="button"
                    onClick={() => handleMoveNavItem(index, 'up')}
                    disabled={index === 0}
                    style={{ padding: '0.25rem', fontSize: '0.75rem', cursor: index === 0 ? 'not-allowed' : 'pointer' }}
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveNavItem(index, 'down')}
                    disabled={index === leftNavItems.length - 1}
                    style={{ padding: '0.25rem', fontSize: '0.75rem', cursor: index === leftNavItems.length - 1 ? 'not-allowed' : 'pointer' }}
                  >
                    ▼
                  </button>
                </div>
                <input
                  type="text"
                  value={item.label}
                  onChange={(e) => handleUpdateNavItem(index, 'label', e.target.value)}
                  placeholder="Label"
                  style={{ flex: 1, padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                  required
                />
                <input
                  type="text"
                  value={item.href}
                  onChange={(e) => handleUpdateNavItem(index, 'href', e.target.value)}
                  placeholder="URL"
                  style={{ flex: 1, padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                  required
                />
                <button
                  type="button"
                  onClick={() => handleRemoveNavItem(index)}
                  style={{ padding: '0.5rem 1rem', backgroundColor: '#dc2626', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Remove
                </button>
              </div>
            ))}
          </section>

          {/* CTA Button */}
          <section style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>
              CTA Button (e.g., &quot;Order Online&quot;)
            </h2>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                Button Text
              </label>
              <input
                type="text"
                value={ctaLabel}
                onChange={(e) => setCtaLabel(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                Button Link
              </label>
              <input
                type="text"
                value={ctaHref}
                onChange={(e) => setCtaHref(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                required
              />
            </div>
          </section>

          {/* Colors */}
          <section style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>Colors</h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Background Color
                </label>
                <input
                  type="color"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  style={{ width: '100%', height: '40px', border: '1px solid #ddd', borderRadius: '4px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Text Color
                </label>
                <input
                  type="color"
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                  style={{ width: '100%', height: '40px', border: '1px solid #ddd', borderRadius: '4px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Button Background
                </label>
                <input
                  type="color"
                  value={buttonBgColor}
                  onChange={(e) => setButtonBgColor(e.target.value)}
                  style={{ width: '100%', height: '40px', border: '1px solid #ddd', borderRadius: '4px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Button Text Color
                </label>
                <input
                  type="color"
                  value={buttonTextColor}
                  onChange={(e) => setButtonTextColor(e.target.value)}
                  style={{ width: '100%', height: '40px', border: '1px solid #ddd', borderRadius: '4px' }}
                />
              </div>
            </div>
          </section>

          {/* Submit */}
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              type="submit"
              disabled={updating}
              style={{
                padding: '0.75rem 2rem',
                backgroundColor: updating ? '#ccc' : '#000',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: updating ? 'not-allowed' : 'pointer',
              }}
            >
              {updating ? 'Saving...' : 'Save Changes'}
            </button>

            <button
              type="button"
              onClick={() => refetch()}
              style={{
                padding: '0.75rem 2rem',
                backgroundColor: '#fff',
                color: '#000',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              Reset
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
