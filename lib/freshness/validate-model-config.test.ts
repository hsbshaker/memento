import assert from "node:assert/strict";
import test from "node:test";

import { clearModelValidationCache, validateModelConfig } from "./validate-model-config";

const fakeFetcher = (known: string[], calls: string[] = []) => ({
  calls,
  async retrieve(modelId: string) {
    calls.push(modelId);
    if (!known.includes(modelId)) throw new Error(`404 model not found: ${modelId}`);
    return { id: modelId };
  },
});

test("missing api key or model fail with clear configuration errors", async () => {
  clearModelValidationCache();
  const noKey = await validateModelConfig(
    { apiKey: null, model: "some-model", escalationModel: null },
    fakeFetcher(["some-model"]),
  );
  assert.equal(noKey.ok, false);
  assert.ok(noKey.errors[0].includes("ANTHROPIC_API_KEY"));

  const noModel = await validateModelConfig(
    { apiKey: "key", model: null, escalationModel: null },
    fakeFetcher([]),
  );
  assert.equal(noModel.ok, false);
  assert.ok(noModel.errors[0].includes("FRESHNESS_MODEL"));
});

test("unknown model ids are reported per model", async () => {
  clearModelValidationCache();
  const result = await validateModelConfig(
    { apiKey: "key", model: "good-model", escalationModel: "bad-model" },
    fakeFetcher(["good-model"]),
  );
  assert.equal(result.ok, false);
  assert.equal(result.errors.length, 1);
  assert.ok(result.errors[0].includes("bad-model"));
});

test("valid config passes and successful validations are cached", async () => {
  clearModelValidationCache();
  const calls: string[] = [];
  const fetcher = fakeFetcher(["model-a", "model-b"], calls);
  const config = { apiKey: "key", model: "model-a", escalationModel: "model-b" };

  const first = await validateModelConfig(config, fetcher);
  assert.deepEqual(first, { ok: true, errors: [] });
  assert.deepEqual(calls, ["model-a", "model-b"]);

  const second = await validateModelConfig(config, fetcher);
  assert.deepEqual(second, { ok: true, errors: [] });
  assert.deepEqual(calls, ["model-a", "model-b"], "cached models are not re-fetched");
});
