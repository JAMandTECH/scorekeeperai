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
    
    const { organization_id } = await req.json();
    
    // Verify user owns this organization
    const orgs = await base44.entities.Organization.list();
    const org = orgs.find(o => o.id === organization_id && o.id === user.organization_id);
    
    if (!org || !org.paypal_subscription_id) {
      return Response.json({ error: 'Organization not found or no active subscription' }, { status: 403 });
    }
    
    const accessToken = await getPayPalAccessToken();
    
    // Cancel PayPal subscription
    const response = await fetch(
      `https://api-m.paypal.com/v1/billing/subscriptions/${org.paypal_subscription_id}/cancel`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason: 'User requested cancellation',
        }),
      }
    );
    
    if (!response.ok) {
      const error = await response.json();
      console.error('PayPal cancellation error:', error);
      return Response.json({ error: 'Failed to cancel subscription', details: error }, { status: 500 });
    }
    
    // Update organization status
    await base44.asServiceRole.entities.Organization.update(organization_id, {
      subscription_status: 'cancelled',
    });
    
    return Response.json({ success: true, message: 'Subscription cancelled successfully' });
    
  } catch (error) {
    console.error('Error cancelling PayPal subscription:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});