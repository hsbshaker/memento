"use server";

import "server-only";

import { computeBenefitPeriod, resolveSupportedBenefitCadence } from "@/lib/benefits/compute-benefit-period";
import {
  formatBenefitValue,
  getConfigurationStatus,
  getConfigurationType,
  getBenefitResetsLabel,
} from "@/lib/benefits/format-benefit-labels";
import { buildBenefitPeriodStatusMap } from "@/lib/benefits/usage-state";
import { getIssuerDisplayName } from "@/lib/format-card";
import { getServiceRoleSupabaseClient } from "@/lib/supabase/service-role";
import type {
  BenefitInventoryStatus,
  BenefitsInventoryItem,
  BenefitsFeedResult,
  SupportedBenefitCadence,
} from "@/lib/types/server-data";
import type { UserBenefitTrackingStatus } from "@/lib/constants/memento-schema";

// ─── Internal DB row types ────────────────────────────────────────────────────

type BenefitsCandidateRow = {
  id: string;
  user_card_id: string;
  benefit_id: string;
  is_active: boolean;
  tracking_status: UserBenefitTrackingStatus;
  is_used_this_period: boolean;
  last_used_at: string | null;
  reminder_override: "balanced" | "earlier" | "minimal" | null;
  conditional_value: string | null;
  user_cards:
    | {
        id: string;
        card_id: string;
        card_anniversary_date: string | null;
        status: "active" | "removed";
        nickname: string | null;
        last_four: string | null;
        cards:
          | {
              id: string;
              card_code: string | null;
              card_name: string;
              display_name: string | null;
              issuer: string | null;
              card_status: "active" | "no_trackable_benefits" | null;
            }
          | {
              id: string;
              card_code: string | null;
              card_name: string;
              display_name: string | null;
              issuer: string | null;
              card_status: "active" | "no_trackable_benefits" | null;
            }[]
          | null;
      }
    | {
        id: string;
        card_id: string;
        card_anniversary_date: string | null;
        status: "active" | "removed";
        nickname: string | null;
        last_four: string | null;
        cards:
          | {
              id: string;
              card_code: string | null;
              card_name: string;
              display_name: string | null;
              issuer: string | null;
              card_status: "active" | "no_trackable_benefits" | null;
            }
          | {
              id: string;
              card_code: string | null;
              card_name: string;
              display_name: string | null;
              issuer: string | null;
              card_status: "active" | "no_trackable_benefits" | null;
            }[]
          | null;
      }[]
    | null;
  benefits:
    | {
        id: string;
        benefit_name: string | null;
        benefit_value: string | null;
        value_cents: number | null;
        cadence: string | null;
        reset_timing: string | null;
        enrollment_required: boolean | null;
        requires_setup: boolean | null;
        requires_selection: boolean | null;
        selection_type: string | null;
        track_in_memento: "yes" | "later" | "no" | null;
      }
    | {
        id: string;
        benefit_name: string | null;
        benefit_value: string | null;
        value_cents: number | null;
        cadence: string | null;
        reset_timing: string | null;
        enrollment_required: boolean | null;
        requires_setup: boolean | null;
        requires_selection: boolean | null;
        selection_type: string | null;
        track_in_memento: "yes" | "later" | "no" | null;
      }[]
    | null;
};

