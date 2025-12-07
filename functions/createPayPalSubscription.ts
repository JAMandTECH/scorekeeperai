import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

async function getPayPalAccessToken() {
  const clientId = Deno.env.get("PAYPAL_CLIENT_ID");
  const clientSecret = Deno.env.get("PAYPAL_CLIENT_SECRET");
  
  const auth = btoa(`${clientId}:${clientSecret}`);
  
  const response = await fetch('https://api-m.paypal.com/v1/oauth2/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  
  const data = await response.json();
  return data.access_token;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { organization_id, tier, selected_sport } = await req.json();
    
    // Verify user owns this organization
    const orgs = await base44.entities.Organization.list();
    const org = orgs.find(o => o.id === organization_id && o.id === user.organization_id);
    
    if (!org) {
      return Response.json({ error: 'Organization not found or unauthorized' }, { status: 403 });
    }
    
    // Get PayPal plan ID based on tier
    const planIds = {
      basic: 'P-6JT0173942275641PNE2QVQI',
      premium: 'P-9TX62969RS691692LNE2Q3NI',
    };
    
    if (!planIds[tier]) {
      return Response.json({ error: 'Invalid tier' }, { status: 400 });
    }
    
    const accessToken = await getPayPalAccessToken();
    
    // Create PayPal subscription
    const subscriptionResponse = await fetch('https://api-m.paypal.com/v1/billing/subscriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        plan_id: planIds[tier],
        custom_id: organization_id,
        application_context: {
          brand_name: 'ScorekeeperAI',
          locale: 'en-AU',
          shipping_preference: 'NO_SHIPPING',
          user_action: 'SUBSCRIBE_NOW',
          return_url: `${new URL(req.url).origin}/subscription-success`,
          cancel_url: `${new URL(req.url).origin}/subscription-cancelled`,
        },
      }),
    });
    
    const subscription = await subscriptionResponse.json();
    
    if (!subscriptionResponse.ok) {
      console.error('PayPal subscription error:', subscription);
      return Response.json({ error: 'Failed to create subscription', details: subscription }, { status: 500 });
    }
    
    // Store subscription ID in organization
    await base44.asServiceRole.entities.Organization.update(organization_id, {
      paypal_subscription_id: subscription.id,
      subscription_tier: tier,
      selected_sport: tier === 'basic' ? selected_sport : null,
    });
    
    // Get approval URL
    const approvalLink = subscription.links.find(link => link.rel === 'approve');
    
    return Response.json({
      subscription_id: subscription.id,
      approval_url: approvalLink.href,
    });
    
  } catch (error) {
    console.error('Error creating PayPal subscription:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});