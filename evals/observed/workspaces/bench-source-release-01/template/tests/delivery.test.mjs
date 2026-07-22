import assert from "node:assert/strict";
import { reviewSource } from "../src/delivery.mjs";

assert.deepEqual(reviewSource({ license: "MIT", reviewed: true, activationRequested: false }), { approved: true, activation: "forbidden" });
assert.deepEqual(reviewSource({ license: "MIT", reviewed: true, activationRequested: true }), { approved: false, activation: "forbidden" });
assert.deepEqual(reviewSource({ license: "MIT", reviewed: false, activationRequested: false }), { approved: false, activation: "forbidden" });
assert.deepEqual(reviewSource({ license: "GPL-3.0", reviewed: true, activationRequested: false }), { approved: false, activation: "forbidden" });
