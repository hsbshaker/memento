# Work Order: Map Tokens Into Tailwind v4 Utilities

## Status

Active

## Agent Role

Builder Agent

## Operating Mode

Do not create or use a separate git worktree, hidden worktree, task branch, or alternate repo copy.

Operate directly in the current local repo on the current `dev` branch.

Before making changes, run:

```
git branch --show-current
git status --short
git worktree list
```

Confirm:

* The current branch is `dev`
* The only worktree is the main repo
* There are no unexpected local changes

Do not commit unless explicitly instructed by the product owner.

## Objective

Verify that the semantic theme tokens added in WO2 are correctly exposed as Tailwind v4 utility classes, then document the approved token usage contract for future UI overhaul work.

This work order should make it clear to future agents which semantic classes to use and which styling patterns to avoid.

This is a verification and documentation task with only minimal CSS/config edits if required.

## Product Context

Memento is a premium credit card benefits tracker focused on helping users capture “use it or lose it” value from their cards.

The UI overhaul is being done in a deliberate sequence:

1. Define Memento Visual Direction + Theme Rules
2. Build Theme Token Foundation
3. Map Tokens Into Tailwind v4 Utilities
4. Refactor Shared UI Primitives
5. Overhaul App Shell + Home/Dashboard
6. Overhaul Wallet + Benefits + Settings
7. Overhaul Landing + Auth + Onboarding

WO1 created:

```
docs/design/memento-visual-direction.md
```

WO2 updated:

```
app/globals.css
```

with semantic CSS variables and Tailwind v4 `@theme inline` mappings.

This work order is WO3.

## Design Direction Source

Use this document as the source of truth:

```
docs/design/memento-visual-direction.md
```

Follow its rules closely.

Memento should feel:

* Premium
* Calm
* Precise
* Trustworthy
* Fast
* Low-friction
* Expensive
* Modern, but not gimmicky

Avoid:

* Raw hex colors in components
* Raw `white/` opacity scales
* Random glowing blobs
* Bubbly bento-box styling
* Page-specific color systems
* Multiple competing accent colors
* Replacing old hardcoded colors with new hardcoded colors

Prefer:

* Semantic theme utilities
* Shared primitives
* Calm neutral surfaces
* Crisp hierarchy
* Restrained accent usage
* Light/dark readiness

## Scope

In scope:

* Inspect `app/globals.css`
* Verify Tailwind v4 utility classes resolve correctly from the `@theme inline` mappings
* Make tiny corrections to `app/globals.css` only if token mappings are wrong or missing
* Create a short token usage guide for future agents
* Add a concise UI styling rule to `AGENTS.md`
* Run full validation

Out of scope:

* Refactoring UI primitives
* Refactoring components
* Refactoring pages
* Redesigning Home, Wallet, Benefits, Settings, Landing, Auth, or Onboarding
* Adding a light/dark toggle
* Adding `tailwind.config.ts`
* Changing the dark mode strategy
* Replacing hardcoded colors across the app
* Creating new UI components
* Editing app runtime behavior

## Files to Inspect

Inspect:

* `app/globals.css`
* `docs/design/memento-visual-direction.md`
* `AGENTS.md`
* Package/config files only if needed to understand Tailwind v4 behavior

Do not inspect or modify unrelated page/component files unless needed to verify class compilation.

## Required Utility Verification

Verify that these semantic Tailwind classes are available and compile without errors:

### Core

* `bg-background`
* `text-foreground`

### Surfaces

* `bg-surface`
* `bg-surface-raised`
* `bg-surface-muted`
* `bg-surface-subtle`

### Borders

* `border-border`
* `border-border-strong`
* `border-border-muted`

### Text

* `text-muted-foreground`
* `text-subtle-foreground`
* `text-inverse-foreground`

### Accent

* `bg-accent`
* `text-accent`
* `text-accent-foreground`
* `bg-accent-muted`
* `border-accent-border`

### Status

* `text-success`
* `bg-success-muted`
* `text-warning`
* `bg-warning-muted`
* `text-destructive`
* `bg-destructive-muted`

