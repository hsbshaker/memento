import {
  FETCH_TIMEOUT_MS,
  MAX_HTML_BYTES,
  MAX_PDF_BYTES,
  MAX_REDIRECT_HOPS,
} from "@/lib/freshness/constants";
import { isAllowedSourceUrl } from "@/lib/freshness/allowlist";

/**
 * The retrieval boundary. HTTPS-only against a per-issuer allowlist; redirects
 * are followed manually (≤3 hops) with every hop re-validated; conditional
 * requests via ETag/Last-Modified; hard timeout; streamed byte caps;
 * content-type validation. A `failed` result is a distinct state — it can
 * never feed extraction, verification, or (especially) removal.
 */

export type FetchFailureReason =
  | "disallowed_url"
  | "disallowed_redirect"
  | "too_many_redirects"
  | "redirect_missing_location"
  | "timeout"
  | "network"
  | "http_error"
  | "too_large"
  | "bad_content_type";

export type FetchSourceResult =
  | { kind: "not_modified"; status: number }
  | {
      kind: "ok";
      status: number;
      bodyBytes: Uint8Array;
      contentType: string | null;
      etag: string | null;
      lastModified: string | null;
      finalUrl: string;
      responseHeaders: Record<string, string>;
    }
  | { kind: "failed"; reason: FetchFailureReason; status?: number };

export interface FetchSourceRequest {
  url: string;
  etag?: string | null;
  lastModified?: string | null;
  expectedType: "html" | "pdf";
}

export interface FetchSourceDeps {
  fetchImpl?: typeof fetch;
  allowedHosts: readonly string[];
  timeoutMs?: number;
  maxBytes?: number;
}

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

const curatedHeaders = (headers: Headers): Record<string, string> => {
  const curated: Record<string, string> = {};
  for (const name of ["etag", "last-modified", "content-type", "content-length"]) {
    const value = headers.get(name);
    if (value) curated[name] = value;
  }
  return curated;
};

const typeMatches = (contentType: string | null, expected: "html" | "pdf"): boolean => {
  if (!contentType) return true; // absent header: defer to content validation
  const normalized = contentType.toLowerCase();
  if (expected === "pdf") return normalized.includes("application/pdf");
  return (
    normalized.includes("text/html") ||
    normalized.includes("application/xhtml") ||
    normalized.includes("text/plain")
  );
};

async function readBodyCapped(
  response: Response,
  maxBytes: number,
): Promise<Uint8Array | "too_large"> {
  if (!response.body) {
    const buffer = new Uint8Array(await response.arrayBuffer());
    return buffer.byteLength > maxBytes ? "too_large" : buffer;
  }

  const reader = response.body.getReader();
  const parts: Uint8Array[] = [];
  let total = 0;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        return "too_large";
      }
      parts.push(value);
    }
  }

  const merged = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    merged.set(part, offset);
    offset += part.byteLength;
  }
  return merged;
}

export async function fetchSource(
  request: FetchSourceRequest,
  deps: FetchSourceDeps,
): Promise<FetchSourceResult> {
  const fetchImpl = deps.fetchImpl ?? fetch;
  const timeoutMs = deps.timeoutMs ?? FETCH_TIMEOUT_MS;
  const maxBytes =
    deps.maxBytes ?? (request.expectedType === "pdf" ? MAX_PDF_BYTES : MAX_HTML_BYTES);

  if (!isAllowedSourceUrl(request.url, deps.allowedHosts)) {
    return { kind: "failed", reason: "disallowed_url" };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    let currentUrl = request.url;

    for (let hop = 0; hop <= MAX_REDIRECT_HOPS; hop += 1) {
      const headers: Record<string, string> = {
        "user-agent": "MementoFreshnessBot/1.0 (+benefit terms verification)",
        accept: request.expectedType === "pdf" ? "application/pdf" : "text/html,application/xhtml+xml",
      };
      if (request.etag) headers["if-none-match"] = request.etag;
      if (request.lastModified) headers["if-modified-since"] = request.lastModified;

      let response: Response;
      try {
        response = await fetchImpl(currentUrl, {
          method: "GET",
          headers,
          redirect: "manual",
          signal: controller.signal,
        });
      } catch (error) {
        const aborted =
          controller.signal.aborted ||
          (error instanceof Error && error.name === "AbortError");
        return { kind: "failed", reason: aborted ? "timeout" : "network" };
      }

      if (REDIRECT_STATUSES.has(response.status)) {
        const location = response.headers.get("location");
        if (!location) {
          return { kind: "failed", reason: "redirect_missing_location", status: response.status };
        }
        const nextUrl = new URL(location, currentUrl).toString();
        if (!isAllowedSourceUrl(nextUrl, deps.allowedHosts)) {
          return { kind: "failed", reason: "disallowed_redirect", status: response.status };
        }
        if (hop === MAX_REDIRECT_HOPS) {
          return { kind: "failed", reason: "too_many_redirects", status: response.status };
        }
        currentUrl = nextUrl;
        continue;
      }

      if (response.status === 304) {
        return { kind: "not_modified", status: 304 };
      }

      if (response.status < 200 || response.status >= 300) {
        return { kind: "failed", reason: "http_error", status: response.status };
      }

      const contentType = response.headers.get("content-type");
      if (!typeMatches(contentType, request.expectedType)) {
        return { kind: "failed", reason: "bad_content_type", status: response.status };
      }

      const body = await readBodyCapped(response, maxBytes);
      if (body === "too_large") {
        return { kind: "failed", reason: "too_large", status: response.status };
      }

      return {
        kind: "ok",
        status: response.status,
        bodyBytes: body,
        contentType,
        etag: response.headers.get("etag"),
        lastModified: response.headers.get("last-modified"),
        finalUrl: currentUrl,
        responseHeaders: curatedHeaders(response.headers),
      };
    }

    return { kind: "failed", reason: "too_many_redirects" };
  } finally {
    clearTimeout(timer);
  }
}
