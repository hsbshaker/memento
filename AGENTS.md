# AGENTS.md

## Product: Memento

Memento is a premium credit card benefits tracker focused on helping users capture “use it or lose it” value from their credit cards.

Memento should make benefit tracking feel effortless, fast, premium, and obvious.

Users should quickly understand:

1. What value they have
2. What is expiring
3. What to do next

## Tech Stack

- **Framework:** Next.js App Router
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Database and Auth:** Supabase, including PostgreSQL, Supabase Auth, and Row Level Security
- **Deployment:** Vercel
- **Package Manager:** npm

Key project areas:

- `app/` contains routes, layouts, pages, and API routes.
- `components/` contains reusable UI and feature components.
- `lib/` contains server/client utilities, data access, business logic, and shared types.
- `supabase/` contains migrations and Supabase-related project files.
- `docs/` contains product, engineering, deployment, and testing notes.
- `agents/` contains agent roles, templates, active work orders, and archived agent docs.

Agents should treat this stack as fixed. Do not change frameworks, styling systems, database providers, auth providers, deployment targets, or package managers unless explicitly authorized by the user.

## Core Product Constraints

Memento does **not** use:

* Bank login
* Plaid
* Card numbers
* Transaction scraping

Users manually add cards. The system preloads known benefits, and users confirm which benefits apply to them.

## Product Principles

* Show value immediately
* Prioritize expiring and high-value benefits
* Reduce steps
* Reduce decisions
* Reduce cognitive load
* Use strong defaults
* Hide complexity through progressive disclosure
* Make the next action obvious
* Prefer clear, practical UX over clever UI

Target experience:

> “Wow, this was incredibly easy.”

## UI Styling Rule

All UI work must use **semantic theme tokens**. Do not use raw hex colors, Tailwind named colors (`slate-950`, `blue-500`), or white/black opacity hacks (`text-white/70`, `border-white/10`) in components or pages.

Use the approved semantic utility classes instead:
- `bg-background`, `bg-surface`, `bg-surface-raised` for backgrounds and surfaces
- `text-foreground`, `text-muted-foreground`, `text-subtle-foreground` for text hierarchy
- `border-border`, `border-border-strong` for borders
- `bg-accent`, `text-accent` for brand accent (Memento gold)
- `text-success`, `text-warning`, `text-destructive` for status states
- `ring-focus` for keyboard focus rings

Token definitions: `app/globals.css` (`@theme inline` block)  
Full reference: `docs/design/theme-token-usage.md`  
Visual direction: `docs/design/memento-visual-direction.md`

Do not create `tailwind.config.ts` to add colors — extend `@theme inline` in `globals.css`.  
Do not redesign pages before shared UI primitives are refactored (WO4).

## UX and Design Mandate

Preserve Memento’s existing visual direction unless the task explicitly asks for a redesign.

Do **not** introduce a disconnected visual system.

When improving UI:

* Keep interfaces calm, premium, and simple
* Prefer elegant tables/lists when displaying structured data
* Avoid chunky layouts unless cards clearly improve comprehension
* Keep spacing tight but readable
* Avoid unnecessary decorative elements
* Use one clear primary action per screen or step
* Improve existing flows when they create friction, confusion, or unnecessary work

Agents may improve UX, but should not casually replace established patterns across the app without a clear reason.

## Engineering Rules

* Never work directly on `main`
* Use a task-specific branch
* Keep changes scoped to the assigned task
* Do not modify unrelated files
* Do not introduce new dependencies unless clearly justified
* Do not change database schema or Supabase migrations unless the task explicitly requires it
* Do not rewrite large components when a smaller targeted change will solve the issue
* Prefer maintainable, readable code over clever abstractions

## Validation Requirements

Before marking work complete, run:

* `npm test`
* `npx tsc --noEmit`
* `npm run lint`

Run commands in this order. Do not use `npm run typecheck` unless a `typecheck` script is added to `package.json` in the future.

If a command fails because of a pre-existing issue, report it clearly and identify whether the changed files introduced the failure.

## Agent Output Requirements

Every completed task must include:

* Status: Complete, Partial, or Blocked
* Summary of what changed
* Files changed
* Validation commands run
* Any failed checks or known issues
* Risks or follow-up recommendations
* Manual QA steps for the user to verify

## Final Standard

Memento should feel:

Powerful + effortless + premium.

The best solution is usually the one that helps the user understand their benefits faster with less effort.
