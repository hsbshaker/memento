# Work Order: Apply Geist Typography and Type Scale Cleanup

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
* The working tree is clean
* The only worktree is the main repo
* There are no unexpected local changes

Do not commit unless explicitly instructed by the product owner.

## Objective

Apply Memento’s intended typography system by making Geist Sans the actual default app font and cleaning up the most visible arbitrary type sizes.

This is a typography/system polish work order, not a redesign.

The goal is to make the product feel more premium, disciplined, and consistent after the completed theme overhaul.

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

The UI theme overhaul is complete:

* Semantic theme tokens exist.
* Light / Dark / System theme toggle infrastructure exists.
* Light/dark polish pass has been completed.
* The app now needs typography polish.

## Design Direction Sources

Use these documents as the source of truth:

```
docs/design/memento-visual-direction.md
docs/design/theme-token-usage.md
```

The visual direction says Memento should feel like a premium fintech dashboard or card concierge, not a generic SaaS template.

Typography should support that:

* clean
* restrained
* precise
* readable
* structured
* not flashy

## Typography Decision

Use:

* **Geist Sans** as the default app font.
* **Geist Mono** selectively for small system labels, data labels, and maybe numeric/metric treatments where appropriate.

Do not introduce a new external font.

Do not add a new font package.

Do not use Inter, Satoshi, IBM Plex, or any other new font.

The goal is to make the already-loaded Geist fonts actually drive the app.

## Current Known Problem

Prior audit found:

* `app/globals.css` still forces:

  ```
  font-family: Arial, Helvetica, sans-serif;
  ```

* `app/layout.tsx` already loads Geist fonts, but the app may not consistently use them.

* Arbitrary font sizes are scattered across the app, including examples like:

  * `text-[9px]`
  * `text-[10px]`
  * `text-[11px]`
  * `text-[13.5px]`
  * `text-[17px]`
  * `text-[1.85rem]`
  * `text-[4.1rem]`

This hurts the premium feel and creates inconsistency across pages.

## Scope

In scope:

* Make Geist Sans the actual default app font.
* Remove or replace the stale Arial body rule.
* Preserve the existing Next/font setup if already present.
* Use Geist Mono selectively where it improves structured labels or numeric/system text.
* Audit arbitrary font sizes across visible UI files.
* Replace the most obvious arbitrary text sizes with Tailwind scale classes.
* Normalize common typography patterns:

  * page eyebrows
  * page titles
  * card titles
  * metric numbers
  * row names
  * row metadata labels
  * helper text
  * nav labels
  * button text
  * section labels
* Keep the visual hierarchy close to current layout.
* Run full validation.

Out of scope:

* Page redesigns
* Layout redesigns
* Theme/color token changes
* Light/dark toggle changes
* New product features
* New font packages
* Adding Tailwind config
* Broad spacing overhaul
* Copy rewrites unless a tiny label change is needed for typography clarity
* Changing database/schema/auth/email behavior
* Replacing every arbitrary font size in the entire repo if doing so creates risk

## Files to Inspect

Inspect likely relevant files:

### Global / App

* `app/layout.tsx`
* `app/globals.css`
* `components/app/AuthenticatedAppShell.tsx`
* `components/app-header.tsx`

### Shared UI

* `components/ui/Button.tsx`
* `components/ui/Surface.tsx`
* `components/ui/UndoToast.tsx`
* `components/ui/row-typography.ts`

### Home

* `components/home/WalletHero.tsx`
* `components/home/HomeScreen.tsx`
* `components/home/HomeBenefitRows.tsx`
* `components/home/HomeBenefitRow.tsx`
* `components/home/EmptyHomeState.tsx`
* `components/home/HomeAllCaughtUpState.tsx`

### Wallet / Benefits / Settings

* `components/wallet/`
* `components/benefits/`
* `components/settings/`

### Landing / Auth / Onboarding

* `components/landing/`
* `app/auth/`
* `app/onboarding/`

Only modify files necessary for typography cleanup.

## Typography Direction

### Geist Sans

Use Geist Sans as the primary UI font.

It should apply globally to normal app text, including:

* body copy
* navigation
* headings
* buttons
* forms
* rows
* modals
* settings

### Geist Mono

Use Geist Mono sparingly.

Good candidates:

* uppercase eyebrow labels like `DASHBOARD`, `BENEFITS`
* tiny metadata labels like `VALUE`, `RESETS`, `CADENCE`
* possibly tabular/numeric metric areas if it improves clarity
* system-like microcopy

