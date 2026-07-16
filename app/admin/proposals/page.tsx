import Link from "next/link";

import { PROPOSAL_STATUSES } from "@/lib/constants/freshness-schema";
import { getServiceRoleSupabaseClient } from "@/lib/supabase/service-role";

export const dynamic = "force-dynamic";

export default async function AdminProposalsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; investigation?: string }>;
}) {
  const { status: rawStatus, investigation } = await searchParams;
  const status = (PROPOSAL_STATUSES as readonly string[]).includes(rawStatus ?? "")
    ? (rawStatus as string)
    : "needs_review";

  const supabase = getServiceRoleSupabaseClient();
  let query = supabase
    .from("benefit_change_proposals")
    .select("*, cards!inner(display_name)")
    .eq("status", status)
    .order("created_at", { ascending: false })
    .limit(100);
  if (investigation === "1") query = query.eq("investigation_only", true);
  const { data } = await query;
  const proposals = data ?? [];

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Change proposals</h1>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        {PROPOSAL_STATUSES.map((candidate) => (
          <Link
            key={candidate}
            href={`/admin/proposals?status=${candidate}`}
            className={
              candidate === status
                ? "rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground"
                : "rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:bg-hover"
            }
          >
            {candidate}
          </Link>
        ))}
        <Link
          href={`/admin/proposals?status=${status}&investigation=1`}
          className={
            investigation === "1"
              ? "rounded-full bg-warning-muted px-3 py-1 text-xs font-medium text-warning"
              : "rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:bg-hover"
          }
        >
          investigation only
        </Link>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-surface">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted-foreground">
              <th className="px-3 py-2 font-medium">Card</th>
              <th className="px-3 py-2 font-medium">Operation</th>
              <th className="px-3 py-2 font-medium">Change</th>
              <th className="px-3 py-2 font-medium">Confidence</th>
              <th className="px-3 py-2 font-medium">Seen</th>
              <th className="px-3 py-2 font-medium">Rev</th>
              <th className="px-3 py-2 font-medium">Flags</th>
              <th className="px-3 py-2 font-medium">Created</th>
            </tr>
          </thead>
          <tbody>
            {proposals.map((proposal) => {
              const card = proposal.cards as unknown as { display_name: string | null };
              const after = (proposal.after_value ?? {}) as Record<string, unknown>;
              return (
                <tr key={proposal.id as string} className="border-b border-border-muted align-top">
                  <td className="px-3 py-2 text-foreground">{card.display_name}</td>
                  <td className="px-3 py-2">
                    <span
                      className={
                        proposal.operation === "remove" || proposal.operation === "expire"
                          ? "text-destructive"
                          : proposal.operation === "add"
                            ? "text-success"
                            : "text-accent"
                      }
                    >
                      {proposal.operation as string}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <Link
                      href={`/admin/proposals/${proposal.id}`}
                      className="text-accent hover:underline"
                    >
                      {(after.benefit_name as string) ??
                        (proposal.explanation as string).slice(0, 60)}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {Number(proposal.confidence).toFixed(2)}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{proposal.seen_count as number}</td>
                  <td className="px-3 py-2 text-muted-foreground">{proposal.revision as number}</td>
                  <td className="px-3 py-2 text-xs">
                    {proposal.investigation_only ? (
                      <span className="mr-1 rounded bg-warning-muted px-1.5 py-0.5 text-warning">
                        investigation
                      </span>
                    ) : null}
                    {proposal.publish_block_reason ? (
                      <span className="rounded bg-destructive-muted px-1.5 py-0.5 text-destructive">
                        {proposal.publish_block_reason as string}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 text-xs text-subtle-foreground">
                    {new Date(proposal.created_at as string).toISOString().slice(0, 10)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {proposals.length === 0 ? (
          <p className="px-3 py-4 text-sm text-subtle-foreground">No proposals in this state.</p>
        ) : null}
      </div>
    </div>
  );
}
