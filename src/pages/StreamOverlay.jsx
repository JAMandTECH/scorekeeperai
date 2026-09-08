import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import ScoreOverlay from "@/components/ScoreOverlay";

/**
 * Public broadcast overlay page for OBS/vMix browser source.
 * Transparent background — the streamer chroma-keys it out in their production software.
 * No login required. Realtime-updated via ScoreOverlay's Game subscription.
 */
export default function StreamOverlay() {
  const { gameId } = useParams();
  const [game, setGame] = useState(null);
  const [teams, setTeams] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!gameId) return;
    let cancelled = false;

    (async () => {
      try {
        const games = await base44.entities.Game.filter({ id: gameId });
        if (cancelled) return;
        if (!games || !games.length) {
          setError("Game not found");
          setLoading(false);
          return;
        }
        setGame(games[0]);

        // Fetch teams for names/logos
        const ids = [games[0].home_team_id, games[0].away_team_id].filter(Boolean);
        if (ids.length) {
          const all = await base44.entities.Team.list();
          if (cancelled) return;
          const map = {};
          (all || []).forEach((t) => { map[t.id] = t; });
          setTeams(map);
        }
        setLoading(false);
      } catch (e) {
        console.error("StreamOverlay load error:", e);
        if (!cancelled) { setError(e.message || "Failed to load game"); setLoading(false); }
      }
    })();

    return () => { cancelled = true; };
  }, [gameId]);

  // Transparent body for chroma keying
  useEffect(() => {
    document.body.style.background = "transparent";
    document.documentElement.style.background = "transparent";
    return () => {
      document.body.style.background = "";
      document.documentElement.style.background = "";
    };
  }, []);

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: "transparent" }}>
        <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className="fixed top-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg bg-red-600/90 text-white text-sm font-bold">
        {error || "Game not found"}
      </div>
    );
  }

  return (
    <div className="fixed inset-0" style={{ background: "transparent" }}>
      <ScoreOverlay game={game} teams={teams} variant="broadcast" />
    </div>
  );
}