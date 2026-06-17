import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

/**
 * FIFA-style leader card. Rounded panel with a header (icon + title + org),
 * and pill rows: medal-colored rank square, jersey circle, name + club, big value.
 * Adapts to light & dark mode.
 *
 * Each row in `data` is expected to provide:
 *   first_name, last_name, jersey_number, photo_url, teamName, teamLogoUrl,
 *   total (big number), average + averageLabel (sub text)
 */
export default function LeaderCard({ title, icon: Icon, iconGradient = "from-blue-500 to-blue-600", organization, data = [], emptyText = "No data available." }) {
  return (
    <div className="rounded-2xl bg-white dark:bg-[#0e1626] border border-gray-200 dark:border-slate-800/80 shadow-lg dark:shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-4 border-b border-gray-100 dark:border-slate-800/70">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-10 h-10 shrink-0 bg-gradient-to-br ${iconGradient} rounded-xl flex items-center justify-center shadow-lg`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          <h3 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white truncate">{title}</h3>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {organization?.name && (
            <span className="text-sm font-bold text-gray-600 dark:text-slate-300 hidden sm:inline truncate max-w-[180px]">{organization.name}</span>
          )}
          {organization?.logo_url && (
            <Avatar className="w-10 h-10 border-2 border-gray-200 dark:border-slate-700 shadow-md">
              <AvatarImage src={organization.logo_url} />
              <AvatarFallback className="bg-gradient-to-br from-orange-500 to-red-600 text-white font-black text-xs">
                {(organization.name || "").substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      </div>

      {/* Rows */}
      <div className="p-2.5 sm:p-3 space-y-2">
        {data.length === 0 && (
          <div className="text-sm text-gray-500 dark:text-slate-400 px-2 py-6 text-center">{emptyText}</div>
        )}
        {data.map((player, i) => (
          <div
            key={player.id || player.player_id || i}
            className="group flex items-center gap-3 rounded-xl bg-gray-50 dark:bg-gradient-to-r dark:from-[#141d2e] dark:to-[#0f1827] border border-gray-100 dark:border-slate-800/70 px-2.5 sm:px-3 py-2.5 hover:bg-gray-100 dark:hover:from-[#1a2536] transition-colors"
          >
            {/* Rank square (medal colors top 3) */}
            <div
              className={`w-9 h-9 sm:w-10 sm:h-10 shrink-0 rounded-lg flex items-center justify-center text-sm font-black shadow-md ${
                i === 0
                  ? "bg-gradient-to-br from-yellow-400 to-yellow-500 text-slate-900"
                  : i === 1
                  ? "bg-gradient-to-br from-slate-300 to-slate-400 text-slate-900"
                  : i === 2
                  ? "bg-gradient-to-br from-orange-500 to-orange-600 text-white"
                  : "bg-gray-200 dark:bg-slate-700/70 text-gray-600 dark:text-slate-300"
              }`}
            >
              {i + 1}
            </div>

            {/* Jersey circle */}
            <Avatar className="w-10 h-10 sm:w-11 sm:h-11 shrink-0 border-2 border-blue-500/40 shadow-md">
              <AvatarImage src={player.photo_url} className="object-cover" />
              <AvatarFallback className="bg-gradient-to-br from-blue-600 to-blue-700 text-white text-xs font-black">
                {player.jersey_number}
              </AvatarFallback>
            </Avatar>

            {/* Name + club */}
            <div className="flex-1 min-w-0">
              <p className="text-sm sm:text-[15px] font-bold text-gray-900 dark:text-white truncate">
                {player.first_name} {player.last_name}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                {player.teamLogoUrl && (
                  <img src={player.teamLogoUrl} alt="" className="w-4 h-4 rounded-full object-cover" />
                )}
                <p className="text-xs text-gray-500 dark:text-slate-400 font-medium truncate">{player.teamName}</p>
              </div>
            </div>

            {/* Big value */}
            <div className="text-right shrink-0 pl-1">
              <p className="text-2xl sm:text-3xl font-black text-blue-600 dark:text-blue-400 tabular-nums leading-none">{player.total}</p>
              <p className="text-[11px] text-gray-500 dark:text-slate-400 font-semibold mt-1">
                {player.average} {player.averageLabel}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}