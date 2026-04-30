import "server-only";

import { computeBenefitPeriod, resolveSupportedBenefitCadence } from "@/lib/benefits/compute-benefit-period";
import {
  formatBenefitValue,
  getConfigurationStatus,
  getConfigurationType,
  normalizeCardArtUrl,
} from "@/lib/benefits/format-benefit-labels";
import { sortHomeFeedItems } from "@/lib/benefits/rank-benefits";
import { buildBenefitPeriodStatusMap } from "@/lib/benefits/usage-state";
import { getIssuerDisplayName, getIssuerShortLabel } from "@/lib/format-card";
import { buildHomeState } from "@/lib/home/build-home-state";
import { getServiceRoleSupabaseClient } from "@/lib/supabase/service-role";
import type { HomeFeedItem, HomeFeedResult, HomeMetric } from "@/lib/types/server-data";

type HomeCandidateRow = {
  id: string;
  user_card_id: string;
  benefit_id: string;
  is_active: boolean;
  is_used_this_period: boolean;
  last_used_at: string | null;
  reminder_override: "balanced" | "earlier" | "minimal" | null;
  conditional_value: string | null;
  snoozed_until: string | null;
  user_cards: {
    id: string;
    card_id: string;
    card_anniversary_date: string | null;
    status: "active" | "removed";
    cards: {
      id: string;
      card_code: string | null;
      card_name: string;
      display_name: string | null;
      issuer: string | null;
      source_url: string | null;
      card_status: "active" | "no_trackable_benefits" | null;
    } | {
      id: string;
      card_code: string | null;
      card_name: string;
      display_name: string | null;
      issuer: string | null;
      source_url: string | null;
      card_status: "active" | "no_trackable_benefits" | null;
    }[] | null;
  } | {
    id: string;
    card_id: string;
    card_anniversary_date: string | null;
    status: "active" | "removed";
    cards: {
      id: string;
      card_code: string | null;
      card_name: string;
      display_name: string | null;
      issuer: string | null;
      source_url: string | null;
      card_status: "active" | "no_trackable_benefits" | null;
    } | {
      id: string;
      card_code: string | null;
      card_name: string;
      display_name: string | null;
      issuer: string | null;
      source_url: string | null;
      card_status: "active" | "no_trackable_benefits" | null;
    }[] | null;
  }[] | null;
  benefits: {
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
  } | {
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
  }[] | null;
};

type PeriodStatusRow = {
  benefit_id: string;
  period_key: string;
  is_used: boolean;
  used_at?: string | null;
};

const RESETTING_SOON_WINDOW_DAYS = 14;
const NEXT_BENEFITS_LIMIT = 6;
const CURRENCY_FORMATTER = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function takeFirst<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function buildUrgencyTier(daysRemaining: number) {
  if (daysRemaining <= 3) {
    return "high" as const;
  }

  if (daysRemaining <= RESETTING_SOON_WINDOW_DAYS) {
    return "soon" as const;
  }

  return "upcoming" as const;
}

function formatMetricValue(valueCents: number) {
  return CURRENCY_FORMATTER.format(valueCents / 100);
}

function buildMetric(valueCents: number, helperText: string): HomeMetric {
  return {
    valueCents,
    valueLabel: formatMetricValue(valueCents),
    helperText,
  };
}

function buildTimingLabel(daysRemaining: number) {
  if (daysRemaining <= 0) {
    return "Resets today";
  }

  if (daysRemaining === 1) {
    return "Resets tomorrow";
  }

  return `Resets in ${daysRemaining} days`;
}

function getPeriodAwareUsedStatus({
  benefitId,
  periodKey,
  periodStatusMap,
  fallbackUsed,
}: {
  benefitId: string;
  periodKey: string;
  periodStatusMap: Map<string, PeriodStatusRow>;
  fallbackUsed: boolean;
}) {
  return periodStatusMap.get(`${benefitId}:${periodKey}`)?.is_used ?? fallbackUsed;
}

