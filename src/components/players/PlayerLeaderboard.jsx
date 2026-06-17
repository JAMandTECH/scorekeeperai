import React from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, ChevronRight, Edit, Trash2, BarChart3, User } from "lucide-react";

/**
 * Dark leaderboard-style player list inspired by a sports ranking layout.
 * Each row: rank, avatar, name + team, stat columns, overall score badge, chevron.
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
    <div className="rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="hidden md:grid grid-cols-[60px_56px_1fr_auto_88px_56px] items-center gap-4 px-6 py-4 border-b border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
        <span className="text-center">Rank</span>
        <span className="text-center">Avatar</span>
        <span>Player</span>
        <span className="text-center hidden lg:block">Stats</span>
        <span className="text-center">Avg Score</span>
        <span></span>
      </div>

      {/* Rows */}
      <div className="divide-y divide-slate-800/60">
        {ranked.map((player, idx) => {
          const rank = idx + 1;
          const sport = getTeamSport(player.team_id);
          const teamLogo = getTeamLogo(player.team_id);
          const score = computeScore(player);
          const isTop = rank === 1;

          return (
            <div
              key={player.id}
              className={`group grid grid-cols-[44px_1fr_auto] md:grid-cols-[60px_56px_1fr_auto_88px_56px] items-center gap-3 md:gap-4 px-4 md:px-6 py-3.5 transition-colors hover:bg-slate-800/40 ${
                isTop ? "bg-gradient-to-r from-rose-500/5 to-transparent" : ""
              }`}
            >
              {/* Rank */}
              <div className="flex items-center justify-center">
                {isTop ? (
                  <Trophy className="w-6 h-6 text-rose-500 fill-rose-500/20" />
                ) : (
                  <span className="text-xl font-black text-slate-300 tabular-nums">{rank}</span>
                )}
              </div>

              {/* Avatar */}
              <Avatar className="w-11 h-11 border-2 border-slate-700 shadow-lg">
                <AvatarImage src={player.photo_url} />
                <AvatarFallback className="bg-slate-700 text-white text-xs font-bold">
                  {player.jersey_number}
                </AvatarFallback>
              </Avatar>

              {/* Name + team */}
              <div className="min-w-0">
                <p className="font-bold text-white uppercase tracking-wide text-sm md:text-base truncate">
                  {player.first_name} {player.last_name}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {teamLogo && (
                    <img src={teamLogo} alt="" className="w-4 h-4 rounded-full object-cover" />
                  )}
                  <span className="text-[11px] uppercase tracking-wide text-slate-400 truncate">
                    {getTeamName(player.team_id)}
                  </span>
                </div>
              </div>

              {/* Stat columns */}
              <div className="hidden lg:flex items-center gap-5">
                {(player.stats || []).map((stat, i) => (
                  <div key={i} className="text-center min-w-[34px]">
                    <div className="text-[10px] font-bold text-rose-400/80 uppercase">{stat.label}</div>
                    <div className="text-sm font-bold text-slate-200 tabular-nums">{stat.value || 0}</div>
                  </div>
                ))}
              </div>

              {/* Score badge */}
              <div className="hidden md:flex justify-center">
                <div className="bg-gradient-to-br from-rose-500 to-rose-600 text-white font-black text-lg rounded-xl px-4 py-2 min-w-[64px] text-center shadow-lg shadow-rose-500/20 tabular-nums">
                  {score}
                </div>
              </div>

              {/* Actions / chevron */}
              <div className="flex items-center justify-end gap-1">
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
                      className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-800"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete(player)}
                      className="h-8 w-8 text-slate-400 hover:text-rose-400 hover:bg-slate-800"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </>
                )}
                <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-slate-300 transition-colors hidden md:block" />
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
    </div>
  );
}