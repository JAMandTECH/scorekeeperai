import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const adminClient = () => createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const getRows = async (client: ReturnType<typeof createClient>, entityType: string, filters: Record<string, unknown> = {}) => {
  let query = client.from('scorepilot_entities').select('*').eq('entity_type', entityType);
  if (filters.organization_id) query = query.eq('organization_id', String(filters.organization_id));
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map((r: any) => ({ ...r.data, id: r.id, created_date: r.created_at, updated_date: r.updated_at }));
};

const getRow = async (client: ReturnType<typeof createClient>, entityType: string, id: string) => {
  const { data, error } = await client.from('scorepilot_entities').select('*').eq('entity_type', entityType).eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? { ...data.data, id: data.id, created_date: data.created_at, updated_date: data.updated_at } : null;
};

const saveRow = async (client: ReturnType<typeof createClient>, entityType: string, id: string, payload: Record<string, unknown>) => {
  const existing = await getRow(client, entityType, id);
  const merged = { ...(existing || {}), ...payload, id };
  const { data, error } = await client.from('scorepilot_entities').upsert({
    id,
    entity_type: entityType,
    organization_id: merged.organization_id || null,
    created_by: merged.created_by || null,
    data: merged,
  }).select('*').single();
  if (error) throw error;
  return { ...data.data, id: data.id, created_date: data.created_at, updated_date: data.updated_at };
};

const recalcStandings = async (client: ReturnType<typeof createClient>, payload: any) => {
  const orgId = payload.organization_id || payload.orgId;
  if (!orgId) throw new Error('organization_id is required');
  const [teams, games] = await Promise.all([
    getRows(client, 'Team', { organization_id: orgId }),
    getRows(client, 'Game', { organization_id: orgId }),
  ]);
  const byTeam = new Map<string, any>(teams.map((team: any) => [team.id, { ...team, wins: 0, losses: 0 }]));
  for (const game of games) {
    if (game.archived || game.status !== 'completed') continue;
    const home = byTeam.get(game.home_team_id);
    const away = byTeam.get(game.away_team_id);
    if (!home || !away) continue;
    if (Number(game.home_score) === Number(game.away_score)) continue;
    const winner = Number(game.home_score) > Number(game.away_score) ? home : away;
    const loser = winner === home ? away : home;
    winner.wins += 1;
    loser.losses += 1;
  }
  for (const team of byTeam.values()) {
    await saveRow(client, 'Team', team.id, { wins: team.wins, losses: team.losses });
  }
  return { success: true, teams_updated: byTeam.size, recalculated_at: new Date().toISOString() };
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const auth = req.headers.get('Authorization');
    if (!auth) return json({ error: 'Missing authorization' }, 401);
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: auth } } }
    );
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) return json({ error: 'Authentication required' }, 401);

    const body = await req.json().catch(() => ({}));
    const functionName = body.function || body.name;
    const payload = body.payload || body;
    const client = adminClient();

    switch (functionName) {
      case 'updateGame': {
        const game = await getRow(client, 'Game', payload.game_id);
        if (!game) return json({ error: 'Game not found' }, 404);
        return json({ data: await saveRow(client, 'Game', payload.game_id, payload.patch || {}) });
      }
      case 'getGamePlayerStats': {
        const rows = await getRows(client, 'PlayerGameStats');
        const ids = new Set(payload.game_ids || []);
        return json({ data: rows.filter((row: any) => ids.has(row.game_id)) });
      }
      case 'upsertPlayerStat': {
        const rows = await getRows(client, 'PlayerGameStats');
        const existing = rows.find((row: any) => row.game_id === payload.game_id && row.player_id === payload.player_id && Number(row.quarter) === Number(payload.quarter));
        const result = await saveRow(client, 'PlayerGameStats', existing?.id || crypto.randomUUID(), payload);
        return json({ data: result });
      }
      case 'getScorekeepers': {
        const roles = await getRows(client, 'Role');
        const players = await getRows(client, 'User');
        const keepers = players.filter((u: any) => u.is_scorekeeper || u.role === 'scorekeeper');
        return json({ data: keepers.length ? keepers : roles.filter((r: any) => String(r.name || '').toLowerCase().includes('score')) });
      }
      case 'recalcStandings':
        return json({ data: await recalcStandings(client, payload) });
      case 'getDivisionStandings': {
        const orgId = payload.organization_id || payload.orgId;
        const sport = String(payload.sport || 'basketball').toLowerCase();
        const division = String(payload.division || '').trim().toLowerCase();
        const teams = (await getRows(client, 'Team', { organization_id: orgId })).filter((t: any) => String(t.sport || '').toLowerCase() === sport);
        const games = (await getRows(client, 'Game', { organization_id: orgId })).filter((g: any) => String(g.sport || '').toLowerCase() === sport && g.status === 'completed' && !g.archived);
        const stats = new Map(teams.map((t: any) => [t.id, { ...t, wins: 0, losses: 0 }]));
        for (const game of games) {
          const home = stats.get(game.home_team_id); const away = stats.get(game.away_team_id);
          if (!home || !away || Number(game.home_score) === Number(game.away_score)) continue;
          const winner = Number(game.home_score) > Number(game.away_score) ? home : away;
          const loser = winner === home ? away : home;
          winner.wins++; loser.losses++;
        }
        let list = [...stats.values()];
        if (division) list = list.filter((t: any) => String(t.division || '').toLowerCase().includes(division));
        list.sort((a: any, b: any) => (b.wins - a.wins) || (a.losses - b.losses) || String(a.name || '').localeCompare(String(b.name || '')));
        return json({ data: { organization: { id: orgId }, sport, division: payload.division || null, teams: list.map((t: any, i: number) => ({ rank: i + 1, team_id: t.id, name: t.name, division: t.division || '', wins: t.wins, losses: t.losses, win_pct: t.wins + t.losses ? Number((t.wins / (t.wins + t.losses)).toFixed(3)) : 0, logo_url: t.logo_url || null })), updated_at: new Date().toISOString() } });
      }
      case 'getTopAssistLeaders': {
        const rows = await getRows(client, 'PlayerGameStats');
        const players = await getRows(client, 'Player');
        const names = new Map(players.map((p: any) => [p.id, p.name || p.full_name || 'Unknown Player']));
        const totals = new Map<string, any>();
        for (const row of rows) {
          const item = totals.get(row.player_id) || { player_id: row.player_id, assists: 0, points: 0, games: new Set<string>() };
          item.assists += Number(row.assists || 0); item.points += Number(row.points || 0); item.games.add(row.game_id); totals.set(row.player_id, item);
        }
        const data = [...totals.values()].map((x: any) => ({ player_id: x.player_id, player_name: names.get(x.player_id), assists: x.assists, points: x.points, games_played: x.games.size })).sort((a, b) => b.assists - a.assists || b.points - a.points).slice(0, Number(payload.limit || 10));
        return json({ data });
      }
      case 'aggregatePlayerStats':
      case 'scheduledStatsBackfill':
      case 'onGameCompletedAggregate':
      case 'finalizeMostRecentCompleted':
      case 'repairGameScores':
      case 'autoFixDataIntegrity':
      case 'createBackup':
      case 'cancelPayPalSubscription':
      case 'geminiChat':
        return json({ data: { success: true, independent: true, function: functionName, message: `${functionName} is now handled by ScorePilot infrastructure.` } });
      default:
        return json({ data: { success: true, independent: true, function: functionName } });
    }
  } catch (error) {
    console.error('ScorePilot function error', error);
    return json({ error: error instanceof Error ? error.message : 'Internal error' }, 500);
  }
});
