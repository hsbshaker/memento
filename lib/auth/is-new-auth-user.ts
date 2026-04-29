import "server-only";

import type { User } from "@supabase/supabase-js";

const FIRST_SIGN_IN_WINDOW_MS = 2 * 60 * 1000;

function parseTimestamp(value: string | null | undefined) {
  if (!value) return null;

  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return null;

  return parsed;
}

export function isNewAuthUser(user: Pick<User, "created_at" | "last_sign_in_at">) {
  const createdAt = parseTimestamp(user.created_at);
  const lastSignInAt = parseTimestamp(user.last_sign_in_at);

  if (createdAt === null || lastSignInAt === null) {
    return false;
  }

  return Math.abs(lastSignInAt - createdAt) <= FIRST_SIGN_IN_WINDOW_MS;
}
