import React from "react";
import { useGameTimer } from "@/lib/useGameTimer";
import { formatGameClock, formatShotClock } from "@/lib/timerLogic";

/**
 * Inline game-clock + shot-clock bits for the ScoreOverlay (broadcast & in-app).
 * Drops into the overlay's center column. Renders null when there is no timer
 * or the game has no assigned scorekeeper, so the overlay is unchanged.
 */
export default function OverlayTimerBits({ gameId, game, tone = "light" }) {
  const {
    timer,
    gameClockMs,
    shotClockMs,
    gameClockRunning,
    shotClockRunning,
    periodLabel: pLabel,
    shotClockLengthSeconds,
  } = useGameTimer(gameId);

  const hasOperator =
    (Array.isArray(game?.assigned_scorekeeper_emails) &&
      game.assigned_scorekeeper_emails.length > 0) ||
    !!game?.timekeeper_email;

  if (!hasOperator || !timer) return null;

  const showShotClock = (shotClockLengthSeconds || 0) > 0;
  const dark = tone === "dark";
  const idleColor = dark ? "text-[#0E0F11]" : "text-white";
  const idleShotColor = dark ? "text-[#0E0F11]/70" : "text-white/80";

  return (
    <div className="flex flex-col items-center gap-0.5">
      <span
        className={`font-display font-black tabular-nums leading-none ${
          gameClockRunning ? "text-red-600" : idleColor
        } text-lg sm:text-2xl lg:text-3xl`}
      >
        {formatGameClock(gameClockMs)}
      </span>
      {showShotClock && (
        <span
          className={`font-display font-black tabular-nums leading-none text-xs sm:text-sm ${
            shotClockRunning ? "text-red-600" : idleShotColor
          }`}
        >
          ⏱ {formatShotClock(shotClockMs)}
        </span>
      )}
    </div>
  );
}