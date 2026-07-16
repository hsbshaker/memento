import { NextResponse } from "next/server";

import { requireAdminForRoute } from "@/lib/auth/require-admin";
import {
  AUTHORITY_LEVELS,
  PARSER_STRATEGIES,
  SOURCE_TYPES,
} from "@/lib/constants/freshness-schema";
import { getAllowedHostsForIssuer, isAllowedSourceUrl } from "@/lib/freshness/allowlist";
import { getServiceRoleSupabaseClient } from "@/lib/supabase/service-role";

export const runtime = "nodejs";

const EDITABLE_FIELDS = new Set([
  "enabled",
  "source_url",
  "source_type",
  "authority_level",
  "parser_strategy",
  "parser_config",
  "check_cadence_days",
  "monthly_full_verification",
  "notes",
]);

/** PATCH /api/admin/sources/[id] — edit registry configuration. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdminForRoute();
  if (!admin.ok) return admin.response;
  const { id } = await params;

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || Object.keys(body).length === 0) {
    return NextResponse.json({ error: "empty patch" }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    if (!EDITABLE_FIELDS.has(key)) {
      return NextResponse.json({ error: `field not editable: ${key}` }, { status: 400 });
    }
    patch[key] = value;
  }

  if (patch.source_type !== undefined && !(SOURCE_TYPES as readonly string[]).includes(patch.source_type as string)) {
    return NextResponse.json({ error: "invalid source_type" }, { status: 400 });
  }
  if (patch.authority_level !== undefined && !(AUTHORITY_LEVELS as readonly string[]).includes(patch.authority_level as string)) {
    return NextResponse.json({ error: "invalid authority_level" }, { status: 400 });
  }
  if (patch.parser_strategy !== undefined && !(PARSER_STRATEGIES as readonly string[]).includes(patch.parser_strategy as string)) {
    return NextResponse.json({ error: "invalid parser_strategy" }, { status: 400 });
  }
  if (patch.check_cadence_days !== undefined) {
    const cadence = Number(patch.check_cadence_days);
    if (!Number.isInteger(cadence) || cadence < 1 || cadence > 90) {
      return NextResponse.json({ error: "check_cadence_days must be 1-90" }, { status: 400 });
    }
  }

  const supabase = getServiceRoleSupabaseClient();
  const { data: existing, error: loadError } = await supabase
    .from("benefit_sources")
    .select("id, card_id, cards!inner(issuer)")
    .eq("id", id)
    .maybeSingle();
  if (loadError) return NextResponse.json({ error: loadError.message }, { status: 500 });
  if (!existing) return NextResponse.json({ error: "source not found" }, { status: 404 });

  if (typeof patch.source_url === "string") {
    const issuer = (existing.cards as unknown as { issuer: string | null } | null)?.issuer ?? null;
    if (!isAllowedSourceUrl(patch.source_url, getAllowedHostsForIssuer(issuer))) {
      return NextResponse.json(
        { error: "source_url must be https on an allowlisted issuer host" },
        { status: 400 },
      );
    }
  }

  const { data: updated, error } = await supabase
    .from("benefit_sources")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ source: updated });
}
