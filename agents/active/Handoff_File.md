# Handoff — Memento UI Theme Work to Codex

## Purpose of This Prompt

You are helping continue development on **Memento**, a premium credit card benefits tracker.

This is a **DISCOVERY / ORIENTATION TASK ONLY**.

Do **not** change files yet.
Do **not** implement the theme toggle yet.
Do **not** refactor anything yet.
Do **not** create a branch or hidden worktree.
Do **not** commit anything.

Your job is to get fully up to speed on the recent UI/theme overhaul, verify the current repo state, understand what Claude completed, and prepare for the next work order.

The immediate next likely build work is:

```
WO10 — Add Light / Dark / System Theme Toggle Infrastructure
```

But do not create or implement WO10 until the product owner asks.

---

## 0. Operating Rules

Work directly in the current local repo on `dev`.

Do **not** create or use:

* a separate git worktree
* a hidden Claude/Codex worktree
* a task branch
* an alternate repo copy

Before doing anything, run:

```
git branch --show-current
git status --short
git worktree list
```

Expected:

* branch is `dev`
* working tree may contain uncommitted WO9 cleanup changes; see “Current Git State” below
* only the main repo worktree exists

If you see any unexpected worktree, branch, or dirty files beyond what is described below, stop and report it.

Do **not** commit unless the product owner explicitly tells you to.

Use the validation commands:

```
npm test
npx tsc --noEmit
npm run lint
```

Important: this repo does **not** have `npm run typecheck`. Use `npx tsc --noEmit`.

Also important: on this machine, system `grep` may be aliased to `ugrep` and can mis-handle multi-file argument lists. Prefer `rg` / ripgrep for searches and report the exact command you used.

---

## 1. Project Context

Repo:

```
/Users/haseebshaker/card-benefits-tracker
```

Project:

```
Memento
```

Memento is a premium credit card benefits tracker focused on helping users capture “use it or lose it” value from their cards.

Core product constraints:

* No bank login
* No Plaid
* No card numbers
* No transaction scraping
* Users manually add cards
* System preloads known benefits
* Users confirm which benefits apply to them

Desired product feel:

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

Fresh-user QA previously passed.

---

## 2. Important Agent Context

Earlier in the project, hidden worktrees caused confusion, stale files, and accidental lint failures. The standing rule now is:

> Operate directly in the current local repo files on `dev`.

Do not create or use hidden worktrees.

Completed work orders are usually moved from:

```
agents/active/
```

to:

```
agents/archive/
agents/archive/work-orders/
```

Read active and archived work orders if useful, but do not change them unless instructed.

---

## 3. Current Git State You Should Expect

Claude completed WO9 cleanup, but it is currently **uncommitted** unless the product owner has since committed it.

Expected current state may look like this:

```
D agents/active/2026-05-31-overhaul-landing-auth-onboarding.md
D agents/active/2026-05-31-ui-overhaul-qa-theme-readiness-audit.md
M app/layout.tsx
M app/onboarding/benefits/components/benefits-onboarding.tsx
M app/onboarding/confirm-benefits/loading.tsx
M components/app-header.tsx
M components/ui/PageBackgroundBlobs.tsx
M lib/format-card.ts
?? agents/archive/2026-05-31-overhaul-landing-auth-onboarding.md
?? agents/archive/2026-05-31-ui-overhaul-qa-theme-readiness-audit.md
?? agents/active/HANDOFF-2026-05-31-theme-toggle.md
```

If this is the current state, do not overwrite it. These are expected WO9 cleanup and handoff artifacts.

Decision still needed from product owner:

* commit WO9 cleanup now, or
* fold it into the next work session

Do not decide this yourself. Report the state and ask.

---

## 4. Email Reminder MVP Work Completed

Before the UI overhaul, Memento’s reminder MVP was completed.

### Monthly email reminder digest

* `send-digest` became the production monthly digest job.
* Vercel cron schedules it monthly.
* Emails send through Resend.
* Digest skips users without relevant benefits.
* Digest returns useful job counts.
* Pure digest logic/tests were added.

### Minimal reminder settings

* Existing `user_profiles.notifications_enabled` is used.
* Settings page has an email reminders toggle.
* Digest only sends to users with `notifications_enabled = true`.
* The setting defaults to `false`, making reminders opt-in.

### Reminder delivery QA fixes

Real E2E QA found and fixed several production-blocking issues:

