# Work Order: Confirm Benefits UX Polish

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

---

## Recent Baseline Context

Recent first-run UX work has already been completed or queued:

* Work Order 1 polished landing/auth/theme chrome:

  * landing theme toggle
  * onboarding theme toggle
  * sign-in wrapper cleanup
  * unauthenticated dashboard flash fix
* Work Order 2 polished `/onboarding/build-your-lineup`:

  * removed subtitle
  * removed yellow search-result `Add` text
  * moved wallet count into `Your Wallet (#)`
  * replaced trash icon with circled X action language
  * added 0-trackable-benefit confirmation
  * renamed CTA to `Continue`

Before starting this work order, inspect current local state and preserve any completed Work Order 1 and Work Order 2 changes.

Do not regress:

* existing theme toggle behavior
* landing/auth routing behavior
* Build Your Lineup UX changes
* semantic theme token usage

---

## Goal

Improve `/onboarding/confirm-benefits` so the benefit-selection flow is clearer, defaults are smarter, required anniversary dates are easier to notice, and the layout stays stable.

This work order focuses only on the Confirm Benefits onboarding page.

Do not make changes to `/onboarding/build-your-lineup` or `/onboarding/success` in this work order unless strictly necessary because of a shared component dependency.

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

Use semantic theme tokens. Do not introduce hardcoded colors, old blue accents, new decorative blobs, or one-off page-specific visual systems.

The app uses Tailwind v4 CSS-first setup. Do not add old Tailwind v3-style config unless absolutely necessary.

If previous work introduced shared onboarding chrome or theme controls, preserve and reuse them. Do not regress theme toggle behavior.

---

## Current Issue

The `/onboarding/confirm-benefits` page works, but several UX details need cleanup:

1. The horizontal card list should be alphabetized.
2. Cards that need a required anniversary date should show an indicator in the horizontal card list.
3. All benefits should be selected by default.
4. The `Select all` action should dynamically become `Deselect All` when everything is selected.
5. The Select/Deselect All control should be aligned right.
6. The `Clear` button should be removed.
7. Anniversary-date requirements currently extend the page/container; they should scroll inside the existing content area instead.
8. Footer/status text should be removed.
9. The final CTA should stand freely by itself.
10. The final CTA should say `Finish`, not `Save Reminders`.

---

## Requirements

### 1. Alphabetize horizontal card list

On `/onboarding/confirm-benefits`, sort the horizontally listed cards alphabetically.

Requirements:

* Sort by the visible card display name.
* Preserve all existing active-card, benefit-selection, and anniversary-date behavior.
* Do not mutate source data in a way that breaks persistence.
* Ensure the initially selected card still resolves correctly after sorting.

---

### 2. Add required-anniversary-date warning indicator to card tabs

If a card requires an anniversary date before the user can continue, and that date is missing, show a small warning indicator next to that card’s name in the horizontal card list.

Requirements:

* Indicator should appear beside the relevant card name/tab.
* Indicator should be visible even when that card is not currently active.
* Indicator should match the orange/warning tone already used by `Anniversary date needed`.
* Use semantic warning tokens if available.
* Do not hardcode a one-off orange value.
* The goal is to help users notice which card tab needs attention.
* Preserve accessible labeling where practical. For example, screen readers should be able to understand that the card needs an anniversary date.

Implementation guidance:

* Inspect existing anniversary-date validation logic.
* Reuse the same condition that currently blocks continuing.
* Do not create a second divergent validation rule.

---

### 3. Ensure all benefits are selected by default

All benefits should be selected by default when the user reaches confirm-benefits.

Requirements:

* Verify current default behavior before changing it.
* If not all benefits are currently selected by default, update the initialization logic carefully.
* Do not break within-session user choices. If a user deselects a benefit, it should remain deselected during that session unless they use Select/Deselect All.
* Do not reselect benefits unexpectedly on unrelated re-render.
* Preserve existing persistence behavior when the user finishes.

Implementation guidance:

* Look for state initialization around selected benefits.
* Be careful with effects that recompute selected IDs from fetched data.

---

### 4. Make Select/Deselect All dynamic

Replace the static `Select all` behavior with a dynamic button.

Requirements:

* If all benefits for the active card are selected, button label should be:

```text
Deselect All
```

* If fewer than all benefits for the active card are selected, button label should be:

```text
Select All
```

* Clicking `Deselect All` should deselect all benefits for the active card.
* Clicking `Select All` should select all benefits for the active card.
* Preserve existing disabled states if there are no benefits.
* Use exact capitalization:

  * `Select All`
  * `Deselect All`

---

### 5. Align Select/Deselect All button right

Move the dynamic Select/Deselect All control to the right side of its row/header area.

Requirements:

* Remove or adjust left-aligned placement.
* Keep the layout clean and balanced.
* Do not redesign the whole page.
* Preserve responsive behavior.

---

### 6. Remove the Clear button entirely

Remove the `Clear` button from the confirm-benefits page.

Requirements:

* Remove the visible button.
* Remove unused handlers/imports/state only if they become unused.
* Confirm with `rg` or TypeScript/lint before deleting code.
* Do not remove Select/Deselect All functionality.

---

### 7. Make anniversary-date section scroll inside existing area

The requirement for a credit card anniversary date currently extends the page/container.

