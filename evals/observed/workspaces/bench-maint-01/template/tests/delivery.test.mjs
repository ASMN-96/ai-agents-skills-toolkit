import assert from "node:assert/strict";
import { repairDisplayName } from "../src/delivery.mjs";

assert.equal(repairDisplayName("  Ada   Lovelace  "), "Ada Lovelace");
assert.throws(() => repairDisplayName("   "), /required/u);
