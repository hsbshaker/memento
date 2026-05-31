# Work Order: QA Reminder Delivery End-to-End

## Status

Active

## Agent Role

QA Agent

## Operating Mode

Do not create or use a separate git worktree, hidden worktree, task branch, or alternate repo copy.

Operate directly in the current local repo on the current `dev` branch.

Before making changes or running QA, run:

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

Validate the full reminder delivery MVP end-to-end.

Memento now has:

* A scheduled monthly email reminder digest route.
* Resend-based email delivery.
* A persistent `notifications_enabled` user preference.
* A Settings toggle for email reminders.
* Digest filtering so only opted-in users receive reminder emails.

This QA work order should prove the feature works safely and correctly before we treat it as MVP-ready.

## Product Context

Memento is a premium credit card benefits tracker focused on helping users capture “use it or lose it” value from their cards.

Email reminders are part of the MVP because users should not need to remember to log in just to discover that benefits are expiring.

The shipped MVP behavior should be:

* Users can turn email reminders on or off in Settings.
* Users who opt in can receive a monthly digest email when they have relevant benefits.
* Users who opt out do not receive digest emails.
* Users with no relevant benefits do not receive useless emails.
* The cron job can run safely without sending duplicate, noisy, or unexpected emails.

## Scope

This is primarily a QA and verification task.

In scope:

* Inspect the current reminder digest implementation.
* Inspect the Settings email reminder toggle implementation.
* Verify the digest route honors `notifications_enabled`.
* Verify skipped users are counted correctly.
* Verify the digest route can run safely.
* Verify dry-run or test execution behavior if available.
* Verify Resend delivery behavior if safe to test locally or against a controlled test user.
* Verify validation commands pass.
* Recommend any required fixes or follow-up builder work orders.

Out of scope:

* Building new reminder features.
* Adding digest frequency controls.
* Adding onboarding opt-in prompts.
* Redesigning email templates.
* Redesigning Settings.
* Changing database defaults.
* Adding broad analytics.
* Creating new cron architecture.
* Refactoring unrelated code.

If a serious bug is found, stop and report it clearly. Do not make code changes unless they are tiny, obviously safe QA fixes and the product owner approves.

## Files and Areas to Inspect

Inspect likely relevant files, including:

* `vercel.json`
* `app/api/cron/send-digest/route.ts`
* `app/api/cron/run-reminders/route.ts`
* `lib/reminders/monthly-digest.ts`
* `lib/reminders/monthly-digest-pure.ts`
* `lib/reminders/monthly-digest.test.ts`
* `app/api/settings/notifications/route.ts`
* `app/settings/page.tsx`
* `components/settings/SettingsScreen.tsx`
* `components/settings/NotificationsSection.tsx`
* `supabase/migrations`
* Any email/Resend helper code
* Any digest/reminder eligibility tests

Use repo search for:

* `notifications_enabled`
* `send-digest`
* `run-reminders`
* `Resend`
* `resend`
* `monthly-digest`
* `reminder`
* `digest`
* `cron`
* `dryRun`
* `CRON_SECRET`
* `user_profiles`

## QA Questions to Answer

Answer each question clearly.

### 1. Cron Scheduling

* Is `/api/cron/send-digest` scheduled in `vercel.json`?
* What schedule does it use?
* Is `/api/cron/run-reminders` still scheduled?
* Do the two cron jobs conflict or overlap in a risky way?

### 2. Route Safety

* Is the cron route protected from public/manual abuse?
* Does it require a cron secret, Vercel cron header, or another guard?
* If unprotected, is that acceptable for MVP?
* Can the route accidentally send emails when invoked manually?

### 3. User Preference Behavior

* Does the digest job only send to users with `notifications_enabled = true`?
* Are users with `notifications_enabled = false` skipped?
* What happens if a user has no `user_profiles` row?
* What happens if the setting is `null` or missing?

### 4. Settings Toggle Behavior

