/**
 * Shared authorization helpers for backend functions.
 *
 * Resolves the caller's organization and enforces that client-supplied
 * organization_id values are only honored for verified super admins.
 * Regular admins are hard-scoped to their own organization; an empty
 * organization_id never widens scope to all orgs.
 *
 * Also provides escapeHtml for safe interpolation of user input into
 * HTML email bodies.
 */

export interface AuthUser {
  id: string;
  email?: string;
  full_name?: string;
  role?: string;
  is_super_admin?: boolean;
  is_scorekeeper?: boolean;
  is_timekeeper?: boolean;
  organization_id?: string;
  active_organization_id?: string;
  data?: {
    is_super_admin?: boolean;
    is_scorekeeper?: boolean;
    is_timekeeper?: boolean;
    organization_id?: string;
    active_organization_id?: string;
  };
}

/** Returns true if the user is a verified super admin (role=admin AND is_super_admin=true). */
export function isSuperAdmin(user: AuthUser | null | undefined): boolean {
  if (!user) return false;
  return user.role === 'admin' &&
    (user.is_super_admin === true || user.data?.is_super_admin === true);
}

/** Resolves the caller's own organization id from the user object. */
export function resolveCallerOrg(user: AuthUser | null | undefined): string | null {
  if (!user) return null;
  return user.organization_id ||
    user.active_organization_id ||
    user.data?.organization_id ||
    user.data?.active_organization_id ||
    null;
}

interface ResolveOptions {
  /** When true, non-admin users get a 403. */
  requireAdmin?: boolean;
  /** When true, allow scorekeepers (same-org) in addition to admins. */
  allowScorekeeper?: boolean;
}

interface ResolveResult {
  orgId: string | null;
  error: Response | null;
}

/**
 * Resolves the effective organization id for a request.
 *
 * - Super admins: may target any org (body-supplied or their own).
 * - Regular admins: must target their own org; a body-supplied org that
 *   doesn't match returns a 403. Empty body org falls back to their own.
 * - Non-admins (when requireAdmin): 403.
 * - Users with no resolvable org (and not super admin): 403 (fail closed).
 *
 * Never returns orgId=null for non-super-admins — the caller can safely
 * use the returned orgId in a filter without widening scope to all orgs.
 */
export function resolveAuthorizedOrg(
  user: AuthUser | null,
  bodyOrgId: string | undefined | null,
  options: ResolveOptions = {}
): ResolveResult {
  if (!user) {
    return { orgId: null, error: Response.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const superAdmin = isSuperAdmin(user);
  const callerOrg = resolveCallerOrg(user);

  if (options.requireAdmin && !superAdmin && user.role !== 'admin' && !options.allowScorekeeper) {
    return { orgId: null, error: Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 }) };
  }

  if (superAdmin) {
    // Super admins may target any org (or all when null — but callers should
    // still guard against null for safety).
    return { orgId: bodyOrgId || callerOrg || null, error: null };
  }

  // Regular admin or scorekeeper: must target their own org.
  if (bodyOrgId && callerOrg && bodyOrgId !== callerOrg) {
    return { orgId: null, error: Response.json({ error: 'Forbidden: cannot access another organization' }, { status: 403 }) };
  }

  if (!callerOrg) {
    return { orgId: null, error: Response.json({ error: 'Forbidden: no organization context' }, { status: 403 }) };
  }

  return { orgId: callerOrg, error: null };
}

/** HTML-escapes a value for safe interpolation into email/markup bodies. */
export function escapeHtml(value: unknown): string {
  if (value == null) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}