export function authorizeProjectRead({ actorTenantId, resourceTenantId, scopes }) {
  return actorTenantId === resourceTenantId && Array.isArray(scopes) && scopes.includes("projects:read");
}
