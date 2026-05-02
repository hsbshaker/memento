import { redirect } from "next/navigation";
import { WalletScreen } from "@/components/wallet/WalletScreen";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getWalletCards } from "@/lib/wallet/get-wallet-cards";

export const dynamic = "force-dynamic";

export default async function WalletPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const cards = await getWalletCards(user.id);

  return <WalletScreen cards={cards} />;
}
