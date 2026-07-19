#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import * as digestModule from "./ai-toolkit/kernel/canonical-digest.mjs";

const DIGEST_MODE = "sha256-utf8-lf-v1";

test("canonical text digest is stable across LF and CRLF without changing raw bytes", () => {
  assert.equal(digestModule.CANONICAL_TEXT_DIGEST_MODE, DIGEST_MODE);
  assert.equal(typeof digestModule.canonicalTextSha256, "function");

  const lf = Buffer.from("first\nsecond\n", "utf8");
  const crlf = Buffer.from("first\r\nsecond\r\n", "utf8");
  assert.notEqual(createHash("sha256").update(lf).digest("hex"), createHash("sha256").update(crlf).digest("hex"));
  assert.equal(digestModule.canonicalTextSha256(lf), digestModule.canonicalTextSha256(crlf));
  assert.deepEqual(crlf, Buffer.from("first\r\nsecond\r\n", "utf8"));
});

test("canonical text digest normalizes lone CR and rejects invalid UTF-8", () => {
  const lf = Buffer.from("first\nsecond\n", "utf8");
  const cr = Buffer.from("first\rsecond\r", "utf8");
  assert.equal(digestModule.canonicalTextSha256(lf), digestModule.canonicalTextSha256(cr));
  assert.throws(
    () => digestModule.canonicalTextSha256(Buffer.from([0xc3, 0x28]), "hostile text"),
    /hostile text must be valid UTF-8 text/i
  );
  assert.throws(
    () => digestModule.canonicalTextSha256(Buffer.from("text\0payload", "utf8"), "binary-like input"),
    /binary-like input must not contain NUL bytes/i
  );
});
