import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import {
  BENEFIT_CANONICAL_FIELDS,
  BENEFIT_SNAPSHOT_KEYS,
  BENEFIT_VERSIONED_FIELDS,
  pickCanonicalState,
  pickVersionedSnapshot,
} from "./benefit-fields";

test("versioned fields extend canonical fields with lifecycle/provenance fields only", () => {
  for (const field of BENEFIT_CANONICAL_FIELDS) {
    assert.ok((BENEFIT_VERSIONED_FIELDS as readonly string[]).includes(field));
  }
  const extras = BENEFIT_VERSIONED_FIELDS.filter(
    (f) => !(BENEFIT_CANONICAL_FIELDS as readonly string[]).includes(f),
  );
  assert.deepEqual(extras, ["benefit_status", "retired_at", "source_url", "track_in_memento"]);
});

test("verification-only fields are excluded from the versioned contract", () => {
  assert.ok(!(BENEFIT_VERSIONED_FIELDS as readonly string[]).includes("last_verified_at"));
  assert.ok(!(BENEFIT_SNAPSHOT_KEYS as readonly string[]).includes("last_verified_at"));
});

test("pickVersionedSnapshot emits exactly the snapshot keys", () => {
  const snapshot = pickVersionedSnapshot({
    benefit_name: "Airline Fee Credit",
    benefit_value: "Up to $200 annually",
    cadence: "annual",
    reset_timing: "calendar year",
    enrollment_required: true,
    requires_setup: false,
    display_description: "desc",
    benefit_status: "active",
    retired_at: null,
    source_url: "https://example.com",
    track_in_memento: "yes",
    benefit_code: "code",
    benefit_hash: "hash",
    content_version: 2,
  });
  assert.deepEqual(Object.keys(snapshot).sort(), [...BENEFIT_SNAPSHOT_KEYS].sort());
  assert.equal(snapshot.content_version, 2);
});

test("pickCanonicalState emits exactly the canonical keys and normalizes types", () => {
  const state = pickCanonicalState({ benefit_name: "", enrollment_required: "yes" as unknown as boolean });
  assert.deepEqual(Object.keys(state).sort(), [...BENEFIT_CANONICAL_FIELDS].sort());
  assert.equal(state.benefit_name, null); // empty string normalized to null
  assert.equal(state.enrollment_required, null); // non-boolean normalized to null
});

test("SQL drift alarm: publish RPC migration references every versioned field", () => {
  const migrationsDir = path.join(process.cwd(), "supabase", "migrations");
  const rpcFile = readdirSync(migrationsDir).find((f) => f.includes("freshness_publish_rpcs"));
  assert.ok(rpcFile, "publish RPC migration file not found");
  const sql = readFileSync(path.join(migrationsDir, rpcFile), "utf8");
  for (const field of BENEFIT_VERSIONED_FIELDS) {
    assert.ok(sql.includes(field), `publish RPC SQL does not mention versioned field "${field}"`);
  }
});
