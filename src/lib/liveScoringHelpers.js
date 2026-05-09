import { base44 } from '@/api/base44Client';

/**
 * Paginated fetch for PlayerGameStats by game_id.
 * Avoids rate-limit errors on games with many stat entries.
 * Real-time subscriptions keep the data fresh after this initial load.
 */
export async function loadAllStatsPaginated(gameId, pageSize = 200, maxPages = 20) {
  const statsMap = {};
  if (!gameId) return statsMap;
  try {
    for (let page = 0; page < maxPages; page++) {
      const batch = await base44.entities.PlayerGameStats.filter(
        { game_id: gameId },
        '-created_date',
        pageSize,
        page * pageSize
      );
      if (!batch || batch.length === 0) break;
      batch.forEach((stat) => {
        const key = `${stat.player_id}_${stat.quarter}`;
        statsMap[key] = stat;
      });
      if (batch.length < pageSize) break;
    }
  } catch (e) {
    // Swallow — the real-time subscription will populate stats as they update.
    console.warn('loadAllStatsPaginated: partial/empty load due to rate limit or error:', e?.message || e);
  }
  return statsMap;
}