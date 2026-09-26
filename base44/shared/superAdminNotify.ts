/**
 * Shared helper: notify all super admins by email AND in-app Notification.
 * Used by createAdminRequest, stripeWebhook, paypalWebhook, and the signup
 * workflow backend function so notification logic stays in one place.
 *
 * Errors are logged (never swallowed) but never throw — the caller's primary
 * operation (request creation, webhook handling) must still succeed.
 */

interface NotifyArgs {
  base44: any;
  subject: string;
  htmlBody: string;
  notificationType: string; // must be a valid Notification.type enum value
  title: string;
  message: string;
  data?: Record<string, any>;
}

export interface NotifyResult {
  superAdminCount: number;
  superAdminEmails: string[];
  emailsSent: number;
  emailErrors: string[];
  notificationsCreated: number;
  notificationErrors: string[];
  fatalError?: string;
}

export async function notifySuperAdmins({
  base44,
  subject,
  htmlBody,
  notificationType,
  title,
  message,
  data = {},
}: NotifyArgs): Promise<NotifyResult> {
  const result: NotifyResult = {
    superAdminCount: 0,
    superAdminEmails: [],
    emailsSent: 0,
    emailErrors: [],
    notificationsCreated: 0,
    notificationErrors: [],
  };
  try {
    // Normalize the entity API. createClientFromRequest (user context) exposes
    // .asServiceRole to escalate; createClient({ serviceRoleKey }) is already
    // service-role and .asServiceRole throws on access. Resolve safely: try the
    // escalation path, fall back to the base entities on any error.
    let entities: any;
    try {
      entities = base44.asServiceRole?.entities;
    } catch {
      entities = undefined;
    }
    if (!entities) entities = base44.entities;

    // User.list() requires user auth on some client types; User.filter() works
    // with the service-role key. Fetch admins, then narrow to super admins.
    const admins = await entities.User.filter({ role: 'admin' });
    const superAdmins = admins.filter(
      (u: any) => u.is_super_admin === true
    );
    result.superAdminCount = superAdmins.length;
    result.superAdminEmails = superAdmins.map((s: any) => s.email);

    if (superAdmins.length === 0) {
      console.error('[superAdminNotify] No super admins found (role=admin, is_super_admin=true).');
      return result;
    }

    for (const sa of superAdmins) {
      // Email
      try {
        await base44.integrations.Core.SendEmail({
          to: sa.email,
          subject,
          html: htmlBody,
        });
        result.emailsSent++;
      } catch (emailError) {
        const msg = emailError?.message || String(emailError);
        console.error(`[superAdminNotify] SendEmail failed for ${sa.email}:`, msg);
        result.emailErrors.push(`${sa.email}: ${msg}`);
      }

      // In-app Notification — org-scoped entity; use super admin's org (or empty)
      // and tag data.user_id so NotificationBell surfaces it for that user.
      try {
        await entities.Notification.create({
          organization_id: sa.organization_id || sa.active_organization_id || '',
          type: notificationType,
          title,
          message,
          data: { ...data, user_id: sa.id, target_email: sa.email },
          read_by: [],
        });
        result.notificationsCreated++;
      } catch (notifError) {
        const msg = notifError?.message || String(notifError);
        console.error(`[superAdminNotify] Notification.create failed for ${sa.email}:`, msg);
        result.notificationErrors.push(`${sa.email}: ${msg}`);
      }
    }
  } catch (error) {
    const msg = error?.message || String(error);
    console.error('[superAdminNotify] Fatal error notifying super admins:', msg);
    result.fatalError = msg;
  }
  return result;
}