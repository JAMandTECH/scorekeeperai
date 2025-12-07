import { createClient } from 'npm:@base44/sdk@0.8.4';

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

async function verifyWebhookSignature(req, body) {
  const webhookId = Deno.env.get("PAYPAL_WEBHOOK_ID");
  const accessToken = await getPayPalAccessToken();
  
  const verificationData = {
    transmission_id: req.headers.get('paypal-transmission-id'),
    transmission_time: req.headers.get('paypal-transmission-time'),
    cert_url: req.headers.get('paypal-cert-url'),
    auth_algo: req.headers.get('paypal-auth-algo'),
    transmission_sig: req.headers.get('paypal-transmission-sig'),
    webhook_id: webhookId,
    webhook_event: body,
  };
  
  const response = await fetch('https://api-m.paypal.com/v1/notifications/verify-webhook-signature', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(verificationData),
  });
  
  const result = await response.json();
  return result.verification_status === 'SUCCESS';
}

Deno.serve(async (req) => {
  try {
    // For webhooks, we need to use createClient with service role, not createClientFromRequest
    // because PayPal webhooks don't include Base44 headers
    const base44 = createClient({
      appId: Deno.env.get("BASE44_APP_ID"),
      serviceRoleKey: Deno.env.get("BASE44_SERVICE_ROLE_KEY"),
    });
    
    const body = await req.json();
    
    console.log('PayPal webhook received:', body.event_type);
    
    // Verify webhook signature
    const isValid = await verifyWebhookSignature(req, body);
    if (!isValid) {
      console.error('Invalid webhook signature');
      return Response.json({ error: 'Invalid signature' }, { status: 401 });
    }
    
    const eventType = body.event_type;
    const resource = body.resource;
    const organizationId = resource.custom_id;
    
    if (!organizationId) {
      console.error('No organization ID in webhook payload');
      return Response.json({ error: 'No organization ID' }, { status: 400 });
    }
    
    console.log(`Processing webhook: ${eventType} for org: ${organizationId}`);
    
    // Get the plan ID from the subscription to determine tier
    const planId = resource.plan_id;
    let tier = null;
    
    // Map plan IDs to tiers
    if (planId === 'P-9TX62969RS691692LNE2Q3NI') {
      tier = 'basic';
    } else if (planId === 'P-5S98478109670745ANE2QZKQ') {
      tier = 'premium';
    }
    
    // Handle different webhook events
    switch (eventType) {
      case 'BILLING.SUBSCRIPTION.ACTIVATED':
        // Subscription activated after payment - NOW upgrade the tier
        const updateData = {
          subscription_status: 'active',
          paypal_subscription_id: resource.id,
        };
        
        if (tier) {
          updateData.subscription_tier = tier;
          console.log(`Upgrading organization to ${tier} tier`);
        }
        
        await base44.entities.Organization.update(organizationId, updateData);
        console.log(`Subscription activated for org: ${organizationId}`);
        break;
        
      case 'BILLING.SUBSCRIPTION.CANCELLED':
      case 'BILLING.SUBSCRIPTION.SUSPENDED':
      case 'BILLING.SUBSCRIPTION.EXPIRED':
        // Subscription cancelled/suspended/expired - downgrade to free
        await base44.entities.Organization.update(organizationId, {
          subscription_status: 'cancelled',
          subscription_tier: 'free',
        });
        console.log(`Subscription cancelled for org: ${organizationId}`);
        break;
        
      case 'BILLING.SUBSCRIPTION.PAYMENT.FAILED':
        // Payment failed - mark as expired
        await base44.entities.Organization.update(organizationId, {
          subscription_status: 'expired',
        });
        console.log(`Payment failed for org: ${organizationId}`);
        break;
        
      case 'BILLING.SUBSCRIPTION.RENEWED':
      case 'PAYMENT.SALE.COMPLETED':
        // Payment successful - ensure active status
        await base44.entities.Organization.update(organizationId, {
          subscription_status: 'active',
        });
        console.log(`Payment completed for org: ${organizationId}`);
        break;
        
      default:
        console.log(`Unhandled webhook event: ${eventType}`);
    }
    
    return Response.json({ received: true });
    
  } catch (error) {
    console.error('Webhook processing error:', error);
    console.error('Error stack:', error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});