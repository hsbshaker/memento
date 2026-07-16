import assert from "node:assert/strict";
import test from "node:test";

import { validateContent } from "./content-validation";

const GOOD_TEXT = [
  "Platinum Card Benefits",
  "Airline Fee Credit: up to $200 annually on one selected qualifying airline.",
  "Hotel Credit: up to $300 semiannually with Fine Hotels + Resorts bookings.",
  "Digital Entertainment Credit: up to $20 monthly on eligible subscriptions.",
].join("\n").repeat(10);

const base = {
  normalizedText: GOOD_TEXT,
  requestedUrl: "https://www.americanexpress.com/us/credit-cards/card/platinum/",
  finalUrl: "https://www.americanexpress.com/us/credit-cards/card/platinum/",
  expectedMarkers: ["Platinum Card"],
};

test("clean issuer content validates ok", () => {
  assert.deepEqual(validateContent(base), { status: "ok", reasons: [] });
});

test("captcha / challenge pages are suspect", () => {
  const result = validateContent({
    ...base,
    normalizedText: `${GOOD_TEXT}\nPlease verify you are a human to continue.`,
  });
  assert.equal(result.status, "suspect");
  assert.ok(result.reasons.includes("captcha_or_challenge"));
});

test("access denied and javascript-required pages are suspect", () => {
  assert.ok(
    validateContent({ ...base, normalizedText: "Access Denied. Reference #18.abc123" })
      .reasons.includes("access_denied"),
  );
  assert.ok(
    validateContent({ ...base, normalizedText: "Please enable JavaScript to view this page." })
      .reasons.includes("javascript_required"),
  );
});

test("login walls with thin content are suspect; login links on rich pages are not", () => {
  const login = validateContent({
    ...base,
    normalizedText: "Sign in to your account to continue. Forgot your password?",
  });
  assert.ok(login.reasons.includes("login_page"));

  const richWithLoginCopy = validateContent({
    ...base,
    normalizedText: `${GOOD_TEXT}\nSign in to your account to continue.`,
  });
  assert.ok(!richWithLoginCopy.reasons.includes("login_page"));
});

test("empty JS shells are suspect", () => {
  const result = validateContent({
    ...base,
    normalizedText: "Loading...",
    rawText: "<script>".padEnd(50_000, "x"),
  });
  assert.equal(result.status, "suspect");
  assert.ok(result.reasons.includes("javascript_shell"));
  assert.ok(result.reasons.includes("content_below_minimum"));
});

test("missing expected markers are suspect", () => {
  const result = validateContent({
    ...base,
    normalizedText: GOOD_TEXT.replaceAll("Platinum Card", "Some Other Product"),
  });
  assert.ok(result.reasons.includes("expected_markers_missing"));
});

test("severe length reduction versus last good snapshot is suspect", () => {
  const result = validateContent({
    ...base,
    normalizedText: GOOD_TEXT.slice(0, 600),
    lastGoodLength: GOOD_TEXT.length * 3,
  });
  assert.ok(result.reasons.includes("severe_length_reduction"));
});

test("truncated fetches are always suspect", () => {
  const result = validateContent({ ...base, truncated: true });
  assert.deepEqual(result, { status: "suspect", reasons: ["truncated"] });
});

test("unexpected redirect to homepage or login is suspect; same-URL is fine", () => {
  const toRoot = validateContent({
    ...base,
    finalUrl: "https://www.americanexpress.com/",
  });
  assert.ok(toRoot.reasons.includes("unexpected_redirect"));

  const toLogin = validateContent({
    ...base,
    finalUrl: "https://www.americanexpress.com/login/",
  });
  assert.ok(toLogin.reasons.includes("unexpected_redirect"));

  const benignRedirect = validateContent({
    ...base,
    finalUrl: "https://www.americanexpress.com/us/credit-cards/card/platinum/benefits/",
  });
  assert.ok(!benignRedirect.reasons.includes("unexpected_redirect"));
});
