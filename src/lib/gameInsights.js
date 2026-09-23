/**
 * Pure helpers for computing live game insights (team fouls, penalty status,
 * top scorers, foul-trouble players) from raw player stats and game data.
 * No React — safe to import anywhere.
 */

// Aggregate per-period PlayerGameStats records into a per-player totals map.
// Each entry: { player_id, team_id, points, fouls, rebounds, assists, steals, blocks, three_pointers }
export function aggregateByPlayer(playerStats) {
  const map = {};
  for (const s of playerStats || []) {
    const pid = s.player_id;
    if (!pid) continue;
    if (!map[pid]) {
      map[pid] = {
        player_id: pid,
        team_id: s.team_id,
        points: 0,
        fouls: 0,
        rebounds: 0,
        assists: 0,
        steals: 0,
        blocks: 0,
        three_pointers: 0,
      };
    }
    map[pid].points += s.points || 0;
    map[pid].fouls += s.fouls || 0;
    map[pid].rebounds += s.rebounds || 0;
    map[pid].assists += s.assists || 0;
    map[pid].steals += s.steals || 0;
    map[pid].blocks += s.blocks || 0;
    map[pid].three_pointers += s.three_pointers || 0;
  }
  return map;
}

// A team is "in penalty" when its quarter fouls reach the penalty limit.
export function isInPenalty(game, fouls) {
  return fouls >= (game?.penalty_limit_per_quarter ?? 5);
}

// Pick the leader for a given stat key (points, rebounds, assists, steals, blocks, three_pointers).
function topByStat(entries, statKey, min = 1) {
  return (
    entries
      .filter((e) => (e[statKey] || 0) >= min)
      .sort((a, b) => (b[statKey] || 0) - (a[statKey] || 0))[0] || null
  );
}

// Compute insights for one team: top scorer + players in foul trouble + category leaders.
export function getTeamInsights(aggMap, players, teamId, game) {
  const foulLimit = game?.player_foul_limit ?? 5;
  const troubleThreshold = Math.max(1, foulLimit - 2);

  const entries = Object.values(aggMap)
    .filter((e) => e.team_id === teamId)
    .map((e) => ({ ...e, player: (players || []).find((p) => p.id === e.player_id) }))
    .filter((e) => e.player);

  const topScorer = topByStat(entries, "points");
  const foulTrouble = entries
    .filter((e) => e.fouls >= troubleThreshold && e.fouls < foulLimit)
    .sort((a, b) => b.fouls - a.fouls);

  return {
    topScorer,
    foulTrouble,
    topRebounder: topByStat(entries, "rebounds"),
    topAssist: topByStat(entries, "assists"),
    topSteal: topByStat(entries, "steals"),
    topBlock: topByStat(entries, "blocks"),
    topThree: topByStat(entries, "three_pointers"),
    foulLimit,
    troubleThreshold,
  };
}

// Compact label for a player entry: "#23 Smith"
export function playerLabel(entry) {
  if (!entry?.player) return "—";
  const p = entry.player;
  const num = p.jersey_number ? `#${p.jersey_number} ` : "";
  return `${num}${p.last_name || p.first_name || "—"}`;
}