# Memento

Memento is a premium credit card benefits tracker focused on helping people capture "use it or lose it" value from their cards. Users manually add cards, confirm which benefits apply to them, and track time-sensitive benefits before value is lost.

This README is the fastest repo-specific orientation doc for humans and coding agents. It summarizes the product, stack, setup, validation workflow, and the most important deeper docs.

## Overview

Memento is designed to help users understand:

1. What value they have
2. What is expiring
3. What to do next

The product experience should feel fast, obvious, and premium. The app currently includes:

- A public landing page
- Supabase-authenticated app routes
- A Home dashboard for tracking time-sensitive benefits
- A Wallet flow for adding and managing cards
- A Benefits inventory view
- Settings for reminder preferences
- Cron-driven reminder and digest infrastructure

## Core Product Constraints

Memento does not use:

- Bank login
- Plaid
- Card numbers
- Transaction scraping

Users manually add cards. The system preloads known benefits, and users confirm which benefits should be tracked.

## Tech Stack

- Framework: Next.js 16 App Router
- Language: TypeScript
- Styling: Tailwind CSS
- Database and auth: Supabase (PostgreSQL, Supabase Auth, RLS)
- Email: Resend
- Deployment: Vercel
- Package manager: npm
- Tests: `tsx --test` on top of Node's test runner

Additional libraries in active use include Framer Motion, Lucide React, Radix UI, and TanStack Virtual. See [package.json](package.json) for the exact dependency list.

## Local Development

1. Install dependencies:

```bash
npm install
```

2. Create your local env file with variable names only, not real secrets:

```bash
.env.local
```

3. Start the app:

```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000).

For production-style local verification:

```bash
npm run build
npm run start
```

## Environment Variables

Do not commit secrets or real values.

Core app variables used by the repo:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CRON_SECRET`
- `RESEND_API_KEY`

Additional service-role and script paths in the repo also reference:

- `SUPABASE_URL`

In practice, the service-role utilities support `NEXT_PUBLIC_SUPABASE_URL` with `SUPABASE_URL` as a fallback in some contexts. Use the repo docs and the relevant script before assuming a single env pattern.

## Available Commands

Commands currently defined in [package.json](package.json):

- `npm run dev` — start the Next.js dev server
- `npm run build` — build the app for production
- `npm run start` — run the production build locally
- `npm run lint` — run ESLint
- `npm test` — run the test suite via `tsx --test`

## Testing And Validation

Preferred validation flow for most code changes:

```bash
npm test
npx tsc --noEmit
npm run lint
```

Important note:

- `npm run typecheck` is not currently defined in `package.json`
- Use `npx tsc --noEmit` for TypeScript validation

For documentation-only changes, the minimum validation is:

```bash
git diff -- README.md
```

Recommended deeper guidance:

- [docs/engineering/testing-commands.md](docs/engineering/testing-commands.md)

## Repository Structure

High-level repo map:

- `app/` — App Router pages, layouts, and API routes
- `components/` — reusable UI and feature components
- `lib/` — business logic, data access, Supabase helpers, shared types, utilities
- `supabase/` — migrations and Supabase project files
- `scripts/` — import and maintenance scripts
- `docs/` — engineering, deployment, QA, and product-adjacent notes
- `agents/` — agent roles, work orders, and archived task docs
- `data/` — import and seed data files
- `public/` — static assets

For the detailed route and component map, start with:

- [docs/engineering/codebase-map.md](docs/engineering/codebase-map.md)

## Agent Workflow

Memento is set up for scoped agentic work. Before starting any non-trivial task:

1. Read [AGENTS.md](AGENTS.md).
2. Read the assigned work order in `agents/active/`.
3. Read the relevant role file in `agents/roles/`.
4. Inspect the relevant files before editing.
5. Keep the change scoped to the work order.
6. Run validation appropriate to the task.
7. Return a final report with status, files changed, validation, risks, and manual QA.

Branching expectations:

- Do not work directly on `main`
- Most work should branch from `dev`
- Use a task-specific branch
- Keep the working tree clean before starting new work

See:

- [docs/engineering/branching-and-merge-rules.md](docs/engineering/branching-and-merge-rules.md)

## Important Documentation

Start here:

- [AGENTS.md](AGENTS.md)
- [docs/engineering/codebase-map.md](docs/engineering/codebase-map.md)
- [docs/engineering/testing-commands.md](docs/engineering/testing-commands.md)
- [docs/engineering/branching-and-merge-rules.md](docs/engineering/branching-and-merge-rules.md)

Useful supporting docs:

- [docs/cron-runner-tests.md](docs/cron-runner-tests.md)
- [docs/deploy-and-cron-tests.md](docs/deploy-and-cron-tests.md)
- [memento_import_spec.md](memento_import_spec.md)

## Cron And Reminder Operations

Memento includes cron-driven reminder infrastructure.

Key references:

- `vercel.json` defines the active Vercel cron schedule
- `/api/cron/run-reminders` processes due reminder schedules
- `/api/cron/send-digest` supports digest delivery workflows

Before changing or validating reminder behavior, review:

- [docs/cron-runner-tests.md](docs/cron-runner-tests.md)
- [docs/deploy-and-cron-tests.md](docs/deploy-and-cron-tests.md)

These docs cover:

- Required cron auth via `CRON_SECRET`
- Local curl-based testing
- SQL seed and assertion patterns
- Idempotency and dedupe checks
- Vercel deployment verification

## Development Guardrails

When working in this repo:

- Preserve Memento's current visual direction unless the task explicitly asks for a redesign
- Prefer the smallest safe change over broad refactors
- Do not change schema or migrations unless the task explicitly requires it
- Do not add dependencies unless clearly justified
- Do not claim unsupported behavior in docs or code comments
- Do not expose secrets, tokens, or real env values
- Do not modify unrelated files in a scoped task

For product and engineering expectations, trust [AGENTS.md](AGENTS.md) first, then the linked engineering docs.
