# Work Order: Fix BenefitDetailOverlay Lint Error

## Objective

Fix the remaining `setState`-inside-effect lint error in `components/wallet/BenefitDetailOverlay.tsx`.

## Context

The MVP gap audit found one remaining lint error after removing the confirm-benefits forced delay.

Current known issue:

* `components/wallet/BenefitDetailOverlay.tsx`
* Lint rule: calling `setState` synchronously inside an effect
* Current behavior likely syncs `draftConditionalValue` from the selected `benefit` prop inside a `useEffect`

The goal is to resolve this lint error without changing the user-facing behavior of the benefit detail overlay.

## Role

Use `agents/roles/builder-agent.md`.

## Scope

Likely file:

* `components/wallet/BenefitDetailOverlay.tsx`

Related files to inspect only if needed:

* Components or hooks that open/use `BenefitDetailOverlay`
* Types used by the `benefit` prop
* Existing tests if any cover wallet benefit editing

## Out of Scope

Do not:

* Redesign the benefit detail overlay
* Change the wallet page layout
* Change benefit editing behavior
* Change reminder behavior
* Change Supabase queries
* Change schema or migrations
* Modify unrelated lint warnings
* Touch unrelated files
* Add new dependencies

## Requirements

* Remove the synchronous `setState` call inside the effect that currently triggers the lint error.
* Preserve the current behavior of the conditional value draft field.
* Preserve the current save/cancel/edit flow.
* Preserve existing props and public component API unless a minimal internal adjustment is required.
* Keep the change as small as possible.
* Prefer deriving state safely or initializing/resetting state without violating React lint rules.
* Do not introduce broad refactors.

## Acceptance Criteria

The task is complete when:

* `npm run lint` no longer reports the `setState`-inside-effect error in `components/wallet/BenefitDetailOverlay.tsx`.
* No new lint errors are introduced.
* `npm test` passes.
* `npx tsc --noEmit` passes.
* Existing benefit overlay behavior is preserved.
* No unrelated files are modified.

## Validation

Run:

* `npm test`
* `npx tsc --noEmit`
* `npm run lint`

Manual QA recommended:

* Open Wallet.
* Open a card detail or benefit detail overlay.
* Confirm the overlay still opens normally.
* Confirm existing conditional value text appears as expected.
* Edit/save/cancel behavior still works, if available in the overlay.
* Close and reopen the overlay for a different benefit and confirm the draft value does not leak from the previous benefit.

## Required Final Report

Include:

* Status
* Summary of changes
* Files changed
* Validation commands run
* Failed checks or known issues
* Whether the `BenefitDetailOverlay` lint error is gone
* Manual QA completed or recommended
* Risks or follow-up recommendations
* Branch name