* Supabase/Postgrest errors were being swallowed as `unknown_error`.
* Digest query incorrectly selected `user_id` directly from `user_benefits`.
* Query referenced old `remind_me` column that no longer exists.
* Invalid `semi_annual` enum value was removed; correct value is `semiannual`.
* Null-safe sorting was added for benefit/card display names.
* A live Resend test email was delivered successfully.

### Onboarding reminder opt-in

* Success page now prompts users to turn on reminders.
* Opt-in calls the notifications endpoint.
* Notifications endpoint changed from `.update()` to `.upsert()` so it works even if no `user_profiles` row exists yet.
* Confirm-benefits now routes to `/onboarding/success` so users see the opt-in.
* Success page copy was updated so it does not imply automatic email reminders before opt-in.

### Auth/onboarding routing cleanup

* Replaced fragile “new user” timing heuristic with a real database check:

  * if user has at least one card → `/home`
  * otherwise → onboarding
* Removed obsolete `is-new-auth-user` helper.

---

## 5. Home Dashboard UX Work Completed

Home/dashboard was made more action-oriented.

Completed:

* Inline row actions replaced hidden 3-dot menu behavior.
* Unused rows show check-circle “Mark as used” and X-circle “Do not track.”
* Used rows show filled green check-circle to mark unused.
* Not-tracked rows show plus-circle to start tracking.
* Hover tooltips were added.
* Row exit animation was added:

  * accent bar flashes green/red
  * row dims
  * row fades out
  * then API handler fires
* Undo toast was added:

  * 4-second undo window
  * API call delayed until undo window closes
  * Undo restores feed instantly and cancels API call
* Urgency badges were added:

  * “Due today”
  * “Due soon”
  * urgency tiers
* Fresh-user QA passed after these changes.

---

## 6. UI / Brand Overhaul Rationale

The app previously looked visually inconsistent:

* Some pages were dark blue, others black.
* Random glowing blobs.
* Decorative/stale imagery.
* Bubbly bento-box styling.
* Inconsistent typography.
* Inconsistent buttons, cards, surfaces, layouts.
* Landing, onboarding, and authenticated app felt like different products.
* Light mode was structurally broken because many styles were hardcoded for dark mode.

We agreed on this dependency chain:

```
direction
→ tokens
→ utilities
→ primitives
→ core app pages
→ secondary app pages
→ public/onboarding pages
```

Do not skip this logic in future UI work.

---

## 7. Design Source of Truth

Read these before any UI/theme work:

```
docs/design/memento-visual-direction.md
docs/design/theme-token-usage.md
AGENTS.md
```

The design north star:

* premium fintech dashboard / card concierge
* calm
* precise
* trustworthy
* expensive-looking without gimmicks
* clear and action-oriented

Avoid:

* random glowing blobs
* bubbly bento boxes
* noisy gradients
* page-specific color systems
* raw hardcoded dark classes
* generic SaaS clutter
* replacing old hardcoded styles with new hardcoded styles

Prefer:

* semantic tokens
* crisp surfaces
* restrained accent
* clear hierarchy
* theme-ready components

---

## 8. Theme Token System

Theme tokens live in:

```
app/globals.css
```

Current setup:

* Light values live in `:root` and are the default.

* Dark values currently live under:

  ```
  @media (prefers-color-scheme: dark) { :root { ... } }
  ```

* Every token is mapped into Tailwind utilities through `@theme inline`.

* The project uses Tailwind v4 CSS-first setup.

* Do not add an old Tailwind v3-style `tailwind.config.ts` unless truly necessary.

Canonical accent:

* Gold is the canonical Memento accent.
* Light: `--accent = #c9920a`
* Dark: `--accent = #f0b429`

Old blue values like `#4A9EFF` / `#7FB6FF` are deprecated. Do not reintroduce them as generic decoration. Blue should only be used for interaction/focus if already represented through tokens.

Approved semantic utilities include:

```
bg-background
text-foreground
bg-surface
bg-surface-raised
bg-surface-muted
bg-surface-subtle
border-border
border-border-strong
border-border-muted
text-muted-foreground
text-subtle-foreground
text-inverse-foreground
bg-accent
text-accent
text-accent-foreground
bg-accent-muted
border-accent-border
text-success
bg-success-muted
text-warning
bg-warning-muted
text-destructive
bg-destructive-muted
ring-focus
bg-hover
bg-active
bg-overlay
bg-scrim
```