### Interaction

* `ring-focus`
* `bg-hover`
* `bg-active`

### Overlays / Effects

* `bg-overlay`
* `bg-scrim`

If any of these do not resolve, fix only the token mapping needed in `app/globals.css`.

## Utility Verification Method

Use the lightest practical verification method.

Acceptable options include:

* Creating a temporary local scratch file and deleting it before completion
* Using an existing component only temporarily and reverting before completion
* Running the normal validation/build commands to confirm Tailwind accepts the classes
* Using repo-specific Tailwind/PostCSS tooling if obvious

Do not leave scratch files behind.

Do not create a permanent demo component.

Do not make visual page changes just to test utilities.

## Documentation Requirement

Create:

```
docs/design/theme-token-usage.md
```

This document should be short, practical, and written for future coding agents.

It should include:

### 1. Purpose

Explain that all future UI work should use semantic tokens instead of hardcoded colors.

### 2. Approved Utility Classes

List the approved utility classes grouped by category:

* Core
* Surfaces
* Borders
* Text
* Accent
* Status
* Interaction
* Overlays

### 3. Usage Guidance

Explain when to use each type of token.

Examples:

* Use `bg-background` for page backgrounds
* Use `bg-surface` for standard cards/panels
* Use `bg-surface-raised` for elevated panels, drawers, popovers, and modals
* Use `bg-surface-muted` or `bg-surface-subtle` for quieter sections
* Use `border-border` for normal borders
* Use `border-border-strong` only when separation needs to be more visible
* Use `text-muted-foreground` for secondary text
* Use `text-subtle-foreground` for tertiary/helper text
* Use `accent` for brand emphasis and primary CTA moments
* Use `focus` for focus rings and keyboard interaction
* Use status tokens only for real semantic status, not decoration

### 4. Anti-Patterns

Explicitly forbid:

* Raw hex values in component/page classes
* Raw `text-white/70`, `border-white/10`, `bg-black`, `bg-slate-950` style usage
* New one-off blues, golds, greens, reds
* Decorative gradient/glow effects unless approved by the visual direction doc
* Page-specific color systems
* Using accent color as generic decoration
* Creating a Tailwind config just to add colors

### 5. Light/Dark Mode Reminder

Explain that these utilities are theme-backed and should work across light and dark mode once components use them.

Make clear that future page and component refactors should not hardcode dark-only styles.

## AGENTS.md Requirement

Add a short rule to `AGENTS.md` so future agents know:

* UI changes must use semantic theme tokens where possible
* Avoid raw hardcoded colors in components/pages
* Do not create page-specific color systems
* Tailwind v4 token mappings live in `app/globals.css`
* See `docs/design/memento-visual-direction.md` and `docs/design/theme-token-usage.md`

Keep this addition short. Do not rewrite the whole file.

## Acceptance Criteria

This work is complete when:

* Semantic token utilities are verified to compile
* Any missing/misnamed token mappings in `app/globals.css` are corrected
* `docs/design/theme-token-usage.md` exists
* `AGENTS.md` includes a concise semantic-token rule for UI work
* No page/component redesigns are performed
* No permanent scratch/demo files are left behind
* No `tailwind.config.ts` is added
* Full validation passes:

  npm test
  npx tsc --noEmit
  npm run lint

## Validation

Run:

```
npm test
npx tsc --noEmit
npm run lint
```

Remember: this repo does not have `npm run typecheck`.

Also run any lightweight check used to verify token utility compilation.

## Final Agent Response Format

When done, report back in this format:

### Summary

Briefly explain what was verified and documented.

### Utility Verification

List how the token utilities were verified.

Mention any mapping fixes made.

### Documentation Added

Summarize `docs/design/theme-token-usage.md`.

### Files Changed

List every file changed with a short explanation.

### Validation

List commands run and results:

* `npm test`
* `npx tsc --noEmit`
* `npm run lint`

### Risks / Follow-Ups

List any known risks or follow-up work.

State the next recommended work order.
