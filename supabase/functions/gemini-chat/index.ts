import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const authorization = req.headers.get('Authorization');
    if (!authorization) return json({ error: 'Missing authorization' }, 401);
    const url = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const supabase = createClient(url!, anonKey!, { global: { headers: { Authorization: authorization } } });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return json({ error: 'Unauthorized' }, 401);

    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) return json({ error: 'GEMINI_API_KEY not configured' }, 500);
    const body = await req.json();
    const prompt = body?.prompt ?? '';
    const system = body?.system ?? '';
    const responseSchema = body?.response_json_schema ?? null;
    const model = body?.model || 'gemini-1.5-flash';
    if (!prompt) return json({ error: 'Missing prompt' }, 400);

    const payload: any = {
      contents: [{ role: 'user', parts: [{ text: system ? `${system}\n\n${prompt}` : prompt }] }],
    };
    if (responseSchema) payload.generationConfig = { response_mime_type: 'application/json', response_schema: responseSchema };
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    });
    if (!response.ok) return json({ error: 'Gemini API error', details: await response.text() }, 502);
    const data = await response.json();
    const parts = data?.candidates?.[0]?.content?.parts || [];
    let output = parts.find((p: any) => p.text)?.text ?? null;
    if (responseSchema && typeof output === 'string') {
      try { output = JSON.parse(output); } catch (_) { /* keep raw text */ }
    }
    return json({ output });
  } catch (error) {
    console.error('gemini-chat error', error);
    return json({ error: error instanceof Error ? error.message : 'Internal error' }, 500);
  }
});
