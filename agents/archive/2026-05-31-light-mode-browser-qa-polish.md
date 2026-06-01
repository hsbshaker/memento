# Work Order: Light Mode Browser QA + Polish

## Status

Active

## Agent Role

QA Agent / Builder Agent

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
* The working tree is clean
* The only worktree is the main repo
* There are no unexpected local changes

Do not commit unless explicitly instructed by the product owner.

## Objective

Perform a browser-based QA and polish pass for the newly added Light / Dark / System theme toggle.

The theme toggle infrastructure is now built. The goal of this work order is to verify the app visually in real browser conditions across light mode, dark mode, and system mode, then make only small polish fixes for theme-specific issues.

This is not a redesign work order.

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

The full UI overhaul is complete:

1. Visual direction and theme rules
2. Semantic theme token foundation
3. Tailwind v4 token utility mapping
4. Shared UI primitives
5. App shell + Home/Dashboard
6. Wallet + Benefits + Settings
7. Landing + Auth + Onboarding
8. Theme readiness cleanup
9. Light / Dark / System theme toggle infrastructure

This work order validates the theme toggle in the browser and fixes small issues exposed by real light/dark rendering.

## Design Direction Sources

Use these documents as the source of truth:

```
docs/design/memento-visual-direction.md
docs/design/theme-token-usage.md
```

Use semantic theme tokens from:

```
app/globals.css
```

Do not introduce raw colors.

Do not redesign pages.

## Current Theme Behavior

The app should now support:

* **System**

  * Default
  * Follows OS/browser preference
  * No explicit `data-theme` override, or equivalent architecture

* **Light**

  * Explicit user override
  * Persists in `localStorage`
  * Forces light tokens

* **Dark**

  * Explicit user override
  * Persists in `localStorage`
  * Forces dark tokens

Theme preference is device-local through `localStorage`.

Expected localStorage key:

```
memento-theme
```

Expected values:

```
system
light
dark
```

Settings should contain an Appearance section with System / Light / Dark.

## Scope

In scope:

* Browser QA of System / Light / Dark behavior
* Browser QA of key pages in light and dark mode
* Small theme polish fixes
* Small contrast fixes
* Small surface/border/token adjustments if needed
* Small class corrections where theme toggle exposes a bad token choice
* Fixing obvious theme persistence or no-flash issues
* Fixing Settings theme control issues
* Running validation

Out of scope:

* Page redesigns
* New features
* Typography / Geist cleanup
* Type-scale cleanup
* Database/schema changes
* Supabase persistence for theme
* Changing theme token values broadly
* Reworking the whole theme architecture
* Changing product flows
* Changing email reminder behavior
* Creating `tailwind.config.ts`
* Large visual changes unrelated to light/dark QA

If a larger issue is discovered, report it as a follow-up instead of doing a broad refactor.

## Files to Inspect

Inspect likely relevant files:

### Theme Infrastructure

* `app/globals.css`
* `app/layout.tsx`
* `lib/theme/theme-preference.ts`
* `components/settings/ThemeSection.tsx`
* `components/settings/SettingsScreen.tsx`

### Core Pages to QA

* `app/page.tsx`
* `components/landing/`
* `app/auth/`
* `app/onboarding/`
* `components/home/`
* `app/home/`
* `components/wallet/`
* `app/wallet/`
* `components/benefits/`
* `app/benefits/`
* `components/settings/`
* `app/settings/`

Only modify files needed for small theme polish.

## Browser QA Requirements

Use the local dev server if available.

Recommended:

```
npm run dev
```

Then verify the app in browser.

### Theme Control QA

Verify in Settings:

1. Appearance section renders.
2. System / Light / Dark options are visible.
3. Selected state is clear.
4. Keyboard focus state is visible.
5. Selecting Light applies light mode immediately.
6. Selecting Dark applies dark mode immediately.
7. Selecting System returns to system preference behavior.
8. Refresh preserves explicit Light.
9. Refresh preserves explicit Dark.
10. Refresh after System behaves like OS/browser preference.
11. No obvious flash of the wrong theme on reload.

