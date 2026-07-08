import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

// Keep the last successful result on screen while a refetch runs (v5-safe, no named import).
const keepPrevious = (prev) => prev;

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
export function usePlayerLeaders(organizationId, teams = []) {
  const { data: games = [] } = useQuery({
    queryKey: ["player-leaders-games", organizationId],
    queryFn: () => base44.entities.Game.filter({ organization_id: organizationId }),
    enabled: !!organizationId,
    refetchInterval: 20000,
    staleTime: 60000,
    gcTime: 10 * 60 * 1000,
    placeholderData: keepPrevious,
  });

  const completedGames = games.filter((g) => g.status === "completed");

  // Fetch all stats for this org's teams in ONE backend call (paginated server-side),
  // instead of looping over every completed game id from the browser.
  const teamIds = teams.map((t) => t.id).filter(Boolean).sort();

  const { data: playerStats = [] } = useQuery({
    queryKey: ["player-leaders-stats", organizationId, teamIds.join(",")],
    queryFn: async () => {
      if (teamIds.length === 0) return [];
      // Fetch directly from the browser, paginated, in team chunks.
      // Direct entity reads are fast and avoid backend rate-limit churn.
      const results = [];
      for (let i = 0; i < teamIds.length; i += 10) {
        const chunk = teamIds.slice(i, i + 10);
        let skip = 0;
        while (true) {
          const batch = await base44.entities.PlayerGameStats.filter(
            { team_id: { $in: chunk } },
            "created_date",
            500,
            skip
          );
          results.push(...batch);
          if (batch.length < 500) break;
          skip += 500;
          if (skip > 20000) break;
        }
      }
      return results;
    },
    enabled: !!organizationId && teamIds.length > 0,
    staleTime: 60000,
    gcTime: 10 * 60 * 1000,
    refetchInterval: 30000,
    placeholderData: keepPrevious,
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