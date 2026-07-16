/**
 * Soft-block / invalid-200 detection. A 200 response is not evidence of usable
 * content: CAPTCHAs, access-denied pages, login walls, empty JS shells,
 * missing issuer/card markers, severe shrinkage, truncation, and unexpected
 * redirect landings must all mark the snapshot `suspect`. Suspect content is
 * preserved for review but never validated, extracted, or used to verify
 * benefits.
 */

export interface ContentValidationInput {
  normalizedText: string;
  /** Raw HTML (when available) for script-shell detection. */
  rawText?: string | null;
  requestedUrl: string;
  finalUrl: string;
  /** Markers that must appear (case-insensitive). Default: the card display name. */
  expectedMarkers: string[];
  minExpectedLength?: number | null;
  /** Normalized length of the last good (ok, fully processed) snapshot. */
  lastGoodLength?: number | null;
  /** Set when the fetch hit the size cap. */
  truncated?: boolean;
}

export interface ContentValidationResult {
  status: "ok" | "suspect";
  reasons: string[];
}

const DEFAULT_MIN_LENGTH = 500;
const SEVERE_REDUCTION_RATIO = 0.4;

const CHALLENGE_PATTERNS: Array<{ reason: string; pattern: RegExp }> = [
  {
    reason: "captcha_or_challenge",
    pattern:
      /captcha|verify you are (?:a )?human|are you a robot|unusual traffic|pardon our interruption|attention required|cf-challenge|press & hold/i,
  },
  {
    reason: "access_denied",
    pattern: /access denied|request blocked|error 403|forbidden|reference #\d+\.\w+/i,
  },
  {
    reason: "javascript_required",
    pattern: /please enable javascript|javascript is (?:disabled|required)|enable cookies to continue/i,
  },
];

const LOGIN_PATTERN =
  /log ?in to (?:your account|continue)|sign in to (?:your account|continue)|session (?:has )?expired|password.{0,40}forgot/i;

const pathOf = (url: string): string => {
  try {
    return new URL(url).pathname.toLowerCase();
  } catch {
    return "";
  }
};

export function validateContent(input: ContentValidationInput): ContentValidationResult {
  const reasons: string[] = [];
  const text = input.normalizedText;
  const minLength = input.minExpectedLength ?? DEFAULT_MIN_LENGTH;

  if (input.truncated) {
    reasons.push("truncated");
  }

  for (const { reason, pattern } of CHALLENGE_PATTERNS) {
    if (pattern.test(text)) {
      reasons.push(reason);
    }
  }

  // Login-wall heuristic: login language on a page with very little content.
  if (LOGIN_PATTERN.test(text) && text.length < Math.max(minLength * 4, 2000)) {
    reasons.push("login_page");
  }

  if (text.length < minLength) {
    reasons.push("content_below_minimum");
  }

  // JS shell: a large raw document that normalizes to almost nothing.
  const rawLength = input.rawText?.length ?? 0;
  if (rawLength > 10_000 && text.length < 200) {
    reasons.push("javascript_shell");
  }

  if (input.expectedMarkers.length > 0) {
    const haystack = text.toLowerCase();
    const anyMarker = input.expectedMarkers.some(
      (marker) => marker.trim().length > 0 && haystack.includes(marker.trim().toLowerCase()),
    );
    if (!anyMarker) {
      reasons.push("expected_markers_missing");
    }
  }

  if (
    typeof input.lastGoodLength === "number" &&
    input.lastGoodLength > 0 &&
    text.length < input.lastGoodLength * SEVERE_REDUCTION_RATIO
  ) {
    reasons.push("severe_length_reduction");
  }

  const requestedPath = pathOf(input.requestedUrl);
  const finalPath = pathOf(input.finalUrl);
  if (input.finalUrl && input.requestedUrl !== input.finalUrl) {
    const landedOnRoot = finalPath === "/" && requestedPath !== "/";
    const landedOnAuthOrError = /login|signin|sign-in|error|not-found|404/.test(finalPath) &&
      !/login|signin|sign-in|error|not-found|404/.test(requestedPath);
    if (landedOnRoot || landedOnAuthOrError) {
      reasons.push("unexpected_redirect");
    }
  }

  const unique = [...new Set(reasons)];
  return { status: unique.length > 0 ? "suspect" : "ok", reasons: unique };
}