function mapHomeFeedItem(
  row: HomeCandidateRow,
  now: Date,
  periodStatusMap: Map<string, PeriodStatusRow>,
): HomeFeedItem | null {
  const ownedUserCard = takeFirst(row.user_cards);
  const canonicalCard = takeFirst(ownedUserCard?.cards);
  const canonicalBenefit = takeFirst(row.benefits);

  if (
    !ownedUserCard ||
    !canonicalCard ||
    !canonicalBenefit ||
    ownedUserCard.status !== "active" ||
    (canonicalCard.card_status !== "active" && canonicalCard.card_status !== "no_trackable_benefits") ||
    canonicalBenefit.track_in_memento !== "yes"
  ) {
    return null;
  }

  const resolvedCadence = resolveSupportedBenefitCadence({
    cadence: canonicalBenefit.cadence,
    resetTiming: canonicalBenefit.reset_timing,
  });
  if (!resolvedCadence) {
    return null;
  }

  const period = computeBenefitPeriod({
    cadence: resolvedCadence,
    resetTiming: canonicalBenefit.reset_timing,
    cardAnniversaryDate: ownedUserCard.card_anniversary_date,
    now,
  });
  if (!period) {
    return null;
  }

  const value = formatBenefitValue({
    benefitValue: canonicalBenefit.benefit_value,
    valueCents: canonicalBenefit.value_cents,
  });
  const configurationType = getConfigurationType({
    requiresSelection: canonicalBenefit.requires_selection,
    selectionType: canonicalBenefit.selection_type,
    requiresSetup: canonicalBenefit.requires_setup,
  });
  const issuer = getIssuerDisplayName(canonicalCard.issuer ?? "");
  const isUsedThisPeriod = getPeriodAwareUsedStatus({
    benefitId: row.benefit_id,
    periodKey: period.periodKey,
    periodStatusMap,
    fallbackUsed: row.is_used_this_period,
  });

  return {
    userBenefitId: row.id,
    cardId: ownedUserCard.card_id,
    benefitId: row.benefit_id,
    benefitName: canonicalBenefit.benefit_name?.trim() || "Unnamed benefit",
    cardName: canonicalCard.display_name ?? canonicalCard.card_name,
    issuer,
    cardMarker: {
      label: getIssuerShortLabel(canonicalCard.issuer ?? issuer),
      cardCode: canonicalCard.card_code,
      issuer,
    },
    cadence: period.resolvedCadence,
    currentPeriodValueCents: value.sortValue,
    currentPeriodValueLabel: value.value,
    periodStart: period.periodStartDate,
    periodEnd: period.periodEndDate,
    resetDate: period.periodEndDate,
    daysRemaining: period.daysRemaining,
    timingLabel: buildTimingLabel(period.daysRemaining),
    periodLabel: period.periodLabel,
    isUsedThisPeriod,
    lastUsedAt: row.last_used_at,
    enrollmentRequired: canonicalBenefit.enrollment_required === true,
    urgencyTier: buildUrgencyTier(period.daysRemaining),
    requiresConfiguration: configurationType !== null,
    configurationType,
    configurationStatus: getConfigurationStatus({
      requiresSelection: canonicalBenefit.requires_selection,
      selectionType: canonicalBenefit.selection_type,
      requiresSetup: canonicalBenefit.requires_setup,
      conditionalValue: row.conditional_value,
    }),
    reminderOverride: row.reminder_override,
    snoozedUntil: row.snoozed_until,
    cardArtUrl: normalizeCardArtUrl(canonicalCard.source_url),
    value: value.value,
    valueDescriptor: value.valueDescriptor,
  };
}

