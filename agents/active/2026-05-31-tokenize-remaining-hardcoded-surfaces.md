# Work Order: Tokenize Remaining Hardcoded Surfaces

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

Clean up the remaining hardcoded/theme-breaking UI surfaces found in the WO8 UI Overhaul QA + Theme Readiness Audit.

This is a small mechanical cleanup work order before building light/dark theme toggle infrastructure.

The goal is to make the app safe for theme toggle work by removing the remaining live hardcoded dark-only styles and deprecated accent values.

Do not redesign pages.

Do not add a light/dark mode toggle.

Do not perform a typography overhaul.

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

The 7-part UI overhaul is complete:

1. Define Memento Visual Direction + Theme Rules
2. Build Theme Token Foundation
3. Map Tokens Into Tailwind v4 Utilities
4. Refactor Shared UI Primitives
5. Overhaul App Shell + Home/Dashboard
6. Overhaul Wallet + Benefits + Settings
7. Overhaul Landing + Auth + Onboarding

WO8 audited the finished overhaul and found the app is mostly theme-ready, but a few remaining hardcoded surfaces must be cleaned up before light/dark toggle infrastructure is built.

## Design Direction Sources

Use these documents as the source of truth:

```
docs/design/memento-visual-direction.md
docs/design/theme-token-usage.md
```

Use semantic theme tokens from `app/globals.css`.

Avoid:

* Raw hex colors in components/pages
* Raw `white/` opacity styling
* Solid `text-white` / `text-black` dark-only defaults
* Page-specific color systems
* Deprecated blue/gold rgba glow values
* New decorative effects
* New hardcoded color systems

Prefer:

* `bg-background`
* `text-foreground`
* `bg-surface`
* `bg-surface-raised`
* `bg-surface-muted`
* `border-border`
* `text-muted-foreground`
* `text-subtle-foreground`
* `bg-accent`
* `text-accent`
* `bg-accent-muted`
* `border-accent-border`
* `text-success`
* `text-warning`
* `text-destructive`
* `ring-focus`
* `bg-hover`
* `bg-scrim`

## WO8 Findings to Fix

Fix only these theme-readiness issues from the audit.

### 1. Tokenize or retire `components/app-header.tsx`

File:

```
components/app-header.tsx
```

Problem:

* Live on `/auth/*` pages through `AppChrome`
* Hardcoded pre-overhaul styling
* Contains dark-only values like:

  * `bg-[#0B1220]`
  * `bg-[#0F1A2E]`
  * `bg-[#030712]`
  * `bg-[#F7C948]`
  * many `white/` opacity classes
  * `ring-[#F7C948]/45`

Required:

* Either tokenize the component or retire it if a simpler auth header pattern is cleaner.
* Preserve current auth-page behavior and routing.
* Do not redesign auth pages beyond making this header token-compliant.
* Use semantic tokens.
* Keep it calm, minimal, and consistent with the authenticated shell.

### 2. Fix body default text color

File:

```
app/layout.tsx
```

Problem:

* `<body>` currently has `text-white`, which is dark-only and breaks unstyled text in light mode.

Required:

* Replace with `text-foreground`, or remove the class if `globals.css` already handles body text color cleanly.
* Preserve all font variables and layout behavior.

### 3. Fix two remaining `text-white` headings in onboarding benefits

File:

```
app/onboarding/benefits/components/benefits-onboarding.tsx
```

Problem:

* Two remaining solid `text-white` headings survived WO7.
* They will be invisible or low-contrast in light mode.

Required:

* Replace with semantic text tokens, likely `text-foreground`.
* Do not otherwise redesign the onboarding benefits page.

### 4. Tokenize or reduce `PageBackgroundBlobs`

File:

```
components/ui/PageBackgroundBlobs.tsx
```

Problem:

* Landing-only ambient blob component still uses hardcoded deprecated rgba values:

  * blue `rgba(74,158,255,...)`
  * gold `rgba(200,169,75,...)`
* These values are outside the semantic token system and preserve the deprecated blue/gold accent split.

Required:

* Remove deprecated blue usage.
* Prefer a restrained token-compatible ambient effect.
* Keep landing-only usage if it still feels appropriate.
* Do not add blobs to onboarding or authenticated pages.
* If the component becomes unnecessary, delete it and remove its import from landing.
* Do not introduce new raw hex/rgba color systems.

Important:

* CSS variables inside inline styles are acceptable if needed, for example `rgb(var(--...))` only if token structure supports it.
* If token-compatible blob styling is awkward, simplify or remove the blob rather than forcing complexity.

### 5. Fix confirm-benefits loading shimmer

File:

```
app/onboarding/confirm-benefits/loading.tsx
```

Problem:

* One remaining shimmer gradient uses hardcoded `rgba(255,255,255,...)`.
* This is weak or invisible in light mode.

Required:

* Replace with a token-based shimmer or simplify the loading treatment.
* Preserve the loading behavior and timing.
* Do not redesign the loading page.

### 6. Optional stale comment cleanup

File:

```
lib/format-card.ts
```

