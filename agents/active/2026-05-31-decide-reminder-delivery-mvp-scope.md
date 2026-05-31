# Work Order: Decide Reminder Delivery MVP Scope

## Status

Active

## Agent Role

Discovery Agent

## Branch

Use a discovery branch:

    git checkout dev
    git pull origin dev
    git checkout -b discovery/reminder-delivery-mvp-scope

## Objective

Determine what reminder and email delivery behavior exists today in Memento, what the product currently promises to users, and what reminder delivery scope should be included in the MVP.

This is a discovery task only. Do not implement code changes unless explicitly asked after this work order is reviewed.

## Product Context

Memento is a premium credit card benefits tracker focused on helping users capture “use it or lose it” value from their cards.

Core constraints:

- No bank login
- No Plaid
- No card numbers
- No transaction scraping
- Users manually add cards
- System preloads known benefits
- Users confirm which benefits apply to them

The product experience should feel:

- Fast
- Effortless
- Premium
- Obvious
- Calm
- Low-friction

Users should quickly understand:

1. What value they have
2. What is expiring
3. What to do next

Reminder delivery matters because it is directly tied to Memento’s core value proposition. If the app implies email reminders exist but they are not actually shipped, that is an MVP risk.

## Background

A prior audit suggested the reminder system may be partially implemented:

- `run-reminders` may advance schedules and logs but may not send email directly.
- `send-digest` may send email but may not be scheduled in `vercel.json`.
- Settings may not have real user-facing reminder controls.
- Onboarding, success, settings, or README copy may imply reminder behavior that is not fully shipped.
- README wording was softened to avoid overpromising, but product behavior still needs a clear MVP decision.

## Key Questions to Answer

Investigate and answer the following:

1. What exactly does `run-reminders` do today?
   - Does it send emails?
   - Does it only update reminder schedules/logs?
   - What tables does it read/write?
   - What conditions cause it to act?

2. What exactly does `send-digest` do today?
   - Does it send real emails through Resend?
   - What user population does it target?
   - What data does it include?
   - What error handling/logging exists?

3. Which cron jobs are currently scheduled in `vercel.json`?
   - Is `run-reminders` scheduled?
   - Is `send-digest` scheduled?
   - Are there any reminder-related routes that exist but are unscheduled?

4. Do users currently receive real email reminders?
   - If yes, what kind?
   - If no, what pieces are missing?

5. What does the product currently promise?
   - Review onboarding copy.
   - Review confirm-benefits copy.
   - Review success-state copy.
   - Review settings copy.
   - Review dashboard/home/benefits copy if relevant.
   - Identify any places that imply email reminders, digest delivery, automatic reminders, or notification behavior.

6. What user-facing reminder settings exist today?
   - Is there an email reminder on/off control?
   - Is there a digest frequency control?
   - Is there benefit-level reminder configuration?
   - Are these controls wired to persistent data?
   - Are they honored by backend jobs?

7. What should the MVP promise?
   Evaluate these options:

   Option A: Real email reminder delivery before MVP

   Option B: Scheduled and validated digest only before MVP

   Option C: Defer email reminders post-MVP and clean up product copy/settings to avoid overpromising

   Option D: Add minimal reminder settings before MVP:
   - Email reminders on/off
   - Digest frequency or reminder preference
   - Only show frequency/preference controls if email reminders are on

8. What are the next 2–3 builder work orders after this decision?

## Files and Areas to Inspect

Inspect likely relevant files and folders, including but not limited to:

- `app/api/run-reminders`
- `app/api/send-digest`
- `vercel.json`
- `app/onboarding`
- `app/auth/complete`
- `app/settings`
- `components/settings`
- `components/onboarding`
- `components/home`
- `components/benefits`
- `lib/reminders`
- `lib/email`
- `lib/digest`
- `lib/supabase`
- `supabase/migrations`
- `README.md`
- `AGENTS.md`
- `docs/engineering/codebase-map.md`
- Any tests related to reminders, digest, email, settings, onboarding, or benefits

Use repo search broadly for:

- reminder
- reminders
- digest
- email
- resend
- cron
- notification
- notify
- frequency
- cadence
- settings
- run-reminders
- send-digest

## Constraints

Do not:

- Implement feature changes
- Edit product copy
- Add or remove cron jobs
- Add migrations
- Change settings behavior
- Change email behavior
- Refactor unrelated code
- Make broad architectural changes

This is a read-only discovery task unless a tiny documentation note is absolutely necessary. If any file is changed, explain exactly why.

## Expected Output

Produce a discovery report with the following sections:

### 1. Executive Summary

Briefly state whether reminder delivery is currently real, partial, or not shipped.

### 2. Current Backend Behavior

Explain what `run-reminders` does today.

Explain what `send-digest` does today.

Mention whether either sends real email.

### 3. Cron/Scheduling Reality

List the current cron jobs in `vercel.json`.

State whether reminder/digest jobs are scheduled.

### 4. Current User-Facing Promise

List every place where the UI or documentation promises or implies reminder/email/digest behavior.

For each item, include:

- File path
- Exact copy or close paraphrase
- Whether it is accurate, risky, or misleading based on current backend behavior

### 5. Current Settings Reality

Explain what reminder-related settings exist today, if any.

State whether they are persisted and whether backend jobs honor them.

### 6. MVP Scope Options

Evaluate each option:

- Option A: Real email reminder delivery before MVP
- Option B: Scheduled and validated digest only before MVP
- Option C: Defer email reminders post-MVP and clean up copy/settings
- Option D: Minimal reminder settings before MVP

For each option, include:

- Pros
- Cons
- Implementation risk
- Product risk
- Recommendation

### 7. Recommended MVP Decision

Give one clear recommendation.

Be direct. Do not hedge.

### 8. Proposed Builder Work Orders

Recommend the next 2–3 scoped builder work orders.

Each should include:

- Work order title
- Goal
- Scope
- Files likely touched
- Validation required
- Risk level

### 9. Open Questions

List any questions that require product owner input before implementation.

## Validation

Because this is discovery-only, do not run the full validation suite unless code changes are made.

If no code changes are made, run lightweight read-only checks only as needed, such as:

    git status --short
    grep/search commands
    file inspection

If any code or documentation files are changed, run:

    npm test
    npx tsc --noEmit
    npm run lint

## Final Agent Response Format

When done, report back in this format:

### Summary

Short summary of what was discovered.

### Recommendation

One clear MVP recommendation.

### Evidence

Key evidence with file paths.

### Proposed Next Work Orders

List the next 2–3 builder work orders.

### Validation

Commands run and results.

### Files Changed

List files changed, or say:

No files changed.
