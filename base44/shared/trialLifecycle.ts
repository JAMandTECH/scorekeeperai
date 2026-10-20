/**
 * Trial lifecycle sweep — trial reminders and automatic downgrade.
 *
 * Driven by the daily data health check schedule. Safe to run repeatedly:
 * every action is guarded by a recorded timestamp and a fresh re-read of the
 * organization, so a second run in the same window never sends a duplicate
 * email and never downgrades twice.
 *
 * Rules:
 *  - Trial ends within 7 days and no reminder recorded -> send the 7-day reminder
 *  - Trial ends within 6 days and no reminder recorded -> send one catch-up
 *    reminder (the 7-day point was missed, e.g. the job did not run that day)
 *  - Trial end date has passed and the subscription is not active -> downgrade
 *    the organization to the free tier
 */

import { trialReminderEmail } from './trialReminderEmail.ts';

const DAY_MS = 24 * 60 * 60 * 1000;
const REMINDER_LEAD_DAYS = 7;
const TRIAL_SCAN_LIMIT = 200;

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-AU', {
    timeZone: 'Australia/Perth',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

/** Admins of one organization, oldest first, so the recipient is deterministic. */
async function orgAdmins(entities: any, organizationId: string) {
  const admins = await entities.User.filter({
    role: 'admin',
    $or: [{ organization_id: organizationId }, { active_organization_id: organizationId }],
  });
  return (admins || []).slice().sort((a: any, b: any) =>
    String(a.created_date || '').localeCompare(String(b.created_date || ''))
  );
}

export async function runTrialLifecycleSweep(base44: any) {
  const entities = base44.asServiceRole.entities;
  const integrations = base44.asServiceRole.integrations;

  const summary = {
    checked: 0,
    reminders_sent: 0,
    catchup_reminders_sent: 0,
    downgraded: 0,
    skipped: [] as string[],
    errors: [] as string[],
  };

  // Callers run on different SDK versions, where an entity filter resolves to
  // either a page object or a plain array, so accept both shapes.
  const trialResult: any = await entities.Organization.filter({ subscription_status: 'trial' });
  const trials: any[] = Array.isArray(trialResult) ? trialResult : (trialResult?.items || []);
  summary.checked = trials.length;
  if (trials.length >= TRIAL_SCAN_LIMIT) {
    console.warn('[trialLifecycle] trial scan hit its page size; more trials may exist than were checked');
  }

  for (const listed of trials) {
    try {
      if (!listed.trial_end_date) {
        summary.skipped.push(`${listed.id}: trial has no end date`);
        continue;
      }

      // Re-read immediately before acting: a subscription that landed moments
      // ago must win over this sweep.
      const org = await entities.Organization.get(listed.id);
      if (!org || org.subscription_status !== 'trial') {
        summary.skipped.push(`${listed.id}: subscription no longer on trial`);
        continue;
      }

      const msLeft = new Date(org.trial_end_date).getTime() - Date.now();
      if (!Number.isFinite(msLeft)) {
        summary.skipped.push(`${listed.id}: invalid trial end date`);
        continue;
      }

      // Trial over with no active subscription -> free tier.
      if (msLeft <= 0) {
        await entities.Organization.update(org.id, {
          subscription_tier: 'free',
          subscription_status: 'expired',
        });

        const admins = await orgAdmins(entities, org.id);
        await Promise.allSettled(
          admins.map((u: any) =>
            entities.User.update(u.id, {
              subscription_tier: 'free',
              subscription_status: 'expired',
            })
          )
        );

        summary.downgraded++;
        console.log('[trialLifecycle] downgraded expired trial to free:', org.id);
        continue;
      }

      // Outside the reminder window, or a reminder was already recorded.
      if (org.trial_reminder_sent_at || org.trial_catchup_reminder_sent_at) continue;
      if (msLeft > REMINDER_LEAD_DAYS * DAY_MS) continue;

      // Inside the last six days the 7-day point has already passed, so this
      // send is the single catch-up reminder instead.
      const isCatchup = msLeft <= (REMINDER_LEAD_DAYS - 1) * DAY_MS;

      const admins = await orgAdmins(entities, org.id);
      const recipient = admins[0];
      if (!recipient?.email) {
        summary.skipped.push(`${org.id}: no registered admin to notify`);
        continue;
      }

      const daysLeft = Math.max(Math.ceil(msLeft / DAY_MS), 1);
      const trialEndDate = formatDate(org.trial_end_date);
      await integrations.Core.SendEmail({
        to: recipient.email,
        subject: `Your ScorekeeperAI trial ends on ${trialEndDate}`,
        html: trialReminderEmail({
          firstName: String(recipient.full_name || '').split(' ')[0] || 'there',
          organizationName: org.name || 'your organization',
          daysLeft,
          trialEndDate,
        }),
      });

      await entities.Organization.update(
        org.id,
        isCatchup
          ? { trial_catchup_reminder_sent_at: new Date().toISOString() }
          : { trial_reminder_sent_at: new Date().toISOString() }
      );

      if (isCatchup) {
        summary.catchup_reminders_sent++;
        console.log('[trialLifecycle] sent catch-up trial reminder:', org.id);
      } else {
        summary.reminders_sent++;
        console.log('[trialLifecycle] sent 7-day trial reminder:', org.id);
      }
    } catch (error: any) {
      const message = `${listed.id}: ${error?.message || error}`;
      console.error('[trialLifecycle]', message);
      summary.errors.push(message);
    }
  }

  return summary;
}