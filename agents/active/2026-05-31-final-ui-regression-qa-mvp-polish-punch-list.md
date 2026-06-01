# Work Order: Final UI Regression QA + MVP Polish Punch List

## Status

Active

## Agent Role

QA Agent / Discovery Agent

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

Perform the final UI regression QA pass for the Memento UI overhaul and produce an MVP polish punch list.

This work order should determine whether the UI overhaul phase can be closed.

The goal is to review the product end to end after the completed theme, typography, and page-level overhaul work, then identify any remaining visual or UX polish issues that should be fixed before MVP launch.

This is primarily a QA/discovery task.

Do not start another redesign.

Do not implement broad visual changes.

Do not add new features.

## Product Context

Memento is a premium credit card benefits tracker focused on helping users capture “use it or lose it” value from their cards.

Core product constraints:

* No bank login
* No Plaid
* No card numbers
* No transaction scraping
* Users manually add cards
* System preloads known benefits
* Users confirm which benefits apply to them

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

## UI Overhaul Context

The UI overhaul phase included:

1. Visual direction and theme rules
2. Semantic theme token foundation
3. Tailwind v4 token utility mapping
4. Shared UI primitive refactor
5. App shell + Home/Dashboard overhaul
6. Wallet + Benefits + Settings overhaul
7. Landing + Auth + Onboarding overhaul
8. Theme readiness cleanup
9. Light / Dark / System theme toggle infrastructure
10. Light-mode polish pass
11. Geist typography and type-scale cleanup

This work order is the final regression QA pass for that whole sequence.

## Design Direction Sources

Use these documents as the source of truth:

```
docs/design/memento-visual-direction.md
docs/design/theme-token-usage.md
```

Memento should feel like a premium fintech dashboard or card concierge.

Avoid:

* Bubbly bento-box styling
* Random glowing blobs
* Noisy gradients
* Hardcoded colors
* Raw `white/` opacity styling
* Generic SaaS template visuals
* Page-specific color systems
* Multiple competing button styles
* Overly rounded chunky containers
* Layout redesigns during QA

Prefer:

* Semantic theme utilities
* Clear hierarchy
* Crisp surfaces
* Restrained accent usage
* Consistent typography
* Light/dark readiness
* Minimal decoration
* Direct, obvious actions

## Scope

In scope:

* Full browser QA across major pages
* Light / Dark / System theme QA
* Mobile and desktop visual QA
* Fresh-user flow QA
* Returning-user flow QA
* Authenticated app visual consistency QA
* Landing/Auth/Onboarding visual consistency QA
* Settings theme toggle QA
* Email reminder opt-in UI QA
* Row actions and undo toast UI QA
* Identify MVP-blocking polish issues
* Identify non-blocking deferred polish items
* Make only tiny obvious fixes if explicitly safe and scoped
* Produce a final punch list

Out of scope:

* Broad redesigns
* New feature development
* Major layout changes
* Theme architecture changes
* Typography overhaul beyond tiny fixes
* Database/schema changes
* Email reminder backend changes
* Benefit calculation changes
* Refactoring large components
* Creating new design systems
* Adding Tailwind config
* Reworking routing/auth logic

If a problem requires more than a tiny fix, report it as a punch-list item instead of fixing it.

## Files / Areas to Inspect

Inspect as needed:

### Theme / Global

* `app/globals.css`
* `app/layout.tsx`
* `lib/theme/theme-preference.ts`
* `docs/design/memento-visual-direction.md`
* `docs/design/theme-token-usage.md`

### Shared UI

* `components/ui/`
* `components/app/`
* `components/app-header.tsx`

### Public / Auth

* `app/page.tsx`
* `components/landing/`
* `app/auth/`

### Onboarding

* `app/onboarding/benefits/`
* `app/onboarding/build-your-lineup/`
* `app/onboarding/confirm-benefits/`
* `app/onboarding/success/`

### Authenticated App

* `app/home/`
* `components/home/`
* `app/wallet/`
* `components/wallet/`
* `app/benefits/`
* `components/benefits/`
* `app/settings/`
* `components/settings/`

## QA Pass Requirements

### 1. Theme Toggle QA

Verify:

* System mode is default.
* Light can be selected in Settings.
* Dark can be selected in Settings.
* System can be selected in Settings.
* Theme applies immediately.
* Theme persists after refresh.
* System mode follows OS/browser preference.
* No visible flash of wrong theme on reload, as much as practical.
* `localStorage.getItem("memento-theme")` reflects the selected value.
* `<html>` has expected `data-theme` behavior.

### 2. Landing QA

Check in Light and Dark:

* Landing page desktop
* Landing page mobile
* Hero section
* Dashboard mockup
* Primary CTA
* Sign-in CTA
* How it works section
* Feature section
* Final CTA
* Ambient background/glow treatment

Look for:

* premium feel
* no washed-out text
* no excessive glow/blob styling
* consistent button styling
* responsive layout issues

### 3. Auth QA

Check in Light and Dark where reachable:

* `/auth/login`
* `/auth/complete`
* `/auth/error`
* auth recovery state if accessible
* header/nav treatment
* buttons and recovery CTAs

Look for:

* trustworthy feel
* readable text
* no dark-only styling
* no broken contrast

