import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    // Auth is optional for this public read endpoint
    try { await base44.auth.me(); } catch (_) {}

    const { game_id, game_ids } = await req.json().catch(() => ({}));

    if (!game_id && (!Array.isArray(game_ids) || game_ids.length === 0)) {
      return Response.json({ error: 'Missing game_id or game_ids' }, { status: 400 });
    }

    let stats = [];

    if (game_id) {
      stats = await base44.asServiceRole.entities.PlayerGameStats.filter({ game_id });
    } else if (Array.isArray(game_ids)) {
      // Fetch per game to respect API filter semantics; aggregate results
      const results = await Promise.all(
        game_ids.map((id) => base44.asServiceRole.entities.PlayerGameStats.filter({ game_id: id }))
      );
      stats = results.flat();
    }

    return Response.json(stats, { status: 200 });
  } catch (error) {
    return Response.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
});