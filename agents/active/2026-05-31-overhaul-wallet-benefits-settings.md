# Work Order: Overhaul Wallet + Benefits + Settings

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

Overhaul the Wallet, Benefits, and Settings pages so the authenticated app feels like one premium product.

Home/Dashboard is now the visual anchor. This work order should make the other authenticated utility pages match that system.

This is WO6 in the UI overhaul sequence.

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
* Row actions with undo
* Monthly email reminder digest via Resend

Fresh-user QA passed.

The Home/Dashboard visual overhaul is complete and should be treated as the authenticated app reference surface.

## UI Overhaul Sequence

This is WO6.

The sequence is:

1. Define Memento Visual Direction + Theme Rules
2. Build Theme Token Foundation
3. Map Tokens Into Tailwind v4 Utilities
4. Refactor Shared UI Primitives
5. Overhaul App Shell + Home/Dashboard
6. Overhaul Wallet + Benefits + Settings
7. Overhaul Landing + Auth + Onboarding

Do not jump ahead to WO7.

## Design Direction Sources

Use these documents as the source of truth:

```
docs/design/memento-visual-direction.md
docs/design/theme-token-usage.md
```

Use the Home/Dashboard implementation from WO5 as the visual reference.

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
* Adding visual complexity to “make it feel designed”

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
* Matching Home’s surface, row, tab, and section language

## Scope

In scope:

* Wallet page visual overhaul
* Benefits page visual overhaul
* Settings page visual overhaul
* Wallet card rows / card list surfaces
* Benefit inventory rows / tables / cards
* Benefit detail drawer/overlay visual token cleanup
* Add-card modal or drawer styling if it belongs to Wallet
* Settings sections and notification toggle styling
* Empty states on Wallet, Benefits, and Settings if present
* Loading/error states for these pages if present
* Use semantic theme tokens
* Remove hardcoded colors from touched Wallet/Benefits/Settings files where practical
* Preserve existing functionality
* Run full validation

Out of scope:

* Home/Dashboard redesign
* Landing page overhaul
* Auth page overhaul
* Onboarding page overhaul
* Changing reminder email behavior
* Changing benefit calculation logic
* Changing database/schema
* Adding new product features
* Adding a light/dark mode toggle
* Broad app-wide refactors
* Rewriting the app shell again unless a small consistency fix is needed
* Creating `tailwind.config.ts`
* Replacing every hardcoded color across the entire repo
* Adding new decorative blobs/glows

## Files to Inspect

Inspect likely relevant files, including but not limited to:

### Wallet

* `app/wallet/page.tsx`
* `components/wallet/WalletScreen.tsx`
* `components/wallet/WalletCardRow.tsx`
* `components/wallet/WalletCardsList.tsx`
* `components/wallet/AddCardModal.tsx`
* `components/wallet/BenefitDetailOverlay.tsx`
* Any wallet empty state, drawer, card metadata, or add-card components

### Benefits

* `app/benefits/page.tsx`
* `components/benefits/BenefitsScreen.tsx`
* `components/benefits/BenefitsInventoryRow.tsx`
* Any benefits filters, tabs, empty states, row components, or detail components

### Settings

* `app/settings/page.tsx`
* `components/settings/SettingsScreen.tsx`
* `components/settings/NotificationsSection.tsx`
* Any settings section/card/toggle components

### Shared References

* `components/home/` files from WO5 for visual reference only
* `components/ui/Button.tsx`
* `components/ui/Surface.tsx`
* `components/ui/checkbox.tsx`
* `components/ui/popover.tsx`
* `components/ui/DatePicker.tsx`
* `components/ui/UndoToast.tsx`
* `components/ui/row-typography.ts`

Only modify files needed for this work order.

## Visual Goals

### 1. Wallet Page

Wallet should feel like a precise inventory of the user’s cards, not a disconnected list.

Requirements:

* Match Home’s background/surface system
* Use semantic tokens
* Make card rows feel calm, premium, and scannable
* Make add-card action clear but not loud
* Avoid decorative gradients/glows
* Avoid inconsistent card row colors
* Keep card metadata readable
* Make empty state helpful and direct

Questions to consider:

* Does the page instantly communicate “these are the cards Memento is tracking”?
* Is the primary next action obvious?
* Does the add-card flow visually match the rest of the authenticated app?

### 2. Benefits Page

Benefits should feel like a structured inventory of trackable value.

Requirements:

