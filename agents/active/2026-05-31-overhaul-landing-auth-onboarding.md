# Work Order: Overhaul Landing + Auth + Onboarding

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

Overhaul Landing, Auth, and Onboarding so the entry experience matches the premium authenticated app.

This is WO7 in the UI overhaul sequence and the final major page group in the current UI consistency overhaul.

The authenticated app now has a semantic token foundation, tokenized shared primitives, and visually aligned Home, Wallet, Benefits, and Settings surfaces. This work order should bring the public and fresh-user surfaces into the same product language.

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

The core MVP loop works:

* Fresh signup
* Onboarding
* Card add
* Confirm benefits
* Onboarding success page
* Email reminder opt-in
* Home dashboard
* Wallet
* Benefits
* Settings
* Monthly email reminder digest via Resend

Fresh-user QA passed.

## UI Overhaul Sequence

This is WO7.

The sequence is:

1. Define Memento Visual Direction + Theme Rules
2. Build Theme Token Foundation
3. Map Tokens Into Tailwind v4 Utilities
4. Refactor Shared UI Primitives
5. Overhaul App Shell + Home/Dashboard
6. Overhaul Wallet + Benefits + Settings
7. Overhaul Landing + Auth + Onboarding

Do not create a new sequence or broaden scope beyond this page group.

## Design Direction Sources

Use these documents as the source of truth:

```
docs/design/memento-visual-direction.md
docs/design/theme-token-usage.md
```

Use the completed authenticated app surfaces as visual references:

* Home/Dashboard
* Wallet
* Benefits
* Settings
* Shared primitives in `components/ui/`

Memento should feel like a premium fintech dashboard or card concierge, not a generic SaaS template.

Avoid:

* Bubbly bento-box styling
* Random glowing blobs
* Noisy gradients
* Hardcoded colors
* Raw `white/` opacity classes
* Page-specific visual systems
* Multiple competing accent colors
* Decorative effects that do not serve the user
* Overly rounded chunky containers
* SaaS-template clutter
* Adding visual complexity just to make pages feel designed
* Reintroducing the old dark-blue/black split
* Keeping public/onboarding surfaces visually disconnected from the app

Prefer:

* Semantic theme utilities
* Clean hierarchy
* Crisp surfaces
* Restrained accent usage
* Strong action clarity
* Consistent spacing
* Light/dark readiness
* Minimal decoration
* Direct, obvious actions
* Copy that explains value without hype
* Landing/onboarding surfaces that feel like the same product as the authenticated app

## Scope

In scope:

* Landing page visual overhaul
* Auth/login visual overhaul
* Auth completion/recovery page visual cleanup if relevant
* Onboarding benefits page visual overhaul
* Onboarding build-your-lineup visual overhaul
* Onboarding confirm-benefits visual overhaul
* Onboarding success page visual overhaul
* Onboarding loading/error states if present
* Remove or reduce decorative blob usage where it makes pages feel gimmicky
* Remove inline `--background` / `--foreground` page overrides where practical
* Replace hardcoded colors in touched Landing/Auth/Onboarding files with semantic tokens
* Make public/fresh-user pages match the premium authenticated app
* Preserve existing functionality
* Run full validation

Out of scope:

* Home/Dashboard redesign
* Wallet/Benefits/Settings redesign
* Reminder email behavior changes
* Database/schema changes
* Adding new product features
* Adding a light/dark mode toggle
* Rewriting auth logic
* Rewriting onboarding business logic
* Changing card search behavior
* Changing benefit confirmation behavior
* Changing route structure unless a tiny cleanup is clearly needed
* Creating `tailwind.config.ts`
* Replacing every hardcoded color across unrelated areas
* Adding new decorative visual effects

## Files to Inspect

Inspect likely relevant files, including but not limited to:

### Landing

* `app/page.tsx`
* `components/landing/PublicLandingPage.tsx`
* `components/landing/HeroSection.tsx`
* `components/landing/HowItWorksSection.tsx`
* `components/landing/FeatureSection.tsx`
* `components/landing/FinalCtaSection.tsx`
* Any other `components/landing/` files

### Auth

* `app/auth/complete/page.tsx`
* `app/auth/callback/route.ts` only if visual/routing references matter
* `app/auth/login/route.ts` only if visual/routing references matter
* Any login/auth page components if present

