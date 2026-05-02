import type { SupabaseClient } from "@supabase/supabase-js";
import { formatBenefitDescriptionDisplay, formatBenefitValue, getBenefitPeriodLabel } from "@/lib/benefits/format-benefit-labels";
import { getIssuerDisplayName } from "@/lib/format-card";
import { benefitRequiresAnniversaryDate } from "@/lib/onboarding/confirm-benefits";

type WalletCardRow = {
  id: string;
  card_id: string;
  card_anniversary_date: string | null;
  created_at: string;
  status: "active" | "removed";
  cards:
    | {
        id: string;
        card_name: string;
        display_name: string | null;
        card_code: string | null;
        issuer: string | null;
        card_status: "active" | "no_trackable_benefits" | "retired" | null;
        source_url: string | null;
      }
    | {
        id: string;
        card_name: string;
        display_name: string | null;
        card_code: string | null;
        issuer: string | null;
        card_status: "active" | "no_trackable_benefits" | "retired" | null;
        source_url: string | null;
      }[]
    | null;
};

type CanonicalBenefitRow = {
  id: string;
  card_id: string;
  benefit_name: string | null;
  benefit_value: string | null;
  value_cents: number | null;
  cadence: string | null;
  reset_timing: string | null;
  enrollment_required: boolean | null;
  requires_setup: boolean | null;
  track_in_memento: "yes" | "later" | "no" | null;
  source_url: string | null;
  notes: string | null;
  display_description: string | null;
};

type UserBenefitPreferenceRow = {
  id: string;
  user_card_id: string;
  benefit_id: string;
  is_active: boolean;
  tracking_status: "tracked" | "not_tracked";
};

export type ConfirmBenefitRow = {
  userCardId: string;
  cardId: string;
  benefitId: string;
  benefitName: string;
  valueDisplay: string | null;
  cadenceDisplay: string | null;
  resetDisplay: string | null;
  enrollmentRequired: boolean;
  requiresSetup: boolean;
  notes: string | null;
  sourceUrl: string | null;
  requiresAnniversaryDate: boolean;
  selected: boolean;
  descriptionDisplay: string | null;
};

export type ConfirmBenefitCardGroup = {
  userCardId: string;
  cardId: string;
  cardName: string;
  cardCode: string | null;
  issuer: string | null;
  anniversaryDate: string | null;
  requiresAnniversaryDate: boolean;
  benefits: ConfirmBenefitRow[];
  selectedCount: number;
  totalCount: number;
};

export type ConfirmBenefitsPageData = {
  cardGroups: ConfirmBenefitCardGroup[];
  totalCards: number;
  totalBenefits: number;
  totalSelected: number;
  totalPotentialValueCents: number | null;
  totalPotentialValueIsPartial: boolean;
};

function takeFirst<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function formatCadenceLabel(cadence: string | null) {
  switch ((cadence ?? "").trim()) {
    case "monthly":
      return "Monthly";
    case "quarterly":
      return "Quarterly";
    case "semiannual":
    case "semi_annual":
      return "Semi-annual";
    case "annual":
      return "Annual";
    case "multi_year":
      return "Multi-year";
    case "one_time":
      return "One-time";
    case "per_booking":
      return "Per booking";
    default:
      return null;
  }
}

function formatCurrencyAmountsInText(value: string) {
  return value.replace(/\$\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)/g, (_, amount: string) => {
    const parsed = Number.parseFloat(amount.replace(/,/g, ""));
    if (!Number.isFinite(parsed)) {
      return `$${amount}`;
    }

    const formatter = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: amount.includes(".") ? 2 : 0,
      maximumFractionDigits: 2,
    });

    return `$${formatter.format(parsed)}`;
  });
}

function formatCadenceFromResetTiming(resetTiming: string | null) {
  const normalized = resetTiming?.trim().toLowerCase() ?? "";

  if (normalized.includes("4 year")) return "Every 4 years";
  if (normalized.includes("multi-year")) return "Multi-year";
  return null;
}

