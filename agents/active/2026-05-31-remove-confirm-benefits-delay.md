# Work Order: Remove Confirm Benefits Forced Delay

## Objective

Remove the hardcoded 6.1-second minimum wait from the confirm-benefits onboarding page.

## Context

The MVP gap audit found that `app/onboarding/confirm-benefits/page.tsx` forces every user to wait at least 6,100ms before the confirm-benefits screen renders.

This creates unnecessary friction in one of the most important onboarding moments. It also causes two current lint errors because `Date.now()` is called during render.

The goal is to remove the artificial delay while preserving the existing data-loading behavior and UI flow.

## Role

Use `agents/roles/builder-agent.md`.

## Scope

Likely file:

- `app/onboarding/confirm-benefits/page.tsx`

Related file to inspect only if needed:

- `app/onboarding/confirm-benefits/loading.tsx`

## Out of Scope

Do not:

- Redesign the confirm-benefits page
- Rewrite the onboarding flow
- Change benefit confirmation logic
- Change Supabase queries
- Change schema or migrations
- Change reminder behavior
- Modify unrelated lint issues
- Touch unrelated files

## Requirements

- Remove the hardcoded `MIN_MS = 6100` delay.
- Remove the `Date.now()` timing logic.
- Remove the `setTimeout` wait.
- Preserve the existing call to `loadConfirmBenefitsData`.
- Preserve the existing render of `ConfirmBenefitsScreen`.
- Let the page load naturally based on actual data fetching.
- Rely on the existing loading state if the route has one.
- Keep the change as small as possible.

## Acceptance Criteria

The task is complete when:

- The confirm-benefits page no longer waits for a forced 6.1 seconds.
- `Date.now()` is no longer called in `app/onboarding/confirm-benefits/page.tsx`.
- The page still loads confirm-benefits data correctly.
- The page still renders `ConfirmBenefitsScreen` with the loaded data.
- No unrelated onboarding behavior changes.
- `npm test` passes.
- `npx tsc --noEmit` passes.
- `npm run lint` no longer reports the two `Date.now()` errors in `app/onboarding/confirm-benefits/page.tsx`.

## Validation

Run:

- `npm test`
- `npx tsc --noEmit`
- `npm run lint`

Manual QA:

- Start onboarding with a test account.
- Reach the confirm-benefits step.
- Confirm the page no longer pauses for a fixed 6.1 seconds.
- Confirm benefit data still appears.
- Confirm the user can continue through onboarding normally.

## Required Final Report

Include:

- Status
- Summary of changes
- Files changed
- Validation commands run
- Failed checks or known issues
- Whether the `Date.now()` lint errors are gone
- Manual QA completed or recommended
- Risks or follow-up recommendations
- Branch name