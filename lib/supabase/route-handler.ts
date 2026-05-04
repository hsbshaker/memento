import "server-only";

import { createServerClient } from "@supabase/ssr";
import { type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type PendingCookie = {
  name: string;
  value: string;
  options?: CookieOptions;
};

export function createSupabaseRouteHandlerClient(request: NextRequest | Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  const requestCookies = "cookies" in request ? request.cookies : null;
  const pendingCookies: PendingCookie[] = [];

  const supabase = createServerClient(url, anon, {
    auth: { flowType: "pkce" },
    cookies: {
      getAll() {
        return requestCookies?.getAll() ?? [];
      },
      setAll(cookiesToSet) {
        pendingCookies.splice(0, pendingCookies.length, ...cookiesToSet);
      },
    },
  });

  return {
    supabase,
    finalize(response: NextResponse) {
      pendingCookies.forEach(({ name, value, options }) => {
        response.cookies.set({ name, value, ...options });
      });

      return response;
    },
  };
}
