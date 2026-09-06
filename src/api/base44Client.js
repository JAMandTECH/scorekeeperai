import { supabase } from '@/lib/supabaseClient';

const ENTITY_TABLE = 'scorepilot_entities';

const num = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0);

const toLegacy = (row) => (row ? ({ ...row, created_date: row.created_at, updated_date: row.updated_at }) : row);

const sortRows = (rows, sort) => {
  if (!sort) return rows;
  const raw = String(sort);
  const desc = raw.startsWith('-');
  const field = desc ? raw.slice(1) : raw;
  return [...rows].sort((a, b) => {
    const av = a[field];
    const bv = b[field];
    if (typeof av === 'number' && typeof bv === 'number') return desc ? bv - av : av - bv;
    return desc
      ? String(bv ?? '').localeCompare(String(av ?? ''), undefined, { numeric: true, sensitivity: 'base' })
      : String(av ?? '').localeCompare(String(bv ?? ''), undefined, { numeric: true, sensitivity: 'base' });
  });
};

const matches = (row, filters = {}) => Object.entries(filters).every(([key, value]) => {
  if (value === undefined || value === null || value === '') return true;
  return Array.isArray(value) ? value.includes(row[key]) : row[key] === value;
});

const mapEntityRow = (row) => (row
  ? { ...row.data, id: row.id, created_date: row.created_at, updated_date: row.updated_at }
  : null);

const makeSubscription = (filters, entityName, callback) => {
  const pairs = Object.entries(filters || {}).filter(([, value]) => value !== undefined && value !== null && value !== '');
  let channel = supabase.channel(`scorepilot:${entityName}:${crypto.randomUUID()}`);
  channel = channel.on(
    'postgres_changes',
    { event: '*', schema: 'public', table: ENTITY_TABLE },
    (payload) => {
      const source = payload.new && Object.keys(payload.new).length ? payload.new : payload.old;
      if (!source || source.entity_type !== entityName) return;
      const row = mapEntityRow(source);
      if (!row || !matches(row, Object.fromEntries(pairs.filter(([k]) => k !== 'entity_type')))) return;
      callback({
        type: String(payload.eventType || '').toLowerCase(),
        event: payload.eventType,
        id: row.id,
        data: row,
      });
    },
  ).subscribe();
  return () => supabase.removeChannel(channel);
};

const genericEntity = (entityName) => ({
  async list(sort, limit) {
    let query = supabase.from(ENTITY_TABLE).select('*').eq('entity_type', entityName);
    const { data, error } = await query;
    if (error) throw error;
    const rows = sortRows((data || []).map(mapEntityRow), sort);
    return typeof limit === 'number' ? rows.slice(0, limit) : rows;
  },

  async filter(filters = {}, sort, limit) {
    let query = supabase.from(ENTITY_TABLE).select('*').eq('entity_type', entityName);
    if (filters.organization_id) query = query.eq('organization_id', filters.organization_id);
    const { data, error } = await query;
    if (error) throw error;
    const rows = sortRows((data || []).map(mapEntityRow).filter((row) => matches(row, filters)), sort);
    return typeof limit === 'number' ? rows.slice(0, limit) : rows;
  },

  async get(id) {
    const { data, error } = await supabase
      .from(ENTITY_TABLE)
      .select('*')
      .eq('entity_type', entityName)
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return mapEntityRow(data);
  },

  async create(payload) {
    const id = payload.id || crypto.randomUUID();
    const clean = { ...payload };
    delete clean.created_date;
    delete clean.updated_date;
    const { data, error } = await supabase.from(ENTITY_TABLE).insert({
      id,
      entity_type: entityName,
      organization_id: clean.organization_id || null,
      created_by: clean.created_by || null,
      data: clean,
    }).select('*').single();
    if (error) throw error;
    return mapEntityRow(data);
  },

  async update(id, payload) {
    const existing = await genericEntity(entityName).get(id);
    if (!existing) throw new Error(`${entityName} ${id} not found`);
    const merged = { ...existing, ...payload, id };
    delete merged.created_date;
    delete merged.updated_date;
    const { data, error } = await supabase.from(ENTITY_TABLE).update({
      organization_id: merged.organization_id || null,
      data: merged,
    }).eq('entity_type', entityName).eq('id', id).select('*').single();
    if (error) throw error;
    return mapEntityRow(data);
  },

  async delete(id) {
    const { error } = await supabase.from(ENTITY_TABLE).delete().eq('entity_type', entityName).eq('id', id);
    if (error) throw error;
    return { success: true };
  },

  subscribe(callback, filters = {}) {
    return makeSubscription(filters, entityName, callback);
  },
});

