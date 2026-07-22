export function repairDisplayName(value) {
  if (typeof value !== "string") throw new TypeError("display name must be a string");
  const repaired = value.trim().replace(/\s+/gu, " ");
  if (repaired === "") throw new Error("display name is required");
  return repaired;
}
