# Work Order: [Task Name]

## Objective

[State the specific change, audit, fix, or investigation the agent must complete.]

## Context

[Explain why this matters for Memento. Include the user problem, product goal, or technical risk.]

## Role

Use `agents/roles/[role-name].md`.

Recommended roles:
- `builder-agent.md` for implementation
- `discovery-agent.md` for investigation only
- `qa-agent.md` for validation
- `reviewer-agent.md` for code/diff review
- `ux-agent.md` for UX review

## Scope

Likely files or areas:

- `[file-or-folder]`
- `[file-or-folder]`
- `[file-or-folder]`

The agent should inspect nearby files as needed, but keep the work focused on the task.

## Out of Scope

Do not:

- [Thing the agent should not touch]
- [Thing the agent should not redesign]
- [Thing the agent should not refactor]
- [Thing the agent should not change in the database/schema]
- [Unrelated product area]

## Requirements

- [Requirement 1]
- [Requirement 2]
- [Requirement 3]
- [Requirement 4]

## Acceptance Criteria

The task is complete when:

- [User-visible expected result]
- [Technical expected result]
- [No-regression expectation]
- [Validation expectation]

## UX Requirements

- Preserve Memento’s current visual direction.
- Keep the experience calm, premium, and simple.
- Avoid introducing disconnected UI patterns.
- Use one clear primary action when applicable.
- Prefer the smallest UX change that solves the problem.

## Engineering Requirements

- Keep the change scoped.
- Do not modify unrelated files.
- Do not introduce new dependencies unless clearly justified.
- Do not change Supabase schema or migrations unless explicitly required.
- Prefer existing routes, components, and patterns.
- Prefer readable, maintainable code over clever abstractions.

## Validation

Run when possible:

- `npm run typecheck`
- `npm run lint`
- `npm test`

If `npm run typecheck` is unavailable, run:

- `npx tsc --noEmit`

Manual QA:

- [Manual QA step 1]
- [Manual QA step 2]
- [Manual QA step 3]

## Required Final Report

Include:

- Status: Complete / Partial / Blocked
- Summary of changes
- Files changed
- Validation commands run
- Failed checks or known issues
- Manual QA steps completed or recommended
- Risks or follow-up recommendations
- Branch name, if applicable