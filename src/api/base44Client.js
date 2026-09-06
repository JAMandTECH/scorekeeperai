import { supabase } from '@/lib/supabaseClient';

const ENTITY_TABLE = 'scorepilot_entities';

const normalize = r => ({ ...r.data, id: r.id, created_date: r.created_at, updated_date: r.updated_at });
const sortRows = (rows, sort) => {
  if (!sort) return rows;
  const desc = sort.startsWith('-');
  const field = desc ? sort.slice(1) : sort;
  return [...rows].sort((a, b) => {
    const av = a[field];
    const bv = b[field];
    if (typeof av === 'number' && typeof bv === 'number') return desc ? bv - av : av - bv;
    const cmp = String(av ?? '').localeCompare(String(bv ?? ''), undefined, { numeric: true, sensitivity: 'base' });
    return desc ? -cmp : cmp;
  });
};
const matches = (row, filters = {}) => Object.entries(filters).every(([key, value]) => Array.isArray(value) ? value.includes(row[key]) : row[key] === value);

const entity = entityName => ({
  async list(sort, limit) {
    const { data, error } = await supabase.from(ENTITY_TABLE).select('*').eq('entity_type', entityName);
    if (error) throw error;
    const rows = sortRows((data || []).map(normalize), sort);
    return typeof limit === 'number' ? rows.slice(0, limit) : rows;
  },
  async filter(filters = {}, sort, limit) {
    let query = supabase.from(ENTITY_TABLE).select('*').eq('entity_type', entityName);
    if (filters.organization_id) query = query.eq('organization_id', filters.organization_id);
    const { data, error } = await query;
    if (error) throw error;
    const rows = sortRows((data || []).map(normalize).filter(r => matches(r, filters)), sort);
    return typeof limit === 'number' ? rows.slice(0, limit) : rows;
  },
  async get(id) {
    const { data, error } = await supabase.from(ENTITY_TABLE).select('*').eq('entity_type', entityName).eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? normalize(data) : null;
  },
  async create(payload) {
    const id = payload.id || crypto.randomUUID();
    const { data, error } = await supabase.from(ENTITY_TABLE).insert({ id, entity_type: entityName, organization_id: payload.organization_id || null, created_by: payload.created_by || null, data: payload }).select('*').single();
    if (error) throw error;
    return normalize(data);
  },
  async update(id, payload) {
    const existing = await entity(entityName).get(id);
    if (!existing) throw new Error(`${entityName} ${id} not found`);
    const merged = { ...existing, ...payload, id };
    const { data, error } = await supabase.from(ENTITY_TABLE).update({ organization_id: merged.organization_id || null, data: merged }).eq('entity_type', entityName).eq('id', id).select('*').single();
    if (error) throw error;
    return normalize(data);
  },
  async delete(id) {
    const { error } = await supabase.from(ENTITY_TABLE).delete().eq('entity_type', entityName).eq('id', id);
    if (error) throw error;
    return { success: true };
  }
});

const auth = {
  async me() {
    const { data: { user: authUser }, error } = await supabase.auth.getUser();
    if (error) throw error;
    if (!authUser) throw Object.assign(new Error('Not authenticated'), { status: 401 });
    const { data: profile } = await supabase.from('scorepilot_profiles').select('*').eq('id', authUser.id).maybeSingle();
    return { id: authUser.id, email: authUser.email, ...(profile || {}) };
  },
  async isAuthenticated() {
    const { data: { session } } = await supabase.auth.getSession();
    return !!session;
  },
  async logout() { await supabase.auth.signOut(); window.location.assign('/'); },
  redirectToLogin(returnUrl = window.location.href) { window.location.assign(`/login?returnUrl=${encodeURIComponent(returnUrl)}`); }
};

const getEntities = async (name, filters = {}) => entity(name).filter(filters);
const num = value => Number.isFinite(Number(value)) ? Number(value) : 0;

