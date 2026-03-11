import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

function aggregateStats(statsForGame, teamId, sport) {
  const byPlayer = new Map();
  const teamStats = statsForGame.filter((s) => s.team_id === teamId);

  teamStats.forEach((s) => {
    const id = s.player_id;
    if (!byPlayer.has(id)) {
      byPlayer.set(id, { points: 0, rebounds: 0, assists: 0, blocks: 0 });
    }
    const agg = byPlayer.get(id);

    const vbAttacks = s.attacks ?? s.field_goals_made ?? 0; // support legacy naming
    const vbAces = s.aces ?? s.three_pointers ?? 0;         // support legacy naming

    agg.points += sport === "basketball"
      ? (s.points || 0)
      : (vbAttacks + vbAces + (s.blocks || 0));

    agg.rebounds += s.rebounds || 0;
    agg.assists += s.assists || 0;
    agg.blocks += s.blocks || 0;
  });

  return Array.from(byPlayer.entries()).map(([player_id, vals]) => ({ player_id, ...vals }));
}

export default function GameCompactStats({ game, allPlayerStats = [], allPlayers = [], sport = "basketball" }) {
  const statsForGame = Array.isArray(allPlayerStats)
    ? allPlayerStats.filter((s) => s.game_id === game.id)
    : [];

  const home = aggregateStats(statsForGame, game.home_team_id, sport)
    .map((row) => ({
      ...row,
      player: allPlayers.find((p) => p.id === row.player_id) || {},
    }))
    .sort((a, b) => b.points - a.points);

  const away = aggregateStats(statsForGame, game.away_team_id, sport)
    .map((row) => ({
      ...row,
      player: allPlayers.find((p) => p.id === row.player_id) || {},
    }))
    .sort((a, b) => b.points - a.points);

  const renderTable = (rows) => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
            <th className="py-2 pr-2 font-semibold">Player</th>
            <th className="py-2 px-2 text-center font-semibold">PTS</th>
            <th className="py-2 px-2 text-center font-semibold">REB</th>
            <th className="py-2 px-2 text-center font-semibold">AST</th>
            <th className="py-2 px-2 text-center font-semibold">BLK</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.player_id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/40">
              <td className="py-2 pr-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Avatar className="w-7 h-7 border border-gray-200 dark:border-gray-700">
                    <AvatarImage src={r.player?.photo_url} />
                    <AvatarFallback className="bg-gray-200 dark:bg-gray-700 text-[10px] font-bold">
                      {r.player?.jersey_number || ""}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-semibold text-gray-900 dark:text-white truncate">
                    {r.player?.first_name} {r.player?.last_name}
                  </span>
                </div>
              </td>
              <td className="py-2 px-2 text-center font-bold text-gray-900 dark:text-white">{r.points}</td>
              <td className="py-2 px-2 text-center font-semibold text-gray-800 dark:text-gray-200">{sport === "basketball" ? r.rebounds : "-"}</td>
              <td className="py-2 px-2 text-center font-semibold text-gray-800 dark:text-gray-200">{sport === "basketball" ? r.assists : "-"}</td>
              <td className="py-2 px-2 text-center font-semibold text-gray-800 dark:text-gray-200">{r.blocks}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const noData = home.length === 0 && away.length === 0;

  return (
    <div className="bg-white/60 dark:bg-gray-900/60 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
      {noData ? (
        <div className="text-xs text-gray-500 dark:text-gray-400">No player statistics recorded for this game.</div>
      ) : (
        <div className="space-y-4">
          <div>
            <div className="text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">Home Team</div>
            {renderTable(home)}
          </div>
          <div>
            <div className="text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">Away Team</div>
            {renderTable(away)}
          </div>
        </div>
      )}
    </div>
  );
}