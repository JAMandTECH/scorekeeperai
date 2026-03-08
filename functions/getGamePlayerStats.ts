import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Small delay helper
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Fetch stats for a single game with retry/backoff on 429
async function fetchStatsForGame(base44, gameId, attempt = 1) {
  try {
    return await base44.asServiceRole.entities.PlayerGameStats.filter({ game_id: gameId });
  } catch (err) {
    const msg = String(err?.message || '');
    const isRateLimited = /429|rate limit/i.test(msg);
    if (isRateLimited && attempt < 5) {
      // Exponential backoff: 250ms, 500ms, 1000ms, 2000ms
      const delay = 250 * Math.pow(2, attempt - 1);
      await sleep(delay);
      return fetchStatsForGame(base44, gameId, attempt + 1);
    }
    throw err;
  }
}

// Batch fetch with limited concurrency to avoid 429s
async function fetchInBatches(base44, gameIds, batchSize = 5) {
  const results = [];
  for (let i = 0; i < gameIds.length; i += batchSize) {
    const batch = gameIds.slice(i, i + batchSize);
    // Run this small batch in parallel, each with its own internal retry
    const batchResults = await Promise.all(batch.map((id) => fetchStatsForGame(base44, id).catch(() => [])));
    results.push(...batchResults.flat());
    // Gentle pacing between batches
    if (i + batchSize < gameIds.length) {
      await sleep(150);
    }
  }
  return results;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    // Auth optional for read endpoints; ignore failures
    try { await base44.auth.me(); } catch (_) {}

    const { game_id, game_ids } = await req.json().catch(() => ({}));

    if (!game_id && (!Array.isArray(game_ids) || game_ids.length === 0)) {
      return Response.json({ error: 'Missing game_id or game_ids' }, { status: 400 });
    }

    let stats = [];

    if (game_id) {
      stats = await fetchStatsForGame(base44, game_id);
    } else {
      // De-dupe IDs just in case
      const ids = Array.from(new Set(game_ids.filter(Boolean)));
      // Cap extreme requests defensively (very large lists can cause long runtimes)
      // If needed on frontend, make multiple paged requests instead of one giant one.
      stats = await fetchInBatches(base44, ids, 6);
    }

    return Response.json(stats, { status: 200 });
  } catch (error) {
    return Response.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
});