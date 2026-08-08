import React from "react";
import { BarChart3, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useStatsRefresh } from "@/lib/StatsRefreshContext";

/**
 * Shared refresh control for player statistics surfaces.
 * Reads the global auto-refresh toggle and manual-refresh action from
 * StatsRefreshContext so Home, Dashboard, and Statistics stay in sync.
 */
export default function StatsRefreshControl() {
  const { autoRefreshStats, toggleAutoRefresh, refreshAllStats, isFetching } = useStatsRefresh();

  return (
    <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl bg-white/60 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 backdrop-blur-sm">
      <div className="flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        <div>
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">Player Statistics Refresh</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">Auto-refreshes every 3 minutes when enabled</p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Label htmlFor="toggle-auto-refresh-stats" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
            Auto (3 min)
          </Label>
          <Switch
            id="toggle-auto-refresh-stats"
            checked={autoRefreshStats}
            onCheckedChange={toggleAutoRefresh}
          />
        </div>
        <Button
          onClick={refreshAllStats}
          disabled={isFetching}
          className="bg-blue-600 hover:bg-blue-700 text-white"
          size="sm"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
          {isFetching ? "Refreshing…" : "Refresh Now"}
        </Button>
      </div>
    </div>
  );
}