import type { ConfigurationStatus, ConfigurationType } from "@/lib/types/server-data";
import {
  computeBenefitPeriod,
  isBenefitResetOnAnniversary,
  normalizeSupportedBenefitCadence,
} from "@/lib/benefits/compute-benefit-period";

type BenefitValueInput = {
  benefitValue: string | null;
  valueCents?: number | null;
};

type ConfigurationInput = {
  requiresSelection?: boolean | null;
  selectionType?: string | null;
  requiresSetup?: boolean | null;
};

type ConfigurationStatusInput = ConfigurationInput & {
  conditionalValue?: string | null;
};

const SHORT_MONTH_DAY_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});
const RENEWAL_RESET_PATTERN = /\brenew(?:al|s)?\b/i;
const OFFER_TERMS_PATTERN = /\b(offer|booking|bookings|terms?)\b/i;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function normalizeCardArtUrl(sourceUrl: string | null | undefined) {
  return null;
}

export function formatBenefitValue({ benefitValue, valueCents }: BenefitValueInput) {
  const rawValue = benefitValue?.trim() || null;
  const parsedCents = typeof valueCents === "number" ? valueCents : null;

  if (rawValue) {
    const currencyMatch = rawValue.match(/\$\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)/);
    if (!currencyMatch) {
      return {
        value: rawValue,
        valueDescriptor: null,
        sortValue: parsedCents ?? 0,
      };
    }

    const normalizedCurrency = `$${currencyMatch[1]}`;
    const descriptor = rawValue.replace(currencyMatch[0], "").trim().replace(/^[-,:]\s*/, "") || null;
    const parsedNumeric = Number.parseFloat(currencyMatch[1].replace(/,/g, ""));

    return {
      value: normalizedCurrency,
      valueDescriptor: descriptor,
      sortValue: Number.isFinite(parsedNumeric) ? Math.round(parsedNumeric * 100) : parsedCents ?? 0,
    };
  }

  if (parsedCents && parsedCents > 0) {
    return {
      value: `$${(parsedCents / 100).toFixed(0)}`,
      valueDescriptor: null,
      sortValue: parsedCents,
    };
  }

  return {
    value: null,
    valueDescriptor: null,
    sortValue: 0,
  };
}

export function buildBenefitDescription({
  notes,
  resetTiming,
  enrollmentRequired,
  requiresSetup,
}: {
  notes: string | null;
  resetTiming: string | null;
  enrollmentRequired: boolean;
  requiresSetup: boolean;
}) {
  const parts = [
    notes?.trim() || null,
    resetTiming?.trim() ? `Resets: ${resetTiming.trim()}` : null,
    enrollmentRequired ? "Enrollment required." : null,
    requiresSetup ? "Additional setup required." : null,
  ].filter((part): part is string => Boolean(part));

  return parts.length > 0 ? parts.join(" ") : null;
}

export function getConfigurationType({
  requiresSelection,
  selectionType,
  requiresSetup,
}: ConfigurationInput): ConfigurationType {
  if (requiresSelection || Boolean(selectionType?.trim())) {
    return "selection";
  }

  if (requiresSetup) {
    return "setup";
  }

  return null;
}

export function getConfigurationStatus(input: ConfigurationStatusInput): ConfigurationStatus {
  const configurationType = getConfigurationType(input);

  if (!configurationType) {
    return "not_required";
  }

  return input.conditionalValue?.trim() ? "configured" : "needs_configuration";
}

export function formatBenefitDescriptionDisplay({
  displayDescription,
  notes,
  benefitName,
}: {
  displayDescription: string | null | undefined;
  notes: string | null | undefined;
  benefitName: string;
}): string | null {
  const trimmed = displayDescription?.trim();
  if (trimmed) return trimmed;

  const trimmedNotes = notes?.trim();
  if (trimmedNotes && trimmedNotes.length <= 140) {
    const lower = trimmedNotes.toLowerCase();
    // Skip notes that look like raw metadata or source URLs
    if (!lower.startsWith("http") && !/^(annual|monthly|quarterly|semiannual|calendar year)/i.test(trimmedNotes)) {
      return trimmedNotes;
    }
  }

  const name = benefitName.toLowerCase();
  if (name.includes("airline")) return "Statement credits for eligible airline incidental fees.";
  if (name.includes("wireless")) return "Statement credits for eligible wireless purchases.";
  if (name.includes("global entry") || name.includes("tsa precheck") || name.includes("tsa pre✓")) {
    return "Credit for eligible application fees.";
  }
  if (name.includes("clear")) return "Credit toward an eligible CLEAR Plus membership.";
  if (name.includes("hotel")) return "Statement credits for eligible hotel bookings.";
  if (name.includes("dell")) return "Statement credits for eligible Dell purchases.";
  if (name.includes("adobe")) return "Statement credits for eligible Adobe purchases.";
  if (name.includes("indeed")) return "Statement credits for eligible Indeed purchases.";
  if (name.includes("hilton")) return "Statement credits for eligible Hilton purchases.";
  return "Track this benefit so Memento can remind you before it resets.";
}

export function getBenefitPeriodLabel({
  cadence,
  resetTiming,
  cardAnniversaryDate,
  now = new Date(),
}: {
  cadence: string | null;
  resetTiming?: string | null;
  cardAnniversaryDate?: string | null;
  now?: Date;
}) {
  const period = computeBenefitPeriod({
    cadence: normalizeSupportedBenefitCadence(cadence),
    resetTiming,
    cardAnniversaryDate,
    now,
  });

  if (period) {
    return period.periodLabel;
  }

  switch ((cadence ?? "").trim()) {
    case "one_time":
      return "One-time";
    case "per_booking":
      return "Per booking";
    default:
      return null;
  }
}

export function getBenefitResetsLabel({
  cadence,
  resetTiming,
  cardAnniversaryDate,
  now = new Date(),
}: {
  cadence: string | null;
  resetTiming?: string | null;
  cardAnniversaryDate?: string | null;
  now?: Date;
}) {
  const period = computeBenefitPeriod({
    cadence: normalizeSupportedBenefitCadence(cadence),
    resetTiming,
    cardAnniversaryDate,
    now,
  });

  if (period) {
    const periodEnd = new Date(period.periodEndDate);
    if (!Number.isNaN(periodEnd.getTime())) {
      const labelDate =
        period.resolvedCadence === "anniversary"
          ? new Date(periodEnd.getTime() + 86_400_000)
          : periodEnd;
      return SHORT_MONTH_DAY_FORMATTER.format(labelDate);
    }
  }

  const normalizedCadence = (cadence ?? "").trim();
  const normalizedResetTiming = (resetTiming ?? "").trim();

  if (
    normalizedCadence === "anniversary" ||
    isBenefitResetOnAnniversary(normalizedResetTiming)
  ) {
    return "Card anniversary";
  }

  if (RENEWAL_RESET_PATTERN.test(normalizedResetTiming)) {
    return "After renewal";
  }

  if (
    normalizedCadence === "per_booking" ||
    OFFER_TERMS_PATTERN.test(normalizedResetTiming)
  ) {
    return "Offer terms";
  }

  return "Varies";
}
