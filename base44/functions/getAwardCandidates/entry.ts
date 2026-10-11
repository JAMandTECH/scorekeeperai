import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

// getAwardCandidates
// Returns award candidate lists for an organization's active season:
//   - Season MVP   : all players, ranked by composite season score
//   - Finals MVP   : players from finals games (game_type 'finals'), ranked by composite finals score
//   - Mythical 5/6 : all eligible players (basketball -> 5, volleyball -> 6), full candidate pool
//                    with a suggested lineup (top N by score) clearly separated.
// No fixed candidate-count cap — every eligible player is returned. The frontend filters
// by division / sport. Runs as service role so super admins can inspect any org.

const FINALS_TYPES = new Set(['finals']);

// Sport-aware points computation (mirrors Statistics.jsx / getGamePlayerStats)
function gamePoints(stat, sport) {
  if (sport === 'volleyball') {
    return (Number(stat.aces) || 0) + (Number(stat.attacks) || 0) + (Number(stat.blocks) || 0);
  }
  const stored = Number(stat.points) || 0;
  if (stored > 0) return stored;
  const threes = Number(stat.three_pointers) || 0;
  const fgm = Number(stat.field_goals_made) || 0;
  const twos = Math.max(fgm - threes, 0);
  const ftm = Number(stat.free_throws_made) || 0;
  return twos * 2 + threes * 3 + ftm;
}

// Composite "MVP" score — weighted all-around contribution.
function compositeScore(totals, sport) {
  if (sport === 'volleyball') {
    return (
      (totals.points || 0) +
      (totals.aces || 0) * 1.5 +
      (totals.attacks || 0) * 1.0 +
      (totals.blocks || 0) * 1.5
    );
  }
  // basketball
  return (
    (totals.points || 0) +
    (totals.rebounds || 0) * 1.2 +
    (totals.assists || 0) * 1.5 +
    (totals.steals || 0) * 2 +
    (totals.blocks || 0) * 2 +
    (totals.three_pointers || 0) * 1
  );
}