### Data Attribute / Persistence QA

In browser dev tools, verify:

* `localStorage.getItem("memento-theme")` reflects the selected preference.
* `<html>` has the expected `data-theme` behavior:

  * Light selection should explicitly force light.
  * Dark selection should explicitly force dark.
  * System should not incorrectly force the wrong theme.

Follow the architecture implemented in WO10. Do not change it unless clearly broken.

## Page QA Checklist

Check each page in **Light** and **Dark** where practical.

### Landing

* Desktop
* Mobile
* Hero
* Primary CTA
* Sign-in CTA
* How it works
* Feature section
* Final CTA
* Ambient blob/glow in light mode

### Auth

* Login/sign-in path
* Auth complete page
* Auth error/recovery page if reachable
* Header in light mode
* Header in dark mode

### Onboarding

* Benefits intro page
* Build-your-lineup search/select/remove
* Confirm benefits page
* Confirm benefits loading state if practical
* Success page
* Reminder opt-in prompt

### Authenticated App

* Home dashboard
* Home row actions / undo toast if practical
* Wallet page
* Add-card modal
* Wallet card drawer if practical
* Benefits page
* Benefits filters/tabs/actions
* Settings page
* Email reminder toggle
* Appearance theme control

## Visual QA Criteria

Look for:

* low contrast text
* washed-out surfaces
* borders too faint or too harsh
* accent overuse
* warning/success/destructive colors that feel too loud in light mode
* hover states that disappear in light mode
* selected states that are unclear
* focus rings that are hard to see
* modal/scrim issues in light mode
* loading/skeleton shimmer issues
* theme flash on refresh
* landing visual feeling disconnected from authenticated app
* mobile density or wrapping issues caused by theme control

## Fix Guidelines

Allowed fixes:

* Swap to a better existing semantic token class.
* Tighten a hover/focus/selected state.
* Adjust a component to use an existing token more appropriately.
* Fix a no-flash/persistence bug.
* Fix Settings theme control state handling.
* Fix obvious contrast issue using existing tokens.

Avoid:

* changing token values globally unless absolutely necessary
* creating new token categories
* redesigning layouts
* changing copy unless needed for theme control clarity
* touching unrelated logic

If you believe a token value itself is wrong, report it as a risk/follow-up unless the issue is severe and small.

## Validation

Run:

```
npm test
npx tsc --noEmit
npm run lint
```

Remember: this repo does not have `npm run typecheck`.

Also run:

```
rg "memento-theme|data-theme|ThemePreference|ThemeSection" app components lib || true
rg "#[0-9A-Fa-f]{3,8}|white/|text-white|bg-white|rgba\(|slate-" app components --glob '!app/globals.css' || true
```

If the second check returns matches, inspect and explain them.

## Manual QA Evidence

When reporting, include:

* What browser QA was performed
* Which pages were checked
* Which themes were checked
* Any issues found
* Any issues fixed
* Any issues deferred

If browser QA could not be completed, say so clearly.

## Acceptance Criteria

This work is complete when:

* System / Light / Dark can be selected in Settings.
* Theme selection applies immediately.
* Theme selection persists on refresh.
* System mode behaves as expected.
* Key pages are visually usable in light and dark mode.
* No severe contrast or broken-surface issues remain.
* No page redesign was performed.
* Any fixes are small and scoped.
* Full validation passes:

  npm test
  npx tsc --noEmit
  npm run lint

## Final Agent Response Format

When done, report back in this format:

### Summary

Briefly explain what was QA’d and fixed.

### Theme QA Results

Summarize System / Light / Dark behavior.

### Page QA Results

Summarize page checks in light and dark.

### Fixes Made

List any small fixes made.

### Files Changed

List every file changed with a short explanation.

### Validation

List commands run and results:

* `npm test`
* `npx tsc --noEmit`
* `npm run lint`
* focused checks

### Manual QA

List what was manually checked and what was not checked.

### Risks / Follow-Ups

List any known risks or follow-up work.

State the next recommended work order.
