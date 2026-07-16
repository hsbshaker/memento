import { NextResponse } from "next/server";

import { requireAdminForRoute } from "@/lib/auth/require-admin";
import { getServiceRoleSupabaseClient } from "@/lib/supabase/service-role";

export const runtime = "nodejs";

/**
 * POST /api/admin/proposals/[id]/publish — invokes the transactional publish
 * RPC. Expected safety refusals come back as {status:"blocked", reason} with a
 * persisted publish_blocked event; version drift returns {status:"superseded"}.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdminForRoute();
  if (!admin.ok) return admin.response;
  const { id } = await params;

  const supabase = getServiceRoleSupabaseClient();
  const { data, error } = await supabase.rpc("publish_benefit_change_proposal", {
    p_proposal_id: id,
    p_reviewer_email: admin.email,
  });

  if (error) {
    console.error("[freshness] publish RPC failed", { proposalId: id, error: error.message });
    return NextResponse.json({ error: "publish failed" }, { status: 500 });
  }

  return NextResponse.json(data ?? { status: "unknown" });
}
