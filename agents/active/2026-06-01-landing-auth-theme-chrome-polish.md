# Work Order: Landing/Auth/Theme Chrome Polish

## Status

Active

## Repo

```bash
/Users/haseebshaker/card-benefits-tracker
```

## Branch

```bash
dev
```

## Operating Rules

Do not create or use a separate git worktree, hidden worktree, task branch, or alternate repo copy.

Operate directly in the current local repo files on the current `dev` branch.

Before making changes, run:

```bash
git branch --show-current
git status --short
git worktree list
```

Confirm:

* current branch is `dev`
* working tree is clean unless the user explicitly says otherwise
* only the main repo worktree exists

Do not commit unless the user explicitly says to commit.

Validation commands:

```bash
npm test
npx tsc --noEmit
npm run lint
```

There is no `npm run typecheck`; use:

```bash
npx tsc --noEmit
```

Prefer `rg` over `grep`.

Latest known pushed commit on `dev`:

```text
b502751 Align benefits row actions and sync feed state
```

---

## Goal

Polish the first landing-page impression, add first-run theme control, make onboarding inherit that theme choice cleanly, and remove unauthenticated dashboard/auth redirect flashes.

This work order focuses only on:

1. Landing page top-right sign-in visual cleanup.
2. Landing page light/dark/system theme control.
3. Onboarding screen light/dark/system theme control.
4. Clean unauthenticated Dashboard click behavior with no dashboard/intermediate screen flash.

Do not change the deeper onboarding page UX in this work order. Build-your-lineup, confirm-benefits, and success page content changes will be handled in later work orders.

---

## Product Context

Memento is a premium credit card benefits tracker.

The desired feel is:

* premium
* calm
* precise
* trustworthy
* fast
* low-friction
* expensive
* modern, but not gimmicky

Avoid:

* bubbly bento-box styling
* random glowing blobs
* noisy gradients
* hardcoded colors
* raw `white/` opacity systems
* generic SaaS template feel
* page-specific visual systems
* hidden primary actions

Prefer:

* semantic theme tokens
* crisp surfaces
* restrained accent usage
* clean hierarchy
* consistent row/list language
* direct, obvious actions
* light/dark readiness

---

## Design Source of Truth

Read these before UI changes:

```bash
docs/design/memento-visual-direction.md
docs/design/theme-token-usage.md
AGENTS.md
app/globals.css
```

The app uses Tailwind v4 CSS-first setup. Do not add old Tailwind v3-style config unless absolutely necessary.

Use semantic theme tokens. Do not introduce hardcoded colors, old blue accents, new decorative blobs, or one-off page-specific visual systems.

Theme preference already exists and is persisted through:

```text
memento-theme
```

Expected values:

```text
system
light
dark
```

The theme architecture should already support:

* `System` as default
* `Light`
* `Dark`
* localStorage persistence under `memento-theme`
* root `data-theme` behavior

Reuse the existing theme infrastructure rather than creating a second system.

---

## Current Issue

The first-run user flow has a few rough edges:

1. The landing page top-right sign-in button appears inside a bento/card-style wrapper. This should be removed.
2. The landing page does not expose a theme toggle for System/Light/Dark.
3. Onboarding pages do not expose the same theme toggle when users are adding cards or confirming benefits.
4. Clicking the Dashboard button while unauthenticated briefly flashes dashboard/Memento/intermediate screens before routing to Google sign-in. That flash should not happen.

---

## Requirements

### 1. Remove landing sign-in bento wrapper

On the landing page, remove the bento/card-style container around the top-right sign-in button.

Requirements:

* Keep the sign-in action available.
* Do not redesign the landing page.
* Preserve the landing page layout and hierarchy.
* The sign-in control should feel native to the header/nav, not like a floating card or bento box.

---

### 2. Add theme control to landing page

Add a theme mode control on the landing page.

Requirements:

* Must support:

  * System
  * Light
  * Dark
* Must use existing `memento-theme` persistence.
* Must update the actual app theme immediately.
* Must survive navigation into onboarding.
* Must use existing semantic tokens.
* Must match the Memento visual language.
* Should be restrained and premium.
* A moon/sun-style affordance is acceptable, but it must still allow all three modes: System, Light, and Dark.

Implementation guidance:

* Reuse existing theme preference helpers where possible.
* Inspect `components/settings/ThemeSection.tsx` and `lib/theme/theme-preference.ts`.
* If a reusable compact theme control does not exist, create one in an appropriate shared location.
* Avoid duplicating theme logic across landing and onboarding.

