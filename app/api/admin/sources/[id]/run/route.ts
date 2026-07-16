import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

import { requireAdminForRoute } from "@/lib/auth/require-admin";
import { createProductionMonitorDeps } from "@/lib/freshness/production-deps";
import { runMonitorSources } from "@/lib/freshness/run-monitor";
import { getServiceRoleSupabaseClient } from "@/lib/supabase/service-role";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * POST /api/admin/sources/[id]/run — immediate single-source run (fetch AND,
 * when content changed, extraction) executed synchronously. This is the real
 * "run now"; the schedule-only variant is /recheck.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdminForRoute();
  if (!admin.ok) return admin.response;
  const { id } = await params;

  const supabase = getServiceRoleSupabaseClient();
  const { data: source, error } = await supabase
    .from("benefit_sources")
    .select("id, enabled, processing_state")
    .eq("id", id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!source) return NextResponse.json({ error: "source not found" }, { status: 404 });
  if (!source.enabled) {
    return NextResponse.json({ error: "source is disabled — enable it first" }, { status: 409 });
  }
  if (source.processing_state === "dead_letter") {
    return NextResponse.json(
      { error: "source is dead-lettered — use retry first" },
      { status: 409 },
    );
  }

  // Make the source due right now, then run the orchestrator scoped to it.
  const { error: bumpError } = await supabase
    .from("benefit_sources")
    .update({ next_check_at: new Date().toISOString(), next_retry_at: null })
    .eq("id", id);
  if (bumpError) return NextResponse.json({ error: bumpError.message }, { status: 500 });

  const runId = randomUUID();
  const summary = await runMonitorSources(runId, "single_source", createProductionMonitorDeps(), {
    sourceId: id,
  });
  return NextResponse.json(summary);
}
