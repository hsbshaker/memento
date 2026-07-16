import "server-only";
import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isAdminEmail, parseAdminEmails } from "@/lib/auth/admin-emails";

export type AdminCheck =
  | { ok: true; email: string }
  | { ok: false; reason: "unauthenticated" | "forbidden" };

/**
 * Resolves the current session and checks the ADMIN_EMAILS allowlist.
 * Reviewer identity is ALWAYS derived from the verified session — callers must
 * never accept identity from request input. An empty allowlist disables the
 * admin surface entirely (fails closed).
 */
export async function checkAdmin(): Promise<AdminCheck> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, reason: "unauthenticated" };
  }

  const adminEmails = parseAdminEmails(process.env.ADMIN_EMAILS);
  const email = user.email?.toLowerCase() ?? null;

  if (!email || !isAdminEmail(email, adminEmails)) {
    return { ok: false, reason: "forbidden" };
  }

  return { ok: true, email };
}

/**
 * Route-handler gate. Unauthenticated → 401; authenticated non-admin (or an
 * empty allowlist) → 404 so the surface is not advertised. On success returns
 * the session email — the ONLY acceptable reviewer identity.
 */
export async function requireAdminForRoute(): Promise<
  { ok: true; email: string } | { ok: false; response: NextResponse }
> {
  const check = await checkAdmin();
  if (check.ok) return check;
  if (check.reason === "unauthenticated") {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return {
    ok: false,
    response: NextResponse.json({ error: "Not found" }, { status: 404 }),
  };
}
