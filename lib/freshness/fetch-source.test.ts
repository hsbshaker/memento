import assert from "node:assert/strict";
import test from "node:test";

import { fetchSource } from "./fetch-source";

const HOSTS = ["americanexpress.com"];
const URL_OK = "https://www.americanexpress.com/us/credit-cards/card/platinum/";

const fakeFetch = (handler: (url: string, init?: RequestInit) => Response | Promise<Response>) =>
  (async (input: RequestInfo | URL, init?: RequestInit) =>
    handler(String(input), init)) as typeof fetch;

test("successful fetch returns body, final url, and curated headers", async () => {
  const result = await fetchSource(
    { url: URL_OK, expectedType: "html" },
    {
      allowedHosts: HOSTS,
      fetchImpl: fakeFetch(() =>
        new Response("<html><body>Platinum</body></html>", {
          status: 200,
          headers: {
            "content-type": "text/html; charset=utf-8",
            etag: '"abc"',
            "x-secret-header": "must-not-leak",
          },
        }),
      ),
    },
  );

  assert.equal(result.kind, "ok");
  if (result.kind === "ok") {
    assert.equal(new TextDecoder().decode(result.bodyBytes).includes("Platinum"), true);
    assert.equal(result.etag, '"abc"');
    assert.equal(result.finalUrl, URL_OK);
    assert.deepEqual(Object.keys(result.responseHeaders).sort(), ["content-type", "etag"]);
  }
});

test("304 returns not_modified and sends conditional headers", async () => {
  let sentHeaders: Record<string, string> = {};
  const result = await fetchSource(
    { url: URL_OK, expectedType: "html", etag: '"abc"', lastModified: "Mon, 01 Jun 2026 00:00:00 GMT" },
    {
      allowedHosts: HOSTS,
      fetchImpl: fakeFetch((_, init) => {
        sentHeaders = (init?.headers ?? {}) as Record<string, string>;
        return new Response(null, { status: 304 });
      }),
    },
  );

  assert.deepEqual(result, { kind: "not_modified", status: 304 });
  assert.equal(sentHeaders["if-none-match"], '"abc"');
  assert.equal(sentHeaders["if-modified-since"], "Mon, 01 Jun 2026 00:00:00 GMT");
});

test("http errors are failures, never content", async () => {
  const result = await fetchSource(
    { url: URL_OK, expectedType: "html" },
    { allowedHosts: HOSTS, fetchImpl: fakeFetch(() => new Response("err", { status: 500 })) },
  );
  assert.deepEqual(result, { kind: "failed", reason: "http_error", status: 500 });
});

test("network errors and timeouts are distinct failures", async () => {
  const network = await fetchSource(
    { url: URL_OK, expectedType: "html" },
    {
      allowedHosts: HOSTS,
      fetchImpl: (async () => {
        throw new TypeError("fetch failed");
      }) as unknown as typeof fetch,
    },
  );
  assert.deepEqual(network, { kind: "failed", reason: "network" });

  const timeout = await fetchSource(
    { url: URL_OK, expectedType: "html" },
    {
      allowedHosts: HOSTS,
      timeoutMs: 10,
      fetchImpl: (async (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            const error = new Error("aborted");
            error.name = "AbortError";
            reject(error);
          });
        })) as typeof fetch,
    },
  );
  assert.deepEqual(timeout, { kind: "failed", reason: "timeout" });
});

test("oversized bodies fail closed", async () => {
  const result = await fetchSource(
    { url: URL_OK, expectedType: "html" },
    {
      allowedHosts: HOSTS,
      maxBytes: 10,
      fetchImpl: fakeFetch(() =>
        new Response("x".repeat(100), { status: 200, headers: { "content-type": "text/html" } }),
      ),
    },
  );
  assert.deepEqual(result, { kind: "failed", reason: "too_large", status: 200 });
});

test("wrong content type fails closed", async () => {
  const result = await fetchSource(
    { url: URL_OK, expectedType: "pdf" },
    {
      allowedHosts: HOSTS,
      fetchImpl: fakeFetch(() =>
        new Response("<html></html>", { status: 200, headers: { "content-type": "text/html" } }),
      ),
    },
  );
  assert.deepEqual(result, { kind: "failed", reason: "bad_content_type", status: 200 });
});

test("disallowed urls are rejected before any request", async () => {
  let called = false;
  const result = await fetchSource(
    { url: "https://evil.example.com/page", expectedType: "html" },
    {
      allowedHosts: HOSTS,
      fetchImpl: fakeFetch(() => {
        called = true;
        return new Response("x");
      }),
    },
  );
  assert.deepEqual(result, { kind: "failed", reason: "disallowed_url" });
  assert.equal(called, false);
});

test("redirects are followed on-allowlist and rejected off-allowlist", async () => {
  const onAllowlist = await fetchSource(
    { url: URL_OK, expectedType: "html" },
    {
      allowedHosts: HOSTS,
      fetchImpl: fakeFetch((url) => {
        if (url === URL_OK) {
          return new Response(null, {
            status: 301,
            headers: { location: "https://global.americanexpress.com/card-benefits/" },
          });
        }
        return new Response("<html><body>ok</body></html>", {
          status: 200,
          headers: { "content-type": "text/html" },
        });
      }),
    },
  );
  assert.equal(onAllowlist.kind, "ok");
  if (onAllowlist.kind === "ok") {
    assert.equal(onAllowlist.finalUrl, "https://global.americanexpress.com/card-benefits/");
  }

  const offAllowlist = await fetchSource(
    { url: URL_OK, expectedType: "html" },
    {
      allowedHosts: HOSTS,
      fetchImpl: fakeFetch(() =>
        new Response(null, { status: 302, headers: { location: "https://evil.example.com/" } }),
      ),
    },
  );
  assert.deepEqual(offAllowlist, { kind: "failed", reason: "disallowed_redirect", status: 302 });
});

test("redirect loops exhaust the hop limit", async () => {
  const result = await fetchSource(
    { url: URL_OK, expectedType: "html" },
    {
      allowedHosts: HOSTS,
      fetchImpl: fakeFetch(() =>
        new Response(null, { status: 302, headers: { location: URL_OK } }),
      ),
    },
  );
  assert.deepEqual(result, { kind: "failed", reason: "too_many_redirects", status: 302 });
});
