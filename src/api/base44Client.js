import { supabase } from '@/lib/supabaseClient';

const ENTITY_TABLE = 'scorepilot_entities';
const MEDIA_BUCKET = 'scorepilot-media';

const RELATIONAL_ENTITIES = {
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

const RELATIONAL_COLUMNS = {
  scorepilot_organizations: ['id', 'name', 'slug', 'logo_url', 'settings', 'created_by', 'created_at', 'updated_at'],
  scorepilot_memberships: ['id', 'organization_id', 'user_id', 'role', 'permissions', 'created_at', 'updated_at'],
  scorepilot_teams: ['id', 'organization_id', 'name', 'sport', 'division', 'coach_name', 'coach_contact', 'logo_url', 'status', 'wins', 'losses', 'submitted_by', 'created_at', 'updated_at'],
  scorepilot_players: ['id', 'organization_id', 'team_id', 'name', 'jersey_number', 'email', 'phone', 'position', 'photo_url', 'status', 'metadata', 'created_at', 'updated_at'],
  scorepilot_divisions: ['id', 'organization_id', 'name', 'sport', 'season', 'settings', 'created_at', 'updated_at'],
  scorepilot_games: ['id', 'organization_id', 'division_id', 'home_team_id', 'away_team_id', 'sport', 'game_date', 'court_number', 'duration_hours', 'location', 'status', 'archived', 'game_type', 'assigned_scorekeeper_emails', 'overall_scorekeeper_email', 'home_statistician_email', 'away_statistician_email', 'recurring_series_id', 'week_number', 'division', 'home_score', 'away_score', 'quarter_scores', 'current_quarter', 'overtime_count', 'home_timeouts', 'away_timeouts', 'home_team_fouls', 'away_team_fouls', 'penalty_limit_per_quarter', 'player_foul_limit', 'stream_url', 'notes', 'is_default', 'defaulted_team_id', 'winning_team_id', 'created_by', 'created_at', 'updated_at'],
  scorepilot_player_game_stats: ['id', 'game_id', 'player_id', 'team_id', 'quarter', 'points', 'rebounds', 'assists', 'steals', 'blocks', 'fouls', 'three_pointers', 'field_goals_made', 'field_goals_attempted', 'free_throws_made', 'free_throws_attempted', 'aces', 'attacks', 'rally_errors', 'created_at', 'updated_at'],
  scorepilot_player_season_stats: ['id', 'organization_id', 'season', 'player_id', 'team_id', 'sport', 'games_played', 'points', 'rebounds', 'assists', 'steals', 'blocks', 'fouls', 'three_pointers', 'field_goals_made', 'field_goals_attempted', 'free_throws_made', 'free_throws_attempted', 'aces', 'attacks', 'rally_errors', 'created_at', 'updated_at'],
  scorepilot_notifications: ['id', 'organization_id', 'user_id', 'type', 'title', 'message', 'data', 'read_at', 'created_at'],
};

const num = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0);

const sortRows = (rows, sort) => {
  if (!sort) return rows;
  const raw = String(sort);
  const desc = raw.startsWith('-');
  const field = desc ? raw.slice(1) : raw;
  return [...rows].sort((a, b) => {
    const av = a?.[field];
    const bv = b?.[field];
    if (typeof av === 'number' && typeof bv === 'number') return desc ? bv - av : av - bv;
    const result = String(av ?? '').localeCompare(String(bv ?? ''), undefined, { numeric: true, sensitivity: 'base' });
    return desc ? -result : result;
  });
};

const matches = (row, filters = {}) => Object.entries(filters).every(([key, value]) => {
  if (value === undefined || value === null || value === '') return true;
  return Array.isArray(value) ? value.includes(row?.[key]) : row?.[key] === value;
});

const mapGenericRow = (row) => (
  row ? { ...row.data, id: row.id, created_date: row.created_at, updated_date: row.updated_at } : null
);

const mapRelationalRow = (row, table) => {
  if (!row) return null;
  const result = { ...row, created_date: row.created_at, updated_date: row.updated_at };
  // Preserve unknown legacy fields in a nested object where the relational schema supports one.
  if (table === 'scorepilot_organizations') result.theme = result.settings?.theme ?? result.theme;
  if (table === 'scorepilot_players') result.metadata = result.metadata || {};
  return result;
};

