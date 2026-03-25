'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  MENU_CART_STORAGE_KEY,
  MENU_CART_UPDATED_EVENT,
} from '@/features/restaurant-menu/context/cart-context';
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
  layout?:
    | 'default'
    | 'centered'
    | 'logo-center'
    | 'stacked'
    | 'split'
    | 'logo-left-items-left'
    | 'bordered-centered'; // default: logo left, items right | centered: logo left, items center, button right | logo-center: items left, logo center, button right | stacked: logo top center, items and button below | split: items left, logo center, text and button right | logo-left-items-left: logo and items left, button right | bordered-centered: logo left, items center, button right with border
  additionalText?: string; // For split layout - text to display before button (e.g., "STANDORT: 50 | 100")
  borderColor?: string; // For bordered layouts - border color
  borderWidth?: string; // For bordered layouts - border width (e.g., '2px')
  fontFamily?: string; // Font family for navbar menu items
  fontSize?: string; // Font size for navbar menu items
  fontWeight?: number; // Font weight for navbar menu items
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize'; // Text transformation for navbar menu items
  forceHamburgerMenu?: boolean;
}

// Default dynamic values
const DEFAULT_RESTAURANT_NAME = 'Restaurant';

const DEFAULT_LEFT_NAV_ITEMS: NavItem[] = [
  { label: 'Collection', href: '#collection' },
  { label: 'Archive', href: '#archive' },
];

const DEFAULT_RIGHT_NAV_ITEMS: NavItem[] = [];

const DEFAULT_CTA_BUTTON: CTAButton = {
  label: 'Get Started',
  href: '#get-started',
};

