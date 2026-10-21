import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import { isSuperAdmin, resolveCallerOrg } from '../../shared/orgAuth.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const gameId = body?.gameId;
    const topN = Math.min(Math.max(body?.topN || 5, 1), 10);

    if (!gameId) {
      return Response.json({ error: 'gameId is required' }, { status: 400 });
    }

    // Fetch game details
    const games = await base44.entities.Game.filter({ id: gameId });
    const game = games?.[0];
    if (!game) {
      return Response.json({ error: 'Game not found' }, { status: 404 });
    }

    // Verify the game belongs to the caller's organization (super admins bypass).
    const callerOrg = resolveCallerOrg(user);
    if (!isSuperAdmin(user) && game.organization_id !== callerOrg) {
      return Response.json({ error: 'Forbidden: game does not belong to your organization' }, { status: 403 });
    }

    // Fetch stats for this game
    const stats = await base44.entities.PlayerGameStats.filter({ game_id: gameId });

    // Aggregate by player
    const agg = new Map();
    for (const s of stats) {
      const p = agg.get(s.player_id) || {
        player_id: s.player_id,
        team_id: s.team_id,
        points: 0, rebounds: 0, assists: 0, steals: 0, blocks: 0, three_pointers: 0,
        field_goals_made: 0, free_throws_made: 0,
        aces: 0, attacks: 0, rally_errors: 0,
      };

      // Use recorded points from the stat to match other totals exactly
      p.points += s.points || 0;

      p.rebounds += s.rebounds || 0;
      p.assists += s.assists || 0;
      p.steals += s.steals || 0;
      p.blocks += s.blocks || 0;
      p.three_pointers += s.three_pointers || 0;
      p.field_goals_made += s.field_goals_made || 0;
      p.free_throws_made += s.free_throws_made || 0;
      p.aces += s.aces || 0;
      p.attacks += s.attacks || 0;
      p.rally_errors += s.rally_errors || 0;
      agg.set(s.player_id, p);
    }

    // Score players based on sport
    const scored = Array.from(agg.values()).map((p) => {
      let score = 0;
      if (game.sport === 'basketball') {
        score = (p.points || 0) * 1.0 + (p.rebounds || 0) * 0.7 + (p.assists || 0) * 0.7 + (p.steals || 0) * 0.5 + (p.blocks || 0) * 0.5 + (p.three_pointers || 0) * 0.4;
      } else if (game.sport === 'volleyball') {
        score = (p.attacks || 0) * 1.0 + (p.blocks || 0) * 0.7 + (p.aces || 0) * 0.5 - (p.rally_errors || 0) * 0.2;
      } else {
        score = (p.points || 0);
      }
      return { ...p, score };
    }).sort((a, b) => b.score - a.score).slice(0, topN);

    // Fetch player details for the selected top players — one batched query
    const playerIds = scored.map((p) => p.player_id).filter(Boolean);
    const playerRecs = playerIds.length
      ? await base44.entities.Player.filter({ id: { $in: playerIds } })
      : [];
    const playerById = new Map((playerRecs || []).map((r) => [r.id, r]));
    const playerDetails = scored.map((p) => {
      const rec = playerById.get(p.player_id);
      return {
        ...p,
        first_name: rec?.first_name || '',
        last_name: rec?.last_name || '',
        jersey_number: rec?.jersey_number || '',
        photo_url: rec?.photo_url || '',
      };
    });

    // Teams info — one batched query
    const teamIds = [game.home_team_id, game.away_team_id].filter(Boolean);
    const teamRecs = teamIds.length
      ? await base44.entities.Team.filter({ id: { $in: teamIds } })
      : [];
    const teamById = new Map((teamRecs || []).map((t) => [t.id, t]));

    // Fetch organization via service role to bypass RLS (user token may not resolve user.data fields)
    let organization = null;
    if (game.organization_id) {
      try {
        organization = await base44.asServiceRole.entities.Organization.get(game.organization_id);
      } catch (_) { /* org may not exist or be inaccessible; leave null */ }
    }

    const result = {
      organization: organization ? {
        id: organization.id,
        name: organization.name || '',
        tournament_name: organization.tournament_name || '',
        logo_url: organization.logo_url || '',
      } : null,
      game: {
        id: game.id,
        organization_id: game.organization_id,
        sport: game.sport,
        division: game.division || '',
        game_date: game.game_date,
        location: game.location || '',
        home_team_id: game.home_team_id,
        away_team_id: game.away_team_id,
        home_team_name: teamById.get(game.home_team_id)?.name || 'Home',
        away_team_name: teamById.get(game.away_team_id)?.name || 'Away',
      },
      topPlayers: playerDetails,
    };

    return Response.json(result, { status: 200 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});