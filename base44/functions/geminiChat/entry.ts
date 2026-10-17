import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { checkRateLimit } from '../../shared/rateLimit.ts';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const RATE_LIMIT = { maxCalls: 20, windowMs: 60 * 60 * 1000 }; // 20/hour per user
const DEFAULT_MODEL = 'gemini-1.5-flash';
// Allowlist of permitted models — prevents callers from selecting costly models.
const ALLOWED_MODELS = new Set(['gemini-1.5-flash', 'gemini-1.5-flash-8b']);
const MAX_PROMPT_CHARS = 8000;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!GEMINI_API_KEY) {
      return Response.json({ error: 'GEMINI_API_KEY not set' }, { status: 500 });
    }

    // Per-user rate limit — prevents uncontrolled API spending.
    const rl = checkRateLimit(user.id, 'geminiChat', RATE_LIMIT);
    if (!rl.allowed) {
      return Response.json({ error: 'Rate limit exceeded. Try again later.' }, { status: 429 });
    }

    const body = await req.json();
    const prompt = body?.prompt ?? '';
    const system = body?.system ?? '';
    const responseSchema = body?.response_json_schema ?? null;
    // Ignore client-supplied model unless it's in the allowlist of cheap models.
    const requestedModel = body?.model;
    const model = (typeof requestedModel === 'string' && ALLOWED_MODELS.has(requestedModel))
      ? requestedModel
      : DEFAULT_MODEL;

    if (!prompt) {
      return Response.json({ error: 'Missing prompt' }, { status: 400 });
    }
    if (prompt.length > MAX_PROMPT_CHARS) {
      return Response.json({ error: 'Prompt too long' }, { status: 400 });
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

    const userText = system ? `${system}\n\n${prompt}` : prompt;

    const payload = {
      contents: [
        {
          role: 'user',
          parts: [{ text: userText }],
        },
      ],
    };

    // If a JSON schema is provided, ask Gemini to respond as JSON
    if (responseSchema) {
      payload.generationConfig = {
        response_mime_type: 'application/json',
        response_schema: responseSchema,
      };
    }

    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!resp.ok) {
      const errTxt = await resp.text();
      console.error('Gemini API error:', resp.status, errTxt?.slice(0, 200));
      return Response.json({ error: 'Gemini API error' }, { status: 502 });
    }

    const data = await resp.json();
    const first = data?.candidates?.[0]?.content?.parts?.[0];
    let output = first?.text ?? first?.inlineData ?? null;

    if (!output && data?.candidates?.[0]?.content?.parts) {
      // Fallback: concatenate text parts if present
      const parts = data.candidates[0].content.parts;
      const texts = parts.map((p) => p.text).filter(Boolean);
      output = texts.join('\n');
    }

    // If schema requested, try to parse as JSON
    if (responseSchema && typeof output === 'string') {
      try {
        const parsed = JSON.parse(output);
        return Response.json({ output: parsed });
      } catch (_) {
        // Return raw text if not valid JSON
        return Response.json({ output });
      }
    }

    return Response.json({ output });
  } catch (error) {
    console.error('geminiChat error:', error?.message || error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
});