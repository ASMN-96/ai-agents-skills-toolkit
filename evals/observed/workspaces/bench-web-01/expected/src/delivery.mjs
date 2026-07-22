export function tenantPath({ tenantId, page }) {
  if (!/^[a-z0-9-]+$/u.test(tenantId) || !/^[a-z0-9-]+$/u.test(page)) {
    throw new Error("tenant and page must be URL-safe identifiers");
  }
  return `/t/${tenantId}/${page}`;
}
