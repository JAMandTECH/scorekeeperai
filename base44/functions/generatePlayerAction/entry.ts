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
    const { playerImageUrl, action, sport, jerseyNumber, teamName, faceSwap } = body || {};
    if (!playerImageUrl) return Response.json({ error: 'playerImageUrl is required' }, { status: 400 });
    if (!action || !ACTION_PROMPTS[action]) return Response.json({ error: 'A valid action is required' }, { status: 400 });

    const sportLabel = sport === 'volleyball' ? 'volleyball' : 'basketball';
    const actionDesc = ACTION_PROMPTS[action];
    const jerseyHint = jerseyNumber ? `wearing jersey #${jerseyNumber}` : 'wearing the team jersey';
    const teamHint = teamName ? `for team ${teamName}` : '';

    const prompt = [
      `Photorealistic professional ${sportLabel} sports photography of the exact same athlete shown in the reference photo.`,
      `The athlete is ${actionDesc}.`,
      `CRITICAL: Maintain the exact same facial features, face structure, skin tone, and hair as the reference photo.`,
      `The athlete is ${jerseyHint} ${teamHint}—keep the jersey design, colors, and number identical to the reference.`,
      `Dynamic full-body action pose, stadium arena background with dramatic professional lighting.`,
      `Ultra-detailed, sharp focus, professional sports magazine quality, no text or watermarks.`,
    ].join(' ');

    const gen = await base44.integrations.Core.GenerateImage({
      prompt,
      existing_image_urls: [playerImageUrl],
    });

    const actionImageUrl = gen?.url;
    if (!actionImageUrl) return Response.json({ error: 'Image generation returned no URL' }, { status: 500 });

    // Face swap step: swap the original player's face onto the generated action image
    if (faceSwap) {
      const segmindKey = Deno.env.get('SEGMIND_API_KEY');
      if (segmindKey) {
        try {
          const swapResp = await fetch('https://api.segmind.com/v1/faceswap-v2', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${segmindKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              source_img: playerImageUrl,
              target_img: actionImageUrl,
              face_restore: 'codeformer-v0.1.0.pth',
              input_faces_index: '0',
              source_faces_index: '0',
              base64: false,
            }),
          });

          if (swapResp.ok) {
            const arrayBuf = await swapResp.arrayBuffer();
            const bytes = new Uint8Array(arrayBuf);
            const contentType = swapResp.headers.get('content-type') || 'image/png';
            const mime = contentType.includes('jpeg') ? 'image/jpeg' : 'image/png';
            const base64 = bytesToBase64(bytes);
            const dataUrl = `data:${mime};base64,${base64}`;
            return Response.json({ url: dataUrl, faceSwapped: true }, { status: 200 });
          } else {
            const errText = await swapResp.text();
            console.error('Segmind face swap error', swapResp.status, errText);
            // Fall through to return the non-swapped image
          }
        } catch (swapErr) {
          console.error('Segmind face swap exception', swapErr);
          // Fall through to return the non-swapped image
        }
      } else {
        console.warn('Face swap requested but SEGMIND_API_KEY not configured');
      }
    }

    return Response.json({ url: actionImageUrl, faceSwapped: false }, { status: 200 });
  } catch (error) {
    console.error('generatePlayerAction error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});