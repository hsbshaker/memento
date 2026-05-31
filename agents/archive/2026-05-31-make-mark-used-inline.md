# Work Order: Make "Mark as Used" Directly Accessible on Benefit Rows

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

Add an inline "Mark used" button directly on each unused benefit row so the primary action does not require opening a hidden popover menu.

Currently, the only way to mark a benefit as used is via the `⋯` (`MoreHorizontal`) popover in `HomeBenefitRowMenu`. That trigger is low-contrast, invisible until hover, and has no label. A user landing on the dashboard — especially from a reminder email — has no obvious action to take.

The fix is to surface "Mark used" as a visible inline button on each unused benefit row. The 3-dot menu stays for secondary actions (Do Not Track, Mark as Unused).

## What Is Already Known

The audit has already read and understood the relevant files. Use this as your starting point.

### Current row structure (`HomeBenefitRow.tsx`)

Each row renders:
- A colored left accent bar
- Benefit name + card name
- Three metadata columns: Value | Resets | Cadence
- A `HomeBenefitRowMenu` (3-dot popover) at the far right

The menu for unused benefits currently contains:
- "Mark as Used" (primary)
- "Do Not Track" (muted/secondary)

### Current menu structure (`HomeBenefitRowMenu.tsx`)

Three menu variants:
- `unused` → ["Mark as Used", "Do Not Track"]
- `used` → ["Mark as Unused", "Do Not Track"]
- `not_tracked` → ["Start Tracking"]

### Row variants

- `urgent` — unused, full contrast
- `used` — dimmed, already used this period
- `not_tracked` — most dimmed, user opted out of tracking

### Props already available

`HomeBenefitRow` already receives `onMarkUsed`, `onMarkNotUsed`, `onDoNotTrack`, `onStartTracking` as props. No new data or API changes are needed.

## Scope

In scope:

* Add an inline "Mark used" button to unused (`urgent` variant) benefit rows.
* Keep the 3-dot menu but remove "Mark as Used" from it — it should only contain secondary actions after this change.
* Keep the 3-dot menu for: "Do Not Track" on unused rows, "Mark as Unused" on used rows, "Start Tracking" on not-tracked rows.
* The inline button should be disabled while a mutation is pending.
* The inline button should match the existing design language — do not introduce a new visual style.
* Run full validation.

Out of scope:

* Adding inline buttons to used or not-tracked rows.
* Swipe gestures.
* Changing the used or not-tracked row menu behavior.
* Changing the timeframe selector or tab selector.
* Changing the hero metrics.
* Any data or API changes.

## Design Direction

### Inline button placement

Place the "Mark used" button between the metadata columns and the 3-dot menu, at the right side of the row.

The button should:
* Use the existing `Button` component with `variant="subtle"` and `size="sm"`.
* Be labeled "Mark used" (not "Mark as Used" — keep it short).
* Be disabled and show reduced opacity while `pendingUsage` is true.
* Not appear on `used` or `not_tracked` variant rows.

### 3-dot menu after this change

Remove "Mark as Used" from the `unused` menu variant. The menu for unused rows should only contain "Do Not Track" after this change.

If the menu has only one item ("Do Not Track"), it may feel redundant. Use your judgment:
* If one item feels too sparse for a menu, consider converting "Do Not Track" to a second small text-button inline, making the 3-dot menu unnecessary for unused rows entirely.
* If adding two inline buttons feels too crowded on mobile, keep the 3-dot menu for "Do Not Track" and only surface "Mark used" inline.

The product owner's preference is for the result to feel calm and uncluttered. Do not make the row feel like a toolbar. One inline button ("Mark used") is the priority. Handle "Do Not Track" in whatever way feels least noisy.

### Mobile considerations

The row layout uses a responsive grid (`lg:grid-cols-[...]`). On mobile, the metadata columns stack. The inline button should be visible on mobile without causing layout overflow. Test the layout mentally at narrow widths.

## Files to Change

* `components/home/HomeBenefitRow.tsx` — add inline "Mark used" button for unused variant
* `components/home/HomeBenefitRowMenu.tsx` — remove "Mark as Used" from unused menu variant; adjust if menu becomes single-item
* No changes expected to `HomeBenefitRows.tsx` or `HomeScreen.tsx` unless needed for prop threading

## Tests

Do not invent a test harness. Only add tests if there is an existing pattern in the repo that clearly applies to what you are building. The existing test suite covers pure logic only — no component tests exist. Write no tests for this change.

## Acceptance Criteria

* Unused benefit rows show a visible "Mark used" button without opening any menu.
* Tapping "Mark used" triggers the same `onMarkUsed` handler as before.
* The button is disabled while a mutation is pending.
* The 3-dot menu no longer contains "Mark as Used" for unused rows.
* Used and not-tracked rows are unchanged.
* The row does not feel like a toolbar — calm and uncluttered.
* Full validation passes:

  ```
  npm test
  npx tsc --noEmit
  npm run lint
  ```

## Validation

Run:

```
npm test
npx tsc --noEmit
npm run lint
```

Remember: this repo does not have `npm run typecheck`.

## Final Agent Response Format

### Summary

Briefly explain what was changed.

### Design Decision

Explain how you handled the "Do Not Track" action after removing "Mark as Used" from the menu.

### Files Changed

List every file changed with a short explanation.

### Validation

List commands run and results.
