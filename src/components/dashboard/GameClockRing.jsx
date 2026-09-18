import React from "react";
import { useGameTimer } from "@/lib/useGameTimer";
import { formatGameClock } from "@/lib/timerLogic";

/**
 * Circular SVG progress ring showing the live game clock countdown.
 * Read-only — subscribes to the GameTimer for the given game.
 */
export default function GameClockRing({ gameId, size = 120 }) {
  const { timer, loading, gameClockMs, gameClockRunning, periodLabel } = useGameTimer(gameId);

  if (loading || !timer || gameClockMs == null) return null;

  const periodMs = (timer.period_length_seconds || 600) * 1000;
  const progress = periodMs > 0 ? Math.max(0, Math.min(1, gameClockMs / periodMs)) : 0;
  const stroke = 7;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - progress);
  const ringColor = gameClockRunning ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))";

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--border))" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={ringColor}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{
            transition: "stroke-dashoffset 0.5s linear",
            filter: gameClockRunning ? `drop-shadow(0 0 6px ${ringColor})` : "none",
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className={`font-heading text-2xl font-bold tabular-nums leading-none ${
            gameClockRunning ? "text-primary" : "text-foreground"
          }`}
        >
          {formatGameClock(gameClockMs)}
        </span>
        <span className="mt-1 text-[10px] font-heading font-bold uppercase tracking-widest text-muted-foreground">
          {periodLabel}
        </span>
      </div>
    </div>
  );
}