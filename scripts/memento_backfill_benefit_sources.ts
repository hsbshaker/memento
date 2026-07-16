/**
 * Backfill the freshness source registry from existing catalog provenance.
 *
 * Seeds:
 *  - benefit_sources: one row per distinct (card, official URL) found in
 *    cards.source_url and benefits.source_url — created DISABLED (enabling a
 *    source is an explicit, owner-approved admin action);
 *  - benefit_source_links: benefit ↔ source coverage from benefits.source_url
 *    (is_primary = true, coverage_type = 'full').
 *
 * URLs failing the per-issuer HTTPS allowlist are never registered; they are
 * reported in the preview instead.
 *
 * Modes (mirrors the master importer):
 *  - default: DRY RUN — writes preview JSON to data/previews/memento/, no writes
 *  - --commit: inserts via the service-role client (requires owner approval)
 *
 * Env: NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) + SUPABASE_SERVICE_ROLE_KEY.
 * Loads .env.local when present.
 */
import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

import { getAllowedHostsForIssuer, isAllowedSourceUrl } from "../lib/freshness/allowlist";

interface CardRow {
  id: string;
  card_code: string | null;
  display_name: string | null;
  issuer: string | null;
  source_url: string | null;
}

interface BenefitRow {
  id: string;
  card_id: string;
  benefit_code: string | null;
  source_url: string | null;
}

interface PlannedSource {
  card_id: string;
  card_code: string | null;
  source_url: string;
  source_type: "html" | "pdf";
  parser_strategy: "generic_html" | "pdf_text";
  authority_level: "official";
  enabled: false;
  parser_config: { expected_markers: string[] } | null;
}

interface PlannedLink {
  benefit_id: string;
  benefit_code: string | null;
  card_id: string;
  source_url: string;
  is_primary: boolean;
  coverage_type: "full";
}

interface SkippedUrl {
  card_id: string;
  card_code: string | null;
  source_url: string;
  reason: string;
}

const PREVIEW_DIR = path.join(process.cwd(), "data", "previews", "memento");

const loadEnvLocal = () => {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fsSync.existsSync(envPath)) return;
  const contents = fsSync.readFileSync(envPath, "utf8");
  for (const line of contents.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
};

const writeJson = async (filePath: string, value: unknown) => {
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
};

