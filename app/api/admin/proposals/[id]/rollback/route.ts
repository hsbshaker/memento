import { NextResponse } from "next/server";

import { requireAdminForRoute } from "@/lib/auth/require-admin";
import { getServiceRoleSupabaseClient } from "@/lib/supabase/service-role";

export const runtime = "nodejs";

/**
 * POST /api/admin/proposals/[id]/rollback — restores the proposal's exact
 * immutable before-state via the transactional rollback RPC. Refuses (with an
 * audited event) if the benefit changed after publication.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdminForRoute();
  if (!admin.ok) return admin.response;
  const { id } = await params;

  const supabase = getServiceRoleSupabaseClient();
  const { data, error } = await supabase.rpc("rollback_published_proposal", {
    p_proposal_id: id,
    p_reviewer_email: admin.email,
  });

  if (error) {
    console.error("[freshness] rollback RPC failed", { proposalId: id, error: error.message });
    return NextResponse.json({ error: "rollback failed" }, { status: 500 });
  }

  return NextResponse.json(data ?? { status: "unknown" });
}