Problem:

* A stale comment references deleted wallet builder files.

Required:

* If the stale comment exists and is clearly obsolete, update or remove it.
* Do not change runtime logic.

## Scope

In scope:

* Tokenize the exact hardcoded surfaces listed above
* Make the app safer for light/dark toggle work
* Use semantic theme tokens
* Preserve behavior
* Run full validation
* Run focused grep checks

Out of scope:

* Adding a light/dark mode toggle
* Theme provider implementation
* LocalStorage theme persistence
* Changing dark mode strategy
* Typography / Geist / type-scale overhaul
* Page redesigns
* Home/Wallet/Benefits/Settings visual changes
* Landing redesign
* Auth routing changes
* Onboarding behavior changes
* Database/schema changes
* New features
* Creating `tailwind.config.ts`
* Broad grep-driven refactors outside the listed files

## Behavioral Requirements

Preserve existing behavior.

Do not break:

* landing page rendering
* auth sign-in and recovery pages
* onboarding benefits page behavior
* confirm-benefits loading state
* route behavior
* focus/keyboard behavior
* responsive behavior

If a change risks behavior, stop and report before proceeding.

## Token Usage Requirements

Use semantic utilities from:

```
docs/design/theme-token-usage.md
```

Approved examples:

* `bg-background`
* `text-foreground`
* `bg-surface`
* `bg-surface-raised`
* `bg-surface-muted`
* `border-border`
* `border-border-strong`
* `border-border-muted`
* `text-muted-foreground`
* `text-subtle-foreground`
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

Do not introduce new raw rgba color values unless there is no practical token alternative and the exception is clearly explained.

## Validation

Run:

```
npm test
npx tsc --noEmit
npm run lint
```

Remember: this repo does not have `npm run typecheck`.

Also run focused checks for the exact areas fixed:

```
grep -R "#[0-9A-Fa-f]\{3,8\}" components/app-header.tsx app/layout.tsx app/onboarding/benefits/components/benefits-onboarding.tsx components/ui/PageBackgroundBlobs.tsx app/onboarding/confirm-benefits/loading.tsx lib/format-card.ts || true
grep -R "white/" components/app-header.tsx app/layout.tsx app/onboarding/benefits/components/benefits-onboarding.tsx components/ui/PageBackgroundBlobs.tsx app/onboarding/confirm-benefits/loading.tsx lib/format-card.ts || true
grep -R "text-white" components/app-header.tsx app/layout.tsx app/onboarding/benefits/components/benefits-onboarding.tsx components/ui/PageBackgroundBlobs.tsx app/onboarding/confirm-benefits/loading.tsx lib/format-card.ts || true
grep -R "bg-black\|text-black\|black/" components/app-header.tsx app/layout.tsx app/onboarding/benefits/components/benefits-onboarding.tsx components/ui/PageBackgroundBlobs.tsx app/onboarding/confirm-benefits/loading.tsx lib/format-card.ts || true
grep -R "rgba" components/app-header.tsx app/layout.tsx app/onboarding/benefits/components/benefits-onboarding.tsx components/ui/PageBackgroundBlobs.tsx app/onboarding/confirm-benefits/loading.tsx lib/format-card.ts || true
grep -R "--background\|--foreground" components/app-header.tsx app/layout.tsx app/onboarding/benefits/components/benefits-onboarding.tsx components/ui/PageBackgroundBlobs.tsx app/onboarding/confirm-benefits/loading.tsx lib/format-card.ts || true
```

If matches remain for legitimate reasons, explain them.

## Manual QA Guidance

If possible, manually check:

* `/auth/login`
* `/auth/complete` or recovery page if reachable
* onboarding benefits page
* confirm-benefits loading page if practical
* landing page ambient background
* light mode system preference
* dark mode system preference

If manual QA was not run, say so clearly.

## Acceptance Criteria

This work is complete when:

* `components/app-header.tsx` is tokenized or retired
* `app/layout.tsx` no longer uses a dark-only `text-white` body default
* the two onboarding benefits `text-white` headings are tokenized
* `PageBackgroundBlobs` no longer uses deprecated blue/gold hardcoded rgba values, or it is removed
* confirm-benefits loading shimmer no longer uses hardcoded `rgba(255,255,255,...)`
* stale comment in `lib/format-card.ts` is cleaned if present
* no new hardcoded color system is introduced
* no theme toggle is added
* no page redesign is performed
* validation passes:

  npm test
  npx tsc --noEmit
  npm run lint

## Final Agent Response Format

When done, report back in this format:

### Summary

Briefly explain what was fixed.

### Cleanup Details

List each WO8 finding and what was done.

### Files Changed

List every file changed with a short explanation.

### Token Compliance

Summarize focused grep results.

### Validation

List commands run and results:

* `npm test`
* `npx tsc --noEmit`
* `npm run lint`
* focused grep/check results

### Manual QA

List what was manually checked and what was not checked.

### Risks / Follow-Ups

State whether the app is now ready for Light / Dark / System toggle infrastructure.

State the next recommended work order.
