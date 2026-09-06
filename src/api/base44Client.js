import { supabase } from '@/lib/supabaseClient';

const ENTITY_TABLE = 'scorepilot_entities';

const normalize = r => ({ ...r.data, id: r.id, created_date: r.created_at, updated_date: r.updated_at });
const sortRows = (rows, sort) => {
  if (!sort) return rows;
  const desc = sort.startsWith('-');
  const field = desc ? sort.slice(1) : sort;
  return [...rows].sort((a, b) => {
    const cmp = String(a[field] ?? '').localeCompare(String(b[field] ?? ''), undefined, { numeric: true });
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

const invokeLocal = async (name, payload) => {
  if (name === 'updateGame') {
    const game = await entity('Game').get(payload.game_id);
    if (!game) throw new Error('Game not found');
    return { data: await entity('Game').update(payload.game_id, payload.patch || {}) };
  }
  if (name === 'getGamePlayerStats') {
    const ids = payload.game_ids || [];
    return { data: await entity('PlayerGameStats').filter({}, '-created_date').then(rows => rows.filter(r => ids.includes(r.game_id))) };
  }
  if (name === 'upsertPlayerStat') {
    const existing = (await entity('PlayerGameStats').filter({ game_id: payload.game_id, player_id: payload.player_id })).find(r => r.period === payload.quarter || r.quarter === payload.quarter);
    return { data: existing ? await entity('PlayerGameStats').update(existing.id, payload) : await entity('PlayerGameStats').create(payload) };
  }
  if (name === 'getDivisionStandings' || name === 'getTopAssistLeaders' || name === 'getTopPlayersForGame') {
    return { data: [] };
  }
  if (name === 'recalcStandings') {
    return { data: { success: true, independent: true } };
  }
  // Remaining server functions are intentionally routed through Supabase Edge Functions.
  const { data, error } = await supabase.functions.invoke(name, { body: payload });
  if (error) throw error;
  return { data };
};

export const base44 = {
  entities: new Proxy({}, { get: (_target, name) => entity(name) }),
  auth,
  functions: { invoke: invokeLocal }
};
