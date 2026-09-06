import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

async function paypalAccessToken(clientId: string, clientSecret: string) {
  const response = await fetch('https://api-m.paypal.com/v1/oauth2/token', {
    method: 'POST', headers: { Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'grant_type=client_credentials',
  });
  if (!response.ok) throw new Error(`PayPal auth failed: ${await response.text()}`);
  const data = await response.json();
  return data.access_token as string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const authorization = req.headers.get('Authorization');
    if (!authorization) return json({ error: 'Missing authorization' }, 401);
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { global: { headers: { Authorization: authorization } }, auth: { autoRefreshToken: false, persistSession: false } });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return json({ error: 'Unauthorized' }, 401);

    const { organization_id } = await req.json();
    if (!organization_id) return json({ error: 'organization_id is required' }, 400);
    const { data: membership, error: membershipError } = await supabase.from('scorepilot_memberships').select('role').eq('organization_id', organization_id).eq('user_id', user.id).maybeSingle();
    if (membershipError) throw membershipError;
    if (!membership || !['admin', 'super_admin'].includes(String(membership.role || '').toLowerCase())) return json({ error: 'Admin access required' }, 403);

    const { data: org, error: orgError } = await supabase.from('scorepilot_organizations').select('id,paypal_subscription_id').eq('id', organization_id).maybeSingle();
    if (orgError) throw orgError;
    if (!org?.paypal_subscription_id) return json({ error: 'Organization not found or no active subscription' }, 403);

    const clientId = Deno.env.get('PAYPAL_CLIENT_ID');
    const clientSecret = Deno.env.get('PAYPAL_CLIENT_SECRET');
    if (!clientId || !clientSecret) return json({ error: 'PayPal credentials are not configured' }, 500);
    const token = await paypalAccessToken(clientId, clientSecret);
    const response = await fetch(`https://api-m.paypal.com/v1/billing/subscriptions/${org.paypal_subscription_id}/cancel`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ reason: 'User requested cancellation' }),
    });
    if (!response.ok) return json({ error: 'Failed to cancel subscription', details: await response.text() }, 502);

    const { error: updateError } = await supabase.from('scorepilot_organizations').update({ subscription_status: 'cancelled' }).eq('id', organization_id);
    if (updateError) throw updateError;
    return json({ success: true, message: 'Subscription cancelled successfully' });
  } catch (error) {
    console.error('paypal-cancel-subscription error', error);
    return json({ error: error instanceof Error ? error.message : 'Internal error' }, 500);
  }
});
