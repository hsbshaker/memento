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

type ServerSessionDebug = {
  serverHasUser: boolean;
  serverUserId: string | null;
  serverUserEmail: string | null;
  serverError: string | null;
  requestCookieNames: string[];
  host: string;
  path: string;
};

type ClientSessionDebug = {
  browserHasUser: boolean;
  browserUserId: string | null;
  browserUserEmail: string | null;
  browserCookieNames: string[];
  server: ServerSessionDebug | null;
};

function AuthCompleteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = sanitizeNextPath(searchParams.get("next"));
  const fallbackPath = useMemo(() => `/auth/login?next=${encodeURIComponent(nextPath)}`, [nextPath]);
  const [message, setMessage] = useState("Finishing sign-in...");
  const [debug, setDebug] = useState<ClientSessionDebug | null>(null);

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

      const {
        data: { user },
      } = await supabase.auth.getUser();

      let server: ServerSessionDebug | null = null;
      try {
        const response = await fetch("/api/debug/auth-session", { cache: "no-store" });
        if (response.ok) {
          server = (await response.json()) as ServerSessionDebug;
        }
      } catch {
        // Best-effort diagnostics only.
      }

      const browserCookieNames = document.cookie
        .split(";")
        .map((part) => part.trim().split("=")[0])
        .filter(Boolean);

      setDebug({
        browserHasUser: Boolean(user),
        browserUserId: user?.id ?? null,
        browserUserEmail: user?.email ?? null,
        browserCookieNames,
        server,
      });
      setMessage("We couldn't finish sign-in automatically.");
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
        {debug ? (
          <div className="space-y-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-left text-xs text-white/75">
            <p>Browser user: {debug.browserHasUser ? "yes" : "no"}</p>
            <p>Browser email: {debug.browserUserEmail ?? "none"}</p>
            <p>Browser cookies: {debug.browserCookieNames.join(", ") || "none visible"}</p>
            <p>Server user: {debug.server?.serverHasUser ? "yes" : "no"}</p>
            <p>Server email: {debug.server?.serverUserEmail ?? "none"}</p>
            <p>Server error: {debug.server?.serverError ?? "none"}</p>
            <p>Server cookies: {debug.server?.requestCookieNames.join(", ") || "none"}</p>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => window.location.replace(fallbackPath)}
                className="rounded-lg border border-white/15 px-3 py-2 text-white transition hover:border-white/30"
              >
                Back to login
              </button>
              <button
                type="button"
                onClick={() => window.location.replace(nextPath)}
                className="rounded-lg border border-white/15 px-3 py-2 text-white transition hover:border-white/30"
              >
                Continue
              </button>
            </div>
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