* Match Home’s row and tab visual language where appropriate
* Use semantic tokens
* Make tracked/unused/used/not-tracked states clear
* Keep filters/tabs calm and obvious
* Make rows dense enough to scan without feeling cramped
* Avoid table/card style drift from Home
* Avoid overdesigned bento containers

Questions to consider:

* Does the Benefits page feel like the same product as Home?
* Are benefit statuses clear?
* Are actions discoverable?
* Is information density appropriate?

### 3. Settings Page

Settings should be minimal, calm, and trustworthy.

Requirements:

* Match the authenticated app surface system
* Use semantic tokens
* Keep sections simple
* Make notification settings clear
* Do not make Settings feel empty or unfinished
* Avoid adding unnecessary settings
* Avoid broad preference-center vibes

Questions to consider:

* Does Settings feel intentionally minimal or underbuilt?
* Is the email reminder toggle easy to understand?
* Is account information presented cleanly?

### 4. Modals / Drawers / Overlays

Any Wallet/Benefits modal, drawer, or overlay touched in this work order should match the new primitive system.

Requirements:

* Use `bg-surface-raised` or equivalent semantic surface
* Use `border-border`
* Use `text-foreground`, `text-muted-foreground`, `text-subtle-foreground`
* Use `bg-overlay` / `bg-scrim` if needed
* Use `ring-focus` for focus states
* Avoid raw dark backgrounds and one-off shadows

### 5. Structured Card-Color Palette

WO5 neutralized Home’s per-card color markers to avoid hardcoded `slate-` / `amber-` / etc.

In this work order, investigate whether Wallet/Benefits still rely on inconsistent card color classes.

If card-color markers are still useful, introduce a small structured tokenized helper/palette rather than one-off Tailwind named colors.

Important:

* Do not create a noisy rainbow system.
* Card colors should be restrained.
* If uncertain, prefer neutral markers and leave a follow-up note.
* Do not block this work order on a perfect card-color system.

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

* Wallet card loading
* Add-card flow
* Card confirmation flow
* Benefit detail overlay/drawer
* Benefit tracking actions
* Mark used / mark unused behavior
* Do not track / start tracking behavior
* Settings notification toggle
* Auth gating
* Routing
* Empty states
* Loading states
* Error states
* Accessibility labels
* Keyboard/focus behavior
* Responsive behavior

If behavior changes are needed to support the visual overhaul, keep them minimal and explain them.

## Responsive Requirements

Wallet, Benefits, and Settings must remain usable on:

* mobile
* tablet
* desktop

Pay attention to:

* wallet card list density
* benefits row/card wrapping
* filters/tabs on smaller screens
* modals/drawers on mobile
* settings section spacing
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

Status and actions should not rely only on color.

## Acceptance Criteria

This work is complete when:

* Wallet, Benefits, and Settings visually align with Home/Dashboard
* Touched files use semantic theme utilities where practical
* The authenticated app feels more coherent end to end
* No page-level changes are made to Landing/Auth/Onboarding
* No new feature behavior is introduced
* Existing Wallet/Benefits/Settings behavior is preserved
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

Also run focused checks against touched Wallet/Benefits/Settings files for hardcoded color usage.

Suggested checks:

```
grep -R "#[0-9A-Fa-f]\{3,8\}" components/wallet components/benefits components/settings app/wallet app/benefits app/settings || true
grep -R "white/" components/wallet components/benefits components/settings app/wallet app/benefits app/settings || true
grep -R "black" components/wallet components/benefits components/settings app/wallet app/benefits app/settings || true
grep -R "slate-" components/wallet components/benefits components/settings app/wallet app/benefits app/settings || true
```

If matches remain for legitimate reasons, explain them.

## Manual QA Checklist

After implementation, manually check:

### Wallet

* Wallet page with at least one card
* Wallet empty state if possible
* Add-card flow
* Card details/drawer/overlay if present
* Mobile width
* Desktop width

### Benefits

* Benefits page with tracked benefits
* Benefits page filters/tabs
* Row actions if present
* Empty states
* Mobile width
* Desktop width

### Settings

* Settings page
* Email reminder toggle on/off
* Account section
* Mobile width
* Desktop width

If manual QA was not run, say so clearly.

## Final Agent Response Format

When done, report back in this format:

### Summary

Briefly explain what changed.

### Visual Direction Applied

Summarize how Wallet, Benefits, and Settings now align to Home.

### Files Changed

List every file changed with a short explanation.

### Behavior Preservation

State whether core Wallet/Benefits/Settings behavior was preserved.

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
