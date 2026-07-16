import assert from "node:assert/strict";
import test from "node:test";

import { artifactPathFor, extensionForContent, InMemoryArtifactStore } from "./artifacts";

test("artifact paths are content-addressed with a two-char shard", () => {
  const sha = "ab".padEnd(64, "0");
  assert.equal(artifactPathFor(sha, ".html"), `raw/ab/${sha}.html`);
  assert.equal(artifactPathFor(sha, "pdf"), `raw/ab/${sha}.pdf`);
});

test("extension derives from content type first, then source type", () => {
  assert.equal(extensionForContent("application/pdf", "html"), ".pdf");
  assert.equal(extensionForContent("text/html; charset=utf-8", "html"), ".html");
  assert.equal(extensionForContent(null, "pdf"), ".pdf");
  assert.equal(extensionForContent(null, "html"), ".html");
  assert.equal(extensionForContent("application/json", "manual_upload"), ".bin");
});

test("in-memory store is idempotent per content hash and signs only existing paths", async () => {
  const store = new InMemoryArtifactStore();
  const sha = "cd".padEnd(64, "1");
  const first = await store.put({
    sha256: sha,
    bytes: new TextEncoder().encode("<html>x</html>"),
    contentType: "text/html",
    extension: ".html",
  });
  const second = await store.put({
    sha256: sha,
    bytes: new TextEncoder().encode("<html>x</html>"),
    contentType: "text/html",
    extension: ".html",
  });
  assert.equal(first.path, second.path);
  assert.equal(store.objects.size, 1);

  const url = await store.createSignedUrl(first.path, 60);
  assert.ok(url.includes(first.path));
  await assert.rejects(() => store.createSignedUrl("raw/zz/missing.html", 60));
});
