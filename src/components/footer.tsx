/**
 * Footer Component
 *
 * Renders footer based on configuration with multiple layout options
 */

'use client';

import { useState, useEffect } from 'react';
import type { FooterConfig } from '@/types/footer.types';
import styles from './footer.module.scss';

interface FooterProps extends Partial<FooterConfig> {
  // Allow component to accept all FooterConfig properties as optional
  restaurant_id?: string;
}

export default function Footer(props: FooterProps) {
  const {
    restaurantName = 'Restaurant',
    aboutContent,
    email,
    phone,
    address,
    socialLinks = [],
    columns = [],
    copyrightText,
    showPoweredBy = true,
    showSocialMedia = true,
    showLocations = true,
    showNewsletter = false,
    newsletterTitle = 'Subscribe to our newsletter',
    newsletterPlaceholder = 'Enter your email',
    layout = 'default',
    bgColor = '#1f2937',
    textColor = '#f9fafb',
    linkColor = '#9ca3af',
    copyrightBgColor = '#000000',
    copyrightTextColor = '#ffffff',
    logoUrl,
    restaurant_id,
  } = props;

  const [showScrollTop, setShowScrollTop] = useState(false);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterStatus, setNewsletterStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [newsletterMessage, setNewsletterMessage] = useState('');

  // Show scroll to top button when scrolled down
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate restaurant_id is available
    if (!restaurant_id) {
      setNewsletterStatus('error');
      setNewsletterMessage('Unable to subscribe. Restaurant ID is missing.');
      return;
    }

    setNewsletterStatus('loading');
    setNewsletterMessage('');

    try {
      const response = await fetch('/api/newsletter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: newsletterEmail,
          restaurant_id: restaurant_id,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setNewsletterStatus('success');
        setNewsletterMessage(data.message || 'Successfully subscribed to newsletter!');
        setNewsletterEmail('');
        
        // Clear success message after 5 seconds
        setTimeout(() => {
          setNewsletterStatus('idle');
          setNewsletterMessage('');
        }, 5000);
      } else {
        setNewsletterStatus('error');
        setNewsletterMessage(data.error || 'Failed to subscribe. Please try again.');
        
        // Clear error message after 5 seconds
        setTimeout(() => {
          setNewsletterStatus('idle');
          setNewsletterMessage('');
        }, 5000);
      }
    } catch (error) {
      console.error('Newsletter subscription error:', error);
      setNewsletterStatus('error');
      setNewsletterMessage('An error occurred. Please try again later.');
      
      // Clear error message after 5 seconds
      setTimeout(() => {
        setNewsletterStatus('idle');
        setNewsletterMessage('');
      }, 5000);
    }
  };

  // Social media icons mapping - SVG components
  const socialIcons: Record<string, JSX.Element> = {
    facebook: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    ),
    instagram: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
      </svg>
    ),
    twitter: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    ),
    linkedin: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
      </svg>
    ),
    youtube: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
      </svg>
    ),
    tiktok: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
      </svg>
    ),
  };

  const renderDefaultLayout = () => (
    <div className={`${styles.defaultLayout} ${showNewsletter ? styles.defaultLayoutWithNewsletter : ''}`}>
      {/* Left Section: Logo, About, Social Media */}
      <div className={styles.leftSection}>
        {logoUrl ? (
          <img src={logoUrl} alt={restaurantName} className={styles.logo} />
        ) : (
          <h3 className={styles.brandName}>{restaurantName}</h3>
        )}

        {aboutContent && (
          <p className={styles.aboutText}>{aboutContent}</p>
        )}

        {showSocialMedia && socialLinks.length > 0 && (
          <div className={styles.socialLinks}>
            {socialLinks.map((link, index) => (
              <a
                key={index}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.socialIcon}
                aria-label={link.platform}
              >
                {socialIcons[link.platform] || (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                  </svg>
                )}
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Center Section: Quick Links */}
      {columns.length > 0 && (
        <div className={styles.centerSection}>
          <h4 className={styles.sectionTitle}>Quick Links</h4>
          <div className={styles.quickLinks}>
            {columns.map((column, index) => 
              column.links.map((link, linkIndex) => (
                <a key={`${index}-${linkIndex}`} href={link.href} className={styles.quickLink}>
                  {link.label}
                </a>
              ))
            )}
          </div>
        </div>
      )}

      {/* Right Section: Contact Details (including location) */}
      <div className={styles.rightSection}>
        {showLocations && (email || phone || address) && (
          <div className={styles.contactDetails}>
            <h4 className={styles.sectionTitle}>Contact</h4>
            {address && (
              <div className={styles.contactItem}>
                <span className={styles.contactIcon}>📍</span>
                <span>{address}</span>
              </div>
            )}
            {email && (
              <div className={styles.contactItem}>
                <span className={styles.contactIcon}>📧</span>
                <a href={`mailto:${email}`} className={styles.contactLink}>
                  {email}
                </a>
              </div>
            )}
            {phone && (
              <div className={styles.contactItem}>
                <span className={styles.contactIcon}>📞</span>
                <a href={`tel:${phone}`} className={styles.contactLink}>
                  {phone}
                </a>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Newsletter Section */}
      {showNewsletter && (
        <div className={styles.newsletterSection}>
          <h4 className={styles.sectionTitle}>{newsletterTitle}</h4>
          <form onSubmit={handleNewsletterSubmit} className={styles.newsletterForm}>
            <input
              type="email"
              value={newsletterEmail}
              onChange={(e) => setNewsletterEmail(e.target.value)}
              placeholder={newsletterPlaceholder}
              className={styles.newsletterInput}
              required
              disabled={newsletterStatus === 'loading' || newsletterStatus === 'success'}
            />
            <button
              type="submit"
              className={styles.newsletterButton}
              disabled={newsletterStatus === 'loading' || newsletterStatus === 'success'}
              style={{
                backgroundColor: newsletterStatus === 'success' ? '#10b981' : undefined,
                cursor: newsletterStatus === 'success' ? 'default' : undefined,
              }}
            >
              {newsletterStatus === 'loading' ? 'Subscribing...' : newsletterStatus === 'success' ? 'Subscribed!' : 'Subscribe'}
            </button>
          </form>
        </div>
      )}
    </div>
  );

  const renderCenteredLayout = () => (
    <div className={styles.centeredLayout}>
      <div className={styles.centeredContent}>
        {logoUrl ? (
          <img src={logoUrl} alt={restaurantName} className={styles.logoCentered} />
        ) : (
          <h3 className={styles.brandNameCentered}>{restaurantName}</h3>
        )}

        {aboutContent && (
          <p className={styles.aboutTextCentered}>{aboutContent}</p>
        )}

        {showSocialMedia && socialLinks.length > 0 && (
          <div className={styles.socialLinksCentered}>
            {socialLinks.map((link, index) => (
              <a
                key={index}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.socialIcon}
                aria-label={link.platform}
              >
                {socialIcons[link.platform] || (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                  </svg>
                )}
              </a>
            ))}
          </div>
        )}

        {showLocations && (email || phone || address) && (
          <div className={styles.contactInfoCentered}>
            {address && <div className={styles.infoItem}>📍 {address}</div>}
            {email && <div className={styles.infoItem}>📧 {email}</div>}
            {phone && <div className={styles.infoItem}>📞 {phone}</div>}
          </div>
        )}

        {/* Newsletter Section */}
        {showNewsletter && (
          <div className={styles.newsletterSectionCentered}>
            <h4 className={styles.newsletterTitleCentered}>{newsletterTitle}</h4>
            <form onSubmit={handleNewsletterSubmit} className={styles.newsletterFormCentered}>
              <input
                type="email"
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                placeholder={newsletterPlaceholder}
                className={styles.newsletterInputCentered}
                required
                disabled={newsletterStatus === 'loading' || newsletterStatus === 'success'}
              />
              <button
                type="submit"
                className={styles.newsletterButtonCentered}
                disabled={newsletterStatus === 'loading' || newsletterStatus === 'success'}
                style={{
                  backgroundColor: newsletterStatus === 'success' ? '#10b981' : undefined,
                  cursor: newsletterStatus === 'success' ? 'default' : undefined,
                }}
              >
                {newsletterStatus === 'loading' ? 'Subscribing...' : newsletterStatus === 'success' ? 'Subscribed!' : 'Subscribe'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );

  const renderColumnsLayout = () => (
    <div className={styles.columnsLayout}>
      {/* Brand Column */}
      <div className={styles.brandColumn}>
        {logoUrl ? (
          <img src={logoUrl} alt={restaurantName} className={styles.logo} />
        ) : (
          <h3 className={styles.brandName}>{restaurantName}</h3>
        )}

        {aboutContent && (
          <p className={styles.aboutText}>{aboutContent}</p>
        )}

        {showSocialMedia && socialLinks.length > 0 && (
          <div className={styles.socialLinks}>
            {socialLinks.map((link, index) => (
              <a
                key={index}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.socialIcon}
                aria-label={link.platform}
              >
                {socialIcons[link.platform] || (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                  </svg>
                )}
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Dynamic Columns */}
      {columns.map((column, index) => (
        <div key={index} className={styles.linkColumn}>
          <h4 className={styles.columnTitle}>{column.title}</h4>
          <ul className={styles.linkList}>
            {column.links.map((link, linkIndex) => (
              <li key={linkIndex}>
                <a href={link.href} className={styles.footerLink}>
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ))}

      {/* Contact Column */}
      {showLocations && (email || phone || address) && (
        <div className={styles.contactColumn}>
          <h4 className={styles.columnTitle}>Contact</h4>
          <div className={styles.contactList}>
            {address && <div className={styles.contactItem}>📍 {address}</div>}
            {email && (
              <div className={styles.contactItem}>
                <a href={`mailto:${email}`} className={styles.footerLink}>📧 {email}</a>
              </div>
            )}
            {phone && (
              <div className={styles.contactItem}>
                <a href={`tel:${phone}`} className={styles.footerLink}>📞 {phone}</a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  const renderRestaurantLayout = () => (
    <>
      <div className={`${styles.restaurantLayout} ${showNewsletter ? styles.restaurantLayoutWithNewsletter : ''}`}>
        {/* Left Section: Brand, About, Social Media */}
        <div className={styles.restaurantBrand}>
          {logoUrl ? (
            <img src={logoUrl} alt={restaurantName} className={styles.logo} />
          ) : (
            <h3 className={styles.brandName}>{restaurantName}</h3>
          )}

          {aboutContent && (
            <p className={styles.aboutText}>{aboutContent}</p>
          )}

          {showSocialMedia && socialLinks.length > 0 && (
            <div className={styles.socialLinksLarge}>
              {socialLinks.map((link, index) => (
                <a
                  key={index}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.socialIconLarge}
                  aria-label={link.platform}
                >
                  {socialIcons[link.platform] || (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                    </svg>
                  )}
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Address Section */}
        {showLocations && address && (
          <div className={styles.restaurantAddress}>
            <h4 className={styles.sectionTitleUpper}>ADDRESS</h4>
            <div className={styles.addressText}>{address}</div>
          </div>
        )}

        {/* Contact Section */}
        {showLocations && (email || phone) && (
          <div className={styles.restaurantContact}>
            <h4 className={styles.sectionTitleUpper}>CONTACT</h4>
            <div className={styles.contactList}>
              {phone && <div className={styles.contactItem}>{phone}</div>}
              {email && <div className={styles.contactItem}>{email}</div>}
            </div>
          </div>
        )}

        {/* Newsletter Section */}
        {showNewsletter && (
          <div className={styles.restaurantNewsletter}>
            <h4 className={styles.sectionTitleUpper}>NEWSLETTER</h4>
            <form onSubmit={handleNewsletterSubmit} className={styles.newsletterForm}>
              <input
                type="email"
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                placeholder={newsletterPlaceholder}
                className={styles.newsletterInput}
                required
                disabled={newsletterStatus === 'loading' || newsletterStatus === 'success'}
              />
              <button
                type="submit"
                className={styles.newsletterButton}
                disabled={newsletterStatus === 'loading' || newsletterStatus === 'success'}
                style={{
                  backgroundColor: newsletterStatus === 'success' ? '#10b981' : undefined,
                  cursor: newsletterStatus === 'success' ? 'default' : undefined,
                }}
              >
                {newsletterStatus === 'loading' ? 'Subscribing...' : newsletterStatus === 'success' ? 'Subscribed!' : 'Subscribe'}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Navigation Links */}
      {columns.length > 0 && (
        <div className={styles.restaurantNav}>
          {columns.map((column, index) => 
            column.links.map((link, linkIndex) => (
              <a key={`${index}-${linkIndex}`} href={link.href} className={styles.navLink}>
                {link.label}
              </a>
            ))
          )}
        </div>
      )}
    </>
  );

  const renderLayout = () => {
    switch (layout) {
      case 'centered':
        return renderCenteredLayout();
      case 'columns-3':
      case 'columns-4':
        return renderColumnsLayout();
      case 'minimal':
        return renderCenteredLayout();
      case 'restaurant':
        return renderRestaurantLayout();
      case 'default':
      default:
        return renderDefaultLayout();
    }
  };

  // Dynamic styles using CSS variables (similar to navbar)
  const footerStyle = {
    '--footer-bg-color': bgColor,
    '--footer-text-color': textColor,
    '--footer-link-color': linkColor,
    '--copyright-bg-color': copyrightBgColor,
    '--copyright-text-color': copyrightTextColor,
  } as React.CSSProperties;

  // Determine footer class based on layout
  const footerClass = layout === 'centered'
    ? `${styles.footer} ${styles.footerCentered}`
    : layout === 'columns-3'
    ? `${styles.footer} ${styles.footerColumns3}`
    : layout === 'columns-4'
    ? `${styles.footer} ${styles.footerColumns4}`
    : layout === 'minimal'
    ? `${styles.footer} ${styles.footerMinimal}`
    : layout === 'restaurant'
    ? `${styles.footer} ${styles.footerRestaurant}`
    : `${styles.footer} ${styles.footerDefault}`;

  return (
    <footer
      className={footerClass}
      style={footerStyle}
    >
      <div className={styles.container}>
        {renderLayout()}
      </div>

      {/* Bottom Bar - Outside container for full width */}
      {layout === 'restaurant' ? (
        <div className={styles.bottomBarRestaurant}>
          <div className={styles.copyright}>
            {copyrightText || `© ${new Date().getFullYear()} All Rights Reserved`}
          </div>
        </div>
      ) : (
        <div className={styles.bottomBar}>
          <div className={styles.copyright}>
            {copyrightText || `© ${new Date().getFullYear()} ${restaurantName}. All rights reserved.`}
          </div>
        </div>
      )}

      {/* Scroll to Top Button (Fixed) */}
      <button
        onClick={scrollToTop}
        className={`${styles.scrollTopFixed} ${showScrollTop ? styles.visible : ''}`}
        aria-label="Scroll to top"
      >
        ↑
      </button>
    </footer>
  );
}
