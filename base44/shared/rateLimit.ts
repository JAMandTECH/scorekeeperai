/**
 * Simple in-memory sliding-window rate limiter for per-user usage limits.
 * Defense-in-depth against paid API abuse. Per-worker (not cross-worker),
 * but meaningfully limits automated drain from any single invocation context.
 */

const windows = new Map<string, number[]>();

interface RateLimitConfig {
  maxCalls: number;
  windowMs: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetMs: number;
}

/**
 * Checks whether a user may perform an action within the configured window.
 * Returns { allowed: true } if the call is permitted, { allowed: false } otherwise.
 */
export function checkRateLimit(
  userId: string,
  action: string,
  config: RateLimitConfig
): RateLimitResult {
  const key = `${action}:${userId}`;
  const now = Date.now();
  const windowStart = now - config.windowMs;

  let timestamps = windows.get(key) || [];
  // Prune entries outside the sliding window.
  timestamps = timestamps.filter((ts) => ts > windowStart);

  if (timestamps.length >= config.maxCalls) {
    const oldest = timestamps[0];
    return { allowed: false, remaining: 0, resetMs: oldest + config.windowMs - now };
  }

  timestamps.push(now);
  windows.set(key, timestamps);
  return {
    allowed: true,
    remaining: config.maxCalls - timestamps.length,
    resetMs: 0,
  };
}