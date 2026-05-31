# Memento Branching and Merge Rules

## Purpose

This document defines how humans and agents should create branches, complete work, validate changes, merge, and clean up branches in the Memento repo.

The goal is to keep agentic development controlled, traceable, and safe.

## Default Branch Model

Memento uses:

- `main` for stable production-ready code
- `dev` for active integration work
- task-specific branches for individual fixes, features, docs, audits, and experiments

Agents should not work directly on `main`.

Most work should start from `dev`.

## Before Starting Work

Before creating or using a task branch, run:

    git checkout dev
    git pull origin dev
    git status --short

The working tree should be clean before beginning.

If `git status --short` shows modified or untracked files, stop and resolve them before starting new work.

## Branch Naming Convention

Use short, descriptive branch names.

Recommended prefixes:

- `fix/` for bug fixes
- `feat/` for new features
- `docs/` for documentation-only changes
- `qa/` for QA-only validation branches
- `review/` for review-only work
- `chore/` for maintenance
- `codex/` for Codex-created implementation branches
- `claude/` for Claude-created implementation branches

Examples:

    fix/empty-home-cta
    docs/codebase-map
    docs/testing-commands
    codex/fix-empty-home-cta
    claude/rewrite-readme

Prefer names that map clearly to the work order.

## Work Orders and Branches

Every non-trivial agent task should have a work order in:

    agents/active/

The branch should be named after the task or the agent/task combination.

Example:

    agents/active/2026-05-31-fix-empty-home-cta.md
    codex/fix-empty-home-cta

Work orders should include:

- Objective
- Context
- Role
- Scope
- Out of scope
- Requirements
- Acceptance criteria
- Validation
- Required final report

## Working Rules for Agents

Agents must:

- Read `AGENTS.md`
- Read the relevant role file in `agents/roles/`
- Read the assigned work order in `agents/active/`
- Keep changes scoped to the work order
- Avoid unrelated refactors
- Avoid broad redesigns
- Avoid schema or migration changes unless explicitly authorized
- Return a final report with files changed, validation results, risks, and manual QA steps

## Validation Before Merge

Before merging a task branch, run the validation appropriate to the change.

For most code changes:

    npm test
    npx tsc --noEmit
    npm run lint

For documentation-only changes, at minimum inspect the diff:

    git diff -- [changed-file]

See:

    docs/engineering/testing-commands.md

for the full validation guide.

## Handling Known Lint Failures

If `npm run lint` fails, determine whether failures are:

- New and caused by the current branch
- Pre-existing and unrelated
- Unclear

Do not fix unrelated lint failures inside a scoped task unless the work order explicitly asks for it.

Do not claim lint passed if it failed.

## Manual QA Before Merge

For UI and flow changes, perform or recommend manual QA.

Manual QA should cover:

- Primary happy path
- Empty state
- Error state, if practical
- Loading state, if relevant
- Authenticated and unauthenticated behavior, if relevant
- Mobile or narrow viewport behavior, if UI changed
- Confirmation that no unrelated flow changed

## Merge Criteria

A branch is ready to merge when:

- The work order acceptance criteria are satisfied
- The diff is scoped and understandable
- Tests pass, or failures are clearly unrelated and accepted
- TypeScript passes
- Lint is run and failures are understood
- Manual QA is completed or explicitly recommended
- No unrelated product behavior changes are introduced
- No unexpected schema, migration, auth, or data-access changes are included

## Merge Process

From the task branch, confirm clean status:

    git status --short

Then switch to `dev`:

    git checkout dev
    git pull origin dev

Merge the task branch:

    git merge [branch-name]

Push `dev`:

    git push origin dev

Confirm final state:

    git status --short
    git branch --show-current

Expected branch:

    dev

Expected status:

    no output from git status --short

## Branch Cleanup

After a branch is merged into `dev`, delete it locally and remotely.

Delete local branch:

    git branch -d [branch-name]

Delete remote branch:

    git push origin --delete [branch-name]

Only delete branches after confirming the work has been merged.

## Work Order Cleanup

Completed work orders can remain in `agents/active/` temporarily while the task is fresh.

Periodically move completed work orders to:

    agents/archive/

Suggested archive structure:

    agents/archive/work-orders/

Do not delete completed work orders unless they are empty, mistaken, or no longer useful.

## Pull Requests

If using GitHub pull requests:

- Open the PR from the task branch into `dev`
- Include the work order name
- Include summary of changes
- Include validation commands and results
- Include manual QA steps
- Include screenshots for UI changes when useful

Merge only after review and validation.

## Emergency Fixes

For urgent fixes:

- Still branch from `dev` unless production requires otherwise
- Keep the change minimal
- Validate the smallest affected surface
- Document what was skipped and why
- Create follow-up work orders for cleanup if needed

## Rules for `main`

Do not commit directly to `main`.

Changes should reach `main` only after they are tested and accepted from `dev`.

The exact release process from `dev` to `main` can be defined later when Memento’s deployment process is finalized.

## Agent Reminder

When in doubt:

- Stop
- Report the uncertainty
- Ask the user before making broad changes