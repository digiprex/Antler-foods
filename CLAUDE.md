# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Dev server on port 1000
npm run build        # Production build (runs clean-next prebuild script)
npm run lint         # ESLint (Next.js core-web-vitals + TypeScript)
npm start            # Start production server
```

No test framework is configured.

## Architecture

**Next.js 14 App Router** multi-tenant restaurant platform. Each restaurant is identified by domain, resolved via middleware (`src/middleware.ts`) using `resolveRestaurantIdByDomain()`.

**Backend:** Nhost (Hasura GraphQL + auth + storage). Two query modes:
- Client-side: `fetchGraphQL()` from `src/lib/graphql/client.ts` with bearer token
- Server-side: `adminGraphqlRequest()` from `src/lib/server/api-auth.ts` with hasura-admin-secret

All GraphQL queries live in `src/lib/graphql/queries.ts`.

**Auth:** Dual auth systems — Nhost for admin/owner users, custom JWT for menu customers (`src/features/restaurant-menu/lib/server/`). Tab-session isolation via sessionStorage (not localStorage). RBAC roles: admin, manager, owner, client, user. Route protection in `src/lib/auth/routes.ts`.

**Path alias:** `@/*` maps to `src/*`.

## Key Directories

- `src/app/(public)/` — Public auth pages (login, signup, password reset)
- `src/app/admin/` — Admin dashboard (~40 pages: menu, orders, settings, analytics, page builder)
- `src/app/api/` — ~50 API routes (auth, config endpoints, media, external integrations)
- `src/app/[slug]/` — Dynamic restaurant pages
- `src/features/restaurant-menu/` — Feature module: menu UI, cart context (localStorage-persisted), customer auth
- `src/components/admin/` — Admin form components
- `src/components/` — Shared UI: custom-section-renderer.tsx is the core dynamic layout engine (~1000 lines)
- `src/lib/server/` — Server-only code (API auth, email via Nodemailer, domain resolver, analytics)
- `src/lib/section-style.ts` — Dynamic style generation for restaurant sections (~1000 lines)
- `src/data/` — JSON layout definitions for hero, menu, custom sections, etc.
- `src/hooks/use-*-config.ts` — Config fetcher hooks (hero, menu, navbar, footer, gallery)

## Patterns

**Config hooks:** Each restaurant section (hero, menu, navbar, footer, gallery) has a `use*Config` hook that fetches via `/api/*-config` REST routes, which in turn query Nhost GraphQL.

**Dynamic sections:** Restaurant pages are composed of configurable sections. Layout definitions come from JSON files in `src/data/`. Styles are generated dynamically via `getSectionContainerStyles()` and similar functions in `src/lib/section-style.ts`.

**Cart state:** React Context + localStorage (`restaurant-menu-cart-v1`) with cross-tab sync via custom events (`restaurant-menu-cart-updated`). Hydration guard to prevent SSR mismatches.

**Form validation:** Zod schemas (`src/lib/validation/`) + react-hook-form with `z.infer<>` for type derivation.

## Styling

Tailwind CSS + SCSS modules. Custom Tailwind colors: `surface`, `ink`, `accent`, `accentDark`. Base font: Poppins. Auth components use layered Tailwind `@layer` classes (`.auth-input-modern`, `.menu-auth-primary-btn`, etc.) defined in `globals.css`.

## Integrations

**Stripe:** Payment processing via `src/lib/server/stripe.ts`. Webhook handler at `src/app/api/webhooks/stripe/route.ts` verifies events with `STRIPE_WEBHOOK_SECRET`.

**Vercel Domains:** Dynamic domain management (`src/lib/server/vercel-domains.ts`) and deploy hooks (`src/lib/server/vercel-deploy.ts`) for multi-tenant domain provisioning.

**AI Content Generation:** Fallback chain: Amazon Bedrock → OpenAI → Vertex AI. Each provider is tried only when the previous one errors. Used for footer content (`src/app/api/generate-footer-content/route.ts`) and website initialization (`src/app/api/restaurants/[restaurantId]/initialize-website/route.ts`).

**Google Maps:** Location autocomplete via `src/hooks/useGooglePlacesAutocomplete.ts`.

**Google Business:** Place matching, reviews, photos import, and social links extraction via `src/app/api/google/` routes.

## Environment

Core required variables:
```bash
# Nhost backend
NEXT_PUBLIC_NHOST_SUBDOMAIN=
NEXT_PUBLIC_NHOST_REGION=
HASURA_ADMIN_SECRET=

# Menu customer auth
MENU_CUSTOMER_SESSION_SECRET=
MENU_CUSTOMER_PASSWORD_RESET_SECRET=

# Stripe payments
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# Google services
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=
GOOGLE_ANALYTICS_ACCOUNT_ID=

# Analytics (Umami)
UMAMI_URL=
UMAMI_API_TOKEN=
NEXT_PUBLIC_UMAMI_SCRIPT_URL=

# Optional: Vercel domain/deploy automation
VERCEL_API_TOKEN=
VERCEL_PROJECT_ID=
VERCEL_TEAM_ID=
VERCEL_DEPLOY_HOOK_URL=

# Optional: AWS Bedrock for AI content
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=
```

See `.env.example` and `.env.local.example` for complete documentation. Auth storage prefix: `antler-foods`.

## Notable Config

- `reactStrictMode: false` in `next.config.mjs` — intentionally disabled.
- Dev server runs on port 1000 (not default 3000).
- TypeScript strict mode is enabled.
