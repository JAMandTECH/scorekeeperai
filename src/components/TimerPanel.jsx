import React from "react";
import { useGameTimer } from "@/lib/useGameTimer";
import { formatGameClock, formatShotClock } from "@/lib/timerLogic";

/**
 * Read-only timer panel for the public scoreboard and dashboard.
 * Renders ONLY when a GameTimer exists AND the game has an assigned scorekeeper
 * (assigned_scorekeeper_emails non-empty) — otherwise returns null so the
 * existing scoreboard renders exactly as before.
 *
 * Props:
 *   gameId   - the Game id
 *   game     - the Game record (used to check assigned_scorekeeper_emails)
 *   variant  - "scoreboard" (editorial, for PublicGameView) | "compact" (dashboard)
 */
export default function TimerPanel({ gameId, game, variant = "scoreboard" }) {
  const {
    timer,
    loading,
    gameClockMs,
    shotClockMs,
    gameClockRunning,
    shotClockRunning,
    periodLabel: pLabel,
    shotClockLengthSeconds,
  } = useGameTimer(gameId);

  const hasScorekeeper =
    Array.isArray(game?.assigned_scorekeeper_emails) &&
    game.assigned_scorekeeper_emails.length > 0;

  // No timer or no scorekeeper → render nothing (existing UI untouched)
  if (!hasScorekeeper) return null;
  if (loading || !timer) return null;

  const showShotClock = (shotClockLengthSeconds || 0) > 0;

  if (variant === "compact") {
    return (
      <div className="flex items-center gap-3 border border-border bg-card px-3 py-2">
        <span className="text-[10px] font-heading font-bold uppercase tracking-widest text-muted-foreground">
          {pLabel}
        </span>
        <span
          className={`font-heading text-2xl font-bold tabular-nums ${
            gameClockRunning ? "text-primary" : "text-foreground"
          }`}
        >
          {formatGameClock(gameClockMs)}
        </span>
        {showShotClock && (
          <span className="flex items-center gap-1 border-l border-border pl-3">
            <span className="text-[10px] font-heading font-bold uppercase tracking-widest text-muted-foreground">
              Shot
            </span>
            <span
              className={`font-heading text-lg font-bold tabular-nums ${
                shotClockRunning ? "text-destructive" : "text-foreground"
              }`}
            >
              {formatShotClock(shotClockMs)}
            </span>
          </span>
        )}
      </div>
    );
  }

  // "scoreboard" variant — editorial, sits inside the PublicGameView scoreboard card
  return (
    <div className="flex items-stretch border-y border-border">
      <div className="flex-1 flex flex-col items-center justify-center py-3 px-4 border-r border-border">
        <span className="text-[10px] font-heading font-bold uppercase tracking-widest text-muted-foreground mb-1">
          {pLabel}
        </span>
        <span
          className={`font-heading text-4xl font-bold tabular-nums leading-none ${
            gameClockRunning ? "text-primary" : "text-foreground"
          }`}
        >
          {formatGameClock(gameClockMs)}
        </span>
      </div>
      {showShotClock ? (
        <div className="flex flex-col items-center justify-center py-3 px-6">
          <span className="text-[10px] font-heading font-bold uppercase tracking-widest text-muted-foreground mb-1">
            Shot Clock
          </span>
          <span
            className={`font-heading text-4xl font-bold tabular-nums leading-none ${
              shotClockRunning ? "text-destructive" : "text-foreground"
            }`}
          >
            {formatShotClock(shotClockMs)}
          </span>
        </div>
      ) : null}
    </div>
  );
}