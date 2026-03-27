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

## Environment

Required env vars (see `.env.example`): Nhost subdomain/region, Google Analytics service account, Umami analytics URL/token. Auth storage prefix: `antler-foods`.
