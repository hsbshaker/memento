import type { CSSProperties } from "react";
import { redirect } from "next/navigation";
import { LineupCardSearch } from "./components/lineup-card-search";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function BuildYourLineupPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  return (
    <div
      className="relative min-h-[100dvh] overflow-x-hidden bg-background text-foreground dark"
      style={
        {
          "--background": "#0D0D11",
          "--foreground": "#ffffff",
        } as CSSProperties
      }
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-visible">
        <div className="absolute left-[-5%] top-[-15%] h-[65vw] w-[65vw] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(74,158,255,0.09)_0%,transparent_60%)] blur-3xl" />
        <div className="absolute left-[20%] top-[30%] h-[40vw] w-[40vw] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(74,158,255,0.04)_0%,transparent_70%)] blur-3xl" />
        <div className="absolute right-[-5%] top-[-5%] h-[45vw] w-[45vw] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(200,169,75,0.07)_0%,transparent_65%)] blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)",
            backgroundSize: "80px 80px",
          }}
        />
        <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-background to-transparent" />
      </div>

      <div className="relative z-10 min-h-[100dvh] px-6 py-6">
        <nav className="mx-auto flex w-full max-w-2xl items-center justify-center px-6 py-6">
          <div className="flex items-center gap-2 text-xl font-bold tracking-tight text-white">
            <div className="h-6 w-6 rounded-full bg-gradient-to-tr from-[#4A9EFF] to-[#C8A94B]/80" />
            Memento
          </div>
        </nav>

        <div className="mb-10 text-center">
          <h1 className="mb-3 text-3xl font-bold tracking-tight text-white">Build Your Lineup</h1>
          <p className="text-white/55">Select the cards in your wallet to begin tracking.</p>
        </div>

        <LineupCardSearch />
      </div>
    </div>
  );
}
