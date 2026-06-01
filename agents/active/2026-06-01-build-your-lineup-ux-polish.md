# Work Order: Build Your Lineup UX Polish

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

Latest known work order baseline:

```text
2b6e91d Add landing auth theme chrome work order
```

Note: Work Order 1 may have been implemented after this baseline. Before starting this work order, inspect current local state carefully and preserve any completed Work Order 1 changes.

---

## Goal

Clean up `/onboarding/build-your-lineup` so the card-selection page feels simpler, less boxed-in, and more consistent with the rest of Memento’s first-run UX.

This work order focuses only on the Build Your Lineup page.

Do not make changes to `/onboarding/confirm-benefits` or `/onboarding/success` in this work order unless strictly necessary because of a shared component dependency.

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

If Work Order 1 introduced shared landing/onboarding theme chrome, preserve and reuse it. Do not regress the theme toggle behavior.

---

## Current Issue

The `/onboarding/build-your-lineup` page works, but it has several UX details that feel too noisy or inconsistent:

1. The subtitle “Select the cards in your wallet to begin tracking.” is unnecessary.
2. Search results show yellow “Add” text even though clicking the row is intuitive enough.
3. The selected-card count currently appears in a top-right bento/card box.
4. The wallet title should carry the count instead, like `Your Wallet (3)`.
5. The remove action currently uses a trash can, but the rest of the app uses a circled X action language for removal/do-not-track style interactions.
6. Adding a card with 0 trackable benefits should require explicit confirmation.
7. The bottom CTA should simply say `Continue`, not `Continue to reminders`.

---

## Requirements

### 1. Remove subtitle text

On `/onboarding/build-your-lineup`, remove this text entirely:

```text
Select the cards in your wallet to begin tracking.
```

Requirements:

* Remove the text, not just visually hide it.
* Move content up if applicable.
* Do not redesign the full page.

---

### 2. Remove yellow `Add` text from search results

When typing in the search box and card results appear, remove the yellow `Add` text on the right side of each result.

Requirements:

* The search result row/card should remain clickable.
* Preserve keyboard/focus/accessibility behavior.
* Do not remove the ability to add a card.
* Do not replace it with another noisy affordance unless necessary.
* Clicking the row should remain the primary add action.

---

### 3. Move selected-card count into `Your Wallet (#)`

Remove the top-right bento/card count box showing the number of selected cards.

Instead, show the count inline in the wallet section title.

Example:

```text
Your Wallet (3)
```

Requirements:

* The count should update dynamically as cards are added.
* The count should update dynamically as cards are removed.
* If there are zero cards, use:

```text
Your Wallet (0)
```

* Do not leave the old top-right count box in place.
* Preserve layout balance after removing the count box.

---

### 4. Replace trash icon with circled X action

For removing a card from the selected wallet list, replace the trash can icon with the circled X icon/action style used on Dashboard/Home and Benefits.

Requirements:

* Use the same or closely matching visual action language already used elsewhere.
* Preserve accessible label text, for example `Remove card` or more specific if already present.
* Use semantic tokens.
* Do not introduce hardcoded colors.
* Do not change the remove-card behavior.

Implementation guidance:

* Inspect Home/Benefits row action components for the existing circled X icon/action style.
* Reuse the same icon from the existing icon library if available.
* Keep this page visually consistent with the app’s existing action language.

---

### 5. Confirm before adding a card with 0 trackable benefits

When the user selects a card from search results and that card has 0 trackable benefits, do not add it immediately.

Instead, show a confirmation message explaining that Memento does not currently have trackable benefits for this card and asking whether the user still wants to track it.

Suggested message direction:

```text
Memento does not currently have trackable benefits for this card. Do you still want to add it to your wallet?
```

Requirements:

* Only show this confirmation for cards with 0 trackable benefits.
* If the user confirms, add the card.
* If the user cancels, do not add the card.
* Keep the flow lightweight and premium.
* Reuse existing modal/dialog primitives if available.
* Preserve accessibility behavior.
* Do not change backend logic unless absolutely necessary.
* Do not block cards with 0 benefits entirely; the user may still choose to track them.

Implementation notes:

* Inspect the card object/data shape to determine the safest way to detect `0 trackable benefits`.
* Do not guess field names without inspecting the current implementation.
* If trackable benefit count is not already present in the search result data, trace where card-benefit relationships are loaded before introducing new fetching.
* Prefer using already-available data over adding unnecessary backend/API changes.

---

### 6. Rename bottom CTA to `Continue`

Change the bottom CTA text from:

```text
Continue to reminders
```

to:

```text
Continue
```

Requirements:

* Keep the right caret/arrow.
* Preserve existing navigation behavior.
* Do not change what page it routes to.
* Do not change validation/disabled logic.

---

## Files Likely Involved

Inspect before editing:

```bash
app/onboarding/build-your-lineup/page.tsx
components/onboarding/*
components/ui/*
components/home/*
components/benefits/*
lib/cards/*
lib/benefits/*
```

Use `rg` to find actual component names and logic.

Useful searches:

```bash
rg "Continue to reminders|Select the cards in your wallet|Your Wallet|Add|trackable benefits|trash|Trash|Remove" app components lib
rg "build-your-lineup|BuildYourLineup|wallet" app components lib
rg "CircleX|XCircle|Trash|Trash2|Do not track|Start tracking" app components
```

---

## Out of Scope

Do not include these changes in this work order:

* Landing page theme toggle changes
* Auth redirect flash fixes
* `/onboarding/confirm-benefits` changes
* Card tab sorting
* anniversary date warning icons
* select/deselect all changes
* success page reminder opt-in redesign
* dashboard/home changes
* benefits page changes
* backend digest/reminder changes
* database schema changes
* broad UI redesign

Those will be handled in separate work orders.

---

## Acceptance Criteria

* Subtitle text is removed.
* Search results no longer show yellow `Add` text.
* Search result rows remain clickable and accessible.
* Old top-right selected-card count bento/card is removed.
* Wallet title displays dynamic count as `Your Wallet (#)`.
* Count updates correctly when cards are added and removed.
* Remove-card action uses circled X visual language instead of a trash can.
* Adding a card with 0 trackable benefits triggers a confirmation prompt.
* Confirming the 0-benefit prompt adds the card.
* Canceling the 0-benefit prompt does not add the card.
* CTA says `Continue` and keeps the right arrow/caret.
* Existing navigation and validation behavior remains intact.
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
rg "Continue to reminders|Select the cards in your wallet|Your Wallet|Add|trackable benefits" app components lib
rg "Trash|Trash2|CircleX|XCircle|Remove" app/onboarding components/onboarding components/home components/benefits
rg "build-your-lineup|BuildYourLineup" app components lib
```

Do not commit unless the user explicitly tells you to.

---

## Agentic Development Process

Use the project’s agentic development process, but keep it scoped.

For this work order, run the equivalent of these agent passes:

### 1. Discovery / Context pass

* Read this work order.
* Inspect the Build Your Lineup page and related components.
* Inspect existing Home/Benefits action icon patterns.
* Inspect card search data shape and whether trackable benefit count is available.
* Identify the smallest safe implementation plan.
* Confirm likely files to change before editing.

### 2. Implementation pass

* Make changes directly in the current repo.
* Do not create branches, worktrees, hidden folders, or alternate repo copies.
* Keep changes narrowly scoped to `/onboarding/build-your-lineup`.
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
