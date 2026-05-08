import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Small delay helper
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Generic fetch with retry/backoff on 429 — paginates through ALL results
async function fetchWithRetry(base44, filter, attempt = 1) {
  try {
    const PAGE_SIZE = 500;
    const all = [];
    let page = 1;
    // Loop pages until we get less than a full page back
    // (defensive cap at 50 pages = 25k records)
    while (page <= 50) {
      const batch = await base44.asServiceRole.entities.PlayerGameStats.filter(
        filter,
        '-created_date',
        PAGE_SIZE,
        (page - 1) * PAGE_SIZE
      );
      if (!Array.isArray(batch) || batch.length === 0) break;
      all.push(...batch);
      if (batch.length < PAGE_SIZE) break;
      page += 1;
    }
    return all;
  } catch (err) {
    const msg = String(err?.message || '');
    const isRateLimited = /429|rate limit/i.test(msg);
    if (isRateLimited && attempt < 6) {
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

// Per-game batch fetch with controlled concurrency
async function fetchInBatches(base44, gameIds, batchSize = 3) {
  const results = [];
  for (let i = 0; i < gameIds.length; i += batchSize) {
    const batch = gameIds.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map((id) => fetchStatsForGame(base44, id).catch(() => []))
    );
    results.push(...batchResults.flat());
    if (i + batchSize < gameIds.length) {
      await sleep(300);
    }
  }
  return results;
}

// Prefer $in when available; fallback to per-game if provider doesn't support it
async function fetchInChunksOrPerGame(base44, gameIds, chunkSize = 100, perGameBatch = 3) {
  const results = [];
  for (let i = 0; i < gameIds.length; i += chunkSize) {
    const chunk = gameIds.slice(i, i + chunkSize);
    let chunkResults = [];
    try {
      chunkResults = await fetchWithRetry(base44, { game_id: { $in: chunk } });
    } catch (_) {
      chunkResults = [];
    }
    // If $in unsupported or returned empty unexpectedly, fallback per-game
    if (!Array.isArray(chunkResults) || (chunkResults.length === 0 && chunk.length > 1)) {
      const perGame = await fetchInBatches(base44, chunk, perGameBatch);
      results.push(...perGame);
    } else {
      results.push(...chunkResults);
    }
    if (i + chunkSize < gameIds.length) await sleep(200);
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
      stats = await fetchInChunksOrPerGame(base44, ids, 100, 3);
    }

    return Response.json(stats, { status: 200 });
  } catch (error) {
    return Response.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
});