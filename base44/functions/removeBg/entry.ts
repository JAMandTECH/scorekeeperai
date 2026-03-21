Deno.serve(async (req) => {
  try {
    // Public app support: no auth required to use this helper
    const { imageUrl } = await req.json();
    if (!imageUrl) {
      return Response.json({ error: 'imageUrl is required' }, { status: 400 });
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

    const resp = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: { 'X-Api-Key': apiKey },
      body: form,
    });

    if (!resp.ok) {
      const text = await resp.text();
      console.error('remove.bg error', resp.status, text);
      return Response.json({ error: 'Background removal failed', details: text }, { status: 500 });
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
    console.error('removeBg exception', err);
    return Response.json({ error: err.message || 'Unknown error' }, { status: 500 });
  }
});