// Pure helpers for the Timekeeper feature. No React — safe to import anywhere.

export function pad2(n) {
  return n < 10 ? `0${n}` : `${n}`;
}

// Format milliseconds as a game clock: M:SS (or H:MM:SS past an hour).
export function formatGameClock(ms) {
  const clamped = Math.max(0, Math.floor((ms || 0) / 1000));
  const h = Math.floor(clamped / 3600);
  const m = Math.floor((clamped % 3600) / 60);
  const s = clamped % 60;
  if (h > 0) return `${h}:${pad2(m)}:${pad2(s)}`;
  return `${m}:${pad2(s)}`;
}

// Format milliseconds as a shot clock: whole seconds, ceil so it never shows 0 early.
export function formatShotClock(ms) {
  const secs = Math.max(0, Math.ceil((ms || 0) / 1000));
  return `${secs}`;
}

// Live remaining ms for a clock, computed from end_iso when running.
export function computeLiveMs(timer, clockType, nowMs = Date.now()) {
  if (!timer) return 0;
  const running = clockType === "game" ? timer.game_clock_running : timer.shot_clock_running;
  const endIso = clockType === "game" ? timer.game_clock_end_iso : timer.shot_clock_end_iso;
  const remaining = clockType === "game" ? timer.game_clock_remaining_ms : timer.shot_clock_remaining_ms;
  if (running && endIso) {
    return Math.max(0, new Date(endIso).getTime() - nowMs);
  }
  return remaining || 0;
}

export function periodLabel(structure, period) {
  const p = period || 1;
  switch (structure) {
    case "halves":
      return p === 1 ? "First Half" : p === 2 ? "Second Half" : `Half ${p}`;
    case "sets":
      return `Set ${p}`;
    case "periods":
      return `Period ${p}`;
    case "quarters":
    default:
      return p <= 4 ? `Quarter ${p}` : `Overtime ${p - 4}`;
  }
}

// Parse "M:SS" or "MM:SS" or "H:MM:SS" into milliseconds.
export function parseClockInput(text) {
  if (!text) return null;
  const parts = text.split(":").map((s) => s.trim());
  if (parts.some((p) => p === "" || isNaN(Number(p)))) return null;
  let h = 0, m = 0, s = 0;
  if (parts.length === 3) [h, m, s] = parts.map(Number);
  else if (parts.length === 2) [m, s] = parts.map(Number);
  else if (parts.length === 1) [s] = parts.map(Number);
  else return null;
  return (h * 3600 + m * 60 + s) * 1000;
}

export function defaultTimerForGame(game) {
  const isBasketball = game?.sport === "basketball";
  return {
    game_id: game?.id,
    organization_id: game?.organization_id,
    season_id: game?.season_id,
    timekeeper_email: game?.timekeeper_email,
    period_length_seconds: isBasketball ? 600 : 900,
    period_count: isBasketball ? 4 : 3,
    period_structure: isBasketball ? "quarters" : "sets",
    shot_clock_length_seconds: isBasketball ? 24 : 0,
    current_period: 1,
    game_clock_remaining_ms: (isBasketball ? 600 : 900) * 1000,
    game_clock_running: false,
    game_clock_end_iso: null,
    shot_clock_remaining_ms: (isBasketball ? 24 : 0) * 1000,
    shot_clock_running: false,
    shot_clock_end_iso: null,
  };
}