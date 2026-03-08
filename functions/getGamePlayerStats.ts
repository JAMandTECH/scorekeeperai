import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Small delay helper
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Generic fetch with retry/backoff on 429
async function fetchWithRetry(base44, filter, attempt = 1) {
  try {
    return await base44.asServiceRole.entities.PlayerGameStats.filter(filter);
  } catch (err) {
    const msg = String(err?.message || '');
    const isRateLimited = /429|rate limit/i.test(msg);
    if (isRateLimited && attempt < 6) {
      // Exponential backoff: 250, 500, 1000, 2000, 4000ms
      const delay = 250 * Math.pow(2, attempt - 1);
      await sleep(delay);
      return fetchWithRetry(base44, filter, attempt + 1);
    }
    throw err;
  }
}

// Single game helper using generic retry
async function fetchStatsForGame(base44, gameId) {
  return fetchWithRetry(base44, { game_id: gameId });
}

// Batch fetch using $in to dramatically cut down requests; chunk to avoid payload limits
async function fetchInChunks(base44, gameIds, chunkSize = 100) {
  const results = [];
  for (let i = 0; i < gameIds.length; i += chunkSize) {
    const chunk = gameIds.slice(i, i + chunkSize);
    const chunkResults = await fetchWithRetry(base44, { game_id: { $in: chunk } });
    results.push(...chunkResults);
    if (i + chunkSize < gameIds.length) {
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
      stats = await fetchInChunks(base44, ids, 100);
    }

    return Response.json(stats, { status: 200 });
  } catch (error) {
    return Response.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
});