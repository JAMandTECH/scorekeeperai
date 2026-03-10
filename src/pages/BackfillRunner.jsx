import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

export default function BackfillRunner() {
  const [status, setStatus] = useState("initial"); // initial | dry_running | applying | done | error
  const [dryResult, setDryResult] = useState(null);
  const [applyResult, setApplyResult] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        // Ensure user is authenticated and let backend enforce admin
        const isAuth = await base44.auth.isAuthenticated();
        if (!isAuth) {
          base44.auth.redirectToLogin();
          return;
        }

        setStatus("dry_running");
        const dryRes = await base44.functions.invoke("migrateBasketballStats", {
          // Scope: current user's org inferred server-side
          dry_run: true,
        });
        if (cancelled) return;
        setDryResult(dryRes?.data || null);

        setStatus("applying");
        const applyRes = await base44.functions.invoke("migrateBasketballStats", {
          dry_run: false,
        });
        if (cancelled) return;
        setApplyResult(applyRes?.data || null);

        setStatus("done");
      } catch (e) {
        if (cancelled) return;
        console.error("Backfill error", e);
        setError(e?.message || "Unknown error");
        setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const Stat = ({ label, value }) => (
    <div className="flex items-center justify-between py-1 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium">{String(value ?? "-")}</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 px-4 py-10">
      <div className="max-w-xl mx-auto bg-white rounded-xl shadow p-6 border">
        <h1 className="text-2xl font-semibold mb-2">Basketball Stats Backfill</h1>
        <p className="text-slate-600 mb-4">
          Runs a dry run first for your current organization, then applies fixes automatically.
        </p>

        {status === "initial" && (
          <div className="flex items-center gap-2 text-slate-600">Ready…</div>
        )}

        {status === "dry_running" && (
          <div className="flex items-center gap-2 text-slate-700">
            <Loader2 className="h-4 w-4 animate-spin" /> Dry run in progress…
          </div>
        )}

        {dryResult && (
          <div className="mt-4 p-3 rounded-lg bg-slate-50 border">
            <div className="font-medium mb-2">Dry Run Summary</div>
            <div className="space-y-1">
              <Stat label="processed" value={dryResult.processed} />
              <Stat label="would_fix" value={dryResult.would_fix} />
              <Stat label="issues_found" value={dryResult.issues_found} />
            </div>
          </div>
        )}

        {status === "applying" && (
          <div className="mt-4 flex items-center gap-2 text-slate-700">
            <Loader2 className="h-4 w-4 animate-spin" /> Applying fixes…
          </div>
        )}

        {applyResult && (
          <div className="mt-4 p-3 rounded-lg bg-green-50 border border-green-200">
            <div className="flex items-center gap-2 text-green-700 font-medium">
              <CheckCircle2 className="h-4 w-4" /> Backfill Applied
            </div>
            <div className="mt-2 space-y-1">
              <Stat label="processed" value={applyResult.processed} />
              <Stat label="fixed" value={applyResult.fixed} />
              <Stat label="skipped" value={applyResult.skipped} />
            </div>
          </div>
        )}

        {status === "done" && (
          <div className="mt-4 text-slate-700">All done ✅</div>
        )}

        {status === "error" && (
          <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 flex items-center gap-2">
            <AlertCircle className="h-4 w-4" /> {error}
          </div>
        )}

        <div className="mt-6 text-xs text-slate-500">
          Note: Admin permissions required. Scope: completed basketball games in your current organization.
        </div>
      </div>
    </div>
  );
}