function emptyTotals() {
  return {
    games: new Set(),
    points: 0, rebounds: 0, assists: 0, steals: 0, blocks: 0, fouls: 0,
    three_pointers: 0, field_goals_made: 0, field_goals_attempted: 0,
    free_throws_made: 0, free_throws_attempted: 0,
    aces: 0, attacks: 0, rally_errors: 0,
  };
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden — admins only' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const organization_id =
      body?.organization_id ||
      user.active_organization_id ||
      user.organization_id ||
      user.data?.active_organization_id ||
      user.data?.organization_id;
    if (!organization_id) {
      return Response.json({ error: 'No organization context' }, { status: 400 });
    }

    const sr = base44.asServiceRole;

    // Fetch teams, players, games in parallel
    const [teams, games] = await Promise.all([
      sr.entities.Team.filter({ organization_id }, undefined, 2000),
      sr.entities.Game.filter({ organization_id }, '-game_date', 2000),
    ]);

    const teamById = new Map((teams || []).map((t) => [t.id, t]));
    const teamIds = [...teamById.keys()];

    // Fetch players by team (chunked)
    let players = [];
    if (teamIds.length) {
      const out = [];
      for (let i = 0; i < teamIds.length; i += 50) {
        const chunk = teamIds.slice(i, i + 50);
        try {
          const part = await sr.entities.Player.filter({ team_id: { $in: chunk } }, '-created_date', 2000);
          out.push(...part);
        } catch (_) {
          const per = await Promise.all(
            chunk.map((id) => sr.entities.Player.filter({ team_id: id }, '-created_date', 2000).catch(() => []))
          );
          out.push(...per.flat());
        }
      }
      players = out;
    }
    const playerById = new Map((players || []).map((p) => [p.id, p]));

    // Completed games only
    const completedGames = (games || []).filter((g) => g.status === 'completed');
    const completedGameIds = completedGames.map((g) => g.id).filter(Boolean);
    const gameById = new Map(completedGames.map((g) => [g.id, g]));
    const finalsGameIds = new Set(
      completedGames.filter((g) => FINALS_TYPES.has(g.game_type)).map((g) => g.id)
    );

    // Fetch player game stats in chunks
    let playerGameStats = [];
    if (completedGameIds.length) {
      const out = [];
      for (let i = 0; i < completedGameIds.length; i += 10) {
        const chunk = completedGameIds.slice(i, i + 10);
        try {
          const part = await sr.entities.PlayerGameStats.filter({ game_id: { $in: chunk } }, undefined, 2000);
          out.push(...part);
        } catch (_) {
          const per = await Promise.all(
            chunk.map((id) => sr.entities.PlayerGameStats.filter({ game_id: id }, undefined, 2000).catch(() => []))
          );
          out.push(...per.flat());
        }
      }
      playerGameStats = out;
    }

    // Aggregate per player: season totals (all completed) + finals totals
    const seasonMap = new Map(); // player_id -> totals
    const finalsMap = new Map();

    for (const s of playerGameStats) {
      if (!s.player_id || !s.game_id) continue;
      const game = gameById.get(s.game_id);
      if (!game) continue;
      const team = teamById.get(s.team_id);
      const sport = team?.sport || game.sport;

      // Season totals
      let seas = seasonMap.get(s.player_id);
      if (!seas) { seas = emptyTotals(); seasonMap.set(s.player_id, seas); }
      seas.games.add(s.game_id);
      seas.points += gamePoints(s, sport);
      seas.rebounds += Number(s.rebounds) || 0;
      seas.assists += Number(s.assists) || 0;
      seas.steals += Number(s.steals) || 0;
      seas.blocks += Number(s.blocks) || 0;
      seas.fouls += Number(s.fouls) || 0;
      seas.three_pointers += Number(s.three_pointers) || 0;
      seas.field_goals_made += Number(s.field_goals_made) || 0;
      seas.field_goals_attempted += Number(s.field_goals_attempted) || 0;
      seas.free_throws_made += Number(s.free_throws_made) || 0;
      seas.free_throws_attempted += Number(s.free_throws_attempted) || 0;
      seas.aces += Number(s.aces) || 0;
      seas.attacks += Number(s.attacks) || 0;
      seas.rally_errors += Number(s.rally_errors) || 0;

      // Finals totals
      if (finalsGameIds.has(s.game_id)) {
        let fin = finalsMap.get(s.player_id);
        if (!fin) { fin = emptyTotals(); finalsMap.set(s.player_id, fin); }
        fin.games.add(s.game_id);
        fin.points += gamePoints(s, sport);
        fin.rebounds += Number(s.rebounds) || 0;
        fin.assists += Number(s.assists) || 0;
        fin.steals += Number(s.steals) || 0;
        fin.blocks += Number(s.blocks) || 0;
        fin.fouls += Number(s.fouls) || 0;
        fin.three_pointers += Number(s.three_pointers) || 0;
        fin.field_goals_made += Number(s.field_goals_made) || 0;
        fin.field_goals_attempted += Number(s.field_goals_attempted) || 0;
        fin.free_throws_made += Number(s.free_throws_made) || 0;
        fin.free_throws_attempted += Number(s.free_throws_attempted) || 0;
        fin.aces += Number(s.aces) || 0;
        fin.attacks += Number(s.attacks) || 0;
        fin.rally_errors += Number(s.rally_errors) || 0;
      }
    }

    // Build candidate records
    const divisionsSet = new Set();
    const sportsSet = new Set();
    const candidates = [];

    for (const [playerId, seasTotals] of seasonMap) {
      const player = playerById.get(playerId);
      const team = player ? teamById.get(player.team_id) : null;
      const sport = team?.sport || 'basketball';
      const division = team?.division || 'No Division';
      divisionsSet.add(division);
      sportsSet.add(sport);

      const seas = {
        gamesPlayed: seasTotals.games.size,
        points: seasTotals.points,
        rebounds: seasTotals.rebounds,
        assists: seasTotals.assists,
        steals: seasTotals.steals,
        blocks: seasTotals.blocks,
        fouls: seasTotals.fouls,
        three_pointers: seasTotals.three_pointers,
        aces: seasTotals.aces,
        attacks: seasTotals.attacks,
        rally_errors: seasTotals.rally_errors,
        fg_pct: seasTotals.field_goals_attempted > 0
          ? Math.round((seasTotals.field_goals_made / seasTotals.field_goals_attempted) * 1000) / 10
          : 0,
        ft_pct: seasTotals.free_throws_attempted > 0
          ? Math.round((seasTotals.free_throws_made / seasTotals.free_throws_attempted) * 1000) / 10
          : 0,
      };
      const seasonScore = Math.round(compositeScore({
        points: seasTotals.points, rebounds: seasTotals.rebounds, assists: seasTotals.assists,
        steals: seasTotals.steals, blocks: seasTotals.blocks, three_pointers: seasTotals.three_pointers,
        aces: seasTotals.aces, attacks: seasTotals.attacks,
      }, sport));

      const finTotals = finalsMap.get(playerId);
      let finals = null;
      let finalsScore = 0;
      if (finTotals && finTotals.games.size > 0) {
        finals = {
          gamesPlayed: finTotals.games.size,
          points: finTotals.points,
          rebounds: finTotals.rebounds,
          assists: finTotals.assists,
          steals: finTotals.steals,
          blocks: finTotals.blocks,
          fouls: finTotals.fouls,
          three_pointers: finTotals.three_pointers,
          aces: finTotals.aces,
          attacks: finTotals.attacks,
          rally_errors: finTotals.rally_errors,
        };
        finalsScore = Math.round(compositeScore({
          points: finTotals.points, rebounds: finTotals.rebounds, assists: finTotals.assists,
          steals: finTotals.steals, blocks: finTotals.blocks, three_pointers: finTotals.three_pointers,
          aces: finTotals.aces, attacks: finTotals.attacks,
        }, sport));
      }

      candidates.push({
        player_id: playerId,
        player_name: player ? `${player.first_name} ${player.last_name}` : `Player ${String(playerId).slice(-4)}`,
        jersey_number: player?.jersey_number || '',
        photo_url: player?.photo_url || '',
        team_id: player?.team_id || '',
        team_name: team?.name || 'Unknown',
        team_logo_url: team?.logo_url || '',
        sport,
        division,
        season_stats: seas,
        season_score: seasonScore,
        finals_stats: finals,
        finals_score: finalsScore,
      });
    }

    // Sort by season score descending (default ordering)
    candidates.sort((a, b) => b.season_score - a.season_score);

    return Response.json({
      organization_id,
      candidates,
      divisions: [...divisionsSet].sort(),
      sports: [...sportsSet].sort(),
      finals_games_count: finalsGameIds.size,
    });
  } catch (error) {
    console.error('getAwardCandidates error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}