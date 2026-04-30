# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Dev server on port 1000
npm run build        # Production build (prebuild cleans .next via scripts/clean-next.mjs)
npm run lint         # ESLint (Next.js core-web-vitals + TypeScript)
npm start            # Start production server
npm run cron:local   # Local cron simulator — hits /api/cron/order-status every minute
```

No test framework is configured.

## Architecture

**Next.js 14 App Router** multi-tenant restaurant platform. Each restaurant is an isolated tenant identified by domain.

**Middleware** (`src/middleware.ts`) tags `/admin/` and `/dashboard/` routes with an `x-admin-route` header so the root layout can skip expensive metadata lookups. It does not resolve restaurants — that happens downstream.

**Restaurant context resolution** — three paths depending on route type:
- **Public pages:** Domain → `resolveRestaurantIdByDomain()` in `src/lib/server/domain-resolver.ts` (in-memory cache, 5-min TTL)
- **Admin dashboard:** Extracted from path slug `/dashboard/admin/restaurants/{id-name-slug}/...` via `parseRestaurantScopeFromPath()`, with `?restaurant_id=` query param fallback
- **API routes:** Dynamic param `/api/restaurants/[restaurantId]/...` or `?restaurant_id=` query param, validated via `requireRestaurantAccess()`

**Backend:** Nhost (Hasura GraphQL + auth + storage). Two query modes:
- Client-side: `fetchGraphQL()` from `src/lib/graphql/client.ts` with bearer token
- Server-side: `adminGraphqlRequest()` from `src/lib/server/api-auth.ts` with hasura-admin-secret

All GraphQL queries live in `src/lib/graphql/queries.ts` as exported constants with typed interfaces. Some queries have V1/V2 variants to handle schema evolution.

**Auth:** Dual auth systems — Nhost for admin/owner users, custom JWT for menu customers (`src/features/restaurant-menu/lib/server/`). Tab-session isolation via sessionStorage (not localStorage). RBAC roles: admin, manager, owner, client, user. Route protection in `src/lib/auth/routes.ts`. Role `client` maps to `owner` for routing purposes.

**Provider wrapping:** Root layout wraps everything in `NhostProvider` (via `src/app/providers.tsx`). No other global context providers.

**Admin layout chain:** `src/app/admin/layout.tsx` → `AdminShell` (Suspense boundary) → `DashboardLayout` (client component that enforces Nhost auth, resolves role, manages restaurant selection state, renders sidebar/topbar).

**Path alias:** `@/*` maps to `src/*`.

## Key Directories

- `src/app/(public)/` — Public auth pages (login, signup, password reset)
- `src/app/admin/` — Admin dashboard (~40 pages: menu, orders, settings, analytics, page builder)
- `src/app/api/` — API routes (auth, config endpoints, media, external integrations)
- `src/app/[slug]/` — Dynamic restaurant pages (rendered via `page-client.tsx` section switch)
- `src/features/restaurant-menu/` — Feature module: menu UI, cart context, customer auth, checkout, order history
- `src/components/dashboard/` — Dashboard layout (sidebar, topbar, auth enforcement)
- `src/components/admin/` — Admin form components
- `src/components/` — Shared UI: `custom-section-renderer.tsx` is the core dynamic layout engine (~1000 lines)
- `src/lib/server/` — Server-only code (API auth, email via Nodemailer, domain resolver, analytics, delivery)
- `src/lib/section-style.ts` — Dynamic style generation for restaurant sections (~1000 lines)
- `src/data/` — JSON layout definitions for hero, menu, custom sections, etc.
- `src/hooks/use-*-config.ts` — Config fetcher hooks (hero, menu, navbar, footer, gallery)

## Patterns

**API route conventions:** Protected routes follow this pattern:
1. Call `requireRestaurantAccess(request, restaurantId)` or `requireAuthenticatedUser(request)` from `src/lib/server/api-auth.ts`
2. Throw `RouteError(status, message)` for HTTP errors — caught and returned as JSON
3. Use `adminGraphqlRequest<T>()` for Hasura queries
4. Return `{ success: boolean, data?: T, error?: string }` envelope

**Config hooks:** Each restaurant section (hero, menu, navbar, footer, gallery) has a `use*Config` hook that fetches via `/api/*-config` REST routes, which in turn query Nhost GraphQL.

**Dynamic sections:** Restaurant pages are composed of configurable sections. Layout definitions come from JSON files in `src/data/`. The `page-client.tsx` renders sections by switching on `template.category`, sorted by `order_index`. Styles are generated dynamically via `getSectionContainerStyles()` and similar functions in `src/lib/section-style.ts`.

**Cart state:** React Context + localStorage (`restaurant-menu-cart-v1`) with cross-tab sync via custom events (`restaurant-menu-cart-updated`). Hydration guard to prevent SSR mismatches.

**Form validation:** Zod schemas (`src/lib/validation/`) + react-hook-form with `z.infer<>` for type derivation.

## Styling

Tailwind CSS + SCSS modules. Custom Tailwind colors: `surface`, `ink`, `accent`, `accentDark`. Base font: Poppins. Auth components use layered Tailwind `@layer` classes (`.auth-input-modern`, `.menu-auth-primary-btn`, etc.) defined in `globals.css`.

## Integrations

**Stripe:** Payment processing via `src/lib/server/stripe.ts`. Connect accounts for per-restaurant payouts (`src/lib/server/restaurant-stripe-accounts.ts`). Webhook handlers at `src/app/api/webhooks/stripe/` and `stripe-connect/`.

**Vercel Domains:** Dynamic domain management (`src/lib/server/vercel-domains.ts`) and deploy hooks (`src/lib/server/vercel-deploy.ts`) for multi-tenant domain provisioning.

**AI Content Generation:** Fallback chain: Amazon Bedrock → OpenAI → Vertex AI. Each provider is tried only when the previous one errors.

**Google:** Maps autocomplete (`src/hooks/useGooglePlacesAutocomplete.ts`), Business Profile integration (reviews, photos, social links) via `src/app/api/google/` and `src/app/api/restaurants/[restaurantId]/google-business/`.

**Delivery:** DoorDash Drive and Uber Direct clients in `src/lib/server/delivery/`.

**Communications:** Email via Nodemailer (`src/lib/server/email.ts`), SMS via Twilio (`src/lib/server/twilio.ts`).

## Environment

See `.env.example` for complete variable documentation. Core required:

```bash
NEXT_PUBLIC_NHOST_SUBDOMAIN=     # Nhost backend
NEXT_PUBLIC_NHOST_REGION=
HASURA_ADMIN_SECRET=
MENU_CUSTOMER_SESSION_SECRET=    # Customer JWT auth
MENU_CUSTOMER_PASSWORD_RESET_SECRET=
STRIPE_SECRET_KEY=               # Payments
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY= # Google services
```

Auth storage prefix: `antler-foods`.

## Notable Config

- `reactStrictMode: false` in `next.config.mjs` — intentionally disabled.
- Dev server runs on port 1000 (not default 3000).
- TypeScript strict mode is enabled.