// Helper function to get initials from restaurant name
const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map((word) => word[0])
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
  fontFamily = 'Poppins, sans-serif',
  fontSize = '1rem',
  fontWeight = 400,
  textTransform = 'uppercase',
  forceHamburgerMenu = false,
}: NavbarProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [menuCartCount, setMenuCartCount] = useState(bagCount);
  const pathname = usePathname() ?? '';

  // Function to check if a nav item is active
  const isNavItemActive = (href: string): boolean => {
    if (!pathname || !href) return false;

    // Handle hash links (e.g., #collection, #archive)
    if (href.startsWith('#')) {
      return false; // Hash links don't correspond to routes, so never active
    }

    // Handle absolute URLs
    if (href.startsWith('http')) {
      return false; // External links are never active
    }

    // Handle relative paths
    // Remove leading slash for comparison
    const cleanHref = href.startsWith('/') ? href.slice(1) : href;
    const cleanPathname = pathname.startsWith('/')
      ? pathname.slice(1)
      : pathname;

    // Exact match
    if (cleanPathname === cleanHref) {
      return true;
    }

    // Handle home page - if href is empty or '/' and pathname is 'home'
    if ((cleanHref === '' || cleanHref === '/') && cleanPathname === 'home') {
      return true;
    }

    // Handle nested paths (e.g., /about matches /about/team)
    if (cleanPathname.startsWith(cleanHref + '/')) {
      return true;
    }

    return false;
  };

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
  const showBorder =
    layout === 'bordered-centered' &&
    (position === 'relative' || position === 'static');
  // Add margin class for bordered layout when position is absolute (without border)
  const showAbsoluteMargin =
    layout === 'bordered-centered' && position === 'absolute';

  const baseLayoutClass =
    layout === 'centered'
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

  const navbarClass = forceHamburgerMenu
    ? `${baseLayoutClass} ${styles.forceHamburger}`
    : baseLayoutClass;
  const navItems = [...leftNavItems, ...rightNavItems];

  useEffect(() => {
    if (!forceHamburgerMenu) {
      setMenuCartCount(bagCount);
      return;
    }

    const readMenuCartCount = () => {
      try {
        const raw = window.localStorage.getItem(MENU_CART_STORAGE_KEY);

        if (!raw) {
          setMenuCartCount(0);
          return;
        }

        const parsed = JSON.parse(raw) as {
          items?: Array<{ quantity?: number }>;
        };

        if (!Array.isArray(parsed.items)) {
          setMenuCartCount(0);
          return;
        }

        const nextCount = parsed.items.reduce(
          (sum, item) =>
            sum + (typeof item?.quantity === 'number' ? item.quantity : 0),
          0,
        );

        setMenuCartCount(nextCount);
      } catch {
        setMenuCartCount(0);
      }
    };

    const handleCartUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<{ itemCount?: number }>;

      if (typeof customEvent.detail?.itemCount === 'number') {
        setMenuCartCount(customEvent.detail.itemCount);
        return;
      }

      readMenuCartCount();
    };

    readMenuCartCount();
    window.addEventListener(
      MENU_CART_UPDATED_EVENT,
      handleCartUpdated as EventListener,
    );
    window.addEventListener('storage', readMenuCartCount);

    return () => {
      window.removeEventListener(
        MENU_CART_UPDATED_EVENT,
        handleCartUpdated as EventListener,
      );
      window.removeEventListener('storage', readMenuCartCount);
    };
  }, [bagCount, forceHamburgerMenu]);

  const resolvedBagCount = forceHamburgerMenu ? menuCartCount : bagCount;

  // Stacked layout has a different structure
  if (layout === 'stacked') {
    return (
      <>
        <nav className={navbarClass} style={navbarStyle}>
          {/* Mobile menu button */}
          <button
            onClick={toggleSidebar}
            className={styles.menuButtonStacked}
            aria-label="Menu"
          >
            {isSidebarOpen ? (
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M18 6L6 18"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <path
                  d="M6 6L18 18"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            ) : (
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M3 12H21"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <path
                  d="M3 6H21"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <path
                  d="M3 18H21"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            )}
          </button>

          {/* Stacked layout container */}
          <div className={styles.stackedContainer}>
            {/* Logo on top */}
            <div className={styles.stackedLogo}>{brandDisplay}</div>

            {/* Nav items and button below */}
            <div className={styles.stackedNav}>
              {leftNavItems.map((item, index) => (
                <a
                  key={index}
                  href={item.href}
                  className={`${styles.navLink} ${isNavItemActive(item.href) ? styles.navLinkActive : ''}`}
                >
                  {item.label}
                </a>
              ))}
              {rightNavItems.map((item, index) => (
                <a
                  key={`right-${index}`}
                  href={item.href}
                  className={`${styles.navLink} ${isNavItemActive(item.href) ? styles.navLinkActive : ''}`}
                >
                  {item.label}
                </a>
              ))}
              {showCtaButton && ctaButton && !forceHamburgerMenu && (
                <a href={ctaButton.href} className={styles.ctaButton}>
                  {ctaButton.label}
                </a>
              )}
            </div>
          </div>

          {/* Mobile logo center */}
          <div className={styles.stackedLogoMobile}>{brandDisplay}</div>
        </nav>

        {/* Mobile Sidebar */}
        <div
          className={`${styles.sidebar} ${isSidebarOpen ? styles.open : styles.closed} ${forceHamburgerMenu ? styles.forceSidebarDesktop : ''}`}
          style={navbarStyle}
        >
          <div onClick={toggleSidebar} className={styles.sidebarOverlay}></div>

          <div className={styles.sidebarContent}>
            <button
              onClick={toggleSidebar}
              className={styles.closeButton}
              aria-label="Close"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M18 6L6 18"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <path
                  d="M6 6L18 18"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>

            <div className={styles.sidebarHeader}>
              <div className={styles.sidebarBrand}>{brandDisplay}</div>
              <p className={styles.sidebarLabel}>Navigation</p>
            </div>

            <div className={styles.sidebarNavList}>
              {navItems.map((item, index) => (
                <a
                  key={`${item.href}-${index}`}
                  href={item.href}
                  className={styles.sidebarLink}
                >
                  {item.label}
                </a>
              ))}
            </div>

            {showCtaButton && ctaButton && !forceHamburgerMenu && (
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
          <button
            onClick={toggleSidebar}
            className={styles.menuButton}
            aria-label="Menu"
          >
            {isSidebarOpen ? (
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M18 6L6 18"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <path
                  d="M6 6L18 18"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            ) : (
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M3 12H21"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <path
                  d="M3 6H21"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <path
                  d="M3 18H21"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            )}
          </button>
          {layout === 'logo-center' || layout === 'split' ? (
            <div className={styles.desktopNavLeft}>
              {leftNavItems.map((item, index) => (
                <a
                  key={index}
                  href={item.href}
                  className={`${styles.navLink} ${isNavItemActive(item.href) ? styles.navLinkActive : ''}`}
                >
                  {item.label}
                </a>
              ))}
              {rightNavItems.map((item, index) => (
                <a
                  key={`right-${index}`}
                  href={item.href}
                  className={`${styles.navLink} ${isNavItemActive(item.href) ? styles.navLinkActive : ''}`}
                >
                  {item.label}
                </a>
              ))}
            </div>
          ) : layout === 'logo-left-items-left' ? (
            <>
              <div className={styles.brandLogo}>{brandDisplay}</div>
              <div className={styles.desktopNavLeft}>
                {leftNavItems.map((item, index) => (
                  <a
                    key={index}
                    href={item.href}
                    className={`${styles.navLink} ${isNavItemActive(item.href) ? styles.navLinkActive : ''}`}
                  >
                    {item.label}
                  </a>
                ))}
                {rightNavItems.map((item, index) => (
                  <a
                    key={`right-${index}`}
                    href={item.href}
                    className={`${styles.navLink} ${isNavItemActive(item.href) ? styles.navLinkActive : ''}`}
                  >
                    {item.label}
                  </a>
                ))}
              </div>
            </>
          ) : (
            <div className={styles.brandLogo}>{brandDisplay}</div>
          )}
        </div>

        {/* Center - Logo (mobile or logo-center/split layout) or Nav Items (centered/bordered-centered layout) */}
        <div className={styles.centerSection}>
          {forceHamburgerMenu ? (
            <div className={styles.brandLogoMobile}>{brandDisplay}</div>
          ) : layout === 'centered' || layout === 'bordered-centered' ? (
            <>
              {/* Desktop: Nav items */}
              <div className={styles.desktopNavCentered}>
                {leftNavItems.map((item, index) => (
                  <a
                    key={index}
                    href={item.href}
                    className={`${styles.navLink} ${isNavItemActive(item.href) ? styles.navLinkActive : ''}`}
                  >
                    {item.label}
                  </a>
                ))}
                {rightNavItems.map((item, index) => (
                  <a
                    key={`right-${index}`}
                    href={item.href}
                    className={`${styles.navLink} ${isNavItemActive(item.href) ? styles.navLinkActive : ''}`}
                  >
                    {item.label}
                  </a>
                ))}
              </div>
              {/* Mobile: Logo */}
              <div className={styles.brandLogoMobile}>{brandDisplay}</div>
            </>
          ) : layout === 'logo-center' || layout === 'split' ? (
            <>
              {/* Desktop: Logo in center */}
              <div className={styles.brandLogoCenter}>{brandDisplay}</div>
              {/* Mobile: Logo in center */}
              <div className={styles.brandLogoMobile}>{brandDisplay}</div>
            </>
          ) : (
            <div className={styles.brandLogoMobile}>{brandDisplay}</div>
          )}
        </div>

        {/* Right Section - All Menu Items (default) or Text + Button (split) or Button only (others) */}
        <div className={styles.rightSection}>
          {forceHamburgerMenu ? (
            <div className={styles.menuPageActions}>
              <a href="/login" className={styles.menuAuthLink}>
                Sign In
              </a>
              <a href="/signup" className={styles.menuAuthLink}>
                Sign Up
              </a>
              <div id="menu-navbar-auth-slot" className={styles.menuProfileSlot} />
              <a
                href="/cart"
                className={styles.menuCartLink}
                aria-label={
                  resolvedBagCount > 0
                    ? `Cart with ${resolvedBagCount} items`
                    : 'Cart'
                }
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path
                    d="M3 4H5L7.4 14.2C7.5 14.8 8 15.2 8.6 15.2H17.7C18.3 15.2 18.9 14.8 19 14.2L21 7.2H6.2"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle cx="9.5" cy="19.2" r="1.5" fill="currentColor" />
                  <circle cx="17" cy="19.2" r="1.5" fill="currentColor" />
                </svg>
                {resolvedBagCount > 0 && (
                  <span className={styles.menuCartCount}>
                    {resolvedBagCount}
                  </span>
                )}
              </a>
            </div>
          ) : (
            <>
              {layout === 'default' && (
                <div className={styles.desktopNav}>
                  {leftNavItems.map((item, index) => (
                    <a
                      key={index}
                      href={item.href}
                      className={`${styles.navLink} ${isNavItemActive(item.href) ? styles.navLinkActive : ''}`}
                    >
                      {item.label}
                    </a>
                  ))}
                  {rightNavItems.map((item, index) => (
                    <a
                      key={`right-${index}`}
                      href={item.href}
                      className={`${styles.navLink} ${isNavItemActive(item.href) ? styles.navLinkActive : ''}`}
                    >
                      {item.label}
                    </a>
                  ))}
                </div>
              )}
              {layout === 'split' && additionalText && (
                <span className={styles.additionalText}>{additionalText}</span>
              )}
              {showCtaButton && ctaButton && !forceHamburgerMenu && (
                <a href={ctaButton.href} className={styles.ctaButton}>
                  {ctaButton.label}
                </a>
              )}
            </>
          )}
        </div>
      </nav>

      {/* Mobile Sidebar */}
      <div
        className={`${styles.sidebar} ${isSidebarOpen ? styles.open : styles.closed} ${forceHamburgerMenu ? styles.forceSidebarDesktop : ''}`}
        style={navbarStyle}
      >
        <div onClick={toggleSidebar} className={styles.sidebarOverlay}></div>

        <div className={styles.sidebarContent}>
          <button
            onClick={toggleSidebar}
            className={styles.closeButton}
            aria-label="Close"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M18 6L6 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M6 6L18 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>

          <div className={styles.sidebarHeader}>
            <div className={styles.sidebarBrand}>{brandDisplay}</div>
            <p className={styles.sidebarLabel}>Navigation</p>
          </div>

          <div className={styles.sidebarNavList}>
            {navItems.map((item, index) => (
              <a
                key={`${item.href}-${index}`}
                href={item.href}
                className={`${styles.sidebarLink} ${isNavItemActive(item.href) ? styles.sidebarLinkActive : ''}`}
              >
                {item.label}
              </a>
            ))}
          </div>

          {forceHamburgerMenu && (
            <div className={styles.sidebarActions}>
              <a href="/login" className={styles.sidebarActionLink}>
                Sign In
              </a>
              <a href="/signup" className={styles.sidebarActionLink}>
                Sign Up
              </a>
              <a
                href="/cart"
                className={`${styles.sidebarActionLink} ${styles.sidebarActionPrimary}`}
              >
                Cart {resolvedBagCount > 0 ? `(${resolvedBagCount})` : ''}
              </a>
            </div>
          )}

          {showCtaButton && ctaButton && !forceHamburgerMenu && (
            <a href={ctaButton.href} className={styles.sidebarCta}>
              {ctaButton.label}
            </a>
          )}
        </div>
      </div>
    </>
  );
}
