import { NextResponse } from "next/server";
import type { UserCardType } from "@/lib/constants/memento-schema";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { updateWalletCardMetadata } from "@/lib/wallet/update-wallet-card-metadata";

type UpdateCardMetadataBody = {
  userCardId?: string;
  nickname?: string | null;
  lastFour?: string | null;
  openedDate?: string | null;
  userCardType?: UserCardType | null | "";
};

export async function PATCH(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as UpdateCardMetadataBody;
  const userCardId = body.userCardId?.trim();

  if (!userCardId) {
    return NextResponse.json({ error: "Missing user card id." }, { status: 400 });
  }

  try {
    const result = await updateWalletCardMetadata(user.id, userCardId, {
      nickname: body.nickname,
      lastFour: body.lastFour,
      openedDate: body.openedDate,
      userCardType: body.userCardType || null,
    });

    if (!result) {
      return NextResponse.json({ error: "Card not found." }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update card details.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
