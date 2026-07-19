import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Playoff game types that map directly to bracket round names.
const PLAYOFF_ROUND_TYPES = ['play_in', 'quarter_finals', 'semi_finals', 'finals'];

// Determines the winning team id of a completed game.
function getGameWinner(game) {
  const homeId = game.home_team_id;
  const awayId = game.away_team_id;

  // Default win (forfeit)
  if (game.is_default && game.winning_team_id) {
    return game.winning_team_id;
  }

  if (game.sport === 'volleyball' && Array.isArray(game.quarter_scores) && game.quarter_scores.length > 0) {
    let homeSets = 0;
    let awaySets = 0;
    for (const s of game.quarter_scores) {
      const h = Number(s?.home || 0);
      const a = Number(s?.away || 0);
      if (h > a) homeSets++;
      else if (a > h) awaySets++;
    }
    if (homeSets > awaySets) return homeId;
    if (awaySets > homeSets) return awayId;
  }

  const h = Number(game.home_score || 0);
  const a = Number(game.away_score || 0);
  if (h > a) return homeId;
  if (a > h) return awayId;
  return null; // tie / undecided
}

// Recomputes a bracket match's series win counts from all its linked completed games.
function computeSeriesFromGames(match, games) {
  let homeWins = 0;
  let awayWins = 0;
  for (const g of games) {
    if (g.status !== 'completed') continue;
    const winner = getGameWinner(g);
    if (!winner) continue;
    if (winner === match.home_team_id) homeWins++;
    else if (winner === match.away_team_id) awayWins++;
  }
  return { homeWins, awayWins };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const body = await req.json().catch(() => ({}));
    const gameId = body.game_id || body?.event?.entity_id;
    if (!gameId) return Response.json({ error: 'game_id is required' }, { status: 400 });

    // Load the triggering game.
    const gameResult = await base44.asServiceRole.entities.Game.filter({ id: gameId });
    const game = gameResult && gameResult[0];
    if (!game) return Response.json({ error: 'game not found' }, { status: 404 });

    // Only process completed games — ignore scheduled / in-progress updates.
    if (game.status !== 'completed') {
      return Response.json({ success: true, updated: 0, message: 'game not completed' });
    }

    // Find all bracket matches that already reference this game.
    const allMatches = await base44.asServiceRole.entities.BracketMatch.list();
    let linkedMatches = allMatches.filter(m => Array.isArray(m.game_ids) && m.game_ids.includes(gameId));

    // ── AUTO-LINK / AUTO-ASSIGN ────────────────────────────────
    // If no bracket match references this game, try to auto-link or
    // auto-assign based on the game's game_type (which maps to a bracket
    // round_name) and its two teams.
    if (linkedMatches.length === 0) {
      const gameType = game.game_type;
      const isPlayoff = gameType && PLAYOFF_ROUND_TYPES.includes(gameType);

      if (isPlayoff) {
        const gameTeams = [game.home_team_id, game.away_team_id].filter(Boolean);
        if (gameTeams.length === 2) {
          // Find the organization's tournaments.
          const tournaments = await base44.asServiceRole.entities.Tournament.filter({
            organization_id: game.organization_id,
          });

          // Candidate tournaments: same sport, division matches (or either is blank).
          const candidateTournaments = tournaments.filter(t => {
            if (t.sport !== game.sport) return false;
            const gameDiv = (game.division || '').trim();
            const tDiv = (t.division || '').trim();
            if (!gameDiv || !tDiv) return true;
            return gameDiv === tDiv;
          });

          // STEP 1: Find a bracket match with the same two teams in the same round.
          const teamMatch = allMatches.find(m =>
            candidateTournaments.some(t => t.id === m.tournament_id) &&
            m.round_name === gameType &&
            m.home_team_id && m.away_team_id &&
            gameTeams.includes(m.home_team_id) &&
            gameTeams.includes(m.away_team_id) &&
            m.home_team_id !== m.away_team_id
          );

          if (teamMatch) {
            // Found existing match with these teams — link all series games.
            await linkSeriesGames(base44, teamMatch, game, candidateTournaments);
            const refreshed = await base44.asServiceRole.entities.BracketMatch.filter({ id: teamMatch.id });
            linkedMatches = refreshed && refreshed[0] ? [refreshed[0]] : [];
          } else {
            // STEP 2: No match has these teams. Find an empty match in a candidate
            // tournament where neither team is already used in the same round.
            for (const tournament of candidateTournaments) {
              const roundMatches = allMatches.filter(
                m => m.tournament_id === tournament.id && m.round_name === gameType
              );

              // Skip this tournament if either team is already assigned in this round
              // (different pairing) — avoids assigning the same team to two matches.
              const teamUsedElsewhere = roundMatches.some(m =>
                (m.home_team_id && gameTeams.includes(m.home_team_id) && m.away_team_id && !gameTeams.includes(m.away_team_id)) ||
                (m.away_team_id && gameTeams.includes(m.away_team_id) && m.home_team_id && !gameTeams.includes(m.home_team_id))
              );
              if (teamUsedElsewhere) continue;

              // Find first empty match (both slots null) in this round, ordered by match_number.
              const emptyMatch = roundMatches
                .filter(m => !m.home_team_id && !m.away_team_id)
                .sort((a, b) => (a.match_number || 0) - (b.match_number || 0))[0];

              if (emptyMatch) {
                console.log(`Auto-assigning teams to empty match ${emptyMatch.id} (${gameType}) in tournament ${tournament.name}`);
                // Assign teams + link the game in one update.
                const gameIds = await findSeriesGameIds(base44, game);
                await base44.asServiceRole.entities.BracketMatch.update(emptyMatch.id, {
                  home_team_id: game.home_team_id,
                  away_team_id: game.away_team_id,
                  status: 'ready',
                  game_ids: gameIds,
                });

                const refreshed = await base44.asServiceRole.entities.BracketMatch.filter({ id: emptyMatch.id });
                linkedMatches = refreshed && refreshed[0] ? [refreshed[0]] : [];
                break;
              }
            }
          }
        }
      }
    }

    if (linkedMatches.length === 0) {
      return Response.json({ success: true, updated: 0, message: 'No linked bracket matches and no auto-link candidate found' });
    }

    let updated = 0;
    for (const match of linkedMatches) {
      // Load all games linked to this match.
      const games = [];
      for (const gid of match.game_ids) {
        const g = await base44.asServiceRole.entities.Game.filter({ id: gid });
        if (g && g[0]) games.push(g[0]);
      }

      const { homeWins, awayWins } = computeSeriesFromGames(match, games);
      const requiredWins = Number(match.required_wins || 1);

      const updateData = {
        home_team_wins: homeWins,
        away_team_wins: awayWins,
      };

      // Decide series winner / status
      if (homeWins >= requiredWins) {
        updateData.winner_team_id = match.home_team_id;
        updateData.status = 'completed';
      } else if (awayWins >= requiredWins) {
        updateData.winner_team_id = match.away_team_id;
        updateData.status = 'completed';
      } else {
        updateData.winner_team_id = null;
        updateData.status = (homeWins + awayWins) > 0 ? 'in_progress' : match.status;
      }

      await base44.asServiceRole.entities.BracketMatch.update(match.id, updateData);
      updated++;
      console.log(`Match ${match.id} (${match.round_name}): home=${homeWins} away=${awayWins} required=${requiredWins} winner=${updateData.winner_team_id || 'none'}`);

      // Advance winner into the next match slot, if decided and linked.
      if (updateData.winner_team_id && match.next_match_id) {
        const slotField = match.is_home_slot ? 'home_team_id' : 'away_team_id';
        const nextUpdate = { [slotField]: updateData.winner_team_id };

        // Update next match status to 'ready' if both slots will be filled.
        const nextMatchResult = await base44.asServiceRole.entities.BracketMatch.filter({ id: match.next_match_id });
        const nextMatch = nextMatchResult && nextMatchResult[0];
        if (nextMatch) {
          const otherSlot = match.is_home_slot ? 'away_team_id' : 'home_team_id';
          const otherTeam = nextMatch[otherSlot];
          if (otherTeam) {
            nextUpdate.status = 'ready';
          }
        }

        await base44.asServiceRole.entities.BracketMatch.update(match.next_match_id, nextUpdate);
        console.log(`Advanced winner ${updateData.winner_team_id} to next match ${match.next_match_id} (${slotField})`);
      }
    }

    return Response.json({ success: true, updated });
  } catch (error) {
    console.error('syncBracketFromGame error:', error?.message || error);
    return Response.json({ error: error?.message || String(error) }, { status: 500 });
  }
});

// Find all completed games between the same two teams in the same round/game_type.
async function findSeriesGameIds(base44, game) {
  const allOrgGames = await base44.asServiceRole.entities.Game.filter({
    organization_id: game.organization_id,
  });
  const teams = [game.home_team_id, game.away_team_id];
  const seriesGames = allOrgGames.filter(g =>
    g.game_type === game.game_type &&
    g.status === 'completed' &&
    ((g.home_team_id === teams[0] && g.away_team_id === teams[1]) ||
     (g.home_team_id === teams[1] && g.away_team_id === teams[0]))
  );
  return [...new Set(seriesGames.map(g => g.id))];
}

// Link all series games to an existing bracket match.
async function linkSeriesGames(base44, match, game, candidateTournaments) {
  const gameIds = await findSeriesGameIds(base44, game);
  const currentIds = Array.isArray(match.game_ids) ? match.game_ids : [];
  const newIds = [...new Set([...currentIds, ...gameIds])];
  if (newIds.length !== currentIds.length) {
    await base44.asServiceRole.entities.BracketMatch.update(match.id, { game_ids: newIds });
    console.log(`Linked ${gameIds.length} series game(s) to existing match ${match.id}`);
  }
}