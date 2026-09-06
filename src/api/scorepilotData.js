import { supabase } from '@/lib/supabaseClient';

const TABLES = {
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

const mapEntity = (name) => TABLES[name] || null;

const normalize = (name, row) => {
  if (!row) return row;
  if (name === 'Organization') return row;
  if (name === 'UserOrganization') return { ...row, organization_id: row.organization_id, user_id: row.user_id };
  return row;
};

const applyFilters = (query, filters = {}) => {
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null || value === '') continue;
    if (Array.isArray(value)) query = query.in(key, value);
    else query = query.eq(key, value);
  }
  return query;
};

const list = async (name, { filters = {}, sort, limit } = {}) => {
  const table = mapEntity(name);
  if (!table) throw new Error(`Unsupported entity: ${name}`);
  let query = supabase.from(table).select('*');
  query = applyFilters(query, filters);
  if (sort) {
    const desc = String(sort).startsWith('-');
    const field = desc ? String(sort).slice(1) : String(sort);
    query = query.order(field, { ascending: !desc });
  }
  if (typeof limit === 'number') query = query.limit(limit);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map((row) => normalize(name, row));
};

const get = async (name, id) => {
  const table = mapEntity(name);
  if (!table) throw new Error(`Unsupported entity: ${name}`);
  const { data, error } = await supabase.from(table).select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return normalize(name, data);
};

const create = async (name, payload) => {
  const table = mapEntity(name);
  if (!table) throw new Error(`Unsupported entity: ${name}`);
  const { data, error } = await supabase.from(table).insert(payload).select('*').single();
  if (error) throw error;
  return normalize(name, data);
};

const update = async (name, id, patch) => {
  const table = mapEntity(name);
  if (!table) throw new Error(`Unsupported entity: ${name}`);
  const { data, error } = await supabase.from(table).update(patch).eq('id', id).select('*').single();
  if (error) throw error;
  return normalize(name, data);
};

const remove = async (name, id) => {
  const table = mapEntity(name);
  if (!table) throw new Error(`Unsupported entity: ${name}`);
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) throw error;
  return { success: true };
};

const query = (name) => ({
  list: (sort, limit) => list(name, { sort, limit }),
  filter: (filters, sort, limit) => list(name, { filters, sort, limit }),
  get: (id) => get(name, id),
  create: (payload) => create(name, payload),
  update: (id, payload) => update(name, id, payload),
  delete: (id) => remove(name, id),
});

export const scorepilot = {
  tables: TABLES,
  entity: query,
  list,
  get,
  create,
  update,
  remove,
};

export { TABLES };
