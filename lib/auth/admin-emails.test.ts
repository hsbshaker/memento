import assert from "node:assert/strict";
import test from "node:test";

import { isAdminEmail, parseAdminEmails } from "./admin-emails";

test("parseAdminEmails lowercases, trims, dedupes, and drops invalid entries", () => {
  assert.deepEqual(
    parseAdminEmails(" Alice@Example.com ,bob@example.com, alice@example.com ,,not-an-email"),
    ["alice@example.com", "bob@example.com"],
  );
});

test("parseAdminEmails fails closed on empty input", () => {
  assert.deepEqual(parseAdminEmails(undefined), []);
  assert.deepEqual(parseAdminEmails(null), []);
  assert.deepEqual(parseAdminEmails(""), []);
  assert.deepEqual(parseAdminEmails("   "), []);
});

test("isAdminEmail matches case-insensitively and fails closed", () => {
  const admins = parseAdminEmails("admin@memento.app");
  assert.equal(isAdminEmail("Admin@Memento.App", admins), true);
  assert.equal(isAdminEmail("other@memento.app", admins), false);
  assert.equal(isAdminEmail(null, admins), false);
  assert.equal(isAdminEmail("admin@memento.app", []), false);
});
