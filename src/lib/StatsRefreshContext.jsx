import React, { createContext, useContext, useState, useCallback, useMemo } from "react";
import { useQueryClient, useIsFetching } from "@tanstack/react-query";

const StatsRefreshContext = createContext(null);

const STORAGE_KEY = "autoRefreshStats";
export const STATS_REFRESH_INTERVAL_MS = 180000; // 3 minutes

// Query-key prefixes governed by the global auto-refresh toggle and invalidated
// on a manual refresh. Keeping this list centralized guarantees every stats
// surface (Home, Dashboard, Statistics) stays in sync.
export const STATS_QUERY_PREFIXES = [
  "all-player-stats-home",
  "playerGameStats",
  "player-leaders-stats",
  "player-leaders-games",
];

export function StatsRefreshProvider({ children }) {
  const queryClient = useQueryClient();
  const [autoRefreshStats, setAutoRefreshStats] = useState(
    () => localStorage.getItem(STORAGE_KEY) !== "false"
  );

  const toggleAutoRefresh = useCallback(() => {
    setAutoRefreshStats((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, next.toString());
      return next;
    });
  }, []);

  const refreshAllStats = useCallback(() => {
    STATS_QUERY_PREFIXES.forEach((prefix) => {
      queryClient.invalidateQueries({ queryKey: [prefix] });
    });
  }, [queryClient]);

  // True when any tracked stats query (across all pages) is fetching.
  const fetchingCount = useIsFetching({
    predicate: (query) => STATS_QUERY_PREFIXES.includes(query.queryKey[0]),
  });

  const value = useMemo(
    () => ({
      autoRefreshStats,
      refreshIntervalMs: STATS_REFRESH_INTERVAL_MS,
      toggleAutoRefresh,
      refreshAllStats,
      isFetching: fetchingCount > 0,
    }),
    [autoRefreshStats, toggleAutoRefresh, refreshAllStats, fetchingCount]
  );

  return (
    <StatsRefreshContext.Provider value={value}>
      {children}
    </StatsRefreshContext.Provider>
  );
}

export function useStatsRefresh() {
  const ctx = useContext(StatsRefreshContext);
  if (!ctx) {
    throw new Error("useStatsRefresh must be used within a StatsRefreshProvider");
  }
  return ctx;
}