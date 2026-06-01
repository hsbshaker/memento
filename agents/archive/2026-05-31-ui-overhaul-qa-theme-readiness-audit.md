# Work Order: UI Overhaul QA + Theme Readiness Audit

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
* The only worktree is the main repo
* There are no unexpected local changes

This is a QA/discovery audit task.

Do not make app code changes.

Do not redesign pages.

Do not add a light/dark mode toggle.

Do not commit anything unless explicitly instructed by the product owner.

## Objective

Audit the completed UI overhaul and determine whether Memento is ready for light/dark theme toggle implementation.

The 7-part UI overhaul sequence is complete:

1. Define Memento Visual Direction + Theme Rules
2. Build Theme Token Foundation
3. Map Tokens Into Tailwind v4 Utilities
4. Refactor Shared UI Primitives
5. Overhaul App Shell + Home/Dashboard
6. Overhaul Wallet + Benefits + Settings
7. Overhaul Landing + Auth + Onboarding

This work order verifies that the overhaul actually holds together end-to-end before we build theme toggles.

The goal is to answer:

1. Does the full product now feel visually consistent?
2. Are all major pages using the semantic token system?
3. Is light mode reasonably ready?
4. Are there remaining hardcoded/dark-only styles that would break a theme toggle?
5. What cleanup is needed before implementing light/dark toggle infrastructure?

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

The app now has:

* A semantic theme token foundation in `app/globals.css`
* Token usage documentation
* Tokenized shared UI primitives
* Tokenized authenticated app surfaces
* Tokenized public/auth/onboarding surfaces
* A working MVP loop with email reminder opt-in and monthly email reminders

## Design Direction Sources

Use these documents as the source of truth:

```
docs/design/memento-visual-direction.md
docs/design/theme-token-usage.md
```

Use the completed product surfaces as reference.

Memento should feel like a premium fintech dashboard or card concierge, not a generic SaaS template.

## Scope

In scope:

* Audit the full app’s visual consistency
* Audit light-mode readiness
* Audit dark-mode readiness
* Audit remaining hardcoded colors and dark-only styling
* Audit semantic token usage
* Audit dead code flagged during WO5–WO7
* Audit page-by-page consistency
* Audit mobile/desktop readiness where possible
* Produce a punch list before light/dark toggle implementation
* Recommend the next work order

Out of scope:

* Implementing theme toggles
* Changing CSS tokens
* Refactoring components
* Redesigning pages
* Deleting files
* Adding new features
* Changing app behavior
* Changing routing/auth/database/email behavior
* Creating `tailwind.config.ts`
* Committing changes

If a serious issue is found, report it clearly and recommend a follow-up work order instead of fixing it.

## Files and Areas to Inspect

Inspect these core areas:

### Theme / Design System

* `app/globals.css`
* `docs/design/memento-visual-direction.md`
* `docs/design/theme-token-usage.md`
* `AGENTS.md`
* `components/ui/`

### Authenticated App

* `components/app/`
* `components/home/`
* `app/home/`
* `components/wallet/`
* `app/wallet/`
* `components/benefits/`
* `app/benefits/`
* `components/settings/`
* `app/settings/`

### Public / Onboarding / Auth

* `app/page.tsx`
* `components/landing/`
* `app/auth/`
* `app/onboarding/`

### Known Dead-Code Areas

During the overhaul, these dead or orphaned areas were flagged:

* Old wallet add-card/card-detail subtrees removed in prior cleanup
* Onboarding `WalletBuilder` subtree flagged after WO7:

  * `wallet-builder.tsx`
  * `card-results-list.tsx`
  * `submit-button.tsx`

Verify whether any flagged dead files still exist and whether they are imported anywhere.

## Audit Questions

Answer each question clearly with file/component evidence.

### 1. Full Product Consistency

* Do Landing, Auth, Onboarding, Home, Wallet, Benefits, and Settings now feel like one product?
* Are backgrounds, surfaces, borders, typography, buttons, and accents consistent?
* Are there any pages that still feel stale, old, or disconnected?

### 2. Token System Coverage

* Are major live files using semantic token classes?
* Are there remaining hardcoded color systems?
* Are there remaining raw `white/` opacity systems?
* Are there remaining inline `--background` / `--foreground` overrides?
* Are remaining hardcoded values isolated to dead code or legitimate exceptions?

### 3. Light Mode Readiness

* Does the app currently render in light mode through `prefers-color-scheme`?
* Which pages are most likely to break visually in light mode?
* Are text/surface/border contrasts likely acceptable?
* Does landing being theme-adaptive introduce any obvious visual risk?
* Are any pages still hard-forced to dark styling?

### 4. Dark Mode Readiness

* Does dark mode remain coherent after the overhaul?
* Did any pages lose useful contrast?
* Is gold accent usage restrained?
* Are surfaces distinguishable without relying on glows?

### 5. Theme Toggle Readiness

