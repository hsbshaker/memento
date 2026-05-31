# Memento Testing Commands

## Purpose

This document explains the validation commands used in the Memento repo.

Agents should read this file before reporting that a task is complete. The goal is to keep validation consistent across ChatGPT, Codex, Claude Code, and human development work.

## Standard Validation Flow

For most code changes, run these commands in this order:

    npm test
    npx tsc --noEmit
    npm run lint

Recommended interpretation:

1. `npm test` should pass.
2. `npx tsc --noEmit` should pass.
3. `npm run lint` should be run and reported honestly, even if known pre-existing lint issues remain.

## Available Commands

### `npm test`

Runs the repo’s test suite.

    npm test

Current behavior:

- Uses Node’s test runner through `tsx --test`.
- Should be run for most code changes.
- Passing tests do not guarantee the UI works, but they catch important business-logic regressions.

Expected successful output should show all tests passing, such as:

    tests 28
    pass 28
    fail 0

The exact number of tests may change over time.

## TypeScript Validation

### `npx tsc --noEmit`

Runs TypeScript validation without emitting compiled files.

    npx tsc --noEmit

Use this because the repo currently does not define a dedicated `npm run typecheck` script.

If this command passes with no output, TypeScript validation passed.

### `npm run typecheck`

Do not assume this command exists.

As of the current repo state, `package.json` does not define a `typecheck` script. Agents may attempt it only if instructed by a work order or after confirming it exists in `package.json`.

If unavailable, use:

    npx tsc --noEmit

## Lint Validation

### `npm run lint`

Runs ESLint.

    npm run lint

Agents should run this command and report results honestly.

Known current behavior:

- Lint may fail because of pre-existing issues unrelated to the current change.
- Agents must clearly distinguish pre-existing lint failures from failures introduced by their branch.

Known pre-existing lint issues have included:

- `app/onboarding/confirm-benefits/page.tsx`
  - `Date.now()` called during render
  - Related to the hardcoded confirm-benefits delay
- `components/wallet/BenefitDetailOverlay.tsx`
  - Synchronous state update inside an effect
- `components/landing/HowItWorksSection.tsx`
  - Unused variable warning
- `scripts/memento_import_master_cards_and_benefits.ts`
  - Unused variable warning

This list may become stale. Always trust the current command output over this document.

## Manual QA

Automated checks are not enough for UI or flow changes.

For UI changes, agents should also provide manual QA steps that cover:

- Primary happy path
- Empty state
- Error or failure state, if practical
- Loading state, if relevant
- Authenticated and unauthenticated behavior, if relevant
- Mobile or narrow viewport behavior, if UI layout changed
- Confirmation that no unrelated screen or flow changed

## Recommended Validation by Task Type

### Documentation-only changes

For documentation-only changes, run at minimum:

    git diff -- [changed-doc-file]

Optional but recommended:

    npm test
    npx tsc --noEmit

Do not modify app code as part of documentation-only validation.

### Small UI or routing changes

Run:

    npm test
    npx tsc --noEmit
    npm run lint

Also perform manual QA for the changed flow.

### API, data, Supabase, or server-side changes

Run:

    npm test
    npx tsc --noEmit
    npm run lint

Also inspect:

- Auth behavior
- User-scoped data access
- Service-role usage
- RLS assumptions
- Error handling
- Any affected API response shape

### Reminder, cron, or email-related changes

Run:

    npm test
    npx tsc --noEmit
    npm run lint

Also review:

- `docs/cron-runner-tests.md`
- `docs/deploy-and-cron-tests.md`
- `vercel.json`
- Relevant `app/api/cron/*` route files

Manual validation should confirm whether the task only updates reminder schedules/logs or actually sends user-facing reminders.

## Reporting Requirements for Agents

When an agent completes a task, it must report:

- Commands run
- Whether each command passed or failed
- Any failed checks
- Whether failures appear new or pre-existing
- Manual QA completed
- Manual QA still recommended for the user

Example:

    Validation Commands Run:
    - npm test — passed
    - npx tsc --noEmit — passed
    - npm run lint — failed on pre-existing issues in app/onboarding/confirm-benefits/page.tsx and components/wallet/BenefitDetailOverlay.tsx

    Manual QA Recommended:
    - Visit Home with no cards
    - Click Add card CTA
    - Confirm Wallet add-card modal opens

## Rules for Agents

- Do not claim validation passed if a command was not run.
- Do not ignore failed commands.
- Do not fix unrelated lint failures inside a scoped task unless the work order explicitly asks for it.
- Do not introduce or modify test scripts without explicit approval.
- Do not run destructive commands.
- If validation cannot be completed, explain exactly why.