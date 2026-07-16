import { NextResponse } from "next/server";

import { requireAdminForRoute } from "@/lib/auth/require-admin";
import { getServiceRoleSupabaseClient } from "@/lib/supabase/service-role";

export const runtime = "nodejs";

/**
 * POST /api/admin/publish-due — releases approved effective-dated proposals
 * independently of the monitoring cron. Failures are isolated per proposal
 * inside the RPC.
 */
export async function POST() {
  const admin = await requireAdminForRoute();
  if (!admin.ok) return admin.response;

  const supabase = getServiceRoleSupabaseClient();
  const { data, error } = await supabase.rpc("publish_due_scheduled_proposals");
  if (error) {
    console.error("[freshness] publish-due sweep failed", { error: error.message });
    return NextResponse.json({ error: "sweep failed" }, { status: 500 });
  }
  return NextResponse.json(data ?? { published: 0, failed: 0, skipped: 0 });
}
