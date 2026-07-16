import "server-only";

import { getServiceRoleSupabaseClient } from "@/lib/supabase/service-role";
import { parseAdminEmails } from "@/lib/auth/admin-emails";
import { createResendAlertSender } from "@/lib/freshness/alerts";
import { createSupabaseArtifactStore } from "@/lib/freshness/artifacts";
import {
  getAlertEmail,
  getCostRates,
  getModelConfig,
  getMonitorLimits,
} from "@/lib/freshness/constants";
import { createAnthropicExtractionProvider } from "@/lib/freshness/extraction-provider";
import type { MonitorDeps } from "@/lib/freshness/run-monitor";
import { createSupabaseFreshnessStore } from "@/lib/freshness/store";

/**
 * Production wiring for the monitor orchestrator: service-role Supabase store,
 * private artifact bucket, real fetch, Anthropic provider (when configured),
 * the scheduled-publish RPC, Resend alerts, and structured console logging
 * (house style: runId in every line, no secrets, no body content).
 */
export function createProductionMonitorDeps(): MonitorDeps {
  const supabase = getServiceRoleSupabaseClient();
  const modelConfig = getModelConfig();
  const adminEmails = parseAdminEmails(process.env.ADMIN_EMAILS);

  return {
    store: createSupabaseFreshnessStore(supabase),
    artifactStore: createSupabaseArtifactStore(supabase),
    fetchImpl: fetch,
    extractionProvider:
      modelConfig.apiKey && modelConfig.model
        ? createAnthropicExtractionProvider({ apiKey: modelConfig.apiKey })
        : null,
    publishDueScheduled: async () => {
      const { data, error } = await supabase.rpc("publish_due_scheduled_proposals");
      if (error) throw new Error(`publish_due_scheduled_proposals: ${error.message}`);
      const result = (data ?? {}) as { published?: number; failed?: number; skipped?: number };
      return {
        published: result.published ?? 0,
        failed: result.failed ?? 0,
        skipped: result.skipped ?? 0,
      };
    },
    clock: () => new Date(),
    limits: getMonitorLimits(),
    modelConfig,
    costRates: getCostRates(),
    logger: {
      info: (message, context) => console.info(`[freshness] ${message}`, context ?? {}),
      error: (message, context) => console.error(`[freshness] ${message}`, context ?? {}),
    },
    sendAlert: createResendAlertSender({
      apiKey: process.env.RESEND_API_KEY ?? null,
      from: process.env.EMAIL_FROM ?? "Memento <onboarding@resend.dev>",
      to: getAlertEmail(adminEmails),
    }),
  };
}
