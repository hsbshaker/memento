# Work Order: MVP Gap Audit

## Objective

Audit the current Memento app and identify the most important gaps before MVP launch.

## Context

Memento has the core product areas underway: dashboard, wallet, benefits, onboarding, settings, reminders, and Supabase-backed user data. Before continuing feature work, we need a clear view of what is missing, confusing, risky, or incomplete for an MVP.

## Role

Use `agents/roles/discovery-agent.md`.

## Scope

Review:
- `AGENTS.md`
- `app/`
- `components/`
- `lib/`
- `supabase/`
- `docs/`
- `README.md`

## Out of Scope

Do not:
- Edit files
- Redesign screens
- Add new features
- Change schema
- Run migrations

## Requirements

Identify gaps across:
- Core user journey
- Onboarding
- Wallet/card management
- Benefits inventory
- Dashboard/home
- Settings/reminder preferences
- Auth/routing
- Empty/loading/error states
- Mobile responsiveness
- Data integrity
- Supabase/schema risks
- MVP polish

## Acceptance Criteria

Return a prioritized list grouped by:

1. Must fix before MVP
2. Should fix soon after MVP
3. Nice to have later

For each item include:
- Gap
- Why it matters
- Likely files involved
- Recommended fix
- Estimated complexity: Small / Medium / Large

## Validation

No code changes required.

## Required Final Report

Include:
- Status
- Summary
- Prioritized gap list
- Recommended next 3 agent work orders