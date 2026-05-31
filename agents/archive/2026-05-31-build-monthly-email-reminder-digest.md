# Work Order: Build Monthly Email Reminder Digest

## Status

Active

## Agent Role

Builder Agent

## Objective

Build the MVP email reminder delivery path for Memento.

The goal is to make Memento send a real monthly email reminder digest to eligible users using the existing Resend/email infrastructure and Vercel cron scheduling.

This work order should create one reliable production path:

1. A scheduled job runs monthly.
2. The job finds eligible users.
3. The job finds relevant expiring or unused benefits.
4. The job sends a digest email through Resend.
5. The job skips users who should not receive email.
6. The job logs successes, skips, and failures clearly enough to debug.

## Product Context

Memento is a premium credit card benefits tracker focused on helping users capture “use it or lose it” value from their cards.

Core constraints:

* No bank login
* No Plaid
* No card numbers
* No transaction scraping
* Users manually add cards
* System preloads known benefits
* Users confirm which benefits apply to them

The product should feel:

* Fast
* Effortless
* Premium
* Obvious
* Calm
* Low-friction

Email reminders matter because users should not have to remember to log in just to discover that benefits are expiring. The MVP should actively pull users back when there is value to capture.

## Background

Discovery found that reminder delivery is currently partial:

* `run-reminders` is scheduled daily but does not send emails. It only updates database reminder schedules/logs.
* `send-digest` can send emails through Resend but is not scheduled.
* Some product copy already implies users will receive reminders.
* The MVP product decision is to ship real monthly email reminder digest delivery instead of deferring email to Phase 2.

## Scope

Build the smallest reliable monthly email reminder digest.

In scope:

* Inspect the current `send-digest` route and related email/digest code.
* Decide whether `send-digest` is the correct production route for the monthly reminder digest.
* Schedule the monthly reminder digest in `vercel.json`.
* Ensure the route is safe to be called by Vercel cron.
* Ensure the route sends email through Resend using existing project conventions.
* Ensure users are skipped when they should not receive email.
* Ensure users with no relevant benefits are skipped.
* Ensure missing user email addresses are skipped.
* Add clear logging for attempted sends, successful sends, skipped users, and failures.
* Add or update tests where the repo already has useful patterns.
* Preserve existing reminder infrastructure unless a small change is required to make monthly digest delivery work.

Out of scope:

* Settings UI changes
* Reminder on/off toggle UI
* Digest frequency picker
* Per-benefit custom reminder timing
* SMS reminders
* Push notifications
* Notification center
* Large email template redesign
* Landing/onboarding copy updates
* Phase 2 email delivery documentation
* Broad refactors
* Database/RLS changes unless absolutely required and approved before implementation

## Important Product Decision

For MVP, use a monthly reminder digest model.

Do not build complicated reminder personalization yet.

The desired MVP behavior is:

* Memento sends a monthly email reminder digest to eligible users.
* The email highlights relevant benefits that are expiring, unused, or worth attention.
* Users without relevant benefits should not receive a useless email.
* Users without a valid email address should be skipped.
* Users who have an existing preference that clearly disables reminders or email should be skipped.

## Eligibility Rules

Investigate the current database/preferences model before implementing.

Use the safest existing preference field available.

Possible fields to inspect include, but are not limited to:

* `global_reminder_style`
* user profile email preference fields
* reminder preference fields
* digest frequency fields
* benefit-level reminder fields
* any existing reminder schedule/log tables

If a reliable existing preference field exists:

* Honor it.
* Do not send to users who have clearly disabled reminders/email.

If no reliable preference field exists:

* Do not invent a broad, risky default silently.
* Prefer the safest minimal implementation that can be run deliberately and tested.
* Report clearly what preference gap remains for the next settings work order.

Do not add a full settings system in this work order.

## Files and Areas to Inspect

Inspect likely relevant files and folders, including:

* `app/api/cron/send-digest/route.ts`
* `app/api/cron/run-reminders/route.ts`
* `vercel.json`
* `lib/email`
* `lib/digest`
* `lib/reminders`
* `lib/supabase`
* `supabase/migrations`
* `components/settings`
* `app/settings`
* Existing tests related to email, digest, reminders, cron, benefits, or user profiles

Use repo search for:

* `send-digest`
* `run-reminders`
* `Resend`
* `resend`
* `digest`
* `reminder`
* `reminders`
* `cron`
* `global_reminder_style`
* `email`
* `frequency`
* `cadence`
* `notification`
* `user_profiles`
* `reminder_logs`

## Implementation Requirements

### 1. Preserve one clear production path

The codebase currently has both `run-reminders` and `send-digest`.

Do not create a third reminder path.

Use the existing path that best matches monthly email digest delivery. Most likely this is `send-digest`.

If you need to clarify the relationship between the two routes, do so with minimal comments or documentation only where helpful.

### 2. Schedule monthly digest delivery

Update `vercel.json` so the digest email route runs monthly.

Use a conservative monthly schedule.

Make sure the scheduled path matches the actual route path.

Do not remove the existing `run-reminders` cron unless there is a clear reason and you explain it.

### 3. Make cron execution safe

The cron route should be safe for production scheduling.

It should:

* Avoid sending useless empty digests.
* Avoid sending to users without email.
* Avoid sending to users who clearly opted out.
* Handle Resend/API failures without crashing the whole job unnecessarily.
* Return a useful JSON response with counts.

The response should include useful counts such as:

* users considered
* users skipped
* emails attempted
* emails sent
* emails failed

Use the project’s existing response style and error handling patterns.

### 4. Avoid duplicate or noisy sends where feasible

Inspect whether there is an existing digest/reminder log table.

If a log table already exists and is appropriate:

* Use it to avoid duplicate sends for the same digest period if feasible.

If duplicate prevention requires a larger schema change:

* Do not create a large new system in this work order.
* Add a clear note in the final report.
* Keep the implementation conservative.

### 5. Tests

Add or update tests if there are existing test patterns for the touched areas.

Focus tests on:

* users with no eligible benefits are skipped
* users without email are skipped
* users with disabled reminders/email are skipped if an existing preference exists
* eligible users trigger a send attempt
* Resend failure is handled/logged

Do not create a huge test harness if the repo has no useful pattern. Be practical.

### 6. Validation

Run full validation before reporting completion:

```
npm test
npx tsc --noEmit
npm run lint
```

Remember: `npm run typecheck` does not exist in this repo.

## Acceptance Criteria

This work is complete when:

* `send-digest` or the selected production digest route can send monthly reminder digest emails through Resend.
* The digest route is scheduled in `vercel.json`.
* The route skips users who should not receive email.
* The route skips users with no relevant benefits.
* The route returns useful job counts.
* The implementation does not introduce fake settings controls.
* Existing `run-reminders` behavior is not broken.
* Tests are added or updated where practical.
* Full validation passes:

  * `npm test`
  * `npx tsc --noEmit`
  * `npm run lint`

## Final Agent Response Format

When done, report back in this format:

### Summary

Briefly explain what was built.

### Implementation Details

Explain:

* Which route is now the production monthly digest job
* How it is scheduled
* How users are selected
* How benefits are selected
* How emails are sent
* How skips/failures are handled

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

Include whether the next work order should be:

* Minimal Reminder Settings
* QA Reminder Delivery End-to-End
* Copy Updates
