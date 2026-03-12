'use client';

import { useState, useEffect } from 'react';
import styles from './navbar.module.scss';

export interface NavItem {
  label: string;
  href: string;
}

export interface CTAButton {
  label: string;
  href: string;
}

export interface NavbarProps {
  logoUrl?: string;
  logoSize?: number; // Logo size in pixels
  restaurantName?: string;
  leftNavItems?: NavItem[];
  rightNavItems?: NavItem[];
  bagCount?: number;
  ctaButton?: CTAButton;
  showCtaButton?: boolean; // Show/hide CTA button
  position?: 'fixed' | 'sticky' | 'relative' | 'absolute' | 'static';
  zIndex?: number;
  bgColor?: string;
  textColor?: string;
  buttonBgColor?: string;
  buttonTextColor?: string;
  buttonBorderRadius?: string; // Border radius for CTA button (e.g., '0.5rem', '8px', '9999px')
  layout?: 'default' | 'centered' | 'logo-center' | 'stacked' | 'split' | 'logo-left-items-left' | 'bordered-centered'; // default: logo left, items right | centered: logo left, items center, button right | logo-center: items left, logo center, button right | stacked: logo top center, items and button below | split: items left, logo center, text and button right | logo-left-items-left: logo and items left, button right | bordered-centered: logo left, items center, button right with border
  additionalText?: string; // For split layout - text to display before button (e.g., "STANDORT: 50 | 100")
  borderColor?: string; // For bordered layouts - border color
  borderWidth?: string; // For bordered layouts - border width (e.g., '2px')
  fontFamily?: string; // Font family for navbar menu items
  fontSize?: string; // Font size for navbar menu items
  fontWeight?: number; // Font weight for navbar menu items
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize'; // Text transformation for navbar menu items
}

// Default dynamic values
const DEFAULT_RESTAURANT_NAME = "Restaurant";

const DEFAULT_LEFT_NAV_ITEMS: NavItem[] = [
  { label: 'Collection', href: '#collection' },
  { label: 'Archive', href: '#archive' },
];

const DEFAULT_RIGHT_NAV_ITEMS: NavItem[] = [];

const DEFAULT_CTA_BUTTON: CTAButton = {
  label: 'Get Started',
  href: '#get-started'
};

// Helper function to get initials from restaurant name
const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 3); // Limit to 3 characters
};

