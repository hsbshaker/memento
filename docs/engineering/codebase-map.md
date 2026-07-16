# Memento Codebase Map

## Purpose

This document helps agents and humans quickly understand the Memento codebase structure, key routes, components, data access patterns, and where to look when working on common product areas.

Keep this document updated when routes, core folders, or major architecture patterns change.

---

## Product Summary

Memento is a premium credit card benefits tracker. Users manually add their cards, the system preloads known benefits, and users confirm which benefits apply to them. Memento sends email reminders before "use it or lose it" benefits expire.

No bank login. No Plaid. No card numbers. No transaction scraping.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.x (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (Google OAuth, PKCE flow) |
| Row-level security | Supabase RLS (enabled on user tables) |
| Email | Resend |
| Deployment | Vercel |
| Package manager | npm |
| Test runner | `tsx --test` (Node built-in test runner via tsx) |
| Animation | Framer Motion |
| Icons | Lucide React |
| UI primitives | Radix UI (checkbox, popover) |
| Virtualization | TanStack Virtual |

### npm scripts

| Script | What it does |
|---|---|
| `npm run dev` | Start local dev server |
| `npm run build` | Production build |
| `npm run start` | Start production server locally |
| `npm run lint` | Run ESLint |
| `npm test` | Run all tests via `tsx --test` |

> Tests are co-located with source files in `lib/` subdirectories. There is no separate `__tests__/` folder.

### Required environment variables

| Variable | Where used |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | All Supabase clients |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser and server clients |
| `SUPABASE_SERVICE_ROLE_KEY` | Cron and service-role operations only |
| `CRON_SECRET` | Cron endpoint authorization |
| `RESEND_API_KEY` | Email sending via Resend |

> Set all variables in Vercel Project Settings → Environment Variables. Never commit secrets.

---

## Top-Level Repo Structure

```
card-benefits-tracker/
├── app/                    Next.js App Router: pages, layouts, API routes
├── components/             UI and feature components (no data fetching)
├── lib/                    Business logic, data access, types, utilities
├── supabase/               Database migrations
├── data/                   Seed and import data files (CSV, JSON)
├── scripts/                Data import scripts (not part of the app)
├── utils/                  Empty Supabase utility folder (no active files)
├── docs/                   Product, engineering, deployment, and QA notes
├── agents/                 Agent roles, templates, work orders, archive
├── references/             Static reference images (landing page screenshot)
├── public/                 Static assets served by Next.js
├── AGENTS.md               Agent constitution — read this first
├── README.md               Repo overview (currently minimal)
├── memento_import_spec.md  Data import specification for the benefits CSV pipeline
├── vercel.json             Vercel cron schedule configuration
├── package.json            Dependencies and npm scripts
└── tsconfig.json           TypeScript configuration
```

---

## App Route Map

All pages use `export const dynamic = "force-dynamic"` — there is no static generation.

### Public routes

| Route | File | Purpose |
|---|---|---|
| `/` | `app/page.tsx` | Landing page. Unauthenticated: shows `PublicLandingPage`. Authenticated: redirects to `/home`. |
| `/login` | `app/login/page.tsx` | Redirect stub — immediately redirects to `/auth/login`. |
| `/dashboard` | `app/dashboard/page.tsx` | Redirect stub — immediately redirects to `/home`. |
| `/auth/login` | `app/auth/login/route.ts` | Initiates Google OAuth sign-in via Supabase. |
| `/auth/callback` | `app/auth/callback/route.ts` | OAuth exchange. New users → `/onboarding/build-your-lineup`. Returning users → `/home`. |
| `/auth/complete` | `app/auth/complete/page.tsx` | Post-auth completion screen (exact purpose: inspect if needed). |
| `/auth/error` | `app/auth/error/page.tsx` | Auth error display page. |

### Authenticated app routes (protected by server-side auth check)

| Route | File | Purpose |
|---|---|---|
| `/home` | `app/home/page.tsx` | Main dashboard. Loads home feed via `buildInitialHomeFeed`. Renders `HomeScreen`. |
| `/wallet` | `app/wallet/page.tsx` | Wallet card list. Supports `?addCard=1` query param to open add-card modal on load. Renders `WalletScreen`. |
| `/wallet/[userCardId]` | `app/wallet/[userCardId]/page.tsx` | Card detail view. Loads via `getCardDetail`. Returns 404 if `userCardId` not found. Renders `CardDetailScreen`. |
| `/benefits` | `app/benefits/page.tsx` | Benefits inventory. Loads via `buildBenefitsFeed`. Renders `BenefitsScreen`. |
| `/settings` | `app/settings/page.tsx` | User settings. Passes `user.email` to `SettingsScreen`. |

### Onboarding routes (authenticated, no persistent app nav)

| Route | File | Purpose |
|---|---|---|
| `/onboarding/build-your-lineup` | `app/onboarding/build-your-lineup/page.tsx` | Step 1: Search and add cards to wallet. Uses `LineupCardSearch` component. |
| `/onboarding/confirm-benefits` | `app/onboarding/confirm-benefits/page.tsx` | Step 2: Review and confirm benefits for each added card. |
| `/onboarding/success` | `app/onboarding/success/page.tsx` | Step 3: Success confirmation. Resolves user's first name from metadata. |
| `/onboarding/benefits` | `app/onboarding/benefits/page.tsx` | **Stale** — immediately redirects to `/home`. No longer part of the onboarding flow. |

### Route group: standalone card add flow

| Route | File | Purpose |
|---|---|---|
| `/(app)/wallet/add` | `app/(app)/wallet/add/page.tsx` | Standalone add-card experience. Uses the `(app)` route group (no persistent nav shell). Renders `AddCardFlow`. |

> This route exists and is functional. It is distinct from the wallet-page add-card modal (`/wallet?addCard=1`). Both paths exist; their intended relationship should be verified.

### API routes

#### Cards

| Route | Method | Purpose |
|---|---|---|
| `/api/cards` | GET | List canonical cards. |
| `/api/cards/search` | GET | Search cards by query string. |
| `/api/cards/[cardId]/preview` | GET | Preview card benefits before adding to wallet. |

#### Home

| Route | Method | Purpose |
|---|---|---|
| `/api/home/feed` | GET | Fetch home dashboard feed. |
| `/api/home/mark-used` | POST | Mark a benefit as used this period. |
| `/api/home/snooze` | POST | Snooze a benefit reminder. |
| `/api/home/tracking-status` | POST | Toggle a benefit's tracking status (tracked / not_tracked). |

#### Wallet

| Route | Method | Purpose |
|---|---|---|
| `/api/wallet/add-card` | POST | Add a card to the user's wallet. |
| `/api/wallet/remove-card` | POST | Remove a card from the wallet. |
| `/api/wallet/toggle-benefit` | POST | Toggle a benefit active or inactive on a card. |
| `/api/wallet/mark-used` | POST | Mark a benefit used (wallet detail context). |
| `/api/wallet/update-card-metadata` | POST | Update nickname, last four digits, opened date. |
| `/api/wallet/update-conditional-value` | POST | Update a benefit's user-entered conditional value. |
| `/api/wallet/update-reminder` | POST | Override per-benefit reminder style. |

#### Onboarding

| Route | Method | Purpose |
|---|---|---|
| `/api/onboarding/confirm-card` | POST | Confirm a card selection during onboarding. |
| `/api/onboarding/confirm-benefits` | POST | Confirm benefit selections during onboarding. |

#### Benefits

| Route | Method | Purpose |
|---|---|---|
| `/api/benefits/feed` | GET | Fetch benefits inventory feed. |

#### Settings

| Route | Method | Purpose |
|---|---|---|
| `/api/settings/update-reminder-style` | POST | Update the global reminder style preference. |
| `/api/settings/reset-reminder-overrides` | POST | Reset all per-benefit reminder overrides to global default. |

#### Cron

| Route | Method | Purpose | Schedule |
|---|---|---|---|
| `/api/cron/run-reminders` | GET | Process due reminder schedules and send reminder emails. Requires `Authorization: Bearer <CRON_SECRET>`. | Daily at 13:00 UTC (via `vercel.json`) |
| `/api/cron/send-digest` | GET | Send monthly digest emails. Requires `Authorization: Bearer <CRON_SECRET>`. | Not in `vercel.json` — manual trigger only. |

#### Debug (caution)

| Route | Purpose | Risk |
|---|---|---|
| `/api/debug/env` | Returns masked env var presence info. Protected by `CRON_SECRET`. | Should be reviewed before public launch. |

---

## Component Map

Components are UI-only. Data fetching happens in pages and API routes; components receive data as props or fetch via client-side API calls.

### `components/app/` — App shell and navigation

| File | Purpose |
|---|---|
| `AppChrome.tsx` | Root layout wrapper. Detects route type and renders either `AuthenticatedAppShell` or a public layout with `AppHeader`. |
| `AuthenticatedAppShell.tsx` | Authenticated app wrapper. Includes bottom nav for mobile / side nav for desktop. |
| `app-nav.ts` | Nav item definitions and route-matching utilities. Defines the four main nav destinations: Home, Wallet, Benefits, Settings. |

### `components/home/` — Home dashboard

| File | Purpose |
|---|---|
| `HomeScreen.tsx` | Top-level home screen. Manages feed state and timeframe selection. |
| `HomeBenefitRows.tsx` | Renders the list of expiring benefits. |
| `HomeBenefitRow.tsx` | Single row in the home feed. Includes inline check/X/plus row actions. |
| `EmptyHomeState.tsx` | Shown when user has no wallet cards. Contains the primary CTA to add a card. **Active work order targets this file.** |
| `HomeAllCaughtUpState.tsx` | Shown when all benefits in the selected timeframe are used. |
| `WalletHero.tsx` | Summary metrics at the top of the home feed. |
| `HomeSkeleton.tsx` | Loading skeleton for the home screen. |

### `components/wallet/` — Wallet management

| File | Purpose |
|---|---|
| `WalletScreen.tsx` | Top-level wallet screen. Manages card list and add-card modal state. |
| `WalletCardRow.tsx` | Single card row in the wallet list. |
| `WalletAddCardButton.tsx` | Button that opens the add-card modal. |
| `WalletAddCardModal.tsx` | Modal wrapper for the add-card flow. |
| `AddCardFlow.tsx` | Step-by-step add-card experience: search → preview → confirm. Also used standalone at `/(app)/wallet/add`. |
| `AddCardSearch.tsx` | Card search input inside the add flow. |
| `CardSearchResults.tsx` | Search result list. |
| `CardDetailScreen.tsx` | Full card detail view showing benefits, metadata, and per-benefit actions. |
| `WalletCardDrawer.tsx` | Slide-in drawer for card detail on mobile. |
| `BenefitRow.tsx` | Single benefit row in card detail. |
| `BenefitDetailOverlay.tsx` | Overlay for viewing full benefit details. |
| `BenefitConfirmation.tsx` | Benefit selection confirmation step in the add flow. |
| `BenefitPreview.tsx` | Benefit preview before adding a card. |
| `SuggestedCardRow.tsx` | Suggested card row in search results. |
| `ReminderStylePicker.tsx` | UI for selecting reminder style (balanced / earlier / minimal). |
| `WalletEmptyState.tsx` | Shown when wallet has no cards. |
| `WalletMetrics.tsx` | Summary metrics for the wallet. |
| `WalletSkeleton.tsx` | Loading skeleton for the wallet screen. |

### `components/benefits/` — Benefits inventory

| File | Purpose |
|---|---|
| `BenefitsScreen.tsx` | Top-level benefits inventory screen. |
| `BenefitsInventoryRows.tsx` | Renders the full benefits list. |
| `BenefitsInventoryRow.tsx` | Single benefit row in the inventory. |
| `BenefitsInventoryRowMenu.tsx` | Row action menu for benefit inventory. |

### `components/settings/` — Settings

| File | Purpose |
|---|---|
| `SettingsScreen.tsx` | Settings screen: account info, global reminder preferences. |
| `AccountSection.tsx` | Account info display (email, sign out). |

### `components/landing/` — Public landing page

| File | Purpose |
|---|---|
| `PublicLandingPage.tsx` | Top-level public landing page composition. |
| `HeroSection.tsx` | Landing page hero. |
| `HowItWorksSection.tsx` | "How it works" explanation section. |
| `FinalCtaSection.tsx` | Bottom CTA section. |
| `LandingNavigation.tsx` | Public nav bar (logo, sign-in link). |

### `components/ui/` — Shared primitives

| File | Purpose |
|---|---|
| `AppShell.tsx` | Generic page shell container with consistent padding. |
| `Surface.tsx` | Styled card/surface container. |
| `Button.tsx` | Primary button component. |
| `DatePicker.tsx` | Date picker UI (Radix Popover based). |
| `MobilePageContainer.tsx` | Mobile-optimized page container. |
| `checkbox.tsx` | Radix UI checkbox wrapper. |
| `popover.tsx` | Radix UI popover wrapper. |
| `row-typography.ts` | Typography utility constants for rows. |

### `components/app-header.tsx`

Shared app header for public (non-authenticated) pages.

---

## Library and Service Map

`lib/` contains all business logic, data access, and shared types. No UI code lives here.

### `lib/supabase/` — Supabase client factory

| File | Purpose |
|---|---|
| `client.ts` | Browser client. Singleton pattern. Use in client components. |
| `server.ts` | Server client. Uses cookie store. Use in server components and pages. |
| `route-handler.ts` | Route handler client. Use in API routes (`app/api/`). |
| `service-role.ts` | Service-role client. Bypasses RLS. **Use only in cron routes.** Never import in client code. |

> Rule: Never import `service-role.ts` from client components or regular server components. It is server-only and bypasses all row-level security.

### `lib/types/` — Shared TypeScript types

| File | Purpose |
|---|---|
| `server-data.ts` | All shared data shape types: `HomeFeedResult`, `WalletCardSummary`, `CardDetailResult`, `BenefitsInventoryItem`, `ConfirmAddCardResult`, etc. The primary type reference for agent work. |
| `memento-schema.ts` | Database row types: `CanonicalCard`, `CanonicalBenefit`, `UserCard`, `UserBenefit`, `UserProfile`, `BenefitReminder`. Re-exports from `lib/constants/memento-schema`. |

### `lib/constants/memento-schema.ts` — Schema enums and constants

Defines all enum values used across the app:

| Constant | Values |
|---|---|
| `REMINDER_STYLES` | `balanced`, `earlier`, `minimal` |
| `USER_CARD_STATUSES` | `active`, `removed` |
| `USER_CARD_TYPES` | `personal`, `business` |
| `USER_BENEFIT_TRACKING_STATUSES` | `tracked`, `not_tracked` |
| `BENEFIT_REMINDER_STATUSES` | `scheduled`, `delivered`, `dismissed`, `cancelled` |
| `CANONICAL_CARD_STATUSES` | `active`, `no_trackable_benefits`, `retired` |
| `TRACK_IN_MEMENTO_VALUES` | `yes`, `later`, `no` |

### `lib/home/` — Home feed logic

| File | Tests | Purpose |
|---|---|---|
| `build-home-feed.ts` | — | Top-level home feed builder. Entry point for the home page. |
| `build-home-state.ts` | — | Computes dashboard state (empty, all caught up, headline). |
| `home-feed-model.ts` | `home-feed-model.test.ts` | Core home feed data model and computation. |
| `home-timeframes.ts` | — | Timeframe options (next 14 days, 30 days, etc.). |
| `mark-benefit-used.ts` | — | Mutation: mark benefit as used this period. |
| `snooze-benefit.ts` | — | Mutation: snooze a benefit reminder. |
| `set-benefit-tracking-status.ts` | — | Mutation: toggle tracked / not_tracked. |
| `optimistic-home-feed.ts` | `optimistic-home-feed.test.ts` | Client-side optimistic update logic for home feed mutations. |

### `lib/wallet/` — Wallet data access and mutations

| File | Purpose |
|---|---|
| `get-wallet-cards.ts` | Fetch user's wallet card list. |
| `get-wallet-summary.ts` | Fetch wallet summary metrics. |
| `get-card-detail.ts` | Fetch full card detail with benefits. |
| `add-wallet-card.ts` | Add a card to the wallet (with duplicate detection). |
| `confirm-add-card.ts` | Full add-card confirmation including benefit selections. |
| `remove-card.ts` | Remove a card from the wallet. |
| `toggle-benefit.ts` | Toggle benefit active/inactive. |
| `mark-benefit-used.ts` | Mark a benefit as used (wallet context). |
| `update-benefit-reminder.ts` | Update per-benefit reminder override. |
| `update-benefit-conditional-value.ts` | Update user-entered conditional value for a benefit. |
| `update-wallet-card-metadata.ts` | Update card nickname, last four, opened date. |
| `wallet-card-metadata.ts` | Metadata utilities. |

### `lib/benefits/` — Benefit computation logic

| File | Tests | Purpose |
|---|---|---|
| `build-benefits-feed.ts` | — | Top-level benefits inventory feed builder. |
| `compute-benefit-period.ts` | `compute-benefit-period.test.ts` | Computes current period start/end/days remaining for a benefit by cadence. |
| `benefit-usage-mutation.ts` | `benefit-usage-mutation.test.ts` | Handles benefit usage mutations and period state. |
| `benefit-usage-plan.ts` | — | Plans benefit usage updates. |
| `dedupe-catalog-benefits.ts` | `dedupe-catalog-benefits.test.ts` | Deduplication logic for catalog benefits. |
| `dedupe-user-benefit-rows.ts` | `dedupe-user-benefit-rows.test.ts` | Deduplication logic for user benefit rows. |
| `format-benefit-labels.ts` | `format-benefit-labels.test.ts` | Formats benefit value labels for display. |
| `periods.ts` | `periods.test.ts` | Benefit period definitions and utilities. |
| `rank-benefits.ts` | — | Ranking logic for benefit priority (urgency, value). |
| `usage-state.ts` | `usage-state.test.ts` | Computes benefit usage state. |

### `lib/cards/` — Card search and preview

| File | Purpose |
|---|---|
| `search-cards.ts` | Card search query logic. |
| `get-card-preview.ts` | Fetch card preview (benefits before adding). |
| `get-add-card-flow-preview.ts` | Extended preview with value estimates for the add flow. |

### `lib/reminders/` — Reminder and digest logic

| File | Tests | Purpose |
|---|---|---|
| `monthly-digest.ts` | — | Monthly digest email content builder. |
| `digest-eligibility.ts` | `digest-eligibility.test.ts` | Determines which users and benefits are eligible for digest. |

### `lib/onboarding/` — Onboarding data

| File | Purpose |
|---|---|
| `confirm-benefits.ts` | Loads confirm-benefits data for the onboarding screen. |
| `save-confirm-benefits.ts` | Saves confirmed benefit selections during onboarding. |

### `lib/auth/`

| File | Purpose |
|---|---|
| `is-new-auth-user.ts` | Detects whether a user is new (no existing wallet) to route them to onboarding vs. home. |

### Other lib files

| File | Purpose |
|---|---|
| `lib/benefit-periods.ts` | Benefit period constants and helpers. |
| `lib/cn.ts` | `clsx`/`tailwind-merge` utility for conditional class names. |
| `lib/format-card.ts` | Card display name formatting. |
| `lib/site-url.ts` | Resolves the canonical site URL for email links and redirects. |

---

## Supabase Map

### Migration directory

`supabase/migrations/` contains the full migration history. Migrations are applied in chronological order by filename timestamp.

### Migration history summary

| Migration | Description |
|---|---|
| `0001_create_cards_user_cards.sql` | Initial cards and user_cards tables. Likely superseded. |
| `0002_normalize_cards.sql` | Initial normalization. Likely superseded. |
| `20260128…` | Re-create cards and user_cards (timestamped series begins). |
| `20260212…` | Benefits MVP schema, benefit cadence. |
| `20260213…` | User benefits: remind_me, used flag, toggle persistence, backfills. |
| `20260214…` | Drop pending wallet artifacts. |
| `20260217…` | Reminder contract tables, email send log. |
| `20260411…` | Benefits schema v2, period status backfill, data foundation. |
| `20260428…` | Display descriptions, benefit dedup and RPC fixes. |
| `20260502…` | User card metadata, benefit tracking status. |
| `20260505…` | Card type field. |
| `20260506…` | Unique indexes for catalog codes. |
| `20260525…` | Normalize legacy Amex card codes. |

> The two un-timestamped migrations (`0001`, `0002`) appear to be early drafts. They are likely superseded by the `20260128` series. Treat them as legacy artifacts.

### Key database tables (inferred from types and migrations)

| Table | Purpose |
|---|---|
| `cards` | Canonical card catalog. Managed by import scripts. |
| `benefits` | Canonical benefit catalog. One benefit per card per benefit type. |
| `user_cards` | Cards in a user's wallet. Unique on `(user_id, card_id)`. |
| `user_benefits` | Benefits associated with a user's card. Tracks usage, reminder overrides, conditional values. |
| `user_profiles` | User-level preferences: `global_reminder_style`, `notifications_enabled`, `timezone`. |
| `reminder_schedules` | Per-benefit reminder schedule: `cadence`, `next_send_at`, `enabled`. |
| `email_send_log` | Record of sent reminder emails for deduplication. |

### Supabase client usage rules

| Client | File | When to use |
|---|---|---|
| Browser client | `lib/supabase/client.ts` | Client components only |
| Server client | `lib/supabase/server.ts` | Server components, pages |
| Route handler client | `lib/supabase/route-handler.ts` | API route handlers |
| Service-role client | `lib/supabase/service-role.ts` | Cron routes only — bypasses RLS |

---

## Agent System Map

```
agents/
├── active/             Active work orders — agents should check here for assigned tasks
├── archive/            Completed or retired agent docs
│   └── work-orders/    Completed work orders moved here after merge
├── roles/              Role instruction files — assign one per work order
│   ├── builder-agent.md       Implementation tasks
│   ├── discovery-agent.md     Investigation and audit tasks
│   ├── qa-agent.md            Post-build validation
│   ├── reviewer-agent.md      Code and diff review
│   └── ux-agent.md            UX review and improvement
└── templates/          Reusable Markdown templates
    ├── work-order-template.md
    ├── qa-checklist-template.md
    └── review-template.md
```

> **Note:** Retired UX archive files (`agents/archive/ux/agent.md` and `agents/archive/ux/ui-patterns.md`) were deleted during Phase A cleanup. They granted broad override authority that conflicted with `AGENTS.md`. They no longer exist in the repo.

**Standard agent workflow:**

1. Work order created in `agents/active/` using `work-order-template.md`.
2. Agent reads `AGENTS.md` → role file → work order → relevant code.
3. Agent completes task and returns a structured final report.
4. QA agent validates the branch (optional for small changes).
5. Reviewer agent approves or requests changes.
6. User merges and moves the work order to `agents/archive/`.

---

## Docs Map

```
docs/
├── engineering/
│   └── codebase-map.md            This file
├── cron-runner-tests.md            Manual test steps for /api/cron/run-reminders
├── deploy-and-cron-tests.md        Deployment and cron validation procedures
├── env-debug-verification.md       Environment variable debugging guide
├── landing-copy.md                 Landing page copy (task artifact — may be stale)
├── landing-page-build-spec.md      Landing page build spec (task artifact — may be stale)
├── landing-page-redlines.md        Landing page design redlines (task artifact — may be stale)
├── replit-preview-extract.md       Replit style extract (stale — Replit no longer used)
└── replit-style-extract.md         Replit style extract (stale — Replit no longer used)
```

Also in root:

| File | Purpose |
|---|---|
| `memento_import_spec.md` | Specification for the benefits CSV import pipeline (cards and benefits data). Read before touching import scripts. |

---

## Data and Scripts Map

### `data/`

| Path | Purpose |
|---|---|
| `data/imports/master_cards_and_benefits.csv` | Master CSV for the card/benefit import pipeline. Source of truth for canonical card and benefit data. |
| `data/seed/cards_amex.csv` | Amex seed data CSV. |
| `data/previews/memento/` | JSON output files from dry-run import operations. Not active app data — preview artifacts. |

### `scripts/`

Scripts for data operations. Run manually with `tsx <script>`. Not part of the app runtime.

| File | Purpose |
|---|---|
| `memento_import_master_cards_and_benefits.ts` | Import all cards and benefits from master CSV. |
| `memento_import_amex_dry_run.ts` | Dry-run import for Amex data. |
| `seed_cards_amex.ts` | Seed Amex cards into the database. |

---

## Common Task Guide

Use this as a starting point. Always inspect actual files before making changes.

### Working on Home / Dashboard

- Pages: `app/home/page.tsx`
- Components: `components/home/`
- Business logic: `lib/home/`
- API routes: `app/api/home/`
- Key types: `HomeFeedResult`, `HomeFeedItem` in `lib/types/server-data.ts`
- Empty state: `components/home/EmptyHomeState.tsx`

### Working on Wallet / Card Management

- Pages: `app/wallet/page.tsx`, `app/wallet/[userCardId]/page.tsx`
- Standalone add flow: `app/(app)/wallet/add/page.tsx`
- Components: `components/wallet/`
- Business logic: `lib/wallet/`
- API routes: `app/api/wallet/`
- Key types: `WalletCardSummary`, `CardDetailResult`, `AddWalletCardResult` in `lib/types/server-data.ts`

### Working on Benefits Inventory

- Pages: `app/benefits/page.tsx`
- Components: `components/benefits/`
- Business logic: `lib/benefits/`
- API routes: `app/api/benefits/`
- Key types: `BenefitsInventoryItem`, `BenefitsFeedResult` in `lib/types/server-data.ts`

### Working on Onboarding

- Pages: `app/onboarding/*/page.tsx`
- Components co-located in `app/onboarding/*/components/`
- Business logic: `lib/onboarding/`
- API routes: `app/api/onboarding/`
- Flow: build-your-lineup → confirm-benefits → success
- Card search during onboarding uses `lib/cards/search-cards.ts` and `app/api/cards/search/`

### Working on Settings / Reminders

- Pages: `app/settings/page.tsx`
- Components: `components/settings/`
- API routes: `app/api/settings/`
- Reminder logic: `lib/reminders/`
- Reminder schedule: `reminder_schedules` table, managed by cron

### Working on Auth

- Login: `app/auth/login/route.ts` — initiates OAuth
- Callback: `app/auth/callback/route.ts` — handles OAuth exchange and routing
- New vs returning user detection: `lib/auth/is-new-auth-user.ts`
- Supabase clients: `lib/supabase/server.ts` (pages), `lib/supabase/route-handler.ts` (API routes)
- All authenticated pages guard with `supabase.auth.getUser()` and redirect to `/login` if no user

### Working on Cron / Email Reminders

- Cron routes: `app/api/cron/`
- Schedule: `vercel.json` — `run-reminders` runs daily at 13:00 UTC
- Reminder logic: `lib/reminders/`
- Email: Resend via `send-digest` route
- Auth: all cron routes require `Authorization: Bearer <CRON_SECRET>`
- Test guide: `docs/cron-runner-tests.md`, `docs/deploy-and-cron-tests.md`

### Working on Supabase / Data Access

- Client selection: see Supabase client usage rules above
- Schema types: `lib/types/memento-schema.ts`
- Enum constants: `lib/constants/memento-schema.ts`
- Migrations: `supabase/migrations/`
- Import spec: `memento_import_spec.md`
- **Never modify migrations directly** — create a new migration file with the next timestamp

### Working on the Benefits Catalog / Import

- Master data: `data/imports/master_cards_and_benefits.csv`
- Import spec: `memento_import_spec.md`
- Import scripts: `scripts/`
- Preview artifacts: `data/previews/memento/` (do not edit — they are outputs)

---

## Known Risks and Caution Areas

### Service-role client bypasses RLS

`lib/supabase/service-role.ts` creates a client with the service-role key, which bypasses all row-level security policies. It is marked `server-only`. Confirm any code using `getServiceRoleSupabaseClient()` is restricted to cron routes and cannot be triggered by arbitrary user requests.

### Debug API route is publicly discoverable

`/api/debug/env` is protected by `CRON_SECRET` but should still be reviewed before public launch. `/api/debug/auth-session` has been deleted.

### Duplicate add-card paths

There are two ways to add a card: the modal at `/wallet?addCard=1` and the standalone page at `/(app)/wallet/add`. It is unclear whether these use the same flow or diverge. Verify before modifying either.

### `send-digest` cron not scheduled

`/api/cron/send-digest` exists but is not in `vercel.json`. It must be triggered manually. Confirm whether this is intentional or an oversight.

### `user_cards` must be unique on `(user_id, card_id)`

Adding the same card twice should be a no-op. The wallet add flow has duplicate detection (`duplicateStatus: "none" | "possible_duplicate"`), but this constraint should be enforced at the database level. Verify the unique index exists in migrations before any wallet write changes.

### Benefit period computation is business-critical

`lib/benefits/compute-benefit-period.ts` determines when benefits expire and drives all urgency and reminder logic. Changes here affect the entire home feed, benefits inventory, and reminder schedule. Test thoroughly — this module has its own test file.

### Anniversary-based benefit periods

Some benefits use `card_anniversary_date` instead of calendar year for period boundaries. This is flagged in `BenefitPeriodResult.isAnniversaryPeriod`. Agents touching period logic should handle both cases.

---

## Stale or Unclear Files

| File | Status | Notes |
|---|---|---|
| `app/onboarding/benefits/page.tsx` | Stale | Immediately redirects to `/home`. No longer part of the active onboarding flow. |
| `app/dashboard/page.tsx` | Redirect stub | Redirects to `/home`. Kept for URL compatibility. |
| `app/login/page.tsx` | Redirect stub | Redirects to `/auth/login`. Kept for URL compatibility. |
| `supabase/migrations/0001_create_cards_user_cards.sql` | Likely superseded | Predates timestamped migrations. Verify before touching. |
| `supabase/migrations/0002_normalize_cards.sql` | Likely superseded | Predates timestamped migrations. Verify before touching. |
| `utils/supabase/` | Empty directory | No active files. Appears to be an unused artifact. |
| `data/previews/memento/` | Import artifacts | JSON outputs from dry-run imports. Not app data — do not edit. |
| `docs/landing-copy.md` | Task artifact | Point-in-time deliverable from a past build task. May be stale. |
| `docs/landing-page-build-spec.md` | Task artifact | Point-in-time deliverable. May be stale. |
| `docs/landing-page-redlines.md` | Task artifact | Point-in-time deliverable. May be stale. |
| `docs/replit-preview-extract.md` | Stale | Replit is no longer the development environment. |
| `docs/replit-style-extract.md` | Stale | Replit is no longer the development environment. |
| `agents/archive/ux/` | Deleted | Retired UX archive files were deleted during Phase A cleanup. They granted override authority that conflicted with `AGENTS.md`. Do not recreate. |

---

## Benefit Freshness Pipeline Map

Added 2026-07: automated benefit-change monitoring, evidence-backed proposals, admin review, and transactional publishing. Full docs: `docs/engineering/freshness-pipeline.md` (developer), `docs/engineering/freshness-operations.md` (operator), `docs/engineering/adr-benefit-freshness.md` (decisions).

| Area | Location | Notes |
|---|---|---|
| Orchestrator | `lib/freshness/run-monitor.ts` | Fully dependency-injected; production wiring in `lib/freshness/production-deps.ts`. |
| Pure pipeline modules | `lib/freshness/*` | allowlist, html-content (cheerio), content-validation (soft-block), chunking, extraction-schema/prompt/provider, removal-gate, reconcile, dedupe-key, evidence-strength, mass-change-guard, staleness, scheduling, leases, cost, validators — all with colocated tests. |
| Field contracts | `lib/benefits/benefit-fields.ts`, `lib/benefits/benefit-hash.ts` | Canonical/versioned field sets shared by extraction, diffing, history, publish, rollback; the importer now imports the shared hash. |
| Stores | `lib/freshness/store.ts` (Supabase), `lib/freshness/in-memory-store.ts` (tests) | `FreshnessStore` is the orchestrator's persistence boundary. |
| Cron | `app/api/cron/monitor-sources/route.ts` | Daily 11:00 UTC via `vercel.json`; Bearer `CRON_SECRET`; overlap/rerun-safe. |
| Admin UI | `app/admin/**`, `components/admin/**` | Gated by `ADMIN_EMAILS` allowlist (`lib/auth/require-admin.ts`); empty allowlist ⇒ 404. |
| Admin API | `app/api/admin/**` | Sources CRUD/test-fetch/run/retry/recheck, proposal review/publish/rollback, coverage links, publish-due sweep, model-config validation, signed artifact URLs. |
| Schema | `supabase/migrations/20260716120000_*.sql`, `20260716130000_*.sql` | 8 new service-role-only tables, benefits versioning trigger, private `source-artifacts` bucket, publish/rollback/scheduled-sweep RPCs. |
| SQL tests | `supabase/tests/*.sql` | pgTAP via `npm run test:db` (local stack; Docker + Supabase CLI). |
| Eval harness | `lib/freshness/eval-harness.ts`, `scripts/freshness_eval_extraction.ts`, corpus in `lib/freshness/__fixtures__/eval/` | Live run is the hard gate before enabling sources; reports persist to `data/evals/`. |
| Backfill | `scripts/memento_backfill_benefit_sources.ts` | Seeds `benefit_sources` (disabled) + `benefit_source_links` from existing provenance; dry-run default. |

New API routes: `/api/cron/monitor-sources` (GET, CRON_SECRET) and the `/api/admin/*` family (admin allowlist; reviewer identity from session).

---

## Maintenance Notes

Update this document when:

- A new app route or API route is added or removed.
- A new top-level directory is added.
- A significant new library module is added to `lib/`.
- A migration significantly changes the database schema.
- A new agent role or template is added to `agents/`.
- A stale file is archived or deleted.

Small changes (new components within an existing area, minor API additions) do not require an update.