const entity = (entityName) => genericEntity(entityName);
const getEntities = async (name, filters = {}) => entity(name).filter(filters);

const auth = {
  async me() {
    const { data: { user: authUser }, error } = await supabase.auth.getUser();
    if (error) throw error;
    if (!authUser) throw Object.assign(new Error('Not authenticated'), { status: 401 });
    const { data: profile, error: profileError } = await supabase
      .from('scorepilot_profiles')
      .select('*')
      .eq('id', authUser.id)
      .maybeSingle();
    if (profileError) throw profileError;
    return { id: authUser.id, email: authUser.email, ...(profile || {}) };
  },

  async isAuthenticated() {
    const { data: { session } } = await supabase.auth.getSession();
    return !!session;
  },

  async logout() {
    await supabase.auth.signOut();
    window.location.assign('/');
  },

  redirectToLogin(returnUrl = window.location.href) {
    window.location.assign(`/login?returnUrl=${encodeURIComponent(returnUrl)}`);
  },
};

const calculateStandings = async (payload = {}) => {
  const orgId = payload.orgId || payload.organization_id;
  if (!orgId) throw new Error('orgId is required');
  const sport = String(payload.sport || 'basketball').toLowerCase();
  const division = String(payload.division || '').trim().toLowerCase();
  const limit = Number(payload.limit || 200);

  const [teams, games] = await Promise.all([
    getEntities('Team', { organization_id: orgId }),
    getEntities('Game', { organization_id: orgId }),
  ]);

  const scopedTeams = teams.filter((team) => !team.sport || String(team.sport).toLowerCase() === sport);
  const completed = games.filter((game) => (
    String(game.status || '').toLowerCase() === 'completed'
    && !game.archived
    && String(game.game_type || 'regular_season') === 'regular_season'
    && String(game.sport || sport).toLowerCase() === sport
  ));

  const table = new Map(scopedTeams.map((team) => [team.id, { ...team, wins: 0, losses: 0 }]));
  completed.forEach((game) => {
    const home = table.get(game.home_team_id);
    const away = table.get(game.away_team_id);
    if (!home || !away) return;

    let homeWon = false;
    let awayWon = false;
    if (sport === 'volleyball') {
      let homeSets = 0;
      let awaySets = 0;
      for (const set of Array.isArray(game.quarter_scores) ? game.quarter_scores : []) {
        const hs = num(set?.home);
        const as = num(set?.away);
        if (hs > as) homeSets += 1;
        if (as > hs) awaySets += 1;
      }
      if (homeSets !== awaySets) {
        homeWon = homeSets > awaySets;
        awayWon = awaySets > homeSets;
      } else {
        homeWon = num(game.home_score) > num(game.away_score);
        awayWon = num(game.away_score) > num(game.home_score);
      }
    } else {
      homeWon = num(game.home_score) > num(game.away_score);
      awayWon = num(game.away_score) > num(game.home_score);
    }

    if (homeWon) {
      home.wins += 1;
      away.losses += 1;
    } else if (awayWon) {
      away.wins += 1;
      home.losses += 1;
    }
  });

  let rows = [...table.values()];
  if (division) rows = rows.filter((team) => String(team.division || '').toLowerCase().includes(division));
  rows.sort((a, b) => (b.wins - a.wins) || (a.losses - b.losses) || String(a.name || '').localeCompare(String(b.name || '')));

  const org = (await getEntities('Organization', { id: orgId }))[0] || null;
  return {
    organization: org ? { id: org.id, name: org.name } : { id: orgId },
    sport,
    division: payload.division || null,
    teams: rows.slice(0, limit).map((team, index) => {
      const gp = team.wins + team.losses;
      return {
        rank: index + 1,
        team_id: team.id,
        name: team.name,
        division: team.division || '',
        wins: team.wins,
        losses: team.losses,
        win_pct: gp ? Number((team.wins / gp).toFixed(3)) : 0,
        logo_url: team.logo_url || null,
      };
    }),
    updated_at: new Date().toISOString(),
  };
};

