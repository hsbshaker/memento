# Work Order: Surface Urgency Visually on Benefit Rows

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

Make urgency visible at the benefit row level so users can immediately tell which benefits need attention today vs. soon vs. later — without having to read the timing label in the metadata columns.

Currently all unused benefit rows look identical regardless of urgency. A benefit expiring in 1 day looks the same as one expiring in 12 days.

## What Is Already Known

### Urgency tier data

`HomeFeedItem` already carries `urgencyTier: HomeUrgencyTier` which is one of:

* `"high"` — resets in ≤ 3 days
* `"soon"` — resets in ≤ 14 days
* `"upcoming"` — resets in more than 14 days

Thresholds are defined in `lib/home/build-home-feed.ts`:
```ts
if (daysRemaining <= 3) return "high";
if (daysRemaining <= 14) return "soon";
return "upcoming";
```

`urgencyTier` is not currently used anywhere in `HomeBenefitRow.tsx`. It is available on every `HomeFeedItem` passed to the row — no data changes needed.

### Current row structure

Each unused (`urgent` variant) row has:
- A colored left accent bar (`h-10 w-1 rounded-full`) — currently colored by card type (gold, platinum, etc.)
- Benefit name + card name
- Three metadata columns: Value | Resets | Cadence
- Check circle + X circle action buttons

The accent bar is the natural place for urgency signal since it's the first thing the eye hits on the left edge.

### Design language already in the codebase

The exit animation already uses:
- `bg-[#86EFAC]` — green for "marked used" confirmation
- `bg-red-400/80` — red for "do not track" confirmation
- `bg-white/40` — neutral for "mark unused"

The app's color palette uses:
- Gold `#F7C948` — primary accent
- Blue `#7FB6FF` — secondary accent
- Green `#BAF3D2` / `#86EFAC` — success/positive

## Scope

In scope:

* Add a small urgency badge ("Due today", "Due soon") to `urgent` variant rows with `urgencyTier === "high"` or `urgencyTier === "soon"`.
* The badge should be calm and small — not alarming, not a red notification dot.
* Optionally intensify the accent bar color for high-urgency rows (use judgment on whether this looks good alongside the card-type color coding).
* Change applies to `urgent` variant rows only. Used and not-tracked rows are unchanged.
* No data changes. No new props. `urgencyTier` is already on `HomeFeedItem`.

Out of scope:

* Changes to used or not-tracked rows.
* Changes to the timeframe selector or tabs.
* Changes to the hero metrics.
* Adding sound or vibration.
* Changing the accent bar color-coding system for card types.

## Design Direction

### Badge placement

Place the badge inline with the benefit name and card name — immediately below the card name, or as a small chip to the right of the benefit name. Keep it compact.

Suggested copy:
* `urgencyTier === "high"` → `"Due today"` or `"Expires soon"` depending on whether `daysRemaining === 0`
* `urgencyTier === "soon"` → `"Due soon"`
* `urgencyTier === "upcoming"` → no badge

### Badge style

Keep it minimal. Suggested approach:
* A small pill/chip: `text-[10px] font-medium tracking-wide uppercase rounded-full px-2 py-0.5`
* `"high"` tier: amber/gold tint — `bg-[#F7C948]/15 text-[#F7C948]/80` — warm but not alarming
* `"soon"` tier: very subtle — `bg-white/8 text-white/42` — just enough to distinguish from upcoming

Do not use red for urgency. Red is reserved for "Do not track" in this UI.

### Accent bar

The accent bar is currently colored by card type (gold, platinum, etc.). Do not override this with urgency color — it would break the card-type color coding that helps users scan by card. Keep the accent bar as-is.

The badge is the urgency signal. The accent bar is the card identity signal. Keep them separate.

## Files to Change

* `components/home/HomeBenefitRow.tsx` — only file that needs to change

## Tests

Do not invent a test harness. The existing test suite covers pure logic only — no component tests exist. Write no tests for this change.

## Acceptance Criteria

* Unused rows with `urgencyTier === "high"` show a small "Due today" or "Due soon" badge.
* Unused rows with `urgencyTier === "soon"` show a small "Due soon" badge.
* Unused rows with `urgencyTier === "upcoming"` show no badge.
* Used and not-tracked rows are unchanged.
* The badge is calm and small — not alarming.
* The accent bar card-type color coding is preserved.
* Full validation passes:

  ```
  npm test
  npx tsc --noEmit
  npm run lint
  ```

## Validation

```
npm test
npx tsc --noEmit
npm run lint
```

## Final Agent Response Format

### Summary

What was added and where.

### Design Decision

How you handled the badge placement and styling. Why.

### Files Changed

List every file changed.

### Validation

Commands run and results.
