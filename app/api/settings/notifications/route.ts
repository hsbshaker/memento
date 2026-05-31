import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("user_profiles")
    .select("notifications_enabled")
    .eq("user_id", user.id)
    .single();

  if (error) {
    return NextResponse.json({ error: "Failed to load notification preferences." }, { status: 500 });
  }

  return NextResponse.json({ emailRemindersEnabled: data?.notifications_enabled ?? false });
}

export async function PATCH(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (typeof body !== "object" || body === null || typeof (body as Record<string, unknown>).emailRemindersEnabled !== "boolean") {
    return NextResponse.json({ error: "emailRemindersEnabled must be a boolean." }, { status: 400 });
  }

  const emailRemindersEnabled = (body as { emailRemindersEnabled: boolean }).emailRemindersEnabled;

  const { error } = await supabase
    .from("user_profiles")
    .upsert(
      { user_id: user.id, notifications_enabled: emailRemindersEnabled, updated_at: new Date().toISOString() },
      { onConflict: "user_id" },
    );

  if (error) {
    return NextResponse.json({ error: "Failed to update notification preferences." }, { status: 500 });
  }

  return NextResponse.json({ emailRemindersEnabled });
}