const recalcStandings = async (payload = {}) => {
  const orgId = payload.organization_id || payload.orgId;
  if (!orgId) throw new Error('organization_id is required');
  const [teams, basketball, volleyball] = await Promise.all([
    getEntities('Team', { organization_id: orgId }),
    calculateStandings({ organization_id: orgId, sport: 'basketball', limit: 10000 }),
    calculateStandings({ organization_id: orgId, sport: 'volleyball', limit: 10000 }),
  ]);
  const byId = new Map([...basketball.teams, ...volleyball.teams].map((row) => [row.team_id, row]));
  let updated = 0;
  for (const team of teams) {
    const current = byId.get(team.id);
    const wins = current?.wins ?? 0;
    const losses = current?.losses ?? 0;
    if (num(team.wins) !== wins || num(team.losses) !== losses) {
      await entity('Team').update(team.id, { wins, losses });
      updated += 1;
    }
  }
  return { success: true, updated, teams: teams.length };
};

const getTopAssistLeaders = async (payload = {}) => {
  const [stats, players] = await Promise.all([
    getEntities('PlayerGameStats'),
    getEntities('Player'),
  ]);
  const playerById = new Map(players.map((player) => [player.id, player]));
  const totals = new Map();
  for (const row of stats) {
    const player = playerById.get(row.player_id);
    if (payload.organization_id && player?.organization_id !== payload.organization_id) continue;
    const entry = totals.get(row.player_id) || { assists: 0, points: 0, games: new Set() };
    entry.assists += num(row.assists);
    entry.points += num(row.points);
    if (row.game_id) entry.games.add(row.game_id);
    totals.set(row.player_id, entry);
  }
  return [...totals.entries()]
    .map(([player_id, value]) => ({
      player_id,
      player_name: playerById.get(player_id)?.name || playerById.get(player_id)?.full_name || 'Unknown Player',
      assists: value.assists,
      games_played: value.games.size,
      points: value.points,
    }))
    .sort((a, b) => b.assists - a.assists || b.points - a.points)
    .slice(0, Number(payload.limit || 10));
};

const getTopPlayersForGame = async (payload = {}) => {
  const rows = await entity('PlayerGameStats').filter({ game_id: payload.game_id });
  const players = await getEntities('Player');
  const playerById = new Map(players.map((player) => [player.id, player]));
  const totals = new Map();
  const statKeys = ['points', 'rebounds', 'assists', 'steals', 'blocks', 'fouls', 'three_pointers', 'field_goals_made', 'field_goals_attempted', 'free_throws_made', 'free_throws_attempted', 'aces', 'attacks', 'rally_errors'];
  for (const row of rows) {
    const entry = totals.get(row.player_id) || { player_id: row.player_id, team_id: row.team_id, game_id: row.game_id };
    statKeys.forEach((key) => { entry[key] = num(entry[key]) + num(row[key]); });
    totals.set(row.player_id, entry);
  }
  return [...totals.values()]
    .map((row) => ({ ...row, player_name: playerById.get(row.player_id)?.name || playerById.get(row.player_id)?.full_name || 'Unknown Player' }))
    .sort((a, b) => b.points - a.points || b.assists - a.assists || b.rebounds - a.rebounds);
};

const invokeLocal = async (name, payload = {}) => {
  switch (name) {
    case 'updateGame': {
      const game = await entity('Game').get(payload.game_id);
      if (!game) throw new Error('Game not found');
      return { data: await entity('Game').update(payload.game_id, payload.patch || {}) };
    }
    case 'getGamePlayerStats': {
      const ids = payload.game_ids || [];
      const rows = await entity('PlayerGameStats').filter({});
      return { data: rows.filter((row) => ids.includes(row.game_id)) };
    }
    case 'upsertPlayerStat': {
      const rows = await entity('PlayerGameStats').filter({ game_id: payload.game_id, player_id: payload.player_id });
      const existing = rows.find((row) => num(row.quarter) === num(payload.quarter));
      return { data: existing ? await entity('PlayerGameStats').update(existing.id, payload) : await entity('PlayerGameStats').create(payload) };
    }
    case 'getDivisionStandings':
      return { data: await calculateStandings(payload) };
    case 'getTopAssistLeaders':
      return { data: await getTopAssistLeaders(payload) };
    case 'getTopPlayersForGame':
      return { data: await getTopPlayersForGame(payload) };
    case 'recalcStandings':
      return { data: await recalcStandings(payload) };
    default: {
      const route = name === 'geminiChat' ? 'gemini-chat' : name === 'cancelPayPalSubscription' ? 'paypal-cancel-subscription' : 'scorepilot-functions';
      const body = route === 'scorepilot-functions' ? { function: name, payload } : payload;
      const { data, error } = await supabase.functions.invoke(route, { body });
      if (error) throw error;
      return { data };
    }
  }
};

export const base44 = {
  entities: new Proxy({}, { get: (_target, name) => entity(name) }),
  auth,
  functions: { invoke: invokeLocal },
};
