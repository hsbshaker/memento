import { NextResponse } from "next/server";

import { requireAdminForRoute } from "@/lib/auth/require-admin";
import { getServiceRoleSupabaseClient } from "@/lib/supabase/service-role";

export const runtime = "nodejs";

/**
 * POST /api/admin/sources/[id]/recheck — schedules the source for the next
 * cron run (next_check_at = now). For an immediate synchronous check use /run.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdminForRoute();
  if (!admin.ok) return admin.response;
  const { id } = await params;

  const supabase = getServiceRoleSupabaseClient();
  const { data, error } = await supabase
    .from("benefit_sources")
    .update({ next_check_at: new Date().toISOString(), next_retry_at: null })
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "source not found" }, { status: 404 });

  return NextResponse.json({ ok: true });
}
