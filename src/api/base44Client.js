import { supabase } from '@/lib/supabaseClient';

const ENTITY_TABLE = 'scorepilot_entities';
const RELATIONAL_TABLES = {
  Organization: 'scorepilot_organizations',
  UserOrganization: 'scorepilot_memberships',
  Team: 'scorepilot_teams',
  Player: 'scorepilot_players',
  Division: 'scorepilot_divisions',
  Game: 'scorepilot_games',
  PlayerGameStats: 'scorepilot_player_game_stats',
  PlayerSeasonStats: 'scorepilot_player_season_stats',
  Notification: 'scorepilot_notifications',
};

const num = value => Number.isFinite(Number(value)) ? Number(value) : 0;
const toLegacy = (row) => row ? ({ ...row, created_date: row.created_at, updated_date: row.updated_at }) : row;
const sortRows = (rows, sort) => {
  if (!sort) return rows;
  const desc = String(sort).startsWith('-');
  const field = desc ? String(sort).slice(1) : String(sort);
  return [...rows].sort((a, b) => {
    const av = a[field]; const bv = b[field];
    if (typeof av === 'number' && typeof bv === 'number') return desc ? bv - av : av - bv;
    return desc ? String(bv ?? '').localeCompare(String(av ?? ''), undefined, { numeric: true, sensitivity: 'base' }) : String(av ?? '').localeCompare(String(bv ?? ''), undefined, { numeric: true, sensitivity: 'base' });
  });
};
const matches = (row, filters = {}) => Object.entries(filters).every(([key, value]) => {
  if (value === undefined || value === null || value === '') return true;
  return Array.isArray(value) ? value.includes(row[key]) : row[key] === value;
});

const directEntity = (entityName, table) => ({
  async list(sort, limit) {
    let query = supabase.from(table).select('*');
    if (sort) { const desc = String(sort).startsWith('-'); const field = desc ? String(sort).slice(1) : sort; query = query.order(field, { ascending: !desc }); }
    if (typeof limit === 'number') query = query.limit(limit);
    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(toLegacy);
  },
  async filter(filters = {}, sort, limit) {
    let query = supabase.from(table).select('*');
    for (const [key, value] of Object.entries(filters)) {
      if (value === undefined || value === null || value === '') continue;
      query = Array.isArray(value) ? query.in(key, value) : query.eq(key, value);
    }
    if (sort) { const desc = String(sort).startsWith('-'); const field = desc ? String(sort).slice(1) : sort; query = query.order(field, { ascending: !desc }); }
    if (typeof limit === 'number') query = query.limit(limit);
    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(toLegacy);
  },
  async get(id) {
    const { data, error } = await supabase.from(table).select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return toLegacy(data);
  },
  async create(payload) {
    const row = { ...payload };
    delete row.created_date; delete row.updated_date;
    const { data, error } = await supabase.from(table).insert(row).select('*').single();
    if (error) throw error;
    return toLegacy(data);
  },
  async update(id, payload) {
    const patch = { ...payload };
    delete patch.id; delete patch.created_date; delete patch.updated_date;
    const { data, error } = await supabase.from(table).update(patch).eq('id', id).select('*').single();
    if (error) throw error;
    return toLegacy(data);
  },
  async delete(id) {
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) throw error;
    return { success: true };
  }
});

