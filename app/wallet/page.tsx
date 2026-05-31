import { redirect } from "next/navigation";
import { WalletScreen } from "@/components/wallet/WalletScreen";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getWalletCards } from "@/lib/wallet/get-wallet-cards";

export const dynamic = "force-dynamic";

type WalletPageProps = {
  searchParams: Promise<{
    addCard?: string;
  }>;
};

export default async function WalletPage({ searchParams }: WalletPageProps) {
  const { addCard } = await searchParams;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const cards = await getWalletCards(user.id);

  return <WalletScreen cards={cards} initialAddModalOpen={addCard === "1"} />;
}
