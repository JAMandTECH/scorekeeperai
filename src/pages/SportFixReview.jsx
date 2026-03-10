import React, { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export default function SportFixReview() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [games, setGames] = useState([]);
  const [teams, setTeams] = useState(new Map());
  const [selectedVB, setSelectedVB] = useState(new Set());
  const [result, setResult] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const me = await base44.auth.me();
        if (!mounted) return;
        setUser(me);
        if (!me) {
          setError('Please log in.');
          setLoading(false);
          return;
        }
        if (me.role !== 'admin' && !me.is_super_admin) {
          setError('Admins only.');
          setLoading(false);
          return;
        }
        const orgId = me.organization_id || me.active_organization_id;
        const gameList = await base44.entities.Game.filter({ organization_id: orgId, status: 'completed' });
        if (!mounted) return;
        setGames(gameList);
        const initialVB = new Set(gameList.filter(g => g.sport === 'volleyball').map(g => g.id));
        setSelectedVB(initialVB);

        const teamIds = Array.from(new Set(gameList.flatMap(g => [g.home_team_id, g.away_team_id]).filter(Boolean)));
        const fetched = [];
        for (let i = 0; i < teamIds.length; i += 50) {
          const ids = teamIds.slice(i, i + 50);
          const part = await base44.entities.Team.filter({ id: { $in: ids } });
          fetched.push(...part);
        }
        const map = new Map(fetched.map(t => [t.id, t]));
        setTeams(map);
      } catch (e) {
        setError(String(e?.message || e));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const toggleVB = (gameId) => {
    setSelectedVB(prev => {
      const n = new Set(prev);
      if (n.has(gameId)) n.delete(gameId); else n.add(gameId);
      return n;
    });
  };

  const volleyballCount = selectedVB.size;

  const rows = useMemo(() => {
    return games
      .slice()
      .sort((a,b) => new Date(a.game_date) - new Date(b.game_date))
      .map(g => {
        const home = teams.get(g.home_team_id)?.name || '—';
        const away = teams.get(g.away_team_id)?.name || '—';
        return { ...g, homeName: home, awayName: away };
      });
  }, [games, teams]);

  const applyFixes = async () => {
    try {
      setSubmitting(true);
      setError('');
      setResult(null);
      const orgId = user.organization_id || user.active_organization_id;
      // 1) Apply classification fixes (admin-only function)
      const res = await base44.functions.invoke('fixSportsClassification', {
        organization_id: orgId,
        volleyball_game_ids: Array.from(selectedVB),
        reclassify_completed_only: true,
      });

      // 2) Re-run basketball migration from the frontend (has user context)
      const mig = await base44.functions.invoke('migrateBasketballStats', {
        organization_id: orgId,
        dry_run: false,
      });

      setResult({
        ...res.data,
        migrateClientResult: mig.data,
      });
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-2 text-slate-600"><Loader2 className="h-5 w-5 animate-spin" /> Loading…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center gap-2 text-red-600"><AlertCircle className="h-5 w-5" /> {error}</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Fix Mixed-Up Sports</h1>
          <p className="text-sm text-slate-600">Select the completed games that are truly volleyball. All other completed games will be set to basketball. Teams in selected volleyball games will be set to volleyball; teams in other completed games to basketball. Then we will re-run the basketball migration automatically.</p>
        </div>
        <div className="text-sm text-slate-600">Selected volleyball games: <Badge variant="secondary">{volleyballCount}</Badge></div>
      </div>

      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-24">Volleyball?</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Division</TableHead>
              <TableHead>Home</TableHead>
              <TableHead></TableHead>
              <TableHead>Away</TableHead>
              <TableHead>Current Sport</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(g => (
              <TableRow key={g.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Checkbox checked={selectedVB.has(g.id)} onCheckedChange={() => toggleVB(g.id)} id={`chk-${g.id}`} />
                  </div>
                </TableCell>
                <TableCell>{g.game_date ? format(new Date(g.game_date), 'PPp') : '—'}</TableCell>
                <TableCell>{g.division || '—'}</TableCell>
                <TableCell className="font-medium">{g.homeName}</TableCell>
                <TableCell className="text-slate-400">vs</TableCell>
                <TableCell className="font-medium">{g.awayName}</TableCell>
                <TableCell>
                  {g.sport === 'volleyball' ? (
                    <Badge className="volleyball-gradient text-white">Volleyball</Badge>
                  ) : (
                    <Badge className="basketball-gradient text-white">Basketball</Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <Button onClick={applyFixes} disabled={submitting} className="gap-2">
          {submitting ? (<><Loader2 className="h-4 w-4 animate-spin" /> Applying fixes…</>) : (<><CheckCircle2 className="h-4 w-4" /> Apply fixes & re-run migration</>)}
        </Button>
      </div>

      {result && (
        <div className="mt-6 rounded-lg border p-4 bg-white">
          <h2 className="font-medium mb-2">Results</h2>
          <div className="text-sm text-slate-700 space-y-1">
            <div><span className="text-slate-500">Games updated:</span> {result?.updates?.gamesUpdated ?? 0}</div>
            <div><span className="text-slate-500">Teams updated:</span> {result?.updates?.teamsUpdated ?? 0}</div>
            <div><span className="text-slate-500">Migration:</span> {result?.migrateResult?.error ? `Error: ${result.migrateResult.error}` : 'Completed'}</div>
            {result?.migrateResult?.summary && (
              <pre className="mt-2 bg-slate-50 p-2 rounded text-xs overflow-auto">{JSON.stringify(result.migrateResult.summary, null, 2)}</pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
}