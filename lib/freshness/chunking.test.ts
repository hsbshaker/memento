import assert from "node:assert/strict";
import test from "node:test";

import { chunkDocument } from "./chunking";

const SHA = "a".repeat(64);

const buildText = (lines: number) =>
  Array.from({ length: lines }, (_, i) => `Line ${i} — benefit text with details ${i}.`).join("\n");

test("short documents produce a single chunk covering the whole text", () => {
  const text = buildText(5);
  const chunks = chunkDocument({ text, normalizedSha256: SHA });

  assert.equal(chunks.length, 1);
  assert.equal(chunks[0].chunkId, `${SHA}#0`);
  assert.equal(chunks[0].startOffset, 0);
  assert.equal(chunks[0].endOffset, text.length);
  assert.equal(chunks[0].text, text);
});

test("long documents split on line boundaries with overlap and exact offsets", () => {
  const text = buildText(200);
  const chunks = chunkDocument({ text, normalizedSha256: SHA }, { maxChars: 1000, overlapChars: 200 });

  assert.ok(chunks.length > 3);
  for (const chunk of chunks) {
    assert.ok(chunk.text.length <= 1000);
    assert.equal(text.slice(chunk.startOffset, chunk.endOffset), chunk.text);
    assert.equal(chunk.chunkId, `${SHA}#${chunk.index}`);
  }
  // Overlap: each subsequent chunk starts before the previous chunk ends.
  for (let i = 1; i < chunks.length; i += 1) {
    assert.ok(chunks[i].startOffset < chunks[i - 1].endOffset);
    assert.ok(chunks[i].startOffset > chunks[i - 1].startOffset);
  }
  // Coverage: last chunk reaches the end of the document.
  assert.equal(chunks[chunks.length - 1].endOffset, text.length);
});

test("chunks carry the nearest preceding section heading and page number", () => {
  const text = buildText(200);
  const chunks = chunkDocument(
    {
      text,
      normalizedSha256: SHA,
      headings: [
        { text: "Intro", offset: 0 },
        { text: "Travel Benefits", offset: 2000 },
      ],
      pageOffsets: [
        { page: 1, offset: 0 },
        { page: 2, offset: 3000 },
      ],
    },
    { maxChars: 1000, overlapChars: 100 },
  );

  assert.equal(chunks[0].sectionHeading, "Intro");
  assert.equal(chunks[0].pageNumber, 1);

  const late = chunks.find((c) => c.startOffset >= 3000);
  assert.ok(late);
  assert.equal(late.sectionHeading, "Travel Benefits");
  assert.equal(late.pageNumber, 2);
});

test("chunking is deterministic and empty text yields no chunks", () => {
  const text = buildText(50);
  const a = chunkDocument({ text, normalizedSha256: SHA }, { maxChars: 800 });
  const b = chunkDocument({ text, normalizedSha256: SHA }, { maxChars: 800 });
  assert.deepEqual(a, b);
  assert.deepEqual(chunkDocument({ text: "", normalizedSha256: SHA }), []);
});
