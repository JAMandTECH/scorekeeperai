import { createClientFromRequest, createClient } from 'npm:@base44/sdk@0.8.4';

async function getPayPalAccessToken() {
  const clientId = Deno.env.get("PAYPAL_CLIENT_ID");
  const clientSecret = Deno.env.get("PAYPAL_CLIENT_SECRET");
  
  console.log('Getting PayPal access token...');
  
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
  
  if (!response.ok) {
    console.error('PayPal auth error:', data);
    throw new Error(`PayPal auth failed: ${JSON.stringify(data)}`);
  }
  
  console.log('PayPal access token obtained');
  return data.access_token;
}

Deno.serve(async (req) => {
  try {
    console.log('=== Starting subscription creation ===');
    
    const { organization_id, tier, selected_sport } = await req.json();
    
    // Initialize Base44 client - always use service role for this function
    const base44 = createClient({
      appId: Deno.env.get("BASE44_APP_ID"),
      serviceRoleKey: Deno.env.get("BASE44_SERVICE_ROLE_KEY"),
    });
    console.log('Request params:', { organization_id, tier, selected_sport });
    
    // Get organization details
    const orgs = await base44.asServiceRole.entities.Organization.list();
    const org = orgs.find(o => o.id === organization_id);
    
    if (!org) {
      console.log('Organization not found');
      return Response.json({ error: 'Organization not found' }, { status: 404 });
    }
    
    console.log('Organization verified:', org.name);
    
    // Get PayPal plan ID based on tier
    const planIds = {
      basic: 'P-9TX62969RS691692LNE2Q3NI',
      premium: 'P-5S98478109670745ANE2QZKQ',
    };
    
    if (!planIds[tier]) {
      console.log('Invalid tier:', tier);
      return Response.json({ error: 'Invalid tier' }, { status: 400 });
    }
    
    console.log('Using plan ID:', planIds[tier]);

    const accessToken = await getPayPalAccessToken();

    // Verify plan status before creating subscription
    console.log('Verifying plan status...');
    const planCheckResponse = await fetch(`https://api-m.paypal.com/v1/billing/plans/${planIds[tier]}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    const planDetails = await planCheckResponse.json();
    console.log('Plan details from PayPal:', JSON.stringify(planDetails, null, 2));
    console.log('Plan status:', planDetails.status);

    if (planDetails.status !== 'ACTIVE') {
      console.error('Plan is not active! Current status:', planDetails.status);
      return Response.json({ 
        error: 'Plan is not active in PayPal', 
        plan_status: planDetails.status,
        plan_id: planIds[tier]
      }, { status: 400 });
    }
    
    const subscriptionPayload = {
      plan_id: planIds[tier],
      custom_id: organization_id,
      application_context: {
        brand_name: 'ScorekeeperAI',
        locale: 'en-AU',
        shipping_preference: 'NO_SHIPPING',
        user_action: 'SUBSCRIBE_NOW',
        return_url: `${new URL(req.url).origin}/SubscriptionSuccess`,
        cancel_url: `${new URL(req.url).origin}/SubscriptionCancelled`,
      },
    };
    
    console.log('Creating PayPal subscription with payload:', JSON.stringify(subscriptionPayload, null, 2));
    
    // Create PayPal subscription
    const subscriptionResponse = await fetch('https://api-m.paypal.com/v1/billing/subscriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(subscriptionPayload),
    });
    
    const subscription = await subscriptionResponse.json();
    
    if (!subscriptionResponse.ok) {
      console.error('=== PayPal API Error ===');
      console.error('Status:', subscriptionResponse.status);
      console.error('Error details:', JSON.stringify(subscription, null, 2));
      return Response.json({ 
        error: 'Failed to create subscription', 
        details: subscription,
        status: subscriptionResponse.status 
      }, { status: 500 });
    }
    
    console.log('Subscription created successfully:', subscription.id);
    
    // DO NOT upgrade tier here - only store subscription ID
    // Tier will be upgraded by webhook after payment confirmation
    await base44.asServiceRole.entities.Organization.update(organization_id, {
      paypal_subscription_id: subscription.id,
    });
    
    console.log('Organization updated with pending subscription ID (tier will upgrade after payment)');
    
    // Get approval URL
    const approvalLink = subscription.links.find(link => link.rel === 'approve');
    
    if (!approvalLink) {
      console.error('No approval link found in subscription response');
      console.error('Links:', JSON.stringify(subscription.links, null, 2));
      return Response.json({ error: 'No approval URL returned from PayPal' }, { status: 500 });
    }
    
    console.log('Approval URL:', approvalLink.href);
    console.log('=== Subscription creation complete ===');
    
    return Response.json({
      subscription_id: subscription.id,
      approval_url: approvalLink.href,
    });
    
  } catch (error) {
    console.error('=== Fatal Error ===');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});