type PeriodStatusRow = {
  benefit_id: string;
  period_key: string;
  is_used: boolean;
  used_at?: string | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function takeFirst<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function toInventoryStatus(
  trackingStatus: UserBenefitTrackingStatus,
  isUsedThisPeriod: boolean,
): BenefitInventoryStatus {
  if (trackingStatus === "not_tracked") return "not_tracked";
  return isUsedThisPeriod ? "used" : "unused";
}

function sortBenefitsInventoryItems(items: BenefitsInventoryItem[]): BenefitsInventoryItem[] {
  return [...items].sort((a, b) => {
    // not_tracked always last
    const statusRank = (s: BenefitInventoryStatus) =>
      s === "unused" ? 0 : s === "used" ? 1 : 2;
    const rankDiff = statusRank(a.inventoryStatus) - statusRank(b.inventoryStatus);
    if (rankDiff !== 0) return rankDiff;

    // Within unused: most urgent (fewest days remaining) first
    if (a.inventoryStatus === "unused" && b.inventoryStatus === "unused") {
      return a.daysRemaining - b.daysRemaining;
    }

    // Within used: most recently used first
    if (a.inventoryStatus === "used" && b.inventoryStatus === "used") {
      const aTime = a.lastUsedAt ? Date.parse(a.lastUsedAt) : 0;
      const bTime = b.lastUsedAt ? Date.parse(b.lastUsedAt) : 0;
      if (bTime !== aTime) return bTime - aTime;
    }

    // Tiebreak: card name, then benefit name
    return a.cardName.localeCompare(b.cardName) || a.benefitName.localeCompare(b.benefitName);
  });
}

// ─── Row mapper ───────────────────────────────────────────────────────────────

function mapBenefitsInventoryItem(
  row: BenefitsCandidateRow,
  now: Date,
  periodStatusMap: Map<string, PeriodStatusRow>,
): BenefitsInventoryItem | null {
  const ownedUserCard = takeFirst(row.user_cards);
  const canonicalCard = takeFirst(ownedUserCard?.cards);
  const canonicalBenefit = takeFirst(row.benefits);

  if (
    !ownedUserCard ||
    !canonicalCard ||
    !canonicalBenefit ||
    ownedUserCard.status !== "active" ||
    canonicalBenefit.track_in_memento !== "yes"
  ) {
    return null;
  }

  const resolvedCadence = resolveSupportedBenefitCadence({
    cadence: canonicalBenefit.cadence,
    resetTiming: canonicalBenefit.reset_timing,
  });
  if (!resolvedCadence) return null;

  const period = computeBenefitPeriod({
    cadence: resolvedCadence,
    resetTiming: canonicalBenefit.reset_timing,
    cardAnniversaryDate: ownedUserCard.card_anniversary_date,
    now,
  });
  if (!period) return null;

  const isUsedThisPeriod =
    periodStatusMap.get(`${row.benefit_id}:${period.periodKey}`)?.is_used ??
    row.is_used_this_period;

  const formattedValue = formatBenefitValue({
    benefitValue: canonicalBenefit.benefit_value,
    valueCents: canonicalBenefit.value_cents,
  });

  const configurationType = getConfigurationType({
    requiresSelection: canonicalBenefit.requires_selection,
    selectionType: canonicalBenefit.selection_type,
    requiresSetup: canonicalBenefit.requires_setup,
  });

  const issuer = getIssuerDisplayName(canonicalCard.issuer ?? "");

  return {
    userBenefitId: row.id,
    benefitId: row.benefit_id,
    userCardId: row.user_card_id,
    cardId: ownedUserCard.card_id,
    cardName: canonicalCard.display_name ?? canonicalCard.card_name,
    issuer,
    nickname: ownedUserCard.nickname,
    lastFour: ownedUserCard.last_four,
    benefitName: canonicalBenefit.benefit_name?.trim() || "Unnamed benefit",
    value: formattedValue.value,
    valueDescriptor: formattedValue.valueDescriptor,
    valueCents: formattedValue.sortValue,
    cadence: period.resolvedCadence,
    periodStart: period.periodStartDate,
    periodEnd: period.periodEndDate,
    periodLabel: period.periodLabel,
    resetsLabel: getBenefitResetsLabel({
      cadence: canonicalBenefit.cadence,
      resetTiming: canonicalBenefit.reset_timing,
      cardAnniversaryDate: ownedUserCard.card_anniversary_date,
      now,
    }),
    periodKey: period.periodKey,
    daysRemaining: period.daysRemaining,
    trackingStatus: row.tracking_status,
    isUsedThisPeriod,
    lastUsedAt: row.last_used_at,
    inventoryStatus: toInventoryStatus(row.tracking_status, isUsedThisPeriod),
    enrollmentRequired: canonicalBenefit.enrollment_required === true,
    requiresConfiguration: configurationType !== null,
    configurationType,
    configurationStatus: getConfigurationStatus({
      requiresSelection: canonicalBenefit.requires_selection,
      selectionType: canonicalBenefit.selection_type,
      requiresSetup: canonicalBenefit.requires_setup,
      conditionalValue: row.conditional_value,
    }),
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function buildBenefitsFeed(userId: string): Promise<BenefitsFeedResult> {
  const supabase = getServiceRoleSupabaseClient();
  const now = new Date();

  const { data: candidateRows, error: candidatesError } = await supabase
    .from("user_benefits")
    .select(
      "id, user_card_id, benefit_id, is_active, tracking_status, is_used_this_period, last_used_at, reminder_override, conditional_value, user_cards!inner(id, card_id, card_anniversary_date, status, nickname, last_four, cards!inner(id, card_code, card_name, display_name, issuer, card_status)), benefits!inner(id, benefit_name, benefit_value, value_cents, cadence, reset_timing, enrollment_required, requires_setup, requires_selection, selection_type, track_in_memento)",
    )
    .eq("is_active", true)
    .eq("user_cards.user_id", userId)
    .eq("benefits.track_in_memento", "yes");

  if (candidatesError) throw candidatesError;

  const typedRows = (candidateRows ?? []) as unknown as BenefitsCandidateRow[];

  // Collect distinct period keys and benefit IDs for the period-status lookup
  const benefitIds = Array.from(new Set(typedRows.map((r) => r.benefit_id)));
  const periodKeys = Array.from(
    new Set(
      typedRows
        .map((row) => {
          const uc = takeFirst(row.user_cards);
          const b = takeFirst(row.benefits);
          if (!uc || !b) return null;
          return (
            computeBenefitPeriod({
              cadence: b.cadence,
              resetTiming: b.reset_timing,
              cardAnniversaryDate: uc.card_anniversary_date,
              now,
            })?.periodKey ?? null
          );
        })
        .filter((v): v is string => Boolean(v)),
    ),
  );

  let periodStatusMap = new Map<string, PeriodStatusRow>();
  if (benefitIds.length > 0 && periodKeys.length > 0) {
    const { data: statusRows, error: statusError } = await supabase
      .from("user_benefit_period_status")
      .select("benefit_id, period_key, is_used, used_at")
      .eq("user_id", userId)
      .in("benefit_id", benefitIds)
      .in("period_key", periodKeys);

    if (statusError) throw statusError;

    periodStatusMap = buildBenefitPeriodStatusMap(
      (statusRows ?? []) as PeriodStatusRow[],
    );
  }

  const items = sortBenefitsInventoryItems(
    typedRows
      .map((row) => mapBenefitsInventoryItem(row, now, periodStatusMap))
      .filter((item): item is BenefitsInventoryItem => item !== null),
  );

  // Counts are always over the full unfiltered set
  const counts = {
    all: items.length,
    unused: items.filter((i) => i.inventoryStatus === "unused").length,
    used: items.filter((i) => i.inventoryStatus === "used").length,
    notTracked: items.filter((i) => i.inventoryStatus === "not_tracked").length,
  };

  // Available filter options derived from the full set
  const issuers = Array.from(new Set(items.map((i) => i.issuer))).sort((a, b) =>
    a.localeCompare(b),
  );

  const cadences = Array.from(
    new Set(items.map((i) => i.cadence)),
  ).sort() as SupportedBenefitCadence[];

  // One entry per unique user_card_id
  const cardMap = new Map<
    string,
    { userCardId: string; cardName: string; issuer: string; nickname: string | null }
  >();
  for (const item of items) {
    if (!cardMap.has(item.userCardId)) {
      cardMap.set(item.userCardId, {
        userCardId: item.userCardId,
        cardName: item.cardName,
        issuer: item.issuer,
        nickname: item.nickname,
      });
    }
  }
  const cards = Array.from(cardMap.values()).sort((a, b) =>
    a.cardName.localeCompare(b.cardName),
  );

  return { items, counts, filters: { issuers, cadences, cards } };
}
