import React from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, ChevronRight, Edit, Trash2, BarChart3, User, Minus } from "lucide-react";

/**
 * FIFA-style ranked leaderboard.
 * Each row: rank + movement indicator, avatar w/ team flag, name + club,
 * a strip of attribute columns, a large rating badge, and an open chevron.
 */
export default function PlayerLeaderboard({
  players,
  getTeamName,
  getTeamLogo,
  getTeamSport,
  canManagePlayers,
  onEdit,
  onDelete,
  onViewStats,
}) {
  const computeScore = (player) => {
    const pts = player.stats?.[0]?.value || 0;
    const gp = player.games_played || 0;
    if (gp === 0) return pts;
    return Math.round(pts / gp);
  };

  // Sort by overall score descending for ranking
  const ranked = [...players].sort((a, b) => computeScore(b) - computeScore(a));

  return (
    <div className="rounded-2xl bg-[#0b1220] border border-slate-800/80 shadow-2xl overflow-hidden p-2 sm:p-3 space-y-2">
      {ranked.map((player, idx) => {
        const rank = idx + 1;
        const teamLogo = getTeamLogo(player.team_id);
        const score = computeScore(player);
        const isTop = rank === 1;

        return (
          <div
            key={player.id}
            className="group relative flex items-center gap-2 sm:gap-4 rounded-xl bg-gradient-to-r from-[#141d2e] to-[#0e1626] border border-slate-800/70 px-2 sm:px-4 py-2.5 hover:from-[#1a2536] transition-colors"
          >
            {/* Rank + movement */}
            <div className="flex items-center gap-1.5 w-11 sm:w-14 shrink-0">
              {isTop ? (
                <Trophy className="w-6 h-6 text-rose-500 fill-rose-500/30 mx-auto" />
              ) : (
                <span className="text-2xl font-black text-white tabular-nums w-7 text-center">
                  {rank}
                </span>
              )}
              <div className="flex flex-col items-center leading-none">
                <Minus className="w-3 h-3 text-slate-500" />
                <span className="text-[9px] font-bold text-slate-500">0</span>
              </div>
            </div>

            {/* Avatar with team flag */}
            <div className="relative shrink-0">
              <Avatar className="w-11 h-11 sm:w-12 sm:h-12 border-2 border-slate-600/60 shadow-lg">
                <AvatarImage src={player.photo_url} className="object-cover" />
                <AvatarFallback className="bg-slate-700 text-white text-xs font-bold">
                  {player.jersey_number}
                </AvatarFallback>
              </Avatar>
              {teamLogo && (
                <img
                  src={teamLogo}
                  alt=""
                  className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full object-cover border-2 border-[#0e1626]"
                />
              )}
            </div>

            {/* Name + club */}
            <div className="min-w-0 flex-1">
              <p className="font-bold text-white uppercase tracking-wide text-sm sm:text-[15px] truncate">
                {player.first_name} {player.last_name}
              </p>
              <span className="text-[11px] uppercase tracking-wide text-slate-400 truncate block">
                {getTeamName(player.team_id)}
              </span>
            </div>

            {/* Attribute columns */}
            <div className="hidden md:flex items-center">
              {(player.stats || []).map((stat, i) => (
                <div
                  key={i}
                  className="text-center px-3 lg:px-3.5 border-l border-slate-700/50 first:border-l-0"
                >
                  <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                    {stat.label}
                  </div>
                  <div className="text-sm font-bold text-white tabular-nums mt-0.5">
                    {stat.value || 0}
                  </div>
                </div>
              ))}
            </div>

            {/* Rating badge */}
            <div className="shrink-0 ml-1 sm:ml-2">
              <div className="bg-gradient-to-br from-rose-500 to-rose-700 text-white font-black text-xl sm:text-2xl rounded-2xl px-3.5 sm:px-5 py-2 sm:py-2.5 min-w-[56px] sm:min-w-[68px] text-center shadow-lg shadow-rose-500/25 tabular-nums">
                {score}
              </div>
            </div>

            {/* Actions / chevron */}
            <div className="flex items-center justify-end gap-0.5 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onViewStats(player)}
                className="h-8 w-8 text-slate-400 hover:text-blue-400 hover:bg-slate-800"
                title="View statistics"
              >
                <BarChart3 className="w-4 h-4" />
              </Button>
              {canManagePlayers && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(player)}
                    className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-800 hidden sm:inline-flex"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(player)}
                    className="h-8 w-8 text-slate-400 hover:text-rose-400 hover:bg-slate-800 hidden sm:inline-flex"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </>
              )}
              <ChevronRight className="w-6 h-6 text-slate-500 group-hover:text-white transition-colors" />
            </div>
          </div>
        );
      })}

      {ranked.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-slate-500">
          <User className="w-10 h-10 mb-3" />
          <p className="font-bold">No players found</p>
        </div>
      )}
    </div>
  );
}