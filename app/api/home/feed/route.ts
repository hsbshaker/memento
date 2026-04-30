import { NextResponse } from "next/server";
import { buildHomeFeed } from "@/lib/home/build-home-feed";
import { parseHomeTimeframe } from "@/lib/home/home-timeframes";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const timeframe = parseHomeTimeframe(url.searchParams.get("timeframe"));
    const feed = await buildHomeFeed(user.id, timeframe);
    return NextResponse.json(feed);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load home feed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
