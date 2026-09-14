import React from "react";
import { Maximize2, Minimize2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatGameClock } from "@/lib/timerLogic";
import ScoreboardInsights from "@/components/ScoreboardInsights";

const NEON = "#ccff00";
const RED = "#ff3b3b";
const DIVIDER = "rgba(255,255,255,0.06)";

function ShotClockRing({ ms, totalSeconds }) {
  const seconds = Math.max(0, Math.ceil((ms || 0) / 1000));
  const radius = 46;
  const circ = 2 * Math.PI * radius;
  const pct = totalSeconds > 0 ? Math.max(0, Math.min(1, seconds / totalSeconds)) : 0;
  const offset = circ * (1 - pct);
  const danger = seconds <= 5;
  return (
    <div className="relative w-[120px] h-[120px] flex items-center justify-center">
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke={danger ? RED : NEON}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1s linear, stroke 0.4s ease", filter: `drop-shadow(0 0 6px ${danger ? RED : NEON}66)` }}
        />
      </svg>
      <span className="font-heading text-4xl font-bold tabular-nums" style={{ color: danger ? RED : "#fff" }}>
        {seconds || 0}
      </span>
    </div>
  );
}

function TeamColumn({ team, side, score, possession, badge }) {
  const initials = (team?.name || "??").substring(0, 2).toUpperCase();
  const hasPossession = possession === side;
  return (
    <div className="flex-1 flex flex-col items-center text-center px-4 py-6 min-w-0">
      <Avatar className="w-14 h-14 mb-3" style={{ border: "2px solid rgba(255,255,255,0.15)" }}>
        <AvatarImage src={team?.logo_url} />
        <AvatarFallback className="text-base font-heading font-bold" style={{ background: "#262626", color: "#fff" }}>
          {initials}
        </AvatarFallback>
      </Avatar>
      <span className="font-heading text-sm font-bold tracking-wide text-white uppercase leading-tight flex items-center gap-1.5">
        {hasPossession && (
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: NEON, boxShadow: `0 0 6px ${NEON}` }} />
        )}
        {team?.name || (side === "home" ? "Home Team" : "Away Team")}
      </span>
      <span className="mt-1.5 mb-3 text-[10px] font-semibold tracking-[0.15em] text-white/55 border border-white/15 rounded-full px-2 py-0.5">
        {badge}
      </span>
      <span className="font-heading text-8xl font-bold tabular-nums text-white leading-none">
        {score}
      </span>
    </div>
  );
}

export default function BroadcastScoreboardCard({
  game,
  homeTeam,
  awayTeam,
  timer,
  gameClockMs,
  shotClockMs,
  gameClockRunning,
  quarterLabel,
  isLive,
  homeScore,
  awayScore,
  onToggleFullscreen,
  isFullscreen,
  players,
  playerStats,
}) {
  const timeOfDay = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const sportLabel = (game?.sport || "game").toUpperCase();
  const hasShotClock = (timer?.shot_clock_length_seconds || 0) > 0;
  const statusLabel =
    game?.status === "completed" ? "FINAL" : game?.status === "scheduled" ? "SCHEDULED" : null;

  return (
    <div
      className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl"
      style={{ background: "#1a1a1a" }}
    >
      <style>{`
        @keyframes bsGlow { 0%,100% { opacity: 0.35; } 50% { opacity: 0.6; } }
      `}</style>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: DIVIDER }}>
        <span
          className="text-[10px] font-bold tracking-[0.15em] rounded-full px-2.5 py-1"
          style={{ background: NEON, color: "#0a0a0a" }}
        >
          {sportLabel}
        </span>
        <span className="text-[10px] font-semibold tracking-[0.15em] text-white/45 uppercase">
          {quarterLabel}
        </span>
        <div className="flex items-center gap-3">
          {isLive ? (
            <span className="flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.15em] text-white/70">
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: NEON, animation: "bsGlow 1.5s ease-in-out infinite" }}
              />
              LIVE
            </span>
          ) : statusLabel ? (
            <span className="text-[10px] font-semibold tracking-[0.15em] text-white/45 uppercase">
              {statusLabel}
            </span>
          ) : null}
          <button
            onClick={onToggleFullscreen}
            className="text-white/40 hover:text-white/70 transition-colors"
            aria-label="Toggle fullscreen scoreboard"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Main split */}
      <div className="flex items-stretch relative">
        <TeamColumn team={homeTeam} side="home" score={homeScore} possession={timer?.possession} badge="HOME" />

        {/* Center clock column */}
        <div className="relative flex flex-col items-center justify-center px-3 py-6 min-w-[150px]">
          <div className="absolute top-0 bottom-0 left-0 w-px" style={{ background: `${NEON}40` }} />
          <div className="absolute top-0 bottom-0 right-0 w-px" style={{ background: `${NEON}40` }} />
          <span className="relative text-[10px] text-white/45 tabular-nums mb-1">{timeOfDay}</span>
          <span
            className="relative font-heading text-4xl font-bold tabular-nums leading-none mb-2"
            style={{ color: gameClockRunning ? "#fff" : "rgba(255,255,255,0.7)" }}
          >
            {timer ? formatGameClock(gameClockMs) : "—"}
          </span>
          <span
            className="relative text-[10px] font-semibold tracking-[0.15em] rounded-full px-2 py-0.5 mb-3"
            style={{ border: `1px solid ${NEON}55`, color: NEON }}
          >
            {quarterLabel}
          </span>
          {hasShotClock && timer ? (
            <div className="relative">
              <ShotClockRing ms={shotClockMs} totalSeconds={timer.shot_clock_length_seconds} />
            </div>
          ) : null}
        </div>

        <TeamColumn team={awayTeam} side="away" score={awayScore} possession={timer?.possession} badge="AWAY" />
      </div>

      {/* Quarter scores */}
      {game?.quarter_scores && game.quarter_scores.length > 0 && (
        <div className="flex justify-center gap-2 py-3 border-t flex-wrap" style={{ borderColor: DIVIDER }}>
          {game.quarter_scores.map((q, idx) => (
            <span
              key={idx}
              className="text-[10px] font-medium px-2 py-0.5 rounded-full"
              style={{ border: `1px solid ${DIVIDER}`, color: "rgba(255,255,255,0.6)" }}
            >
              {game.sport === "basketball" ? `Q${idx + 1}` : `Set ${idx + 1}`}: {q.home}-{q.away}
            </span>
          ))}
        </div>
      )}

      {/* Insights footer */}
      <div className="border-t" style={{ borderColor: DIVIDER, background: "#262626" }}>
        <ScoreboardInsights game={game} players={players} playerStats={playerStats} />
      </div>

      {/* Bottom bar */}
      <div
        className="flex items-center justify-between px-5 py-2 text-[10px] font-medium tracking-[0.1em] text-white/45 uppercase border-t"
        style={{ borderColor: DIVIDER }}
      >
        <span>{game?.court_number ? `Court ${game.court_number}` : game?.location || "—"}</span>
        <span>{game?.game_date ? new Date(game.game_date).toLocaleDateString() : "—"}</span>
      </div>
    </div>
  );
}