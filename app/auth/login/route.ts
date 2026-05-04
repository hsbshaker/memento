import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseRouteHandlerClient, withResponseCookies } from "@/lib/supabase/route-handler";

const ERROR_REDIRECT = "/auth/error?reason=oauth_sign_in_failed&detail=init_failed";

export async function GET(request: NextRequest) {
  const origin = new URL(request.url).origin;
  const redirectTo = `${origin}/auth/callback`;

  try {
    const { supabase, response } = createSupabaseRouteHandlerClient(request);
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        // Keep OAuth on the exact host the user started from so PKCE cookies
        // and callback exchange stay on the same origin across preview URLs.
        redirectTo,
        queryParams: {
          prompt: "select_account",
        },
      },
    });

    if (error || !data.url) {
      console.error("OAuth sign-in init failed", {
        origin,
        redirectTo,
        message: error?.message ?? "Missing OAuth URL",
        hasUrl: Boolean(data.url),
      });
      return withResponseCookies(NextResponse.redirect(new URL(ERROR_REDIRECT, origin)), response);
    }

    return withResponseCookies(NextResponse.redirect(data.url), response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown OAuth sign-in error";
    console.error("OAuth sign-in route threw", {
      origin,
      redirectTo,
      message,
    });
    return NextResponse.redirect(new URL(ERROR_REDIRECT, origin));
  }
}
