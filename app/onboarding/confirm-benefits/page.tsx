import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { loadConfirmBenefitsData } from "./components/confirm-benefits-data";
import { ConfirmBenefitsScreen } from "./components/confirm-benefits-screen";

export default async function ConfirmBenefitsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const data = await loadConfirmBenefitsData({ supabase, userId: user.id });

  return <ConfirmBenefitsScreen data={data} />;
}
