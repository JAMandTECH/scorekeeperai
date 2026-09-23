import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';

const API_BASE = 'https://app.base44.com/api';

async function getEventNames(appId, token) {
  const res = await fetch(`${API_BASE}/apps/${appId}/analytics/names`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`analytics/names ${res.status}: ${text}`);
  }
  return res.json();
}

async function getGrouped(appId, token, eventName, field, startTime, endTime, maxGroups) {
  const res = await fetch(`${API_BASE}/apps/${appId}/analytics/grouped`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event_name: eventName,
      start_time: startTime,
      end_time: endTime,
      max_groups: maxGroups,
      metrics: [{ field, function: 'count', name: 'count' }],
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`analytics/grouped(${eventName},${field}) ${res.status}: ${text}`);
  }
  return res.json();
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin' || !user.is_super_admin) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const token = secrets.get('BASE44_PERSONAL_ACCESS_TOKEN');
    const appId = Deno.env.get('BASE44_APP_ID');
    if (!token) {
      return Response.json(
        { error: 'BASE44_PERSONAL_ACCESS_TOKEN secret not set. Create a personal access token (Workspace → Settings → Secrets → Personal access tokens) and add it as that secret.' },
        { status: 500 }
      );
    }
    if (!appId) return Response.json({ error: 'BASE44_APP_ID secret not set' }, { status: 500 });

    let days = 30;
    try {
      const body = await req.json();
      if (body && typeof body.days === 'number') days = body.days;
    } catch (_) {}
    days = Math.min(Math.max(days, 1), 60);

    const endTime = new Date().toISOString();
    const startTime = new Date(Date.now() - days * 86400000).toISOString();

    const [namesData, pagesData, countryData] = await Promise.all([
      getEventNames(appId, token),
      getGrouped(appId, token, 'page_view', 'page_url', startTime, endTime, 20),
      getGrouped(appId, token, 'page_view', 'metadata.country', startTime, endTime, 20),
    ]);

    const eventNames = namesData.event_names || [];
    const topPages = (pagesData.groups || []).map((g) => ({
      page: g.group || '(unknown)',
      count: g.metrics?.count || 0,
    }));
    const countryBreakdown = (countryData.groups || []).map((g) => ({
      country: g.group || 'Unknown',
      count: g.metrics?.count || 0,
    }));
    const totalEvents = eventNames.reduce((sum, e) => sum + (e.count || 0), 0);

    return Response.json({
      days,
      startTime,
      endTime,
      totals: { totalEvents, eventTypes: eventNames.length },
      topPages,
      countryBreakdown,
      eventNames,
    });
  } catch (error) {
    console.error('getAnalyticsData error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}