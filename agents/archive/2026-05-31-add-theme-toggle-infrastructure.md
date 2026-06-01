# Work Order: Add Light / Dark / System Theme Toggle Infrastructure

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

Add Light / Dark / System theme toggle infrastructure to Memento.

The UI overhaul and theme-readiness cleanup are complete. The app now uses semantic theme tokens across live app surfaces, and the remaining hardcoded theme-breaking surfaces have been tokenized.

This work order adds the actual user-selectable theme switching mechanism.

The goal is:

* Users can choose System, Light, or Dark in Settings.
* System remains the default.
* The choice persists in localStorage.
* The selected theme applies immediately.
* The selected theme applies before paint on reload to avoid visible flashing.
* The existing semantic token system continues to drive all colors.

Do not redesign pages.

Do not change theme token values.

Do not do typography cleanup.

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
* Wallet
* Benefits
* Settings
* Monthly email reminder digest via Resend

The 7-part UI overhaul is complete, and WO9 removed the remaining hardcoded theme-breaking surfaces.

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

Do not reintroduce raw colors or page-specific visual systems.

## Current Theme State

Current setup:

* Light values are defined in `:root`.

* Dark values are defined under:

  ```
  @media (prefers-color-scheme: dark) {
    :root {
      ...
    }
  }
  ```

* Tailwind v4 utilities are mapped through `@theme inline`.

* There is no persisted user theme preference.

* There is no theme provider/hook.

* There is no `data-theme` or `.dark` selector.

* There is no Settings theme control.

## Desired Theme Behavior

Users should have three choices:

1. **System**

   * Default behavior.
   * Follows the operating system/browser preference.
   * If OS is dark, app uses dark tokens.
   * If OS is light, app uses light tokens.

2. **Light**

   * Forces light tokens even if the OS is dark.

3. **Dark**

   * Forces dark tokens even if the OS is light.

Preference should persist in localStorage.

Recommended localStorage key:

```
memento-theme
```

Accepted values:

```
system
light
dark
```

Default:

```
system
```

Do not use Supabase/database persistence for MVP unless there is a strong reason. localStorage is enough.

## Scope

In scope:

* Update `app/globals.css` so dark token values respond to explicit theme selection and system preference.
* Add no-flash theme initialization in `app/layout.tsx`.
* Add `suppressHydrationWarning` to the root `<html>` element if needed.
* Add a Settings theme control for System / Light / Dark.
* Persist theme preference in localStorage.
* Apply theme changes immediately on selection.
* Use the existing semantic token system.
* Run full validation.

Out of scope:

* Changing token values.
* Redesigning pages.
* Refactoring unrelated UI.
* Typography / Geist cleanup.
* Type-scale cleanup.
* Light-mode visual polish beyond what is required for infrastructure.
* Database/schema changes.
* Supabase persistence for theme preference.
* Adding a theme control outside Settings.
* Creating `tailwind.config.ts`.
* Adding new product features.

## Recommended Implementation Pattern

### 1. `app/globals.css`

Keep `:root` as the light/default token set.

Make dark token values apply in two cases:

1. System preference is dark and the user has not explicitly chosen light.
2. User explicitly chose dark.

Recommended pattern:

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

This allows:

* no stored preference or `system` → follows OS
* `data-theme="light"` → forces light
* `data-theme="dark"` → forces dark

Important:

* Do not change token values.
* Reuse the existing dark token block exactly.
* Avoid duplicating values in a way that becomes hard to maintain if practical.
* Do not add `tailwind.config.ts`.

### 2. `app/layout.tsx`

Add a no-flash inline script that runs before hydration.

It should:

* read localStorage key `memento-theme`
* accept only `light`, `dark`, or `system`
* if value is `light`, set `document.documentElement.dataset.theme = "light"`
* if value is `dark`, set `document.documentElement.dataset.theme = "dark"`
* if value is missing, invalid, or `system`, remove `data-theme` or leave it unset so CSS follows system
* catch errors safely if localStorage is unavailable
* avoid server/client hydration issues

