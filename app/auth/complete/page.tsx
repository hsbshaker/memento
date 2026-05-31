"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const SESSION_WAIT_TIMEOUT_MS = 6000;
const SESSION_POLL_INTERVAL_MS = 250;

function sanitizeNextPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/home";
  }

  return value;
}

function AuthCompleteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = sanitizeNextPath(searchParams.get("next"));
  const fallbackPath = useMemo(() => `/auth/login?next=${encodeURIComponent(nextPath)}`, [nextPath]);
  const [message, setMessage] = useState("Finishing sign-in...");
  const [showRecovery, setShowRecovery] = useState(false);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let cancelled = false;

    const finishSignIn = async () => {
      const startedAt = Date.now();

      while (!cancelled && Date.now() - startedAt < SESSION_WAIT_TIMEOUT_MS) {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          router.replace(nextPath);
          router.refresh();
          return;
        }

        await new Promise((resolve) => window.setTimeout(resolve, SESSION_POLL_INTERVAL_MS));
      }

      if (cancelled) return;

      setShowRecovery(true);
      setMessage("We couldn't finish sign-in automatically.");
    };

    void finishSignIn();

    return () => {
      cancelled = true;
    };
  }, [fallbackPath, nextPath, router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="max-w-md space-y-3 text-center">
        <h1 className="text-xl font-semibold text-foreground">Signing you in</h1>
        <p className="text-sm text-muted-foreground">{message}</p>
        {showRecovery ? (
          <div className="flex justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => window.location.replace(fallbackPath)}
              className="rounded-lg border border-border bg-surface px-3 py-2 text-foreground transition hover:border-border-strong hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            >
              Back to login
            </button>
            <button
              type="button"
              onClick={() => window.location.replace(nextPath)}
              className="rounded-lg border border-border bg-surface px-3 py-2 text-foreground transition hover:border-border-strong hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            >
              Continue
            </button>
          </div>
        ) : null}
      </div>
    </main>
  );
}

export default function AuthCompletePage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-background p-6">
          <div className="max-w-md space-y-3 text-center">
            <h1 className="text-xl font-semibold text-foreground">Signing you in</h1>
            <p className="text-sm text-muted-foreground">Finishing sign-in...</p>
          </div>
        </main>
      }
    >
      <AuthCompleteContent />
    </Suspense>
  );
}