const getDivisionStandings = async payload => {
  const orgId = payload.orgId || payload.organization_id;
  if (!orgId) throw new Error('orgId is required');
  const sport = String(payload.sport || 'basketball').toLowerCase();
  const division = String(payload.division || '').trim().toLowerCase();
  const limit = Number(payload.limit || 200);

  const [teams, games] = await Promise.all([
    getEntities('Team', { organization_id: orgId, sport }),
    getEntities('Game', { organization_id: orgId, sport })
  ]);

  const completed = games.filter(g => g.status === 'completed' && !g.archived);
  const byTeam = new Map(teams.map(t => [t.id, { ...t, wins: 0, losses: 0 }]));
  for (const game of completed) {
    const home = byTeam.get(game.home_team_id);
    const away = byTeam.get(game.away_team_id);
    if (!home || !away) continue;
    const hs = num(game.home_score);
    const as = num(game.away_score);
    if (hs === as) continue;
    const winner = hs > as ? home : away;
    const loser = hs > as ? away : home;
    winner.wins += 1;
    loser.losses += 1;
  }

  let filtered = [...byTeam.values()];
  if (division) filtered = filtered.filter(t => String(t.division || '').toLowerCase().includes(division));
  filtered.sort((a, b) => (b.wins - a.wins) || (a.losses - b.losses) || String(a.name || '').localeCompare(String(b.name || '')));

  const organization = (await getEntities('Organization', { id: orgId }))[0] || null;
  return {
    organization: organization ? { id: organization.id, name: organization.name } : { id: orgId },
    sport,
    division: payload.division || null,
    teams: filtered.slice(0, limit).map((t, idx) => {
      const gp = t.wins + t.losses;
      return {
        rank: idx + 1,
        team_id: t.id,
        name: t.name,
        division: t.division || '',
        wins: t.wins,
        losses: t.losses,
        win_pct: gp ? Number((t.wins / gp).toFixed(3)) : 0,
        logo_url: t.logo_url || null
      };
    }),
    updated_at: new Date().toISOString()
  };
};

const getTopAssistLeaders = async payload => {
  const rows = await getEntities('PlayerGameStats');
  const filtered = payload.organization_id
    ? rows.filter(r => r.organization_id === payload.organization_id || r.org_id === payload.organization_id)
    : rows;
  const players = await getEntities('Player');
  const playerMap = new Map(players.map(p => [p.id, p]));
  const totals = new Map();
  for (const row of filtered) {
    const current = totals.get(row.player_id) || { assists: 0, games: new Set(), points: 0 };
    current.assists += num(row.assists);
    current.points += num(row.points);
    current.games.add(row.game_id);
    totals.set(row.player_id, current);
  }
  return [...totals.entries()]
    .map(([player_id, v]) => ({
      player_id,
      player_name: playerMap.get(player_id)?.name || playerMap.get(player_id)?.full_name || 'Unknown Player',
      assists: v.assists,
      games_played: v.games.size,
      points: v.points
    }))
    .sort((a, b) => b.assists - a.assists || b.points - a.points)
    .slice(0, Number(payload.limit || 10));
};

const getTopPlayersForGame = async payload => {
  const rows = await entity('PlayerGameStats').filter({ game_id: payload.game_id });
  const players = await getEntities('Player');
  const playerMap = new Map(players.map(p => [p.id, p]));
  const totals = new Map();
  for (const row of rows) {
    const current = totals.get(row.player_id) || { ...row };
    for (const key of ['points','rebounds','assists','steals','blocks','fouls','three_pointers','field_goals_made','field_goals_attempted','free_throws_made','free_throws_attempted','aces','attacks','rally_errors']) current[key] = num(current[key]) + num(row[key]);
    totals.set(row.player_id, current);
  }
  return [...totals.values()]
    .map(row => ({ ...row, player_name: playerMap.get(row.player_id)?.name || playerMap.get(row.player_id)?.full_name || 'Unknown Player' }))
    .sort((a,b) => b.points - a.points || b.assists - a.assists || b.rebounds - a.rebounds);
};

const invokeLocal = async (name, payload = {}) => {
  if (name === 'updateGame') {
    const game = await entity('Game').get(payload.game_id);
    if (!game) throw new Error('Game not found');
    return { data: await entity('Game').update(payload.game_id, payload.patch || {}) };
  }
  if (name === 'getGamePlayerStats') {
    const ids = payload.game_ids || [];
    const rows = await entity('PlayerGameStats').filter({}, '-created_date');
    return { data: rows.filter(r => ids.includes(r.game_id)) };
  }
  if (name === 'upsertPlayerStat') {
    const rows = await entity('PlayerGameStats').filter({ game_id: payload.game_id, player_id: payload.player_id });
    const existing = rows.find(r => num(r.quarter) === num(payload.quarter));
    return { data: existing ? await entity('PlayerGameStats').update(existing.id, payload) : await entity('PlayerGameStats').create(payload) };
  }
  if (name === 'getDivisionStandings') return { data: await getDivisionStandings(payload) };
  if (name === 'getTopAssistLeaders') return { data: await getTopAssistLeaders(payload) };
  if (name === 'getTopPlayersForGame') return { data: await getTopPlayersForGame(payload) };
  if (name === 'recalcStandings') return { data: { success: true, independent: true, recalculated_at: new Date().toISOString() } };
  const { data, error } = await supabase.functions.invoke(name, { body: payload });
  if (error) throw error;
  return { data };
};

export const base44 = {
  entities: new Proxy({}, { get: (_target, name) => entity(name) }),
  auth,
  functions: { invoke: invokeLocal }
};