Add `suppressHydrationWarning` to `<html>` if needed because the script mutates the root element before hydration.

Do not alter routing, auth behavior, metadata, or font variables.

### 3. Theme Helper / Hook

Create a small theme helper or hook if useful.

Suggested file options:

```
lib/theme/theme-preference.ts
components/settings/ThemeSection.tsx
```

or similar project-consistent names.

Keep this lightweight.

Responsibilities may include:

* define `ThemePreference = "system" | "light" | "dark"`
* validate stored values
* read from localStorage
* write to localStorage
* apply preference to `document.documentElement`
* expose current preference to the Settings control

Do not over-engineer a large provider unless clearly needed.

### 4. Settings UI

Add a theme control to Settings.

Likely files:

```
app/settings/page.tsx
components/settings/SettingsScreen.tsx
components/settings/NotificationsSection.tsx
```

Recommended approach:

* Add a new `ThemeSection` client component.
* Put it near the notification settings.
* Use a segmented control or simple radio-style button group.
* Options:

  * System
  * Light
  * Dark
* Use semantic tokens.
* Follow the calm, premium settings style.
* Update the theme immediately when the user selects an option.
* Persist to localStorage.
* Default selection should be System.
* Do not call Supabase for theme preference.

Suggested copy:

Title:

```
Appearance
```

Description:

```
Choose how Memento looks on this device.
```

Options:

```
System
Light
Dark
```

Helper copy:

```
System follows your device setting.
```

Keep copy short.

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
* `border-border`
* `text-muted-foreground`
* `text-subtle-foreground`
* `bg-accent`
* `text-accent`
* `bg-accent-muted`
* `border-accent-border`
* `ring-focus`
* `bg-hover`
* `bg-active`

Do not introduce raw color values.

Do not reintroduce old blue accent values.

Do not create page-specific color systems.

## Behavior Requirements

Preserve existing behavior.

Do not break:

* app routing
* auth flow
* onboarding
* Settings email reminder toggle
* dashboard behavior
* reminder opt-in
* email digest behavior
* existing responsive layouts
* existing accessibility labels/focus behavior

Theme selection should only affect visual theme tokens.

## Accessibility Requirements

The theme control should:

* use semantic buttons or form controls
* be keyboard accessible
* have visible focus states using `ring-focus`
* clearly indicate selected state
* not rely only on color if avoidable
* have readable labels

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
rg "memento-theme|data-theme|ThemePreference|ThemeSection" app components lib || true
rg "#[0-9A-Fa-f]{3,8}|white/|text-white|bg-white|rgba\(|slate-" app components --glob '!app/globals.css' || true
```

If the second check returns matches, inspect and explain them. It should ideally be clean after WO9.

## Manual QA Guidance

If possible, manually check:

### Theme switching

* Default system mode
* Select Light in Settings
* Refresh page, confirm Light persists
* Select Dark in Settings
* Refresh page, confirm Dark persists
* Select System in Settings
* Confirm app follows OS/browser preference again

### Pages to check in both Light and Dark

* Landing
* Auth login / auth complete if reachable
* Onboarding success
* Home
* Wallet
* Benefits
* Settings

If manual browser QA was not run, say so clearly.

## Acceptance Criteria

This work is complete when:

* Users can choose System / Light / Dark in Settings.
* System is the default.
* Preference persists in localStorage.
* Theme applies immediately after selection.
* Theme applies before paint on reload as much as practical.
* `app/globals.css` supports explicit light/dark selection and system mode.
* `app/layout.tsx` safely initializes theme before hydration.
* No database/schema change is introduced.
* No page redesign is performed.
* No token values are changed.
* No new raw hardcoded color system is introduced.
* Full validation passes:

  npm test
  npx tsc --noEmit
  npm run lint

## Final Agent Response Format

When done, report back in this format:

### Summary

Briefly explain what was built.

### Theme Architecture

Explain how System / Light / Dark works.

### Settings UI

Explain the new Settings control.

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
