import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import OverlayTimerBits from "@/components/OverlayTimerBits";
import OverlayInsights from "@/components/OverlayInsights";
import { useGameInsights } from "@/lib/useGameInsights";

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
  const insights = useGameInsights(game?.id, game);

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

  const TeamCell = ({ team, score, align, insights: teamInsights }) => {
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
          {teamInsights && <OverlayInsights {...teamInsights} align={align} />}
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
            <TeamCell team={homeTeam} align="left" insights={isBasketball ? insights.home : null} />
            <ScoreNumber value={homeScore} />
          </div>

          {/* Center info */}
          <div className="flex flex-col items-center px-2 sm:px-4 border-x border-white/15">
            <span className="text-red-400 font-display font-black text-xs sm:text-sm tracking-widest animate-pulse">
              {game.status === "completed" ? "FINAL" : "LIVE"}
            </span>
            <span className="text-white font-display font-black text-base sm:text-xl lg:text-2xl">{periodLabel}</span>
            <OverlayTimerBits gameId={game.id} game={game} />
          </div>

          {/* Away */}
          <div className="flex items-center gap-3">
            <ScoreNumber value={awayScore} />
            <TeamCell team={awayTeam} align="right" insights={isBasketball ? insights.away : null} />
          </div>
        </div>
      </div>
    );
  }

  // --- In-app variant (Split Panel Bar overlaid on video) ---
  const posClass = position === "top" ? "top-0" : "bottom-0";
  const possessionHome = game.possession === "home";
  const possessionAway = game.possession === "away";

  const SplitTeamCell = ({ team, align, score, insights: teamInsights, side, hasPossession }) => {
    const isRight = align === "right";
    return (
      <div
        className="relative flex items-center gap-3 sm:gap-4 px-3 sm:px-5 py-2.5 sm:py-3 flex-1 min-w-0"
        style={{ background: "#1A1A1A" }}
      >
        <div className={`flex items-center gap-3 min-w-0 ${isRight ? "flex-row-reverse" : ""}`}>
          {team ? (
            <Avatar className="w-10 h-10 sm:w-12 sm:h-12 rounded-none border border-white/15 flex-shrink-0">
              <AvatarImage src={team.logo_url} />
              <AvatarFallback className="bg-white/5 text-white font-black text-xs rounded-none">
                {team.name?.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          ) : (
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-none border border-white/15 bg-white/5 flex items-center justify-center text-white/50 font-bold text-xs flex-shrink-0">TBD</div>
          )}
          <div className={`min-w-0 ${isRight ? "text-right" : ""}`}>
            <span
              className="inline-block text-[8px] sm:text-[9px] font-bold tracking-widest px-2 py-0.5 mb-0.5 rounded-full"
              style={{ background: "#2A2D30", color: "#9CA3AF" }}
            >
              {side === "home" ? "HOME" : "AWAY"}
            </span>
            <div className="text-white font-heading font-bold text-sm sm:text-base lg:text-lg leading-tight truncate max-w-[120px] sm:max-w-[180px]">
              {team?.name || "TBD"}
            </div>
            {teamInsights && <OverlayInsights {...teamInsights} align={align} />}
          </div>
        </div>
        <div
          className={`relative font-display font-black text-white tabular-nums leading-none text-3xl sm:text-4xl lg:text-5xl flex-shrink-0 ${isRight ? "order-first" : ""}`}
        >
          {hasPossession && (
            <span
              aria-hidden
              className="absolute inset-0 -m-2 pointer-events-none rounded-full"
              style={{
                background: "radial-gradient(circle, rgba(118,229,154,0.55) 0%, rgba(118,229,154,0) 70%)",
                boxShadow: "0 0 24px 6px rgba(118,229,154,0.45)",
              }}
            />
          )}
          <span className="relative" style={hasPossession ? { textShadow: "0 0 14px rgba(118,229,154,0.8)" } : undefined}>
            {score}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className={`absolute ${posClass} left-0 right-0 z-20 pointer-events-none`}>
      <div className="flex items-stretch w-full" style={{ background: "#0E0F11" }}>
        <SplitTeamCell team={homeTeam} align="left" score={homeScore} insights={isBasketball ? insights.home : null} side="home" hasPossession={possessionHome} />

        {/* Center column */}
        <div
          className="flex flex-col items-center justify-center gap-1.5 px-4 sm:px-6 py-2 flex-shrink-0"
          style={{ background: "#76E59A", minWidth: 160, flex: "0 0 160px" }}
        >
          <div className="flex items-center gap-1.5">
            <span
              className="text-[8px] sm:text-[9px] font-black tracking-widest px-2 py-0.5 rounded-full"
              style={{ background: "#065F46", color: "#FFFFFF" }}
            >
              {game.status === "completed" ? "FINAL" : "● LIVE"}
            </span>
            <span
              className="text-[8px] sm:text-[9px] font-black tracking-widest px-2 py-0.5 rounded-full"
              style={{ background: "#5D5D5D", color: "#FFFFFF" }}
            >
              {periodLabel}
            </span>
          </div>
          <OverlayTimerBits gameId={game.id} game={game} tone="dark" />
        </div>

        <SplitTeamCell team={awayTeam} align="right" score={awayScore} insights={isBasketball ? insights.away : null} side="away" hasPossession={possessionAway} />
      </div>
    </div>
  );
}