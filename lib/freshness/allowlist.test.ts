import assert from "node:assert/strict";
import test from "node:test";

import { getAllowedHostsForIssuer, isAllowedSourceUrl } from "./allowlist";

const amex = getAllowedHostsForIssuer("amex");

test("allows exact host and subdomains over https", () => {
  assert.equal(isAllowedSourceUrl("https://americanexpress.com/us/credit-cards/", amex), true);
  assert.equal(isAllowedSourceUrl("https://www.americanexpress.com/us/credit-cards/", amex), true);
  assert.equal(isAllowedSourceUrl("https://global.americanexpress.com/card-benefits/", amex), true);
});

test("rejects lookalike hosts", () => {
  assert.equal(isAllowedSourceUrl("https://americanexpress.com.evil.com/page", amex), false);
  assert.equal(isAllowedSourceUrl("https://evilamericanexpress.com/page", amex), false);
  assert.equal(isAllowedSourceUrl("https://americanexpress.co/page", amex), false);
});

test("rejects non-https, credentials, and non-443 ports", () => {
  assert.equal(isAllowedSourceUrl("http://americanexpress.com/page", amex), false);
  assert.equal(isAllowedSourceUrl("https://user:pass@americanexpress.com/page", amex), false);
  assert.equal(isAllowedSourceUrl("https://americanexpress.com:8443/page", amex), false);
  assert.equal(isAllowedSourceUrl("https://americanexpress.com:443/page", amex), true);
});

test("rejects malformed URLs and unknown issuers fail closed", () => {
  assert.equal(isAllowedSourceUrl("not a url", amex), false);
  assert.equal(isAllowedSourceUrl("https://americanexpress.com/", []), false);
  assert.deepEqual(getAllowedHostsForIssuer("unknown_bank"), []);
  assert.deepEqual(getAllowedHostsForIssuer(null), []);
});
