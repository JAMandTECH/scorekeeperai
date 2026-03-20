import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import Stripe from 'npm:stripe@14.23.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    // Public app: do not require auth; trust payload + handle on webhook
    const { tier, organization_id, selected_sport } = await req.json();

    if (!['basic', 'premium'].includes(tier)) {
      return Response.json({ error: 'Invalid tier' }, { status: 400 });
    }
    if (!organization_id) {
      return Response.json({ error: 'organization_id is required' }, { status: 400 });
    }

    const secretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!secretKey) {
      console.error('Missing STRIPE_SECRET_KEY');
      return Response.json({ error: 'Stripe not configured' }, { status: 500 });
    }

    const stripe = new Stripe(secretKey, { apiVersion: '2024-06-20' });

    // Amounts in cents (AUD)
    const pricing = {
      basic: 2500,
      premium: 3500,
    };

    const origin = new URL(req.url).origin;

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      success_url: `${origin}/SubscriptionSuccess?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/SubscriptionCancelled`,
      line_items: [
        {
          price_data: {
            currency: 'aud',
            recurring: { interval: 'month' },
            unit_amount: pricing[tier],
            product_data: {
              name: tier === 'basic' ? 'Basic Plan (Monthly)' : 'Premium Plan (Monthly)'
            },
          },
          quantity: 1,
        },
      ],
      client_reference_id: organization_id,
      metadata: {
        base44_app_id: Deno.env.get('BASE44_APP_ID') || '',
        organization_id,
        tier,
        selected_sport: selected_sport || '',
      },
      allow_promotion_codes: true,
    });

    return Response.json({ url: session.url });
  } catch (error) {
    console.error('stripeCheckout error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});