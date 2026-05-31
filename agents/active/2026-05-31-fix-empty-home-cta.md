# Work Order: Fix Empty Home CTA

## Objective

Fix the Home empty-state primary CTA so it does not send users to a nonexistent route.

## Context

The MVP gap audit found that `components/home/EmptyHomeState.tsx` points users to `/wallet/add`, but that route does not exist. This creates a dead end for users with no cards, especially new users who land on Home before adding anything.

The goal is to keep the fix minimal and preserve the current Home design.

## Role

Use `agents/roles/builder-agent.md`.

## Scope

Likely files:
- `components/home/EmptyHomeState.tsx`
- `app/wallet/page.tsx`
- `components/wallet/WalletAddCardModal.tsx`
- Any existing wallet route or add-card flow needed to determine the safest destination

## Out of Scope

Do not:
- Redesign the Home page
- Redesign the Wallet page
- Create a new full add-card page unless absolutely necessary
- Change database schema
- Modify Supabase migrations
- Change onboarding behavior
- Touch unrelated files

## Requirements

- Identify the current destination used by the Home empty-state CTA.
- Confirm whether `/wallet/add` exists.
- Replace the dead route with a working existing path or existing add-card flow.
- Prefer the smallest safe fix.
- Preserve Memento’s current visual style.
- Keep the CTA copy clear and action-oriented.
- Do not introduce unrelated UI changes.

## Acceptance Criteria

- A user with no cards can click the Home empty-state primary CTA and reach a working add-card experience.
- The CTA no longer points to `/wallet/add` unless that route is created and fully functional.
- No unrelated Home, Wallet, onboarding, or Settings behavior changes.
- TypeScript and lint pass, or any failures are clearly identified as pre-existing.

## Validation

Run when possible:
- `npm run typecheck`
- `npm run lint`

Manual QA:
- Remove or simulate a user with no wallet cards.
- Visit Home.
- Click the empty-state primary CTA.
- Confirm the user reaches a working card-add path.
- Confirm there is no 404 or dead end.

## Required Final Report

Include:
- Status
- Summary of changes
- Files changed
- Validation commands run
- Any failed checks or known issues
- Manual QA steps completed or recommended