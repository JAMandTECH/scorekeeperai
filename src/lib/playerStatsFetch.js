import { base44 } from "@/api/base44Client";

/**
 * Fetch PlayerGameStats for a list of game IDs, chunked by game_id.
 *
 * If a chunk's `$in` query fails, falls back to per-id queries. If any per-id
 * call also fails, the promise REJECTS so the caller's React Query enters the
 * error state and the last complete dataset is retained — it never silently
 * returns partial data that could be mistaken for an empty result.
 */
export async function fetchPlayerGameStatsByGames(gameIds, chunkSize = 10) {
  if (!gameIds || gameIds.length === 0) return [];
  const results = [];
  for (let i = 0; i < gameIds.length; i += chunkSize) {
    const chunk = gameIds.slice(i, i + chunkSize);
    try {
      const part = await base44.entities.PlayerGameStats.filter({ game_id: { $in: chunk } });
      results.push(...part);
    } catch {
      // Per-id fallback. No `.catch(() => [])` here: if any per-id call fails,
      // Promise.all rejects and the whole query fails (last complete dataset is
      // retained via placeholderData, not a partial total).
      const per = await Promise.all(
        chunk.map((id) => base44.entities.PlayerGameStats.filter({ game_id: id }))
      );
      results.push(...per.flat());
    }
  }
  return results;
}