import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Auth optional for read-only leaders; keep lightweight to support public dashboards
    try { await base44.auth.me(); } catch (_) {}

    let payload: any = {};
    try { payload = await req.json(); } catch (_) { payload = {}; }

    const organizationId: string | null = payload.organization_id || null;
    const limit: number = Math.max(1, Math.min(Number(payload.limit) || 10, 50));
    const sport: string = (payload.sport || 'basketball').toLowerCase();
    const division: string | null = payload.division ? String(payload.division).toLowerCase() : null;

    // Fetch only what we need with service role to avoid RLS/rate-limits
    const [teamsRaw, games] = await Promise.all([
      organizationId
        ? base44.asServiceRole.entities.Team.filter({ organization_id: organizationId, sport })
        : base44.asServiceRole.entities.Team.filter({ sport }),
      organizationId
        ? base44.asServiceRole.entities.Game.filter({ organization_id: organizationId, sport, status: 'completed' })
        : base44.asServiceRole.entities.Game.filter({ sport, status: 'completed' })
    ]);

    // Optional division filter (case-insensitive)
    const teams = (teamsRaw || []).filter((t: any) => {
      if (!division) return true;
      const div = (t.division || 'No Division').toString().toLowerCase();
      return div === division;
    });

    if (!teams || teams.length === 0 || !games || games.length === 0) {
      return Response.json({ leaders: [], count: 0, sport, organization_id: organizationId });
    }

    const teamIds = new Set(teams.map((t: any) => t.id));
    const completedGameIds: string[] = games.map((g: any) => g.id);

    // Pull stats per team to reduce request volume, then keep only completed games
    const completedSet = new Set(completedGameIds);
    const statChunks = await Promise.all(
      Array.from(teamIds).map((tid) => base44.asServiceRole.entities.PlayerGameStats.filter({ team_id: tid as string }))
    );
    const allStats = ([] as any[])
      .concat(...statChunks)
      .filter(s => completedSet.has(s.game_id));

    if (allStats.length === 0) {
      return Response.json({ leaders: [], count: 0, sport, organization_id: organizationId });
    }

    // Build player & team maps (service role to avoid client-side joins)
    const teamMap = new Map(teams.map((t: any) => [t.id, t]));

    // Get unique player IDs from stats, then fetch only those players
    const uniquePlayerIds = Array.from(new Set(allStats.map((s: any) => s.player_id)));
    const playerFetches = await Promise.all(
      uniquePlayerIds.map((pid) => base44.asServiceRole.entities.Player.filter({ id: pid }))
    );
    const players = playerFetches.map((arr) => arr?.[0]).filter(Boolean);
    const playerMap = new Map(players.map((p: any) => [p.id, p]));

    // Aggregate assists per player
    const agg: Map<string, { total_assists: number; games: Set<string> }> = new Map();
    for (const s of allStats) {
      const pid = s.player_id as string;
      if (!playerMap.has(pid)) continue;
      if (!agg.has(pid)) agg.set(pid, { total_assists: 0, games: new Set() });
      const rec = agg.get(pid)!;
      rec.total_assists += Number(s.assists || 0);
      rec.games.add(s.game_id);
    }

    // Build leaders response
    const leaders = Array.from(agg.entries())
      .map(([playerId, { total_assists, games }]) => {
        const player: any = playerMap.get(playerId);
        const team: any = teamMap.get(player?.team_id);
        const gamesPlayed = games.size;
        const apg = gamesPlayed > 0 ? Number((total_assists / gamesPlayed).toFixed(1)) : 0;
        return {
          player_id: playerId,
          first_name: player?.first_name,
          last_name: player?.last_name,
          jersey_number: player?.jersey_number || '',
          team_id: player?.team_id,
          team_name: team?.name || 'Unknown',
          team_logo_url: team?.logo_url || '',
          total_assists,
          games_played: gamesPlayed,
          apg,
          photo_url: player?.photo_url || ''
        };
      })
      .filter(p => p.total_assists > 0)
      .sort((a, b) => b.total_assists - a.total_assists)
      .slice(0, limit);

    return Response.json({ leaders, count: leaders.length, sport, division, organization_id: organizationId });
  } catch (error: any) {
    return Response.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
});