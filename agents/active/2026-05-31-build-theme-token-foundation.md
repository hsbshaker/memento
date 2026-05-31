# Work Order: Build Theme Token Foundation

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

Build the semantic theme token foundation for Memento.

This is the first implementation step in the UI overhaul. The goal is to define a durable set of light/dark CSS variables in `app/globals.css` so future UI work can stop using hardcoded colors and start using semantic theme tokens.

This work order should not redesign pages or refactor components yet.

## Product Context

Memento is a premium credit card benefits tracker focused on helping users capture “use it or lose it” value from their cards.

The product should feel:

* Premium
* Calm
* Precise
* Trustworthy
* Fast
* Low-friction
* Expensive
* Modern, but not gimmicky

The core MVP loop works. Fresh-user QA passed. We are now moving into a deliberate UI/brand consistency overhaul.

## Design Direction Source

Use this document as the source of truth:

```
docs/design/memento-visual-direction.md
```

Follow its rules closely.

The theme foundation should support a product that feels like a premium fintech dashboard or card concierge, not a generic SaaS template.

## Current Problem

The prior theme audit found:

* Only two CSS variables currently exist: `--background` and `--foreground`
* 200+ hardcoded color references exist across the app
* UI primitives hardcode their own colors independently
* No real theme/token foundation exists
* Tailwind v4 is being used through CSS-first setup
* Light mode is structurally broken because most styles are hardcoded for dark mode

This work order creates the token foundation that later work orders will use to fix those problems.

## Scope

In scope:

* Update `app/globals.css`
* Define a complete semantic CSS variable set for light mode
* Define corresponding dark mode values
* Expose semantic variables through the existing Tailwind v4 `@theme inline` block where appropriate
* Preserve the existing app behavior
* Keep the implementation CSS-only
* Run full validation

Out of scope:

* Component refactors
* Page redesigns
* Replacing hardcoded classes in components
* Creating or editing `tailwind.config.ts`
* Changing app layout
* Changing fonts unless absolutely necessary
* Adding a light/dark mode toggle
* Changing theme persistence behavior
* Editing landing/onboarding/home/wallet/benefits/settings components
* Adding new UI primitives
* Removing blob components
* Changing runtime behavior

## Tailwind v4 Constraint

This project uses Tailwind v4 through a CSS-first setup.

Do not blindly add a Tailwind v3-style `tailwind.config.ts`.

Prefer extending the existing `@theme inline` block in `app/globals.css`.

The goal is to make semantic classes available through Tailwind v4 utilities where possible.

Examples of desired semantic class support:

* `bg-background`
* `text-foreground`
* `bg-surface`
* `bg-surface-raised`
* `bg-surface-muted`
* `border-border`
* `text-muted-foreground`
* `text-accent`
* `text-success`
* `text-warning`
* `text-destructive`
* `ring-focus`

Use the project’s current Tailwind v4 conventions.

## Required Token Categories

Add tokens for at least these semantic categories.

### Core

* `--background`
* `--foreground`

### Surfaces

* `--surface`
* `--surface-raised`
* `--surface-muted`
* `--surface-subtle`

### Borders

* `--border`
* `--border-strong`
* `--border-muted`

### Text

* `--muted-foreground`
* `--subtle-foreground`
* `--inverse-foreground`

### Brand / Accent

* `--accent`
* `--accent-foreground`
* `--accent-muted`
* `--accent-border`

### Status

* `--success`
* `--success-foreground`
* `--success-muted`
* `--warning`
* `--warning-foreground`
* `--warning-muted`
* `--destructive`
* `--destructive-foreground`
* `--destructive-muted`

### Interaction

* `--focus`
* `--focus-muted`
* `--hover`
* `--active`

### Overlays / Effects

* `--overlay`
* `--scrim`
* `--shadow-color`

## Color Direction

Use restrained, premium values.

Dark mode should feel:

* Near-black or charcoal
* Calm
* High contrast but not harsh
* Restrained
* Premium
* Lightly dimensional through subtle borders and surfaces

Light mode should feel:

* Warm white or soft gray
* Clean
* Premium
* Not generic SaaS blue-and-white
* Visually connected to dark mode
* Based on the same semantic token system

Avoid:

* Loud saturated blues
* Random gold as a primary accent
* Pure black/pure white overload
* Hardcoded one-off values inside components
* Multiple competing accent systems

## Dark Mode Strategy

Use the existing strategy unless there is a clear reason to change.

Currently `app/globals.css` uses:

```
@media (prefers-color-scheme: dark)
```

For this work order, do not implement a theme toggle.

Do not switch to class-based dark mode unless doing so is required by the existing setup or the design direction document. If you believe class-based dark mode should be used later, note it as a follow-up rather than implementing it now.

The purpose of this work order is token foundation, not theme switching.

## `@theme inline` Requirements

Update the `@theme inline` block so Tailwind utilities can reference the semantic tokens.

At minimum, map the major tokens into Tailwind theme variables.

Examples:

```
--color-background: var(--background);
--color-foreground: var(--foreground);
--color-surface: var(--surface);
--color-surface-raised: var(--surface-raised);
--color-surface-muted: var(--surface-muted);
--color-border: var(--border);
--color-muted-foreground: var(--muted-foreground);
--color-accent: var(--accent);
--color-success: var(--success);
--color-warning: var(--warning);
--color-destructive: var(--destructive);
--color-focus: var(--focus);
```

Use Tailwind v4 CSS-first conventions.

## Base Styles

Keep base styles minimal.

Ensure `body` uses the semantic tokens:

```
background: var(--background);
color: var(--foreground);
```

Do not add large global styling changes.

Do not add page-specific background effects.

Do not add resets beyond what already exists unless necessary.

## Acceptance Criteria

This work is complete when:

* `app/globals.css` contains a complete semantic token set
* Tokens exist for both light and dark mode
* The existing `--background` and `--foreground` behavior is preserved or improved
* Major tokens are exposed through `@theme inline`
* `body` uses semantic background and foreground
* No app components or pages are changed
* No `tailwind.config.ts` is added unless absolutely necessary and justified
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

## Final Agent Response Format

When done, report back in this format:

### Summary

Briefly explain what was built.

### Token Foundation

Summarize the token categories added.

### Tailwind v4 Mapping

Explain how tokens were exposed through `@theme inline`.

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
