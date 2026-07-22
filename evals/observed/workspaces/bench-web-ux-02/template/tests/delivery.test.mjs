import assert from "node:assert/strict";
import { accessibilityState } from "../src/delivery.mjs";

assert.deepEqual(accessibilityState({ contrastRatio: 4.5, visibleFocus: true }), { contrastPasses: true, focusPasses: true });
assert.deepEqual(accessibilityState({ contrastRatio: 4.49, visibleFocus: false }), { contrastPasses: false, focusPasses: false });
