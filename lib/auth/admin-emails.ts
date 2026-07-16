/**
 * Pure parser for the ADMIN_EMAILS allowlist. An empty/missing allowlist means
 * NO admins exist (the admin surface fails closed).
 */
export function parseAdminEmails(raw: string | null | undefined): string[] {
  if (!raw) return [];

  const seen = new Set<string>();
  const emails: string[] = [];

  for (const part of raw.split(",")) {
    const email = part.trim().toLowerCase();
    if (!email || !email.includes("@") || seen.has(email)) continue;
    seen.add(email);
    emails.push(email);
  }

  return emails;
}

export function isAdminEmail(
  email: string | null | undefined,
  adminEmails: string[],
): boolean {
  if (!email || adminEmails.length === 0) return false;
  return adminEmails.includes(email.trim().toLowerCase());
}