const genericEntity = (entityName) => ({
  async list(sort, limit) {
    const { data, error } = await supabase.from(ENTITY_TABLE).select('*').eq('entity_type', entityName);
    if (error) throw error;
    const rows = sortRows((data || []).map(r => ({ ...r.data, id: r.id, created_date: r.created_at, updated_date: r.updated_at })), sort);
    return typeof limit === 'number' ? rows.slice(0, limit) : rows;
  },
  async filter(filters = {}, sort, limit) {
    let query = supabase.from(ENTITY_TABLE).select('*').eq('entity_type', entityName);
    if (filters.organization_id) query = query.eq('organization_id', filters.organization_id);
    const { data, error } = await query;
    if (error) throw error;
    const rows = sortRows((data || []).map(r => ({ ...r.data, id: r.id, created_date: r.created_at, updated_date: r.updated_at })).filter(r => matches(r, filters)), sort);
    return typeof limit === 'number' ? rows.slice(0, limit) : rows;
  },
  async get(id) {
    const { data, error } = await supabase.from(ENTITY_TABLE).select('*').eq('entity_type', entityName).eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? { ...data.data, id: data.id, created_date: data.created_at, updated_date: data.updated_at } : null;
  },
  async create(payload) {
    const id = payload.id || crypto.randomUUID();
    const { data, error } = await supabase.from(ENTITY_TABLE).insert({ id, entity_type: entityName, organization_id: payload.organization_id || null, created_by: payload.created_by || null, data: payload }).select('*').single();
    if (error) throw error;
    return { ...data.data, id: data.id, created_date: data.created_at, updated_date: data.updated_at };
  },
  async update(id, payload) {
    const existing = await genericEntity(entityName).get(id);
    if (!existing) throw new Error(`${entityName} ${id} not found`);
    const merged = { ...existing, ...payload, id };
    const { data, error } = await supabase.from(ENTITY_TABLE).update({ organization_id: merged.organization_id || null, data: merged }).eq('entity_type', entityName).eq('id', id).select('*').single();
    if (error) throw error;
    return { ...data.data, id: data.id, created_date: data.created_at, updated_date: data.updated_at };
  },
  async delete(id) {
    const { error } = await supabase.from(ENTITY_TABLE).delete().eq('entity_type', entityName).eq('id', id);
    if (error) throw error;
    return { success: true };
  }
});

const entity = entityName => RELATIONAL_TABLES[entityName] ? directEntity(entityName, RELATIONAL_TABLES[entityName]) : genericEntity(entityName);

const auth = {
  async me() {
    const { data: { user: authUser }, error } = await supabase.auth.getUser();
    if (error) throw error;
    if (!authUser) throw Object.assign(new Error('Not authenticated'), { status: 401 });
    const { data: profile } = await supabase.from('scorepilot_profiles').select('*').eq('id', authUser.id).maybeSingle();
    return { id: authUser.id, email: authUser.email, ...(profile || {}) };
  },
  async isAuthenticated() { const { data: { session } } = await supabase.auth.getSession(); return !!session; },
  async logout() { await supabase.auth.signOut(); window.location.assign('/'); },
  redirectToLogin(returnUrl = window.location.href) { window.location.assign(`/login?returnUrl=${encodeURIComponent(returnUrl)}`); }
};

const getEntities = async (name, filters = {}) => entity(name).filter(filters);

const getDivisionStandings = async payload => {
  const orgId = payload.orgId || payload.organization_id;
  if (!orgId) throw new Error('orgId is required');
  const sport = String(payload.sport || 'basketball').toLowerCase();
  const division = String(payload.division || '').trim().toLowerCase();
  const limit = Number(payload.limit || 200);
  const [teams, games] = await Promise.all([getEntities('Team', { organization_id: orgId, sport }), getEntities('Game', { organization_id: orgId, sport })]);
  const completed = games.filter(g => g.status === 'completed' && !g.archived && (g.game_type || 'regular_season') === 'regular_season');
  const byTeam = new Map(teams.map(t => [t.id, { ...t, wins: 0, losses: 0 }]));
  for (const game of completed) {
    const home = byTeam.get(game.home_team_id); const away = byTeam.get(game.away_team_id);
    if (!home || !away) continue;
    let homeWon = false; let awayWon = false;
    if (sport === 'volleyball') {
      let homeSets = 0; let awaySets = 0;
      for (const set of (Array.isArray(game.quarter_scores) ? game.quarter_scores : [])) { const h = num(set?.home); const a = num(set?.away); if (h > a) homeSets++; else if (a > h) awaySets++; }
      if (homeSets === awaySets) { homeWon = num(game.home_score) > num(game.away_score); awayWon = num(game.away_score) > num(game.home_score); }
      else { homeWon = homeSets > awaySets; awayWon = awaySets > homeSets; }
    } else { homeWon = num(game.home_score) > num(game.away_score); awayWon = num(game.away_score) > num(game.home_score); }
    if (homeWon) { home.wins++; away.losses++; } else if (awayWon) { away.wins++; home.losses++; }
  }
  let filtered = [...byTeam.values()];
  if (division) filtered = filtered.filter(t => String(t.division || '').toLowerCase().includes(division));
  filtered.sort((a, b) => (b.wins - a.wins) || (a.losses - b.losses) || String(a.name || '').localeCompare(String(b.name || '')));
  const organization = (await getEntities('Organization', { id: orgId }))[0] || null;
  return { organization: organization ? { id: organization.id, name: organization.name } : { id: orgId }, sport, division: payload.division || null, teams: filtered.slice(0, limit).map((t, idx) => { const gp = t.wins + t.losses; return { rank: idx + 1, team_id: t.id, name: t.name, division: t.division || '', wins: t.wins, losses: t.losses, win_pct: gp ? Number((t.wins / gp).toFixed(3)) : 0, logo_url: t.logo_url || null }; }), updated_at: new Date().toISOString() };
};

