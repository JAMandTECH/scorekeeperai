import React from "react";
import { Calendar, Layers, Sparkles, TrendingUp } from "lucide-react";

export default function ReportOrgSummary({ report }) {
  const { org_stats: stats, ai_summary: ai } = report;

  const tiles = [
    { label: "Registered Teams", value: stats.total_teams },
    { label: "Registered Players", value: stats.total_players },
    { label: "Total Games", value: stats.total_games },
    { label: "Divisions", value: stats.total_divisions },
  ];

  return (
    <section className="flex flex-col gap-11">
      {/* Section header */}
      <div className="print:hidden flex justify-between items-end border-b border-[#354139] pb-5 bb-rise-1">
        <div>
          <h2 className="text-3xl md:text-[38px] font-extrabold uppercase tracking-[0.02em] text-[#F5F7F4]">Organization Summary</h2>
          <p className="text-[#9fb0a5] text-sm mt-1.5">Season statistics at a glance</p>
        </div>
      </div>

      {/* Metric strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 border border-[#354139] bg-[#17201a] bb-rise-2">
        {tiles.map((tile, i) => (
          <div
            key={tile.label}
            className={`p-6 flex flex-col gap-2.5 ${i < tiles.length - 1 ? "md:border-r border-[#354139]" : ""} ${i < 2 ? "border-b md:border-b-0 border-[#354139]" : ""}`}
          >
            <span className="text-xs uppercase tracking-[0.16em] font-bold text-[#9fb0a5]">{tile.label}</span>
            <b className="text-4xl md:text-[60px] leading-none text-[#25DA67] font-extrabold tabular-nums">{tile.value}</b>
          </div>
        ))}
      </div>

      {/* Chips: completed games + division names */}
      <div className="flex flex-wrap gap-2.5">
        <span className="px-3.5 py-2 border border-[#354139] bg-[#17201a] text-xs uppercase tracking-[0.12em] font-bold text-[#c5d0c9] inline-flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          {stats.completed_games} completed games
        </span>
        {stats.division_names.map((d) => (
          <span key={d} className="px-3.5 py-2 border border-[#354139] bg-[#17201a] text-xs uppercase tracking-[0.12em] font-bold text-[#c5d0c9] inline-flex items-center gap-2">
            <Layers className="w-4 h-4" />
            {d}
          </span>
        ))}
      </div>

      {/* AI cards — two column */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Performance Analysis */}
        {ai?.performance_summary && (
          <div className="bg-[#17201a] border border-[#354139] border-t-[3px] border-t-[#25DA67] p-7">
            <h3 className="text-xl font-extrabold uppercase tracking-[0.02em] text-[#F5F7F4] flex items-center gap-2.5 mb-4">
              <Sparkles className="w-5 h-5 text-[#25DA67]" />
              Season Performance Analysis
            </h3>
            <p className="text-[#c5d0c9] text-sm leading-relaxed whitespace-pre-line">{ai.performance_summary}</p>
          </div>
        )}

        {/* Improvement Suggestions */}
        {ai?.improvement_suggestions?.length > 0 && (
          <div className="bg-[#17201a] border border-[#354139] border-t-[3px] border-t-[#25DA67] p-7">
            <h3 className="text-xl font-extrabold uppercase tracking-[0.02em] text-[#F5F7F4] flex items-center gap-2.5 mb-4">
              <TrendingUp className="w-5 h-5 text-[#25DA67]" />
              Improvement Suggestions for Next Season
            </h3>
            <div className="flex flex-col gap-3.5">
              {ai.improvement_suggestions.map((suggestion, i) => (
                <div key={i} className="flex gap-3.5">
                  <i className="flex-none w-7 h-7 border-2 border-[#25DA67] text-[#25DA67] text-sm font-extrabold flex items-center justify-center not-italic">
                    {i + 1}
                  </i>
                  <p className="text-[#c5d0c9] text-sm leading-relaxed pt-0.5">{suggestion}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* AI unavailable notice */}
      {!ai && (
        <div className="border border-[#354139] p-5 text-center text-[#9fb0a5] text-sm">
          AI analysis unavailable. Statistical rankings are still shown below.
        </div>
      )}
    </section>
  );
}