* Does Settings read the persisted `notifications_enabled` value?
* Does the toggle update the persisted value?
* Does the UI handle saving/loading state?
* Does the UI handle errors gracefully?
* Does the UI copy accurately describe monthly email reminders?

### 5. Benefit Eligibility

* Does the digest skip users with no relevant benefits?
* Does the digest exclude benefits already used for the current period?
* Which benefits are included in the digest?
* Are expiring/unused benefits grouped correctly?

### 6. Email Send Behavior

* Does the route send email through Resend?
* What happens if Resend fails for one user?
* Does one failed email stop the whole job?
* Does the route return useful counts for attempted, sent, failed, and skipped users?
* Does the email include a useful link back to the app?

### 7. Duplicate Send Risk

* Is there protection against sending duplicate digest emails for the same user/month?
* If yes, how does it work?
* If no, how risky is that for MVP?
* Should duplicate protection be the next builder work order?

### 8. Local / Controlled Test Plan

Create a practical test plan for validating with a controlled test user.

Include steps for:

* User with `notifications_enabled = false`
* User with `notifications_enabled = true`
* User with eligible benefits
* User with no eligible benefits
* Dry-run route call, if available
* Live Resend send, if safe
* Expected route response counts

Do not expose secrets in the report.

## Expected QA Scenarios

Validate or reason through these scenarios:

### Scenario A: Opted-out user

Given:

* User has a valid email
* User has eligible benefits
* `notifications_enabled = false`

Expected:

* User is skipped
* No email is sent
* Skip count reflects email disabled

### Scenario B: Opted-in user with eligible benefits

Given:

* User has a valid email
* User has eligible benefits
* `notifications_enabled = true`

Expected:

* User is eligible
* Email send is attempted
* Successful send increments sent count
* Failed send increments failed count

### Scenario C: Opted-in user with no relevant benefits

Given:

* User has a valid email
* `notifications_enabled = true`
* User has no eligible benefits

Expected:

* No email is sent
* User is skipped as no benefits or not included in digest results
* No empty digest is sent

### Scenario D: Missing email

Given:

* User is opted in
* User has eligible benefits
* User has no valid email address

Expected:

* No email is sent
* User is skipped with a no-email reason if the route tracks this

### Scenario E: Resend failure

Given:

* User is eligible
* Resend fails for that user

Expected:

* Failure is logged or counted
* Job continues processing other users
* Route returns a useful failure count

### Scenario F: Manual route invocation

Given:

* The route is manually invoked outside cron

Expected:

* It is protected, dry-run only, or otherwise safe
* It should not allow random public users to trigger production email sends

## Validation Commands

Run full validation:

```
npm test
npx tsc --noEmit
npm run lint
```

Remember: this repo does not have `npm run typecheck`.

## Expected Output

Produce a QA report with these sections:

### Summary

Short summary of whether the reminder delivery MVP is QA-ready.

### Pass / Fail Decision

State one of:

* Pass
* Pass with follow-ups
* Fail, fix required before MVP

Be direct.

### Evidence

Summarize evidence from code inspection and tests.

Include file paths.

### Scenario Results

For each scenario A–F, state:

* Pass / Fail / Not tested
* Evidence
* Risk or follow-up if applicable

### Route Safety Review

State whether the cron route is safe enough for MVP.

Call out any risk around public invocation, cron auth, dry-run behavior, or duplicate sends.

### Controlled Test Plan

Provide exact manual QA steps for testing with a controlled test user.

Include example commands or URLs, but do not include secrets.

### Validation

List commands run and results:

* `npm test`
* `npx tsc --noEmit`
* `npm run lint`

### Files Changed

List files changed, or say:

No files changed.

### Recommended Next Work Order

Recommend the next builder work order.

Likely candidates:

* Add Reminder Onboarding Opt-In Prompt
* Add Duplicate Digest Send Protection
* Update Reminder Promise Copy
* Add Digest Dry-Run/Test Mode
