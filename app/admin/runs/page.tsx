import { AdminActionButton } from "@/components/admin/admin-action-button";
import { getServiceRoleSupabaseClient } from "@/lib/supabase/service-role";

export const dynamic = "force-dynamic";

export default async function AdminRunsPage() {
  const supabase = getServiceRoleSupabaseClient();
  const { data } = await supabase
    .from("pipeline_runs")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(50);
  const runs = data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Pipeline runs</h1>
        <div className="flex items-center gap-2">
          <AdminActionButton label="Publish due scheduled changes" endpoint="/api/admin/publish-due" />
          <AdminActionButton label="Validate model config" endpoint="/api/admin/validate-config" />
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-surface">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted-foreground">
              <th className="px-3 py-2 font-medium">Started</th>
              <th className="px-3 py-2 font-medium">Trigger</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Checked</th>
              <th className="px-3 py-2 font-medium">304 / changed</th>
              <th className="px-3 py-2 font-medium">Fail / suspect</th>
              <th className="px-3 py-2 font-medium">Extractions</th>
              <th className="px-3 py-2 font-medium">Proposals</th>
              <th className="px-3 py-2 font-medium">Scheduled</th>
              <th className="px-3 py-2 font-medium">Tokens</th>
              <th className="px-3 py-2 font-medium">Est. cost</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((run) => (
              <tr key={run.id as string} className="border-b border-border-muted align-top">
                <td className="px-3 py-2 text-xs text-muted-foreground">
                  {new Date(run.started_at as string).toISOString()}
                </td>
                <td className="px-3 py-2">{run.trigger as string}</td>
                <td className="px-3 py-2">
                  <span
                    className={
                      run.status === "completed"
                        ? "text-success"
                        : run.status === "running"
                          ? "text-muted-foreground"
                          : "text-warning"
                    }
                  >
                    {run.status as string}
                  </span>
                  {run.halted_reason ? (
                    <span className="block max-w-56 truncate text-xs text-destructive">
                      {run.halted_reason as string}
                    </span>
                  ) : null}
                  {run.error ? (
                    <span className="block max-w-56 truncate text-xs text-destructive">
                      {run.error as string}
                    </span>
                  ) : null}
                </td>
                <td className="px-3 py-2 text-muted-foreground">
                  {run.sources_checked as number}/{run.sources_due as number}
                </td>
                <td className="px-3 py-2 text-muted-foreground">
                  {run.not_modified_count as number} / {run.changed_count as number}
                </td>
                <td className="px-3 py-2 text-muted-foreground">
                  {run.fetch_failures as number} / {run.suspect_count as number}
                </td>
                <td className="px-3 py-2 text-muted-foreground">
                  {run.extractions_attempted as number}
                  {(run.extractions_failed as number) > 0
                    ? ` (${run.extractions_failed} failed)`
                    : ""}
                  {(run.extractions_partial as number) > 0
                    ? ` (${run.extractions_partial} partial)`
                    : ""}
                </td>
                <td className="px-3 py-2 text-muted-foreground">
                  {run.proposals_created as number}
                  {(run.proposals_deduped as number) > 0 ? ` (+${run.proposals_deduped} dup)` : ""}
                </td>
                <td className="px-3 py-2 text-muted-foreground">
                  {run.scheduled_published as number} ok / {run.scheduled_failed as number} fail
                </td>
                <td className="px-3 py-2 text-xs text-muted-foreground">
                  {(run.input_tokens as number) + (run.output_tokens as number)}
                </td>
                <td className="px-3 py-2 text-muted-foreground">
                  {run.estimated_cost_usd !== null ? `$${Number(run.estimated_cost_usd).toFixed(4)}` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {runs.length === 0 ? (
          <p className="px-3 py-4 text-sm text-subtle-foreground">No runs yet.</p>
        ) : null}
      </div>
    </div>
  );
}
