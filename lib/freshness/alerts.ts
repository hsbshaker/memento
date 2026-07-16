import { Resend } from "resend";

/**
 * Operational alerts via Resend (house pattern: inline renderer, no template
 * files). The orchestrator receives `sendAlert` as an injected dependency —
 * tests capture alerts with a fake.
 */

export type FreshnessAlertType =
  | "source_unavailable"
  | "mass_change_halt"
  | "dead_letter"
  | "run_failed"
  | "model_config_error";

export interface FreshnessAlert {
  type: FreshnessAlertType;
  message: string;
  context?: Record<string, unknown>;
}

export type AlertSender = (alert: FreshnessAlert) => Promise<void>;

const renderText = (alert: FreshnessAlert): string =>
  [
    `Memento freshness alert: ${alert.type}`,
    "",
    alert.message,
    "",
    alert.context ? `Context: ${JSON.stringify(alert.context, null, 2)}` : "",
  ].join("\n");

const renderHtml = (alert: FreshnessAlert): string =>
  [
    `<h3>Memento freshness alert: ${alert.type}</h3>`,
    `<p>${alert.message}</p>`,
    alert.context
      ? `<pre>${JSON.stringify(alert.context, null, 2).replace(/</g, "&lt;")}</pre>`
      : "",
  ].join("\n");

export function createResendAlertSender(config: {
  apiKey: string | null;
  from: string;
  to: string | null;
}): AlertSender {
  return async (alert) => {
    if (!config.apiKey || !config.to) {
      console.error("[freshness] alert (email not configured)", {
        type: alert.type,
        message: alert.message,
      });
      return;
    }
    try {
      const resend = new Resend(config.apiKey);
      await resend.emails.send({
        from: config.from,
        to: config.to,
        subject: `[Memento freshness] ${alert.type}`,
        text: renderText(alert),
        html: renderHtml(alert),
      });
    } catch (error) {
      // Alerting must never take down a run.
      console.error("[freshness] failed to send alert email", {
        type: alert.type,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };
}
