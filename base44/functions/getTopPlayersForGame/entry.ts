import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

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

    // Fetch stats for this game
    const stats = await base44.entities.PlayerGameStats.filter({ game_id: gameId });

    // Aggregate by player
    const agg = new Map();
    for (const s of stats) {
      const p = agg.get(s.player_id) || {
        player_id: s.player_id,
        team_id: s.team_id,
        points: 0, rebounds: 0, assists: 0, steals: 0, blocks: 0, three_pointers: 0,
        aces: 0, attacks: 0, rally_errors: 0,
      };

      // Derive basketball points from made shots to avoid any double-counted 'points' fields
      if (game.sport === 'basketball') {
        const three = s.three_pointers || 0;
        const fgm = s.field_goals_made || 0; // includes 2s and 3s
        const ftm = s.free_throws_made || 0;
        const twos = Math.max(0, fgm - three);
        const derived = twos * 2 + three * 3 + ftm;
        p.points += derived;
      } else {
        p.points += s.points || 0;
      }

      p.rebounds += s.rebounds || 0;
      p.assists += s.assists || 0;
      p.steals += s.steals || 0;
      p.blocks += s.blocks || 0;
      p.three_pointers += s.three_pointers || 0;
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

    // Fetch player details for the selected top players
    const playerDetails = await Promise.all(scored.map(async (p) => {
      const arr = await base44.entities.Player.filter({ id: p.player_id });
      const rec = arr?.[0];
      return {
        ...p,
        first_name: rec?.first_name || '',
        last_name: rec?.last_name || '',
        jersey_number: rec?.jersey_number || '',
        photo_url: rec?.photo_url || '',
      };
    }));

    // Teams info
    const [homeTeamArr, awayTeamArr] = await Promise.all([
      base44.entities.Team.filter({ id: game.home_team_id }),
      base44.entities.Team.filter({ id: game.away_team_id })
    ]);

    const result = {
      game: {
        id: game.id,
        organization_id: game.organization_id,
        sport: game.sport,
        division: game.division || '',
        game_date: game.game_date,
        location: game.location || '',
        home_team_id: game.home_team_id,
        away_team_id: game.away_team_id,
        home_team_name: homeTeamArr?.[0]?.name || 'Home',
        away_team_name: awayTeamArr?.[0]?.name || 'Away',
      },
      topPlayers: playerDetails,
    };

    return Response.json(result, { status: 200 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});