async function main() {
  loadEnvLocal();

  const commit = process.argv.includes("--commit");
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error(
      "Missing NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) or SUPABASE_SERVICE_ROLE_KEY.",
    );
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: cards, error: cardsError } = await supabase
    .from("cards")
    .select("id, card_code, display_name, issuer, source_url");
  if (cardsError) {
    console.error("Failed to fetch cards:", cardsError.message);
    process.exit(1);
  }

  const { data: benefits, error: benefitsError } = await supabase
    .from("benefits")
    .select("id, card_id, benefit_code, source_url");
  if (benefitsError) {
    console.error("Failed to fetch benefits:", benefitsError.message);
    process.exit(1);
  }

  const cardRows = (cards ?? []) as CardRow[];
  const benefitRows = (benefits ?? []) as BenefitRow[];
  const cardsById = new Map(cardRows.map((card) => [card.id, card]));

  const plannedSources = new Map<string, PlannedSource>(); // key: card_id|url
  const plannedLinks: PlannedLink[] = [];
  const skipped: SkippedUrl[] = [];

  const registerUrl = (card: CardRow, rawUrl: string | null): string | null => {
    const url = (rawUrl ?? "").trim();
    if (!url) return null;

    const key = `${card.id}|${url}`;
    if (plannedSources.has(key)) return url;

    const allowedHosts = getAllowedHostsForIssuer(card.issuer);
    if (!isAllowedSourceUrl(url, allowedHosts)) {
      if (!skipped.some((s) => s.card_id === card.id && s.source_url === url)) {
        skipped.push({
          card_id: card.id,
          card_code: card.card_code,
          source_url: url,
          reason:
            allowedHosts.length === 0
              ? `no allowlist for issuer ${card.issuer ?? "unknown"}`
              : "url fails the issuer allowlist (https + allowlisted host required)",
        });
      }
      return null;
    }

    const isPdf = new URL(url).pathname.toLowerCase().endsWith(".pdf");
    plannedSources.set(key, {
      card_id: card.id,
      card_code: card.card_code,
      source_url: url,
      source_type: isPdf ? "pdf" : "html",
      parser_strategy: isPdf ? "pdf_text" : "generic_html",
      authority_level: "official",
      enabled: false,
      parser_config: card.display_name ? { expected_markers: [card.display_name] } : null,
    });
    return url;
  };

  for (const card of cardRows) {
    registerUrl(card, card.source_url);
  }

  for (const benefit of benefitRows) {
    const card = cardsById.get(benefit.card_id);
    if (!card) continue;
    const registered = registerUrl(card, benefit.source_url);
    if (registered) {
      plannedLinks.push({
        benefit_id: benefit.id,
        benefit_code: benefit.benefit_code,
        card_id: benefit.card_id,
        source_url: registered,
        is_primary: true,
        coverage_type: "full",
      });
    }
  }

  const summary = {
    mode: commit ? "commit" : "dry_run",
    cards_processed: cardRows.length,
    benefits_processed: benefitRows.length,
    sources_planned: plannedSources.size,
    links_planned: plannedLinks.length,
    urls_skipped: skipped.length,
    generated_at: new Date().toISOString(),
  };

  await fs.mkdir(PREVIEW_DIR, { recursive: true });
  await writeJson(path.join(PREVIEW_DIR, "benefit_sources_preview.json"), [
    ...plannedSources.values(),
  ]);
  await writeJson(path.join(PREVIEW_DIR, "benefit_source_links_preview.json"), plannedLinks);
  await writeJson(path.join(PREVIEW_DIR, "benefit_sources_skipped.json"), skipped);
  await writeJson(path.join(PREVIEW_DIR, "benefit_sources_backfill_summary.json"), summary);

  console.info("[backfill] summary", summary);
  console.info(`[backfill] previews written to ${PREVIEW_DIR}`);

  if (!commit) {
    console.info("[backfill] dry run complete — re-run with --commit to write (requires approval).");
    return;
  }

  // ---- Commit path (owner-approved only) -----------------------------------
  const sourceValues = [...plannedSources.values()].map((source) => ({
    card_id: source.card_id,
    source_url: source.source_url,
    source_type: source.source_type,
    parser_strategy: source.parser_strategy,
    authority_level: source.authority_level,
    enabled: false,
    parser_config: source.parser_config,
  }));

  for (let i = 0; i < sourceValues.length; i += 100) {
    const batch = sourceValues.slice(i, i + 100);
    const { error } = await supabase
      .from("benefit_sources")
      .upsert(batch, { onConflict: "card_id,source_url", ignoreDuplicates: true });
    if (error) {
      console.error("Failed to insert benefit_sources batch:", error.message);
      process.exit(1);
    }
  }

  const { data: insertedSources, error: fetchBackError } = await supabase
    .from("benefit_sources")
    .select("id, card_id, source_url");
  if (fetchBackError || !insertedSources) {
    console.error("Failed to read back benefit_sources:", fetchBackError?.message);
    process.exit(1);
  }

  const sourceIdByKey = new Map(
    insertedSources.map((s) => [`${s.card_id}|${s.source_url}`, s.id as string]),
  );

  const linkValues = plannedLinks
    .map((link) => {
      const sourceId = sourceIdByKey.get(`${link.card_id}|${link.source_url}`);
      if (!sourceId) return null;
      return {
        benefit_id: link.benefit_id,
        source_id: sourceId,
        is_primary: link.is_primary,
        coverage_type: link.coverage_type,
      };
    })
    .filter((v): v is NonNullable<typeof v> => v !== null);

  for (let i = 0; i < linkValues.length; i += 100) {
    const batch = linkValues.slice(i, i + 100);
    const { error } = await supabase
      .from("benefit_source_links")
      .upsert(batch, { onConflict: "benefit_id,source_id", ignoreDuplicates: true });
    if (error) {
      console.error("Failed to insert benefit_source_links batch:", error.message);
      process.exit(1);
    }
  }

  console.info(
    `[backfill] commit complete: ${sourceValues.length} sources upserted, ${linkValues.length} links upserted (all sources disabled).`,
  );
}

main().catch((error) => {
  console.error("[backfill] fatal:", error instanceof Error ? error.message : error);
  process.exit(1);
});
