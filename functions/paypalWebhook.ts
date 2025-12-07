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
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    
    // Verify webhook signature
    const isValid = await verifyWebhookSignature(req, body);
    if (!isValid) {
      console.error('Invalid webhook signature');
      return Response.json({ error: 'Invalid signature' }, { status: 401 });
    }
    
    const eventType = body.event_type;
    const resource = body.resource;
    const organizationId = resource.custom_id;
    
    console.log(`PayPal webhook received: ${eventType} for org: ${organizationId}`);
    
    // Handle different webhook events
    switch (eventType) {
      case 'BILLING.SUBSCRIPTION.ACTIVATED':
        // Subscription activated - set status to active
        await base44.asServiceRole.entities.Organization.update(organizationId, {
          subscription_status: 'active',
          paypal_subscription_id: resource.id,
        });
        console.log(`Subscription activated for org: ${organizationId}`);
        break;
        
      case 'BILLING.SUBSCRIPTION.CANCELLED':
      case 'BILLING.SUBSCRIPTION.SUSPENDED':
      case 'BILLING.SUBSCRIPTION.EXPIRED':
        // Subscription cancelled/suspended/expired
        await base44.asServiceRole.entities.Organization.update(organizationId, {
          subscription_status: 'cancelled',
        });
        console.log(`Subscription cancelled for org: ${organizationId}`);
        break;
        
      case 'BILLING.SUBSCRIPTION.PAYMENT.FAILED':
        // Payment failed - send notification
        await base44.asServiceRole.entities.Organization.update(organizationId, {
          subscription_status: 'expired',
        });
        console.log(`Payment failed for org: ${organizationId}`);
        break;
        
      case 'BILLING.SUBSCRIPTION.RENEWED':
      case 'PAYMENT.SALE.COMPLETED':
        // Payment successful - ensure active status
        await base44.asServiceRole.entities.Organization.update(organizationId, {
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
    return Response.json({ error: error.message }, { status: 500 });
  }
});