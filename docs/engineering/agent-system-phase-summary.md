# Memento Agent System Phase Summary

## Purpose

This document summarizes the agentic development system cleanup completed for Memento.

The goal of this effort was to stop relying on one-off manual prompts across ChatGPT, Codex, Claude Code, and other GenAI tools, and instead create a disciplined agent operating model inside the repo.

The intended workflow is:

1. A human defines a scoped work order.
2. An agent reads `AGENTS.md`, the assigned role file, and the work order.
3. The agent completes a bounded task on a branch.
4. The agent returns a structured final report.
5. QA and/or reviewer agents validate the work.
6. The human reviews, tests, merges, and cleans up.

## Product Context

Memento is a premium credit card benefits tracker focused on helping users capture "use it or lose it" value from their credit cards.

Core product constraints:

* No bank login
* No Plaid
* No card numbers
* No transaction scraping
* Users manually add cards
* The system preloads known benefits
* Users confirm which benefits apply to them

Desired product feel:

* Effortless
* Fast
* Premium
* Obvious
* Calm
* Low-friction

Users should quickly understand:

1. What value they have
2. What is expiring
3. What to do next

## Phase A: Agent Foundation Cleanup

Phase A focused on making the core agent instructions safer, clearer, and more consistent.

### A1. Added Tech Stack Context to `AGENTS.md`

`AGENTS.md` was updated to include a Tech Stack section.

Added context includes:

* Next.js App Router
* TypeScript
* Tailwind CSS
* Supabase, including PostgreSQL, Supabase Auth, and Row Level Security
* Vercel
* npm

It also added a short map of key project areas:

* `app/`
* `components/`
* `lib/`
* `supabase/`
* `docs/`
* `agents/`

Purpose:

* Prevent agents from guessing the stack.
* Help agents orient faster.
* Make clear that the stack should not be changed without explicit authorization.

### A2. Removed Retired UX Archive Docs

The old archived UX files were deleted instead of adding warning headers.

Removed:

* `agents/archive/ux/agent.md`
* `agents/archive/ux/ui-patterns.md`

Reason:

* The archived UX agent granted broad override authority.
* That conflicted with the current rule that agents should preserve Memento's existing visual direction unless explicitly asked to redesign.
* Deleting the files removed the risk of a future agent accidentally using outdated guidance.

### A3. Improved `agents/roles/ux-agent.md`

The UX agent role was expanded from a light advisory role into a structured UX review role.

Key additions:

* Clear primary goal
* Required context
* Specific responsibilities
* Memento UX principles
* Boundaries against casual redesigns
* Review method
* Severity definitions
* Structured output format

The UX agent now produces reports with sections such as:

* UX Verdict
* Summary
* Flow Reviewed
* Files Inspected
* What Is Working
* What Is Confusing or High-Friction
* Recommended Changes
* Copy Suggestions
* Mobile / Responsive Notes
* Risks or Tradeoffs
* Final Recommendation

Purpose:

* Make UX reviews more actionable.
* Require file-grounded recommendations.
* Prevent vague design advice.
* Preserve the current Memento visual system.

### A4. Added QA / Reviewer Handoff Clarification

The QA and reviewer role files were updated to clarify how they relate.

Clarification:

* QA Agent validates behavior, acceptance criteria, commands, manual QA, edge cases, and regressions.
* Reviewer Agent evaluates merge readiness, including correctness, scope, maintainability, product risk, data safety, and code quality.
* For simple low-risk changes, either QA or Reviewer may be enough.
* For medium or high-risk changes, run QA first, then Reviewer.
* Reviewer makes the final merge-readiness recommendation.

Purpose:

* Reduce overlap and confusion.
* Prevent duplicate or conflicting agent judgments.
* Establish a cleaner validation flow.

## Phase B: Engineering Documentation Foundation

Phase B focused on giving agents and humans stronger repo-level orientation docs.

### B1. Created `docs/engineering/codebase-map.md`

Created a full codebase map grounded in actual repo inspection.

The document covers:

* Product summary
* Tech stack
* Top-level repo structure
* App route map
* API route map
* Component map
* Library and service map
* Supabase map
* Agent system map
* Docs map
* Common task guide
* Known risks and caution areas
* Stale or unclear files
* Maintenance notes

Purpose:

* Prevent every new agent from rediscovering the repo from scratch.
* Help agents know where to look before editing.
* Improve consistency across builder, discovery, QA, reviewer, and UX agents.

Important finding:

* `package.json` indicates Next.js 16, while earlier assumptions were more generic.
* The codebase map uses the actual repo state as the source of truth.

### B2. Created `docs/engineering/testing-commands.md`

Created a testing and validation guide for agents and humans.

The document explains:

* Standard validation flow
* `npm test`
* `npx tsc --noEmit`
* `npm run lint`
* Why `npm run typecheck` should not be assumed
* Known pre-existing lint issues
* Manual QA expectations
* Recommended validation by task type
* Reporting requirements for agents

Current standard validation flow for most code changes:

```
npm test
npx tsc --noEmit
npm run lint
```

Important clarification:

