import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchWithRetry(fn, attempt = 1) {
  try { return await fn(); }
  catch (err) {
    if (/429|rate limit/i.test(String(err?.message || '')) && attempt < 6) {
      await sleep(400 * Math.pow(2, attempt - 1));
      return fetchWithRetry(fn, attempt + 1);
    }
    throw err;
  }
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const seasonId = body.season_id;
    if (!seasonId) return Response.json({ error: 'season_id is required' }, { status: 400 });

    const isSuper = Boolean(user.is_super_admin);
    const callerOrg = user.organization_id || user.active_organization_id ||
      user.data?.organization_id || user.data?.active_organization_id;
    const sr = base44.asServiceRole;

    // Fetch season
    const seasons = await fetchWithRetry(() => sr.entities.Season.filter({ id: seasonId }));
    const season = seasons?.[0];
    if (!season) return Response.json({ error: 'Season not found' }, { status: 404 });

    // Resolve org — non-super admins must own the season
    const orgId = isSuper ? (season.organization_id || callerOrg) : callerOrg;
    if (!isSuper && season.organization_id !== orgId) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch org details
    let organization = null;
    try {
      const orgs = await fetchWithRetry(() => sr.entities.Organization.filter({ id: orgId }));
      organization = orgs?.[0] || null;
    } catch (_) {}

    // Fetch teams for this season
    const teams = await fetchWithRetry(() =>
      sr.entities.Team.filter({ organization_id: orgId, season_id: seasonId }, undefined, 2000)
    );
    const teamIds = (teams || []).map((t) => t.id).filter(Boolean);
    const teamMap = new Map((teams || []).map((t) => [t.id, t]));

    // Fetch players for those teams (batch by team_id)
    let players = [];
    for (let i = 0; i < teamIds.length; i += 50) {
      const chunk = teamIds.slice(i, i + 50);
      const part = await fetchWithRetry(() =>
        sr.entities.Player.filter({ team_id: { $in: chunk } }, undefined, 2000)
      );
      players.push(...(part || []));
      if (i + 50 < teamIds.length) await sleep(100);
    }
    const playerMap = new Map(players.map((p) => [p.id, p]));

    // Fetch completed games for this season
    const games = await fetchWithRetry(() =>
      sr.entities.Game.filter({ organization_id: orgId, season_id: seasonId, status: 'completed' }, '-game_date', 2000)
    );
    const completedGameIds = (games || []).map((g) => g.id).filter(Boolean);

    // Fetch PlayerGameStats for completed games (batch by game_id)
    let allStats = [];
    for (let i = 0; i < completedGameIds.length; i += 10) {
      const chunk = completedGameIds.slice(i, i + 10);
      const part = await fetchWithRetry(() =>
        sr.entities.PlayerGameStats.filter({ game_id: { $in: chunk } }, undefined, 2000)
      );
      allStats.push(...(part || []));
      if (i + 10 < completedGameIds.length) await sleep(100);
    }

    // Group teams by division
    const divisionMap = new Map();
    for (const team of teams || []) {
      const div = team.division || 'Default Division';
      if (!divisionMap.has(div)) {
        divisionMap.set(div, { name: div, sport: team.sport || season.sport, teamIds: new Set() });
      }
      divisionMap.get(div).teamIds.add(team.id);
    }

    // Aggregate player stats per division
    const divisions = [];
    for (const [divName, divData] of divisionMap) {
      const divTeamIds = divData.teamIds;
      const divStats = allStats.filter((s) => divTeamIds.has(s.team_id));

      const agg = new Map();
      for (const s of divStats) {
        const p = agg.get(s.player_id) || {
          player_id: s.player_id, team_id: s.team_id, gameIds: new Set(),
          points: 0, rebounds: 0, assists: 0, steals: 0, blocks: 0,
          three_pointers: 0, fouls: 0,
          field_goals_made: 0, field_goals_attempted: 0,
          free_throws_made: 0, free_throws_attempted: 0,
          aces: 0, attacks: 0, rally_errors: 0,
        };
        p.gameIds.add(s.game_id);
        p.points += s.points || 0;
        p.rebounds += s.rebounds || 0;
        p.assists += s.assists || 0;
        p.steals += s.steals || 0;
        p.blocks += s.blocks || 0;
        p.three_pointers += s.three_pointers || 0;
        p.fouls += s.fouls || 0;
        p.field_goals_made += s.field_goals_made || 0;
        p.field_goals_attempted += s.field_goals_attempted || 0;
        p.free_throws_made += s.free_throws_made || 0;
        p.free_throws_attempted += s.free_throws_attempted || 0;
        p.aces += s.aces || 0;
        p.attacks += s.attacks || 0;
        p.rally_errors += s.rally_errors || 0;
        agg.set(s.player_id, p);
      }

      const playerList = Array.from(agg.values()).map((p) => {
        const gp = p.gameIds.size;
        const player = playerMap.get(p.player_id) || {};
        const team = teamMap.get(p.team_id) || {};
        const entry = {
          player_id: p.player_id,
          first_name: player.first_name || '',
          last_name: player.last_name || '',
          jersey_number: player.jersey_number || '',
          photo_url: player.photo_url || '',
          team_id: p.team_id,
          team_name: team.name || '',
          team_logo_url: team.logo_url || '',
          games_played: gp,
          total_points: p.points, total_rebounds: p.rebounds, total_assists: p.assists,
          total_steals: p.steals, total_blocks: p.blocks, total_three_pointers: p.three_pointers,
          total_aces: p.aces, total_attacks: p.attacks, total_rally_errors: p.rally_errors,
          ppg: gp > 0 ? Number((p.points / gp).toFixed(1)) : 0,
          rpg: gp > 0 ? Number((p.rebounds / gp).toFixed(1)) : 0,
          apg: gp > 0 ? Number((p.assists / gp).toFixed(1)) : 0,
          spg: gp > 0 ? Number((p.steals / gp).toFixed(1)) : 0,
          bpg: gp > 0 ? Number((p.blocks / gp).toFixed(1)) : 0,
          tpg: gp > 0 ? Number((p.three_pointers / gp).toFixed(1)) : 0,
          acpg: gp > 0 ? Number((p.aces / gp).toFixed(1)) : 0,
          atpg: gp > 0 ? Number((p.attacks / gp).toFixed(1)) : 0,
          repg: gp > 0 ? Number((p.rally_errors / gp).toFixed(1)) : 0,
        };
        if (divData.sport === 'basketball') {
          entry._score = entry.ppg + entry.rpg * 0.8 + entry.apg * 0.8 + entry.spg + entry.bpg + entry.tpg * 0.5;
        } else {
          entry._score = entry.atpg + entry.acpg * 1.5 + entry.ppg * 0.5 - entry.repg * 0.3;
        }
        return entry;
      });

      playerList.sort((a, b) => b._score - a._score);
      const topPerformers = playerList.slice(0, 10).map(({ _score, ...rest }) => rest);
      const aiCandidates = playerList.slice(0, 20).map(({ _score, ...rest }) => rest);

      divisions.push({
        name: divName, sport: divData.sport,
        team_count: divTeamIds.size,
        top_performers: topPerformers,
        ai_candidates: aiCandidates,
      });
    }

    const orgStats = {
      total_teams: (teams || []).length,
      total_players: players.length,
      total_games: (games || []).length,
      completed_games: completedGameIds.length,
      total_divisions: divisionMap.size,
      division_names: Array.from(divisionMap.keys()),
    };

    // Call AI for recommendations
    let aiResult = null;
    if (divisions.length > 0 && divisions.some((d) => d.ai_candidates.length > 0)) {
      try {
        aiResult = await callAI(base44, orgStats, divisions, organization, season);
      } catch (err) {
        console.error('generateSeasonReport: AI call failed:', err?.message || err);
      }
    }

    // Merge AI results with computed stats
    const mergedDivisions = divisions.map((div) => {
      const aiDiv = aiResult?.divisions?.find((d) =>
        String(d.division_name || '').toLowerCase() === String(div.name).toLowerCase()
      ) || {};

      const enrich = (candidates) => (candidates || []).map((c) => {
        const player = div.ai_candidates.find((p) => p.player_id === c.player_id) || {};
        return {
          ...c,
          first_name: player.first_name || '',
          last_name: player.last_name || '',
          jersey_number: player.jersey_number || '',
          team_name: player.team_name || '',
          photo_url: player.photo_url || '',
          ppg: player.ppg, rpg: player.rpg, apg: player.apg,
          spg: player.spg, bpg: player.bpg, tpg: player.tpg,
          acpg: player.acpg, atpg: player.atpg, repg: player.repg,
          games_played: player.games_played,
        };
      });

      return {
        name: div.name, sport: div.sport, team_count: div.team_count,
        top_performers: div.top_performers,
        season_mvp_candidates: enrich(aiDiv.season_mvp_candidates),
        final_mvp_candidates: enrich(aiDiv.final_mvp_candidates),
        mythical_candidates: enrich(aiDiv.mythical_candidates),
      };
    });

    return Response.json({
      organization: organization ? {
        id: organization.id, name: organization.name,
        logo_url: organization.logo_url || '',
        tournament_name: organization.tournament_name || '',
      } : { id: orgId, name: 'Unknown' },
      season: {
        id: season.id, name: season.name, sport: season.sport,
        start_date: season.start_date, end_date: season.end_date, status: season.status,
      },
      org_stats: orgStats,
      ai_summary: aiResult ? {
        performance_summary: aiResult.performance_summary || '',
        improvement_suggestions: aiResult.improvement_suggestions || [],
      } : null,
      divisions: mergedDivisions,
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('generateSeasonReport error:', error?.message || error);
    return Response.json({ error: error?.message || 'Internal error' }, { status: 500 });
  }
}

async function callAI(base44, orgStats, divisions, organization, season) {
  const orgName = organization?.name || 'the organization';
  const seasonName = season?.name || 'the season';
  const sport = season?.sport || 'basketball';

  const divisionData = divisions.map((div) => {
    const isBball = div.sport === 'basketball';
    const players = div.ai_candidates.map((p, i) => {
      const base = `#${i + 1} ${p.first_name} ${p.last_name} (#${p.jersey_number}) - ${p.team_name} | GP:${p.games_played}`;
      if (isBball) {
        return `${base} | PPG:${p.ppg} RPG:${p.rpg} APG:${p.apg} SPG:${p.spg} BPG:${p.bpg} 3PT:${p.tpg} | Totals: PTS:${p.total_points} REB:${p.total_rebounds} AST:${p.total_assists} STL:${p.total_steals} BLK:${p.total_blocks} 3PT:${p.total_three_pointers} | ID:${p.player_id}`;
      }
      return `${base} | AcesPG:${p.acpg} AttacksPG:${p.atpg} ErrorsPG:${p.repg} PPG:${p.ppg} | Totals: Aces:${p.total_aces} Attacks:${p.total_attacks} Errors:${p.total_rally_errors} Points:${p.total_points} | ID:${p.player_id}`;
    }).join('\n');
    return `Division: ${div.name} (${div.sport}, ${div.team_count} teams)\nTop Performers:\n${players}`;
  }).join('\n\n');

  const mythicalLabel = sport === 'basketball'
    ? 'Mythical Five (5 best players: PG, SG, SF, PF, C)'
    : 'Mythical Six (6 best players: Setter, OH, OH, MB, MB, Opposite/Libero)';

  const prompt = `You are a sports analyst generating an end-of-season report for ${orgName}'s ${seasonName} (${sport} league).

LEAGUE STATISTICS:
- Total Teams: ${orgStats.total_teams}
- Total Players: ${orgStats.total_players}
- Total Games: ${orgStats.total_games}
- Completed Games: ${orgStats.completed_games}
- Divisions: ${orgStats.total_divisions} (${orgStats.division_names.join(', ')})

DIVISION-BY-DIVISION TOP PERFORMERS (ranked by composite score):

${divisionData}

Based on the statistics above, provide:

1. A "performance_summary" (2-3 paragraphs) summarizing how the league performed this season. Highlight key achievements, competitive balance, and standout performances.

2. An "improvement_suggestions" array with 3-5 specific, actionable suggestions for improving the league next season.

3. For EACH division, provide:
   a. "season_mvp_candidates": Top 3 candidates for Season MVP (best overall player across the entire regular season). Each needs "player_id" (exact ID from data) and "reasoning" (2-3 sentences).
   b. "final_mvp_candidates": Top 3 candidates for Final MVP (best performer in finals/championship games). Each needs "player_id" and "reasoning".
   c. "mythical_candidates": Top 10 candidates for the ${mythicalLabel}. Each needs "player_id", "position", and "reasoning".

IMPORTANT: Only use player_id values that appear in the data above. Match division_name exactly to the division names in the data.`;

  const responseSchema = {
    type: 'object',
    properties: {
      performance_summary: { type: 'string' },
      improvement_suggestions: { type: 'array', items: { type: 'string' } },
      divisions: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            division_name: { type: 'string' },
            season_mvp_candidates: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  player_id: { type: 'string' },
                  reasoning: { type: 'string' },
                },
              },
            },
            final_mvp_candidates: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  player_id: { type: 'string' },
                  reasoning: { type: 'string' },
                },
              },
            },
            mythical_candidates: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  player_id: { type: 'string' },
                  position: { type: 'string' },
                  reasoning: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
  };

  const aiResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt,
    response_json_schema: responseSchema,
  });

  return typeof aiResponse === 'string' ? JSON.parse(aiResponse) : aiResponse;
}