Do not use:

* raw hex values in components/pages
* raw `white/` opacity systems
* solid `text-white` or `bg-white` defaults
* raw `black`
* `slate-*` color classes
* inline `style={{ "--background": ... }}` or `--foreground` overrides in pages

---

## 9. UI Overhaul Work Orders Completed

### WO1 — Define Memento Visual Direction + Theme Rules

Created:

```
docs/design/memento-visual-direction.md
```

Purpose:

* Set visual north star.
* Define design principles.
* Define anti-patterns.
* Establish light/dark philosophy.

### WO2 — Build Theme Token Foundation

Updated:

```
app/globals.css
```

Added semantic token categories:

* core: `--background`, `--foreground`
* surfaces: `--surface`, `--surface-raised`, `--surface-muted`, `--surface-subtle`
* borders: `--border`, `--border-strong`, `--border-muted`
* text: `--muted-foreground`, `--subtle-foreground`, `--inverse-foreground`
* accent: `--accent`, `--accent-foreground`, `--accent-muted`, `--accent-border`
* status: success / warning / destructive variants
* interaction: `--focus`, `--focus-muted`, `--hover`, `--active`
* overlays/effects: `--overlay`, `--scrim`, `--shadow-color`

### WO3 — Map Tokens Into Tailwind v4 Utilities

Created:

```
docs/design/theme-token-usage.md
```

Updated:

```
AGENTS.md
```

Purpose:

* Verified semantic Tailwind utilities compile.
* Documented approved token utilities.
* Added semantic token rule for future agents.

### WO4 — Refactor Shared UI Primitives

Refactored:

```
components/ui/
```

Major changes:

* `Button` variants now use semantic tokens.
* Primary button is gold `bg-accent`.
* `Surface` uses tokenized surfaces/borders.
* `UndoToast`, `DatePicker`, `checkbox`, `popover`, `AppShell`, `row-typography` were tokenized.
* Hardcoded hex and `white/` opacity were removed from `components/ui/`.
* Duplicated blob markup was extracted into `components/ui/PageBackgroundBlobs.tsx` for containment.

Important:

* `PageBackgroundBlobs` was a containment component, not approval to add blobs.
* Later WO7 removed it from onboarding and kept it landing-only.

### WO5 — Overhaul App Shell + Home/Dashboard

Home became the authenticated app visual anchor.

Major changes:

* Tokenized authenticated shell/nav.
* Home background unified.
* Hero metrics became neutral tokenized surfaces.
* Tabs/timeframe controls tokenized.
* Benefit rows tokenized.
* Urgency badges use semantic warning tokens.
* Inline row actions use semantic success/destructive/accent tokens.
* Empty/all-caught-up/error/loading states tokenized.
* Per-card rainbow marker colors were neutralized.

Dead files removed afterward:

* `components/home/HomeBenefitRowMenu.tsx`
* `components/home/HomeBenefitActionDialog.tsx`

### WO6 — Overhaul Wallet + Benefits + Settings

Brought remaining authenticated utility pages in line with Home.

Major changes:

* Wallet page tokenized.
* Benefits page tokenized to match Home’s row/tab language.
* Settings page tokenized.
* Modals/drawers tokenized.
* Notification toggle restyled on tokens.
* Neutral markers were kept instead of introducing a new card-color palette.

Dead wallet subtrees removed afterward:

* old AddCardFlow subtree
* old CardDetailScreen subtree
* empty `app/(app)` scaffolding

### WO7 — Overhaul Landing + Auth + Onboarding

Final major page group.

Major changes:

* Landing/Auth/Onboarding now share token system with the authenticated app.
* Inline `--background` / `--foreground` overrides removed.
* Landing’s old competing blue+gold palette collapsed into one accent system.
* CTA buttons use shared Button primitive.
* Decorative glows/blobs reduced.
* Onboarding blobs removed.
* `PageBackgroundBlobs` kept landing-only.
* Auth pages tokenized.
* Build-your-lineup, confirm-benefits, benefits onboarding, success/reminder opt-in tokenized.

Dead onboarding subtree removed afterward:

* `wallet-builder.tsx`
* `card-results-list.tsx`
* `submit-button.tsx`

---

## 10. WO8 — UI Overhaul QA + Theme Readiness Audit

WO8 was a read-only audit after WO7.

Decision:

