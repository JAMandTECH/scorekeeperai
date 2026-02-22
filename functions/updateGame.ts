import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { gameId, patch } = await req.json();
    if (!gameId || !patch || typeof patch !== 'object') {
      return Response.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // Load game using service role to evaluate permissions safely
    const games = await base44.asServiceRole.entities.Game.filter({ id: gameId });
    const game = games && games[0];
    if (!game) {
      return Response.json({ error: 'Game not found' }, { status: 404 });
    }

    const userEmail = (user.email || '').toLowerCase();
    const assigned = Array.isArray(game.assigned_scorekeeper_emails)
      ? game.assigned_scorekeeper_emails.map((e) => (e || '').toLowerCase())
      : [];
    const directAssigned = [
      game.overall_scorekeeper_email,
      game.home_statistician_email,
      game.away_statistician_email,
    ]
      .filter(Boolean)
      .map((e) => e.toLowerCase());

    const isAllowed =
      user.role === 'admin' ||
      assigned.includes(userEmail) ||
      directAssigned.includes(userEmail) ||
      user.is_scorekeeper === true; // optional custom flag on user

    if (!isAllowed) {
      return Response.json({ error: 'Forbidden: insufficient permissions' }, { status: 403 });
    }

    // Perform the update with elevated privileges
    const updated = await base44.asServiceRole.entities.Game.update(gameId, patch);

    return Response.json({ success: true, game: updated });
  } catch (error) {
    return Response.json({ error: error.message || String(error) }, { status: 500 });
  }
});