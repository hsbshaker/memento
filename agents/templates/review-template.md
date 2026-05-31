# Review: [Task Name]

## Review Objective

Review the completed work against the assigned work order and decide whether it is safe to merge.

## Work Order

- Work order file: `agents/active/[work-order-file].md`
- Branch reviewed: `[branch-name]`
- Builder report: [Paste or link to builder report if available]

## Files Reviewed

Changed files:

- `[file]`
- `[file]`
- `[file]`

Related files inspected:

- `[file]`
- `[file]`

## Review Verdict

Choose one:

- Approve for merge
- Approve with follow-up
- Request changes
- Block merge

## Summary

[Briefly explain the review outcome.]

## Acceptance Criteria Review

From the work order:

| Acceptance Criterion | Result | Notes |
|---|---|---|
| [Criterion 1] | Pass / Fail / Partial / Not verified | [Notes] |
| [Criterion 2] | Pass / Fail / Partial / Not verified | [Notes] |
| [Criterion 3] | Pass / Fail / Partial / Not verified | [Notes] |

## Scope Review

Check whether the work stayed within the assigned scope.

- [ ] Only relevant files changed
- [ ] No unrelated redesigns
- [ ] No unrelated refactors
- [ ] No unrelated schema changes
- [ ] No unnecessary dependencies added
- [ ] No unrelated product behavior changed

Notes:

- [Add notes here]

## UX Review

Evaluate whether the change preserves or improves the intended Memento experience.

- [ ] Preserves Memento’s current visual direction
- [ ] Keeps the flow calm, simple, and premium
- [ ] Makes the next action clear
- [ ] Avoids unnecessary cognitive load
- [ ] Handles empty/loading/error states when relevant
- [ ] Works on mobile or narrow viewports when relevant

Notes:

- [Add notes here]

## Technical Review

Evaluate implementation quality and integration risk.

- [ ] Code is readable
- [ ] Code is maintainable
- [ ] Existing app patterns are reused
- [ ] No avoidable duplication introduced
- [ ] No dead code introduced
- [ ] No fragile logic introduced
- [ ] No TypeScript issues introduced
- [ ] No obvious performance issue introduced

Notes:

- [Add notes here]

## Data / Auth / Security Review

Complete when relevant.

- [ ] User-scoped data access remains safe
- [ ] No inappropriate service-role usage introduced
- [ ] No Supabase schema or migration changes unless explicitly required
- [ ] No sensitive debug details exposed to users
- [ ] Authenticated and unauthenticated behavior remains correct

Notes:

- [Add notes here]

## Validation Review

Commands reported by the builder or reviewer:

| Command | Result | Notes |
|---|---|---|
| `npm test` | Pass / Fail / Not run | [Notes] |
| `npx tsc --noEmit` | Pass / Fail / Not run | [Notes] |
| `npm run lint` | Pass / Fail / Not run | [Notes] |

If validation failed, identify whether failures are:

- New and caused by this change
- Pre-existing and unrelated
- Unclear

## Major Issues

Blocking or high-risk issues that should prevent merge.

### Issue 1: [Title]

- Severity: Blocking / High
- File/location: `[file/path]`
- Problem: [Explain the issue]
- Why it matters: [Explain user/product/technical impact]
- Recommended fix: [Specific fix]

## Minor Issues

Non-blocking issues that should be addressed soon or in follow-up.

### Issue 1: [Title]

- Severity: Medium / Low
- File/location: `[file/path]`
- Problem: [Explain the issue]
- Why it matters: [Explain impact]
- Recommended fix: [Specific fix]

## Pre-Existing Issues

Issues observed during review that appear unrelated to the current change.

- [Issue, file/location, evidence it is pre-existing]

## Risk Assessment

Remaining risk before merge:

- Low / Medium / High

Reason:

- [Explain the risk level.]

## Recommendation

State exactly what should happen next.

Examples:

- Merge as-is.
- Merge after manual QA.
- Merge after one small follow-up commit.
- Request changes before merge.
- Do not merge until blocking issues are fixed.

## Follow-Up Work Orders

Suggested future work orders:

1. [Work order title and objective]
2. [Work order title and objective]
3. [Work order title and objective]

## Files Changed By Reviewer

Usually:

- None

If the review task explicitly allowed fixes, list changed files here.