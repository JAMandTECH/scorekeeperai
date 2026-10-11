import React from "react";
import { Building2, Users, Calendar, Layers, TrendingUp, Sparkles } from "lucide-react";

export default function ReportOrgSummary({ report }) {
  const { org_stats: stats, ai_summary: ai } = report;

  const tiles = [
    { label: "Registered Teams", value: stats.total_teams, icon: Building2 },
    { label: "Registered Players", value: stats.total_players, icon: Users },
    { label: "Total Games", value: stats.total_games, icon: Calendar },
    { label: "Divisions", value: stats.total_divisions, icon: Layers },
  ];

  return (
    <section className="report-section space-y-6">
      <div>
        <h2 className="text-2xl font-heading font-bold text-foreground">Organization Summary</h2>
        <p className="text-sm text-muted-foreground mt-1">Season statistics at a glance</p>
      </div>

      {/* Stats tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {tiles.map((tile) => (
          <div key={tile.label} className="border border-border bg-card p-5">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <tile.icon className="w-4 h-4" />
              <span className="text-xs font-medium uppercase tracking-wider">{tile.label}</span>
            </div>
            <p className="text-3xl font-heading font-bold text-foreground tabular-nums">{tile.value}</p>
          </div>
        ))}
      </div>

      {/* Completed games + division names */}
      <div className="flex flex-wrap gap-3">
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-border text-xs font-medium text-muted-foreground">
          <Calendar className="w-3.5 h-3.5" />
          {stats.completed_games} completed games
        </span>
        {stats.division_names.map((d) => (
          <span key={d} className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-border text-xs font-medium text-muted-foreground">
            <Layers className="w-3.5 h-3.5" />
            {d}
          </span>
        ))}
      </div>

      {/* AI performance summary */}
      {ai?.performance_summary && (
        <div className="border border-border bg-card p-6">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-heading font-bold text-foreground">Season Performance Analysis</h3>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{ai.performance_summary}</p>
        </div>
      )}

      {/* AI improvement suggestions */}
      {ai?.improvement_suggestions?.length > 0 && (
        <div className="border border-border bg-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-heading font-bold text-foreground">Improvement Suggestions for Next Season</h3>
          </div>
          <ol className="space-y-3">
            {ai.improvement_suggestions.map((suggestion, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 border border-primary text-primary text-xs font-heading font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                <p className="text-sm text-muted-foreground leading-relaxed pt-0.5">{suggestion}</p>
              </li>
            ))}
          </ol>
        </div>
      )}

      {!ai && (
        <div className="border border-border bg-muted/30 p-6 text-center">
          <p className="text-sm text-muted-foreground">
            AI analysis unavailable. Statistical rankings are still shown below.
          </p>
        </div>
      )}
    </section>
  );
}