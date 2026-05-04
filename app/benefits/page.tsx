import { Suspense } from "react";
import { redirect } from "next/navigation";
import { BenefitsScreen } from "@/components/benefits/BenefitsScreen";
import { buildBenefitsFeed } from "@/lib/benefits/build-benefits-feed";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function BenefitsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const initialFeed = await buildBenefitsFeed(user.id);

  return (
    <Suspense>
      <BenefitsScreen initialFeed={initialFeed} />
    </Suspense>
  );
}
