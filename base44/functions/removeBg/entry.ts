import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';
import { isSuperAdmin } from '../../shared/orgAuth.ts';
import { checkRateLimit } from '../../shared/rateLimit.ts';

const RATE_LIMIT = { maxCalls: 10, windowMs: 60 * 60 * 1000 }; // 10/hour per user
const ALLOWED_IMAGE_ORIGINS = ['https://media.base44.com', 'https://base44.app'];

function isValidImageOrigin(url: string): boolean {
  if (!url) return false;
  if (url.startsWith('data:image/')) return true;
  try {
    const parsed = new URL(url);
    return ALLOWED_IMAGE_ORIGINS.some((origin) => parsed.origin === origin);
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  try {
    // Require authentication to prevent anonymous credit drain.
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { imageUrl } = await req.json();
    if (!imageUrl) {
      return Response.json({ error: 'imageUrl is required' }, { status: 400 });
    }

    // Validate image URL origin — restrict to app's storage origins.
    if (!isValidImageOrigin(imageUrl)) {
      return Response.json({ error: 'Image URL must originate from the app storage' }, { status: 400 });
    }

    // Per-user rate limit — prevents uncontrolled API spending.
    const rl = checkRateLimit(user.id, 'removeBg', RATE_LIMIT);
    if (!rl.allowed) {
      return Response.json({ error: 'Rate limit exceeded. Try again later.' }, { status: 429 });
    }

    const apiKey = Deno.env.get('REMOVEBG_API_KEY');
    if (!apiKey) {
      return Response.json({ error: 'Remove.bg API key not configured' }, { status: 500 });
    }

    const form = new FormData();
    form.append('image_url', imageUrl);
    form.append('size', 'auto');
    form.append('format', 'png');
    form.append('type', 'auto');
    // Enable tight subject cropping
    form.append('crop', 'true');
    form.append('crop_margin', '0');

    const resp = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: { 'X-Api-Key': apiKey },
      body: form,
    });

    if (!resp.ok) {
      const text = await resp.text();
      console.error('remove.bg error', resp.status, text?.slice(0, 200));
      return Response.json({ error: 'Background removal failed' }, { status: resp.status });
    }

    const arrayBuf = await resp.arrayBuffer();
    const base64 = (() => {
      const bytes = new Uint8Array(arrayBuf);
      let binary = '';
      const chunkSize = 0x8000; // avoid call stack overflow
      for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.subarray(i, i + chunkSize);
        binary += String.fromCharCode.apply(null, chunk);
      }
      return btoa(binary);
    })();
    const dataUrl = `data:image/png;base64,${base64}`;

    return Response.json({ dataUrl });
  } catch (err) {
    console.error('removeBg exception', err?.message || err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
});