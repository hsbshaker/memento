# Work Order: Overhaul App Shell + Home/Dashboard

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

Overhaul the authenticated app shell and Home/Dashboard experience so this becomes the visual anchor for the rest of Memento.

This is WO5 in the UI overhaul sequence.

The token foundation and shared UI primitives are now ready. This work order should apply that system to the highest-value authenticated surface: the app shell and home dashboard.

The goal is for Home to feel premium, calm, obvious, and action-oriented.

## Product Context

Memento is a premium credit card benefits tracker focused on helping users capture “use it or lose it” value from their cards.

The core MVP loop works:

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

The home dashboard must instantly answer:

1. What value do I have?
2. What is expiring soon?
3. What should I do next?

## UI Overhaul Sequence

This is WO5.

The sequence is:

1. Define Memento Visual Direction + Theme Rules
2. Build Theme Token Foundation
3. Map Tokens Into Tailwind v4 Utilities
4. Refactor Shared UI Primitives
5. Overhaul App Shell + Home/Dashboard
6. Overhaul Wallet + Benefits + Settings
7. Overhaul Landing + Auth + Onboarding

Do not jump ahead to WO6 or WO7.

## Design Direction Sources

Use these documents as the source of truth:

```
docs/design/memento-visual-direction.md
docs/design/theme-token-usage.md
```

Use the semantic tokens and shared primitives created in prior work.

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

* Bubbly bento-box styling
* Random glowing blobs
* Noisy gradients
* Hardcoded colors
* Raw `white/` opacity classes
* Page-specific visual systems
* Multiple competing accent colors
* Decorative effects that do not serve the user
* Redesigning by adding more visual clutter

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

## Scope

In scope:

* Authenticated app shell/nav visual cleanup
* Home page background and layout consistency
* Home hero metric section
* Home tab/timeframe controls
* Home benefit row visual treatment
* Row urgency badges visual treatment
* Row inline action button visual treatment
* Undo toast integration if needed visually
* Empty wallet state on Home
* All-caught-up state on Home
* Home loading/error states if present and directly relevant
* Use semantic tokens from the theme system
* Remove hardcoded colors from touched Home/App Shell components
* Preserve existing functionality
* Run full validation

Out of scope:

* Wallet page overhaul
* Benefits page overhaul
* Settings page overhaul
* Landing page overhaul
* Auth page overhaul
* Onboarding page overhaul
* Adding new dashboard features
* Changing reminder email behavior
* Changing database/schema
* Adding a light/dark toggle
* Broad app-wide refactors
* Reworking routing/auth behavior
* Changing core benefit calculation logic
* Replacing every hardcoded color outside the scoped Home/App Shell files
* Reintroducing blobs/glows/bento boxes

## Files to Inspect

Inspect likely relevant files:

* `app/home/page.tsx`
* `app/home/loading.tsx`
* `app/home/error.tsx`
* `components/home/HomeScreen.tsx`
* `components/home/WalletHero.tsx`
* `components/home/HomeBenefitRows.tsx`
* `components/home/HomeBenefitRow.tsx`
* `components/home/HomeBenefitRowMenu.tsx` if still present/relevant
* `components/home/EmptyHomeState.tsx`
* `components/home/HomeAllCaughtUpState.tsx`
* `components/app/AppChrome.tsx`
* `components/app/AuthenticatedAppShell.tsx`
* `components/app/app-nav.ts`
* `components/ui/AppShell.tsx`
* `components/ui/Button.tsx`
* `components/ui/Surface.tsx`
* `components/ui/UndoToast.tsx`
* `components/ui/row-typography.ts`
* `lib/home/build-home-feed.ts`
* `lib/home/home-timeframes.ts`
* `lib/types/server-data.ts`

Only modify files needed for this work order.

## Current Home Experience Context

The current Home page includes:

* `WalletHero` with three stat cards:

  * Available
  * Coming up
  * Used this month
* `HomeBenefitRows` with:

  * Unused / Used / Not Tracked tabs
  * Timeframe selector
  * Benefit rows
* Inline row actions:

  * unused rows: mark used, do not track
  * used rows: mark unused
  * not-tracked rows: start tracking
* Undo toast with delayed API commit
* Urgency badges on unused rows:

  * Due today
  * Due soon
* Empty wallet state
* All-caught-up state

Prior dashboard audit found three priority gaps that were recently addressed functionally:

1. Mark as Used was hidden
2. No urgency signal at row level
3. All-caught-up state was a dead end after a reminder email

This work order should visually integrate those improvements into a premium, consistent Home experience.

## Visual Goals

### 1. App Shell

The authenticated shell should feel consistent and restrained.

Requirements:

* Use semantic theme tokens
* Align background with `bg-background`
* Avoid mixed dark blue/black styling
* Make nav feel like part of the same product as Home
* Make active nav state clear but not loud
* Avoid glowing nav treatments
* Preserve layout and routing behavior