### Onboarding

* `app/onboarding/benefits/page.tsx`
* `app/onboarding/benefits/components/*`
* `app/onboarding/build-your-lineup/page.tsx`
* `app/onboarding/build-your-lineup/components/*`
* `app/onboarding/confirm-benefits/page.tsx`
* `app/onboarding/confirm-benefits/loading.tsx`
* `app/onboarding/confirm-benefits/components/*`
* `app/onboarding/success/page.tsx`
* `app/onboarding/success/reminder-opt-in.tsx`

### Shared References

* `components/ui/Button.tsx`
* `components/ui/Surface.tsx`
* `components/ui/PageBackgroundBlobs.tsx`
* `components/ui/checkbox.tsx`
* `components/ui/popover.tsx`
* `components/ui/row-typography.ts`
* Home/Dashboard, Wallet, Benefits, and Settings files for visual reference only

Only modify files needed for this work order.

## Current Known Issues

Prior audits identified these specific public/onboarding issues:

* Landing page has gradient blobs, inline step colors, CTA one-offs, and brand-facing inconsistency
* Onboarding flow duplicates blob code and uses page-specific visual hacks
* Landing and onboarding pages override `--background` / `--foreground` inline instead of relying on the global token system
* Some pages manually force dark styling rather than supporting the theme/token system
* Onboarding and landing surfaces feel more like older SaaS template pages than the newer premium authenticated app
* `PageBackgroundBlobs` was extracted in WO4 as containment, not as approval to keep blobs everywhere

## Visual Goals

### 1. Landing Page

The landing page can be more expressive than the authenticated app, but it must still feel like Memento.

Requirements:

* Match the brand language of the authenticated app
* Use semantic tokens
* Use restrained accent color
* Reduce decorative blob/glow dependence
* Remove noisy gradients unless clearly purposeful
* Replace inline color systems with tokens
* Make CTA hierarchy clear
* Make the product value obvious
* Avoid bubbly bento-box aesthetics
* Avoid a generic SaaS landing page feel

Questions to consider:

* Does the landing page feel like the same product as the app?
* Does it look premium enough for a money-adjacent product?
* Are decorative effects helping trust, or making it feel cheap?
* Are CTAs visually consistent with the new Button primitive?
* Is the value proposition clear without hype?

### 2. Auth / Completion Pages

Auth pages should feel calm, trustworthy, and consistent.

Requirements:

* Use `bg-background`, semantic surfaces, and tokenized text
* Avoid mismatched dark backgrounds
* Keep recovery/error states clear
* Preserve auth behavior
* Avoid decorative excess
* Make sign-in feel safe and premium

Questions to consider:

* Does login/auth feel like part of Memento?
* Are errors and recovery actions clear?
* Does it avoid looking like a throwaway technical page?

### 3. Onboarding Benefits

The early onboarding benefit page should be clear and lightweight.

Requirements:

* Use semantic tokens
* Match authenticated app surfaces
* Use restrained hierarchy
* Avoid decorative blob dependence
* Make “why this matters” clear
* Preserve behavior and routing

### 4. Build Your Lineup

This is a key onboarding step.

Requirements:

* Make card search/add feel premium and focused
* Match Wallet add-card visual language where practical
* Use semantic token surfaces
* Make selected cards clear
* Keep primary next action obvious
* Preserve search, selected cards, and navigation behavior
* Avoid overdesigned card containers

### 5. Confirm Benefits

This page can be dense, so clarity matters.

Requirements:

* Match Benefits/Home row systems where practical
* Use semantic tokens
* Make confirmed/unconfirmed states clear
* Avoid visual clutter
* Keep benefit groups scannable
* Preserve confirmation behavior
* Preserve loading state behavior
* Avoid page-specific blob/glow backgrounds

### 6. Success Page + Reminder Opt-In

The success page should feel like a premium completion moment.

Requirements:

* Match the newer authenticated app style
* Keep the reminder opt-in prompt clear and non-pushy
* Use semantic tokens
* Make “Go to dashboard” obvious
* Avoid hype
* Preserve opt-in behavior
* Preserve inline confirmation state

## Blob / Decorative Effect Direction

`PageBackgroundBlobs` was extracted earlier only to contain duplicated blob usage.

In this work order:

