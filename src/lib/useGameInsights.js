import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { aggregateByPlayer, getTeamInsights, isInPenalty } from "@/lib/gameInsights";

/**
 * Fetches players + per-game player stats and computes live insights
 * (team fouls, penalty, top scorers, foul-trouble players) for both teams.
 * Polls every 5 s for live updates. Used by the stream overlay which
 * doesn't otherwise have access to player-level data.
 */
export function useGameInsights(gameId, game) {
  const [players, setPlayers] = useState([]);
  const [playerStats, setPlayerStats] = useState([]);

  useEffect(() => {
    if (!gameId) return;
    let cancelled = false;

    const fetchAll = async () => {
      try {
        const [allPlayers, res] = await Promise.all([
          base44.entities.Player.list(),
          base44.functions.invoke("getGamePlayerStats", { game_id: gameId }),
        ]);
        if (cancelled) return;
        setPlayers(allPlayers || []);
        setPlayerStats(res?.data || res || []);
      } catch (e) {
        console.error("useGameInsights fetch error:", e);
      }
    };

    fetchAll();
    const intervalId = setInterval(fetchAll, 5000);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [gameId]);

  const aggMap = aggregateByPlayer(playerStats);
  const homeFouls = game?.home_team_fouls ?? 0;
  const awayFouls = game?.away_team_fouls ?? 0;

  return {
    aggMap,
    home: {
      fouls: homeFouls,
      inPenalty: isInPenalty(game, homeFouls),
      ...getTeamInsights(aggMap, players, game?.home_team_id, game),
    },
    away: {
      fouls: awayFouls,
      inPenalty: isInPenalty(game, awayFouls),
      ...getTeamInsights(aggMap, players, game?.away_team_id, game),
    },
  };
}