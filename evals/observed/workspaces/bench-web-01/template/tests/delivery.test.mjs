import assert from "node:assert/strict";
import { tenantPath } from "../src/delivery.mjs";

assert.equal(tenantPath({ tenantId: "acme-1", page: "overview" }), "/t/acme-1/overview");
assert.throws(() => tenantPath({ tenantId: "../other", page: "overview" }), /URL-safe/u);
