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
  restaurantName?: string;
  leftNavItems?: NavItem[];
  rightNavItems?: NavItem[];
  bagCount?: number;
  ctaButton?: CTAButton;
  position?: 'fixed' | 'sticky' | 'relative' | 'absolute' | 'static';
  zIndex?: number;
  bgColor?: string;
  textColor?: string;
  buttonBgColor?: string;
  buttonTextColor?: string;
  layout?: 'default' | 'centered' | 'logo-center' | 'stacked' | 'split' | 'logo-left-items-left' | 'bordered-centered'; // default: logo left, items right | centered: logo left, items center, button right | logo-center: items left, logo center, button right | stacked: logo top center, items and button below | split: items left, logo center, text and button right | logo-left-items-left: logo and items left, button right | bordered-centered: logo left, items center, button right with border
  additionalText?: string; // For split layout - text to display before button (e.g., "STANDORT: 50 | 100")
  borderColor?: string; // For bordered layouts - border color
  borderWidth?: string; // For bordered layouts - border width (e.g., '2px')
}

// Default dynamic values
const DEFAULT_RESTAURANT_NAME = "Maison de Noir";

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
  restaurantName = DEFAULT_RESTAURANT_NAME,
  leftNavItems = DEFAULT_LEFT_NAV_ITEMS,
  rightNavItems = DEFAULT_RIGHT_NAV_ITEMS,
  bagCount = 0,
  ctaButton,
  position = 'absolute',
  zIndex = 1,
  bgColor = 'white',
  textColor = 'black',
  buttonBgColor = 'black',
  buttonTextColor = 'white',
  layout = 'bordered-centered',
  additionalText,
  borderColor = '#000000',
  borderWidth = '2px'
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
  const brandDisplay = logoUrl ? (
    <img src={logoUrl} alt={restaurantName} className={styles.logoImage} />
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
    '--border-color': borderColor,
    '--border-width': borderWidth,
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
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 12H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M3 6H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M3 18H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
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
              {ctaButton && (
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
            
            {ctaButton && (
              <a href={ctaButton.href} className={styles.sidebarCta}>
                {ctaButton.label}
              </a>
            )}
            
            <div className={styles.sidebarBrand}>{brandDisplay}</div>
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
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 12H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M3 6H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M3 18H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
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
          {ctaButton && (
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
          
          {ctaButton && (
            <a href={ctaButton.href} className={styles.sidebarCta}>
              {ctaButton.label}
            </a>
          )}
          
          <div className={styles.sidebarBrand}>{brandDisplay}</div>
        </div>
      </div>
    </>
  );
}
