# Work Order: Define Memento Visual Direction + Theme Rules

## Status

Active

## Agent Role

UX Agent / Discovery Agent

## Operating Mode

Do not create or use a separate git worktree, hidden worktree, task branch, or alternate repo copy.

Operate directly in the current local repo on the current `dev` branch.

Before starting, run:

```
git branch --show-current
git status --short
git worktree list
```

Confirm:

* The current branch is `dev`
* The only worktree is the main repo
* There are no unexpected local changes

This is a UX/design-direction and documentation task.

Do not make app code changes.

Do not redesign pages.

Do not edit components.

Do not create or modify theme tokens yet.

Do not commit anything unless explicitly instructed by the product owner.

## Objective

Create a durable visual direction and theme rules document for Memento before the UI overhaul begins.

The goal is to prevent design drift during the upcoming multi-work-order UI overhaul.

The output should give future builder agents clear rules for how Memento should look and feel, what to avoid, what to prefer, and how light/dark mode should be approached.

## Product Context

Memento is a premium credit card benefits tracker focused on helping users capture “use it or lose it” value from their cards.

The core MVP loop now works:

* Fresh signup
* Onboarding
* Card add
* Confirm benefits
* Onboarding success page
* Email reminder opt-in
* Dashboard
* Row actions with undo
* Monthly email reminder digest via Resend

Fresh-user QA passed.

The next priority is not new functionality. The next priority is making the product feel premium and visually consistent end to end.

## Current Problem

The UI currently feels visually inconsistent across pages.

Known issues include:

* Some areas are dark blue while others are black
* Mixed background systems
* Random glowing blobs
* Decorative or stale imagery
* Bubbly bento-box-like sections where they feel cheap or overdone
* Inconsistent spacing
* Inconsistent typography
* Inconsistent buttons
* Inconsistent surfaces/cards
* Inconsistent layouts
* One-off component styles
* Landing, onboarding, and authenticated app surfaces feel like different products
* Light mode is not truly supported yet

The prior theme audit found:

* Only two CSS variables currently exist: `--background` and `--foreground`
* 200+ hardcoded color references exist across the app
* UI primitives hardcode their own colors independently
* No real theme/token foundation exists
* Tailwind v4 is being used through CSS-first setup
* Light mode is structurally broken because most styles are hardcoded for dark mode

## Design Goal

Memento should feel:

* Premium
* Calm
* Precise
* Trustworthy
* Fast
* Low-friction
* Expensive
* Modern, but not gimmicky

The visual language should feel closer to a premium card concierge or fintech dashboard than a generic SaaS startup template.

## Avoid

Future UI work should avoid:

* Bubbly bento boxes around everything
* Random glowing blobs
* Noisy gradients
* Over-rounded pill containers everywhere
* Decorative images that do not serve the user
* Inconsistent dark blue vs. black backgrounds
* Hardcoded one-off visual styles
* SaaS-template clutter
* Random component styles per page
* Excessive shadows
* Multiple competing accent colors
* Unclear CTA hierarchy
* Copy-pasted decorative effects
* Page-specific visual hacks
* Replacing old hardcoded styles with new hardcoded styles

## Prefer

Future UI work should prefer:

* A consistent neutral background system
* Crisp surfaces
* Restrained accent color
* Strong visual hierarchy
* Clean spacing
* Shared primitives
* Minimal decoration
* High-quality typography
* Direct action-oriented layouts
* Semantic theme tokens
* Components that work in both light and dark mode
* Small, purposeful visual moments instead of decorative noise

## Light / Dark Mode Philosophy

Memento should eventually support both light and dark mode.

This means the UI overhaul must not hardcode a dark-only design.

Do not redesign pages using raw classes such as:

* `bg-black`
* `bg-slate-950`
* `bg-[#0D0D11]`
* `text-white`
* `text-white/70`
* `border-white/10`

Instead, future work should move toward semantic tokens such as:

* background
* foreground
* surface
* surface-raised
* surface-muted
* border
* border-strong
* muted-foreground
* accent
* success
* warning
* destructive
* focus
* shadow/elevation

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

Light mode and dark mode should feel like the same brand under different lighting, not two separate products.

