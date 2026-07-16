/**
 * Per-issuer host allowlist — the SSRF boundary for all outbound source
 * retrieval. Only HTTPS URLs on these hosts (or their subdomains) may be
 * fetched, registered as sources, or followed via redirects.
 */
export const ISSUER_ALLOWED_HOSTS: Record<string, readonly string[]> = {
  amex: ["americanexpress.com"],
  chase: ["chase.com"],
  citi: ["citi.com", "citibank.com"],
  capital_one: ["capitalone.com"],
};

export function getAllowedHostsForIssuer(issuer: string | null | undefined): readonly string[] {
  if (!issuer) return [];
  return ISSUER_ALLOWED_HOSTS[issuer] ?? [];
}

/**
 * True only for https URLs without embedded credentials or explicit ports whose
 * host is exactly an allowlisted host or a subdomain of one. Lookalike hosts
 * (e.g. "americanexpress.com.evil.com") are rejected because suffix matching
 * requires a "." boundary against the registered host, not a substring match.
 */
export function isAllowedSourceUrl(url: string, allowedHosts: readonly string[]): boolean {
  if (allowedHosts.length === 0) return false;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }

  if (parsed.protocol !== "https:") return false;
  if (parsed.username || parsed.password) return false;
  if (parsed.port && parsed.port !== "443") return false;

  const hostname = parsed.hostname.toLowerCase();

  return allowedHosts.some((allowed) => {
    const host = allowed.toLowerCase();
    return hostname === host || hostname.endsWith(`.${host}`);
  });
}
