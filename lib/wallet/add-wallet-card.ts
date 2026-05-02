import "server-only";

import { getAddCardFlowPreview } from "@/lib/cards/get-add-card-flow-preview";
import { getCleanCardName, getIssuerDisplayName } from "@/lib/format-card";
import { getServiceRoleSupabaseClient } from "@/lib/supabase/service-role";
import type { WalletCardListItem } from "@/lib/types/server-data";
import { normalizeWalletCardMetadata, type WalletCardMetadataInput } from "@/lib/wallet/wallet-card-metadata";

type AddedWalletCardRow = {
  id: string;
  card_id: string;
  nickname: string | null;
  last_four: string | null;
  opened_date: string | null;
  user_card_type: "personal" | "business" | null;
  added_at: string;
  created_at: string;
  cards: {
    card_name: string;
    display_name: string | null;
    issuer: string | null;
  } | {
    card_name: string;
    display_name: string | null;
    issuer: string | null;
  }[] | null;
};

function takeFirst<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function normalizeOptionalText(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function mapWalletCardRow(row: AddedWalletCardRow): WalletCardListItem {
  const card = takeFirst(row.cards);

  return {
    userCardId: row.id,
    cardId: row.card_id,
    cardName: getCleanCardName(card?.display_name ?? null, card?.card_name ?? "Unknown card"),
    issuer: getIssuerDisplayName(card?.issuer ?? ""),
    nickname: normalizeOptionalText(row.nickname),
    lastFour: normalizeOptionalText(row.last_four),
    openedDate: row.opened_date,
    userCardType: row.user_card_type,
    addedAt: row.added_at,
    createdAt: row.created_at,
    sortDate: row.added_at || row.created_at,
  };
}

export async function addWalletCard(userId: string, cardId: string, input: WalletCardMetadataInput) {
  const supabase = getServiceRoleSupabaseClient();
  const normalized = normalizeWalletCardMetadata(input);
  const preview = await getAddCardFlowPreview(cardId);

  if (!preview) {
    throw new Error("Card preview not found.");
  }

  const { count: existingCardCount, error: existingCardError } = await supabase
    .from("user_cards")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("card_id", cardId)
    .neq("status", "removed");

  if (existingCardError) {
    throw existingCardError;
  }

  const { data: insertedUserCard, error: userCardError } = await supabase
    .from("user_cards")
    .insert({
      user_id: userId,
      card_id: cardId,
      status: "active",
      nickname: normalized.nickname,
      last_four: normalized.lastFour,
      opened_date: normalized.openedDate,
      user_card_type: normalized.userCardType,
    })
    .select("id")
    .single();

  if (userCardError || !insertedUserCard) {
    throw userCardError ?? new Error("Failed to create user card.");
  }

  const userBenefitRows = preview.allBenefits.map((benefit) => ({
    user_card_id: insertedUserCard.id,
    benefit_id: benefit.benefitId,
    is_active: true,
    conditional_value: null,
  }));

  if (userBenefitRows.length > 0) {
    const { error: userBenefitsError } = await supabase.from("user_benefits").insert(userBenefitRows);
    if (userBenefitsError) {
      await supabase.from("user_cards").delete().eq("id", insertedUserCard.id);
      throw userBenefitsError;
    }
  }

  const { data: cardRow, error: cardLookupError } = await supabase
    .from("user_cards")
    .select(
      "id, card_id, nickname, last_four, opened_date, user_card_type, added_at, created_at, cards!inner(card_name, display_name, issuer)",
    )
    .eq("id", insertedUserCard.id)
    .eq("user_id", userId)
    .single();

  if (cardLookupError || !cardRow) {
    throw cardLookupError ?? new Error("Failed to load created card.");
  }

  return {
    duplicateStatus: (existingCardCount ?? 0) > 0 ? "possible_duplicate" : "none",
    card: mapWalletCardRow(cardRow as unknown as AddedWalletCardRow),
  };
}
