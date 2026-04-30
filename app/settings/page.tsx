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

  return <SettingsScreen email={user.email ?? null} />;
}
