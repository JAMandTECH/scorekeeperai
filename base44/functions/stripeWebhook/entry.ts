import { createClient } from 'npm:@base44/sdk@0.8.23';
import Stripe from 'npm:stripe@14.23.0';

Deno.serve(async (req) => {
  try {
    const secretKey = Deno.env.get('STRIPE_SECRET_KEY');
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    if (!secretKey || !webhookSecret) {
      console.error('Missing Stripe keys');
      return Response.json({ error: 'Stripe not configured' }, { status: 500 });
    }

    const stripe = new Stripe(secretKey, { apiVersion: '2024-06-20' });

    const rawBody = await req.text();
    const signature = req.headers.get('stripe-signature');

    let event;
    try {
      event = await stripe.webhooks.constructEventAsync(rawBody, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return Response.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const base44 = createClient({
      appId: Deno.env.get('BASE44_APP_ID'),
      serviceRoleKey: Deno.env.get('BASE44_SERVICE_ROLE_KEY'),
    });

    const type = event.type;
    const data = event.data?.object || {};

    // Prefer metadata.organization_id; fallback to client_reference_id
    const organizationId = data.metadata?.organization_id || data.client_reference_id || null;
    const tier = data.metadata?.tier || null;
    const selected_sport = data.metadata?.selected_sport || null;

    if (!organizationId) {
      console.warn('No organization_id present in event metadata');
      return Response.json({ received: true });
    }

    if (type === 'checkout.session.completed') {
      // Mark active on successful checkout
      const update = { subscription_status: 'active' };
      if (tier) update.subscription_tier = tier;
      if (tier === 'basic' && selected_sport) update.selected_sport = selected_sport;
      await base44.entities.Organization.update(organizationId, update);
      console.log('Organization activated via checkout.session.completed:', organizationId);

      // Mirror plan to admin users of this organization
      try {
        const admins = await base44.entities.User.filter({
          role: 'admin',
          $or: [{ organization_id: organizationId }, { active_organization_id: organizationId }]
        });
        await Promise.allSettled(
          admins.map(u => base44.entities.User.update(u.id, {
            subscription_tier: tier || 'basic',
            subscription_status: 'active'
          }))
        );
      } catch (e) {
        console.error('Failed to update admin user subscription on checkout complete:', e?.message || e);
      }
    }

    if (type === 'invoice.paid') {
      await base44.entities.Organization.update(organizationId, { subscription_status: 'active' });
      console.log('Invoice paid; ensured active for org:', organizationId);

      // Ensure admins show active status
      try {
        const admins = await base44.entities.User.filter({
          role: 'admin',
          $or: [{ organization_id: organizationId }, { active_organization_id: organizationId }]
        });
        await Promise.allSettled(
          admins.map(u => base44.entities.User.update(u.id, { subscription_status: 'active' }))
        );
      } catch (e) {
        console.error('Failed to set admin user status active on invoice.paid:', e?.message || e);
      }
    }

    if (type === 'invoice.payment_failed') {
      await base44.entities.Organization.update(organizationId, { subscription_status: 'expired' });
      console.log('Invoice failed; marked expired for org:', organizationId);

      // Reflect expired on admins
      try {
        const admins = await base44.entities.User.filter({
          role: 'admin',
          $or: [{ organization_id: organizationId }, { active_organization_id: organizationId }]
        });
        await Promise.allSettled(
          admins.map(u => base44.entities.User.update(u.id, { subscription_status: 'expired' }))
        );
      } catch (e) {
        console.error('Failed to set admin user status expired on payment_failed:', e?.message || e);
      }
    }

    // Handle mid-cycle plan changes and metadata-carrying subscription events
    if (type === 'customer.subscription.updated') {
      try {
        const items = data.items?.data || [];
        const amount = items[0]?.price?.unit_amount ?? items[0]?.plan?.amount;
        const computedTier = amount === 3500 ? 'basic' : amount === 5000 ? 'premium' : (data.metadata?.tier || null);
        const subOrgId = data.metadata?.organization_id || organizationId; // fallback if webhook provided one earlier
        if (subOrgId) {
          const update = { subscription_status: data.status || 'active' };
          if (computedTier) update.subscription_tier = computedTier;
          await base44.entities.Organization.update(subOrgId, update);
          console.log('Subscription updated; synced org:', subOrgId, update);

          // Mirror to admins
          try {
            const admins = await base44.entities.User.filter({
              role: 'admin',
              $or: [{ organization_id: subOrgId }, { active_organization_id: subOrgId }]
            });
            await Promise.allSettled(
              admins.map(u => base44.entities.User.update(u.id, {
                subscription_tier: computedTier || u.subscription_tier,
                subscription_status: data.status || 'active'
              }))
            );
          } catch (e) {
            console.error('Failed to mirror admin user state on subscription.updated:', e?.message || e);
          }
        } else {
          console.warn('subscription.updated without organization id');
        }
      } catch (e) {
        console.error('Error handling customer.subscription.updated:', e?.message || e);
      }
    }

    if (type === 'customer.subscription.deleted' || type === 'customer.subscription.canceled') {
      await base44.entities.Organization.update(organizationId, { subscription_status: 'cancelled', subscription_tier: 'free' });
      console.log('Subscription cancelled; downgraded org:', organizationId);

      // Downgrade admins to free and mark cancelled
      try {
        const admins = await base44.entities.User.filter({
          role: 'admin',
          $or: [{ organization_id: organizationId }, { active_organization_id: organizationId }]
        });
        await Promise.allSettled(
          admins.map(u => base44.entities.User.update(u.id, { subscription_tier: 'free', subscription_status: 'cancelled' }))
        );
      } catch (e) {
        console.error('Failed to downgrade admin users on subscription cancel:', e?.message || e);
      }
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error('stripeWebhook error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});