Avoid using Geist Mono for large blocks of text or normal UI body text.

Too much mono will make Memento feel technical instead of premium.

## Type Scale Direction

Prefer Tailwind’s standard text scale over arbitrary values.

Use a compact, disciplined scale such as:

* `text-xs`
* `text-sm`
* `text-base`
* `text-lg`
* `text-xl`
* `text-2xl`
* `text-3xl`
* `text-4xl`
* `text-5xl`

Use arbitrary sizes only if there is a specific reason and explain it.

General direction:

* Page eyebrow labels: small, letter-spaced, possibly mono.
* Page titles: strong but not huge.
* Row titles: readable and consistent.
* Row secondary text: slightly smaller and muted.
* Metadata labels: small, uppercase, letter-spaced, consistent.
* Metric numbers: prominent, disciplined, not cartoonishly large.
* Buttons: consistent size and weight.

## Specific Cleanup Targets

### 1. Global font application

Make sure the app actually uses Geist Sans globally.

Likely actions:

* Remove `font-family: Arial, Helvetica, sans-serif;` from `app/globals.css`.
* Ensure body inherits the font variable from `app/layout.tsx`.
* If `app/layout.tsx` already applies Geist variables, preserve and use them.
* If needed, add the right `font-sans` usage at the body/root level.

Do not break existing font loading.

### 2. Shared row typography

Update `components/ui/row-typography.ts` if needed so row title, metadata, helper text, and labels follow a consistent scale.

Use semantic text colors already in place.

Do not change row behavior.

### 3. Metadata labels

Normalize small uppercase metadata labels like:

* `VALUE`
* `RESETS`
* `CADENCE`
* `AVAILABLE`
* `COMING UP`
* `USED THIS MONTH`

These should feel consistent across Home, Benefits, Wallet, and Settings.

Consider Geist Mono for this layer.

### 4. Hero / metric numbers

Review metric numbers in Home and Wallet.

They should feel premium and strong, but not oversized or arbitrary.

Replace arbitrary sizes where practical.

### 5. Navigation and buttons

Ensure nav labels and buttons use consistent size/weight.

Do not redesign nav.

Do not change active state colors.

### 6. Landing / onboarding headings

Where obvious, bring landing/onboarding heading sizes into the scale.

Do not redesign landing.

Do not rewrite landing copy.

Do not chase every single edge case in one pass.

## Guardrails

Do not turn this into a full redesign.

Do not make broad layout changes.

Do not change colors.

Do not change token values.

Do not introduce a new font.

Do not add `tailwind.config.ts`.

Do not introduce raw CSS font stacks except where required by Next/font setup.

Do not make the app feel overly technical by overusing mono.

Preserve dark mode and light mode.

## Validation

Run:

```
npm test
npx tsc --noEmit
npm run lint
```

Remember: this repo does not have `npm run typecheck`.

Also run focused checks:

```
rg "Arial|Helvetica" app components || true
rg "text-\[[^]]+\]" app components || true
rg "font-mono|font-sans|geist" app components lib || true
```

If arbitrary text sizes remain, summarize the remaining count and why they remain.

## Manual QA Guidance

If possible, manually check:

### Core authenticated app

* Home dashboard
* Wallet
* Benefits
* Settings

### Public/fresh-user

* Landing
* Auth page
* Onboarding build-your-lineup
* Confirm benefits
* Success page

Check both Light and Dark mode if practical.

Look for:

* font actually changed from Arial to Geist
* headings feel consistent
* rows still fit
* numbers still fit
* labels remain readable
* no obvious layout breakage
* no excessive mono usage

If browser QA was not run, say so clearly.

## Acceptance Criteria

This work is complete when:

* Geist Sans is the actual default app font.
* The stale Arial body rule is removed or no longer active.
* Geist Mono is used only selectively and intentionally.
* The most visible arbitrary font sizes are normalized.
* Common labels, row text, metadata, nav text, and metric text feel more consistent.
* No page redesign is performed.
* No theme/color changes are made.
* Existing behavior is preserved.
* Full validation passes:

  ```
  npm test
  npx tsc --noEmit
  npm run lint
  ```

## Final Agent Response Format

When done, report back in this format:

### Summary

Briefly explain what typography work was done.

### Font System

Explain how Geist Sans is applied and where Geist Mono is used.

### Type Scale Cleanup

Summarize arbitrary sizes replaced and any that remain.

### Files Changed

List every file changed with a short explanation.

### Behavior Preservation

State whether existing app behavior was preserved.

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
