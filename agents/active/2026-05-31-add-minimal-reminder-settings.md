# Work Order: Add Minimal Reminder Settings

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

Add a minimal user-facing email reminder setting so users can control whether they receive Memento reminder digest emails.

The monthly email reminder digest now exists and is scheduled. This work order makes that production-safe by adding a persistent opt-out path and ensuring the digest job honors it.

## Product Context

Memento is a premium credit card benefits tracker focused on helping users capture “use it or lose it” value from their cards.

Core product constraints:

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

Email reminders are part of the MVP because users should not need to remember to log in just to discover that benefits are expiring. However, users also need clear control over whether they receive reminder emails.

## Background

The previous work order built the monthly email reminder digest.

Known current gap:

* The digest can send real emails.
* There is no reliable user-facing opt-out setting yet.
* Existing `global_reminder_style` values such as `balanced`, `earlier`, or `minimal` do not clearly mean “disable email.”
* Until this work is complete, the reminder digest lacks proper user preference control.

## Scope

Build the smallest complete reminder settings experience.

In scope:

* Add a persistent user preference for email reminder delivery.
* Add a Settings UI control for email reminders on/off.
* Ensure the monthly digest job respects the email reminder preference.
* Ensure users who opt out do not receive digest emails.
* Preserve the existing monthly digest behavior for users who are opted in.
* Keep Settings simple and premium.
* Add or update tests where practical.
* Run full validation.

Out of scope:

* Bi-weekly reminder delivery
* Quarterly reminder delivery
* Digest frequency picker, unless an existing backend preference already fully supports it with minimal changes
* Per-benefit reminder controls
* SMS reminders
* Push notifications
* Notification center
* Email unsubscribe footer overhaul
* Full email preference center
* Landing/onboarding copy updates
* Large Settings redesign
* Broad refactors

## Product Decision

For MVP, build:

* Email reminders: On / Off

Do not build a frequency picker yet unless the existing database and email job already support it cleanly.

Reason: the current production reminder path is monthly. A frequency picker that offers bi-weekly or quarterly options would create a promise the backend may not honor yet.

If a frequency field already exists and is easy to preserve, keep it internally. But the user-facing MVP setting should be simple unless the full behavior is actually wired end-to-end.

## Desired User Experience

Settings should include a clear reminder section.

Suggested copy direction:

Title:

```
Email reminders
```

Description:

```
Get a monthly email summary when you have card benefits worth using soon.
```

Control:

```
Email reminders
```

States:

* On
* Off

If On:

```
Memento may email you a monthly reminder digest when you have relevant benefits to use.
```

If Off:

```
You will not receive monthly reminder digest emails. You can still track benefits in the app.
```

Keep the UI calm and simple. Do not over-explain.

## Data Model Requirements

Investigate the current user profile/settings schema first.

Look for existing fields such as:

* `global_reminder_style`
* email preference fields
* digest preference fields
* reminder preference fields
* user profile settings
* notification settings

If a suitable boolean preference already exists:

* Use it.
* Make sure the Settings UI reads and writes it.
* Make sure `send-digest` honors it.

If no suitable preference exists:

* Add the smallest appropriate database field.

* Prefer a clear boolean name such as:

  email_reminders_enabled

* Default should be chosen deliberately.

Recommended default:

* For new users: enabled by default if the product clearly tells users during onboarding that email reminders are part of Memento.
* For existing users/pre-launch data: enabled is acceptable only if this app is still pre-launch/test-user only.
* If there are real production users, consider defaulting to disabled until explicit opt-in.

If a migration is required:

* Add a Supabase migration.
* Update generated or hand-maintained database types if this repo has that pattern.
* Keep the migration narrow.

## Backend Requirements

Update the monthly digest route or digest selection logic so it honors the email reminder preference.

The digest job should skip users when:

* The user has no valid email address.
* The user has no relevant digest benefits.
* The user has email reminders disabled.

The digest route response should keep useful counts, including skipped users.

If possible, distinguish skip reasons in logs or counters, such as:

* skippedNoEmail
* skippedNoBenefits
* skippedEmailDisabled

Do not break the existing digest job counts added in the prior work.

## Settings UI Requirements

Inspect the current Settings page and components.

Likely files:

* `app/settings/page.tsx`
* `components/settings/SettingsScreen.tsx`
* Any settings API routes
* Any settings service functions
* Any user profile update helpers

Add the reminder setting in the smallest clean way.

The Settings page should not look like a huge preference center. Keep it minimal.

The setting must be real:

* It reads current persisted value.
* It updates persisted value.
* It handles loading/saving state.
* It handles errors gracefully.
* It does not show fake frequency options that are not honored by the backend.

## API / Server Action Requirements

Follow existing project conventions.

If settings are currently updated through API routes, use that pattern.

If settings are updated through server actions or service functions, use that pattern.

Do not introduce a new architectural style unnecessarily.

The update path should:

* Require authenticated user context.
* Update only the current user’s preference.
* Respect existing Supabase/RLS conventions.
* Return clear success/error responses.

## Tests

Add or update tests where practical.

Useful tests may include:

* digest eligibility skips users with email reminders disabled
* digest still includes users with email reminders enabled
* settings update persists email reminder preference
* settings UI/service handles preference values correctly

Do not create a huge test harness if the existing repo does not support easy UI testing. Focus on pure/service logic where possible.

## Acceptance Criteria

This work is complete when:

* Users have a clear Settings control for email reminders on/off.
* The setting is persisted.
* The monthly digest job honors the setting.
* Users with email reminders disabled are skipped.
* Users with email reminders enabled can still receive monthly digest emails when they have relevant benefits.
* No fake digest frequency picker is shown unless the backend fully honors it.
* Existing monthly digest behavior remains intact.
* Tests are added or updated where practical.
* Full validation passes:

  npm test
  npx tsc --noEmit
  npm run lint

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

* What preference field is used or added
* Whether a migration was required
* How Settings reads/writes the preference
* How the monthly digest job honors the preference
* What skip behavior was added

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

* QA Reminder Delivery End-to-End
* Reminder Copy Updates
* Digest Frequency Preferences