### 2. Home Background

The Home page should have one coherent background system.

Requirements:

* Use `bg-background`
* Avoid page-specific black/blue backgrounds
* Avoid decorative blobs/glows
* Use subtle surfaces and borders for separation
* Preserve responsiveness

### 3. Hero Metrics

The hero metric area should answer “what value do I have?” clearly.

Requirements:

* Use semantic surfaces
* Reduce visual clutter
* Make labels intuitive
* Make numbers easy to scan
* Use accent sparingly
* Avoid bento-box clutter
* Keep the three metrics if they are useful, but improve hierarchy and clarity

Questions to consider:

* Are “Available,” “Coming up,” and “Used this month” still the right labels?
* Should helper copy be tightened?
* Is the metric display visually calm?
* Does the section feel premium or like generic SaaS cards?

### 4. Tabs and Timeframe Controls

Tabs and timeframe controls should be clear but not dominate the page.

Requirements:

* Use semantic tokens
* Clear active/inactive states
* Avoid raw opacity scales
* Avoid overly pillowy/bubbly styling
* Make the selected timeframe obvious
* Preserve behavior

### 5. Benefit Rows

Rows are the main action surface.

Requirements:

* Use semantic token classes
* Make benefit name, card name, value, deadline, and action hierarchy clear
* Keep row density efficient
* Preserve inline action buttons
* Preserve undo behavior
* Make row hover/action states polished but restrained
* Urgency badges should feel semantic, not decorative
* Avoid noisy borders or glow effects

### 6. Row Actions

Inline row actions should feel clear and premium.

Requirements:

* Check/X/Plus actions remain direct and discoverable
* Icons should not look cheap or overly bubbly
* Hover tooltips should still work
* Focus states should use `ring-focus`
* Destructive or opt-out actions should be restrained, not alarming unless needed

### 7. Empty Wallet State

Fresh empty Home state should be simple and motivating.

Requirements:

* Explain what to do next
* Primary action should be obvious
* Use premium spacing/surface treatment
* Avoid overdesigned illustration/card clutter

### 8. All-Caught-Up State

All-caught-up state should not be a dead end.

Requirements:

* Reassure the user
* Explain what the current timeframe/tab means
* Offer a sensible next action if applicable, such as adjusting timeframe or viewing all benefits
* Do not make it feel like the app is empty or broken

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

Do not introduce new raw hex colors.

Do not introduce new color systems.

If a hardcoded color remains in a touched file, explain why.

## Behavioral Requirements

Preserve existing behavior.

Do not break:

* auth gating
* Home feed loading
* tab switching
* timeframe switching
* row actions
* undo timing
* API calls
* optimistic updates
* empty state CTA
* routing
* accessibility labels
* keyboard/focus behavior
* responsive behavior

If behavior changes are needed to support the visual overhaul, keep them minimal and explain them.

## Responsive Requirements

The Home experience must remain usable on:

* mobile
* tablet
* desktop

Pay special attention to:

* metric cards stacking
* benefit row density
* inline row actions on small screens
* tab/timeframe wrapping
* toast position
* nav usability

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

Urgency should not rely only on color. Text like “Due soon” or “Due today” should remain visible.

## Acceptance Criteria

This work is complete when:

* App shell/nav and Home/Dashboard visually align with the new token system
* Touched Home/App Shell files use semantic theme utilities where practical
* The dashboard feels more premium, calm, and consistent
* The Home page clearly surfaces value, urgency, and next actions
* Inline row actions and undo behavior are preserved
* Empty and all-caught-up states are not dead ends
* No unrelated pages are redesigned
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

Also run focused checks against touched Home/App Shell files for hardcoded color usage.

Suggested checks:

```
grep -R "#[0-9A-Fa-f]\{3,8\}" components/home components/app app/home || true
grep -R "white/" components/home components/app app/home || true
grep -R "black" components/home components/app app/home || true
grep -R "slate-" components/home components/app app/home || true
```

If matches remain for legitimate reasons, explain them.

## Manual QA Checklist

After implementation, manually check:

* Fresh Home dashboard with a user who has unused benefits
* Home dashboard with urgency badges
* Mark used action
* Do not track action
* Start tracking action
* Undo toast
* Used tab
* Not Tracked tab
* Empty wallet state
* All-caught-up state
* Mobile width
* Desktop width

If manual QA was not run, say so clearly.

## Final Agent Response Format

When done, report back in this format:

### Summary

Briefly explain what changed.

### Visual Direction Applied

Summarize how the app shell and Home now align to the design direction.

### Files Changed

List every file changed with a short explanation.

### Behavior Preservation

State whether core Home behavior was preserved.

### Token Compliance

Summarize remaining hardcoded color or raw opacity usage in touched files.

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
