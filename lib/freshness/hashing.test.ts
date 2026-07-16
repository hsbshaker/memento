import assert from "node:assert/strict";
import test from "node:test";

import { sha256Hex } from "./hashing";

test("sha256Hex produces known vectors", () => {
  assert.equal(
    sha256Hex(""),
    "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  );
  assert.equal(
    sha256Hex("abc"),
    "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
  );
});

test("sha256Hex handles bytes and strings equivalently for utf-8 content", () => {
  const text = "memento-benefits";
  assert.equal(sha256Hex(text), sha256Hex(new TextEncoder().encode(text)));
});
