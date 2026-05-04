"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";

type AccountSectionProps = {
  email: string | null;
};

export function AccountSection({ email }: AccountSectionProps) {
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    if (isSigningOut) return;

    const supabase = createSupabaseBrowserClient();
    setIsSigningOut(true);

    const { error } = await supabase.auth.signOut({ scope: "global" });
    if (error) {
      setIsSigningOut(false);
      return;
    }

    window.location.assign("/");
  };

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium tracking-[0.22em] text-white/42 uppercase">Account</p>
      <div className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3.5">
        <div>
          <p className="text-xs text-white/50">Signed in as</p>
          <p className="mt-0.5 text-sm font-medium text-white">{email ?? "Unknown email"}</p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => void handleSignOut()} disabled={isSigningOut}>
          {isSigningOut ? "Signing out..." : "Sign out"}
        </Button>
      </div>
    </div>
  );
}
