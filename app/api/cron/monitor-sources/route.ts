import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

import { createProductionMonitorDeps } from "@/lib/freshness/production-deps";
import { runMonitorSources } from "@/lib/freshness/run-monitor";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Benefit Freshness Monitor (daily cron; registered in vercel.json).
 *
 * Required env vars (Vercel Project Settings, never commit secrets):
 * - SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) + SUPABASE_SERVICE_ROLE_KEY
 * - CRON_SECRET
 * Extraction (optional until configured; runs are fetch-only without them):
 * - ANTHROPIC_API_KEY, FRESHNESS_MODEL, FRESHNESS_MODEL_ESCALATION
 * Alerts: RESEND_API_KEY, EMAIL_FROM, FRESHNESS_ALERT_EMAIL (or ADMIN_EMAILS)
 *
 * Local/manual trigger:
 * curl -i -X GET http://localhost:3000/api/cron/monitor-sources \
 *   -H "Authorization: Bearer $CRON_SECRET"
 *
 * Safe to rerun and safe when overlapping: work is claimed via expiring
 * leases/CAS, proposals dedupe on unique keys, and scheduled publication is
 * idempotent per proposal.
 */

const parseBearerToken = (header: string | null) => {
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) return null;
  return token;
};

export async function GET(request: Request) {
  const bearerToken = parseBearerToken(request.headers.get("authorization"));
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || bearerToken !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let deps: ReturnType<typeof createProductionMonitorDeps>;
  try {
    deps = createProductionMonitorDeps();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown configuration error";
    console.error("[freshness] missing configuration for monitor cron", { error: message });
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  const runId = randomUUID();
  try {
    const summary = await runMonitorSources(runId, "cron", deps);
    return NextResponse.json(summary, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown run error";
    console.error("[freshness] monitor run crashed", { runId, error: message });
    return NextResponse.json({ error: "Run failed", runId }, { status: 500 });
  }
}
