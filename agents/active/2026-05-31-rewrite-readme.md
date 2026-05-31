# Work Order: Rewrite README for Memento

## Objective

Rewrite `README.md` so it accurately explains the Memento repo, product, tech stack, local setup, validation commands, agent workflow, and key documentation.

## Context

The current README is mostly default Next.js boilerplate and does not help humans or agents understand the Memento product or codebase.

Memento is moving toward an agentic development process where ChatGPT, Codex, Claude Code, and other tools can complete scoped work orders. The README should serve as a useful first-stop orientation document for both humans and coding agents.

The README should be concise, practical, and repo-specific. It should not try to duplicate every detail from the engineering docs. Instead, it should summarize the most important information and link to deeper docs.

## Role

Use `agents/roles/builder-agent.md`.

## Source Documents

Before editing `README.md`, inspect:

- `AGENTS.md`
- `docs/engineering/codebase-map.md`
- `docs/engineering/testing-commands.md`
- `docs/engineering/branching-and-merge-rules.md`
- `docs/cron-runner-tests.md`
- `docs/deploy-and-cron-tests.md`
- `package.json`
- Existing `README.md`

## Scope

Update:

- `README.md`

Optional, only if clearly useful:

- Add links from README to existing docs.

## Out of Scope

Do not:

- Change app code
- Change package scripts
- Change dependencies
- Change Supabase schema
- Add migrations
- Modify product behavior
- Rewrite unrelated docs
- Create new documentation files
- Delete existing docs
- Add secrets, keys, tokens, or real environment variable values

## Requirements

The new README should include:

1. Product overview
2. Core product constraints
3. Tech stack
4. Local development setup
5. Required environment variables by name only
6. Available npm commands based on `package.json`
7. Testing and validation commands
8. High-level repository structure
9. Agent workflow overview
10. Links to important docs
11. Cron and reminder operations references
12. Development guardrails

## Acceptance Criteria

The task is complete when:

- `README.md` is Memento-specific, not generic Next.js boilerplate.
- README accurately reflects the actual repo and scripts.
- README links to `AGENTS.md`.
- README links to `docs/engineering/codebase-map.md`.
- README links to `docs/engineering/testing-commands.md`.
- README links to `docs/engineering/branching-and-merge-rules.md`.
- README links to relevant cron/deployment docs if they exist.
- README explains how agents should orient themselves before work.
- README does not expose secrets or include actual env var values.
- README does not claim unsupported behavior.
- No app code or product behavior is changed.

## Suggested README Structure

Use this structure unless repo inspection suggests a better one:

    # Memento

    ## Overview

    ## Core Product Constraints

    ## Tech Stack

    ## Local Development

    ## Environment Variables

    ## Available Commands

    ## Repository Structure

    ## Agent Workflow

    ## Important Documentation

    ## Cron and Reminder Operations

    ## Development Guardrails

## Validation

Run when possible:

- `git diff -- README.md`
- `npm test`
- `npx tsc --noEmit`

Do not run destructive commands.

Since this is a documentation-only task, app validation is optional unless files beyond README are changed.

## Required Final Report

Include:

- Status
- Summary
- Files changed
- Source docs inspected
- Validation commands run
- Any assumptions or uncertainties
- Recommended follow-up docs
- Branch name