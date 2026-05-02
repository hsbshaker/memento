import "server-only";

import { benefitRequiresAnniversaryDate } from "@/lib/onboarding/confirm-benefits";
import { getServiceRoleSupabaseClient } from "@/lib/supabase/service-role";

export type SaveConfirmBenefitsInput = {
  userCards: Array<{
    userCardId: string;
    cardAnniversaryDate?: string | null;
    benefits: Array<{
      benefitId: string;
      selected: boolean;
    }>;
  }>;
};

type OwnedUserCardRow = {
  id: string;
  card_id: string;
  status: "active" | "removed";
  card_anniversary_date: string | null;
};

type CanonicalBenefitRow = {
  id: string;
  card_id: string;
  reset_timing: string | null;
  notes: string | null;
};

function normalizeDateInput(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function isIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export async function saveConfirmBenefits(userId: string, input: SaveConfirmBenefitsInput) {
  const submittedUserCards = Array.isArray(input.userCards) ? input.userCards : [];

  if (submittedUserCards.length === 0) {
    throw new Error("No cards were submitted.");
  }

  const submittedUserCardIds = Array.from(
    new Set(submittedUserCards.map((card) => card.userCardId?.trim()).filter(Boolean)),
  ) as string[];

  if (submittedUserCardIds.length !== submittedUserCards.length) {
    throw new Error("Duplicate or invalid cards were submitted.");
  }

  const submittedBenefitIds = Array.from(
    new Set(
      submittedUserCards.flatMap((card) =>
        (Array.isArray(card.benefits) ? card.benefits : [])
          .map((benefit) => benefit.benefitId?.trim())
          .filter(Boolean),
      ),
    ),
  ) as string[];

  const supabase = getServiceRoleSupabaseClient();

  const { data: ownedUserCards, error: userCardsError } = await supabase
    .from("user_cards")
    .select("id, card_id, status, card_anniversary_date")
    .eq("user_id", userId)
    .in("id", submittedUserCardIds);

  if (userCardsError) {
    throw userCardsError;
  }

  const ownedUserCardRows = (ownedUserCards ?? []) as OwnedUserCardRow[];
  if (ownedUserCardRows.length !== submittedUserCardIds.length) {
    throw new Error("One or more submitted cards could not be verified.");
  }

  const ownedUserCardMap = new Map(ownedUserCardRows.map((row) => [row.id, row]));
  for (const userCard of submittedUserCards) {
    const ownedRow = ownedUserCardMap.get(userCard.userCardId);
    if (!ownedRow || ownedRow.status !== "active") {
      throw new Error("One or more submitted cards are unavailable.");
    }
  }

  const { data: canonicalBenefits, error: benefitsError } = await supabase
    .from("benefits")
    .select("id, card_id, reset_timing, notes")
    .in("id", submittedBenefitIds);

  if (benefitsError) {
    throw benefitsError;
  }

  const canonicalBenefitRows = (canonicalBenefits ?? []) as CanonicalBenefitRow[];
  if (canonicalBenefitRows.length !== submittedBenefitIds.length) {
    throw new Error("One or more submitted benefits could not be verified.");
  }

  const canonicalBenefitMap = new Map(canonicalBenefitRows.map((row) => [row.id, row]));

  const upsertRows: Array<{
    user_card_id: string;
    benefit_id: string;
    is_active: boolean;
    tracking_status: "tracked" | "not_tracked";
  }> = [];

  const anniversaryUpdates: Array<{ userCardId: string; cardAnniversaryDate: string }> = [];

  for (const submittedUserCard of submittedUserCards) {
    const ownedCard = ownedUserCardMap.get(submittedUserCard.userCardId);
    if (!ownedCard) {
      throw new Error("One or more submitted cards could not be verified.");
    }

    const submittedBenefits = Array.isArray(submittedUserCard.benefits) ? submittedUserCard.benefits : [];
    const perCardBenefitIds = new Set<string>();
    let requiresAnniversaryDate = false;

    for (const submittedBenefit of submittedBenefits) {
      const benefitId = submittedBenefit.benefitId?.trim();
      if (!benefitId || typeof submittedBenefit.selected !== "boolean") {
        throw new Error("Submitted benefit selections are invalid.");
      }

      if (perCardBenefitIds.has(benefitId)) {
        throw new Error("Duplicate benefits were submitted for a card.");
      }
      perCardBenefitIds.add(benefitId);

      const canonicalBenefit = canonicalBenefitMap.get(benefitId);
      if (!canonicalBenefit || canonicalBenefit.card_id !== ownedCard.card_id) {
        throw new Error("A submitted benefit does not belong to the selected card.");
      }

      if (submittedBenefit.selected && benefitRequiresAnniversaryDate(canonicalBenefit)) {
        requiresAnniversaryDate = true;
      }

      upsertRows.push({
        user_card_id: submittedUserCard.userCardId,
        benefit_id: benefitId,
        is_active: true,
        tracking_status: submittedBenefit.selected ? "tracked" : "not_tracked",
      });
    }

    const normalizedAnniversaryDate = normalizeDateInput(submittedUserCard.cardAnniversaryDate);

    if (requiresAnniversaryDate) {
      if (!normalizedAnniversaryDate || !isIsoDate(normalizedAnniversaryDate)) {
        throw new Error("A required card anniversary date is missing.");
      }

      anniversaryUpdates.push({
        userCardId: submittedUserCard.userCardId,
        cardAnniversaryDate: normalizedAnniversaryDate,
      });
    } else if (normalizedAnniversaryDate && isIsoDate(normalizedAnniversaryDate)) {
      anniversaryUpdates.push({
        userCardId: submittedUserCard.userCardId,
        cardAnniversaryDate: normalizedAnniversaryDate,
      });
    }
  }

  const { error: upsertError } = await supabase.from("user_benefits").upsert(upsertRows, {
    onConflict: "user_card_id,benefit_id",
  });

  if (upsertError) {
    throw upsertError;
  }

  for (const update of anniversaryUpdates) {
    const { error: anniversaryError } = await supabase
      .from("user_cards")
      .update({
        card_anniversary_date: update.cardAnniversaryDate,
      })
      .eq("id", update.userCardId)
      .eq("user_id", userId);

    if (anniversaryError) {
      throw anniversaryError;
    }
  }

  return { success: true as const };
}
