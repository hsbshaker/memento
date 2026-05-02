import { redirect } from "next/navigation";
import { HomeScreen } from "@/components/home/HomeScreen";
import { buildInitialHomeFeed } from "@/lib/home/build-home-feed";
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

  const initialFeed = await buildInitialHomeFeed(user.id);

  return <HomeScreen initialFeed={initialFeed} />;
}
