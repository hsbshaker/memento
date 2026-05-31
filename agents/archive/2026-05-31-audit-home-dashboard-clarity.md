# Work Order: Audit Home Dashboard Clarity

## Status

Active

## Agent Role

Discovery Agent

## Operating Mode

Do not create or use a separate git worktree, hidden worktree, task branch, or alternate repo copy.

Operate directly in the current local repo on the current `dev` branch.

Before starting, run:

```
git branch --show-current
git status --short
git worktree list
```

Confirm:

* The current branch is `dev`
* The only worktree is the main repo
* There are no unexpected local changes

This is a discovery and audit task. Do not make code changes. Read, reason, and report.

Do not commit anything.

## Objective

Audit the current home/dashboard experience and produce a clear, specific recommendation for the smallest changes that would make it obvious, premium, and action-oriented.

The email reminder system pulls users back to the app. Once they land on the dashboard, it must instantly answer three questions:

1. What value do I have?
2. What is expiring soon?
3. What should I do next?

If the home page is vague or cluttered, the reminder email did its job but the app still misses the moment.

## Product Context

Memento is a premium credit card benefits tracker focused on helping users capture "use it or lose it" value from their cards.

The product should feel:

* Fast
* Effortless
* Premium
* Obvious
* Calm
* Low-friction

## What Is Already Known About the Current Dashboard

This has already been read and understood. Use this as your starting point.

### Structure

The home page (`app/home/page.tsx`) renders `HomeScreen` which contains:

1. **`WalletHero`** — three stat cards at the top:
   - "Available" — `availableNow` metric, "Ready to use" helper
   - "Coming up" — `resettingSoon` metric, timeframe helper (accent blue)
   - "Used this month" — `capturedThisPeriod` metric, "Captured so far" helper

2. **`HomeBenefitRows`** — the main benefit list below the hero, with:
   - A **tab selector**: Unused | Used | Not Tracked (with counts)
   - A **timeframe selector**: 2W | 1M | 3M | 6M | 1Y
   - Benefit rows, each showing: benefit name, card name, value, resets timing, cadence

3. **`EmptyHomeState`** — shown when the user has no wallet set up. Shows "Build your wallet" with an "Add card" button.

4. **`HomeAllCaughtUpState`** — shown when the active tab has no items. Each tab has its own copy.

### Benefit Row Structure

Each `HomeBenefitRow` shows:
- A colored left accent bar (card-type color coding)
- Benefit name + card name
- Three metadata columns: Value | Resets | Cadence
- A 3-dot menu (Mark used / Mark not used / Do not track / Start tracking)

Rows have three visual states:
- `urgent` — full white opacity, highest contrast
- `used` — dimmed
- `not_tracked` — most dimmed

### Empty State (no wallet)

`EmptyHomeState` shows "Build your wallet" centered, with an "Add card" CTA.

## Audit Questions

Do not recommend broad redesigns. Recommend the smallest changes that improve clarity and actionability.

Inspect all relevant files thoroughly. Answer each question with specific evidence from the code — file paths, component names, copy strings, data fields. Cite file paths and component names. Include line numbers where easy.

### 1. What does the dashboard currently prioritize?

* What is shown first, above the fold?
* Is the most important information (expiring soon, unused value) visually dominant?
* Does the layout put the right thing at the top?

### 2. Is "expiring soon" obvious enough?

* Is there a clear visual signal for benefits expiring in the next 2 weeks vs. the next year?
* Does the default timeframe show the most urgent benefits?
* What is the default timeframe on first load?
* Is urgency communicated at the row level, or only through tab/timeframe selection?
* Is there any urgency indicator (color, label, badge) on individual benefit rows?

### 3. Are used vs. unused benefits clear?

* Is it immediately clear which benefits are unused vs. used?
* Do the tabs make this distinction obvious?
* Is the primary action (Mark as used) easy to discover?
* Is "Mark used" behind a 3-dot menu or directly accessible?

### 4. Is the next best action clear?

* After landing on the dashboard, what is the single most obvious thing a user should do?
* Is there a primary CTA or recommended action surfaced per benefit row?
* Is the "Mark used" action prominent or buried?

### 5. Are empty states good?

* What does a fresh user see right after onboarding (has 1 card, has confirmed benefits, but hasn't used anything)?
* Is the "all caught up" state reassuring or confusing?
* Does the empty state for the Unused tab (when there's nothing expiring) communicate value?

### 6. Does the home page work well after onboarding?

* A user has just completed onboarding and opted in to reminders. They click "Go to dashboard." What do they see?
* Is that first impression clear and motivating?
* Is there any welcome or orientation moment for new users on the home page?

### 7. Post-email landing moment

Email reminders are now live. Assume a user clicks from a reminder email into the app. What should the home page make obvious in the first 5 seconds? Does the current dashboard deliver that? What is missing or buried?

### 8. Hero metrics — are they meaningful?

* What do "Available", "Coming up", and "Used this month" actually mean in context?
* Are these numbers useful to a first-time user?
* Are the metric labels intuitive, or do they require explanation?
* Is the value shown as dollars, count, or something else?

### 9. Benefit row clarity

* Is the information density on each row appropriate?
* Are "Value", "Resets", and "Cadence" the right three columns?
* Is "Cadence" (monthly/quarterly/annual) useful on every row, or is it noise?
* Is "Resets" timing clear? (e.g. "In 6 days" vs "Jan 31")
* Is the 3-dot menu the right UX for the primary action?

## Files to Inspect

Read all of these:

* `components/home/HomeScreen.tsx`
* `components/home/WalletHero.tsx`
* `components/home/HomeBenefitRow.tsx`
* `components/home/HomeBenefitRows.tsx`
* `components/home/HomeBenefitRowMenu.tsx`
* `components/home/EmptyHomeState.tsx`
* `components/home/HomeAllCaughtUpState.tsx`
* `lib/home/build-home-feed.ts`
* `lib/home/home-timeframes.ts`
* `lib/types/server-data.ts` (HomeFeedItem, HomeFeedResult, HomeFeedMetrics)

## Expected Output

Produce a clear audit report with the following sections.

### Summary

One paragraph: is the dashboard currently doing its job? What is the most important gap?

### Answers to QA Questions

Answer each of the 9 questions above with specific evidence. Be direct. Cite file paths and line numbers where relevant.

### Priority Gaps

List the top 3 gaps, ranked by user impact. For each:

* What is the gap
* Why it matters
* What the fix likely involves (component-level, copy-level, or data-level)

### Recommended Builder Work Orders

Propose exactly 3 follow-up builder work orders, in recommended execution order.

For each work order:

* Title
* One-sentence goal
* Key files likely to change
* Estimated scope: Small / Medium / Large

Do not write the full work orders. Just the proposals.

### Risks / Unknowns

List anything that would need product owner input before a builder can start.