function formatBenefitValueDisplay(
  benefit: Pick<CanonicalBenefitRow, "benefit_value" | "value_cents" | "cadence" | "reset_timing">,
) {
  const rawValue = benefit.benefit_value?.trim() || null;

  if (rawValue) {
    const normalizedRaw = formatCurrencyAmountsInText(rawValue);

    const upToCadenceWithAnnual = normalizedRaw.match(
      /^(\$[\d,]+(?:\.\d{1,2})?)\s+Up to\s+\/(month|quarter)\s+\((\$[\d,]+(?:\.\d{1,2})?\/year)\)$/i,
    );
    if (upToCadenceWithAnnual) {
      return `Up to ${upToCadenceWithAnnual[1]}/${upToCadenceWithAnnual[2].toLowerCase()}, ${upToCadenceWithAnnual[3]}`;
    }

    const upToSimpleCadence = normalizedRaw.match(
      /^(\$[\d,]+(?:\.\d{1,2})?)\s+Up to\s+\/(year|month|quarter)$/i,
    );
    if (upToSimpleCadence) {
      return `Up to ${upToSimpleCadence[1]}/${upToSimpleCadence[2].toLowerCase()}`;
    }

    const upToSemiannual = normalizedRaw.match(/^(\$[\d,]+(?:\.\d{1,2})?)\s+Up to\s+semiannually$/i);
    if (upToSemiannual) {
      return `Up to ${upToSemiannual[1]} semiannually`;
    }

    const upToAnnualWithParens = normalizedRaw.match(
      /^(\$[\d,]+(?:\.\d{1,2})?)\s+Up to\s+\/year\s+\((\$[\d,]+(?:\.\d{1,2})?\/year)\)$/i,
    );
    if (upToAnnualWithParens) {
      if (upToAnnualWithParens[1] === upToAnnualWithParens[2].replace(/\/year$/i, "")) {
        return `Up to ${upToAnnualWithParens[1]}/year`;
      }

      return `Up to ${upToAnnualWithParens[1]}/year, ${upToAnnualWithParens[2]}`;
    }

    return normalizedRaw;
  }

  const formattedValue = formatBenefitValue({
    benefitValue: benefit.benefit_value,
    valueCents: benefit.value_cents,
  });

  if (!formattedValue.value) {
    return null;
  }

  const cadenceSuffix =
    benefit.cadence === "monthly"
      ? "/month"
      : benefit.cadence === "quarterly"
        ? "/quarter"
        : benefit.cadence === "annual"
          ? "/year"
          : benefit.cadence === "semiannual" || benefit.cadence === "semi_annual"
            ? " semiannually"
            : benefit.cadence === "multi_year"
              ? ` ${formatCadenceFromResetTiming(benefit.reset_timing) ?? "Multi-year"}`
              : "";

  return cadenceSuffix ? `Up to ${formattedValue.value}${cadenceSuffix}` : formattedValue.value;
}

function buildResetDisplay(benefit: Pick<CanonicalBenefitRow, "cadence" | "reset_timing">, anniversaryDate: string | null) {
  const periodLabel = getBenefitPeriodLabel({
    cadence: benefit.cadence,
    resetTiming: benefit.reset_timing,
    cardAnniversaryDate: anniversaryDate,
  });

  if (periodLabel && !/^\d{4}$/.test(periodLabel.trim())) {
    return periodLabel;
  }

  const resetTiming = benefit.reset_timing?.trim() || null;
  if (!resetTiming) return null;

  return /^\d{4}$/.test(resetTiming) ? null : resetTiming;
}

function getAnnualizedBenefitValueCents(
  benefit: Pick<CanonicalBenefitRow, "benefit_value" | "value_cents" | "cadence">,
) {
  const fallbackParsedValue = formatBenefitValue({
    benefitValue: benefit.benefit_value,
    valueCents: benefit.value_cents,
  }).sortValue;
  const baseValueCents = benefit.value_cents && benefit.value_cents > 0 ? benefit.value_cents : fallbackParsedValue;

  if (baseValueCents == null || baseValueCents <= 0) {
    return null;
  }

  switch ((benefit.cadence ?? "").trim()) {
    case "monthly":
      return baseValueCents * 12;
    case "quarterly":
      return baseValueCents * 4;
    case "semiannual":
    case "semi_annual":
      return baseValueCents * 2;
    case "annual":
    case "":
      return baseValueCents;
    default:
      return null;
  }
}

