import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

/**
 * Reusable live scoreboard overlay.
 *
 * Props:
 *   game     - the Game entity record (initial state)
 *   teams    - { [teamId]: teamObject } lookup map (optional; fetched if omitted)
 *   variant  - "in-app" (semi-transparent bar) | "broadcast" (transparent bg for OBS chroma key)
 *   position - "top" | "bottom" (in-app only; broadcast is always top)
 */
export default function ScoreOverlay({ game: initialGame, teams: teamsMap, variant = "in-app", position = "bottom" }) {
  const [game, setGame] = useState(initialGame);
  const [teams, setTeams] = useState(teamsMap || {});

  // Keep local state in sync if parent passes updated score fields (live scoring pages
  // pass an enriched game object with current local scores; the ID stays constant but
  // the score fields change as the scorekeeper records points).
  useEffect(() => {
    setGame(initialGame);
  }, [
    initialGame?.id,
    initialGame?.home_score,
    initialGame?.away_score,
    initialGame?.current_quarter,
    initialGame?.quarter_scores,
    initialGame?.home_team_fouls,
    initialGame?.away_team_fouls,
    initialGame?.home_timeouts,
    initialGame?.away_timeouts,
    initialGame?.status,
  ]);
  useEffect(() => { if (teamsMap) setTeams(teamsMap); }, [teamsMap]);

  // Fetch teams if not provided
  useEffect(() => {
    if (teamsMap || !game) return;
    let cancelled = false;
    (async () => {
      const ids = [game.home_team_id, game.away_team_id].filter(Boolean);
      if (!ids.length) return;
      try {
        const all = await base44.entities.Team.list();
        if (cancelled) return;
        const map = {};
        (all || []).forEach((t) => { map[t.id] = t; });
        setTeams(map);
      } catch (e) { /* ignore — overlay degrades gracefully */ }
    })();
    return () => { cancelled = true; };
  }, [game?.home_team_id, game?.away_team_id, teamsMap]);

  // Realtime subscription — live updates as the scorekeeper records changes
  useEffect(() => {
    if (!game?.id) return;
    const unsubscribe = base44.entities.Game.subscribe((event) => {
      if (event.id !== game.id) return;
      if (event.type === "update" || event.type === "create") {
        setGame(event.data);
      }
    });
    return unsubscribe;
  }, [game?.id]);

  if (!game) return null;

  const homeTeam = teams[game.home_team_id];
  const awayTeam = teams[game.away_team_id];
  const isBasketball = game.sport === "basketball";

  // Period/quarter label
  const periodLabel = isBasketball
    ? (game.current_quarter <= 4 ? `Q${game.current_quarter}` : `OT${game.current_quarter - 4}`)
    : `SET ${game.current_quarter}`;

  // Volleyball: compute sets won from quarter_scores
  const homeSetsWon = isBasketball ? null : (game.quarter_scores || []).filter((s) => (s.home || 0) > (s.away || 0)).length;
  const awaySetsWon = isBasketball ? null : (game.quarter_scores || []).filter((s) => (s.away || 0) > (s.home || 0)).length;

  const homeScore = isBasketball ? (game.home_score ?? 0) : (homeSetsWon ?? 0);
  const awayScore = isBasketball ? (game.away_score ?? 0) : (awaySetsWon ?? 0);

  const TeamCell = ({ team, score, align }) => {
    if (!team) {
      return (
        <div className={`flex items-center gap-3 ${align === "right" ? "flex-row-reverse" : ""}`}>
          <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center text-white/60 font-bold text-sm">TBD</div>
          <div className={`text-white/70 font-heading text-base sm:text-lg ${align === "right" ? "text-right" : ""}`}>TBD</div>
        </div>
      );
    }
    return (
      <div className={`flex items-center gap-3 ${align === "right" ? "flex-row-reverse" : ""}`}>
        <Avatar className="w-12 h-12 rounded-lg border-2 border-white/30 shadow-lg">
          <AvatarImage src={team.logo_url} />
          <AvatarFallback className="bg-gradient-to-br from-slate-600 to-slate-800 text-white font-black text-sm rounded-lg">
            {team.name?.substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className={`min-w-0 ${align === "right" ? "text-right" : ""}`}>
          <div className="text-white font-heading font-bold text-sm sm:text-base lg:text-lg truncate max-w-[140px] sm:max-w-[200px]">
            {team.name}
          </div>
        </div>
      </div>
    );
  };

  const ScoreNumber = ({ value, pulse }) => (
    <div className={`font-display text-white font-black text-3xl sm:text-4xl lg:text-5xl tabular-nums leading-none ${pulse ? "animate-scorePulse" : ""}`}>
      {value}
    </div>
  );

  // --- Broadcast variant (transparent bg, chroma-keyable for OBS) ---
  if (variant === "broadcast") {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 flex justify-center px-4 pt-4">
        <div
          className="flex items-center gap-4 sm:gap-6 px-4 sm:px-6 py-3 rounded-2xl shadow-2xl"
          style={{
            background: "linear-gradient(135deg, rgba(15,23,42,0.92), rgba(30,41,59,0.92))",
            backdropFilter: "blur(8px)",
            border: "1px solid rgba(255,255,255,0.12)",
          }}
        >
          {/* Home */}
          <div className="flex items-center gap-3">
            <TeamCell team={homeTeam} align="left" />
            <ScoreNumber value={homeScore} />
          </div>

          {/* Center info */}
          <div className="flex flex-col items-center px-2 sm:px-4 border-x border-white/15">
            <span className="text-red-400 font-display font-black text-xs sm:text-sm tracking-widest animate-pulse">
              {game.status === "completed" ? "FINAL" : "LIVE"}
            </span>
            <span className="text-white font-display font-black text-base sm:text-xl lg:text-2xl">{periodLabel}</span>
            {isBasketball && (
              <div className="flex gap-2 mt-0.5">
                <span className="text-white/70 text-[10px] sm:text-xs font-bold">F {game.home_team_fouls ?? 0}</span>
                <span className="text-white/70 text-[10px] sm:text-xs font-bold">T {game.home_timeouts ?? 5}</span>
              </div>
            )}
          </div>

          {/* Away */}
          <div className="flex items-center gap-3">
            <ScoreNumber value={awayScore} />
            <TeamCell team={awayTeam} align="right" />
          </div>
        </div>
      </div>
    );
  }

  // --- In-app variant (semi-transparent bar overlaid on video) ---
  const posClass = position === "top" ? "top-0" : "bottom-0";
  return (
    <div className={`absolute ${posClass} left-0 right-0 z-20 pointer-events-none`}>
      <div
        className="flex items-center justify-between gap-2 sm:gap-4 px-3 sm:px-5 py-2.5 sm:py-3"
        style={{
          background: "linear-gradient(to top, rgba(0,0,0,0.85), rgba(0,0,0,0.5))",
          backdropFilter: "blur(6px)",
        }}
      >
        {/* Home side */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <TeamCell team={homeTeam} align="left" />
          <ScoreNumber value={homeScore} />
        </div>

        {/* Center */}
        <div className="flex flex-col items-center px-2 sm:px-3 flex-shrink-0">
          <span className="text-red-500 font-display font-black text-[10px] sm:text-xs tracking-widest animate-pulse">
            {game.status === "completed" ? "FINAL" : "LIVE"}
          </span>
          <span className="text-white font-display font-black text-sm sm:text-lg">{periodLabel}</span>
          {isBasketball && (
            <div className="flex gap-1.5 sm:gap-2 mt-0.5">
              <span className="text-white/80 text-[9px] sm:text-[10px] font-bold">F:{game.home_team_fouls ?? 0}/{game.away_team_fouls ?? 0}</span>
              <span className="text-white/80 text-[9px] sm:text-[10px] font-bold">TO:{game.home_timeouts ?? 5}/{game.away_timeouts ?? 5}</span>
            </div>
          )}
        </div>

        {/* Away side */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 justify-end">
          <ScoreNumber value={awayScore} />
          <TeamCell team={awayTeam} align="right" />
        </div>
      </div>
    </div>
  );
}