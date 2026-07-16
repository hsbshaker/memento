import { NextResponse } from "next/server";

import { requireAdminForRoute } from "@/lib/auth/require-admin";
import { LINK_COVERAGE_TYPES } from "@/lib/constants/freshness-schema";
import { getServiceRoleSupabaseClient } from "@/lib/supabase/service-role";

export const runtime = "nodejs";

/**
 * benefit_source_links administration.
 * POST   — link a benefit to a source (same card enforced)
 * PATCH  — update is_primary / coverage_type
 * DELETE — unlink
 */

interface LinkBody {
  benefit_id?: string;
  source_id?: string;
  is_primary?: boolean;
  coverage_type?: string;
}

const parseBody = async (request: Request): Promise<LinkBody | null> =>
  (await request.json().catch(() => null)) as LinkBody | null;

const requireIds = (body: LinkBody | null) =>
  body && typeof body.benefit_id === "string" && typeof body.source_id === "string"
    ? { benefitId: body.benefit_id, sourceId: body.source_id }
    : null;

export async function POST(request: Request) {
  const admin = await requireAdminForRoute();
  if (!admin.ok) return admin.response;
  const body = await parseBody(request);
  const ids = requireIds(body);
  if (!ids) {
    return NextResponse.json({ error: "benefit_id and source_id are required" }, { status: 400 });
  }
  const coverage = body?.coverage_type ?? "full";
  if (!(LINK_COVERAGE_TYPES as readonly string[]).includes(coverage)) {
    return NextResponse.json({ error: "invalid coverage_type" }, { status: 400 });
  }

  const supabase = getServiceRoleSupabaseClient();
  const [{ data: benefit }, { data: source }] = await Promise.all([
    supabase.from("benefits").select("id, card_id").eq("id", ids.benefitId).maybeSingle(),
    supabase.from("benefit_sources").select("id, card_id").eq("id", ids.sourceId).maybeSingle(),
  ]);
  if (!benefit || !source) {
    return NextResponse.json({ error: "benefit or source not found" }, { status: 404 });
  }
  if (benefit.card_id !== source.card_id) {
    return NextResponse.json(
      { error: "benefit and source belong to different cards" },
      { status: 400 },
    );
  }

  const { error } = await supabase.from("benefit_source_links").upsert(
    {
      benefit_id: ids.benefitId,
      source_id: ids.sourceId,
      is_primary: body?.is_primary ?? false,
      coverage_type: coverage,
    },
    { onConflict: "benefit_id,source_id" },
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function PATCH(request: Request) {
  const admin = await requireAdminForRoute();
  if (!admin.ok) return admin.response;
  const body = await parseBody(request);
  const ids = requireIds(body);
  if (!ids) {
    return NextResponse.json({ error: "benefit_id and source_id are required" }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  if (typeof body?.is_primary === "boolean") patch.is_primary = body.is_primary;
  if (typeof body?.coverage_type === "string") {
    if (!(LINK_COVERAGE_TYPES as readonly string[]).includes(body.coverage_type)) {
      return NextResponse.json({ error: "invalid coverage_type" }, { status: 400 });
    }
    patch.coverage_type = body.coverage_type;
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "nothing to update" }, { status: 400 });
  }

  const supabase = getServiceRoleSupabaseClient();
  const { data, error } = await supabase
    .from("benefit_source_links")
    .update(patch)
    .eq("benefit_id", ids.benefitId)
    .eq("source_id", ids.sourceId)
    .select("benefit_id")
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "link not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const admin = await requireAdminForRoute();
  if (!admin.ok) return admin.response;
  const body = await parseBody(request);
  const ids = requireIds(body);
  if (!ids) {
    return NextResponse.json({ error: "benefit_id and source_id are required" }, { status: 400 });
  }

  const supabase = getServiceRoleSupabaseClient();
  const { error } = await supabase
    .from("benefit_source_links")
    .delete()
    .eq("benefit_id", ids.benefitId)
    .eq("source_id", ids.sourceId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
