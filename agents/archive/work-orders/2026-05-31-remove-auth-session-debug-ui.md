# Work Order: Remove Auth Session Debug UI

## Objective

Remove the production-facing auth session debug endpoint and the coupled debug UI from the auth completion failure flow.

## Context

The route `app/api/debug/auth-session/route.ts` exposes session diagnostic information such as user email, user ID, and cookie names.

A repo search found that it is still called by `app/auth/complete/page.tsx` when the auth completion poll times out. The page fetches `/api/debug/auth-session` and renders diagnostic session data inline in the browser.

This was useful during development but should not exist in the production user experience. The diagnostic UI does not provide meaningful recovery value because the user already has normal recovery actions such as continuing to the app or returning to login.

## Role

Use `agents/roles/builder-agent.md`.

## Scope

Files likely involved:

- `app/api/debug/auth-session/route.ts`
- `app/auth/complete/page.tsx`

## Out of Scope

Do not:

- Change the main auth flow
- Change Supabase auth logic
- Change login redirects
- Change cookie behavior
- Change environment variables
- Change unrelated debug endpoints
- Change `app/api/debug/env/route.ts`
- Change schema or migrations
- Change package files
- Touch unrelated files

## Requirements

- Delete `app/api/debug/auth-session/route.ts`.
- Remove the fetch call to `/api/debug/auth-session` from `app/auth/complete/page.tsx`.
- Remove the user-facing diagnostic/debug panel from `app/auth/complete/page.tsx`.
- Preserve the existing user-facing auth failure message.
- Preserve existing recovery actions/buttons.
- Keep the auth completion page clean and production-safe.
- Ensure no references to `/api/debug/auth-session` remain in active app code.
- Keep the change as small as possible.

## Acceptance Criteria

The task is complete when:

- `app/api/debug/auth-session/route.ts` is removed.
- `app/auth/complete/page.tsx` no longer fetches `/api/debug/auth-session`.
- `app/auth/complete/page.tsx` no longer renders session debug details such as user email, user ID, cookie names, server session details, or host diagnostics.
- The auth failure state still gives the user a clear recovery path.
- No unrelated auth behavior changes.
- `npm test` passes.
- `npx tsc --noEmit` passes.
- `npm run lint` passes.
- Repo search shows no active references to `/api/debug/auth-session`.

## Validation

Run:

- `grep -R "/api/debug/auth-session" app components lib docs agents README.md`
- `npm test`
- `npx tsc --noEmit`
- `npm run lint`

Manual QA recommended:

- Start the app locally.
- Trigger or simulate auth completion failure if practical.
- Confirm the failure page still shows a clean message and recovery buttons.
- Confirm no debug/session/cookie details are shown to the user.

## Required Final Report

Include:

- Status
- Summary of changes
- Files changed
- References searched
- Validation commands run
- Failed checks or known issues
- Whether any `/api/debug/auth-session` references remain
- Manual QA completed or recommended
- Risks or follow-up recommendations
- Branch name