import React from "react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// A "League Standings" styled table. Pure presentation — receives a single
// division's data and renders it. All data fields & columns are preserved.
export default function StandingsTable({ divisionData, organization, accent = "orange" }) {
  const accentStyles = {
    orange: {
      rank: "text-orange-400",
      line: "from-orange-500",
      fallback: "from-orange-500 to-orange-600",
      image: "https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=1000&q=70",
      overlay: "from-orange-600/85 via-amber-600/70 to-red-600/80",
    },
    blue: {
      rank: "text-cyan-400",
      line: "from-cyan-500",
      fallback: "from-blue-500 to-blue-600",
      image: "https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?auto=format&fit=crop&w=1000&q=70",
      overlay: "from-blue-600/85 via-cyan-600/70 to-sky-500/80",
    },
  }[accent] || {
    rank: "text-orange-400",
    line: "from-orange-500",
    fallback: "from-orange-500 to-orange-600",
    image: "https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=1000&q=70",
    overlay: "from-orange-600/85 via-amber-600/70 to-red-600/80",
  };

  return (
    <Card className="mb-6 overflow-hidden border border-border shadow-2xl rounded-3xl bg-card dark:bg-gradient-to-br dark:from-[#10162b] dark:via-[#0d1326] dark:to-[#0a0f1f]">
      {/* Header band with sport background image */}
      <div className="relative px-6 py-6 border-b border-border overflow-hidden">
        <img src={accentStyles.image} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className={`absolute inset-0 bg-gradient-to-r ${accentStyles.overlay}`} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        <div className="relative flex items-center justify-between">
          <div>
            <p className="text-white/90 text-xs font-bold tracking-[0.3em] uppercase mb-1 drop-shadow">
              {accent === "blue" ? "Volleyball League" : "Basketball League"}
            </p>
            <h3 className="text-2xl md:text-3xl font-black text-white italic tracking-tight drop-shadow-lg">
              {divisionData.division}
            </h3>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:block text-sm font-bold text-white/90 drop-shadow">{organization?.name}</span>
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
        <div className="grid grid-cols-[40px_1fr_repeat(6,minmax(0,40px))] sm:grid-cols-[56px_1fr_repeat(6,minmax(0,56px))] items-center gap-2 text-[10px] sm:text-xs font-bold tracking-widest text-muted-foreground uppercase px-2">
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
            className="group relative grid grid-cols-[40px_1fr_repeat(6,minmax(0,40px))] sm:grid-cols-[56px_1fr_repeat(6,minmax(0,56px))] items-center gap-2 rounded-full pl-2 pr-3 sm:pr-5 py-2.5 bg-muted/50 hover:bg-muted dark:bg-white/[0.03] dark:hover:bg-white/[0.07] border border-border hover:border-primary/40 transition-all duration-300"
          >
            {/* accent leading bar for top rank */}
            {i === 0 && (
              <span className={`absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 rounded-full bg-gradient-to-b ${accentStyles.line} to-transparent`} />
            )}
            <div className={`text-xl sm:text-2xl font-black italic text-center ${i < 3 ? accentStyles.rank : "text-muted-foreground"}`}>
              {i + 1}
            </div>
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 pl-1">
              <Avatar className="w-9 h-9 sm:w-10 sm:h-10 border border-white/20 shadow-md bg-white/90 shrink-0">
                <AvatarImage src={team.logo_url} className="object-contain" />
                <AvatarFallback className={`bg-gradient-to-br ${accentStyles.fallback} text-white text-xs font-bold`}>
                  {team.name?.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="font-black text-foreground uppercase tracking-wide text-sm sm:text-base truncate">
                {team.name}
              </span>
            </div>
            <div className="text-center font-bold text-foreground text-sm sm:text-base">{team.wins}</div>
            <div className="text-center font-bold text-foreground text-sm sm:text-base">{team.losses}</div>
            <div className="text-center font-bold text-foreground text-sm sm:text-base">{(team.winPct * 100).toFixed(0)}%</div>
            <div className="text-center font-semibold text-muted-foreground text-sm sm:text-base">{team.avgPointsFor}</div>
            <div className="text-center font-semibold text-muted-foreground text-sm sm:text-base">{team.avgPointsAgainst}</div>
            <div className={`text-center font-black italic text-sm sm:text-base ${team.diff > 0 ? "text-emerald-500 dark:text-emerald-400" : team.diff < 0 ? "text-rose-500 dark:text-rose-400" : "text-muted-foreground"}`}>
              {team.diff > 0 ? "+" : ""}{team.diff}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}