const getTopAssistLeaders = async payload => {
  const rows = await getEntities('PlayerGameStats');
  const players = await getEntities('Player'); const playerMap = new Map(players.map(p => [p.id, p])); const totals = new Map();
  for (const row of rows.filter(r => !payload.organization_id || players.find(p => p.id === r.player_id)?.organization_id === payload.organization_id)) { const current = totals.get(row.player_id) || { assists: 0, games: new Set(), points: 0 }; current.assists += num(row.assists); current.points += num(row.points); current.games.add(row.game_id); totals.set(row.player_id, current); }
  return [...totals.entries()].map(([player_id, v]) => ({ player_id, player_name: playerMap.get(player_id)?.name || playerMap.get(player_id)?.full_name || 'Unknown Player', assists: v.assists, games_played: v.games.size, points: v.points })).sort((a,b) => b.assists - a.assists || b.points - a.points).slice(0, Number(payload.limit || 10));
};

const getTopPlayersForGame = async payload => {
  const rows = await entity('PlayerGameStats').filter({ game_id: payload.game_id });
  const players = await getEntities('Player'); const playerMap = new Map(players.map(p => [p.id, p])); const totals = new Map();
  for (const row of rows) {
    const current = totals.get(row.player_id) || { player_id: row.player_id, team_id: row.team_id, game_id: row.game_id };
    for (const key of ['points','rebounds','assists','steals','blocks','fouls','three_pointers','field_goals_made','field_goals_attempted','free_throws_made','free_throws_attempted','aces','attacks','rally_errors']) current[key] = num(current[key]) + num(row[key]);
    totals.set(row.player_id, current);
  }
  return [...totals.values()].map(row => ({ ...row, player_name: playerMap.get(row.player_id)?.name || playerMap.get(row.player_id)?.full_name || 'Unknown Player' })).sort((a,b) => b.points - a.points || b.assists - a.assists || b.rebounds - a.rebounds);
};

const invokeLocal = async (name, payload = {}) => {
  if (name === 'updateGame') { const game = await entity('Game').get(payload.game_id); if (!game) throw new Error('Game not found'); return { data: await entity('Game').update(payload.game_id, payload.patch || {}) }; }
  if (name === 'getGamePlayerStats') { const ids = payload.game_ids || []; const rows = await entity('PlayerGameStats').filter({}, '-created_date'); return { data: rows.filter(r => ids.includes(r.game_id)) }; }
  if (name === 'upsertPlayerStat') { const rows = await entity('PlayerGameStats').filter({ game_id: payload.game_id, player_id: payload.player_id }); const existing = rows.find(r => num(r.quarter) === num(payload.quarter)); return { data: existing ? await entity('PlayerGameStats').update(existing.id, payload) : await entity('PlayerGameStats').create(payload) }; }
  if (name === 'getDivisionStandings') return { data: await getDivisionStandings(payload) };
  if (name === 'getTopAssistLeaders') return { data: await getTopAssistLeaders(payload) };
  if (name === 'getTopPlayersForGame') return { data: await getTopPlayersForGame(payload) };
  const { data, error } = await supabase.functions.invoke('scorepilot-functions', { body: { function: name, payload } });
  if (error) throw error;
  return { data };
};

export const base44 = {
  entities: new Proxy({}, { get: (_target, name) => entity(name) }),
  auth,
  functions: { invoke: invokeLocal }
};
