import Stripe from 'npm:stripe@14.23.0';

/**
 * Creates a Stripe Checkout session for organization subscription.
 *
 * Security: organization_id is no longer trusted from the request body. Instead,
 * a signed checkout token (issued by createCheckoutIntent) is required. The
 * token binds the organization_id, tier, and selected_sport and expires after
 * 5 minutes, preventing unauthenticated callers from attributing payments to
 * arbitrary organizations.
 */

async function verifyToken(token: string, secret: string): Promise<{ organization_id: string; tier: string; selected_sport: string; exp: number } | null> {
  const [encodedPayload, encodedSig] = token.split('.');
  if (!encodedPayload || !encodedSig) return null;

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify'],
  );

  // Convert base64url signature back to bytes
  const sigBase64 = encodedSig.replace(/-/g, '+').replace(/_/g, '/');
  const sigBytes = Uint8Array.from(atob(sigBase64), (c) => c.charCodeAt(0));

  const valid = await crypto.subtle.verify(
    'HMAC',
    key,
    sigBytes,
    new TextEncoder().encode(encodedPayload),
  );
  if (!valid) return null;

  const payloadBase64 = encodedPayload.replace(/-/g, '+').replace(/_/g, '/');
  const payload = JSON.parse(atob(payloadBase64));
  if (!payload.organization_id || !payload.tier || typeof payload.exp !== 'number') return null;
  if (payload.exp < Date.now()) return null;

  return payload;
}

Deno.serve(async (req) => {
  try {
    const { token } = await req.json();
    if (!token || typeof token !== 'string') {
      return Response.json({ error: 'Checkout token required' }, { status: 400 });
    }

    const secretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!secretKey) {
      console.error('Missing STRIPE_SECRET_KEY');
      return Response.json({ error: 'Stripe not configured' }, { status: 500 });
    }

    const payload = await verifyToken(token, secretKey);
    if (!payload) {
      return Response.json({ error: 'Invalid or expired checkout token' }, { status: 401 });
    }

    const { organization_id, tier, selected_sport } = payload;

    if (!['basic', 'premium'].includes(tier)) {
      return Response.json({ error: 'Invalid tier' }, { status: 400 });
    }
    if (!organization_id) {
      return Response.json({ error: 'Invalid token payload' }, { status: 400 });
    }

    const stripe = new Stripe(secretKey, { apiVersion: '2024-06-20' });

    // Amounts in cents (AUD)
    const pricing = {
      basic: 3500, // 35 AUD
      premium: 5000, // 50 AUD
    };

    // Build return URLs from the server-set X-Base44-App-Url header
    const appUrl = req.headers.get('X-Base44-App-Url');
    if (!appUrl) {
      console.error('Missing X-Base44-App-Url header');
      return Response.json({ error: 'Unable to determine app URL' }, { status: 500 });
    }
    const origin = appUrl.replace(/\/$/, '');

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      success_url: `${origin}/Dashboard`,
      cancel_url: `${origin}/Dashboard`,
      line_items: [
        {
          price_data: {
            currency: 'aud',
            recurring: { interval: 'month' },
            unit_amount: pricing[tier],
            product_data: {
              name: tier === 'basic' ? 'Basic Plan (Monthly)' : 'Premium Plan (Monthly)',
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
      subscription_data: {
        metadata: {
          base44_app_id: Deno.env.get('BASE44_APP_ID') || '',
          organization_id,
          tier,
          selected_sport: selected_sport || '',
        },
      },
    });

    return Response.json({ url: session.url });
  } catch (error) {
    console.error('stripeCheckout error:', error);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
});