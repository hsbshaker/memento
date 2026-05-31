# Work Order: Refactor Shared UI Primitives

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

Refactor Memento’s shared UI primitives to use the new semantic theme tokens instead of hardcoded colors.

This is WO4 in the UI overhaul sequence.

The goal is to make the shared building blocks consistent, premium, and light/dark ready before any page-level redesign work begins.

Do not redesign pages in this work order.

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

The UI overhaul sequence is:

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

WO3 created:

```
docs/design/theme-token-usage.md
```

and added semantic token guidance to:

```
AGENTS.md
```

Use those documents as the source of truth.

## Design Direction

Memento should feel like a premium fintech dashboard or card concierge, not a generic SaaS template.

Avoid:

* Raw hex colors in components
* Raw `white/` opacity scales
* Random glowing blobs
* Bubbly bento-box styling
* Page-specific color systems
* Multiple competing accent colors
* Decorative gradients as default UI
* Replacing old hardcoded colors with new hardcoded colors

Prefer:

* Semantic theme utilities
* Shared primitives
* Calm neutral surfaces
* Crisp hierarchy
* Restrained accent usage
* Light/dark readiness
* Minimal decoration
* Precise spacing
* Clear interaction states

## Scope

In scope:

* Refactor shared UI primitives in `components/ui/` to use semantic token utilities
* Remove hardcoded hex colors from shared UI primitives
* Remove raw `white/` opacity styling from shared UI primitives where practical
* Normalize primitive styling around the new token system
* Preserve existing behavior and public APIs unless a small change is necessary
* Extract duplicated gradient blob styling into one shared component if it exists in multiple places
* Run full validation

Out of scope:

* Page-level redesigns
* Refactoring Home/Dashboard layout
* Refactoring Wallet/Benefits/Settings page layouts
* Refactoring Landing/Auth/Onboarding page layouts
* Adding a light/dark mode toggle
* Changing `app/globals.css` token values unless a tiny token correction is required
* Creating a `tailwind.config.ts`
* Replacing all hardcoded colors across the app
* Changing feature behavior
* Broad component rewrites
* Adding new visual effects
* Adding new decorative blobs

## Files to Inspect

Inspect all files in:

```
components/ui/
```

Likely files include:

* `components/ui/Button.tsx`
* `components/ui/Surface.tsx`
* `components/ui/UndoToast.tsx`
* `components/ui/DatePicker.tsx`
* `components/ui/row-typography.ts`
* Any other files currently in `components/ui/`

Also inspect for duplicated gradient blob styling in:

* `components/landing/`
* `app/onboarding/`
* `components/onboarding/`
* any onboarding page/component that contains repeated decorative blob code

Do not modify page files unless needed only to replace duplicated inline blob markup with a shared primitive.

## Required Primitive Refactor Rules

### Buttons

Refactor `Button` variants to use semantic tokens.

Expected direction:

* Primary button:

  * `bg-accent`
  * `text-accent-foreground`
  * restrained hover/active state
  * clear focus ring using `ring-focus`
* Secondary button:

  * neutral surface or subtle surface
  * `text-foreground`
  * `border-border`
* Ghost button:

  * transparent by default
  * neutral hover state using `bg-hover`
  * no raw white opacity classes

Do not create bubbly button wrappers.

Do not over-round everything automatically.

### Surfaces / Cards

Refactor `Surface` or equivalent card primitive to use:

* `bg-surface`
* `bg-surface-raised`
* `bg-surface-muted`
* `border-border`
* `border-border-muted`
* `shadow-color` only if needed

Surfaces should feel crisp and restrained.

Avoid noisy gradients and glowing borders.

### Toast

Refactor `UndoToast` or toast primitive to use:

* `bg-surface-raised`
* `border-border`
* `text-foreground`
* `text-muted-foreground`
* `text-accent` or `bg-accent` only for action emphasis
* `shadow-color` if shadow is used

Toast should feel premium and calm, not loud.

### Date Picker / Inputs

Refactor date picker/input primitives to use:

