import { redirect } from "next/navigation";
import { SettingsScreen } from "@/components/settings/SettingsScreen";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("notifications_enabled")
    .eq("user_id", user.id)
    .single();

  return (
    <SettingsScreen
      email={user.email ?? null}
      emailRemindersEnabled={profile?.notifications_enabled ?? false}
    />
  );
}
