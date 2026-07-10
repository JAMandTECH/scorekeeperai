import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

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

    // Find all bracket matches that reference this game.
    const allMatches = await base44.asServiceRole.entities.BracketMatch.list();
    const linkedMatches = allMatches.filter(m => Array.isArray(m.game_ids) && m.game_ids.includes(gameId));

    if (linkedMatches.length === 0) {
      return Response.json({ success: true, updated: 0, message: 'No linked bracket matches' });
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

      // Advance winner into the next match slot, if decided and linked.
      if (updateData.winner_team_id && match.next_match_id) {
        const slotField = match.is_home_slot ? 'home_team_id' : 'away_team_id';
        await base44.asServiceRole.entities.BracketMatch.update(match.next_match_id, {
          [slotField]: updateData.winner_team_id,
        });
      }
    }

    return Response.json({ success: true, updated });
  } catch (error) {
    console.error('syncBracketFromGame error:', error?.message || error);
    return Response.json({ error: error?.message || String(error) }, { status: 500 });
  }
});