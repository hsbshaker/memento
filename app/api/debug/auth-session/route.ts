import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  return NextResponse.json({
    serverHasUser: Boolean(user),
    serverUserId: user?.id ?? null,
    serverUserEmail: user?.email ?? null,
    serverError: error?.message ?? null,
    requestCookieNames: request.cookies.getAll().map((cookie) => cookie.name),
    host: request.nextUrl.host,
    path: request.nextUrl.pathname,
  });
}