### 4. Onboarding QA

Check in Light and Dark:

* benefits intro page
* build-your-lineup search
* card select/remove
* confirm-benefits page
* confirm-benefits loading state if practical
* benefit confirmation cards
* anniversary prompt/date input if practical
* success page
* reminder opt-in prompt
* Go to dashboard CTA

Look for:

* consistent row/card treatment
* readable labels
* clear selected/confirmed states
* mobile density issues
* no stale design remnants

### 5. Home QA

Check in Light and Dark:

* dashboard hero metrics
* tabs/timeframe controls
* unused benefits rows
* used tab
* not-tracked tab
* urgency badges
* row action icons
* undo toast
* empty wallet state
* all-caught-up state
* mobile width
* desktop width

Look for:

* good row/list hierarchy
* Home and Benefits row styles matching
* active nav clarity
* no flat white-on-white issue
* no dark-mode contrast regression

### 6. Wallet QA

Check in Light and Dark:

* wallet page with cards
* empty wallet state if practical
* wallet metrics
* add-card modal
* card drawer / detail panel
* remove card confirmation if practical
* mobile width
* desktop width

Look for:

* consistent surfaces
* modal/scrim contrast
* selected states
* readable card metadata

### 7. Benefits QA

Check in Light and Dark:

* benefits page
* filters/tabs
* benefit inventory rows
* row menu/actions
* tracked/used/not-tracked states
* empty states
* mobile width
* desktop width

Look for:

* consistent row/list language with Home
* readable metadata
* clear actions
* no visual mismatch with dashboard

### 8. Settings QA

Check in Light and Dark:

* account section
* email reminders toggle
* Appearance theme control
* sign-out action
* mobile width
* desktop width

Look for:

* clear selected theme state
* readable labels
* trustworthy minimal settings layout
* focus/keyboard accessibility

## Technical Checks

Run:

```
npm test
npx tsc --noEmit
npm run lint
```

Remember: this repo does not have `npm run typecheck`.

Run:

```
rg "memento-theme|data-theme|ThemePreference|ThemeSection" app components lib || true
rg "#[0-9A-Fa-f]{3,8}|white/|text-white|bg-white|rgba\(|slate-" app components --glob '!app/globals.css' || true
rg "Arial|Helvetica" app components || true
rg "text-\[[^]]+\]" app components || true
```

If matches return, inspect and classify:

* real issue
* false positive
* acceptable exception
* dead code

## Tiny Fix Policy

This work order may make tiny fixes only if all are true:

* the issue is obvious
* the fix is low risk
* the fix is scoped
* the fix does not redesign a page
* the fix does not change product behavior
* validation can be rerun cleanly

Examples of acceptable tiny fixes:

* one wrong token class
* one low-contrast label
* one inconsistent button size
* one broken focus state
* one stale class left from the overhaul
* one typo in visible UI copy

Examples of not acceptable in this work order:

* rebuilding a page
* changing layouts broadly
* changing token architecture
* redesigning landing
* rewriting onboarding
* building new features
* changing database/backend logic

## Expected Output

Produce a clear final QA report.

### Summary

State whether the UI overhaul phase is ready to close.

### Decision

Choose one:

* Pass — UI overhaul can close
* Pass with tiny fixes
* Pass with follow-up punch list
* Fail — blocking UI issues remain

Be direct.

### Browser QA Results

Summarize what was checked:

* pages
* themes
* viewport sizes
* flows

### Technical Validation

List command results:

* `npm test`
* `npx tsc --noEmit`
* `npm run lint`
* focused `rg` checks

### Issues Found

List all issues found, grouped by severity:

#### Blockers

Must fix before closing UI overhaul.

#### Important polish

Should fix soon, but not necessarily blocking.

#### Deferred polish

Can wait until after MVP readiness work.

### Tiny Fixes Made

If any tiny fixes were made, list:

* file
* issue
* fix
* why it was safe

If no fixes were made, say:

```
No files changed.
```

### MVP Polish Punch List

Create a ranked punch list with no more than 10 items.

Each item should include:

* title
* affected area
* severity: Blocker / Important / Deferred
* recommendation
* whether it needs its own work order

### Recommended Next Step

Recommend what should happen next after this UI overhaul phase.

Likely options:

* Close UI overhaul and move to production readiness
* Do one tiny cleanup work order
* Create MVP launch readiness checklist
* Create benefit catalog quality pass
* Create production env / cron / Resend readiness pass

## Acceptance Criteria

This work is complete when:

* Full UI has been reviewed as much as practical
* Light/Dark/System behavior has been checked
* Mobile/desktop has been considered
* Technical validation passes
* Punch list is ranked
* Clear close/no-close decision is given
* No broad redesign was performed

## Final Agent Response Format

When done, report back in this format:

### Summary

Briefly explain what was reviewed.

### Decision

Pass / Pass with tiny fixes / Pass with follow-up punch list / Fail.

### Browser QA Results

List pages/themes/viewports checked.

### Technical Validation

List command results.

### Issues Found

Grouped by Blockers / Important polish / Deferred polish.

### Tiny Fixes Made

List files changed or say no files changed.

### MVP Polish Punch List

Ranked list of up to 10 items.

### Recommended Next Step

State the next recommended work order or phase.
