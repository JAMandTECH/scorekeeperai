import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { computeLiveMs, periodLabel } from "@/lib/timerLogic";

/**
 * Subscribes to the GameTimer record for a game and computes live-ticking
 * display values for the game clock and shot clock. Read-only.
 *
 * Returns null-ish values when no timer exists so callers can choose to hide.
 */
export function useGameTimer(gameId) {
  const [timer, setTimer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());

  // Fetch + subscribe
  useEffect(() => {
    if (!gameId) {
      setTimer(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const records = await base44.entities.GameTimer.filter({ game_id: gameId });
        if (cancelled) return;
        setTimer(Array.isArray(records) && records.length ? records[0] : null);
      } catch (e) {
        console.error("useGameTimer fetch error:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    const unsubscribe = base44.entities.GameTimer.subscribe((event) => {
      // Only care about timers for this game
      if (event.data?.game_id !== gameId) return;
      if (event.type === "create" || event.type === "update") {
        setTimer(event.data);
      } else if (event.type === "delete") {
        setTimer(null);
      }
    });

    return () => {
      cancelled = true;
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, [gameId]);

  // Local ticking while a clock is running
  const anyRunning = timer?.game_clock_running || timer?.shot_clock_running;
  useEffect(() => {
    if (!anyRunning) return;
    const id = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(id);
  }, [anyRunning]);

  const gameClockMs = timer ? computeLiveMs(timer, "game", now) : null;
  const shotClockMs = timer ? computeLiveMs(timer, "shot", now) : null;

  const refetch = useCallback(async () => {
    if (!gameId) return;
    try {
      const records = await base44.entities.GameTimer.filter({ game_id: gameId });
      setTimer(Array.isArray(records) && records.length ? records[0] : null);
    } catch (e) {
      console.error("useGameTimer refetch error:", e);
    }
  }, [gameId]);

  return {
    timer,
    loading,
    gameClockMs,
    shotClockMs,
    gameClockRunning: !!timer?.game_clock_running,
    shotClockRunning: !!timer?.shot_clock_running,
    currentPeriod: timer?.current_period ?? null,
    periodStructure: timer?.period_structure ?? "quarters",
    periodCount: timer?.period_count ?? null,
    periodLengthSeconds: timer?.period_length_seconds ?? null,
    shotClockLengthSeconds: timer?.shot_clock_length_seconds ?? null,
    periodLabel: timer ? periodLabel(timer.period_structure, timer.current_period) : null,
    refetch,
  };
}