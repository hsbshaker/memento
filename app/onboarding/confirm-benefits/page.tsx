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

  const MIN_MS = 6100;
  const t0 = Date.now();
  const data = await loadConfirmBenefitsData({ supabase, userId: user.id });
  const remaining = MIN_MS - (Date.now() - t0);
  if (remaining > 0) await new Promise((r) => setTimeout(r, remaining));

  return <ConfirmBenefitsScreen data={data} />;
}
