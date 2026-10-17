import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from "react";
import { useQueryClient, useIsFetching } from "@tanstack/react-query";

const StatsRefreshContext = createContext(null);

const STORAGE_KEY = "autoRefreshStats";
export const STATS_REFRESH_INTERVAL_MS = 180000; // 3 minutes

// Query-key prefixes invalidated together on a manual/auto refresh so stats,
// standings, teams, players, and games all reload as a coordinated set across
// Home, Dashboard, and Statistics.
export const STATS_INVALIDATE_PREFIXES = [
  "all-player-stats-home",
  "all-teams-home",
  "all-players-home",
  "all-games-home",
  "playerGameStats",
  "player-leaders-stats",
  "player-leaders-games",
  "teams",
  "players",
  "games",
  "dashboard-games",
];

// Subset that drives the "Refreshing…" indicator on the shared control.
// Excludes the Dashboard's fast 15s entity polls (teams/players/dashboard-games)
// so the button doesn't flicker on every background refetch; those still
// invalidate on a manual refresh.
export const STATS_FETCHING_PREFIXES = [
  "all-player-stats-home",
  "playerGameStats",
  "player-leaders-stats",
  "player-leaders-games",
];

// Back-compat alias (invalidation set).
export const STATS_QUERY_PREFIXES = STATS_INVALIDATE_PREFIXES;

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
    STATS_INVALIDATE_PREFIXES.forEach((prefix) => {
      queryClient.invalidateQueries({ queryKey: [prefix] });
    });
  }, [queryClient]);

  // True when any tracked stats query (across all pages) is fetching.
  const fetchingCount = useIsFetching({
    predicate: (query) => STATS_FETCHING_PREFIXES.includes(query.queryKey[0]),
  });

  // Track whether any coordinated query is in an error state so we can surface
  // a refresh-failure banner with retry instead of silently showing partial data.
  const [refreshError, setRefreshError] = useState(false);
  useEffect(() => {
    const check = () => {
      const queries = queryClient.getQueryCache().getAll();
      const hasError = queries.some(
        (q) =>
          STATS_INVALIDATE_PREFIXES.includes(q.queryKey[0]) &&
          q.state.status === "error"
      );
      setRefreshError(hasError);
    };
    check();
    const unsubscribe = queryClient.getQueryCache().subscribe(check);
    return unsubscribe;
  }, [queryClient]);

  const value = useMemo(
    () => ({
      autoRefreshStats,
      refreshIntervalMs: STATS_REFRESH_INTERVAL_MS,
      toggleAutoRefresh,
      refreshAllStats,
      isFetching: fetchingCount > 0,
      refreshError,
    }),
    [autoRefreshStats, toggleAutoRefresh, refreshAllStats, fetchingCount, refreshError]
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