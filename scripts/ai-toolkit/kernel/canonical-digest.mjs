import { createHash } from "node:crypto";

function canonicalJson(value, seen, label) {
  if (value === null || typeof value === "boolean" || typeof value === "string") {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error(`${label} contains a non-finite number`);
    return JSON.stringify(value);
  }
  if (typeof value !== "object") {
    throw new Error(`${label} contains a non-JSON value`);
  }
  if (seen.has(value)) throw new Error(`${label} contains a cycle`);
  seen.add(value);
  try {
    if (Array.isArray(value)) {
      return `[${value.map((entry) => canonicalJson(entry, seen, label)).join(",")}]`;
    }
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new Error(`${label} must contain only plain records and arrays`);
    }
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const ownKeys = Reflect.ownKeys(descriptors);
    if (ownKeys.some((key) => typeof key !== "string")) {
      throw new Error(`${label} contains a symbol key`);
    }
    for (const key of ownKeys) {
      const descriptor = descriptors[key];
      if (!descriptor.enumerable || !("value" in descriptor)) {
        throw new Error(`${label} contains a hidden or accessor property`);
      }
    }
    return `{${ownKeys
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(descriptors[key].value, seen, label)}`)
      .join(",")}}`;
  } finally {
    seen.delete(value);
  }
}

export function canonicalDigest(value, label = "canonical digest input") {
  return createHash("sha256")
    .update(canonicalJson(value, new Set(), label), "utf8")
    .digest("hex");
}

export function buildResourceDigestBindings(resources) {
  if (!Array.isArray(resources)) throw new Error("resource digest bindings require an array");
  const seen = new Set();
  return resources
    .map((resource, index) => {
      const resourceId = resource?.id;
      if (typeof resourceId !== "string" || resourceId === "" || resourceId !== resourceId.trim()) {
        throw new Error(`resource digest bindings[${index}] requires a canonical id`);
      }
      if (seen.has(resourceId)) throw new Error(`resource digest binding id must be unique: ${resourceId}`);
      seen.add(resourceId);
      return {
        resourceId,
        digest: canonicalDigest(resource, `resource ${resourceId}`)
      };
    })
    .sort((left, right) => left.resourceId.localeCompare(right.resourceId));
}
