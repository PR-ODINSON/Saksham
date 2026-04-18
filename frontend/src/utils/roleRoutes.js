/**
 * Centralised mapping of user.role → dashboard URL prefix.
 * All role-aware navigation goes through this helper so the URL pattern
 * (/peon/dashboard, /principal/dashboard, /deo/dashboard, ...) stays consistent.
 */
const VALID_ROLES = new Set(['peon', 'principal', 'deo', 'contractor', 'admin']);

export function dashboardPathFor(role) {
  if (!role || !VALID_ROLES.has(role)) return '/login';
  return `/${role}/dashboard`;
}

/** Convenience: build a sub-path under the role's dashboard. */
export function roleSubPath(role, sub = '') {
  const base = dashboardPathFor(role);
  if (!sub) return base;
  return `${base}/${sub.replace(/^\//, '')}`;
}
