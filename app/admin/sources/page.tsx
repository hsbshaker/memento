import Link from "next/link";

import { SourceForm } from "@/components/admin/source-form";
import { getMonitorLimits } from "@/lib/freshness/constants";
import { computeStaleness } from "@/lib/freshness/staleness";
import { getServiceRoleSupabaseClient } from "@/lib/supabase/service-role";

export const dynamic = "force-dynamic";

export default async function AdminSourcesPage() {
  const supabase = getServiceRoleSupabaseClient();
  const limits = getMonitorLimits();
  const now = new Date();

  const [sourcesRes, cardsRes, proposalsRes] = await Promise.all([
    supabase
      .from("benefit_sources")
      .select("*, cards!inner(display_name)")
      .order("created_at", { ascending: true }),
    supabase.from("cards").select("id, display_name").order("display_name", { ascending: true }),
    supabase
      .from("benefit_change_proposals")
      .select("source_id")
      .eq("status", "needs_review"),
  ]);

  const sources = sourcesRes.data ?? [];
  const cards = (cardsRes.data ?? []) as Array<{ id: string; display_name: string | null }>;
  const openBySource = new Set((proposalsRes.data ?? []).map((p) => p.source_id as string));

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">Source registry</h1>
      <SourceForm cards={cards} />

      <div className="overflow-x-auto rounded-lg border border-border bg-surface">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted-foreground">
              <th className="px-3 py-2 font-medium">Card / URL</th>
              <th className="px-3 py-2 font-medium">Type</th>
              <th className="px-3 py-2 font-medium">Authority</th>
              <th className="px-3 py-2 font-medium">State</th>
              <th className="px-3 py-2 font-medium">Cadence</th>
              <th className="px-3 py-2 font-medium">Last verified</th>
              <th className="px-3 py-2 font-medium">Failures</th>
              <th className="px-3 py-2 font-medium">Enabled</th>
            </tr>
          </thead>
          <tbody>
            {sources.map((source) => {
              const staleness = computeStaleness({
                now,
                lastVerifiedAt: source.last_content_verified_at as string | null,
                cadenceDays: source.check_cadence_days as number,
                consecutiveFailureCount: source.consecutive_failure_count as number,
                failureThreshold: limits.failureAlertThreshold,
                hasOpenProposals: openBySource.has(source.id as string),
              });
              const card = source.cards as unknown as { display_name: string | null };
              return (
                <tr key={source.id as string} className="border-b border-border-muted align-top">
                  <td className="px-3 py-2">
                    <div className="font-medium text-foreground">{card.display_name}</div>
                    <Link
                      href={`/admin/sources/${source.id}`}
                      className="break-all text-xs text-accent hover:underline"
                    >
                      {source.source_url as string}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{source.source_type as string}</td>
                  <td className="px-3 py-2 text-muted-foreground">{source.authority_level as string}</td>
                  <td className="px-3 py-2">
                    <span
                      className={
                        staleness === "current"
                          ? "text-success"
                          : staleness === "review_required"
                            ? "text-accent"
                            : "text-warning"
                      }
                    >
                      {source.processing_state === "dead_letter" ? "dead_letter" : staleness}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {source.check_cadence_days as number}d
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {source.last_content_verified_at
                      ? new Date(source.last_content_verified_at as string).toISOString().slice(0, 10)
                      : "never"}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {source.consecutive_failure_count as number}
                  </td>
                  <td className="px-3 py-2">
                    <span className={source.enabled ? "text-success" : "text-subtle-foreground"}>
                      {source.enabled ? "yes" : "no"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {sources.length === 0 ? (
          <p className="px-3 py-4 text-sm text-subtle-foreground">
            No sources registered yet. Run the backfill script or register one above.
          </p>
        ) : null}
      </div>
    </div>
  );
}
