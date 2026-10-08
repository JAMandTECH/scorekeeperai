import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// backfillOrganizationIds
// One-time migration: populate organization_id on existing records that now
// require it for org-scoped RLS:
//   - Player           ← Team.organization_id   (via team_id)
//   - PlayerGameStats  ← Game.organization_id   (via game_id)
//   - BracketMatch     ← Tournament.organization_id (via tournament_id)
//   - GameTimer        ← Game.organization_id   (via game_id)
//
// Idempotent: only updates records whose organization_id is missing/empty.
// Paginates through EVERY record (cursor-based) — does not stop at the first page.
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
    const summary = {
      player: 0,
      playerGameStats: 0,
      bracketMatch: 0,
      gameTimer: 0,
      skipped: 0,
      scanned: { team: 0, game: 0, tournament: 0, player: 0, playerGameStats: 0, bracketMatch: 0, gameTimer: 0 },
    };

    // Page through every record of an entity using cursor pagination.
    const pageAll = async (entityName, limit = 500) => {
      const all = [];
      let cursor = undefined;
      let hasMore = true;
      while (hasMore) {
        const page = await sr.entities[entityName].list({ limit, cursor });
        const items = page.items || [];
        all.push(...items);
        summary.scanned[entityName] = (summary.scanned[entityName] || 0) + items.length;
        cursor = page.next_cursor;
        hasMore = page.has_more && cursor;
      }
      return all;
    };

    // ── Build lookup maps (page through everything) ──────────
    const teams = await pageAll('Team', 1000);
    const teamOrg = new Map();
    for (const t of teams) {
      if (t.organization_id) teamOrg.set(t.id, t.organization_id);
    }

    const games = await pageAll('Game', 1000);
    const gameOrg = new Map();
    for (const g of games) {
      if (g.organization_id) gameOrg.set(g.id, g.organization_id);
    }

    const tournaments = await pageAll('Tournament', 1000);
    const tournamentOrg = new Map();
    for (const t of tournaments) {
      if (t.organization_id) tournamentOrg.set(t.id, t.organization_id);
    }

    // ── Helper: backfill one entity from a lookup ────────────
    const backfill = async (entityName, lookupField, lookupMap, countKey, pageSize = 500) => {
      let cursor = undefined;
      let hasMore = true;
      let updated = 0;
      let skipped = 0;
      const pending = [];

      while (hasMore) {
        const page = await sr.entities[entityName].list({ limit: pageSize, cursor });
        const items = page.items || [];
        summary.scanned[entityName] = (summary.scanned[entityName] || 0) + items.length;

        for (const rec of items) {
          if (rec.organization_id) { skipped++; continue; }
          const fk = rec[lookupField];
          const orgId = fk ? lookupMap.get(fk) : null;
          if (orgId) {
            pending.push({ id: rec.id, organization_id: orgId });
          } else {
            skipped++;
          }
        }

        // Flush in batches of 200 to avoid giant payloads.
        while (pending.length >= 200) {
          const batch = pending.splice(0, 200);
          await sr.entities[entityName].bulkUpdate(batch);
          updated += batch.length;
          await sleep(100);
        }

        cursor = page.next_cursor;
        hasMore = page.has_more && cursor;
      }

      // Flush remainder.
      if (pending.length) {
        await sr.entities[entityName].bulkUpdate(pending);
        updated += pending.length;
      }

      summary[countKey] += updated;
      summary.skipped += skipped;
      return { updated, skipped };
    };

    await backfill('Player', 'team_id', teamOrg, 'player');
    await backfill('PlayerGameStats', 'game_id', gameOrg, 'playerGameStats');
    await backfill('BracketMatch', 'tournament_id', tournamentOrg, 'bracketMatch');
    await backfill('GameTimer', 'game_id', gameOrg, 'gameTimer');

    return Response.json({ success: true, summary });
  } catch (error) {
    console.error('backfillOrganizationIds error:', error?.message || error);
    return Response.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
});