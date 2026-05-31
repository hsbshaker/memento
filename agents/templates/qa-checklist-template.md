# QA Checklist: [Task Name]

## QA Objective

Validate that the completed change satisfies the work order, does not introduce regressions, and is safe to merge.

## Work Order

- Work order file: `agents/active/[work-order-file].md`
- Branch under test: `[branch-name]`
- Builder report: [Paste or link to builder report if available]

## Files To Review

Changed files:

- `[file]`
- `[file]`
- `[file]`

Related files to inspect:

- `[file]`
- `[file]`

## Acceptance Criteria Check

From the work order:

- [ ] [Acceptance criterion 1]
- [ ] [Acceptance criterion 2]
- [ ] [Acceptance criterion 3]
- [ ] [Acceptance criterion 4]

Notes:

- [Add notes here]

## Command Validation

Run in this order:

- [ ] `npm test`
- [ ] `npx tsc --noEmit`
- [ ] `npm run lint`

## Command Results

### `npm test`

Result: Pass / Fail / Not run

Notes:

- [Add notes here]

### `npx tsc --noEmit`

Result: Pass / Fail / Not run

Notes:

- [Add notes here]

### `npm run lint`

Result: Pass / Fail / Not run

Notes:

- [Add notes here]
- Clearly identify whether failures are new or pre-existing.

### `npm test`

Result: Pass / Fail / Not run

Notes:

- [Add notes here]

## Manual QA

### Primary Happy Path

- [ ] [Step 1]
- [ ] [Step 2]
- [ ] [Step 3]
- [ ] Expected result occurs

Notes:

- [Add notes here]

### Edge Case

- [ ] [Edge case step 1]
- [ ] [Edge case step 2]
- [ ] Expected result occurs

Notes:

- [Add notes here]

### Empty State

- [ ] Empty state is reachable, if relevant
- [ ] Empty state copy is clear
- [ ] Empty state primary action works
- [ ] No dead end or 404 occurs

Notes:

- [Add notes here]

### Error State

- [ ] Error state is handled, if relevant
- [ ] Error message is understandable
- [ ] User has a recovery path

Notes:

- [Add notes here]

### Loading State

- [ ] Loading state appears when relevant
- [ ] Loading state does not create unnecessary delay
- [ ] Loading state resolves correctly

Notes:

- [Add notes here]

### Auth Behavior

- [ ] Authenticated user behavior works
- [ ] Unauthenticated user behavior works, if relevant
- [ ] Redirects are correct
- [ ] No sensitive debug details are exposed

Notes:

- [Add notes here]

### Mobile / Responsive Behavior

- [ ] Narrow viewport works
- [ ] Controls remain usable
- [ ] No horizontal overflow
- [ ] Primary action remains visible

Notes:

- [Add notes here]

## Scope Review

- [ ] Change only touches files needed for the work order
- [ ] No unrelated redesigns
- [ ] No unrelated refactors
- [ ] No unrelated schema changes
- [ ] No unnecessary dependencies added

Notes:

- [Add notes here]

## UX Review

- [ ] Preserves Memento’s visual direction
- [ ] Keeps the flow simple and obvious
- [ ] Uses clear action-oriented copy
- [ ] Avoids unnecessary cognitive load
- [ ] Maintains premium feel

Notes:

- [Add notes here]

## Technical Review

- [ ] Code is readable
- [ ] Code is maintainable
- [ ] Existing patterns are reused where practical
- [ ] No obvious data safety issue
- [ ] No obvious Supabase/RLS/service-role risk
- [ ] No dead code introduced
- [ ] No duplicate logic introduced

Notes:

- [Add notes here]

## Issues Found

### Blocking Issues

- [Issue, file/location, recommended fix]

### Non-Blocking Issues

- [Issue, file/location, recommended fix]

### Pre-Existing Issues

- [Issue, file/location, evidence it is pre-existing]

## QA Status

Choose one:

- Pass
- Partial
- Fail

## Recommendation

Choose one:

- Approve for merge
- Approve with follow-up
- Request changes
- Block merge

## Follow-Up Work Orders

- [Recommended follow-up work order]
- [Recommended follow-up work order]

## Final Notes

[Add any final QA notes here.]