It should not extend the page.

Expected behavior:

* The main content area should remain stable.
* Additional anniversary-date UI should live inside the same scrollable area that already handles long benefit lists.
* Switching between a card with fewer benefits and a card with more benefits should not cause the main box/page to jump or extend.
* This should behave similarly to how Amex Business Platinum with fewer benefits and Amex Platinum with more benefits currently scroll inside the content area.

Requirements:

* Keep validation behavior intact.
* Do not hide the anniversary-date requirement.
* Do not make the date input difficult to discover.
* Preserve keyboard accessibility.
* Avoid fixed pixel hacks unless necessary.
* Prefer using existing layout/scroll containers.

---

### 8. Remove footer/status helper text

Remove this footer/status text entirely:

```text
x benefits selected across y cards
Add the required card anniversary date to continue.
Ready to save your reminders.
```

Requirements:

* Remove the text from the UI.
* Remove any now-unused helper calculations only if safe.
* Do not remove actual validation that prevents finishing when required anniversary dates are missing.

---

### 9. Make final CTA stand freely

The final CTA should live freely by itself, visually similar to the `Continue` button from the previous onboarding page.

Requirements:

* It should not be trapped in or visually dependent on the removed footer/status text area.
* Keep visual alignment consistent with the onboarding flow.
* Preserve disabled/loading behavior.
* Preserve validation behavior.

---

### 10. Rename final CTA to `Finish`

Change the final CTA text from:

```text
Save Reminders
```

to:

```text
Finish
```

Requirements:

* Use exact text: `Finish`
* Preserve existing route/navigation behavior.
* Preserve existing save behavior.
* Preserve right arrow/caret if one exists and still fits the design.

---

## Files Likely Involved

Inspect before editing:

```bash
app/onboarding/confirm-benefits/page.tsx
app/onboarding/confirm-benefits/components/*
components/onboarding/*
components/ui/*
lib/benefits/*
lib/cards/*
```

Use `rg` to find actual component names and logic.

Useful searches:

```bash
rg "Select all|Select All|Deselect All|Clear|Save Reminders|Ready to save|benefits selected across|Anniversary date needed|Finish" app components lib
rg "confirm-benefits|ConfirmBenefits|anniversary|anniversary date|required" app components lib
rg "selectedBenefits|selectedBenefit|selectedBenefitIds|benefitIds|activeCard|cards" app/onboarding components lib
```

---

## Out of Scope

Do not include these changes in this work order:

* Landing page changes
* Auth redirect flash fixes
* `/onboarding/build-your-lineup` changes
* `/onboarding/success` reminder opt-in redesign
* dashboard/home changes
* benefits page changes
* backend digest/reminder changes
* database schema changes
* broad UI redesign
* new card data model work

Those will be handled in separate work orders.

---

## Acceptance Criteria

* Horizontal card list is alphabetical.
* Cards missing required anniversary dates show a clear warning indicator in the card list/tab.
* Indicator uses semantic warning styling and no hardcoded one-off colors.
* Benefits default to selected.
* User deselections persist during the current session.
* Button dynamically switches between `Deselect All` and `Select All`.
* Select/Deselect button is right-aligned.
* Clear button is removed.
* Anniversary-date requirements do not expand the page/container.
* Anniversary-date UI scrolls inside the existing content area like longer benefit lists do.
* Footer/status helper text no longer appears.
* Final CTA says `Finish`.
* Final CTA visually stands alone like the previous page’s `Continue` button.
* Existing validation still prevents continuing when required anniversary dates are missing.
* Existing persistence behavior remains intact.
* Existing theme toggle/onboarding chrome behavior remains intact.
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
rg "Select all|Select All|Deselect All|Clear|Save Reminders|Ready to save|benefits selected across|Anniversary date needed|Finish" app components lib
rg "confirm-benefits|ConfirmBenefits|anniversary|anniversary date|required" app components lib
rg "selectedBenefits|selectedBenefit|selectedBenefitIds|benefitIds|activeCard|cards" app/onboarding components lib
```

Do not commit unless the user explicitly tells you to.

---

## Agentic Development Process

Use the project’s agentic development process, but keep it scoped.

For this work order, run the equivalent of these agent passes:

### 1. Discovery / Context pass

* Read this work order.
* Inspect the Confirm Benefits page and related components.
* Inspect current benefit-selection initialization.
* Inspect current anniversary-date validation logic.
* Inspect current scroll/layout containers.
* Identify the smallest safe implementation plan.
* Confirm likely files to change before editing.

### 2. Implementation pass

* Make changes directly in the current repo.
* Do not create branches, worktrees, hidden folders, or alternate repo copies.
* Keep changes narrowly scoped to `/onboarding/confirm-benefits`.
* Reuse existing components/patterns where practical.

### 3. QA / Validation pass

* Review changed files for regressions.
* Run required validation commands.
* Run targeted `rg` searches listed above.
* Report any remaining risks or follow-ups.

Do not run unrelated agents unless discovery finds a real need.

---

## Final Report Format

When complete, report:

1. Agent-pass summary:

   * Discovery
   * Implementation
   * QA
2. What changed.
3. Files changed.
4. Validation results.
5. Any issues or tradeoffs.
6. Whether any follow-up work is recommended.