## Tailwind v4 Constraint

The project uses Tailwind v4 through a CSS-first setup.

Future theme work should extend the `@theme` block in `app/globals.css` where appropriate.

Do not blindly add an old Tailwind v3-style `tailwind.config.ts` with `theme.extend.colors` unless the repo clearly needs it.

The preferred direction is:

* Define semantic CSS variables in `app/globals.css`
* Expose those variables through the Tailwind v4 `@theme` setup
* Use semantic classes in components
* Avoid spreading raw hex colors across components

## Required Output

Create a new design direction document:

```
docs/design/memento-visual-direction.md
```

If the `docs/design` folder does not exist, create it.

The document should be concise but specific enough that future coding agents can follow it.

It should include these sections:

### 1. Product Visual North Star

One clear paragraph describing how Memento should feel.

### 2. Design Principles

Define 5–7 design principles.

Examples:

* Calm over flashy
* Precision over decoration
* One system over page-specific styling
* Action clarity over visual novelty
* Premium restraint over startup gimmicks
* Theme-ready by default

### 3. Visual Rules

Write explicit rules for:

* Backgrounds
* Surfaces/cards
* Borders
* Buttons
* Typography
* Spacing
* Icons
* Badges/status indicators
* Motion/animation
* Empty states
* Decorative effects

### 4. Light / Dark Mode Rules

Define how light and dark modes should relate.

Include what dark mode should feel like.

Include what light mode should feel like.

Make clear that components should use semantic tokens rather than raw color classes.

### 5. Color and Token Direction

Do not implement tokens yet.

Describe the semantic token categories the next builder work order should create.

Include:

* app background
* foreground
* surface levels
* border levels
* muted text
* accent
* success
* warning
* destructive
* focus
* overlay/scrim

### 6. Component Direction

Give guidance for shared primitives:

* buttons
* surfaces/cards
* rows
* inputs
* tabs
* toggles
* badges
* toast
* modals/drawers
* navigation

### 7. Page Group Direction

Give guidance for future page overhaul work:

* App shell + home/dashboard
* Wallet + benefits + settings
* Onboarding
* Landing/auth

### 8. Explicit Anti-Patterns

List things future agents should not do.

Include:

* random glowing blobs
* bubbly bento boxes
* hardcoded dark colors
* page-specific color systems
* decorative images without purpose
* multiple competing button styles
* arbitrary font sizes
* arbitrary opacity scales
* redesigning pages before tokens/primitives are ready

### 9. Next Work Orders

Recommend the next 6 work orders after this one, in order.

They should align to this plan:

1. Build Theme Token Foundation
2. Map Tokens Into Tailwind v4 Utilities
3. Refactor Shared UI Primitives
4. Overhaul App Shell + Home/Dashboard
5. Overhaul Wallet + Benefits + Settings
6. Overhaul Landing + Auth + Onboarding

## Scope

In scope:

* Inspect current theme/style files if useful
* Read prior audit context from the active conversation if available
* Create `docs/design/memento-visual-direction.md`
* Keep the guidance concrete and actionable
* Make recommendations that support light and dark mode

Out of scope:

* App code changes
* Component changes
* Page redesigns
* Token implementation
* Tailwind config changes
* CSS variable implementation
* Screenshots
* Figma-style visual mockups
* New functionality

## Acceptance Criteria

This work is complete when:

* `docs/design/memento-visual-direction.md` exists
* The document clearly defines the Memento visual direction
* The document gives future agents specific rules to follow
* The document explicitly supports future light/dark mode
* The document warns against hardcoded dark-only styling
* The document includes explicit anti-patterns
* The document recommends the next 6 work orders
* No app code is changed

## Validation

Since this is documentation-only, full validation is not required unless app code changes are made.

At minimum, run:

```
git status --short
git diff --stat
```

If any app code changes are made by mistake, stop and revert them.

## Final Agent Response Format

When done, report back in this format:

### Summary

Briefly explain what was created.

### Design Direction

Summarize the visual north star in 3–5 bullets.

### Files Changed

List every file changed with a short explanation.

### Validation

List commands run and results.

### Next Work Order Recommendation

State the next recommended work order.
