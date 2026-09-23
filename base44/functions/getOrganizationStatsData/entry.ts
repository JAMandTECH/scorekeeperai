import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const organization_id = body?.organization_id;
    if (!organization_id) {
      return Response.json({ error: 'organization_id is required' }, { status: 400 });
    }

    const sr = base44.asServiceRole;

    const teams = await sr.entities.Team.filter({ organization_id }, undefined, 2000);
    const games = await sr.entities.Game.filter({ organization_id }, '-game_date', 2000);

    const teamIds = (teams || []).map((t) => t.id).filter(Boolean);
    let players = [];
    if (teamIds.length) {
      const chunkSize = 50;
      const out = [];
      for (let i = 0; i < teamIds.length; i += chunkSize) {
        const chunk = teamIds.slice(i, i + chunkSize);
        try {
          const part = await sr.entities.Player.filter({ team_id: { $in: chunk } }, '-created_date', 2000);
          out.push(...part);
        } catch (_) {
          const per = await Promise.all(
            chunk.map((id) => sr.entities.Player.filter({ team_id: id }, '-created_date', 2000).catch(() => []))
          );
          out.push(...per.flat());
        }
      }
      players = out;
    }

    const completedGameIds = (games || [])
      .filter((g) => g.status === 'completed')
      .map((g) => g.id)
      .filter(Boolean);
    let playerGameStats = [];
    if (completedGameIds.length) {
      const chunkSize = 10;
      const out = [];
      for (let i = 0; i < completedGameIds.length; i += chunkSize) {
        const chunk = completedGameIds.slice(i, i + chunkSize);
        try {
          const part = await sr.entities.PlayerGameStats.filter({ game_id: { $in: chunk } }, undefined, 2000);
          out.push(...part);
        } catch (_) {
          const per = await Promise.all(
            chunk.map((id) => sr.entities.PlayerGameStats.filter({ game_id: id }, undefined, 2000).catch(() => []))
          );
          out.push(...per.flat());
        }
      }
      playerGameStats = out;
    }

    return Response.json({
      teams: teams || [],
      players,
      games: games || [],
      playerGameStats,
    });
  } catch (error) {
    console.error('getOrganizationStatsData error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}