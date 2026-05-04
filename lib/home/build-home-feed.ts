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
import { buildHomeFeedModel } from "@/lib/home/home-feed-model";
import {
  DEFAULT_HOME_TIMEFRAME,
  HOME_TIMEFRAME_OPTIONS,
  getHomeTimeframeEndDate,
  getHomeTimeframeOption,
} from "@/lib/home/home-timeframes";
import { getServiceRoleSupabaseClient } from "@/lib/supabase/service-role";
import type { HomeFeedItem, HomeFeedResult, HomeMetric, HomeTimeframeKey } from "@/lib/types/server-data";
import type { UserBenefitTrackingStatus } from "@/lib/constants/memento-schema";

type HomeCandidateRow = {
  id: string;
  user_card_id: string;
  benefit_id: string;
  is_active: boolean;
  tracking_status: UserBenefitTrackingStatus;
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

type LoadedHomeFeedData = {
  allActiveBenefits: HomeFeedItem[];
  trackedBenefitsCount: number;
  trackedCards: number;
  now: Date;
};

const RESETTING_SOON_WINDOW_DAYS = 14;
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
    trackingStatus: row.tracking_status,
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

// Selects the soonest timeframe that has at least one unused tracked benefit.
// Falls back to DEFAULT_HOME_TIMEFRAME if none found.
function selectSmartInitialTimeframe(allActiveBenefits: HomeFeedItem[], now: Date): HomeTimeframeKey {
  const trackedUnused = allActiveBenefits.filter(
    (item) => item.trackingStatus === "tracked" && !item.isUsedThisPeriod,
  );

  for (const option of HOME_TIMEFRAME_OPTIONS) {
    const end = getHomeTimeframeEndDate(now, option.key);
    const hasAny = trackedUnused.some((item) => new Date(item.resetDate) <= end);
    if (hasAny) return option.key;
  }

  return DEFAULT_HOME_TIMEFRAME;
}

function buildEmptyFeed(timeframe: HomeTimeframeKey): HomeFeedResult {
  const timeframeOption = getHomeTimeframeOption(timeframe);

  return {
    timeframe: timeframeOption,
    metrics: {
      availableNow: buildMetric(0, "Unused value available in the current period."),
      resettingSoon: buildMetric(0, "Unused value expiring in view."),
      capturedThisPeriod: buildMetric(0, "Value you've already captured this period."),
    },
    expiringBenefits: [],
    expiringBenefitCount: 0,
    usedExpiringBenefits: [],
    usedExpiringBenefitCount: 0,
    notTrackedBenefits: [],
    notTrackedBenefitCount: 0,
    walletSummary: {
      trackedBenefits: 0,
      trackedCards: 0,
    },
    state: {
      isEmpty: true,
      isAllCaughtUp: false,
      headline: "Add your first card to get started.",
      supportingText: "Track benefits here so Memento can tell you what to use next.",
    },
  };
}

async function loadHomeFeedData(userId: string): Promise<LoadedHomeFeedData | null> {
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
    return null;
  }

  const [
    { count: trackedBenefitsCount, error: trackedBenefitsError },
    { data: candidateRows, error: candidatesError },
  ] = await Promise.all([
    supabase
      .from("user_benefits")
      .select("id", { count: "exact", head: true })
      .in("user_card_id", trackedCardIds)
      .eq("is_active", true)
      .eq("tracking_status", "tracked"),
    supabase
      .from("user_benefits")
      .select(
        "id, user_card_id, benefit_id, is_active, tracking_status, is_used_this_period, last_used_at, reminder_override, conditional_value, snoozed_until, user_cards!inner(id, card_id, card_anniversary_date, status, cards!inner(id, card_code, card_name, display_name, issuer, source_url, card_status)), benefits!inner(id, benefit_name, benefit_value, value_cents, cadence, reset_timing, enrollment_required, requires_setup, requires_selection, selection_type, track_in_memento)",
      )
      .eq("is_active", true)
      .eq("user_cards.user_id", userId)
      .eq("benefits.track_in_memento", "yes"),
  ]);

  if (trackedBenefitsError) {
    throw trackedBenefitsError;
  }

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

  const allActiveBenefits = sortHomeFeedItems(
    typedCandidateRows
      .map((row) => mapHomeFeedItem(row, now, periodStatusMap))
      .filter((row): row is HomeFeedItem => row !== null),
  );

  return {
    allActiveBenefits,
    trackedBenefitsCount: trackedBenefitsCount ?? 0,
    trackedCards,
    now,
  };
}

export async function buildHomeFeed(
  userId: string,
  timeframe: HomeTimeframeKey = DEFAULT_HOME_TIMEFRAME,
): Promise<HomeFeedResult> {
  const data = await loadHomeFeedData(userId);

  if (!data) {
    return buildEmptyFeed(timeframe);
  }

  return buildHomeFeedModel({
    allActiveBenefits: data.allActiveBenefits,
    trackedBenefits: data.trackedBenefitsCount,
    trackedCards: data.trackedCards,
    now: data.now,
    timeframe,
  });
}

// Builds the initial home feed with smart timeframe selection.
// Picks the soonest window that has at least one unused tracked benefit.
export async function buildInitialHomeFeed(userId: string): Promise<HomeFeedResult> {
  const data = await loadHomeFeedData(userId);

  if (!data) {
    return buildEmptyFeed(DEFAULT_HOME_TIMEFRAME);
  }

  const timeframe = selectSmartInitialTimeframe(data.allActiveBenefits, data.now);

  return buildHomeFeedModel({
    allActiveBenefits: data.allActiveBenefits,
    trackedBenefits: data.trackedBenefitsCount,
    trackedCards: data.trackedCards,
    now: data.now,
    timeframe,
  });
}
