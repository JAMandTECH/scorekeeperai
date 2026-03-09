import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!(user.role === 'admin' || user.is_super_admin)) {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Fetch volleyball games (limit to a reasonable batch)
    const vballGames = await base44.asServiceRole.entities.Game.filter({ sport: 'volleyball' }, '-updated_date', 1000);
    const gameMap = new Map();
    const teamToGames = new Map();
    for (const g of vballGames || []) {
      gameMap.set(g.id, g);
      const pushFor = (teamId) => {
        if (!teamId) return;
        const arr = teamToGames.get(teamId) || [];
        arr.push(g);
        teamToGames.set(teamId, arr);
      };
      pushFor(g.home_team_id);
      pushFor(g.away_team_id);
    }

    let processed = 0;
    let migrated = 0;
    let relinked = 0;

    // Helper to find nearest game for a team
    const findNearestGame = (teamId, refTs) => {
      const candidates = teamToGames.get(teamId) || [];
      if (!candidates.length) return null;
      let best = null;
      let bestDelta = Infinity;
      for (const c of candidates) {
        const cTs = new Date(c.game_date || Date.now()).getTime();
        const d = Math.abs(cTs - refTs);
        if (d < bestDelta) { bestDelta = d; best = c; }
      }
      // Only accept if within ~48h
      if (best && bestDelta <= 1000 * 60 * 60 * 48) return best;
      return null;
    };

    for (const g of vballGames || []) {
      const stats = await base44.asServiceRole.entities.PlayerGameStats.filter({ game_id: g.id }, '-updated_date', 1000);
      for (const s of stats || []) {
        processed++;
        const patch = {};
        let changed = false;

        const attacks = Number(s.attacks || 0);
        const fgm = Number(s.field_goals_made || 0);
        if (fgm > 0 && attacks === 0) {
          patch.attacks = fgm;
          patch.field_goals_made = 0;
          changed = true;
        }

        const aces = Number(s.aces || 0);
        const threes = Number(s.aces === undefined ? (s.three_pointers || 0) : 0);
        if (threes > 0 && aces === 0) {
          patch.aces = threes;
          patch.three_pointers = 0;
          changed = true;
        }

        const rerr = Number(s.rally_errors || 0);
        const steals = Number(s.rally_errors === undefined ? (s.steals || 0) : 0);
        if (steals > 0 && rerr === 0) {
          patch.rally_errors = steals;
          patch.steals = 0;
          changed = true;
        }

        // Relink if team_id not in this game's teams
        if (s.team_id && !(s.team_id === g.home_team_id || s.team_id === g.away_team_id)) {
          const createdTs = new Date(s.created_date || g.game_date || Date.now()).getTime();
          const nearest = findNearestGame(s.team_id, createdTs);
          if (nearest && nearest.id !== s.game_id) {
            patch.game_id = nearest.id;
            changed = true;
          }
        }

        if (changed) {
          await base44.asServiceRole.entities.PlayerGameStats.update(s.id, patch);
          migrated += Number('attacks' in patch || 'aces' in patch || 'rally_errors' in patch);
          if ('game_id' in patch) relinked += 1;
        }
      }
    }

    return Response.json({ success: true, summary: { games_scanned: (vballGames||[]).length, stats_processed: processed, migrated_fields_records: migrated, relinked_records: relinked } });
  } catch (error) {
    return Response.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
});