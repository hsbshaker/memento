import { NextResponse } from "next/server";

import { requireAdminForRoute } from "@/lib/auth/require-admin";
import { getAllowedHostsForIssuer } from "@/lib/freshness/allowlist";
import { validateContent } from "@/lib/freshness/content-validation";
import { assemblePdfDocument, extractPdfText } from "@/lib/freshness/extract-pdf-text";
import { fetchSource } from "@/lib/freshness/fetch-source";
import { extractHtmlText } from "@/lib/freshness/html-content";
import { sha256Hex } from "@/lib/freshness/hashing";
import type { SourceParserConfig } from "@/lib/types/freshness-schema";
import { getServiceRoleSupabaseClient } from "@/lib/supabase/service-role";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/admin/sources/[id]/test-fetch — live allowlisted fetch preview.
 * Mutates NOTHING: no snapshot, no artifact, no schedule change. Returns the
 * fetch status, hashes, soft-block verdict, and a text preview so operators
 * can tune selectors/markers before enabling a source.
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
    .select("*, cards!inner(issuer, display_name)")
    .eq("id", id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!source) return NextResponse.json({ error: "source not found" }, { status: 404 });

  const card = source.cards as unknown as { issuer: string | null; display_name: string | null };
  const allowedHosts = getAllowedHostsForIssuer(card.issuer);

  const result = await fetchSource(
    {
      url: source.source_url as string,
      expectedType: source.source_type === "pdf" ? "pdf" : "html",
    },
    { fetchImpl: fetch, allowedHosts },
  );

  if (result.kind !== "ok") {
    return NextResponse.json({
      outcome: result.kind,
      reason: result.kind === "failed" ? result.reason : null,
      status: "status" in result ? (result.status ?? null) : null,
    });
  }

  const parserConfig = (source.parser_config ?? {}) as SourceParserConfig;
  let text = "";
  let parseError: string | null = null;
  try {
    if (source.source_type === "pdf" || source.parser_strategy === "pdf_text") {
      const pdf = await extractPdfText(result.bodyBytes);
      text = assemblePdfDocument(pdf.pages).text;
    } else {
      text = extractHtmlText(new TextDecoder().decode(result.bodyBytes), parserConfig).text;
    }
  } catch (caught) {
    parseError = caught instanceof Error ? caught.message : String(caught);
  }

  const validation = parseError
    ? { status: "suspect" as const, reasons: ["parse_failure"] }
    : validateContent({
        normalizedText: text,
        rawText: source.source_type === "pdf" ? null : new TextDecoder().decode(result.bodyBytes),
        requestedUrl: source.source_url as string,
        finalUrl: result.finalUrl,
        expectedMarkers:
          parserConfig.expected_markers ?? (card.display_name ? [card.display_name] : []),
        minExpectedLength: parserConfig.min_expected_length ?? null,
      });

  return NextResponse.json({
    outcome: "ok",
    status: result.status,
    finalUrl: result.finalUrl,
    contentType: result.contentType,
    contentLength: result.bodyBytes.byteLength,
    rawSha256: sha256Hex(result.bodyBytes),
    normalizedSha256: sha256Hex(text),
    validation,
    parseError,
    normalizedLength: text.length,
    textPreview: text.slice(0, 2000),
  });
}