export async function buildHomeFeed(userId: string): Promise<HomeFeedResult> {
  const supabase = getServiceRoleSupabaseClient();
  const now = new Date();

  const { data: trackedCardRows, error: trackedCardsError } = await supabase
    .from("user_cards")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "active");

  if (trackedCardsError) {
    throw trackedCardsError;
  }

  const trackedCards = (trackedCardRows ?? []).length;
  const trackedCardIds = (trackedCardRows ?? []).map((row) => (row as { id: string }).id);

  if (trackedCards === 0) {
    return {
      metrics: {
        availableNow: buildMetric(0, "Unused value available in the current period."),
        resettingSoon: buildMetric(0, "Unused value resetting within the next 14 days."),
        capturedThisPeriod: buildMetric(0, "Value you’ve already captured this period."),
      },
      urgentBenefits: [],
      urgentBenefitCount: 0,
      nextBenefits: [],
      nextBenefitCount: 0,
      walletSummary: {
        trackedBenefits: 0,
        trackedCards: 0,
      },
      state: buildHomeState({
        trackedCards: 0,
        trackedBenefits: 0,
        urgentBenefitCount: 0,
        nextBenefitCount: 0,
      }),
    };
  }

  const { count: trackedBenefitsCount, error: trackedBenefitsError } = await supabase
    .from("user_benefits")
    .select("id", { count: "exact", head: true })
    .in("user_card_id", trackedCardIds)
    .eq("is_active", true);

  if (trackedBenefitsError) {
    throw trackedBenefitsError;
  }

  const { data: candidateRows, error: candidatesError } = await supabase
    .from("user_benefits")
    .select(
      "id, user_card_id, benefit_id, is_active, is_used_this_period, last_used_at, reminder_override, conditional_value, snoozed_until, user_cards!inner(id, card_id, card_anniversary_date, status, cards!inner(id, card_code, card_name, display_name, issuer, source_url, card_status)), benefits!inner(id, benefit_name, benefit_value, value_cents, cadence, reset_timing, enrollment_required, requires_setup, requires_selection, selection_type, track_in_memento)",
    )
    .eq("is_active", true)
    .eq("user_cards.user_id", userId)
    .eq("benefits.track_in_memento", "yes");

  if (candidatesError) {
    throw candidatesError;
  }

  const typedCandidateRows = (candidateRows ?? []) as unknown as HomeCandidateRow[];
  const periodKeys = Array.from(
    new Set(
      typedCandidateRows
        .map((row) => {
          const ownedUserCard = takeFirst(row.user_cards);
          const canonicalBenefit = takeFirst(row.benefits);
          if (!ownedUserCard || !canonicalBenefit) {
            return null;
          }

          return computeBenefitPeriod({
            cadence: canonicalBenefit.cadence,
            resetTiming: canonicalBenefit.reset_timing,
            cardAnniversaryDate: ownedUserCard.card_anniversary_date,
            now,
          })?.periodKey ?? null;
        })
        .filter((value): value is string => Boolean(value)),
    ),
  );
  const benefitIds = Array.from(new Set(typedCandidateRows.map((row) => row.benefit_id)));

  let periodStatusMap = new Map<string, PeriodStatusRow>();
  if (periodKeys.length > 0 && benefitIds.length > 0) {
    const { data: periodStatusRows, error: periodStatusError } = await supabase
      .from("user_benefit_period_status")
      .select("benefit_id, period_key, is_used, used_at")
      .eq("user_id", userId)
      .in("benefit_id", benefitIds)
      .in("period_key", periodKeys);

    if (periodStatusError) {
      throw periodStatusError;
    }

    periodStatusMap = buildBenefitPeriodStatusMap((periodStatusRows ?? []) as PeriodStatusRow[]);
  }

  const allTrackedBenefits = sortHomeFeedItems(
    typedCandidateRows
      .map((row) => mapHomeFeedItem(row, now, periodStatusMap))
      .filter((row): row is HomeFeedItem => row !== null),
  );

  const unusedBenefits = allTrackedBenefits.filter((item) => !item.isUsedThisPeriod);
  const actionableBenefits = unusedBenefits.filter((item) => {
    if (item.snoozedUntil && new Date(item.snoozedUntil) > now) {
      return false;
    }

    return true;
  });

  const urgentBenefits = actionableBenefits.filter((item) => item.daysRemaining <= RESETTING_SOON_WINDOW_DAYS);
  const nextBenefitsAll = actionableBenefits.filter((item) => item.daysRemaining > RESETTING_SOON_WINDOW_DAYS);
  const nextBenefits = nextBenefitsAll.slice(0, NEXT_BENEFITS_LIMIT);

  const availableNowValueCents = unusedBenefits.reduce((sum, item) => sum + item.currentPeriodValueCents, 0);
  const resettingSoonValueCents = unusedBenefits
    .filter((item) => item.daysRemaining <= RESETTING_SOON_WINDOW_DAYS)
    .reduce((sum, item) => sum + item.currentPeriodValueCents, 0);
  const capturedThisPeriodValueCents = allTrackedBenefits
    .filter((item) => item.isUsedThisPeriod)
    .reduce((sum, item) => sum + item.currentPeriodValueCents, 0);

  return {
    metrics: {
      availableNow: buildMetric(availableNowValueCents, "Unused value available in the current period."),
      resettingSoon: buildMetric(
        resettingSoonValueCents,
        "Unused value resetting within the next 14 days.",
      ),
      capturedThisPeriod: buildMetric(
        capturedThisPeriodValueCents,
        "Value you’ve already captured this period.",
      ),
    },
    urgentBenefits,
    urgentBenefitCount: urgentBenefits.length,
    nextBenefits,
    nextBenefitCount: nextBenefitsAll.length,
    walletSummary: {
      trackedBenefits: trackedBenefitsCount ?? 0,
      trackedCards,
    },
    state: buildHomeState({
      trackedCards,
      trackedBenefits: trackedBenefitsCount ?? 0,
      urgentBenefitCount: urgentBenefits.length,
      nextBenefitCount: nextBenefitsAll.length,
    }),
  };
}