const cleanRelationalPayload = (table, payload = {}) => {
  const allowed = new Set(RELATIONAL_COLUMNS[table] || []);
  const clean = {};
  for (const [key, value] of Object.entries(payload)) {
    if (allowed.has(key) && !['created_date', 'updated_date', 'created_at', 'updated_at'].includes(key)) clean[key] = value;
  }
  if (table === 'scorepilot_organizations' && payload.theme) {
    clean.settings = { ...(clean.settings || {}), theme: payload.theme };
  }
  return clean;
};

const makeSubscription = (filters, entityName, callback) => {
  const channel = supabase
    .channel(`scorepilot:${entityName}:${crypto.randomUUID()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: RELATIONAL_ENTITIES[entityName] || ENTITY_TABLE }, (payload) => {
      const table = RELATIONAL_ENTITIES[entityName];
      const source = payload.new && Object.keys(payload.new).length ? payload.new : payload.old;
      const row = table ? mapRelationalRow(source, table) : mapGenericRow(source);
      if (!row || !matches(row, filters)) return;
      callback({
        type: String(payload.eventType || '').toLowerCase(),
        event: payload.eventType,
        id: row.id,
        data: row,
      });
    })
    .subscribe();
  return () => supabase.removeChannel(channel);
};

const relationalEntity = (entityName, table) => ({
  async list(sort, limit) {
    const { data, error } = await supabase.from(table).select('*');
    if (error) throw error;
    const rows = sortRows((data || []).map((row) => mapRelationalRow(row, table)), sort);
    return typeof limit === 'number' ? rows.slice(0, limit) : rows;
  },
  async filter(filters = {}, sort, limit) {
    let query = supabase.from(table).select('*');
    const relationalKeys = new Set(RELATIONAL_COLUMNS[table] || []);
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null && value !== '' && relationalKeys.has(key)) {
        if (Array.isArray(value)) query = query.in(key, value);
        else query = query.eq(key, value);
      }
    }
    const { data, error } = await query;
    if (error) throw error;
    const rows = sortRows((data || []).map((row) => mapRelationalRow(row, table)).filter((row) => matches(row, filters)), sort);
    return typeof limit === 'number' ? rows.slice(0, limit) : rows;
  },
  async get(id) {
    const { data, error } = await supabase.from(table).select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return mapRelationalRow(data, table);
  },
  async create(payload) {
    const clean = cleanRelationalPayload(table, payload);
    if (payload.id) clean.id = payload.id;
    const { data, error } = await supabase.from(table).insert(clean).select('*').single();
    if (error) throw error;
    return mapRelationalRow(data, table);
  },
  async update(id, payload) {
    const clean = cleanRelationalPayload(table, payload);
    const { data, error } = await supabase.from(table).update(clean).eq('id', id).select('*').single();
    if (error) throw error;
    return mapRelationalRow(data, table);
  },
  async delete(id) {
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) throw error;
    return { success: true };
  },
  subscribe(callback, filters = {}) {
    return makeSubscription(filters, entityName, callback);
  },
});

const genericEntity = (entityName) => ({
  async list(sort, limit) {
    let query = supabase.from(ENTITY_TABLE).select('*').eq('entity_type', entityName);
    const { data, error } = await query;
    if (error) throw error;
    const rows = sortRows((data || []).map(mapGenericRow), sort);
    return typeof limit === 'number' ? rows.slice(0, limit) : rows;
  },
  async filter(filters = {}, sort, limit) {
    let query = supabase.from(ENTITY_TABLE).select('*').eq('entity_type', entityName);
    if (filters.organization_id) query = query.eq('organization_id', filters.organization_id);
    const { data, error } = await query;
    if (error) throw error;
    const rows = sortRows((data || []).map(mapGenericRow).filter((row) => matches(row, filters)), sort);
    return typeof limit === 'number' ? rows.slice(0, limit) : rows;
  },
  async get(id) {
    const { data, error } = await supabase.from(ENTITY_TABLE).select('*').eq('entity_type', entityName).eq('id', id).maybeSingle();
    if (error) throw error;
    return mapGenericRow(data);
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
    return mapGenericRow(data);
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
    return mapGenericRow(data);
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

const entity = (entityName) => {
  const table = RELATIONAL_ENTITIES[entityName];
  return table ? relationalEntity(entityName, table) : genericEntity(entityName);
};

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

const callEdgeFunction = async (name, payload = {}) => {
  const { data, error } = await supabase.functions.invoke('scorepilot-functions', {
    body: { function: name, payload },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data?.data ?? data;
};

const calculateStandings = async (payload = {}) => {
  const orgId = payload.orgId || payload.organization_id;
  if (!orgId) throw new Error('orgId is required');
  const sport = String(payload.sport || 'basketball').toLowerCase();
  const division = String(payload.division || '').trim().toLowerCase();
  const teams = await entity('Team').filter({ organization_id: orgId });
  const games = await entity('Game').filter({ organization_id: orgId, status: 'completed' });
  const scopedTeams = teams.filter((team) => !team.sport || String(team.sport).toLowerCase() === sport);
  const completed = games.filter((game) => !game.archived && String(game.game_type || 'regular_season') === 'regular_season' && String(game.sport || sport).toLowerCase() === sport);
  const table = new Map(scopedTeams.map((team) => [team.id, { ...team, wins: 0, losses: 0 }]));
  for (const game of completed) {
    const home = table.get(game.home_team_id); const away = table.get(game.away_team_id); if (!home || !away) continue;
    let homeWon = false; let awayWon = false;
    if (sport === 'volleyball') {
      let homeSets = 0; let awaySets = 0;
      for (const set of Array.isArray(game.quarter_scores) ? game.quarter_scores : []) {
        const hs = num(set?.home); const as = num(set?.away);
        if (hs > as) homeSets += 1; else if (as > hs) awaySets += 1;
      }
      if (homeSets !== awaySets) { homeWon = homeSets > awaySets; awayWon = awaySets > homeSets; }
      else { homeWon = num(game.home_score) > num(game.away_score); awayWon = num(game.away_score) > num(game.home_score); }
    } else { homeWon = num(game.home_score) > num(game.away_score); awayWon = num(game.away_score) > num(game.home_score); }
    if (homeWon) { home.wins += 1; away.losses += 1; }
    else if (awayWon) { away.wins += 1; home.losses += 1; }
  }
  let rows = [...table.values()];
  if (division) rows = rows.filter((team) => String(team.division || '').toLowerCase().includes(division));
  rows.sort((a, b) => (b.wins - a.wins) || (a.losses - b.losses) || String(a.name || '').localeCompare(String(b.name || '')));
  return {
    organization: { id: orgId },
    sport,
    division: payload.division || null,
    teams: rows.slice(0, Number(payload.limit || 200)).map((team, index) => ({
      rank: index + 1,
      team_id: team.id,
      name: team.name,
      division: team.division || '',
      wins: team.wins,
      losses: team.losses,
      win_pct: team.wins + team.losses ? Number((team.wins / (team.wins + team.losses)).toFixed(3)) : 0,
      logo_url: team.logo_url || null,
    })),
    updated_at: new Date().toISOString(),
  };
};

const getTopAssistLeadersLocal = async (payload = {}) => {
  const [stats, players] = await Promise.all([getEntities('PlayerSeasonStats'), getEntities('Player')]);
  const playerById = new Map(players.map((player) => [player.id, player]));
  return stats
    .filter((row) => !payload.organization_id || row.organization_id === payload.organization_id)
    .sort((a, b) => num(b.assists) - num(a.assists) || num(b.points) - num(a.points))
    .slice(0, Number(payload.limit || 10))
    .map((row) => ({ ...row, player_name: playerById.get(row.player_id)?.name || 'Unknown Player' }));
};

const getTopPlayersForGameLocal = async (payload = {}) => {
  const rows = await entity('PlayerGameStats').filter({ game_id: payload.game_id });
  const players = await getEntities('Player');
  const playerById = new Map(players.map((player) => [player.id, player]));
  const totals = new Map();
  const statKeys = ['points', 'rebounds', 'assists', 'steals', 'blocks', 'fouls', 'three_pointers', 'field_goals_made', 'field_goals_attempted', 'free_throws_made', 'free_throws_attempted', 'aces', 'attacks', 'rally_errors'];
  for (const row of rows) {
    const entry = totals.get(row.player_id) || { player_id: row.player_id, team_id: row.team_id, game_id: row.game_id };
    for (const key of statKeys) entry[key] = num(entry[key]) + num(row[key]);
    totals.set(row.player_id, entry);
  }
  return [...totals.values()]
    .map((row) => ({ ...row, player_name: playerById.get(row.player_id)?.name || 'Unknown Player' }))
    .sort((a, b) => num(b.points) - num(a.points) || num(b.assists) - num(a.assists) || num(b.rebounds) - num(a.rebounds));
};

const uploadFile = async ({ file, path, bucket = MEDIA_BUCKET } = {}) => {
  if (!file) throw new Error('file is required');
  const safeName = String(file.name || 'upload').replace(/[^a-zA-Z0-9._-]/g, '_');
  const objectPath = path || `${crypto.randomUUID()}-${safeName}`;
  const { error } = await supabase.storage.from(bucket).upload(objectPath, file, { upsert: true, contentType: file.type || undefined });
  if (error) throw error;
  const { data } = supabase.storage.from(bucket).getPublicUrl(objectPath);
  return { file_url: data.publicUrl, file_uri: `${bucket}/${objectPath}`, path: objectPath, bucket };
};

const createFileSignedUrl = async ({ file_uri, expires_in = 300, bucket = MEDIA_BUCKET } = {}) => {
  if (!file_uri) throw new Error('file_uri is required');
  const [uriBucket, ...rest] = String(file_uri).split('/');
  const objectPath = uriBucket === bucket ? rest.join('/') : String(file_uri);
  const { data, error } = await supabase.storage.from(uriBucket === bucket ? bucket : MEDIA_BUCKET).createSignedUrl(objectPath, Number(expires_in));
  if (error) throw error;
  return { signed_url: data.signedUrl, file_url: data.signedUrl };
};

const invokeLLM = async (params = {}) => {
  const result = await callEdgeFunction('geminiChat', params);
  return result?.output ?? result;
};

const integrations = {
  Core: {
    InvokeLLM: invokeLLM,
    UploadFile: uploadFile,
    CreateFileSignedUrl: createFileSignedUrl,
    GenerateImage: async () => {
      throw new Error('Image generation is not configured yet. Configure an image provider in Supabase Edge Functions.');
    },
    SendEmail: async () => {
      throw new Error('Email delivery is not configured yet. Configure Resend or another provider in Supabase Edge Functions.');
    },
    SendSMS: async () => {
      throw new Error('SMS delivery is not configured yet. Configure Twilio or another provider in Supabase Edge Functions.');
    },
    ExtractDataFromUploadedFile: async ({ file_url } = {}) => {
      if (!file_url) throw new Error('file_url is required');
      const response = await fetch(file_url);
      if (!response.ok) throw new Error(`Unable to fetch uploaded file (${response.status})`);
      const text = await response.text();
      return { status: 'success', output: text.slice(0, 100000), text };
    },
  },
};

const invokeLocal = async (name, payload = {}) => {
  switch (name) {
    case 'updateGame':
      return { data: await entity('Game').update(payload.game_id, payload.patch || {}) };
    case 'getGamePlayerStats': {
      const ids = payload.game_ids || [];
      const rows = await entity('PlayerGameStats').filter({});
      return { data: ids.length ? rows.filter((row) => ids.includes(row.game_id)) : rows };
    }
    case 'upsertPlayerStat': {
      const rows = await entity('PlayerGameStats').filter({ game_id: payload.game_id, player_id: payload.player_id });
      const existing = rows.find((row) => num(row.quarter) === num(payload.quarter));
      return { data: existing ? await entity('PlayerGameStats').update(existing.id, payload) : await entity('PlayerGameStats').create(payload) };
    }
    case 'getDivisionStandings':
      try { return { data: await callEdgeFunction('getDivisionStandings', payload) }; } catch (_) { return { data: await calculateStandings(payload) }; }
    case 'getTopAssistLeaders':
      try { return { data: await callEdgeFunction('getTopAssistLeaders', payload) }; } catch (_) { return { data: await getTopAssistLeadersLocal(payload) }; }
    case 'getTopPlayersForGame':
      try { return { data: await callEdgeFunction('getTopPlayersForGame', payload) }; } catch (_) { return { data: await getTopPlayersForGameLocal(payload) }; }
    case 'recalcStandings':
      return { data: await callEdgeFunction('recalcStandings', payload) };
    case 'aggregatePlayerStats':
    case 'onGameCompletedAggregate':
      return { data: await callEdgeFunction(name, payload) };
    default:
      return { data: await callEdgeFunction(name, payload) };
  }
};

export const base44 = {
  entities: new Proxy({}, { get: (_target, name) => entity(name) }),
  auth,
  integrations,
  functions: { invoke: invokeLocal },
};
