import "server-only";

import { getIssuerDisplayName } from "@/lib/format-card";
import { getServiceRoleSupabaseClient } from "@/lib/supabase/service-role";
import type { CardSearchResult } from "@/lib/types/server-data";
import { normalizeCardArtUrl } from "@/lib/benefits/format-benefit-labels";

type CanonicalCardRow = {
  id: string;
  card_name: string;
  card_code: string | null;
  display_name: string | null;
  issuer: string | null;
  source_url: string | null;
  card_status: "active" | "no_trackable_benefits" | null;
};

const DEFAULT_LIMIT = 20;
const ISSUER_QUERY_ALIASES = new Map<string, string>([
  ["amex", "amex"],
  ["american express", "amex"],
  ["americanexpress", "amex"],
  ["chase", "chase"],
  ["citi", "citi"],
  ["capital one", "capital_one"],
  ["capital-one", "capital_one"],
  ["capitalone", "capital_one"],
]);

function escapeIlikeValue(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/[%_]/g, "\\$&");
}

function normalizeSearchText(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

function resolveIssuerMatches(normalizedQuery: string) {
  const compactQuery = normalizedQuery.replace(/\s+/g, "");
  const matches = new Set<string>();

  for (const [alias, issuer] of ISSUER_QUERY_ALIASES) {
    const compactAlias = alias.replace(/\s+/g, "");
    if (
      normalizedQuery === alias ||
      compactQuery === compactAlias ||
      normalizedQuery.includes(alias)
    ) {
      matches.add(issuer);
    }
  }

  return [...matches];
}

function getSearchableStrings(row: CanonicalCardRow) {
  const cardName = normalizeSearchText(row.card_name);
  const displayName = normalizeSearchText(row.display_name);
  const cardCode = normalizeSearchText(row.card_code);
  const issuer = normalizeSearchText(row.issuer);
  const issuerDisplay = normalizeSearchText(getIssuerDisplayName(row.issuer ?? ""));
  const primaryName = displayName || cardName;

  return [
    cardName,
    displayName,
    cardCode,
    issuer,
    issuerDisplay,
    normalizeSearchText(`${issuer} ${primaryName}`),
    normalizeSearchText(`${issuerDisplay} ${primaryName}`),
  ].filter((value) => value.length > 0);
}

function buildSearchScore(row: CanonicalCardRow, normalizedQuery: string) {
  const searchable = getSearchableStrings(row);

  if (searchable.some((value) => value === normalizedQuery)) {
    return 300;
  }

  if (searchable.some((value) => value.startsWith(normalizedQuery))) {
    return 200;
  }

  if (searchable.some((value) => value.includes(normalizedQuery))) {
    return 100;
  }

  return 0;
}

function mapCardSearchResult(row: CanonicalCardRow): CardSearchResult | null {
  if (row.card_status !== "active" && row.card_status !== "no_trackable_benefits") {
    return null;
  }

  return {
    cardId: row.id,
    cardName: row.card_name,
    displayName: row.display_name,
    issuer: getIssuerDisplayName(row.issuer ?? ""),
    cardArtUrl: normalizeCardArtUrl(row.source_url),
    cardStatus: row.card_status,
  };
}

export async function searchCards(query: string): Promise<CardSearchResult[]> {
  const normalizedQuery = normalizeSearchText(query);
  const supabase = getServiceRoleSupabaseClient();

  let dbQuery = supabase
    .from("cards")
    .select("id, card_name, card_code, display_name, issuer, source_url, card_status")
    .in("card_status", ["active", "no_trackable_benefits"])
    .order("display_name", { ascending: true, nullsFirst: false })
    .order("card_name", { ascending: true })
    .limit(DEFAULT_LIMIT * 3);

  if (normalizedQuery.length > 0) {
    const escaped = escapeIlikeValue(normalizedQuery);
    const issuerMatches = resolveIssuerMatches(normalizedQuery);
    const filters = [
      `card_name.ilike.%${escaped}%`,
      `display_name.ilike.%${escaped}%`,
      `card_code.ilike.%${escaped}%`,
      ...issuerMatches.map((issuer) => `issuer.eq.${issuer}`),
    ];
    dbQuery = dbQuery.or(
      filters.join(","),
    );
  }

  const { data, error } = await dbQuery;
  if (error) {
    throw error;
  }

  const rows = ((data ?? []) as CanonicalCardRow[])
    .map((row) => ({ row, score: normalizedQuery ? buildSearchScore(row, normalizedQuery) : 0 }))
    .filter(({ score }) => normalizedQuery.length === 0 || score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        normalizeSearchText(a.row.display_name ?? a.row.card_name).localeCompare(
          normalizeSearchText(b.row.display_name ?? b.row.card_name),
        ),
    )
    .slice(0, DEFAULT_LIMIT)
    .map(({ row }) => mapCardSearchResult(row))
    .filter((row): row is CardSearchResult => row !== null);

  return rows;
}
