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

      setMessage("We couldn't finish sign-in automatically. Redirecting back to login...");
      window.setTimeout(() => {
        window.location.replace(fallbackPath);
      }, 600);
    };

    void finishSignIn();

    return () => {
      cancelled = true;
    };
  }, [fallbackPath, nextPath, router]);

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="max-w-md space-y-3 text-center">
        <h1 className="text-xl font-semibold text-white">Signing you in</h1>
        <p className="text-sm text-white/70">{message}</p>
      </div>
    </main>
  );
}

export default function AuthCompletePage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center p-6">
          <div className="max-w-md space-y-3 text-center">
            <h1 className="text-xl font-semibold text-white">Signing you in</h1>
            <p className="text-sm text-white/70">Finishing sign-in...</p>
          </div>
        </main>
      }
    >
      <AuthCompleteContent />
    </Suspense>
  );
}
