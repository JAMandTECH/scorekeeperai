import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import StandingsWidget from '@/components/widgets/StandingsWidget';

export default function WidgetStandings() {
  const [data, setData] = React.useState(null);
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(true);

  const params = new URLSearchParams(window.location.search);
  const org = params.get('org') || params.get('organization_id') || '';
  const sport = (params.get('sport') || 'basketball').toLowerCase();
  const division = params.get('division') || '';
  const customTitle = params.get('title') || '';

  React.useEffect(() => {
    let timer;
    const load = async () => {
      if (!org) { setError('Missing org parameter'); setLoading(false); return; }
      try {
        const res = await base44.functions.invoke('getDivisionStandings', { orgId: org, sport, division });
        setData(res.data);
        setError('');
      } catch (e) {
        const msg = e?.response?.data?.error || e.message || 'Failed to load standings';
        setError(String(msg));
      } finally {
        setLoading(false);
      }
    };
    load();
    // Auto-refresh every 60s for live updates
    timer = setInterval(load, 60000);
    return () => { if (timer) clearInterval(timer); };
  }, [org, sport, division]);

  const title = customTitle || (
    data ? `${data?.organization?.name || ''}${data?.division ? ' • ' + data.division : ''} • ${data?.sport?.charAt(0).toUpperCase() + data?.sport?.slice(1)} Standings` : ''
  );

  return (
    <div className="p-4">
      {loading && <div className="text-sm text-muted-foreground">Loading standings…</div>}
      {!loading && error && (
        <div className="text-sm text-destructive">{error}</div>
      )}
      {!loading && !error && (
        <StandingsWidget title={title} teams={data?.teams || []} />
      )}
    </div>
  );
}