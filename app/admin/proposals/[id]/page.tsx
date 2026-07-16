import Link from "next/link";
import { notFound } from "next/navigation";

import { ProposalActions } from "@/components/admin/proposal-actions";
import { BENEFIT_SNAPSHOT_KEYS } from "@/lib/benefits/benefit-fields";
import { getServiceRoleSupabaseClient } from "@/lib/supabase/service-role";

export const dynamic = "force-dynamic";

const formatValue = (value: unknown): string => {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
};

export default async function AdminProposalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = getServiceRoleSupabaseClient();

  const { data: proposal } = await supabase
    .from("benefit_change_proposals")
    .select("*, cards!inner(display_name)")
    .eq("id", id)
    .maybeSingle();
  if (!proposal) notFound();

  const [eventsRes, historyRes, revisionsRes] = await Promise.all([
    supabase
      .from("proposal_events")
      .select("*")
      .eq("proposal_id", id)
      .order("created_at", { ascending: true }),
    proposal.benefit_id
      ? supabase
          .from("benefit_history")
          .select("id, change_type, change_summary, content_version, verified_at, benefit_value")
          .eq("benefit_id", proposal.benefit_id)
          .order("verified_at", { ascending: false })
          .limit(10)
      : Promise.resolve({ data: [] }),
    supabase
      .from("benefit_change_proposals")
      .select("id, revision, status, created_at")
      .eq("dedupe_key", proposal.dedupe_key)
      .order("revision", { ascending: true }),
  ]);

  const events = eventsRes.data ?? [];
  const history = (historyRes.data ?? []) as Array<Record<string, unknown>>;
  const revisions = revisionsRes.data ?? [];

  const before = (proposal.before_value ?? null) as Record<string, unknown> | null;
  const after = (proposal.after_value ?? null) as Record<string, unknown> | null;
  const edited = (proposal.edited_after_value ?? null) as Record<string, unknown> | null;
  const card = proposal.cards as unknown as { display_name: string | null };
  const removalGate = (proposal.removal_gate ?? null) as Record<string, unknown> | null;

  const diffFields = BENEFIT_SNAPSHOT_KEYS.filter((field) => {
    const beforeValue = before?.[field] ?? null;
    const afterValue = (edited?.[field] ?? after?.[field]) ?? null;
    return beforeValue !== afterValue;
  });

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/proposals" className="text-xs text-accent hover:underline">
          ← Proposals
        </Link>
        <h1 className="mt-1 text-lg font-semibold">
          {(proposal.operation as string).toUpperCase()} — {card.display_name}
        </h1>
        <p className="text-xs text-subtle-foreground">
          status <span className="text-foreground">{proposal.status as string}</span> · confidence{" "}
          {Number(proposal.confidence).toFixed(2)} · seen {proposal.seen_count as number}× ·
          revision {proposal.revision as number} · extractor {proposal.extractor_version as string}
          {proposal.extraction_model ? ` · model ${proposal.extraction_model as string}` : ""}
          {proposal.effective_date ? ` · effective ${proposal.effective_date as string}` : ""}
        </p>
        {proposal.investigation_only ? (
          <p className="mt-1 text-xs text-warning">
            Investigation signal from a secondary source — structurally non-publishable.
          </p>
        ) : null}
        {proposal.publish_block_reason ? (
          <p className="mt-1 text-xs text-destructive">
            Publish blocked: {proposal.publish_block_reason as string}
          </p>
        ) : null}
      </div>

      <section className="rounded-lg border border-border bg-surface p-4">
        <h2 className="text-sm font-semibold">Field diff</h2>
        <table className="mt-2 w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted-foreground">
              <th className="py-1.5 pr-2 font-medium">Field</th>
              <th className="py-1.5 pr-2 font-medium">Production</th>
              <th className="py-1.5 font-medium">Proposed{edited ? " (edited)" : ""}</th>
            </tr>
          </thead>
          <tbody>
            {(diffFields.length > 0 ? diffFields : BENEFIT_SNAPSHOT_KEYS).map((field) => {
              const changed = diffFields.includes(field);
              return (
                <tr key={field} className="border-b border-border-muted">
                  <td className="py-1.5 pr-2 text-muted-foreground">{field}</td>
                  <td className="py-1.5 pr-2 text-foreground">{formatValue(before?.[field])}</td>
                  <td className={`py-1.5 ${changed ? "font-medium text-accent" : "text-foreground"}`}>
                    {formatValue((edited?.[field] ?? after?.[field]) ?? null)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className="rounded-lg border border-border bg-surface p-4">
        <h2 className="text-sm font-semibold">Evidence (immutable)</h2>
        <blockquote className="mt-2 rounded-md border border-border-muted bg-surface-muted p-3 text-sm text-foreground">
          {proposal.evidence_excerpt as string}
        </blockquote>
        <p className="mt-2 text-xs text-subtle-foreground">
          chunk {proposal.evidence_chunk_id as string} · offset {String(proposal.evidence_offset)} ·{" "}
          <a
            href={proposal.source_url as string}
            target="_blank"
            rel="noreferrer noopener"
            className="text-accent hover:underline"
          >
            open source page
          </a>{" "}
          ·{" "}
          <a
            href={`/api/admin/artifacts/${proposal.snapshot_id}`}
            target="_blank"
            rel="noreferrer noopener"
            className="text-accent hover:underline"
          >
            raw artifact (signed)
          </a>
        </p>
        <p className="mt-2 text-sm text-muted-foreground">{proposal.explanation as string}</p>
        {removalGate ? (
          <div className="mt-3 rounded-md border border-border-muted bg-surface-muted p-3 text-xs">
            <span className="font-medium text-foreground">
              Removal gate v{String(removalGate.version)}:{" "}
              <span className={removalGate.passed ? "text-success" : "text-destructive"}>
                {removalGate.passed ? "passed" : "failed"}
              </span>
            </span>
            <span className="ml-2 text-muted-foreground">
              matched: {(removalGate.matched_phrases as string[]).join(", ") || "none"} · negated:{" "}
              {(removalGate.negated_phrases as string[]).join(", ") || "none"}
              {(removalGate.reasons as string[]).length > 0
                ? ` · reasons: ${(removalGate.reasons as string[]).join(", ")}`
                : ""}
            </span>
          </div>
        ) : null}
      </section>

      <ProposalActions
        proposalId={id}
        status={proposal.status as string}
        afterValue={after}
      />

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-surface p-4">
          <h2 className="text-sm font-semibold">Audit trail</h2>
          <ul className="mt-2 space-y-1.5 text-xs">
            {events.map((event) => (
              <li key={event.id as string} className="text-muted-foreground">
                <span className="text-subtle-foreground">
                  {new Date(event.created_at as string).toISOString()}
                </span>{" "}
                <span className="font-medium text-foreground">{event.event_type as string}</span>{" "}
                by {event.actor as string}
                {event.detail ? (
                  <span className="block break-all text-subtle-foreground">
                    {JSON.stringify(event.detail)}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
          {revisions.length > 1 ? (
            <div className="mt-3 border-t border-border-muted pt-2 text-xs text-muted-foreground">
              Revision chain:{" "}
              {revisions.map((rev, index) => (
                <span key={rev.id as string}>
                  {index > 0 ? " → " : ""}
                  <Link href={`/admin/proposals/${rev.id}`} className="text-accent hover:underline">
                    r{rev.revision as number} ({rev.status as string})
                  </Link>
                </span>
              ))}
            </div>
          ) : null}
        </div>

        <div className="rounded-lg border border-border bg-surface p-4">
          <h2 className="text-sm font-semibold">Prior versions (benefit_history)</h2>
          <ul className="mt-2 space-y-1.5 text-xs">
            {history.map((row) => (
              <li key={row.id as string} className="text-muted-foreground">
                <span className="text-subtle-foreground">
                  {new Date(row.verified_at as string).toISOString().slice(0, 10)}
                </span>{" "}
                <span className="font-medium text-foreground">{row.change_type as string}</span> · v
                {String(row.content_version ?? "?")} · {formatValue(row.benefit_value)}
                {row.change_summary ? (
                  <span className="block truncate text-subtle-foreground">
                    {row.change_summary as string}
                  </span>
                ) : null}
              </li>
            ))}
            {history.length === 0 ? (
              <li className="text-subtle-foreground">No history (new benefit).</li>
            ) : null}
          </ul>
        </div>
      </section>
    </div>
  );
}
