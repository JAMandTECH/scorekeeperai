import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Issues a short-lived signed checkout token bound to the authenticated admin's
 * organization. The token is verified by stripeCheckout so that unauthenticated
 * callers cannot create checkout sessions for arbitrary organizations.
 */

async function signHmac(data: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tier, selected_sport } = await req.json();
    if (!['basic', 'premium'].includes(tier)) {
      return Response.json({ error: 'Invalid tier' }, { status: 400 });
    }

    // Derive organization_id from the authenticated user — never from the request body
    const orgId = user.organization_id || user.active_organization_id;
    if (!orgId) {
      return Response.json({ error: 'No organization associated with your account' }, { status: 400 });
    }

    // Verify the organization exists
    const org = await base44.asServiceRole.entities.Organization.get(orgId);
    if (!org) {
      return Response.json({ error: 'Organization not found' }, { status: 404 });
    }

    const secret = Deno.env.get('STRIPE_SECRET_KEY');
    if (!secret) {
      console.error('Missing STRIPE_SECRET_KEY');
      return Response.json({ error: 'Payment not configured' }, { status: 500 });
    }

    const payload = JSON.stringify({
      organization_id: orgId,
      tier,
      selected_sport: selected_sport || '',
      exp: Date.now() + 5 * 60 * 1000, // 5-minute expiry
    });
    const encodedPayload = btoa(payload)
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    const sig = await signHmac(encodedPayload, secret);

    return Response.json({ token: `${encodedPayload}.${sig}` });
  } catch (error) {
    console.error('createCheckoutIntent error:', error);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
});