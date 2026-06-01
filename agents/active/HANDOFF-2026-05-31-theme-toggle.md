# Handoff — Memento UI Theme Work (→ Codex)

**Date:** 2026-05-31
**Repo:** `/Users/haseebshaker/card-benefits-tracker`
**Branch:** `dev`
**State:** WO9 cleanup is DONE but **UNCOMMITTED**. Validation passes. Next up: WO10 (theme toggle).

---

## 0. How to operate in this repo (READ FIRST)

- Work on **`dev` directly**. Do **not** create or use a git worktree, hidden worktree, task branch, or alternate repo copy.
- **Before making any change**, run and confirm:
  ```
  git branch --show-current   # expect: dev
  git status --short
  git worktree list           # expect: only the main repo
  ```
- **Do NOT commit unless the product owner explicitly tells you to.** Leave changes in the working tree for review.
- Validation trio (run after changes; report results):
  ```
  npm test
  npx tsc --noEmit
  npm run lint
  ```
  Note: there is **no** `npm run typecheck` — use `npx tsc --noEmit`.
- The system `grep` is aliased to `ugrep` and mis-handles multi-file arg lists. Prefer `rg` (ripgrep).
- Completed work orders get moved from `agents/active/` → `agents/archive/`.

---

## 1. Project context

Memento is a premium credit-card benefits tracker (capture "use it or lose it" card value). Target feel: premium, calm, precise, trustworthy, expensive, modern-not-gimmicky.

A 7-part UI overhaul (WO1–WO7) is **complete**:
1. Visual direction + theme rules → 2. Token foundation → 3. Tailwind v4 token mapping → 4. Shared UI primitives → 5. App shell + Home/Dashboard → 6. Wallet + Benefits + Settings → 7. Landing + Auth + Onboarding.

**Design source of truth (read these before UI work):**
- `docs/design/memento-visual-direction.md`
- `docs/design/theme-token-usage.md`

**Token system lives in `app/globals.css`:**
- Light values in `:root` (the **default**).
- Dark values in `@media (prefers-color-scheme: dark) { :root { … } }`.
- Every token mapped to a Tailwind utility via the `@theme inline { --color-*: var(--*) }` block.
- Canonical accent = **gold** (`--accent` = `#c9920a` light / `#f0b429` dark). The old blue (`#4A9EFF`/`#7FB6FF`) is deprecated — do not reintroduce it.

**Semantic utility classes** (full table in `theme-token-usage.md`): `bg-background`, `text-foreground`, `bg-surface` / `bg-surface-raised` / `bg-surface-muted` / `bg-surface-subtle`, `border-border` / `border-border-strong` / `border-border-muted`, `text-muted-foreground` / `text-subtle-foreground`, `bg-accent` / `text-accent` / `bg-accent-muted` / `border-accent-border` / `text-accent-foreground`, status `text-success|warning|destructive` (+ `bg-*-muted`), interaction `ring-focus` / `bg-hover` / `bg-active`, overlays `bg-overlay` / `bg-scrim`. **No** raw hex, `white/` opacities, solid `text-white`, `slate-*`, or inline `style={{'--background':…}}` overrides in components.

---

## 2. Where we are

- **WO8 (audit)** — done. Verdict: **"Pass with cleanup first."** Found 6 remaining live hardcoded/theme-breaking surfaces.
- **WO9 (this session)** — done. Tokenized all 6. **Uncommitted.** This is the cleanup that had to land *before* building a theme toggle.

---

## 3. What WO9 changed (uncommitted on `dev`)

All changes are color-token swaps / comment cleanup. **No logic, JSX structure, routing, focus/keyboard, or responsive behavior changed.**

| # | File | Change |
|---|------|--------|
| 1 | `components/app-header.tsx` | Fully tokenized (live header on `/auth/*`). Mapped to the same tokens `components/app/AuthenticatedAppShell.tsx` uses: `bg-[#0B1220]/55`→`bg-surface/80`, `bg-[#030712]/55`→`bg-scrim`, `bg-[#0F1A2E]`→`bg-surface-raised`, `bg-[#F7C948]`→`bg-accent`, `white/*`→`text-foreground`/`text-muted-foreground`/`text-subtle-foreground`/`bg-hover`/`border-border`, `ring-[#F7C948]/45`→`ring-focus`. Kept (not retired) to preserve behavior. |
| 2 | `app/layout.tsx` | `<body>` class `text-white` → `text-foreground` (was a dark-only default). |
| 3 | `app/onboarding/benefits/components/benefits-onboarding.tsx` | Two `text-white` headings (the page `<h1>` ~line 914 and the "Remove card from wallet?" `<h2>` ~line 1004) → `text-foreground`. |
| 4 | `components/ui/PageBackgroundBlobs.tsx` | Removed deprecated blue/gold `rgba()`. Now 2 restrained glows using `var(--accent-muted)` (theme-adaptive). Still landing-only (imported only by `components/landing/PublicLandingPage.tsx`). Stale comment fixed. |
| 5 | `app/onboarding/confirm-benefits/loading.tsx` | Card-scan shimmer `rgba(255,255,255,…)` → `var(--active)` / `var(--border-strong)` (flips polarity by mode). Animation/timing unchanged. |
| 6 | `lib/format-card.ts` | Stale comment naming deleted files (`wallet-builder`, `card-results-list`) collapsed to one accurate line. No runtime change. |

