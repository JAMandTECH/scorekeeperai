import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!(user.role === 'admin' || user.is_super_admin)) {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Preload players and games
    const [allPlayers, allGames] = await Promise.all([
      base44.asServiceRole.entities.Player.list(),
      base44.asServiceRole.entities.Game.list(),
    ]);

    const playerMap = new Map((allPlayers || []).map(p => [p.id, p]));

    // Build team -> games index for nearest-game search
    const teamToGames = new Map();
    for (const g of allGames || []) {
      const pushFor = (teamId) => {
        if (!teamId) return;
        const arr = teamToGames.get(teamId) || [];
        arr.push(g);
        teamToGames.set(teamId, arr);
      };
      pushFor(g.home_team_id);
      pushFor(g.away_team_id);
    }

    const findNearestGame = (teamId, refTs) => {
      const candidates = teamToGames.get(teamId) || [];
      if (!candidates.length) return null;
      let best = null;
      let bestDelta = Infinity;
      for (const c of candidates) {
        const cTs = new Date(c.game_date || c.created_date || Date.now()).getTime();
        const d = Math.abs(cTs - refTs);
        if (d < bestDelta) { bestDelta = d; best = c; }
      }
      // Only accept if within ~48h
      if (best && bestDelta <= 1000 * 60 * 60 * 48) return best;
      return null;
    };

    let statsProcessed = 0;
    let migratedFieldRecords = 0;
    let teamFixed = 0;
    let relinked = 0;

    // Process each game and its stats
    for (const g of allGames || []) {
      // Fetch up to 2000 stats per game (batches could be added if needed later)
      const stats = await base44.asServiceRole.entities.PlayerGameStats.filter({ game_id: g.id }, '-updated_date', 2000);
      for (const s of stats || []) {
        statsProcessed++;
        const patch = {};
        let changed = false;

        // Volleyball-only: migrate misused fields to proper volleyball fields
        if (g.sport === 'volleyball') {
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
        }

        // Ensure team_id is valid for this game; fix via player team when possible
        if (s.team_id !== g.home_team_id && s.team_id !== g.away_team_id) {
          const p = playerMap.get(s.player_id);
          if (p && (p.team_id === g.home_team_id || p.team_id === g.away_team_id)) {
            patch.team_id = p.team_id;
            changed = true;
            teamFixed++;
          } else {
            // As fallback, relink stat to nearest game for its recorded team_id
            const createdTs = new Date(s.created_date || g.game_date || Date.now()).getTime();
            const nearest = findNearestGame(s.team_id, createdTs);
            if (nearest && nearest.id !== s.game_id) {
              patch.game_id = nearest.id;
              changed = true;
              relinked++;
            }
          }
        }

        if (changed) {
          await base44.asServiceRole.entities.PlayerGameStats.update(s.id, patch);
          if ('attacks' in patch || 'aces' in patch || 'rally_errors' in patch) migratedFieldRecords++;
        }
      }
    }

    return Response.json({
      success: true,
      summary: {
        games_scanned: (allGames || []).length,
        stats_processed: statsProcessed,
        migrated_fields_records: migratedFieldRecords,
        team_fixed: teamFixed,
        relinked_records: relinked,
      }
    });
  } catch (error) {
    return Response.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
});