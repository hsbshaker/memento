import "server-only";

import { getServiceRoleSupabaseClient } from "@/lib/supabase/service-role";
import { normalizeWalletCardMetadata, type WalletCardMetadataInput } from "@/lib/wallet/wallet-card-metadata";

export async function updateWalletCardMetadata(
  userId: string,
  userCardId: string,
  input: WalletCardMetadataInput,
) {
  const supabase = getServiceRoleSupabaseClient();
  const normalized = normalizeWalletCardMetadata(input);

  const { data: ownedCard, error: lookupError } = await supabase
    .from("user_cards")
    .select("id")
    .eq("id", userCardId)
    .eq("user_id", userId)
    .maybeSingle();

  if (lookupError) {
    throw lookupError;
  }

  if (!ownedCard) {
    return null;
  }

  const { error: updateError } = await supabase
    .from("user_cards")
    .update({
      nickname: normalized.nickname,
      last_four: normalized.lastFour,
      opened_date: normalized.openedDate,
      user_card_type: normalized.userCardType,
    })
    .eq("id", userCardId)
    .eq("user_id", userId);

  if (updateError) {
    throw updateError;
  }

  return {
    userCardId,
    ...normalized,
  };
}
