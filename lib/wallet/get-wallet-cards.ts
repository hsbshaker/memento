import "server-only";

import { getCleanCardName, getIssuerDisplayName } from "@/lib/format-card";
import { getServiceRoleSupabaseClient } from "@/lib/supabase/service-role";
import type { WalletCardListItem } from "@/lib/types/server-data";

type WalletCardRow = {
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

function isMissingColumnError(error: unknown): error is { code: string } {
  return typeof error === "object" && error !== null && "code" in error && error.code === "42703";
}

export async function getWalletCards(userId: string): Promise<WalletCardListItem[]> {
  const supabase = getServiceRoleSupabaseClient();

  const loadWalletRows = async (selectClause: string) => {
    const { data, error } = await supabase
      .from("user_cards")
      .select(selectClause)
      .eq("user_id", userId)
      .eq("status", "active")
      .order("added_at", { ascending: false });

    if (error) {
      throw error;
    }

    return (data ?? []) as unknown as WalletCardRow[];
  };

  let rows: WalletCardRow[];

  try {
    rows = await loadWalletRows(
      "id, card_id, nickname, last_four, opened_date, user_card_type, added_at, created_at, cards!inner(card_name, display_name, issuer)",
    );
  } catch (error) {
    if (!isMissingColumnError(error)) {
      throw error;
    }

    rows = await loadWalletRows("id, card_id, added_at, created_at, cards!inner(card_name, display_name, issuer)");
  }

  return rows.map((row) => {
    const card = takeFirst(row.cards);

    return {
      userCardId: row.id,
      cardId: row.card_id,
      cardName: getCleanCardName(card?.display_name ?? null, card?.card_name ?? "Unknown card"),
      issuer: getIssuerDisplayName(card?.issuer ?? ""),
      nickname: normalizeOptionalText(row.nickname),
      lastFour: normalizeOptionalText(row.last_four),
      openedDate: row.opened_date,
      userCardType: row.user_card_type ?? null,
      addedAt: row.added_at,
      createdAt: row.created_at,
      sortDate: row.added_at || row.created_at,
    };
  });
}
