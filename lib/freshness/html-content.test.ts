import assert from "node:assert/strict";
import test from "node:test";

import { extractHtmlText, normalizeWhitespaceText } from "./html-content";

const PAGE = `
<html>
  <head><title>Ignored</title><script>var x = 1;</script><style>.a{}</style></head>
  <body>
    <nav><a href="/home?utm_source=x">Home</a></nav>
    <main>
      <h1>Platinum Card&reg; Benefits</h1>
      <p>Get   up to <strong>$200</strong> in airline fee credits annually.</p>
      <h2>Hotel Credit</h2>
      <p>Up to $300 semiannually with Fine Hotels + Resorts.</p>
      <div class="promo-banner">Limited time marketing rotation!</div>
    </main>
    <footer>Legal footer text</footer>
  </body>
</html>`;

test("generic fallback strips chrome, decodes entities, collapses whitespace", () => {
  const { text, headings } = extractHtmlText(PAGE);

  assert.ok(text.includes("Platinum Card® Benefits"));
  assert.ok(text.includes("Get up to $200 in airline fee credits annually."));
  assert.ok(!text.includes("var x = 1"));
  assert.ok(!text.includes("Home"));
  assert.ok(!text.includes("Legal footer text"));
  assert.equal(headings.length, 2);
  assert.equal(headings[0].text, "Platinum Card® Benefits");
  assert.equal(text.slice(headings[1].offset, headings[1].offset + "Hotel Credit".length), "Hotel Credit");
});

test("content selectors scope extraction and ignore selectors remove sections", () => {
  const { text } = extractHtmlText(PAGE, {
    content_selectors: ["main"],
    ignore_selectors: [".promo-banner"],
  });

  assert.ok(text.includes("Hotel Credit"));
  assert.ok(!text.includes("Limited time marketing rotation!"));
});

test("content selectors that match nothing produce empty text (no silent fallback)", () => {
  const { text } = extractHtmlText(PAGE, { content_selectors: ["#does-not-exist"] });
  assert.equal(text, "");
});

test("invalid configured selectors are skipped without breaking parsing", () => {
  const { text } = extractHtmlText(PAGE, {
    content_selectors: ["main"],
    ignore_selectors: ["::::not-a-selector"],
  });
  assert.ok(text.includes("Hotel Credit"));
});

test("extraction is deterministic and whitespace normalization is idempotent", () => {
  const first = extractHtmlText(PAGE);
  const second = extractHtmlText(PAGE);
  assert.equal(first.text, second.text);
  assert.deepEqual(first.headings, second.headings);

  const normalized = normalizeWhitespaceText(first.text);
  assert.equal(normalizeWhitespaceText(normalized), normalized);
});

test("br tags split lines", () => {
  const { text } = extractHtmlText("<body><p>line one<br>line two</p></body>");
  assert.equal(text, "line one\nline two");
});