export default function Navbar({
  logoUrl,
  logoSize = 40,
  restaurantName = DEFAULT_RESTAURANT_NAME,
  leftNavItems = DEFAULT_LEFT_NAV_ITEMS,
  rightNavItems = DEFAULT_RIGHT_NAV_ITEMS,
  bagCount = 0,
  ctaButton,
  showCtaButton = true,
  position = 'absolute',
  zIndex = 1000,
  bgColor = 'white',
  textColor = 'black',
  buttonBgColor = 'black',
  buttonTextColor = 'white',
  buttonBorderRadius = '0.5rem',
  layout = 'bordered-centered',
  additionalText,
  borderColor = '#000000',
  borderWidth = '2px',
  fontFamily = 'Inter, system-ui, sans-serif',
  fontSize = '1rem',
  fontWeight = 400,
  textTransform = 'uppercase'
}: NavbarProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // Handle scroll to reduce logo size
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Determine what to display for the brand
  useEffect(() => {
    console.log('[Navbar] 🎨 Logo props:', {
      logoUrl,
      hasLogoUrl: !!logoUrl,
      restaurantName,
      logoSize,
    });
  }, [logoUrl, restaurantName, logoSize]);

  const brandDisplay = logoUrl ? (
    <img
      src={logoUrl}
      alt={restaurantName}
      className={styles.logoImage}
      style={{ height: `${logoSize}px`, width: 'auto' }}
    />
  ) : (
    <span className={styles.logoInitials}>{getInitials(restaurantName)}</span>
  );

  useEffect(() => {
    if (isSidebarOpen) {
      document.body.classList.add('overflow-hidden');
    } else {
      document.body.classList.remove('overflow-hidden');
    }
    return () => {
      document.body.classList.remove('overflow-hidden');
    };
  }, [isSidebarOpen]);

  // Dynamic styles from database/API
  const navbarStyle = {
    '--navbar-position': position,
    '--navbar-z-index': zIndex,
    '--navbar-bg-color': bgColor,
    '--navbar-text-color': textColor,
    '--button-bg-color': buttonBgColor,
    '--button-text-color': buttonTextColor,
    '--button-border-radius': buttonBorderRadius,
    '--border-color': borderColor,
    '--border-width': borderWidth,
    '--navbar-font-family': fontFamily,
    '--navbar-font-size': fontSize,
    '--navbar-font-weight': fontWeight,
    '--navbar-text-transform': textTransform,
  } as React.CSSProperties;

  // Add class for bordered layout when position is relative or static (with border)
  const showBorder = layout === 'bordered-centered' && (position === 'relative' || position === 'static');
  // Add margin class for bordered layout when position is absolute (without border)
  const showAbsoluteMargin = layout === 'bordered-centered' && position === 'absolute';
  
  const navbarClass = layout === 'centered'
    ? `${styles.navbar} ${styles.navbarCentered} ${isScrolled ? styles.scrolled : ''}`
    : layout === 'logo-center'
    ? `${styles.navbar} ${styles.navbarLogoCenter} ${isScrolled ? styles.scrolled : ''}`
    : layout === 'stacked'
    ? `${styles.navbar} ${styles.navbarStacked} ${isScrolled ? styles.scrolled : ''}`
    : layout === 'split'
    ? `${styles.navbar} ${styles.navbarSplit} ${isScrolled ? styles.scrolled : ''}`
    : layout === 'logo-left-items-left'
    ? `${styles.navbar} ${styles.navbarLogoLeftItemsLeft} ${isScrolled ? styles.scrolled : ''}`
    : layout === 'bordered-centered'
    ? `${styles.navbar} ${styles.navbarBorderedCentered} ${showBorder ? styles.withBorder : ''} ${showAbsoluteMargin ? styles.absoluteMargin : ''} ${isScrolled ? styles.scrolled : ''}`
    : `${styles.navbar} ${isScrolled ? styles.scrolled : ''}`;

  // Stacked layout has a different structure
  if (layout === 'stacked') {
    return (
      <>
        <nav className={navbarClass} style={navbarStyle}>
          {/* Mobile menu button */}
          <button onClick={toggleSidebar} className={styles.menuButtonStacked} aria-label="Menu">
            {isSidebarOpen ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 12H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <path d="M3 6H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <path d="M3 18H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            )}
          </button>

          {/* Stacked layout container */}
          <div className={styles.stackedContainer}>
            {/* Logo on top */}
            <div className={styles.stackedLogo}>
              {brandDisplay}
            </div>
            
            {/* Nav items and button below */}
            <div className={styles.stackedNav}>
              {leftNavItems.map((item, index) => (
                <a key={index} href={item.href} className={styles.navLink}>
                  {item.label}
                </a>
              ))}
              {rightNavItems.map((item, index) => (
                <a key={`right-${index}`} href={item.href} className={styles.navLink}>
                  {item.label}
                </a>
              ))}
              {showCtaButton && ctaButton && (
                <a href={ctaButton.href} className={styles.ctaButton}>
                  {ctaButton.label}
                </a>
              )}
            </div>
          </div>

          {/* Mobile logo center */}
          <div className={styles.stackedLogoMobile}>
            {brandDisplay}
          </div>
        </nav>

        {/* Mobile Sidebar */}
        <div className={`${styles.sidebar} ${isSidebarOpen ? styles.open : styles.closed}`}>
          <div onClick={toggleSidebar} className={styles.sidebarOverlay}></div>
          
          <div className={styles.sidebarContent}>
            <button onClick={toggleSidebar} className={styles.closeButton} aria-label="Close">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
            
            {leftNavItems.map((item, index) => (
              <a key={index} href={item.href} className={styles.sidebarLink}>
                {item.label}
              </a>
            ))}
            {rightNavItems.map((item, index) => (
              <a key={`right-${index}`} href={item.href} className={styles.sidebarLink}>
                {item.label}
              </a>
            ))}

            {showCtaButton && ctaButton && (
              <a href={ctaButton.href} className={styles.sidebarCta}>
                {ctaButton.label}
              </a>
            )}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <nav className={navbarClass} style={navbarStyle}>
        {/* Left Section - Menu button (mobile) / Nav Items or Logo (desktop) */}
        <div className={styles.leftSection}>
          <button onClick={toggleSidebar} className={styles.menuButton} aria-label="Menu">
            {isSidebarOpen ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 12H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <path d="M3 6H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <path d="M3 18H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            )}
          </button>
          {layout === 'logo-center' || layout === 'split' ? (
            <div className={styles.desktopNavLeft}>
              {leftNavItems.map((item, index) => (
                <a key={index} href={item.href} className={styles.navLink}>
                  {item.label}
                </a>
              ))}
              {rightNavItems.map((item, index) => (
                <a key={`right-${index}`} href={item.href} className={styles.navLink}>
                  {item.label}
                </a>
              ))}
            </div>
          ) : layout === 'logo-left-items-left' ? (
            <>
              <div className={styles.brandLogo}>
                {brandDisplay}
              </div>
              <div className={styles.desktopNavLeft}>
                {leftNavItems.map((item, index) => (
                  <a key={index} href={item.href} className={styles.navLink}>
                    {item.label}
                  </a>
                ))}
                {rightNavItems.map((item, index) => (
                  <a key={`right-${index}`} href={item.href} className={styles.navLink}>
                    {item.label}
                  </a>
                ))}
              </div>
            </>
          ) : (
            <div className={styles.brandLogo}>
              {brandDisplay}
            </div>
          )}
        </div>

        {/* Center - Logo (mobile or logo-center/split layout) or Nav Items (centered/bordered-centered layout) */}
        <div className={styles.centerSection}>
          {layout === 'centered' || layout === 'bordered-centered' ? (
            <>
              {/* Desktop: Nav items */}
              <div className={styles.desktopNavCentered}>
                {leftNavItems.map((item, index) => (
                  <a key={index} href={item.href} className={styles.navLink}>
                    {item.label}
                  </a>
                ))}
                {rightNavItems.map((item, index) => (
                  <a key={`right-${index}`} href={item.href} className={styles.navLink}>
                    {item.label}
                  </a>
                ))}
              </div>
              {/* Mobile: Logo */}
              <div className={styles.brandLogoMobile}>
                {brandDisplay}
              </div>
            </>
          ) : layout === 'logo-center' || layout === 'split' ? (
            <>
              {/* Desktop: Logo in center */}
              <div className={styles.brandLogoCenter}>
                {brandDisplay}
              </div>
              {/* Mobile: Logo in center */}
              <div className={styles.brandLogoMobile}>
                {brandDisplay}
              </div>
            </>
          ) : (
            <div className={styles.brandLogoMobile}>
              {brandDisplay}
            </div>
          )}
        </div>

        {/* Right Section - All Menu Items (default) or Text + Button (split) or Button only (others) */}
        <div className={styles.rightSection}>
          {layout === 'default' && (
            <div className={styles.desktopNav}>
              {leftNavItems.map((item, index) => (
                <a key={index} href={item.href} className={styles.navLink}>
                  {item.label}
                </a>
              ))}
              {rightNavItems.map((item, index) => (
                <a key={`right-${index}`} href={item.href} className={styles.navLink}>
                  {item.label}
                </a>
              ))}
            </div>
          )}
          {layout === 'split' && additionalText && (
            <span className={styles.additionalText}>{additionalText}</span>
          )}
          {showCtaButton && ctaButton && (
            <a href={ctaButton.href} className={styles.ctaButton}>
              {ctaButton.label}
            </a>
          )}
        </div>
      </nav>

      {/* Mobile Sidebar */}
      <div className={`${styles.sidebar} ${isSidebarOpen ? styles.open : styles.closed}`}>
        <div onClick={toggleSidebar} className={styles.sidebarOverlay}></div>
        
        <div className={styles.sidebarContent}>
          <button onClick={toggleSidebar} className={styles.closeButton} aria-label="Close">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
          
          {leftNavItems.map((item, index) => (
            <a key={index} href={item.href} className={styles.sidebarLink}>
              {item.label}
            </a>
          ))}
          {rightNavItems.map((item, index) => (
            <a key={`right-${index}`} href={item.href} className={styles.sidebarLink}>
              {item.label}
            </a>
          ))}

          {showCtaButton && ctaButton && (
            <a href={ctaButton.href} className={styles.sidebarCta}>
              {ctaButton.label}
            </a>
          )}
        </div>
      </div>
    </>
  );
}