* Decide whether blobs should remain on Landing only, onboarding only, both, or neither
* Prefer removing blobs from onboarding unless they clearly improve the experience
* Do not add new blob usage
* Do not add blobs to authenticated app pages
* If blobs remain on Landing, ensure they are restrained and token-compatible enough for the current theme direction
* If `PageBackgroundBlobs` becomes unused, delete it
* If it remains, explain why

The design direction favors minimal decoration. Blobs should not be the default way to make pages look designed.

## Token Usage Requirements

Use semantic utilities from:

```
docs/design/theme-token-usage.md
```

Examples:

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

Do not introduce new raw hex colors.

Do not introduce new color systems.

If a hardcoded color remains in a touched file, explain why.

## Behavioral Requirements

Preserve existing behavior.

Do not break:

* landing CTAs
* sign-in routing
* auth recovery behavior
* onboarding benefits navigation
* card search
* card selection
* benefit confirmation
* reminder opt-in
* dashboard navigation
* loading states
* error states
* accessibility labels
* keyboard/focus behavior
* responsive behavior

If behavior changes are needed to support the visual overhaul, keep them minimal and explain them.

## Responsive Requirements

Landing, Auth, and Onboarding must remain usable on:

* mobile
* tablet
* desktop

Pay attention to:

* landing hero stacking
* CTA placement
* card search on mobile
* confirm-benefits density on mobile
* onboarding progress/spacing
* success page layout
* tap targets

Do not optimize only for desktop.

## Accessibility Requirements

Maintain or improve:

* semantic buttons
* aria labels on icon-only actions
* focus visible states
* sufficient contrast
* readable text sizes
* keyboard accessibility
* non-color-only status communication
* clear error/recovery copy

Status and actions should not rely only on color.

## Acceptance Criteria

This work is complete when:

* Landing, Auth, and Onboarding visually align with the new Memento design direction
* Touched files use semantic theme utilities where practical
* Public/fresh-user experience feels like the same product as the authenticated app
* Decorative blobs/glows are removed, reduced, or intentionally contained
* Inline CSS variable overrides are removed where practical
* Existing Landing/Auth/Onboarding behavior is preserved
* No changes are made to Home/Wallet/Benefits/Settings except tiny shared cleanup if absolutely required
* No new feature behavior is introduced
* No new hardcoded color system is introduced
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

Also run focused checks against touched Landing/Auth/Onboarding files for hardcoded color usage.

Suggested checks:

```
grep -R "#[0-9A-Fa-f]\{3,8\}" components/landing app/auth app/onboarding || true
grep -R "white/" components/landing app/auth app/onboarding || true
grep -R "black" components/landing app/auth app/onboarding || true
grep -R "slate-" components/landing app/auth app/onboarding || true
grep -R "--background" components/landing app/auth app/onboarding || true
grep -R "--foreground" components/landing app/auth app/onboarding || true
```

If matches remain for legitimate reasons, explain them.

## Manual QA Checklist

After implementation, manually check:

### Landing

* Landing page desktop
* Landing page mobile
* Primary CTA
* Secondary CTA if present
* Header/nav if present
* Final CTA section

### Auth

* Sign-in path
* Auth complete/recovery page
* Error/retry state if accessible

### Onboarding

* Benefits intro page
* Build your lineup card search
* Selected card flow
* Confirm benefits page
* Confirm benefits loading state if practical
* Success page
* Reminder opt-in on/off
* Go to dashboard
* Mobile width
* Desktop width

If manual QA was not run, say so clearly.

## Final Agent Response Format

When done, report back in this format:

### Summary

Briefly explain what changed.

### Visual Direction Applied

Summarize how Landing, Auth, and Onboarding now align to the app.

### Blob / Decorative Effect Decision

State what happened to `PageBackgroundBlobs` and why.

### Files Changed

List every file changed with a short explanation.

### Behavior Preservation

State whether core Landing/Auth/Onboarding behavior was preserved.

### Token Compliance

Summarize remaining hardcoded color, raw opacity, or inline CSS variable usage in touched files.

### Validation

List commands run and results:

* `npm test`
* `npx tsc --noEmit`
* `npm run lint`
* focused grep/check results

### Manual QA

List what was manually checked and what was not checked.

### Risks / Follow-Ups

List any known risks or follow-up work.

State the next recommended work order.