* `npm run typecheck` is not currently defined in `package.json`.
* Agents should use `npx tsc --noEmit` for TypeScript validation unless a typecheck script is later added.

Purpose:

* Prevent agents from repeatedly failing on missing scripts.
* Standardize validation reports.
* Make lint failures easier to classify as new or pre-existing.

### B3. Created `docs/engineering/branching-and-merge-rules.md`

Created a branching and merge guide for humans and agents.

The document defines:

* `main` as stable production-ready code
* `dev` as active integration work
* task-specific branches for individual fixes, features, docs, audits, and experiments
* branch naming conventions
* how work orders map to branches
* validation expectations before merge
* merge process
* branch cleanup
* pull request expectations
* emergency fix rules
* rules for `main`

Purpose:

* Keep agent work traceable.
* Reduce branch confusion.
* Establish a consistent merge and cleanup flow.
* Make explicit that agents should not work directly on `main`.

### B4. Rewrote `README.md`

Rewrote the README from generic Next.js boilerplate into a Memento-specific orientation document.

The README now includes:

* Product overview
* Core product constraints
* Tech stack
* Local development setup
* Environment variable names only
* Available npm commands
* Testing and validation guidance
* Repository structure
* Agent workflow
* Important documentation links
* Cron and reminder operations references
* Development guardrails

Important README fixes:

* Absolute local machine links were replaced with repo-relative links.
* Reminder wording was softened to avoid overpromising fully shipped user-facing reminder delivery.
* The README now links to the deeper engineering docs instead of duplicating them.

Purpose:

* Give humans and coding agents a useful first-stop orientation doc.
* Stop agents from reading generic boilerplate and making bad assumptions.
* Connect the new agent operating system docs together.

## Completed Product/Agent Work Order

### Work Order 1: Fix Empty Home CTA

A first small agent implementation task was completed and merged.

Issue:

* The Home empty state CTA pointed to `/wallet/add`, which was a dead or risky path for the empty state.

Fix:

* Updated the CTA to route to `/wallet?addCard=1`.
* Updated Wallet behavior so the existing add-card modal opens when that query param is present.
* Kept the change minimal and reused the existing Wallet add-card flow.

Validation:

* `npm test` passed.
* `npx tsc --noEmit` passed.
* `npm run lint` showed known pre-existing lint issues.
* The change was merged into `dev`.

Purpose:

* Prove the new agentic workflow with a small, bounded implementation task.
* Confirm that scoped work orders can produce clean, reviewable changes.

## Current Agent System Structure

The intended structure is:

```
agents/
  active/
  archive/
  roles/
    builder-agent.md
    discovery-agent.md
    qa-agent.md
    reviewer-agent.md
    ux-agent.md
  templates/
    work-order-template.md
    qa-checklist-template.md
    review-template.md
```

Key docs:

```
AGENTS.md
README.md
docs/engineering/codebase-map.md
docs/engineering/testing-commands.md
docs/engineering/branching-and-merge-rules.md
docs/cron-runner-tests.md
docs/deploy-and-cron-tests.md
```

## Known Follow-Up Needed

### 1. Align `AGENTS.md` Validation Requirements

`AGENTS.md` still references `npm run typecheck`.

But the repo currently does not define that script.

Recommended fix:

* Update `AGENTS.md` to recommend:

  npm test
  npx tsc --noEmit
  npm run lint

* Mention that `npm run typecheck` should only be used if a script is added later.

### 2. Review README for Accuracy After Merge

The README was rewritten and then corrected to:

* Remove absolute local links
* Soften reminder wording
* Keep repo-relative links

Recommended review:

* Confirm all README links resolve on GitHub.
* Confirm README does not overpromise reminder delivery.
* Confirm command list matches `package.json`.

### 3. Decide Whether to Archive Completed Work Orders

Several completed work orders may still live in `agents/active/`.

Recommended next step:

* Create `agents/archive/work-orders/`.
* Move completed work orders there once no longer actively needed.

### 4. Create Product Docs Later

Still missing but useful:

* `docs/product/mvp-scope.md`
* `docs/product/user-journeys.md`
* `docs/product/card-and-benefit-data-model.md`

These should probably wait until the current MVP gaps are resolved or prioritized.

### 5. Continue Product Work

Next product work order originally identified:

* Remove hardcoded confirm-benefits delay.

Context:

* The MVP gap audit found a hardcoded 6.1 second minimum wait in the confirm-benefits onboarding page.
* This also causes current lint failures because `Date.now()` is called during render.
* Removing the forced delay should reduce onboarding friction and likely address part of the known lint issue.

## What Needs Review Now

Claude Code should review the current agent operating system holistically and answer:

1. Are the new and updated docs consistent?
2. Are there contradictions between `AGENTS.md`, README, role files, templates, and engineering docs?
3. Are there remaining references to missing commands like `npm run typecheck`?
4. Are README links repo-relative and GitHub-safe?
5. Does the README overpromise reminder functionality?
6. Are active work orders still appropriate to keep in `agents/active/`, or should completed ones move to archive?
7. Are any docs too verbose, stale, or conflicting?
8. Is the system ready to resume product work with Work Order 2?
