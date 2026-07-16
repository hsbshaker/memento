import { NextResponse } from "next/server";

import { requireAdminForRoute } from "@/lib/auth/require-admin";
import { getServiceRoleSupabaseClient } from "@/lib/supabase/service-role";

export const runtime = "nodejs";

/**
 * POST /api/admin/sources/[id]/retry — manual recovery: resets a dead-lettered
 * source and re-queues its dead-lettered/failed extraction jobs (reason
 * manual_retry). Work is picked up by the next run (or an explicit /run).
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
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!source) return NextResponse.json({ error: "source not found" }, { status: 404 });

  const { error: sourceError } = await supabase
    .from("benefit_sources")
    .update({
      processing_state: "idle",
      claimed_by_run_id: null,
      claimed_at: null,
      lease_expires_at: null,
      attempt_count: 0,
      next_retry_at: null,
      consecutive_failure_count: 0,
      next_check_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (sourceError) return NextResponse.json({ error: sourceError.message }, { status: 500 });

  const { data: retriedJobs, error: jobsError } = await supabase
    .from("extraction_jobs")
    .update({
      status: "pending",
      reason: "manual_retry",
      claimed_by_run_id: null,
      claimed_at: null,
      lease_expires_at: null,
      attempt_count: 0,
      next_retry_at: null,
      last_error: null,
    })
    .eq("source_id", id)
    .in("status", ["failed", "dead_letter"])
    .select("id");
  if (jobsError) return NextResponse.json({ error: jobsError.message }, { status: 500 });

  return NextResponse.json({ ok: true, jobsRequeued: retriedJobs?.length ?? 0 });
}
