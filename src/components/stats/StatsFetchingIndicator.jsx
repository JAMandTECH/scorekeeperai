import React from "react";
import { Loader2, AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Non-intrusive loading/failure indicator for stats surfaces.
 *
 * Modes:
 *  - `loading` (first load, no data yet): full card skeleton with spinner + message.
 *  - `fetching` (background refetch, previous data visible): subtle inline pill badge.
 *  - `error` (last refresh failed, previous data retained): inline failure pill with retry.
 *
 * Props:
 *  - loading: boolean — show the full skeleton state (replaces children)
 *  - fetching: boolean — show the subtle pill badge (rendered above children)
 *  - error: boolean — show the failure pill (rendered above children)
 *  - onRetry: function — retry handler invoked from the failure pill
 *  - label: string — text shown in the fetching pill (default "Updating stats…")
 *  - children: content to render when not in the full loading state
 */
export default function StatsFetchingIndicator({
  loading = false,
  fetching = false,
  error = false,
  onRetry,
  label = "Updating stats…",
  children,
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center gap-3 py-10 text-gray-500 dark:text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin text-blue-500 dark:text-blue-400" />
        <span className="text-sm font-semibold">Loading statistics…</span>
      </div>
    );
  }

  return (
    <>
      {fetching && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center gap-2 mb-3 text-xs font-semibold text-blue-600 dark:text-blue-400"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
          </span>
          {label}
        </div>
      )}
      {error && !fetching && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 mb-3 rounded-lg border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/40 px-3 py-2"
        >
          <div className="flex items-center gap-2 text-xs font-semibold text-red-700 dark:text-red-300">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Refresh didn't complete. Showing last saved stats.</span>
          </div>
          {onRetry && (
            <Button
              onClick={onRetry}
              variant="outline"
              size="sm"
              className="h-7 border-red-400 text-red-700 hover:bg-red-100 dark:text-red-300 dark:border-red-700 dark:hover:bg-red-900/40"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Retry
            </Button>
          )}
        </div>
      )}
      {children}
    </>
  );
}