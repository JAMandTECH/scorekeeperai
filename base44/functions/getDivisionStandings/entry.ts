import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json().catch(() => ({}));
    const user = await base44.auth.me().catch(() => null);
    const isSuper = Boolean(user?.is_super_admin);
    const callerOrg = user?.organization_id || user?.active_organization_id ||
      user?.data?.organization_id || user?.data?.active_organization_id;
    // Authenticated non-super-admins always use their own org (ignore client-supplied orgId).
    // Super admins may specify any org for cross-org admin views.
    // Unauthenticated callers are allowed ONLY when they supply an explicit orgId
    // (standings are public-by-orgId; this prevents org enumeration without an ID).
    const orgId = !user
      ? (payload.orgId || payload.organization_id)
      : isSuper
        ? (payload.orgId || payload.organization_id || callerOrg)
        : callerOrg;
    const sport = (payload.sport || 'basketball').toLowerCase();
    const division = payload.division || '';
    const limit = Number(payload.limit || 200);

    if (!orgId) {
      return Response.json({ error: 'orgId is required' }, { status: 400 });
    }

    // Fetch org (for standings exclude flags) and teams + games in parallel.
    // The org fetch is best-effort — a missing/invalid org must not crash the endpoint.
    let org = null;
    try {
      const orgArr = await base44.asServiceRole.entities.Organization.filter({ id: orgId });
      org = orgArr?.[0] || null;
    } catch (e) {
      console.error('getDivisionStandings: org fetch failed', e);
    }
    const [teams, games] = await Promise.all([
      base44.asServiceRole.entities.Team.filter({ organization_id: orgId, sport }, '-wins', limit),
      base44.asServiceRole.entities.Game.filter({ organization_id: orgId }, '-game_date', 2000),
    ]);
    const excludeDraws = !!org?.standings_exclude_draws;
    const excludeDefaults = !!org?.standings_exclude_defaults;

    const divNorm = division ? String(division).toLowerCase().trim() : '';
    const filteredTeams = divNorm
      ? teams.filter((t) => (String(t.division || '').toLowerCase()).includes(divNorm))
      : teams;

    // Compute per-team records from games, mirroring the frontend shared helper.
    const rec = {};
    filteredTeams.forEach((t) => {
      rec[t.id] = { wins: 0, losses: 0, draws: 0, defaults: 0, pointsFor: 0, pointsAgainst: 0 };
    });

    games
      .filter(
        (g) =>
          g.status === 'completed' &&
          g.archived !== true &&
          (g.game_type || 'regular_season') === 'regular_season' &&
          (g.sport || '').toLowerCase() === sport
      )
      .forEach((g) => {
        const h = g.home_team_id;
        const a = g.away_team_id;
        if (!rec[h] || !rec[a]) return;

        const isDefault = g.is_default === true;
        if (isDefault && excludeDefaults) return;

        let homeScore;
        let awayScore;
        let homeWin = false;
        let awayWin = false;
        let draw = false;

        if (sport === 'volleyball' && Array.isArray(g.quarter_scores) && g.quarter_scores.length > 0) {
          homeScore = g.quarter_scores.reduce((sum, s) => sum + (s.home || 0), 0);
          awayScore = g.quarter_scores.reduce((sum, s) => sum + (s.away || 0), 0);
          const homeSets = g.quarter_scores.filter((s) => (s.home || 0) > (s.away || 0)).length;
          const awaySets = g.quarter_scores.filter((s) => (s.away || 0) > (s.home || 0)).length;
          if (homeSets > awaySets) homeWin = true;
          else if (awaySets > homeSets) awayWin = true;
          else draw = true;
        } else {
          homeScore = Number(g.home_score || 0);
          awayScore = Number(g.away_score || 0);
          if (homeScore > awayScore) homeWin = true;
          else if (awayScore > homeScore) awayWin = true;
          else draw = true;
        }

        rec[h].pointsFor += homeScore;
        rec[h].pointsAgainst += awayScore;
        rec[a].pointsFor += awayScore;
        rec[a].pointsAgainst += homeScore;

        if (draw && excludeDraws) return;

        if (homeWin) { rec[h].wins++; rec[a].losses++; }
        else if (awayWin) { rec[a].wins++; rec[h].losses++; }
        else { rec[h].draws++; rec[a].draws++; }

        if (isDefault) {
          if (g.defaulted_team_id === h) rec[h].defaults++;
          else if (g.defaulted_team_id === a) rec[a].defaults++;
        }
      });

    const sorted = filteredTeams
      .slice()
      .map((t) => {
        const r = rec[t.id] || { wins: 0, losses: 0, draws: 0, defaults: 0, pointsFor: 0, pointsAgainst: 0 };
        const denom = r.wins + r.losses + (excludeDraws ? 0 : r.draws);
        const num = r.wins + (excludeDraws ? 0 : r.draws * 0.5);
        const win_pct = denom > 0 ? Number((num / denom).toFixed(3)) : 0;
        return {
          team_id: t.id,
          name: t.name,
          division: t.division || '',
          wins: r.wins,
          losses: r.losses,
          draws: r.draws,
          defaults: r.defaults,
          win_pct,
          logo_url: t.logo_url || null,
          _sortPoints: num,
          _sortLosses: r.losses,
        };
      })
      .sort((a, b) => {
        if (b._sortPoints !== a._sortPoints) return b._sortPoints - a._sortPoints;
        if (a._sortLosses !== b._sortLosses) return a._sortLosses - b._sortLosses;
        return String(a.name || '').localeCompare(String(b.name || ''));
      })
      .map(({ _sortPoints, _sortLosses, ...rest }, idx) => ({ rank: idx + 1, ...rest }));

    return Response.json({
      organization: org ? { id: org.id, name: org.name } : { id: orgId },
      sport,
      division: division || null,
      teams: sorted,
      exclude_draws: excludeDraws,
      exclude_defaults: excludeDefaults,
      show_draws: !excludeDraws,
      show_defaults: !excludeDefaults,
      updated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('getDivisionStandings error', error);
    return Response.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
});