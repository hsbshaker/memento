import { NextResponse } from "next/server";
import { getAuthCallbackURL } from "@/lib/site-url";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const ERROR_REDIRECT = "/auth/error?reason=oauth_sign_in_failed&detail=init_failed";

export async function GET(request: Request) {
  const origin = new URL(request.url).origin;

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: getAuthCallbackURL(),
        queryParams: {
          prompt: "select_account",
        },
      },
    });

    if (error || !data.url) {
      console.error("OAuth sign-in init failed", {
        origin,
        message: error?.message ?? "Missing OAuth URL",
        hasUrl: Boolean(data.url),
      });
      return NextResponse.redirect(new URL(ERROR_REDIRECT, origin));
    }

    return NextResponse.redirect(data.url);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown OAuth sign-in error";
    console.error("OAuth sign-in route threw", {
      origin,
      message,
    });
    return NextResponse.redirect(new URL(ERROR_REDIRECT, origin));
  }
}
