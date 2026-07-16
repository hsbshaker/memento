import Link from "next/link";

import { getMonitorLimits } from "@/lib/freshness/constants";
import { computeStaleness } from "@/lib/freshness/staleness";
import type { StalenessState } from "@/lib/constants/freshness-schema";
import { getServiceRoleSupabaseClient } from "@/lib/supabase/service-role";

export const dynamic = "force-dynamic";

/** Health dashboard: staleness, coverage gaps, pending review, recent runs. */
export default async function AdminHealthPage() {
  const supabase = getServiceRoleSupabaseClient();
  const limits = getMonitorLimits();
  const now = new Date();

  const [sourcesRes, benefitsRes, linksRes, cardsRes, proposalsRes, runsRes] = await Promise.all([
    supabase
      .from("benefit_sources")
      .select(
        "id, card_id, enabled, authority_level, processing_state, check_cadence_days, consecutive_failure_count, last_content_verified_at",
      ),
    supabase.from("benefits").select("id, card_id, benefit_status"),
    supabase.from("benefit_source_links").select("benefit_id, source_id"),
    supabase.from("cards").select("id, display_name, card_status"),
    supabase
      .from("benefit_change_proposals")
      .select("id, status, investigation_only, publish_block_reason"),
    supabase
      .from("pipeline_runs")
      .select("id, trigger, status, started_at, halted_reason, proposals_created, fetch_failures, suspect_count")
      .order("started_at", { ascending: false })
      .limit(5),
  ]);

  const sources = sourcesRes.data ?? [];
  const benefits = (benefitsRes.data ?? []).filter((b) => b.benefit_status === "active");
  const links = linksRes.data ?? [];
  const cards = (cardsRes.data ?? []).filter((c) => c.card_status !== "retired");
  const proposals = proposalsRes.data ?? [];
  const runs = runsRes.data ?? [];

  const openProposals = proposals.filter((p) => p.status === "needs_review");
  const staleCounts: Record<StalenessState, number> = {
    current: 0,
    verification_due: 0,
    stale: 0,
    source_unavailable: 0,
    review_required: 0,
  };
  const hasOpenBySource = new Set<string>();
  for (const source of sources) {
    if (!source.enabled) continue;
    const state = computeStaleness({
      now,
      lastVerifiedAt: source.last_content_verified_at as string | null,
      cadenceDays: source.check_cadence_days as number,
      consecutiveFailureCount: source.consecutive_failure_count as number,
      failureThreshold: limits.failureAlertThreshold,
      hasOpenProposals: hasOpenBySource.has(source.id as string),
    });
    staleCounts[state] += 1;
  }

  const cardsWithEnabledSources = new Set(
    sources.filter((s) => s.enabled).map((s) => s.card_id as string),
  );
  const cardsWithoutSources = cards.filter((card) => !cardsWithEnabledSources.has(card.id as string));

  const linkedBenefitIds = new Set(links.map((l) => l.benefit_id as string));
  const uncoveredBenefits = benefits.filter((b) => !linkedBenefitIds.has(b.id as string));

  const officialCards = new Set(
    sources
      .filter((s) => s.enabled && s.authority_level === "official")
      .map((s) => s.card_id as string),
  );
  const secondaryOnlyCards = [...cardsWithEnabledSources].filter((cardId) => !officialCards.has(cardId));

  const deadLetterCount = sources.filter((s) => s.processing_state === "dead_letter").length;
  const failingCount = sources.filter(
    (s) => (s.consecutive_failure_count as number) >= limits.failureAlertThreshold,
  ).length;
  const investigationCount = proposals.filter(
    (p) => p.status === "needs_review" && p.investigation_only,
  ).length;
  const haltedRun = runs.find((run) => run.status === "halted");

  const stats: Array<{ label: string; value: number; warn?: boolean }> = [
    { label: "Pending review", value: openProposals.length, warn: openProposals.length > 0 },
    { label: "Investigation signals", value: investigationCount },
    { label: "Sources current", value: staleCounts.current },
    { label: "Verification due", value: staleCounts.verification_due, warn: staleCounts.verification_due > 0 },
    { label: "Stale", value: staleCounts.stale, warn: staleCounts.stale > 0 },
    { label: "Unavailable / failing", value: failingCount, warn: failingCount > 0 },
    { label: "Dead-lettered", value: deadLetterCount, warn: deadLetterCount > 0 },
    { label: "Cards w/o enabled source", value: cardsWithoutSources.length, warn: cardsWithoutSources.length > 0 },
    { label: "Uncovered benefits", value: uncoveredBenefits.length, warn: uncoveredBenefits.length > 0 },
    { label: "Secondary-only cards", value: secondaryOnlyCards.length, warn: secondaryOnlyCards.length > 0 },
  ];

  return (
    <div className="space-y-6">
      {haltedRun ? (
        <div className="rounded-lg border border-border-strong bg-warning-muted p-4 text-sm">
          <span className="font-semibold text-warning">Run halted:</span>{" "}
          <span className="text-foreground">{haltedRun.halted_reason}</span> — mass changes are
          treated as a likely parser/source failure. Review{" "}
          <Link href="/admin/runs" className="text-accent underline">
            recent runs
          </Link>
          .
        </div>
      ) : null}

      <section>
        <h1 className="text-lg font-semibold">Pipeline health</h1>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-lg border border-border bg-surface p-3">
              <div className={`text-2xl font-semibold ${stat.warn ? "text-warning" : "text-foreground"}`}>
                {stat.value}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {cardsWithoutSources.length > 0 ? (
        <section className="rounded-lg border border-border bg-surface p-4">
          <h2 className="text-sm font-semibold">Cards without an enabled source</h2>
          <ul className="mt-2 list-inside list-disc text-sm text-muted-foreground">
            {cardsWithoutSources.slice(0, 15).map((card) => (
              <li key={card.id as string}>{(card.display_name as string) ?? card.id}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="rounded-lg border border-border bg-surface p-4">
        <h2 className="text-sm font-semibold">Recent runs</h2>
        <table className="mt-2 w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted-foreground">
              <th className="py-1.5 pr-2 font-medium">Started</th>
              <th className="py-1.5 pr-2 font-medium">Trigger</th>
              <th className="py-1.5 pr-2 font-medium">Status</th>
              <th className="py-1.5 pr-2 font-medium">Proposals</th>
              <th className="py-1.5 font-medium">Failures / suspect</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((run) => (
              <tr key={run.id as string} className="border-b border-border-muted">
                <td className="py-1.5 pr-2 text-muted-foreground">
                  {new Date(run.started_at as string).toISOString()}
                </td>
                <td className="py-1.5 pr-2">{run.trigger as string}</td>
                <td className={`py-1.5 pr-2 ${run.status === "completed" ? "text-success" : "text-warning"}`}>
                  {run.status as string}
                </td>
                <td className="py-1.5 pr-2">{run.proposals_created as number}</td>
                <td className="py-1.5 text-muted-foreground">
                  {run.fetch_failures as number} / {run.suspect_count as number}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
