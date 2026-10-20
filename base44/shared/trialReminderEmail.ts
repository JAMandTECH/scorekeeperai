import { escapeHtml } from './orgAuth.ts';

/**
 * Trial reminder email body.
 *
 * The reusable template belongs in base44/emails/, which can only be created on
 * the main branch, so the branded body lives here for now and both the 7-day and
 * the catch-up reminder send exactly this copy.
 *
 * Brand matches the app's system emails: green header band, dark charcoal
 * surface, Space Grotesk headings with Arial fallback, square corners.
 */
export interface TrialReminderArgs {
  firstName: string;
  organizationName: string;
  daysLeft: number;
  trialEndDate: string;
}

const CHECKOUT_URL = 'https://scorekeperai.com/subscriptioncheckout';
const LOGO_URL = 'https://media.base44.com/images/public/690476f21c3624553ac82b4f/558b33f3e_logo.png';
const BODY_FONT = "Inter, Helvetica, Arial, sans-serif";
const HEADING_FONT = "'Space Grotesk', Arial, sans-serif";

export function trialReminderEmail({ firstName, organizationName, daysLeft, trialEndDate }: TrialReminderArgs): string {
  const safeFirst = escapeHtml(firstName);
  const safeOrg = escapeHtml(organizationName);
  const safeEnd = escapeHtml(trialEndDate);
  const dayLabel = daysLeft === 1 ? 'day' : 'days';

  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0;padding:0;background:#14130f;">
  <tr>
    <td align="center" style="padding:0;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background:#14130f;">

        <tr>
          <td style="background:#199f4a;padding:24px 36px;">
            <img src="${LOGO_URL}" alt="ScorekeeperAI" width="110" style="display:block;border:0;margin:0 0 10px 0;" />
            <div style="font-family:${HEADING_FONT};font-size:18px;font-weight:700;color:#000000;">ScorekeeperAI</div>
          </td>
        </tr>

        <tr>
          <td style="padding:40px 36px 8px;">
            <h1 style="margin:0;font-family:${HEADING_FONT};font-size:30px;line-height:1.15;font-weight:700;color:#ffffff;">
              Your trial ends in ${daysLeft} ${dayLabel}
            </h1>
          </td>
        </tr>

        <tr>
          <td style="padding:0 36px 8px;font-family:${BODY_FONT};font-size:16px;line-height:1.6;color:#a9a69e;">
            Hi ${safeFirst}, the trial for ${safeOrg} ends on ${safeEnd}. Choose a plan before then to keep live scoring, player statistics, and every other plan feature switched on.
          </td>
        </tr>

        <tr>
          <td style="padding:24px 36px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td width="50%" valign="top" style="border:1px solid #e5e7eb;padding:18px;font-family:${BODY_FONT};">
                  <div style="font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#a9a69e;margin-bottom:6px;">Organization</div>
                  <div style="font-size:16px;font-weight:700;color:#ffffff;">${safeOrg}</div>
                </td>
                <td width="50%" valign="top" style="border:1px solid #e5e7eb;padding:18px;font-family:${BODY_FONT};">
                  <div style="font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#a9a69e;margin-bottom:6px;">Trial ends</div>
                  <div style="font-size:16px;font-weight:700;color:#ffffff;">${safeEnd}</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <tr>
          <td style="padding:28px 36px 8px;">
            <a href="${CHECKOUT_URL}" style="display:inline-block;background:#199f4a;color:#000000;font-family:${HEADING_FONT};font-size:15px;font-weight:700;text-decoration:none;padding:14px 28px;">Choose a plan</a>
          </td>
        </tr>

        <tr>
          <td style="padding:12px 36px 36px;font-family:${BODY_FONT};font-size:14px;line-height:1.6;color:#a9a69e;">
            If the trial ends without an active plan, ${safeOrg} moves to the Free plan automatically. Your teams, players, and game history stay exactly where they are, and you can upgrade again whenever you like.
          </td>
        </tr>

        <tr>
          <td style="background:#199f4a;padding:20px 36px;font-family:${BODY_FONT};font-size:13px;color:#000000;">
            ScorekeeperAI, live scoring and league management for basketball and volleyball.
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>`.trim();
}