**Also (per owner instruction this session):** archived two completed WOs from `agents/active/` → `agents/archive/`:
- `2026-05-31-overhaul-landing-auth-onboarding.md` (WO7)
- `2026-05-31-ui-overhaul-qa-theme-readiness-audit.md` (WO8)

> Intentional, behavior-preserving visual notes for QA: loading shimmer is subtler than the old bright-white sweep; landing glow is soft gold instead of blue+gold; header active-nav now uses the accent token (consistent with the shell; not reachable on auth pages anyway since no tab matches there).

---

## 4. Validation status (WO9)

- `npm test` → **36 passed, 0 failed**
- `npx tsc --noEmit` → **clean**
- `npm run lint` → **clean**
- Repo-wide sweep of `app/` + `components/` (excl. `globals.css`): **zero** hex, `white/`, solid `text-white`/`bg-white`, `rgba()`, or `slate-`. These 6 were the last live hardcoded surfaces.
- **Manual browser QA: NOT done.** Recommend checking in light + dark: `/auth/login`, `/auth/complete`, `/auth/error`, onboarding benefits page, confirm-benefits loading, landing ambient glow.

---

## 5. Current git state (uncommitted)

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
?? agents/active/HANDOFF-2026-05-31-theme-toggle.md   (this file)
```

**Decision needed from owner:** commit WO9 (+ archive moves) now, or fold into the WO10 branch of work. Owner controls commits.

---

## 6. NEXT WORK — WO10: Light / Dark / System theme toggle

The token foundation is ready; only the **switching mechanism** is missing. Today, dark mode is driven **only** by `@media (prefers-color-scheme: dark)` — there is no `data-theme`/`.dark` selector, no `ThemeProvider`, and no persisted preference (verified: none exist).

**Implementation plan:**

1. **`app/globals.css`** — make dark values respond to an explicit selector *in addition to* the media query, so System still works but an explicit choice wins. Keep `:root` light defaults; do **not** change token values. Pattern:
   ```css
   :root { /* light (unchanged) */ }

   /* System: follow OS unless user explicitly chose light */
   @media (prefers-color-scheme: dark) {
     :root:not([data-theme="light"]) { /* dark values */ }
   }
   /* Explicit dark choice */
   :root[data-theme="dark"] { /* dark values */ }
   ```
   (i.e. extract the current dark block so it applies to both the gated media query and `[data-theme="dark"]`.)

2. **`app/layout.tsx`** — add a no-flash inline `<script>` that reads the stored preference and sets `document.documentElement.dataset.theme` **before paint**; add `suppressHydrationWarning` to `<html>`. (Body color is already token-based after WO9.)

3. **Settings UI** — add a Light/Dark/System control. Follow the existing client-toggle pattern in `components/settings/NotificationsSection.tsx`. Settings is the right first entry point.

4. **Persistence** — `localStorage` key (e.g. `memento-theme`); **default = System**.

5. Small `useTheme` hook (or inline) to read/set `data-theme` + persist.

**Likely files:** `app/globals.css`, `app/layout.tsx`, `components/settings/*` (+ maybe a `components/ui/` toggle or a hook). **Do NOT** create `tailwind.config.ts` — this is Tailwind v4 CSS-first; extend `@theme inline` in `globals.css` if needed.

**Constraints:** don't change token *values*; don't break System behavior; don't redesign pages.

> There is **no WO10 work-order file yet**. The owner's workflow writes a WO doc in `agents/active/` before building. Either ask the owner to create it, or draft `agents/active/2026-05-31-add-theme-toggle-infrastructure.md` from the plan above and confirm before implementing.

---

## 7. Out of scope / known-open (theme-neutral — do NOT let these block the toggle)

- **App renders in Arial, not Geist.** `app/globals.css` has `body { font-family: Arial, Helvetica, sans-serif; }` (CNA leftover) and `font-sans`/`font-mono` are applied in zero component files, despite the visual direction mandating Geist Sans (primary) / Geist Mono (numerics). Needs its own typography pass.
- **Arbitrary font sizes** (`text-[9px]`…`text-[4.1rem]`) remain across landing, onboarding, home, benefits, wallet, and `components/ui/row-typography.ts` — contradicts the type-scale rule. Separate cleanup.

Both are real but were explicitly excluded from WO9 (cleanup-only, no typography overhaul).

---

## 8. Key files reference

- App shell router: `app/layout.tsx` → `components/app/AppChrome.tsx` → renders `components/app/AuthenticatedAppShell.tsx` for `/home|/wallet|/benefits|/settings`, else falls back to `components/app-header.tsx` (the now-tokenized header, live on `/auth/*`). Route predicate: `components/app/app-nav.ts` (`isAuthenticatedAppRoute`).
- `/dashboard` and `/login` are intentional `redirect()` stubs (→ `/home`, `/auth/login`) — not dead code.
- Tokens: `app/globals.css`. Usage guide: `docs/design/theme-token-usage.md`. Rules/anti-patterns: `docs/design/memento-visual-direction.md`.
- Dead onboarding components flagged in earlier WOs (`wallet-builder.tsx`, `card-results-list.tsx`, `submit-button.tsx`) are already deleted — do not look for them.
