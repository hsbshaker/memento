# Work Order: Add Reminder Onboarding Opt-In Prompt

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

The monthly email reminder digest is live. However, `notifications_enabled` defaults to `false` in `user_profiles`, so email reminders are opt-in. Users who complete onboarding and never visit Settings will never receive digest emails — even though the success page already promises them.

This work order closes that gap by adding a real opt-in prompt to the onboarding success page, so users who want reminders can enable them in one tap at the moment they are most engaged.

## Product Context

Memento is a premium credit card benefits tracker focused on helping users capture "use it or lose it" value from their cards.

The product should feel:

* Fast
* Effortless
* Premium
* Obvious
* Calm
* Low-friction

The onboarding success page (`/onboarding/success`) currently:

* Shows a green check badge and "You're all set, {firstName}."
* Promises email reminders in the subtitle: "We'll email you before your benefits expire so you never leave money on the table."
* Lists "Email reminders before credits expire" as a What Happens Next item
* Tells users "You can close this tab - we've got it from here."

The problem: the page makes a promise it cannot keep. `notifications_enabled` defaults to `false`. Users who don't visit Settings will never receive a reminder email.

## Scope

Add a minimal, non-intrusive opt-in prompt to the onboarding success page.

In scope:

* Add an email reminder opt-in action to the success page.
* When the user opts in, set `notifications_enabled = true` in `user_profiles`.
* Update or soften the success page copy to accurately reflect the opt-in model.
* Keep the UI calm, premium, and low-friction.
* Add or update tests where practical.
* Run full validation.

Out of scope:

* Redesigning the success page layout.
* Adding a full preference center.
* Adding frequency controls.
* Adding SMS or push notification opt-ins.
* Changing the default value of `notifications_enabled` in the database.
* Broad onboarding flow changes.
* Adding email unsubscribe flows.

## Product Decision

The opt-in prompt should feel like a natural next step, not a marketing pop-up.

The desired behavior:

* User completes onboarding and lands on the success page.
* The page shows a clear, single opt-in action: enable email reminders.
* If the user taps to enable, `notifications_enabled` is set to `true` immediately.
* If the user skips or closes the tab, nothing changes (`notifications_enabled` stays `false`).
* The user can always change this in Settings later.

Do not make opt-in feel pushy or mandatory. It should feel like a helpful offer.

## Current Success Page

File: `app/onboarding/success/page.tsx`

The page is a server component that:

* Fetches the authenticated user.
* Resolves the user's first name from metadata or email.
* Renders a static success screen with no interactive elements.

The page currently makes a promise about email reminders that it cannot keep:

```
"We'll email you before your benefits expire so you never leave money on the table."
```

This copy needs to be updated to reflect the opt-in model, OR the opt-in prompt needs to be prominent enough that it's clear the user controls whether reminders are sent.

## Desired UX

### Option A: Inline opt-in on the success page (recommended)

Below the "What Happens Next" card, add a simple opt-in prompt:

```
Turn on email reminders

Get a monthly email when you have card benefits worth using. You can turn this off anytime in Settings.

[Turn on reminders]   Skip
```

The "Turn on reminders" button calls the existing `/api/settings/notifications` PATCH endpoint to set `notifications_enabled = true`.

After tapping:
* Show an inline confirmation state: "Reminders on ✓"
* Keep the existing "Go to dashboard" action visible.
* Do not auto-navigate the user away.
* Do not show a modal or overlay.

### Option B: Change the default

Change `notifications_enabled` default to `true` in the database. This would require a migration and is out of scope for this work order.

Use Option A.

## Implementation Notes

### Server vs client

The success page is currently a server component. Adding an interactive opt-in button requires a client component for the button interaction.

Follow the existing pattern in this repo: keep the page as a server component and extract the interactive part into a small `"use client"` component.

### API

Use the existing `/api/settings/notifications` PATCH endpoint:

```
PATCH /api/settings/notifications
Content-Type: application/json

{ "emailRemindersEnabled": true }
```

This endpoint already:

* Requires authenticated user session (server-side cookie auth).
* Updates `notifications_enabled` in `user_profiles` for the current user.
* Returns `{ emailRemindersEnabled: true }` on success.

### Copy updates

Update the success page subtitle. The current subtitle implies emails will be sent automatically, which is not true until the user opts in. Replace it with:

```
Your benefits are tracked. Turn on email reminders to get a monthly nudge when you have value to capture.
```

Do not keep any copy that implies emails will be sent before the user opts in.

### After opt-in

After the user opts in:

* Show an inline confirmation state: "Reminders on ✓"
* Keep the existing "Go to dashboard" action visible.
* Do not auto-navigate the user away.
* Do not show a modal or overlay.

### If `user_profiles` row does not exist

The PATCH endpoint uses `createSupabaseServerClient` which uses the user's session. If no `user_profiles` row exists for the user (edge case), the update will affect 0 rows and return success with no error — `notifications_enabled` will not be set. This is an acceptable edge case for MVP. Do not add special handling.

## Files to Inspect

* `app/onboarding/success/page.tsx` — current success page (server component)
* `app/api/settings/notifications/route.ts` — existing PATCH endpoint
* `components/settings/NotificationsSection.tsx` — existing toggle component for reference
* `components/ui/Button.tsx` or similar — for button styling conventions
* Any existing client components in the onboarding flow for pattern reference

## Tests

Do not invent a test harness. If the repo has no existing UI or component test pattern that covers this type of interaction, write no tests. Only add tests if there is an existing pattern in the repo that clearly applies to what you are building.

## Acceptance Criteria

This work is complete when:

* The onboarding success page includes a real email reminder opt-in prompt.
* Tapping opt-in sets `notifications_enabled = true` via the existing API.
* The success page copy accurately reflects the opt-in model.
* Skipping leaves `notifications_enabled` unchanged.
* The UI is calm, premium, and consistent with the existing success page design.
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

When done, report back in this format:

### Summary

Briefly explain what was built.

### Implementation Details

Explain:

* What component handles the opt-in interaction
* How opt-in is persisted
* What happens after opt-in
* What happens if the user skips

### Product Behavior

Explain the user-facing behavior now supported.

### Files Changed

List every file changed with a short explanation.

### Validation

List commands run and results:

* `npm test`
* `npx tsc --noEmit`
* `npm run lint`

### Risks / Follow-Ups

List any known risks or follow-up work.
