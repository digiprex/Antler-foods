# Antler Foods — Multi-Tenant Restaurant Platform

A full-stack, multi-tenant restaurant SaaS platform built with **Next.js 14 (App Router)**, **Nhost (Hasura GraphQL)**, and **Stripe**. Each restaurant gets its own branded website with online ordering, marketing tools, analytics, and a complete admin dashboard — all managed from a single codebase.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Architecture Overview](#architecture-overview)
- [Multi-Tenant System](#multi-tenant-system)
- [Authentication](#authentication)
- [Admin Dashboard](#admin-dashboard)
- [Menu System](#menu-system)
- [Online Ordering & Checkout](#online-ordering--checkout)
- [Payment Processing](#payment-processing)
- [Page Builder & Dynamic Sections](#page-builder--dynamic-sections)
- [Blog](#blog)
- [Custom Forms](#custom-forms)
- [Marketing & Campaigns](#marketing--campaigns)
- [Loyalty Program](#loyalty-program)
- [Coupons & Offers](#coupons--offers)
- [Newsletter](#newsletter)
- [Google Business Integration](#google-business-integration)
- [Reviews](#reviews)
- [Analytics](#analytics)
- [Media & Image Management](#media--image-management)
- [SEO](#seo)
- [Theming & Global Styles](#theming--global-styles)
- [Domain Management](#domain-management)
- [Delivery Integrations](#delivery-integrations)
- [Kitchen Printing](#kitchen-printing)
- [AI Content Generation](#ai-content-generation)
- [Email & SMS Communications](#email--sms-communications)
- [End-to-End Flows](#end-to-end-flows)
- [Project Structure](#project-structure)
- [Environment Variables](#environment-variables)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript (strict mode) |
| Backend | Nhost (Hasura GraphQL + Auth + Storage) |
| Database | PostgreSQL (via Hasura) |
| Payments | Stripe (Checkout, Connect, Webhooks) |
| Styling | Tailwind CSS + SCSS Modules |
| Forms | React Hook Form + Zod validation |
| Email | Nodemailer (SMTP / Gmail) |
| SMS | Twilio |
| Analytics | Umami (self-hosted) |
| Maps | Google Maps / Google Places |
| AI | Amazon Bedrock, OpenAI, Google Vertex AI (fallback chain) |
| Storage | Nhost Storage (S3-compatible) |
| Image Processing | Sharp |
| Domains | Vercel API (custom domain provisioning) |
| Printing | Qz-Tray (thermal receipt printers) |
| Delivery | DoorDash Drive, Uber Direct |

---

## Getting Started

```bash
# Install dependencies
npm install

# Start development server (runs on port 1000)
npm run dev

# Production build
npm run build

# Start production server
npm start

# Lint
npm run lint
```

No test framework is configured. Dev server runs on `http://localhost:1000`.

---

## Architecture Overview

```
Browser Request
    |
    v
Next.js Middleware (src/middleware.ts)
    |--- resolveRestaurantIdByDomain() maps domain -> restaurant_id
    |
    v
App Router
    |--- /admin/*          -> Admin dashboard (Nhost auth)
    |--- /menu             -> Restaurant menu (customer JWT auth)
    |--- /blogs            -> Public blog listing
    |--- /[slug]           -> Dynamic restaurant pages
    |--- /api/*            -> ~130 API routes
    |
    v
Nhost (Hasura GraphQL)
    |--- Two query modes:
    |    Client-side: fetchGraphQL() with bearer token
    |    Server-side: adminGraphqlRequest() with hasura-admin-secret
    |
    v
PostgreSQL Database
```

**Path alias:** `@/*` maps to `src/*`

---

## Multi-Tenant System

Every restaurant is an isolated tenant identified by its domain.

- **Domain resolution**: Middleware resolves the incoming domain (custom or staging) to a `restaurant_id` via the `restaurants` table
- **Staging domains**: Each restaurant has a staging domain for pre-launch testing (e.g., `my-restaurant.antlerfoods.com`)
- **Custom domains**: Production domains provisioned via Vercel API (e.g., `www.myrestaurant.com`)
- **Data isolation**: All queries filter by `restaurant_id` — menus, orders, customers, pages, and configs are scoped per restaurant
- **Per-restaurant config**: Branding, colors, fonts, payment settings, operating hours, marketing campaigns, and sections are all independent

---

## Authentication

The platform runs two independent auth systems:

### Admin / Owner Auth (Nhost)
- Built-in Nhost authentication with JWT
- Tab-isolated sessions via `sessionStorage` (prefix: `antler-foods`)
- RBAC roles: `admin`, `manager`, `owner`, `client`
- Route protection defined in `src/lib/auth/routes.ts`
- Password reset with email verification

### Customer / Menu Auth (Custom JWT)
- Custom JWT-based session system (not Nhost)
- Login with email + password
- Signup with email/phone opt-in for SMS and email promotions
- Guest checkout — creates a guest customer record (`is_guest: true`, no password)
- Guest-to-registered conversion — if a guest later signs up with the same email, the existing record is upgraded
- OTP verification (optional)
- Saved delivery addresses
- Password reset via email

**Key files:**
- `src/features/restaurant-menu/lib/server/customer-auth.ts` — Core auth logic
- `src/app/api/menu-auth/*` — Auth API routes (login, signup, guest, session, logout, etc.)
- `src/features/restaurant-menu/components/menu-signup-form.tsx` — Signup form
- `src/features/restaurant-menu/components/menu-login-form.tsx` — Login form

---

## Admin Dashboard

A comprehensive admin panel with ~50 pages for restaurant management.

### Menu Management
| Page | Description |
|------|------------|
| Menu Management | Central menu overview |
| Menu Categories | Create/edit/reorder menu categories |
| Menu Items | Add items with images, pricing, modifiers, stock status |
| Modifier Groups | Configurable add-ons, sizes, portions (Regular type) |
| Menu Schedules | Time-based menu availability (e.g., lunch 11am-3pm) |
| Menu Settings | Global menu configuration |

### Orders & Fulfillment
| Page | Description |
|------|------------|
| Orders | Live order management with status updates |
| Order Settings | Payment methods, tips, service fees, delivery config |
| Printer Settings | Thermal receipt / KOT printer integration (Qz-Tray) |
| QR Codes | Generate QR codes for dine-in ordering |

### Page Builder & Design
| Page | Description |
|------|------------|
| Pages | List and manage custom website pages |
| Hero Settings | Configure hero banner sections |
| Navbar Settings | Navigation bar layout, colors, CTA button |
| Footer Settings | Footer content, links, social media |
| Gallery Settings | Image gallery sections |
| FAQ Settings | FAQ accordion sections |
| Timeline Settings | Milestone/history timeline sections |
| YouTube Settings | Embedded video sections |
| Custom Section Settings | Drag-and-drop custom sections |
| Custom Code Settings | Embed raw HTML/CSS/JS |
| Scrolling Text Settings | Marquee text announcements |
| Announcement Bar | Top bar announcements |
| Popup Settings | Modal popup campaigns |
| Select Theme | Theme selection and preview |
| Global Style Settings | Brand fonts, colors, button styles |

### Marketing & Promotions
| Page | Description |
|------|------------|
| Campaigns | Email campaign creation and scheduling |
| SMS Campaigns | SMS marketing via Twilio |
| Discounts | Coupon creation with rules |
| Offers | Time-limited promotional offers |
| Loyalty Settings | Points-per-dollar, redemption configuration |
| Gift Cards | Gift card management |

### Content & Communication
| Page | Description |
|------|------------|
| Blog Posts | Blog post CRUD with markdown editor and image gallery |
| Forms | Custom form builder (contact, catering, reservation) |
| Form Submissions | View and filter submitted responses |
| Newsletter Submissions | Newsletter subscriber management |

### Analytics & Customers
| Page | Description |
|------|------------|
| Site Analytics | Umami dashboard (pageviews, visitors, traffic sources) |
| Customers | Customer database and management |

### Settings
| Page | Description |
|------|------------|
| Location Settings | Restaurant address and multi-location support |
| Domain Settings | Staging and custom domain configuration |
| SEO Settings | Meta titles, descriptions, keywords per page |
| Review Settings | Google Reviews import and display |

---

## Menu System

### Structure
- **Categories** — Group menu items (e.g., Appetizers, Mains, Desserts) with ordering
- **Items** — Individual dishes with name, description, image, base price, pickup/delivery price variants, stock status, popularity badges, loyalty points value
- **Modifier Groups** — Customization groups (e.g., "Choose Size", "Add Toppings") with min/max selection rules
- **Modifier Items** — Individual options within a group with pricing

### Features
- Category-based navigation with tabs
- Full-text search across items
- Popular items carousel
- Item detail modal with modifier selection
- Quick-add with quantity stepper
- Schedule-based availability (show/hide items by day/time)
- Multiple menu layout templates

### Key files
- `src/features/restaurant-menu/components/menu-page.tsx` — Main menu page
- `src/features/restaurant-menu/components/item-details-modal.tsx` — Item modal
- `src/app/api/categories/route.ts` — Categories API
- `src/app/api/items/route.ts` — Items API
- `src/app/api/modifier-groups/route.ts` — Modifier groups API

---

## Online Ordering & Checkout

### Order Flow (End-to-End)

1. **Browse Menu** — Customer views categories, searches items, reads descriptions
2. **Add to Cart** — Select modifiers/add-ons, choose quantity, add to cart
3. **Cart Management** — Side drawer cart with edit/remove items, quantity changes
4. **Checkout** — Proceed to checkout page
5. **Fulfillment Selection** — Choose pickup or delivery
6. **Delivery Address** — Enter address with Google Places autocomplete (delivery only)
7. **Schedule Order** — Optionally schedule for a future time
8. **Contact Info** — Enter name, email, phone (guest checkout or logged-in)
9. **Opt-in** — SMS/email promotional opt-in checkboxes (guest checkout only)
10. **Apply Coupons** — Enter coupon code or select available offers
11. **Apply Gift Card** — Redeem gift card balance
12. **Redeem Loyalty Points** — Apply loyalty points for discount
13. **Tips** — Select preset percentage or enter custom tip
14. **Payment** — Pay with Stripe (card) or cash at location
15. **Order Confirmation** — Payment confirmed, order placed
16. **Email Receipt** — Order confirmation email sent to customer
17. **Kitchen** — Order appears in admin orders panel, optional KOT print

### Cart System
- React Context + localStorage (`restaurant-menu-cart-v1`)
- Cross-tab sync via `restaurant-menu-cart-updated` custom events
- Hydration guard to prevent SSR/client mismatches
- Persistent across page reloads

### Fulfillment Modes
- **Pickup** — Customer picks up at restaurant location
- **Delivery** — Delivery quote via DoorDash Drive or Uber Direct

### Key files
- `src/features/restaurant-menu/components/checkout-page.tsx` — Full checkout flow
- `src/features/restaurant-menu/components/cart-drawer.tsx` — Cart side drawer
- `src/features/restaurant-menu/context/cart-context.tsx` — Cart state management
- `src/app/api/menu-orders/checkout/route.ts` — Order creation API
- `src/app/api/menu-orders/confirm-payment/route.ts` — Payment confirmation

---

## Payment Processing

### Stripe Integration
- **Stripe Checkout** — Card payment processing for orders
- **Stripe Connect** — Per-restaurant Stripe accounts for direct payouts
- **Webhooks** — `src/app/api/webhooks/stripe/route.ts` handles payment events (verified with `STRIPE_WEBHOOK_SECRET`)
- **Connect Webhooks** — `src/app/api/webhooks/stripe-connect/route.ts` for Connect account events

### Payment Methods
- Credit/debit card via Stripe Elements
- Cash on pickup (configurable per restaurant)
- Gift card redemption
- Loyalty points redemption

### Payouts
- Automated payout batches: `src/app/api/payout-batches/`
- Payout statement PDF generation
- Cron-based processing: `src/app/api/cron/restaurant-payouts/`

### Key files
- `src/lib/server/stripe.ts` — Stripe server utilities
- `src/lib/server/restaurant-stripe-accounts.ts` — Connect account management
- `src/features/restaurant-menu/components/stripe-payment-section.tsx` — Payment UI

---

## Page Builder & Dynamic Sections

Restaurant websites are composed of configurable, reorderable sections. Each section type has multiple layout templates.

### Available Section Types

| Section | Description | Layouts |
|---------|------------|---------|
| **Hero** | Banner with image, heading, CTA | 8+ templates |
| **Menu** | Menu display with categories | Multiple grid/list layouts |
| **Gallery** | Image gallery | 6+ grid/masonry layouts |
| **FAQ** | Accordion Q&A | 3+ templates |
| **Timeline** | Event milestones | 2+ templates |
| **Reviews** | Customer/Google reviews | 3+ templates (grid/carousel) |
| **YouTube** | Embedded video | 2+ templates |
| **Location** | Store locator with map | 2+ templates |
| **Custom Section** | Free-form content blocks | Drag-and-drop builder |
| **Scrolling Text** | Marquee announcements | Configurable speed/direction |
| **Custom Code** | Raw HTML/CSS/JS embed | Freeform |
| **Form** | Embedded custom forms | Linked to form builder |
| **Navbar** | Navigation bar | 6+ layouts (centered, split, stacked, etc.) |
| **Footer** | Footer with links/social | 3+ layouts |
| **Announcement Bar** | Top banner bar | Customizable colors/text |
| **Popup** | Modal campaign | Timed display |

### How It Works
1. Admin creates pages in the page builder
2. Each page has an ordered list of section templates (stored in `templates` table)
3. Public pages (`/[slug]`) fetch templates via `/api/page-details`
4. `page-client.tsx` renders each section dynamically via a switch on `template.category`
5. Sections sorted by `order_index` for display order
6. Styles generated dynamically via `src/lib/section-style.ts`

### Key files
- `src/app/[slug]/page-client.tsx` — Dynamic section renderer
- `src/components/custom-section-renderer.tsx` — Core layout engine (~1000 lines)
- `src/lib/section-style.ts` — Dynamic style generation (~1000 lines)
- `src/data/` — JSON layout definitions for each section type

---

## Blog

### Admin Features
- Create, edit, delete blog posts
- Fields: title, slug (auto-generated), author, excerpt, content, cover image, tags, status (draft/published)
- Markdown content editor with formatting toolbar (bold, italic, headings, links, lists, quotes, code, dividers)
- Cover image selection from media gallery or upload
- Tag management (add/remove)
- Status toggle (publish/unpublish) directly from table
- Search and status filters

### Public Blog Page
- `/blogs` — Lists all published blog posts in a card grid
- Click to view full post with rendered markdown content
- Respects restaurant's global styles (font family, colors, accent)
- "Blogs" link appears in navbar automatically when published posts exist

### Key files
- `src/app/admin/blog-posts/page.tsx` — Admin CRUD page
- `src/app/blogs/page.tsx` — Public blog page
- `src/app/api/admin/blog-posts/route.ts` — Admin API (GET, POST, PATCH, DELETE)
- `src/app/api/blog-posts/route.ts` — Public API (published posts only)

---

## Custom Forms

### Form Builder
- Drag-and-drop form builder at `/admin/forms/builder`
- Field types: text, email, phone, textarea, select, radio, checkbox, number, date, file upload
- Field validation: required, regex patterns, email/phone format
- Pre-built templates: contact, catering request, reservation

### Form Submissions
- Stored in database with soft-delete support
- Admin view with filters: search, form type, mail status, date range
- Notification emails sent to restaurant owner and POC email (deduplicated)
- Customer confirmation email sent on submission
- Success feedback on submit button (text and color change)

### Key files
- `src/app/admin/forms/` — Form builder and management
- `src/app/admin/form-submissions/page.tsx` — Submissions viewer with filters
- `src/app/api/forms/route.ts` — Form CRUD
- `src/app/api/form-submissions/route.ts` — Submission handling
- `src/components/dynamic-form.tsx` — Public form renderer

---

## Marketing & Campaigns

### Email Campaigns
- Template-based email creation with rich HTML
- Recipient targeting (newsletter subscribers, customers)
- Scheduling and automation
- Open/click tracking via tracking pixels (`/api/email/track/open/[logId]`, `/api/email/track/click/[logId]`)
- Email logs with delivery status
- Sent via Nodemailer (SMTP)

### SMS Campaigns
- SMS marketing via Twilio
- Template support with variable substitution
- Scheduling
- Delivery tracking

### Automated Messages
- **Welcome email** — Sent on customer signup (if campaign enabled)
- **Welcome SMS** — Sent on customer signup (if campaign enabled)
- **Order confirmation** — Sent after successful order
- **Form submission confirmation** — Sent to customer after form submit
- **Password reset** — Transactional email with reset link

### Key files
- `src/app/admin/campaigns/page.tsx` — Email campaign management
- `src/app/admin/sms-campaigns/page.tsx` — SMS campaign management
- `src/lib/server/email.ts` — Email sending utilities
- `src/lib/server/twilio.ts` — SMS sending utilities
- `src/app/api/cron/campaigns/route.ts` — Scheduled campaign processing

---

## Loyalty Program

- Points-per-dollar-spent (configurable rate)
- Points earned on every completed order
- Points redeemable at checkout for discounts
- Balance visible on customer profile and checkout
- Admin configures earning rate and redemption rules

### Key files
- `src/app/admin/loyalty-settings/page.tsx` — Loyalty configuration
- `src/app/api/menu-orders/loyalty-balance/route.ts` — Balance API

---

## Coupons & Offers

### Coupons
- Fixed amount or percentage discounts
- Minimum spend requirements
- Usage limits (per customer or total)
- Expiration dates
- Category or item-specific restrictions

### Promotional Offers
- Time-limited offers (e.g., "Buy 1 Get 1", "Free Item with $30+")
- Smart discount targeting by category/item
- Visible in menu offers showcase and checkout

### Key files
- `src/app/admin/discounts/page.tsx` — Coupon management
- `src/app/admin/offers/page.tsx` — Offer management
- `src/app/api/coupons/route.ts` — Coupon CRUD
- `src/app/api/menu-orders/validate-coupon/route.ts` — Coupon validation
- `src/features/restaurant-menu/lib/server/menu-offers.ts` — Offer processing

---

## Newsletter

- Subscriber collection via footer newsletter form
- Per-restaurant subscriber lists (same email can subscribe to different restaurants)
- Duplicate detection scoped by `restaurant_id`
- Success/already-subscribed feedback on subscribe button
- Soft-delete support for unsubscribes
- Admin view at `/admin/newsletter-submissions`

### Key files
- `src/components/footer.tsx` — Newsletter form in footer
- `src/app/api/newsletter/route.ts` — Subscription API
- `src/app/api/newsletter-submissions/route.ts` — Subscriber management

---

## Google Business Integration

- **OAuth connection** — Connect restaurant's Google Business Profile
- **Reviews import** — Fetch and display Google reviews on website
- **Review replies** — Reply to Google reviews from admin dashboard
- **Photo import** — Import Google Business photos into media library
- **Social links** — Extract social media links from Google profile
- **Opening hours** — Sync business hours from Google

### Key files
- `src/lib/server/google-business-api.ts` — Google API client
- `src/lib/server/google-business-oauth.ts` — OAuth flow
- `src/app/api/restaurants/[restaurantId]/google-business/` — Google Business APIs
- `src/app/api/restaurants/[restaurantId]/google-photos/` — Photo import APIs

---

## Reviews

- Import reviews from Google Business Profile
- Display on website via review section templates (grid, carousel)
- Admin moderation and management
- Reply to Google reviews from dashboard
- Star rating display with reviewer info

### Key files
- `src/app/admin/review-settings/page.tsx` — Review configuration
- `src/components/dynamic-reviews.tsx` — Public review display
- `src/app/api/reviews/route.ts` — Reviews API

---

## Analytics

### Umami Integration
- Self-hosted website analytics
- Pageviews, unique visitors, bounce rate
- Traffic sources and referrers
- Browser, OS, device breakdown
- Geographic visitor data
- Top pages, entry/exit pages
- Custom event tracking

### Email Analytics
- Open rate tracking (pixel-based)
- Click-through tracking
- Delivery status logs

### Admin Dashboard
- `/admin/site-analytics` — Full analytics dashboard
- Summary metrics with date range selection

### Key files
- `src/lib/server/umami.ts` — Umami API client
- `src/components/umami-analytics.tsx` — Analytics script injection
- `src/app/api/site-analytics/route.ts` — Analytics data API

---

## Media & Image Management

- **Upload** — File upload to Nhost Storage (S3-compatible)
- **Gallery modal** — Reusable `ImageGalleryModal` component for selecting/uploading images across admin
- **Optimization** — Sharp library for server-side image processing (resize, WebP conversion)
- **Image proxy** — `/api/image-proxy` serves and optimizes external images
- **Optimized upload** — `/api/upload-optimized-media` for automatic compression

### Key files
- `src/components/admin/image-gallery-modal.tsx` — Image picker modal
- `src/app/api/media/` — Media CRUD and upload
- `src/app/api/upload-optimized-media/route.ts` — Optimized upload
- `src/app/api/image-proxy/route.ts` — Image proxy

---

## SEO

- **Dynamic metadata** — Per-page title, description, OG tags, Twitter cards
- **Canonical URLs** — Automatic canonical URL generation
- **Dynamic favicon** — Per-restaurant favicon from restaurant settings
- **Sitemap** — Dynamic sitemap generation (`src/app/sitemap.ts`)
- **Robots.txt** — Configurable robots file (`src/app/robots.ts`)
- **Admin SEO settings** — `/admin/seo-settings` for per-page meta configuration

### Key files
- `src/lib/seo.ts` — SEO metadata utilities
- `src/app/[slug]/page.tsx` — Server-side metadata generation for dynamic pages

---

## Theming & Global Styles

### Global Style System
Each restaurant has a `global_styles` JSON config stored on the `restaurants` table:

- **Title** — Font family, size, weight, color, line height, letter spacing, text transform
- **Subheading** — Same properties for H2/H3
- **Paragraph** — Body text styling
- **Primary Button** — Background, text color, border radius, hover states
- **Secondary Button** — Alternative button styling
- **Theme colors** — Primary, secondary, accent, background, text

### Application Flow
1. Components fetch global styles via `useGlobalStyleConfig()` hook
2. Styles merged with defaults via `mergeGlobalStyleConfig()`
3. Converted to CSS via `getSectionTypographyStyles()`
4. Applied as inline styles to components

### Theme Selection
- Pre-built theme templates available at `/admin/select-theme`
- Applying a theme updates the `global_styles` column
- All dynamic components re-render with new styles

### Key files
- `src/types/global-style.types.ts` — Type definitions and defaults
- `src/hooks/use-global-style-config.ts` — React hook for fetching styles
- `src/lib/section-style.ts` — Style merging and CSS generation
- `src/app/api/global-style-config/route.ts` — Global styles API
- `src/app/api/themes/apply/route.ts` — Theme application

---

## Domain Management

- **Staging domains** — Auto-provisioned for development/preview
- **Custom domains** — Production domains managed via Vercel API
- **Domain verification** — DNS verification flow
- **Deploy hooks** — Trigger Vercel deployments on publish

### Key files
- `src/lib/server/vercel-domains.ts` — Vercel domain API
- `src/lib/server/vercel-deploy.ts` — Deploy hook triggers
- `src/app/api/domain-config/route.ts` — Domain configuration
- `src/app/api/domain-verify/route.ts` — Domain verification

---

## Delivery Integrations

- **DoorDash Drive** — Delivery quote calculation and fulfillment
- **Uber Direct** — Alternative delivery provider
- Webhook handlers for delivery status updates
- Delivery fee displayed at checkout

### Key files
- `src/lib/server/delivery/doordash-drive.ts` — DoorDash API client
- `src/lib/server/delivery/uber-direct.ts` — Uber Direct API client
- `src/app/api/menu-orders/delivery-quote/route.ts` — Quote API
- `src/app/api/webhooks/doordash-drive/route.ts` — DoorDash webhooks
- `src/app/api/webhooks/uber-direct/route.ts` — Uber webhooks

---

## Kitchen Printing

- **Qz-Tray** integration for thermal receipt printers
- KOT (Kitchen Order Ticket) generation in ESC/POS format
- PDF ticket generation as fallback
- Printer settings configurable per restaurant

### Key files
- `src/lib/qz-tray.ts` — Qz-Tray printer interface
- `src/lib/generate-kot-escpos.ts` — ESC/POS receipt generation
- `src/lib/generate-kitchen-ticket-pdf.ts` — PDF ticket generation
- `src/app/admin/printer-settings/page.tsx` — Printer configuration

---

## AI Content Generation

AI-powered content generation with a fallback chain:

1. **Amazon Bedrock** (primary)
2. **OpenAI** (fallback)
3. **Google Vertex AI** (fallback)

Each provider is tried only when the previous one errors.

### Use Cases
- Footer content generation based on restaurant info
- Website initialization — generate initial page content for new restaurants

### Key files
- `src/app/api/generate-footer-content/route.ts` — AI footer generation
- `src/app/api/restaurants/[restaurantId]/initialize-website/route.ts` — AI website setup

---

## Email & SMS Communications

### Email (Nodemailer)
- Campaign emails with rich HTML templates
- Order confirmation emails
- Form submission confirmations (to customer and restaurant)
- Welcome emails on customer signup
- Password reset emails
- Invoice emails
- Open/click tracking

### SMS (Twilio)
- SMS marketing campaigns
- Welcome SMS on customer signup
- Order status notifications

### Key files
- `src/lib/server/email.ts` — Email utilities and templates
- `src/lib/server/twilio.ts` — SMS utilities

---

## End-to-End Flows

### Customer Registration Flow
1. Customer opens signup form on `/menu` (via auth sidebar)
2. Enters first name, last name (optional), email/phone, password
3. Opts in/out for promotional emails and SMS
4. Form validates via Zod schema (email or phone required)
5. `POST /api/menu-auth/signup` creates customer record
6. Backend checks for existing email/phone (scoped to restaurant)
7. If guest record exists with same email — upgrades to registered account
8. Stores `email_opt_in` and `sms_opt_in` preferences
9. Fire-and-forget welcome email/SMS (if campaign enabled)
10. Customer redirected to login page

### Guest Checkout Flow
1. Customer adds items to cart without logging in
2. Proceeds to checkout
3. Sees "Sign in" prompt with option to continue as guest
4. Enters contact info (name, email, phone)
5. Sees email/SMS opt-in checkboxes (guest checkout only — not shown for logged-in users)
6. Selects payment method and submits order
7. `POST /api/menu-auth/guest` creates guest customer (`is_guest: true`)
8. Order placed via `POST /api/menu-orders/checkout`
9. Stripe payment processed
10. Order confirmation email sent

### Order Placement Flow
1. Items in cart with modifiers and quantities
2. Fulfillment mode selected (pickup/delivery)
3. Delivery address validated (if delivery)
4. Coupons, gift cards, loyalty points applied
5. Tip added (optional)
6. `POST /api/menu-orders/checkout` calculates totals
7. Stripe PaymentIntent created
8. Customer confirms payment
9. `POST /api/menu-orders/confirm-payment` finalizes order
10. Order appears in admin panel
11. KOT printed (if printer configured)
12. Admin updates status: preparing -> ready -> completed

### Restaurant Onboarding Flow
1. Admin creates account via Nhost auth
2. Restaurant record created in database
3. `POST /api/restaurants/[id]/initialize-website` generates initial content via AI
4. Staging domain auto-provisioned
5. Admin configures menu, pages, branding, payment settings
6. Custom domain configured and verified
7. Restaurant goes live on custom domain

### Page Publishing Flow
1. Admin creates/edits page in page builder
2. Adds section templates (hero, menu, gallery, etc.)
3. Configures each section (content, styling, layout)
4. Reorders sections via drag-and-drop
5. Toggles page `published` status
6. Sets `show_on_navbar` to add to navigation
7. Public page renders at `/{url_slug}`
8. Navbar auto-updates with new page link

### Blog Publishing Flow
1. Admin creates blog post at `/admin/blog-posts`
2. Fills in title (slug auto-generated), author, excerpt
3. Writes content with markdown formatting toolbar
4. Selects cover image from media gallery
5. Adds tags
6. Sets status to "Published"
7. `published_at` timestamp auto-set
8. "Blogs" link appears in public navbar automatically
9. Post visible on `/blogs` page with restaurant's global styling

### Campaign Sending Flow
1. Admin creates email campaign at `/admin/campaigns`
2. Configures subject, heading, body (HTML)
3. Selects recipients (subscribers, customers)
4. Schedules or sends immediately
5. Cron job (`/api/cron/campaigns`) processes scheduled campaigns
6. Emails sent via Nodemailer with tracking pixels
7. Open/click events tracked via `/api/email/track/*`
8. Campaign analytics visible in admin

### Form Submission Flow
1. Admin builds custom form in form builder
2. Adds form section to a page via page builder
3. Customer fills in form on public page
4. `POST /api/form-submissions` stores submission
5. Notification email sent to restaurant owner and POC (deduplicated)
6. Customer confirmation email sent
7. Submit button shows success state (text + color change)
8. Admin views submissions at `/admin/form-submissions` with filters

### Newsletter Subscription Flow
1. Customer enters email in footer newsletter form
2. `POST /api/newsletter` checks for existing subscription (scoped to restaurant)
3. If new — inserts subscriber record
4. If previously unsubscribed — reactivates subscription
5. If already subscribed — returns 409 (shown as "Already Subscribed!")
6. Newsletter button shows success message with green styling

---

## Project Structure

```
src/
├── app/
│   ├── (public)/          # Public auth pages (login, signup, reset)
│   ├── admin/             # Admin dashboard (~50 pages)
│   ├── api/               # ~130 API routes
│   ├── [slug]/            # Dynamic restaurant pages
│   ├── blogs/             # Public blog listing
│   ├── menu/              # Restaurant menu + checkout
│   ├── cart/              # Cart redirect
│   ├── orders/            # Customer order history
│   ├── profile/           # Customer profile
│   ├── layout.tsx         # Root layout (navbar, footer, providers)
│   ├── globals.css        # Global styles + Tailwind
│   ├── sitemap.ts         # Dynamic sitemap
│   └── robots.ts          # Robots.txt
├── components/
│   ├── admin/             # Admin form components
│   ├── dashboard/         # Dashboard layout (sidebar, header)
│   ├── ui/                # Shared UI components (toast, etc.)
│   ├── navbar.tsx          # Base navbar component
│   ├── dynamic-navbar.tsx  # API-fetching navbar wrapper
│   ├── conditional-navbar.tsx # Route-aware navbar visibility
│   ├── footer.tsx          # Footer component (3 layouts)
│   ├── dynamic-hero.tsx    # Dynamic hero section
│   ├── dynamic-menu.tsx    # Dynamic menu section
│   ├── dynamic-gallery.tsx # Dynamic gallery section
│   ├── dynamic-faq.tsx     # Dynamic FAQ section
│   ├── dynamic-form.tsx    # Dynamic form section
│   ├── dynamic-reviews.tsx # Dynamic reviews section
│   ├── dynamic-location.tsx# Dynamic location section
│   ├── custom-section-renderer.tsx # Core layout engine (~1000 lines)
│   └── ...
├── features/
│   └── restaurant-menu/   # Menu feature module
│       ├── components/    # Menu UI components
│       ├── context/       # Cart context
│       ├── hooks/         # Menu-specific hooks
│       ├── lib/           # Auth, orders, offers logic
│       └── types/         # Menu TypeScript types
├── hooks/                 # Shared hooks (config fetchers)
├── lib/
│   ├── auth/              # Auth route protection
│   ├── graphql/           # GraphQL client + queries
│   ├── server/            # Server-only (email, Stripe, domains, analytics)
│   ├── validation/        # Zod schemas
│   ├── section-style.ts   # Dynamic style generation (~1000 lines)
│   └── seo.ts             # SEO utilities
├── data/                  # JSON layout definitions
└── types/                 # Shared TypeScript types
```

---

## Environment Variables

### Required

```bash
# Nhost Backend
NEXT_PUBLIC_NHOST_SUBDOMAIN=
NEXT_PUBLIC_NHOST_REGION=
HASURA_ADMIN_SECRET=

# Customer Auth (Custom JWT)
MENU_CUSTOMER_SESSION_SECRET=
MENU_CUSTOMER_PASSWORD_RESET_SECRET=

# Stripe Payments
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# Google Services
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=
GOOGLE_ANALYTICS_ACCOUNT_ID=

# Analytics (Umami)
UMAMI_URL=
UMAMI_API_TOKEN=
NEXT_PUBLIC_UMAMI_SCRIPT_URL=
```

### Optional

```bash
# Vercel Domain/Deploy Automation
VERCEL_API_TOKEN=
VERCEL_PROJECT_ID=
VERCEL_TEAM_ID=
VERCEL_DEPLOY_HOOK_URL=

# AWS Bedrock (AI Content)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=

# OpenAI (AI Fallback)
OPENAI_API_KEY=

# Google Vertex AI (AI Fallback)
GOOGLE_VERTEX_PROJECT_ID=

# Twilio SMS
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# Email (SMTP)
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
EMAIL_FROM=
```

See `.env.example` and `.env.local.example` for complete documentation.

---

## Notable Configuration

- `reactStrictMode: false` in `next.config.mjs` — intentionally disabled
- Dev server runs on port **1000** (not default 3000)
- TypeScript strict mode is enabled
- Auth storage prefix: `antler-foods`
- Base font: Poppins (Google Fonts)
- Custom Tailwind colors: `surface`, `ink`, `accent`, `accentDark`
