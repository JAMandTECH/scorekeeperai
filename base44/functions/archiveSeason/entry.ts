import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const seasonId = body.season_id;
    if (!seasonId) return Response.json({ error: 'season_id is required' }, { status: 400 });

    const sr = base44.asServiceRole;
    const season = await sr.entities.Season.get(seasonId);
    if (!season) return Response.json({ error: 'Season not found' }, { status: 404 });
    if (season.status !== 'active') return Response.json({ error: 'Season is not active' }, { status: 400 });

    const orgId = season.organization_id;
    const BATCH = 500;

    // --- Snapshot final standings (reuse recalc logic) ---
    const teams = await sr.entities.Team.filter({ organization_id: orgId });
    const completedGames = await sr.entities.Game.filter({ organization_id: orgId, status: 'completed' });
    const rec = new Map();
    teams.forEach(t => rec.set(t.id, { wins: 0, losses: 0, draws: 0 }));
    for (const g of completedGames) {
      if ((g.game_type || 'regular_season') !== 'regular_season') continue;
      const h = g.home_team_id, a = g.away_team_id;
      if (!rec.has(h) || !rec.has(a)) continue;
      const hs = Number(g.home_score || 0), as = Number(g.away_score || 0);
      if (g.sport === 'volleyball') {
        const sets = Array.isArray(g.quarter_scores) ? g.quarter_scores : [];
        let homeSets = 0, awaySets = 0;
        for (const s of sets) { if (Number(s.home) > Number(s.away)) homeSets++; else if (Number(s.away) > Number(s.home)) awaySets++; }
        if (homeSets > awaySets) { rec.get(h).wins++; rec.get(a).losses++; }
        else if (awaySets > homeSets) { rec.get(a).wins++; rec.get(h).losses++; }
        else if (sets.length > 0) { rec.get(h).draws++; rec.get(a).draws++; }
        else if (hs > as) { rec.get(h).wins++; rec.get(a).losses++; }
        else if (as > hs) { rec.get(a).wins++; rec.get(h).losses++; }
        else { rec.get(h).draws++; rec.get(a).draws++; }
      } else {
        if (hs > as) { rec.get(h).wins++; rec.get(a).losses++; }
        else if (as > hs) { rec.get(a).wins++; rec.get(h).losses++; }
        else { rec.get(h).draws++; rec.get(a).draws++; }
      }
    }
    const standings = teams.map(t => {
      const r = rec.get(t.id) || { wins: 0, losses: 0, draws: 0 };
      const gp = r.wins + r.losses + r.draws;
      return {
        team_id: t.id, name: t.name, division: t.division || '',
        wins: r.wins, losses: r.losses, draws: r.draws,
        win_pct: gp > 0 ? Number(((r.wins + r.draws * 0.5) / gp).toFixed(3)) : 0,
        logo_url: t.logo_url || null,
      };
    }).sort((a, b) => {
      const ap = a.wins + a.draws * 0.5, bp = b.wins + b.draws * 0.5;
      if (bp !== ap) return bp - ap;
      if (a.losses !== b.losses) return a.losses - b.losses;
      return String(a.name).localeCompare(String(b.name));
    });
    const champion = standings[0] || null;

    // --- Top leaders from PlayerSeasonStats ---
    let topLeaders = {};
    try {
      const seasonStats = await sr.entities.PlayerSeasonStats.filter({ organization_id: orgId, sport: season.sport });
      const playerIds = [...new Set(seasonStats.map(s => s.player_id).filter(Boolean))];
      const playersData = [];
      for (let i = 0; i < playerIds.length; i += BATCH) {
        const chunk = playerIds.slice(i, i + BATCH);
        const part = await sr.entities.Player.filter({ id: { $in: chunk } });
        playersData.push(...part);
      }
      const playerMap = new Map(playersData.map(p => [p.id, p]));
      const teamMap = new Map(teams.map(t => [t.id, t]));
      const enriched = seasonStats.map(s => {
        const p = playerMap.get(s.player_id);
        return {
          player_id: s.player_id,
          name: p ? `${p.first_name} ${p.last_name}` : 'Unknown',
          team_name: teamMap.get(s.team_id)?.name || '',
          total_points: s.total_points || 0,
          total_rebounds: s.total_rebounds || 0,
          total_assists: s.total_assists || 0,
        };
      });
      const top = (arr, key, n = 5) => arr.filter(x => Number(x[key]) > 0).sort((a, b) => b[key] - a[key]).slice(0, n);
      topLeaders = {
        top_scorers: top(enriched, 'total_points'),
        top_assisters: top(enriched, 'total_assists'),
        top_rebounders: top(enriched, 'total_rebounds'),
      };
    } catch (e) {
      console.error('top leaders error', e);
    }

    // --- Copy records to archive ---

    // 1. Teams
    for (let i = 0; i < teams.length; i += BATCH) {
      const chunk = teams.slice(i, i + BATCH);
      await sr.entities.ArchivedTeam.bulkCreate(chunk.map(t => ({
        organization_id: orgId, season_id: seasonId, original_id: t.id,
        name: t.name, sport: t.sport, division: t.division,
        coach_name: t.coach_name, coach_contact: t.coach_contact, logo_url: t.logo_url,
        wins: t.wins || 0, losses: t.losses || 0, draws: t.draws || 0, status: t.status || 'approved',
      })));
    }

    // 2. Divisions
    const divisions = await sr.entities.Division.filter({ organization_id: orgId });
    for (let i = 0; i < divisions.length; i += BATCH) {
      const chunk = divisions.slice(i, i + BATCH);
      await sr.entities.ArchivedDivision.bulkCreate(chunk.map(d => ({
        organization_id: orgId, season_id: seasonId, original_id: d.id,
        name: d.name, sport: d.sport, description: d.description,
      })));
    }

    // 3. Players
    const teamIds = teams.map(t => t.id);
    const players = [];
    for (let i = 0; i < teamIds.length; i += BATCH) {
      const chunk = teamIds.slice(i, i + BATCH);
      const part = await sr.entities.Player.filter({ team_id: { $in: chunk } }, '-created_date', 2000);
      players.push(...part);
    }
    const teamNameMap = new Map(teams.map(t => [t.id, t.name]));
    for (let i = 0; i < players.length; i += BATCH) {
      const chunk = players.slice(i, i + BATCH);
      await sr.entities.ArchivedPlayer.bulkCreate(chunk.map(p => ({
        organization_id: orgId, season_id: seasonId, original_id: p.id,
        team_id: p.team_id, team_name: teamNameMap.get(p.team_id) || '',
        jersey_number: p.jersey_number, first_name: p.first_name, last_name: p.last_name,
        position: p.position, contact_number: p.contact_number, height: p.height,
        photo_url: p.photo_url, total_points: p.total_points || 0, total_rebounds: p.total_rebounds || 0,
        total_assists: p.total_assists || 0, games_played: p.games_played || 0,
      })));
    }

    // 4. Games
    const allGames = await sr.entities.Game.filter({ organization_id: orgId });
    const archivedGameIdMap = new Map();
    for (let i = 0; i < allGames.length; i += BATCH) {
      const chunk = allGames.slice(i, i + BATCH);
      const payload = chunk.map(g => ({
        organization_id: orgId, season_id: seasonId, original_id: g.id,
        home_team_id: g.home_team_id, away_team_id: g.away_team_id,
        home_team_name: teamNameMap.get(g.home_team_id) || '',
        away_team_name: teamNameMap.get(g.away_team_id) || '',
        sport: g.sport, game_date: g.game_date, court_number: g.court_number,
        duration_hours: g.duration_hours, location: g.location, status: g.status,
        game_type: g.game_type, week_number: g.week_number, division: g.division,
        home_score: g.home_score || 0, away_score: g.away_score || 0,
        quarter_scores: g.quarter_scores || [], current_quarter: g.current_quarter,
        overtime_count: g.overtime_count, home_timeouts: g.home_timeouts, away_timeouts: g.away_timeouts,
        home_team_fouls: g.home_team_fouls, away_team_fouls: g.away_team_fouls,
        winning_team_id: g.winning_team_id, stream_url: g.stream_url, notes: g.notes,
      }));
      const created = await sr.entities.ArchivedGame.bulkCreate(payload);
      created.forEach((c, idx) => archivedGameIdMap.set(chunk[idx].id, c.id));
    }

    // 5. PlayerGameStats
    const gameIds = allGames.map(g => g.id);
    for (let i = 0; i < gameIds.length; i += BATCH) {
      const chunk = gameIds.slice(i, i + BATCH);
      const stats = await sr.entities.PlayerGameStats.filter({ game_id: { $in: chunk } }, '-created_date', 2000);
      for (let j = 0; j < stats.length; j += BATCH) {
        const sChunk = stats.slice(j, j + BATCH);
        await sr.entities.ArchivedPlayerGameStats.bulkCreate(sChunk.map(s => ({
          organization_id: orgId, season_id: seasonId, original_id: s.id,
          game_id: s.game_id, archived_game_id: archivedGameIdMap.get(s.game_id) || '',
          player_id: s.player_id, team_id: s.team_id, quarter: s.quarter,
          points: s.points, rebounds: s.rebounds, assists: s.assists, steals: s.steals,
          blocks: s.blocks, fouls: s.fouls, three_pointers: s.three_pointers,
          field_goals_made: s.field_goals_made, field_goals_attempted: s.field_goals_attempted,
          free_throws_made: s.free_throws_made, free_throws_attempted: s.free_throws_attempted,
          aces: s.aces, attacks: s.attacks, rally_errors: s.rally_errors,
        })));
      }
    }

    // 6. Tournaments
    const tournaments = await sr.entities.Tournament.filter({ organization_id: orgId });
    const archivedTournamentIdMap = new Map();
    for (let i = 0; i < tournaments.length; i += BATCH) {
      const chunk = tournaments.slice(i, i + BATCH);
      const payload = chunk.map(t => ({
        organization_id: orgId, season_id: seasonId, original_id: t.id,
        name: t.name, sport: t.sport, division: t.division,
        start_date: t.start_date, end_date: t.end_date, num_teams: t.num_teams,
        status: t.status, current_round: t.current_round, best_of_settings: t.best_of_settings,
        initial_teams: t.initial_teams, is_manual_bracket: t.is_manual_bracket,
        manual_matches: t.manual_matches, manual_connectors: t.manual_connectors, manual_sections: t.manual_sections,
      }));
      const created = await sr.entities.ArchivedTournament.bulkCreate(payload);
      created.forEach((c, idx) => archivedTournamentIdMap.set(chunk[idx].id, c.id));
    }

    // 7. BracketMatches
    const tournamentIds = tournaments.map(t => t.id);
    for (let i = 0; i < tournamentIds.length; i += BATCH) {
      const chunk = tournamentIds.slice(i, i + BATCH);
      const matches = await sr.entities.BracketMatch.filter({ tournament_id: { $in: chunk } }, '-created_date', 2000);
      for (let j = 0; j < matches.length; j += BATCH) {
        const mChunk = matches.slice(j, j + BATCH);
        await sr.entities.ArchivedBracketMatch.bulkCreate(mChunk.map(m => ({
          organization_id: orgId, season_id: seasonId, original_id: m.id,
          tournament_id: m.tournament_id, archived_tournament_id: archivedTournamentIdMap.get(m.tournament_id) || '',
          round_name: m.round_name, match_number: m.match_number,
          home_team_id: m.home_team_id, away_team_id: m.away_team_id, winner_team_id: m.winner_team_id,
          game_ids: m.game_ids || [], home_team_wins: m.home_team_wins, away_team_wins: m.away_team_wins,
          required_wins: m.required_wins, status: m.status, next_match_id: m.next_match_id, is_home_slot: m.is_home_slot,
        })));
      }
    }

    // --- Delete live records (dependency-safe order) ---
    if (gameIds.length) {
      for (let i = 0; i < gameIds.length; i += BATCH) {
        await sr.entities.PlayerGameStats.deleteMany({ game_id: { $in: gameIds.slice(i, i + BATCH) } });
      }
    }
    if (tournamentIds.length) {
      for (let i = 0; i < tournamentIds.length; i += BATCH) {
        await sr.entities.BracketMatch.deleteMany({ tournament_id: { $in: tournamentIds.slice(i, i + BATCH) } });
      }
    }
    for (let i = 0; i < allGames.length; i += BATCH) {
      await sr.entities.Game.deleteMany({ id: { $in: allGames.slice(i, i + BATCH).map(g => g.id) } });
    }
    for (let i = 0; i < tournaments.length; i += BATCH) {
      await sr.entities.Tournament.deleteMany({ id: { $in: tournaments.slice(i, i + BATCH).map(t => t.id) } });
    }
    for (let i = 0; i < players.length; i += BATCH) {
      await sr.entities.Player.deleteMany({ id: { $in: players.slice(i, i + BATCH).map(p => p.id) } });
    }
    for (let i = 0; i < teams.length; i += BATCH) {
      await sr.entities.Team.deleteMany({ id: { $in: teams.slice(i, i + BATCH).map(t => t.id) } });
    }
    for (let i = 0; i < divisions.length; i += BATCH) {
      await sr.entities.Division.deleteMany({ id: { $in: divisions.slice(i, i + BATCH).map(d => d.id) } });
    }

    // --- Mark season archived ---
    await sr.entities.Season.update(seasonId, {
      status: 'archived',
      archived_at: new Date().toISOString(),
      archived_by: user.email,
      champion_team_id: champion?.team_id || '',
      champion_team_name: champion?.name || '',
      final_standings: standings,
      top_leaders: topLeaders,
    });

    return Response.json({
      success: true,
      season_id: seasonId,
      archived: {
        teams: teams.length, players: players.length, games: allGames.length,
        tournaments: tournaments.length, divisions: divisions.length,
      },
      champion: champion ? { name: champion.name, wins: champion.wins, losses: champion.losses, draws: champion.draws } : null,
    });
  } catch (error) {
    console.error('archiveSeason error', error);
    return Response.json({ error: error.message || String(error) }, { status: 500 });
  }
}