export async function loadConfirmBenefitsData({
  supabase,
  userId,
}: {
  supabase: SupabaseClient;
  userId: string;
}): Promise<ConfirmBenefitsPageData> {
  const { data: walletRows, error: walletError } = await supabase
    .from("user_cards")
    .select(
      "id, card_id, card_anniversary_date, created_at, status, cards!inner(id, card_name, display_name, card_code, issuer, card_status, source_url)",
    )
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: true });

  if (walletError) {
    throw walletError;
  }

  const typedWalletRows = (walletRows ?? []) as unknown as WalletCardRow[];

  if (typedWalletRows.length === 0) {
    return {
      cardGroups: [],
      totalCards: 0,
      totalBenefits: 0,
      totalSelected: 0,
      totalPotentialValueCents: null,
      totalPotentialValueIsPartial: false,
    };
  }

  const cardIds = Array.from(new Set(typedWalletRows.map((row) => row.card_id)));
  const { data: benefitRows, error: benefitError } = await supabase
    .from("benefits")
    .select(
      "id, card_id, benefit_name, benefit_value, value_cents, cadence, reset_timing, enrollment_required, requires_setup, track_in_memento, source_url, notes, display_description",
    )
    .in("card_id", cardIds)
    .eq("track_in_memento", "yes");

  if (benefitError) {
    throw benefitError;
  }

  const typedBenefitRows = (benefitRows ?? []) as unknown as CanonicalBenefitRow[];
  const userCardIds = typedWalletRows.map((row) => row.id);
  const benefitIds = typedBenefitRows.map((row) => row.id);

  let preferenceMap = new Map<string, UserBenefitPreferenceRow>();
  if (userCardIds.length > 0 && benefitIds.length > 0) {
    const { data: preferenceRows, error: preferenceError } = await supabase
      .from("user_benefits")
      .select("id, user_card_id, benefit_id, is_active, tracking_status")
      .in("user_card_id", userCardIds)
      .in("benefit_id", benefitIds);

    if (preferenceError) {
      throw preferenceError;
    }

    preferenceMap = new Map(
      ((preferenceRows ?? []) as UserBenefitPreferenceRow[]).map((row) => [
        `${row.user_card_id}:${row.benefit_id}`,
        row,
      ]),
    );
  }

  const benefitRowsByCardId = new Map<string, CanonicalBenefitRow[]>();
  for (const benefit of typedBenefitRows) {
    const existing = benefitRowsByCardId.get(benefit.card_id) ?? [];
    existing.push(benefit);
    benefitRowsByCardId.set(benefit.card_id, existing);
  }

  const cardGroups = typedWalletRows.map((walletRow) => {
    const canonicalCard = takeFirst(walletRow.cards);
    const cardBenefits = (benefitRowsByCardId.get(walletRow.card_id) ?? [])
      .slice()
      .sort((a, b) => (a.benefit_name ?? "").localeCompare(b.benefit_name ?? ""));

    const benefits = cardBenefits.map((benefit) => {
      const existingPreference = preferenceMap.get(`${walletRow.id}:${benefit.id}`);
      const selected =
        existingPreference == null
          ? true
          : existingPreference.is_active && existingPreference.tracking_status !== "not_tracked";
      const requiresAnniversaryDate = benefitRequiresAnniversaryDate(benefit);

      return {
        userCardId: walletRow.id,
        cardId: walletRow.card_id,
        benefitId: benefit.id,
        benefitName: benefit.benefit_name?.trim() || "Unnamed benefit",
        valueDisplay: formatBenefitValueDisplay(benefit),
        cadenceDisplay: formatCadenceLabel(benefit.cadence),
        resetDisplay: buildResetDisplay(
          benefit,
          requiresAnniversaryDate ? walletRow.card_anniversary_date : null,
        ),
        enrollmentRequired: benefit.enrollment_required === true,
        requiresSetup: benefit.requires_setup === true,
        notes: benefit.notes,
        sourceUrl: benefit.source_url,
        requiresAnniversaryDate,
        selected,
        descriptionDisplay: formatBenefitDescriptionDisplay({
          displayDescription: benefit.display_description,
          notes: benefit.notes,
          benefitName: benefit.benefit_name?.trim() || "Unnamed benefit",
        }),
      } satisfies ConfirmBenefitRow;
    });

    const selectedCount = benefits.filter((benefit) => benefit.selected).length;

    return {
      userCardId: walletRow.id,
      cardId: walletRow.card_id,
      cardName: canonicalCard?.display_name ?? canonicalCard?.card_name ?? "Unknown card",
      cardCode: canonicalCard?.card_code ?? null,
      issuer: canonicalCard?.issuer ? getIssuerDisplayName(canonicalCard.issuer) : null,
      anniversaryDate: walletRow.card_anniversary_date,
      requiresAnniversaryDate: benefits.some((benefit) => benefit.selected && benefit.requiresAnniversaryDate),
      benefits,
      selectedCount,
      totalCount: benefits.length,
    } satisfies ConfirmBenefitCardGroup;
  });

  let totalPotentialValueCents = 0;
  let hasIncludedPotentialValue = false;
  let excludedValuableBenefitsCount = 0;

  for (const benefit of typedBenefitRows) {
    const annualizedValue = getAnnualizedBenefitValueCents(benefit);
    if (annualizedValue != null) {
      totalPotentialValueCents += annualizedValue;
      hasIncludedPotentialValue = true;
      continue;
    }

    if ((benefit.value_cents ?? 0) > 0) {
      excludedValuableBenefitsCount += 1;
    }
  }

  return {
    cardGroups,
    totalCards: cardGroups.length,
    totalBenefits: cardGroups.reduce((sum, group) => sum + group.totalCount, 0),
    totalSelected: cardGroups.reduce((sum, group) => sum + group.selectedCount, 0),
    totalPotentialValueCents: hasIncludedPotentialValue ? totalPotentialValueCents : null,
    totalPotentialValueIsPartial: excludedValuableBenefitsCount > 0,
  };
}
