import "server-only";

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export function createSupabaseRouteHandlerClient(request: NextRequest | Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  const response = NextResponse.next();
  const requestCookies = "cookies" in request ? request.cookies : null;

  const supabase = createServerClient(url, anon, {
    auth: { flowType: "pkce" },
    cookies: {
      getAll() {
        return requestCookies?.getAll() ?? [];
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          requestCookies?.set(name, value);
          response.cookies.set({ name, value, ...options });
        });
      },
    },
  });

  return { supabase, response };
}

export function withResponseCookies(response: NextResponse, source: NextResponse) {
  source.cookies.getAll().forEach((cookie) => {
    response.cookies.set(cookie);
  });

  return response;
}
