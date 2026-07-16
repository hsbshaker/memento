import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminActionButton } from "@/components/admin/admin-action-button";
import { LinkManager } from "@/components/admin/link-manager";
import { SourceConfigForm } from "@/components/admin/source-config-form";
import { TestFetchButton } from "@/components/admin/test-fetch-button";
import type { SourceParserConfig } from "@/lib/types/freshness-schema";
import { getServiceRoleSupabaseClient } from "@/lib/supabase/service-role";

export const dynamic = "force-dynamic";

export default async function AdminSourceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = getServiceRoleSupabaseClient();

  const { data: source } = await supabase
    .from("benefit_sources")
    .select("*, cards!inner(id, display_name)")
    .eq("id", id)
    .maybeSingle();
  if (!source) notFound();

  const card = source.cards as unknown as { id: string; display_name: string | null };

  const [snapshotsRes, benefitsRes, linksRes, jobsRes] = await Promise.all([
    supabase
      .from("source_snapshots")
      .select(
        "id, fetched_at, http_status, validation_status, validation_reasons, extraction_outcome, chunk_count, chunks_processed, truncated, artifact_path, normalized_sha256",
      )
      .eq("source_id", id)
      .order("fetched_at", { ascending: false })
      .limit(10),
    supabase
      .from("benefits")
      .select("id, benefit_name, benefit_code, benefit_status")
      .eq("card_id", card.id)
      .order("benefit_name", { ascending: true }),
    supabase.from("benefit_source_links").select("*").eq("source_id", id),
    supabase
      .from("extraction_jobs")
      .select("id, status, reason, attempt_count, next_retry_at, last_error, created_at")
      .eq("source_id", id)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const snapshots = snapshotsRes.data ?? [];
  const linksByBenefit = new Map(
    (linksRes.data ?? []).map((link) => [link.benefit_id as string, link]),
  );
  const benefits = (benefitsRes.data ?? []).map((benefit) => {
    const link = linksByBenefit.get(benefit.id as string);
    return {
      id: benefit.id as string,
      benefit_name: benefit.benefit_name as string | null,
      benefit_code: benefit.benefit_code as string | null,
      benefit_status: benefit.benefit_status as string | null,
      linked: Boolean(link),
      is_primary: Boolean(link?.is_primary),
      coverage_type: (link?.coverage_type as string | null) ?? null,
    };
  });
  const jobs = jobsRes.data ?? [];

  const timestampRows: Array<[string, string | null]> = [
    ["Last checked", source.last_attempted_at as string | null],
    ["Last successful fetch", source.last_successful_at as string | null],
    ["Last content change", source.last_changed_at as string | null],
    ["Last semantic verification", source.last_content_verified_at as string | null],
    ["Next check", source.next_check_at as string | null],
    ["Next retry", source.next_retry_at as string | null],
    ["Lease expires", source.lease_expires_at as string | null],
  ];

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/sources" className="text-xs text-accent hover:underline">
          ← Sources
        </Link>
        <h1 className="mt-1 text-lg font-semibold">{card.display_name}</h1>
        <a
          href={source.source_url as string}
          target="_blank"
          rel="noreferrer noopener"
          className="break-all text-sm text-accent hover:underline"
        >
          {source.source_url as string}
        </a>
        <p className="mt-1 text-xs text-subtle-foreground">
          {source.source_type as string} · {source.authority_level as string} · state{" "}
          {source.processing_state as string} · attempts {source.attempt_count as number} · failures{" "}
          {source.consecutive_failure_count as number} ·{" "}
          {source.enabled ? "enabled" : "disabled"}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <AdminActionButton
          label={source.enabled ? "Disable" : "Enable"}
          endpoint={`/api/admin/sources/${id}`}
          method="PATCH"
          body={{ enabled: !source.enabled }}
          variant={source.enabled ? "destructive" : "primary"}
          confirmText={
            source.enabled
              ? undefined
              : "Enable monitoring for this source? It will be fetched on the next run."
          }
        />
        <AdminActionButton label="Run now" endpoint={`/api/admin/sources/${id}/run`} variant="primary" />
        <AdminActionButton label="Recheck next cron" endpoint={`/api/admin/sources/${id}/recheck`} />
        <AdminActionButton
          label="Retry (reset dead-letter / failed jobs)"
          endpoint={`/api/admin/sources/${id}/retry`}
        />
      </div>

      <TestFetchButton sourceId={id} />

      <SourceConfigForm
        sourceId={id}
        initial={{
          authority_level: source.authority_level as string,
          parser_strategy: source.parser_strategy as string,
          check_cadence_days: source.check_cadence_days as number,
          monthly_full_verification: Boolean(source.monthly_full_verification),
          parser_config: (source.parser_config as SourceParserConfig | null) ?? null,
          notes: source.notes as string | null,
        }}
      />

      <LinkManager sourceId={id} benefits={benefits} />

      <section className="rounded-lg border border-border bg-surface p-4">
        <h2 className="text-sm font-semibold">Recent snapshots</h2>
        <table className="mt-2 w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted-foreground">
              <th className="py-1.5 pr-2 font-medium">Fetched</th>
              <th className="py-1.5 pr-2 font-medium">HTTP</th>
              <th className="py-1.5 pr-2 font-medium">Validation</th>
              <th className="py-1.5 pr-2 font-medium">Extraction</th>
              <th className="py-1.5 pr-2 font-medium">Chunks</th>
              <th className="py-1.5 font-medium">Artifact</th>
            </tr>
          </thead>
          <tbody>
            {snapshots.map((snapshot) => (
              <tr key={snapshot.id as string} className="border-b border-border-muted">
                <td className="py-1.5 pr-2 text-muted-foreground">
                  {new Date(snapshot.fetched_at as string).toISOString()}
                </td>
                <td className="py-1.5 pr-2">{snapshot.http_status as number}</td>
                <td className="py-1.5 pr-2">
                  <span
                    className={snapshot.validation_status === "ok" ? "text-success" : "text-warning"}
                  >
                    {snapshot.validation_status as string}
                  </span>
                  {snapshot.validation_reasons ? (
                    <span className="ml-1 text-xs text-subtle-foreground">
                      {(snapshot.validation_reasons as string[]).join(", ")}
                    </span>
                  ) : null}
                </td>
                <td className="py-1.5 pr-2 text-muted-foreground">
                  {snapshot.extraction_outcome as string}
                  {snapshot.truncated ? " (truncated)" : ""}
                </td>
                <td className="py-1.5 pr-2 text-muted-foreground">
                  {snapshot.chunks_processed ?? 0}/{snapshot.chunk_count ?? 0}
                </td>
                <td className="py-1.5">
                  {snapshot.artifact_path ? (
                    <a
                      href={`/api/admin/artifacts/${snapshot.id}`}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-xs text-accent hover:underline"
                    >
                      signed download
                    </a>
                  ) : (
                    <span className="text-xs text-subtle-foreground">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {snapshots.length === 0 ? (
          <p className="mt-2 text-sm text-subtle-foreground">No snapshots yet.</p>
        ) : null}
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-border bg-surface p-4">
          <h2 className="text-sm font-semibold">Timestamps</h2>
          <dl className="mt-2 space-y-1 text-sm">
            {timestampRows.map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="text-foreground">{value ? new Date(value).toISOString() : "—"}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4">
          <h2 className="text-sm font-semibold">Extraction jobs</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {jobs.map((job) => (
              <li key={job.id as string} className="text-muted-foreground">
                <span
                  className={
                    job.status === "completed"
                      ? "text-success"
                      : job.status === "dead_letter"
                        ? "text-destructive"
                        : "text-warning"
                  }
                >
                  {job.status as string}
                </span>{" "}
                · {job.reason as string} · attempts {job.attempt_count as number}
                {job.last_error ? (
                  <span className="block truncate text-xs text-subtle-foreground">
                    {job.last_error as string}
                  </span>
                ) : null}
              </li>
            ))}
            {jobs.length === 0 ? <li className="text-subtle-foreground">No jobs yet.</li> : null}
          </ul>
        </div>
      </section>
    </div>
  );
}
