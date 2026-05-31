# Work Order: Create Codebase Map

## Objective

Create a clear, accurate codebase map for Memento at `docs/engineering/codebase-map.md`.

The codebase map should help future agents quickly understand the repo structure, key routes, important components, data access patterns, Supabase usage, and where to look when working on common product areas.

## Context

Memento is moving toward an agentic development process where agents complete scoped work orders. Right now, every agent has to rediscover the repo structure from scratch. This wastes time and increases the chance of wrong assumptions.

A codebase map should become the main orientation document for future builder, discovery, QA, reviewer, and UX agents.

## Role

Use `agents/roles/discovery-agent.md`.

## Scope

Inspect and document the current structure of:

- `app/`
- `components/`
- `lib/`
- `supabase/`
- `docs/`
- `agents/`
- `README.md`
- `AGENTS.md`
- `package.json`

Also inspect any root-level project files that help explain the stack, scripts, routes, or architecture.

## Out of Scope

Do not:

- Change app code
- Change database schema
- Add migrations
- Refactor components
- Modify product behavior
- Rewrite README
- Create product roadmap docs
- Delete files
- Modify existing docs unless needed to link to the new codebase map

## Requirements

Create a new file:

- `docs/engineering/codebase-map.md`

If `docs/engineering/` does not exist, create it.

The document should include:

1. Product overview
2. Tech stack summary
3. Top-level folder map
4. Route map for `app/`
5. Component map for `components/`
6. Library/service map for `lib/`
7. Supabase and migration map
8. Agent documentation map
9. Existing docs map
10. Common task guide showing where agents should look for typical work
11. Known risks or areas requiring caution
12. Notes on stale, archived, or unclear files if discovered

## Acceptance Criteria

The task is complete when:

- `docs/engineering/codebase-map.md` exists.
- The document reflects the actual current repo, not generic Next.js assumptions.
- Key product surfaces are mapped, including onboarding, wallet, benefits, home/dashboard, settings, reminders, auth, and cron/API routes if present.
- The document identifies the main files or folders future agents should inspect for common tasks.
- The document clearly distinguishes active files from archived or stale files where possible.
- No app code, schema, or product behavior is changed.
- Any uncertainty is explicitly labeled instead of guessed.

## Suggested Structure for `docs/engineering/codebase-map.md`

Use this structure unless a better organization becomes obvious during inspection:

```md
# Memento Codebase Map

## Purpose

This document helps agents and humans quickly understand the Memento codebase.

## Product Summary

[Brief product summary.]

## Tech Stack

[Framework, language, styling, database/auth, deployment, package manager.]

## Top-Level Repo Structure

[Folder-by-folder explanation.]

## App Route Map

[Important routes under app/. Include page purpose and key files.]

## API Route Map

[Important API routes under app/api/. Include purpose and risk notes.]

## Component Map

[Important component folders and what they own.]

## Library and Service Map

[Important lib/ files and what they own.]

## Supabase Map

[Migration folder, known table areas, auth/RLS/service-role notes.]

## Agent System Map

[agents/ folder structure and how future agents should use it.]

## Docs Map

[Existing docs and what each is for.]

## Common Task Guide

Examples:

- If working on Home/Dashboard, inspect: [...]
- If working on Wallet, inspect: [...]
- If working on Benefits, inspect: [...]
- If working on Onboarding, inspect: [...]
- If working on Reminders/Cron, inspect: [...]
- If working on Auth, inspect: [...]
- If working on Supabase/data access, inspect: [...]

## Known Risks and Caution Areas

[List areas that need extra care.]

## Stale or Unclear Files

[List files that appear outdated, archived, duplicated, or unclear.]

## Maintenance Notes

Explain that this document should be updated when routes, core folders, or major architecture patterns change.

## Validation

Run when possible:

git diff -- docs/engineering/codebase-map.md
npm test
npx tsc --noEmit

Do not run destructive commands.

This is primarily a documentation task, so app validation is optional unless the agent changes something beyond docs.

## Required Final Report

Include:
Status
Summary
Files changed
How the repo was inspected
Validation commands run
Any uncertainties or assumptions
Recommended follow-up docs
Branch name


## Step 2: Commit the work order

Run:

```bash
git add agents/active/2026-05-31-create-codebase-map.md
git commit -m "Add work order to create codebase map"
git push origin dev