* Is the token structure ready to switch from `@media (prefers-color-scheme: dark)` to a class-based `.dark` selector?
* What files would need to change to implement a toggle?
* Is a Settings theme control the right first UI entry point?
* Should the toggle support Light / Dark / System?
* What should the default be?

### 6. Remaining Dead Code

* Do any known dead files still exist?
* Are they imported anywhere?
* Should they be deleted before the toggle work?
* Are there any new dead-code findings from the audit?

### 7. Mobile / Responsive Risks

* Which pages need manual mobile QA before calling the overhaul done?
* Are any layouts likely too dense on mobile after the visual changes?
* Are row actions/tabs/search controls still usable?

### 8. Accessibility Risks

* Are focus states consistently using `ring-focus`?
* Do icon-only buttons still have labels?
* Are status indicators text-backed and not color-only?
* Are any low-contrast token combinations likely risky?

## Required Repo Checks

Run these checks and summarize results.

### Validation

```
npm test
npx tsc --noEmit
npm run lint
```

### Whole-Repo Hardcoded Color Checks

Run:

```
grep -R "#[0-9A-Fa-f]\{3,8\}" app components lib docs --exclude-dir=node_modules --exclude-dir=.next || true
grep -R "white/" app components lib docs --exclude-dir=node_modules --exclude-dir=.next || true
grep -R "black" app components lib docs --exclude-dir=node_modules --exclude-dir=.next || true
grep -R "slate-" app components lib docs --exclude-dir=node_modules --exclude-dir=.next || true
grep -R "--background" app components --exclude-dir=node_modules --exclude-dir=.next || true
grep -R "--foreground" app components --exclude-dir=node_modules --exclude-dir=.next || true
```

Watch for false positives such as `translate-` matching `slate-`.

### Dead-Code Checks

Run targeted searches for any flagged dead files still present.

If the onboarding WalletBuilder files exist, check whether anything imports them.

Suggested patterns:

```
grep -R "wallet-builder" app components lib --exclude-dir=node_modules --exclude-dir=.next || true
grep -R "WalletBuilder" app components lib --exclude-dir=node_modules --exclude-dir=.next || true
grep -R "card-results-list" app components lib --exclude-dir=node_modules --exclude-dir=.next || true
grep -R "CardResultsList" app components lib --exclude-dir=node_modules --exclude-dir=.next || true
grep -R "submit-button" app components lib --exclude-dir=node_modules --exclude-dir=.next || true
```

## Manual Browser QA Guidance

If browser QA is available, check:

### Landing

* Desktop
* Mobile
* Light mode via system/browser
* Dark mode via system/browser
* Primary CTA
* Sign-in CTA
* Final CTA

### Auth

* Sign-in flow
* Auth complete/recovery page
* Error/retry state if reachable

### Onboarding

* Benefits intro
* Build your lineup
* Card search/select/remove
* Confirm benefits
* Loading state if practical
* Success page
* Reminder opt-in

### Authenticated App

* Home dashboard
* Wallet
* Add-card modal
* Wallet card drawer
* Benefits
* Benefits filters/tabs/actions
* Settings
* Email reminder toggle

If manual browser QA was not run, say so clearly and provide a manual QA checklist.

## Expected Output

Produce a clear audit report with these sections.

### Summary

One paragraph: is the UI overhaul complete enough to proceed to theme toggle infrastructure?

### Pass / Fail Decision

State one of:

* Pass — ready for theme toggle work
* Pass with cleanup first
* Fail — major UI/theme issues remain

Be direct.

### Full Product Consistency

Summarize consistency across major page groups.

### Light Mode Readiness

State whether light mode appears ready enough for toggle infrastructure.

List known risks.

### Dark Mode Readiness

State whether dark mode remains coherent.

List known risks.

### Token Compliance

Summarize grep findings.

Separate:

* live-code issues
* dead-code issues
* false positives
* acceptable exceptions

### Dead Code Findings

List any confirmed dead files or directories.

Recommend whether to delete before WO9.

### Theme Toggle Readiness

Explain what needs to change to add Light / Dark / System support.

Mention likely files and architecture.

### Manual QA

State what was manually checked and what was not checked.

### Recommended Cleanup Before Toggle

List any cleanup that should happen before WO9.

Keep this list short and ranked.

### Recommended Next Work Order

Recommend the next work order.

Likely options:

* Remove Remaining Dead Onboarding Components
* Add Light/Dark Theme Toggle Infrastructure
* Light Mode Polish Pass

## Acceptance Criteria

This work is complete when:

* Validation commands run cleanly
* Whole-repo hardcoded color checks are summarized
* Dead-code checks are summarized
* Theme toggle readiness is assessed
* A clear pass/fail decision is given
* A short ranked cleanup list is provided
* No app code is changed

## Final Agent Response Format

When done, report back in this format:

### Summary

Briefly explain what was audited.

### Decision

Pass / Pass with cleanup first / Fail.

### Evidence

Summarize key evidence.

### Validation

List commands run and results.

### Risks / Follow-Ups

List the ranked next actions.

### Files Changed

Say:

No files changed.
