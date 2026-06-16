import React from "react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// A "League Standings" styled table. Pure presentation — receives a single
// division's data and renders it. All data fields & columns are preserved.
export default function StandingsTable({ divisionData, organization, accent = "orange" }) {
  const accentStyles = {
    orange: { rank: "text-orange-400", line: "from-orange-500", fallback: "from-orange-500 to-orange-600" },
    blue: { rank: "text-cyan-400", line: "from-cyan-500", fallback: "from-blue-500 to-blue-600" },
  }[accent] || { rank: "text-orange-400", line: "from-orange-500", fallback: "from-orange-500 to-orange-600" };

  return (
    <Card className="mb-6 overflow-hidden border-0 shadow-2xl rounded-3xl bg-gradient-to-br from-primary/95 via-primary to-[hsl(217_91%_38%)]">
      {/* Header band */}
      <div className="relative px-6 py-6 border-b border-white/10 bg-gradient-to-r from-white/10 to-transparent">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-cyan-300 text-xs font-bold tracking-[0.3em] uppercase mb-1">League</p>
            <h3 className="text-3xl md:text-4xl font-black text-white italic tracking-tight">
              {divisionData.division}
            </h3>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:block text-sm font-bold text-blue-100/80">{organization?.name}</span>
            {organization?.logo_url && (
              <Avatar className="w-12 h-12 border-2 border-white/20 shadow-lg">
                <AvatarImage src={organization.logo_url} />
                <AvatarFallback className={`bg-gradient-to-br ${accentStyles.fallback} text-white font-black`}>
                  {organization.name?.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            )}
          </div>
        </div>
      </div>

      {/* Column headers */}
      <div className="px-4 sm:px-6 pt-5 pb-2">
        <div className="grid grid-cols-[40px_1fr_repeat(6,minmax(0,40px))] sm:grid-cols-[56px_1fr_repeat(6,minmax(0,56px))] items-center gap-2 text-[10px] sm:text-xs font-bold tracking-widest text-blue-200/50 uppercase px-2">
          <div className="text-left">Pos</div>
          <div className="text-left pl-1">Team</div>
          <div className="text-center">W</div>
          <div className="text-center">L</div>
          <div className="text-center">Pct</div>
          <div className="text-center">PF</div>
          <div className="text-center">PA</div>
          <div className="text-center">Diff</div>
        </div>
      </div>

      {/* Rows */}
      <div className="px-3 sm:px-5 pb-6 space-y-2">
        {divisionData.teams.map((team, i) => (
          <div
            key={team.id}
            className="group relative grid grid-cols-[40px_1fr_repeat(6,minmax(0,40px))] sm:grid-cols-[56px_1fr_repeat(6,minmax(0,56px))] items-center gap-2 rounded-full pl-2 pr-3 sm:pr-5 py-2.5 bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.06] hover:border-cyan-400/40 transition-all duration-300"
          >
            {/* accent leading bar for top rank */}
            {i === 0 && (
              <span className={`absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 rounded-full bg-gradient-to-b ${accentStyles.line} to-transparent`} />
            )}
            <div className={`text-xl sm:text-2xl font-black italic text-center ${i < 3 ? accentStyles.rank : "text-blue-200/40"}`}>
              {i + 1}
            </div>
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 pl-1">
              <Avatar className="w-9 h-9 sm:w-10 sm:h-10 border border-white/20 shadow-md bg-white/90 shrink-0">
                <AvatarImage src={team.logo_url} className="object-contain" />
                <AvatarFallback className={`bg-gradient-to-br ${accentStyles.fallback} text-white text-xs font-bold`}>
                  {team.name?.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="font-black text-white uppercase tracking-wide text-sm sm:text-base truncate">
                {team.name}
              </span>
            </div>
            <div className="text-center font-bold text-white text-sm sm:text-base">{team.wins}</div>
            <div className="text-center font-bold text-white text-sm sm:text-base">{team.losses}</div>
            <div className="text-center font-bold text-blue-100 text-sm sm:text-base">{(team.winPct * 100).toFixed(0)}%</div>
            <div className="text-center font-semibold text-blue-200/80 text-sm sm:text-base">{team.avgPointsFor}</div>
            <div className="text-center font-semibold text-blue-200/80 text-sm sm:text-base">{team.avgPointsAgainst}</div>
            <div className={`text-center font-black italic text-sm sm:text-base ${team.diff > 0 ? "text-emerald-400" : team.diff < 0 ? "text-rose-400" : "text-blue-200/50"}`}>
              {team.diff > 0 ? "+" : ""}{team.diff}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}