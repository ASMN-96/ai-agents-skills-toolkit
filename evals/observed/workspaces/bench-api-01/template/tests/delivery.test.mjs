import assert from "node:assert/strict";
import { authorizeProjectRead } from "../src/delivery.mjs";

assert.equal(authorizeProjectRead({ actorTenantId: "a", resourceTenantId: "a", scopes: ["projects:read"] }), true);
assert.equal(authorizeProjectRead({ actorTenantId: "a", resourceTenantId: "b", scopes: ["projects:read"] }), false);
assert.equal(authorizeProjectRead({ actorTenantId: "a", resourceTenantId: "a", scopes: [] }), false);
assert.equal(authorizeProjectRead({ actorTenantId: "a", resourceTenantId: "a", scopes: ["projects:write"] }), false);
assert.equal(authorizeProjectRead({ actorTenantId: "tenant-a", resourceTenantId: "tenant-b", scopes: ["projects:read"] }), false);
