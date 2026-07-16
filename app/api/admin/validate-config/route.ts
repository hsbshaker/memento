import { NextResponse } from "next/server";

import { requireAdminForRoute } from "@/lib/auth/require-admin";
import { getModelConfig } from "@/lib/freshness/constants";
import { validateModelConfig } from "@/lib/freshness/validate-model-config";

export const runtime = "nodejs";

/**
 * POST /api/admin/validate-config — deployment smoke test for the extraction
 * configuration. Validates ANTHROPIC_API_KEY + FRESHNESS_MODEL(+escalation)
 * against the Models API so bad configuration fails HERE, not during the first
 * scheduled extraction.
 */
export async function POST() {
  const admin = await requireAdminForRoute();
  if (!admin.ok) return admin.response;

  const result = await validateModelConfig(getModelConfig());
  return NextResponse.json(result, { status: result.ok ? 200 : 422 });
}
