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

/** POST /api/admin/sources — register a new source (always created disabled). */
export async function POST(request: Request) {
  const admin = await requireAdminForRoute();
  if (!admin.ok) return admin.response;

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body.card_id !== "string" || typeof body.source_url !== "string") {
    return NextResponse.json({ error: "card_id and source_url are required" }, { status: 400 });
  }

  const sourceType = (body.source_type as string) ?? "html";
  const authorityLevel = (body.authority_level as string) ?? "official";
  const parserStrategy =
    (body.parser_strategy as string) ?? (sourceType === "pdf" ? "pdf_text" : "generic_html");

  if (!(SOURCE_TYPES as readonly string[]).includes(sourceType)) {
    return NextResponse.json({ error: "invalid source_type" }, { status: 400 });
  }
  if (!(AUTHORITY_LEVELS as readonly string[]).includes(authorityLevel)) {
    return NextResponse.json({ error: "invalid authority_level" }, { status: 400 });
  }
  if (!(PARSER_STRATEGIES as readonly string[]).includes(parserStrategy)) {
    return NextResponse.json({ error: "invalid parser_strategy" }, { status: 400 });
  }

  const cadence = Number(body.check_cadence_days ?? 7);
  if (!Number.isInteger(cadence) || cadence < 1 || cadence > 90) {
    return NextResponse.json({ error: "check_cadence_days must be 1-90" }, { status: 400 });
  }

  const supabase = getServiceRoleSupabaseClient();
  const { data: card, error: cardError } = await supabase
    .from("cards")
    .select("id, issuer, display_name")
    .eq("id", body.card_id)
    .maybeSingle();
  if (cardError) {
    return NextResponse.json({ error: "failed to load card" }, { status: 500 });
  }
  if (!card) {
    return NextResponse.json({ error: "card not found" }, { status: 400 });
  }

  const allowedHosts = getAllowedHostsForIssuer(card.issuer as string | null);
  if (!isAllowedSourceUrl(body.source_url, allowedHosts)) {
    return NextResponse.json(
      { error: `source_url must be https on an allowlisted ${card.issuer ?? "issuer"} host` },
      { status: 400 },
    );
  }

  const { data: created, error } = await supabase
    .from("benefit_sources")
    .insert({
      card_id: body.card_id,
      source_url: body.source_url.trim(),
      source_type: sourceType,
      authority_level: authorityLevel,
      parser_strategy: parserStrategy,
      parser_config: body.parser_config ?? null,
      check_cadence_days: cadence,
      monthly_full_verification: body.monthly_full_verification !== false,
      notes: typeof body.notes === "string" ? body.notes : null,
      enabled: false,
    })
    .select("*")
    .single();

  if (error) {
    const status = error.code === "23505" ? 409 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }

  return NextResponse.json({ source: created }, { status: 201 });
}
