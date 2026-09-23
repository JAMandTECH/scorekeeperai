import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// backfillOrganizationIds
// One-time migration: populate organization_id on existing records that now
// require it for org-scoped RLS:
//   - Player           ← Team.organization_id   (via team_id)
//   - PlayerGameStats   ← Game.organization_id   (via game_id)
//   - BracketMatch      ← Tournament.organization_id (via tournament_id)
//   - GameTimer         ← Game.organization_id   (via game_id)
//
// Idempotent: only updates records whose organization_id is missing/empty.
// Runs as service role to bypass RLS. Safe to re-run.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Super-admin gate — this is a destructive-batch migration.
    let user = null;
    try { user = await base44.auth.me(); } catch (_) {}
    const isSuper = Boolean(user?.is_super_admin);
    if (!isSuper) {
      return Response.json({ error: 'Forbidden: super admin required' }, { status: 403 });
    }

    const sr = base44.asServiceRole;
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const summary = { player: 0, playerGameStats: 0, bracketMatch: 0, gameTimer: 0, skipped: 0 };

    // ── Build lookup maps ──────────────────────────────────────
    // Teams: id → organization_id
    const teams = await sr.entities.Team.list(undefined, 2000);
    const teamOrg = new Map();
    for (const t of teams) {
      if (t.organization_id) teamOrg.set(t.id, t.organization_id);
    }

    // Games: id → organization_id
    const games = await sr.entities.Game.list(undefined, 3000);
    const gameOrg = new Map();
    for (const g of games) {
      if (g.organization_id) gameOrg.set(g.id, g.organization_id);
    }

    // Tournaments: id → organization_id
    const tournaments = await sr.entities.Tournament.list(undefined, 2000);
    const tournamentOrg = new Map();
    for (const t of tournaments) {
      if (t.organization_id) tournamentOrg.set(t.id, t.organization_id);
    }

    // ── Player backfill ───────────────────────────────────────
    const players = await sr.entities.Player.list(undefined, 5000);
    const playerUpdates = [];
    for (const p of players) {
      if (p.organization_id) { summary.skipped++; continue; }
      const orgId = p.team_id ? teamOrg.get(p.team_id) : null;
      if (orgId) {
        playerUpdates.push({ id: p.id, organization_id: orgId });
      } else {
        summary.skipped++;
      }
    }
    for (let i = 0; i < playerUpdates.length; i += 200) {
      const batch = playerUpdates.slice(i, i + 200);
      await sr.entities.Player.bulkUpdate(batch);
      summary.player += batch.length;
      await sleep(100);
    }

    // ── PlayerGameStats backfill ──────────────────────────────
    const stats = await sr.entities.PlayerGameStats.list(undefined, 5000);
    const statUpdates = [];
    for (const s of stats) {
      if (s.organization_id) { summary.skipped++; continue; }
      const orgId = s.game_id ? gameOrg.get(s.game_id) : null;
      if (orgId) {
        statUpdates.push({ id: s.id, organization_id: orgId });
      } else {
        summary.skipped++;
      }
    }
    for (let i = 0; i < statUpdates.length; i += 200) {
      const batch = statUpdates.slice(i, i + 200);
      await sr.entities.PlayerGameStats.bulkUpdate(batch);
      summary.playerGameStats += batch.length;
      await sleep(100);
    }

    // ── BracketMatch backfill ─────────────────────────────────
    const matches = await sr.entities.BracketMatch.list(undefined, 2000);
    const matchUpdates = [];
    for (const m of matches) {
      if (m.organization_id) { summary.skipped++; continue; }
      const orgId = m.tournament_id ? tournamentOrg.get(m.tournament_id) : null;
      if (orgId) {
        matchUpdates.push({ id: m.id, organization_id: orgId });
      } else {
        summary.skipped++;
      }
    }
    for (let i = 0; i < matchUpdates.length; i += 200) {
      const batch = matchUpdates.slice(i, i + 200);
      await sr.entities.BracketMatch.bulkUpdate(batch);
      summary.bracketMatch += batch.length;
      await sleep(100);
    }

    // ── GameTimer backfill ────────────────────────────────────
    const timers = await sr.entities.GameTimer.list(undefined, 2000);
    const timerUpdates = [];
    for (const t of timers) {
      if (t.organization_id) { summary.skipped++; continue; }
      const orgId = t.game_id ? gameOrg.get(t.game_id) : null;
      if (orgId) {
        timerUpdates.push({ id: t.id, organization_id: orgId });
      } else {
        summary.skipped++;
      }
    }
    for (let i = 0; i < timerUpdates.length; i += 200) {
      const batch = timerUpdates.slice(i, i + 200);
      await sr.entities.GameTimer.bulkUpdate(batch);
      summary.gameTimer += batch.length;
      await sleep(100);
    }

    return Response.json({ success: true, summary });
  } catch (error) {
    console.error('backfillOrganizationIds error:', error?.message || error);
    return Response.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
});