import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const ACTION_PROMPTS: Record<string, string> = {
  // Basketball
  shooting: 'shooting a jump shot, arms extended upward releasing the basketball, perfect mid-air jump shot form',
  guarding: 'in a low defensive stance, arms spread wide, intensely guarding the opponent',
  dribbling: 'dribbling the basketball low to the ground, crouched running position, eyes up',
  celebrating: 'celebrating after a big play, fist pump, arms raised, triumphant joyful expression',
  blocking: 'blocking a shot, arms extended fully upward, leaping to swat the ball away',
  dunking: 'dunking the basketball, mid-air slamming the ball through the hoop with authority',
  driving: 'driving to the basket with an explosive first step, attacking the rim aggressively',
  layup: 'doing a layup, extending toward the basket for a finger roll layup',
  assisting: 'passing the basketball with court vision, delivering a crisp pass',
  // Volleyball
  spiking: 'spiking the volleyball, mid-air arm swing slamming the ball down over the net',
  setting: 'setting the volleyball, hands above head delivering an overhead set',
  serving: 'serving the volleyball, toss and overhead serve motion, athletic stance',
  digging: 'digging the volleyball, diving low to pass the ball, defensive floor move',
};

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, chunk);
  }
  return btoa(binary);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });

    const body = await req.json();
    const { playerImageUrl, action, sport, faceSwap } = body || {};
    if (!playerImageUrl) return Response.json({ error: 'playerImageUrl is required' }, { status: 400 });
    if (!action || !ACTION_PROMPTS[action]) return Response.json({ error: 'A valid action is required' }, { status: 400 });

    const sportLabel = sport === 'volleyball' ? 'volleyball' : 'basketball';
    const actionDesc = ACTION_PROMPTS[action];

    const prompt = [
      `Photorealistic professional ${sportLabel} sports photography of the exact same athlete shown in the reference photo.`,
      `The athlete is ${actionDesc}.`,
      `CRITICAL: Maintain the exact same facial features, face structure, skin tone, and hair as the reference photo.`,
      `JERSEY: Copy the jersey EXACTLY from the reference photo—same colors, design, font, numbers, and team name text as they appear in the reference.`,
      `CRITICAL: Do NOT invent, change, or alter any jersey numbers or team name text. Reproduce them exactly as shown in the reference photo.`,
      `COMPOSITION: FULL-BODY shot from head to toe—capture the entire athlete including the top of the head and the bottom of the shoes, nothing cropped or cut off.`,
      `Frame the athlete centered with the full body visible: head near the top edge and feet/shoes near the bottom edge, with a small margin so no body parts are clipped.`,
      `Clean solid dark background, studio backdrop, easy to cut out, no stadium, no crowd, no complex scenery behind the athlete.`,
      `Dynamic action pose, dramatic professional lighting on the athlete, sharp focus, professional sports magazine quality, no text or watermarks.`,
    ].join(' ');

    const gen = await base44.integrations.Core.GenerateImage({
      prompt,
      existing_image_urls: [playerImageUrl],
    });

    const actionImageUrl = gen?.url;
    if (!actionImageUrl) return Response.json({ error: 'Image generation returned no URL' }, { status: 500 });

    // Face swap step: swap the original player's face onto the generated action image
    // Using Replicate's cdingram/face-swap model (~$0.012/run)
    if (faceSwap) {
      const replicateToken = Deno.env.get('REPLICATE_API_TOKEN');
      if (replicateToken) {
        try {
          const FACE_SWAP_VERSION = 'd1d6ea8c8be89d664a07a457526f7128109dee7030fdac424788d762c71ed111';

          const createResp = await fetch('https://api.replicate.com/v1/predictions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${replicateToken}`,
              'Content-Type': 'application/json',
              'Prefer': 'wait',
            },
            body: JSON.stringify({
              version: FACE_SWAP_VERSION,
              input: {
                swap_image: playerImageUrl,
                input_image: actionImageUrl,
              },
            }),
          });

          if (createResp.ok) {
            let result = await createResp.json();

            // Poll if prediction didn't complete synchronously
            if (result.status !== 'succeeded' && result.status !== 'failed') {
              const pollUrl = result.urls?.get;
              for (let i = 0; i < 30 && pollUrl; i++) {
                await new Promise((r) => setTimeout(r, 2000));
                const pollResp = await fetch(pollUrl, {
                  headers: { 'Authorization': `Bearer ${replicateToken}` },
                });
                result = await pollResp.json();
                if (result.status === 'succeeded' || result.status === 'failed') break;
              }
            }

            if (result.status === 'succeeded' && result.output) {
              const outputUrl = typeof result.output === 'string' ? result.output : result.output[0];
              // Fetch and convert to base64 to avoid canvas CORS/tainting issues
              const imgResp = await fetch(outputUrl);
              if (imgResp.ok) {
                const arrayBuf = await imgResp.arrayBuffer();
                const bytes = new Uint8Array(arrayBuf);
                const contentType = imgResp.headers.get('content-type') || 'image/png';
                const mime = contentType.includes('jpeg') ? 'image/jpeg' : 'image/png';
                const base64 = bytesToBase64(bytes);
                const dataUrl = `data:${mime};base64,${base64}`;
                return Response.json({ url: dataUrl, faceSwapped: true }, { status: 200 });
              }
            } else if (result.status === 'failed') {
              console.error('Replicate face swap failed', result.error);
            }
          } else {
            const errText = await createResp.text();
            console.error('Replicate face swap error', createResp.status, errText);
          }
        } catch (swapErr) {
          console.error('Replicate face swap exception', swapErr);
        }
      } else {
        console.warn('Face swap requested but REPLICATE_API_TOKEN not configured');
      }
    }

    return Response.json({ url: actionImageUrl, faceSwapped: false }, { status: 200 });
  } catch (error) {
    console.error('generatePlayerAction error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});