import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Admin-only utility to fix mixed-up sports on completed games and affected teams,
// then re-run the basketball stats migration.
// Payload: {
//   organization_id?: string,
//   volleyball_game_ids: string[], // the completed games that should remain volleyball
//   reclassify_completed_only?: boolean // default true, only touch completed games
// }
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user?.role !== 'admin' && !user?.is_super_admin) {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await (async () => { try { return await req.json(); } catch { return {}; } })();
    const orgId = body.organization_id || user.organization_id || user.active_organization_id || null;
    if (!orgId) return Response.json({ error: 'No organization scope provided' }, { status: 400 });

    const volleyballIds = new Set(Array.isArray(body.volleyball_game_ids) ? body.volleyball_game_ids : []);
    const reclassifyCompletedOnly = body.reclassify_completed_only !== false; // default true

    // 1) Load games in scope
    const gameFilter = { organization_id: orgId };
    if (reclassifyCompletedOnly) Object.assign(gameFilter, { status: 'completed' });
    const games = await base44.asServiceRole.entities.Game.filter(gameFilter);

    // 2) Decide target sport per game based on user selection
    const gameUpdates = [];
    const volleyballTeamIds = new Set();
    const basketballTeamIds = new Set();

    for (const g of games) {
      const targetSport = volleyballIds.has(g.id) ? 'volleyball' : 'basketball';
      if (g.sport !== targetSport) {
        gameUpdates.push({ id: g.id, data: { sport: targetSport } });
      }
      // collect teams for team reclassification
      if (targetSport === 'volleyball') {
        volleyballTeamIds.add(g.home_team_id);
        volleyballTeamIds.add(g.away_team_id);
      } else {
        basketballTeamIds.add(g.home_team_id);
        basketballTeamIds.add(g.away_team_id);
      }
    }

    // 3) Apply game updates in batches
    let gamesUpdated = 0;
    for (let i = 0; i < gameUpdates.length; i += 25) {
      const chunk = gameUpdates.slice(i, i + 25);
      await Promise.all(chunk.map(u => base44.asServiceRole.entities.Game.update(u.id, u.data)));
      gamesUpdated += chunk.length;
    }

    // 4) Build final desired sport per team with volleyball taking precedence
    const desiredTeamSport = new Map();
    for (const id of basketballTeamIds) desiredTeamSport.set(id, 'basketball');
    for (const id of volleyballTeamIds) desiredTeamSport.set(id, 'volleyball'); // override precedence

    const teamIds = Array.from(desiredTeamSport.keys());
    let teamsToUpdate = [];
    if (teamIds.length) {
      // fetch existing teams
      const fetchedTeams = [];
      for (let i = 0; i < teamIds.length; i += 50) {
        const ids = teamIds.slice(i, i + 50);
        const part = await base44.asServiceRole.entities.Team.filter({ id: { $in: ids } });
        fetchedTeams.push(...part);
      }
      const teamById = new Map(fetchedTeams.map(t => [t.id, t]));
      for (const [id, sport] of desiredTeamSport.entries()) {
        const t = teamById.get(id);
        if (t && t.sport !== sport) {
          teamsToUpdate.push({ id, data: { sport } });
        }
      }
    }

    let teamsUpdated = 0;
    for (let i = 0; i < teamsToUpdate.length; i += 25) {
      const chunk = teamsToUpdate.slice(i, i + 25);
      await Promise.all(chunk.map(u => base44.asServiceRole.entities.Team.update(u.id, u.data)));
      teamsUpdated += chunk.length;
    }

    // 5) Re-run basketball migration for this org (apply mode)
    let migrateResult = null;
    try {
      const res = await base44.asServiceRole.functions.invoke('migrateBasketballStats', { organization_id: orgId, dry_run: false });
      migrateResult = res?.data ?? res ?? null;
    } catch (err) {
      migrateResult = { error: String(err) };
    }

    return Response.json({
      scope: { organization_id: orgId, games_considered: games.length },
      updates: { gamesUpdated, teamsUpdated },
      migrateResult,
    });
  } catch (error) {
    return Response.json({ error: error?.message || String(error) }, { status: 500 });
  }
});