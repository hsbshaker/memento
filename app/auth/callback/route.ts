import { NextResponse, type NextRequest } from "next/server";
import { isNewAuthUser } from "@/lib/auth/is-new-auth-user";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/route-handler";

const ERROR_REDIRECT = "/auth/error?reason=oauth_callback_failed&detail=exchange_failed";
const NEW_USER_REDIRECT = "/onboarding/build-your-lineup";
const RETURNING_USER_REDIRECT = "/home";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const origin = request.nextUrl.origin;
  const pathname = request.nextUrl.pathname;
  console.log("oauth callback hit, has code:", Boolean(code));

  if (!code) {
    console.error("Auth callback missing code", {
      origin,
      pathname,
      hasCode: false,
    });
    return NextResponse.redirect(new URL(ERROR_REDIRECT, origin));
  }

  try {
    const auth = createSupabaseRouteHandlerClient(request);
    const { supabase } = auth;
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      const code = typeof error === "object" && error !== null && "code" in error ? error.code : undefined;
      console.error("Auth callback exchange failed", {
        origin,
        pathname,
        hasCode: true,
        message: error.message,
        status: error.status,
        code,
      });
      return NextResponse.redirect(new URL(ERROR_REDIRECT, origin));
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("Auth callback could not load user after exchange", {
        origin,
        pathname,
        hasCode: true,
        message: userError?.message ?? "Missing user after exchange",
      });
      return NextResponse.redirect(new URL(ERROR_REDIRECT, origin));
    }

    const successRedirect = isNewAuthUser(user) ? NEW_USER_REDIRECT : RETURNING_USER_REDIRECT;
    const handoffRedirect = new URL("/auth/complete", origin);
    handoffRedirect.searchParams.set("next", successRedirect);
    handoffRedirect.searchParams.set("debug", "1");
    return auth.finalize(NextResponse.redirect(handoffRedirect));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown callback exchange error";
    console.error("Auth callback threw", {
      origin,
      pathname,
      hasCode: true,
      message,
    });
    return NextResponse.redirect(new URL(ERROR_REDIRECT, origin));
  }
}
