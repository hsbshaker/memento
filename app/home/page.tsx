import { redirect } from "next/navigation";
import { HomeScreen } from "@/components/home/HomeScreen";
import { buildHomeFeed } from "@/lib/home/build-home-feed";
import { DEFAULT_HOME_TIMEFRAME } from "@/lib/home/home-timeframes";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const initialFeed = await buildHomeFeed(user.id, DEFAULT_HOME_TIMEFRAME);

  return <HomeScreen initialFeed={initialFeed} />;
}