* `bg-surface`
* `bg-surface-raised`
* `border-border`
* `text-foreground`
* `text-muted-foreground`
* `bg-hover`
* `ring-focus`

Avoid raw dark backgrounds like `#111113`.

### Row Typography

Update `row-typography.ts` to use semantic text utilities.

Expected direction:

* Primary row text: `text-foreground`
* Secondary row text: `text-muted-foreground`
* Tertiary/helper row text: `text-subtle-foreground`
* Avoid raw `white/90`, `white/45`, `white/40`

Preserve the purpose of the typography constants.

### Badges / Status Indicators

If badge primitives exist, ensure they use:

* `bg-success-muted` / `text-success`
* `bg-warning-muted` / `text-warning`
* `bg-destructive-muted` / `text-destructive`
* `bg-accent-muted` / `text-accent` only for brand emphasis

Do not use status colors for decoration.

### Gradient Blob Extraction

If gradient blob markup or styling is duplicated across landing and onboarding surfaces, extract one shared component.

Suggested location:

```
components/ui/GradientBlob.tsx
```

or another existing shared UI folder convention.

Important:

* This extraction is for containment, not approval to add more blobs.
* Do not add new blob usage.
* Do not add blobs to authenticated app pages.
* Preserve existing visual behavior where the duplicated blobs already exist.
* The shared component should make future removal/control easier.

## Token Usage Requirements

Use classes documented in:

```
docs/design/theme-token-usage.md
```

Approved examples:

* `bg-background`
* `text-foreground`
* `bg-surface`
* `bg-surface-raised`
* `bg-surface-muted`
* `bg-surface-subtle`
* `border-border`
* `border-border-strong`
* `border-border-muted`
* `text-muted-foreground`
* `text-subtle-foreground`
* `text-inverse-foreground`
* `bg-accent`
* `text-accent`
* `text-accent-foreground`
* `bg-accent-muted`
* `border-accent-border`
* `text-success`
* `bg-success-muted`
* `text-warning`
* `bg-warning-muted`
* `text-destructive`
* `bg-destructive-muted`
* `ring-focus`
* `bg-hover`
* `bg-active`
* `bg-overlay`
* `bg-scrim`

Do not introduce new raw hex color values.

Do not introduce new arbitrary one-off color systems.

## Behavioral Requirements

Preserve existing functionality.

Do not break:

* button props or variants
* toast behavior
* date picker behavior
* row actions
* focus/keyboard behavior
* accessibility labels
* existing imports

If a primitive API must change, keep the change minimal and update all affected callers.

## Acceptance Criteria

This work is complete when:

* Shared UI primitives use semantic theme utilities
* Hardcoded hex colors are removed from `components/ui/` where practical
* Raw `white/` opacity classes are removed from `components/ui/` where practical
* Existing primitive behavior is preserved
* Duplicate gradient blob code is centralized if practical
* No page-level redesigns are performed
* No broad component rewrites are performed
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

Also run a focused grep/check for hardcoded colors remaining in `components/ui/`.

Suggested checks:

```
grep -R "#[0-9A-Fa-f]\{3,8\}" components/ui || true
grep -R "white/" components/ui || true
grep -R "black" components/ui || true
grep -R "slate-" components/ui || true
```

If some matches remain for legitimate reasons, explain them.

## Final Agent Response Format

When done, report back in this format:

### Summary

Briefly explain what was refactored.

### Primitive Changes

Summarize changes by primitive:

* Button
* Surface
* Toast
* DatePicker
* Row typography
* Other primitives

### Gradient Blob Handling

State whether duplicated blob styling was found.

If extracted, explain where and what callers were updated.

If not extracted, explain why.

### Token Compliance

Summarize remaining hardcoded color or raw opacity usage in `components/ui/`.

### Files Changed

List every file changed with a short explanation.

### Validation

List commands run and results:

* `npm test`
* `npx tsc --noEmit`
* `npm run lint`
* focused grep/check results

### Risks / Follow-Ups

List any known risks or follow-up work.

State the next recommended work order.
