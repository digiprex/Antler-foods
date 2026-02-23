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
  } = props;

  const [showScrollTop, setShowScrollTop] = useState(false);
  const [newsletterEmail, setNewsletterEmail] = useState('');

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

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle newsletter subscription
    console.log('Newsletter subscription:', newsletterEmail);
    setNewsletterEmail('');
    // You can add actual API call here
  };

  // Social media icons mapping
  const socialIcons: Record<string, string> = {
    facebook: '📘',
    instagram: '📷',
    twitter: '🐦',
    linkedin: '💼',
    youtube: '📹',
    tiktok: '🎵',
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
                {socialIcons[link.platform] || '🔗'}
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

        <button
          onClick={scrollToTop}
          className={`${styles.scrollTopButton} ${showScrollTop ? styles.visible : ''}`}
          aria-label="Scroll to top"
        >
          ↑
        </button>
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
            />
            <button type="submit" className={styles.newsletterButton}>
              Subscribe
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
                {socialIcons[link.platform] || '🔗'}
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
              />
              <button type="submit" className={styles.newsletterButtonCentered}>
                Subscribe
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
                {socialIcons[link.platform] || '🔗'}
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
                  {socialIcons[link.platform] || '🔗'}
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
              />
              <button type="submit" className={styles.newsletterButton}>
                Subscribe
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

        {/* Bottom Bar */}
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
      </div>

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