---

### 3. Add theme control to onboarding screens

The onboarding screens should expose the same theme control so first-time users can switch theme while adding cards and confirming benefits.

Relevant screens:

```bash
/onboarding/build-your-lineup
/onboarding/confirm-benefits
/onboarding/success
```

Requirements:

* Add the theme control to onboarding screens.
* Prefer a shared onboarding header/chrome if one exists or is easy to introduce.
* The control should be visually consistent across onboarding pages.
* The selected theme should follow through from landing to onboarding.
* Do not make separate theme state just for onboarding.
* Do not redesign the onboarding pages.
* Do not perform the later page-specific onboarding UX changes in this work order.

---

### 4. Fix unauthenticated Dashboard click flash

When an unauthenticated user clicks the Dashboard button from the landing page, the app briefly flashes dashboard/Memento/intermediate screens before routing to Google sign-in.

This flash should not happen.

Requirements:

* Investigate whether the issue is caused by:

  * client-side auth gating
  * route redirect timing
  * protected page rendering before auth resolution
  * dashboard/home redirect behavior
  * app chrome rendering before auth state is known
* Prefer a proper route/auth gating fix over hiding the issue with cosmetic loading.
* Preserve intended behavior:

  * authenticated users can reach dashboard/home
  * unauthenticated users are routed cleanly to sign-in
* Avoid introducing a new loading screen unless it is truly necessary and visually consistent.
* The unauthenticated path should not briefly render protected dashboard/home UI.

Important route context:

* `/dashboard` and `/login` are intentional redirect stubs.
* `/dashboard` redirects to `/home`.
* `/login` redirects to `/auth/login`.
* Do not delete these routes just because they look like stubs.

---

## Files Likely Involved

Inspect before editing:

```bash
app/page.tsx
components/landing/*
components/app-header.tsx
components/app/AppChrome.tsx
components/app/AuthenticatedAppShell.tsx
components/app/app-nav.ts
app/dashboard/page.tsx
app/home/page.tsx
app/auth/login/*
app/onboarding/build-your-lineup/page.tsx
app/onboarding/confirm-benefits/page.tsx
app/onboarding/success/page.tsx
lib/theme/theme-preference.ts
components/settings/ThemeSection.tsx
```

Use `rg` to find the actual components and routing logic.

Useful searches:

```bash
rg "memento-theme|ThemeSection|theme preference|data-theme" app components lib
rg "Dashboard|dashboard|/dashboard|home|auth/login|redirect" app components lib
rg "build-your-lineup|confirm-benefits|onboarding/success" app components
```

---

## Out of Scope

Do not include these changes in this work order:

* `/onboarding/build-your-lineup` content cleanup
* removing the search result `Add` text
* wallet count movement into `Your Wallet (#)`
* 0-trackable-benefit card confirmation
* confirm-benefits alphabetical card sorting
* confirm-benefits select/deselect all changes
* confirm-benefits anniversary-date layout changes
* success page reminder button redesign
* reminder preference behavior changes
* new dashboard/home features
* backend benefit logic changes
* database schema changes

Those will be handled in later work orders.

---

## Acceptance Criteria

* Landing page top-right sign-in no longer sits inside a bento/card wrapper.
* Landing page has a System/Light/Dark theme control.
* Onboarding pages expose the same theme control or a shared equivalent.
* Theme selection persists via `memento-theme`.
* Theme selection on landing is reflected on onboarding pages.
* Theme switching does not cause hydration warnings or visible flashing.
* Clicking Dashboard while unauthenticated no longer flashes dashboard/home/intermediate protected UI before auth.
* Authenticated users can still navigate to dashboard/home as expected.
* `/dashboard` and `/login` redirect stubs remain intact unless there is a clear reason to adjust them safely.
* No hardcoded colors are introduced.
* No new visual system is introduced.
* Validation passes.

---

## Required Validation

After finishing, show:

```bash
git status --short
git diff --stat
```

Then run:

```bash
npm test
npx tsc --noEmit
npm run lint
```

Also run targeted searches:

```bash
rg "memento-theme|ThemeSection|theme preference|data-theme" app components lib
rg "Dashboard|dashboard|/dashboard|home|auth/login|redirect" app components lib
rg "build-your-lineup|confirm-benefits|onboarding/success" app components
```

Do not commit unless the user explicitly tells you to.

---

## Final Report Format

When complete, report:

1. What changed.
2. Files changed.
3. Validation results.
4. Any issues or tradeoffs.
5. Whether any follow-up work is recommended.