```
Pass with cleanup first
```

Findings:

The token foundation was good and most live surfaces were clean, but a few hardcoded live theme-breakers remained:

1. `components/app-header.tsx`
2. `app/layout.tsx` body `text-white`
3. two `text-white` headings in onboarding benefits
4. `PageBackgroundBlobs.tsx` had hardcoded old blue/gold `rgba()`
5. `confirm-benefits/loading.tsx` had hardcoded white shimmer
6. stale comment in `lib/format-card.ts`

Recommendation:

* cleanup first
* then build Light / Dark / System toggle infrastructure

---

## 11. WO9 — Tokenize Remaining Hardcoded Surfaces

WO9 is done but may be **uncommitted**.

What changed:

1. `components/app-header.tsx`

   * Fully tokenized.
   * It is live on `/auth/*`.
   * Mapped to same token system as `AuthenticatedAppShell`.
   * Hardcoded `bg-[#0B1220]`, `bg-[#0F1A2E]`, `bg-[#030712]`, `bg-[#F7C948]`, `white/*`, and `ring-[#F7C948]/45` were replaced with semantic tokens.
   * Component was kept, not retired, to preserve behavior.

2. `app/layout.tsx`

   * `<body>` class `text-white` changed to `text-foreground`.
   * Font variables untouched.

3. `app/onboarding/benefits/components/benefits-onboarding.tsx`

   * Two remaining `text-white` headings changed to `text-foreground`.

4. `components/ui/PageBackgroundBlobs.tsx`

   * Deprecated blue/gold `rgba()` removed.
   * Now uses 2 restrained theme-adaptive glows with `var(--accent-muted)`.
   * Still landing-only.
   * Stale comment fixed.

5. `app/onboarding/confirm-benefits/loading.tsx`

   * Card scan shimmer changed from hardcoded `rgba(255,255,255,...)` to token-based values:

     * `var(--active)`
     * `var(--border-strong)`
   * Animation/timing unchanged.

6. `lib/format-card.ts`

   * Stale comment naming deleted files collapsed into one accurate line.
   * No runtime change.

Also archived:

* WO7 work order
* WO8 work order

Validation reportedly passed:

```
npm test                  36 passed
npx tsc --noEmit          clean
npm run lint              clean
```

Repo-wide sweep reportedly found zero live hardcoded theme-breaking colors in `app/` and `components/`, excluding legitimate token definitions in `app/globals.css`.

Manual browser QA was **not** done for WO9.

Recommended manual checks:

* `/auth/login`
* `/auth/complete`
* `/auth/error`
* onboarding benefits page
* confirm-benefits loading
* landing ambient glow

---

## 12. App Shell / Route Wiring Details

Important for theme toggle work:

Root layout:

```
app/layout.tsx
```

App shell router:

```
components/app/AppChrome.tsx
```

Authenticated shell:

```
components/app/AuthenticatedAppShell.tsx
```

Auth/public fallback header:

```
components/app-header.tsx
```

Route predicate:

```
components/app/app-nav.ts
isAuthenticatedAppRoute
```

Behavior:

* Authenticated routes such as `/home`, `/wallet`, `/benefits`, `/settings` use `AuthenticatedAppShell`.
* Non-authenticated routes fall back to `AppHeader`.
* `/dashboard` and `/login` are intentional redirect stubs:

  * `/dashboard` redirects to `/home`
  * `/login` redirects to `/auth/login`
* They are not dead code.

---

## 13. Next Work — WO10 Theme Toggle Infrastructure

The token foundation is ready. The switching mechanism is missing.

Current behavior:

* Dark mode is only driven by:

  ```
  @media (prefers-color-scheme: dark)
  ```

* There is no:

  * `data-theme`
  * `.dark`
  * theme provider
  * persisted preference
  * Settings theme control

Expected future user-facing options:

* Light
* Dark
* System

Default:

```
System
```

Persistence:

```
localStorage
```

Do not use database persistence for MVP unless there is a strong reason.

Do not do typography cleanup in WO10.

Do not redesign pages in WO10.

Do not create `tailwind.config.ts`.

---

## 14. Recommended WO10 Implementation Pattern

### 1. `app/globals.css`

Keep `:root` as light defaults.

Make dark token values respond to explicit dark selection **and** system preference.

Suggested pattern:

```
:root {
  /* light values unchanged */
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    /* dark values */
  }
}

:root[data-theme="dark"] {
  /* dark values */
}
```

