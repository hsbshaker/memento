import { NextResponse } from "next/server";
import type { UserCardType } from "@/lib/constants/memento-schema";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { addWalletCard } from "@/lib/wallet/add-wallet-card";

type AddWalletCardBody = {
  cardId?: string;
  nickname?: string | null;
  lastFour?: string | null;
  openedDate?: string | null;
  userCardType?: UserCardType | null | "";
};

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as AddWalletCardBody;
  const cardId = body.cardId?.trim();

  if (!cardId) {
    return NextResponse.json({ error: "Choose a card to add." }, { status: 400 });
  }

  try {
    const result = await addWalletCard(user.id, cardId, {
      nickname: body.nickname,
      lastFour: body.lastFour,
      openedDate: body.openedDate,
      userCardType: body.userCardType || null,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to add card.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
