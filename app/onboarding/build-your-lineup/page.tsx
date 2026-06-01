import { redirect } from "next/navigation";
import { OnboardingNav } from "@/components/onboarding/OnboardingNav";
import { LineupCardSearch } from "./components/lineup-card-search";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function BuildYourLineupPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  return (
    <div className="relative min-h-[100dvh] overflow-x-hidden bg-background text-foreground">
      <div className="relative z-10 min-h-[100dvh] px-6 py-6">
        <OnboardingNav />

        <div className="mb-10 text-center">
          <h1 className="mb-3 text-3xl font-bold tracking-tight text-foreground">Build Your Lineup</h1>
          <p className="text-muted-foreground">Select the cards in your wallet to begin tracking.</p>
        </div>

        <LineupCardSearch />
      </div>
    </div>
  );
}
