import React from "react";
import { Loader2 } from "lucide-react";

/**
 * Non-intrusive loading indicator for stats surfaces.
 *
 * Two modes:
 *  - `loading` (first load, no data yet): full card skeleton with spinner + message.
 *  - `fetching` (background refetch, previous data visible): subtle inline pill badge.
 *
 * Props:
 *  - loading: boolean — show the full skeleton state (replaces children)
 *  - fetching: boolean — show the subtle pill badge (rendered above children)
 *  - label: string — text shown in the pill (default "Updating stats…")
 *  - children: content to render when not in the full loading state
 */
export default function StatsFetchingIndicator({
  loading = false,
  fetching = false,
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
      {children}
    </>
  );
}