Meaning:

* system mode follows OS
* explicit light overrides dark OS preference
* explicit dark overrides light OS preference

Do not change token values.

Prefer extracting/reusing the existing dark block so values stay identical.

### 2. `app/layout.tsx`

Add a no-flash inline script that runs before paint.

It should:

* read localStorage key, e.g. `memento-theme`
* accepted values: `light`, `dark`, `system`
* if value is `light`, set `document.documentElement.dataset.theme = "light"`
* if value is `dark`, set `document.documentElement.dataset.theme = "dark"`
* if value is missing or `system`, remove `data-theme` or set it to `system` based on chosen architecture
* avoid throwing if localStorage is unavailable

Add `suppressHydrationWarning` to `<html>` because the script mutates the root before hydration.

Body color is already token-based after WO9.

### 3. Settings UI

Add a Light / Dark / System control in Settings.

Likely files:

```
components/settings/SettingsScreen.tsx
components/settings/NotificationsSection.tsx
```

Recommended approach:

* follow existing `NotificationsSection` client component pattern
* create a `ThemeSection` or similar client component
* use segmented control or simple radio group
* options:

  * System
  * Light
  * Dark
* persist to localStorage
* update `document.documentElement` immediately
* default display should be System

This does not need Supabase/database persistence for MVP.

### 4. Optional hook/helper

A small hook/helper is acceptable, for example:

```
useThemePreference()
```

or:

```
lib/theme/theme-preference.ts
```

Keep it lightweight.

Responsibilities:

* read preference
* validate preference
* apply preference to document root
* persist preference
* expose current preference to Settings UI

Avoid over-engineering.

### 5. Do not change theme token values

WO10 should be infrastructure only.

No page redesign.

No typography cleanup.

No visual polish.

---

## 15. Known Open Items That Should Not Block WO10

### Typography / Geist

WO8 found:

* `app/globals.css` still forces Arial on `body`.
* `app/layout.tsx` loads Geist fonts.
* The app may not consistently use Geist.
* Arbitrary `text-[...]` font sizes remain.

This matters for premium feel, but it is theme-neutral.

Do not mix this into WO10.

Create a later typography/type-scale work order.

### Light Mode Polish

After WO10, expect:

```
WO11 — Light Mode Browser QA + Polish
```

Because adding the toggle will reveal visual issues that static checks cannot catch.

### Manual QA

WO9 manual browser QA was not done. Before or after WO10, the product owner should inspect:

* auth pages
* landing page
* onboarding benefits page
* confirm-benefits loading
* Settings theme control
* Home / Wallet / Benefits / Settings in light and dark

---

## 16. What I Want You To Do Now

This is a Codex discovery/orientation prompt.

Do not change files.

Do not create WO10 yet.

Do not implement the toggle.

Please:

1. Confirm git state:

   * branch
   * status
   * worktree list

2. Read:

   * `docs/design/memento-visual-direction.md`
   * `docs/design/theme-token-usage.md`
   * `AGENTS.md`
   * `app/globals.css`
   * `app/layout.tsx`
   * `components/settings/SettingsScreen.tsx`
   * `components/settings/NotificationsSection.tsx`
   * `components/app/AppChrome.tsx`
   * `components/app/AuthenticatedAppShell.tsx`
   * `components/app-header.tsx`
   * `components/ui/PageBackgroundBlobs.tsx`

3. Verify whether WO9 is still uncommitted.

4. If WO9 is uncommitted:

   * inspect those diffs
   * confirm they match this handoff
   * do not modify them

5. Verify the current claim:

   * live `app/` and `components/` no longer contain hardcoded theme-breaking colors outside `app/globals.css`

6. Run validation:

   * `npm test`
   * `npx tsc --noEmit`
   * `npm run lint`

7. Produce a discovery report.

## 17. Final Response Format

Use this exact response format:

### Repo State

Branch, status, worktree summary.

### Handoff Verification

What parts of this summary match the codebase.

### WO9 State

Is WO9 committed or uncommitted?
Do the current diffs match the handoff?

### Theme Readiness

Is the codebase ready for Light / Dark / System toggle infrastructure?

### Remaining Concerns

Anything to fix before WO10.

### Validation

Commands run and results.

### Recommended WO10 Scope

High-level scope only. Do not write the full work order yet.

### Files Changed

Say:

No files changed.
