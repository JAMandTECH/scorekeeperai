import { supabase } from '@/lib/supabaseClient';

const ENTITY_TABLE = 'scorepilot_entities';

const sortRows = (rows, sort) => {
  if (!sort) return rows;
  const desc = sort.startsWith('-');
  const field = desc ? sort.slice(1) : sort;
  return [...rows].sort((a, b) => {
    const av = a[field] ?? '';
    const bv = b[field] ?? '';
    const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
    return desc ? -cmp : cmp;
  });
};

const matches = (row, filters = {}) => Object.entries(filters).every(([key, value]) => {
  if (Array.isArray(value)) return value.includes(row[key]);
  return row[key] === value;
});

const entity = (entityName) => ({
  async list(sort, limit) {
    let query = supabase.from(ENTITY_TABLE).select('*').eq('entity_type', entityName);
    const { data, error } = await query;
    if (error) throw error;
    let rows = (data || []).map(r => ({ ...r.data, id: r.id, created_date: r.created_at, updated_date: r.updated_at }));
    rows = sortRows(rows, sort);
    return typeof limit === 'number' ? rows.slice(0, limit) : rows;
  },
  async filter(filters = {}, sort, limit) {
    let query = supabase.from(ENTITY_TABLE).select('*').eq('entity_type', entityName);
    if (filters.organization_id) query = query.eq('organization_id', filters.organization_id);
    const { data, error } = await query;
    if (error) throw error;
    let rows = (data || []).map(r => ({ ...r.data, id: r.id, created_date: r.created_at, updated_date: r.updated_at }));
    rows = rows.filter(r => matches(r, filters));
    rows = sortRows(rows, sort);
    return typeof limit === 'number' ? rows.slice(0, limit) : rows;
  },
  async get(id) {
    const { data, error } = await supabase.from(ENTITY_TABLE).select('*').eq('entity_type', entityName).eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? { ...data.data, id: data.id, created_date: data.created_at, updated_date: data.updated_at } : null;
  },
  async create(payload) {
    const id = payload.id || crypto.randomUUID();
    const { data, error } = await supabase.from(ENTITY_TABLE).insert({
      id, entity_type: entityName, organization_id: payload.organization_id || null, data: payload
    }).select('*').single();
    if (error) throw error;
    return { ...data.data, id: data.id, created_date: data.created_at, updated_date: data.updated_at };
  },
  async update(id, payload) {
    const existing = await entity(entityName).get(id);
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

const auth = {
  async me() {
    const { data: { user: authUser }, error } = await supabase.auth.getUser();
    if (error) throw error;
    if (!authUser) throw Object.assign(new Error('Not authenticated'), { status: 401 });
    const { data: profile } = await supabase.from('scorepilot_profiles').select('*').eq('id', authUser.id).maybeSingle();
    return { id: authUser.id, email: authUser.email, ...(profile || {}) };
  },
  async logout() {
    await supabase.auth.signOut();
    window.location.assign('/');
  },
  redirectToLogin(returnUrl = window.location.href) {
    const target = `/login?returnUrl=${encodeURIComponent(returnUrl)}`;
    window.location.assign(target);
  }
};

export const base44 = {
  entities: new Proxy({}, { get: (_target, name) => entity(name) }),
  auth,
  functions: {
    async invoke(name, payload = {}) {
      const { data, error } = await supabase.functions.invoke(name, { body: payload });
      if (error) throw error;
      return data;
    }
  }
};
