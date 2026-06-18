import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

/**
 * Shared player-leader computation used by the Dashboard, Home and Statistics pages
 * so every surface shows identical numbers.
 *
 * Source of truth: raw PlayerGameStats from completed games (same as Home/Statistics),
 * NOT the pre-aggregated PlayerSeasonStats table (which can drift when stale).
 *
 * Points are recomputed per-game from that game's actual sport, and averages divide
 * the player's total by the number of completed games their team played.
 */
export function usePlayerLeaders(organizationId) {
  const { data: games = [] } = useQuery({
    queryKey: ["player-leaders-games", organizationId],
    queryFn: () => base44.entities.Game.filter({ organization_id: organizationId }),
    enabled: !!organizationId,
    refetchInterval: 20000,
  });

  const completedGames = games.filter((g) => g.status === "completed");
  const completedGameIds = completedGames.map((g) => g.id);

  const { data: playerStats = [] } = useQuery({
    queryKey: ["player-leaders-stats", organizationId, completedGameIds.join(",")],
    queryFn: async () => {
      if (completedGameIds.length === 0) return [];
      let stats = [];
      try {
        const res = await base44.functions.invoke("getGamePlayerStats", { game_ids: completedGameIds });
        stats = Array.isArray(res.data) ? res.data : [];
      } catch (e) {
        console.warn("getGamePlayerStats failed, falling back to direct fetch:", e?.message || e);
      }
      if (!stats || stats.length === 0) {
        const results = [];
        for (let i = 0; i < completedGameIds.length; i += 50) {
          const chunk = completedGameIds.slice(i, i + 50);
          try {
            const part = await base44.entities.PlayerGameStats.filter({ game_id: { $in: chunk } });
            results.push(...part);
          } catch (_) {
            const per = await Promise.all(
              chunk.map((id) => base44.entities.PlayerGameStats.filter({ game_id: id }).catch(() => []))
            );
            results.push(...per.flat());
          }
        }
        stats = results;
      }
      return stats;
    },
    enabled: !!organizationId && completedGameIds.length > 0,
    staleTime: 30000,
    refetchInterval: 20000,
  });

  return { games, completedGames, playerStats };
}

/**
 * Build a leaderboard for one stat, mirroring Home's getTopPlayers exactly.
 * Returns rows sorted by per-game average (descending).
 */
export function buildLeaderboard({
  statType,
  sport = "basketball",
  division = null,
  games = [],
  playerStats = [],
  teams = [],
  players = [],
  limit = 10,
}) {
  const teamsById = new Map(teams.map((t) => [t.id, t]));
  const playersById = new Map(players.map((p) => [p.id, p]));

  const eligibleGames = games.filter((g) => {
    if (g.status !== "completed") return false;
    if (sport && (g.sport || "").toLowerCase() !== sport.toLowerCase()) return false;
    if (division) {
      const homeDiv = teamsById.get(g.home_team_id)?.division || "No Division";
      const awayDiv = teamsById.get(g.away_team_id)?.division || "No Division";
      if (homeDiv !== division && awayDiv !== division) return false;
    }
    return true;
  });
  const eligibleGameIds = new Set(eligibleGames.map((g) => g.id));

  const teamGamesPlayed = new Map();
  eligibleGames.forEach((g) => {
    if (g.home_team_id) teamGamesPlayed.set(g.home_team_id, (teamGamesPlayed.get(g.home_team_id) || 0) + 1);
    if (g.away_team_id) teamGamesPlayed.set(g.away_team_id, (teamGamesPlayed.get(g.away_team_id) || 0) + 1);
  });

  const totals = new Map();
  playerStats.forEach((s) => {
    if (!eligibleGameIds.has(s.game_id)) return;
    const team = teamsById.get(s.team_id);
    const statSport = (team?.sport || sport || "").toLowerCase();
    if (division) {
      const statDiv = team?.division || "No Division";
      if (statDiv !== division) return;
    }

    let add = 0;
    if (statType === "points") {
      if (statSport === "volleyball") {
        add = Number(s.aces || 0) + Number(s.attacks || 0) + Number(s.blocks || 0);
      } else {
        const stored = Number(s.points || 0);
        if (stored > 0) {
          add = stored;
        } else {
          const threes = Number(s.three_pointers || 0);
          const fgm = Number(s.field_goals_made || 0);
          const twos = Math.max(fgm - threes, 0);
          const ftm = Number(s.free_throws_made || 0);
          add = twos * 2 + threes * 3 + ftm;
        }
      }
    } else {
      add = Number(s[statType] || 0);
    }

    const prev = totals.get(s.player_id) || { total: 0, team_id: s.team_id };
    prev.total += add;
    prev.team_id = prev.team_id || s.team_id;
    totals.set(s.player_id, prev);
  });

  return Array.from(totals.entries())
    .map(([playerId, { total, team_id }]) => {
      const player = playersById.get(playerId);
      const team = teamsById.get(team_id);
      const gamesPlayed = teamGamesPlayed.get(team_id) || 0;
      const avgNum = gamesPlayed > 0 ? total / gamesPlayed : 0;
      return {
        id: playerId,
        first_name: player?.first_name,
        last_name: player?.last_name,
        jersey_number: player?.jersey_number,
        photo_url: player?.photo_url,
        team_id,
        team_name: team?.name || "Unknown",
        total,
        gamesPlayed,
        avgNum,
        avg: gamesPlayed > 0 ? avgNum.toFixed(1) : "0.0",
      };
    })
    .filter((p) => p.total > 0)
    .sort((a, b) => b.avgNum - a.avgNum)
    .slice(0, limit);
}