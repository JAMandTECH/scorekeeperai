import React from "react";
import StatButton from "./StatButton";

export default function PlayerRow({ player, teamId, game, sport, onLog, isLoading }) {
  const fullName = `${player.first_name || ""} ${player.last_name || ""}`.trim();

  const renderBasketball = () => (
    <div className="flex flex-wrap gap-2">
      <StatButton label="+1 FT" onClick={() => onLog(player, teamId, [{ statType: 'points', value: 1 }, { statType: 'free_throws_made', value: 1 }])} />
      <StatButton label="+2" onClick={() => onLog(player, teamId, [{ statType: 'points', value: 2 }, { statType: 'field_goals_made', value: 1 }])} />
      <StatButton label="+3" onClick={() => onLog(player, teamId, [{ statType: 'points', value: 3 }, { statType: 'three_pointers', value: 1 }, { statType: 'field_goals_made', value: 1 }])} />
      <StatButton label="Reb" onClick={() => onLog(player, teamId, [{ statType: 'rebounds', value: 1 }])} variant="secondary" />
      <StatButton label="Ast" onClick={() => onLog(player, teamId, [{ statType: 'assists', value: 1 }])} variant="secondary" />
      <StatButton label="Stl" onClick={() => onLog(player, teamId, [{ statType: 'steals', value: 1 }])} variant="secondary" />
      <StatButton label="Blk" onClick={() => onLog(player, teamId, [{ statType: 'blocks', value: 1 }])} variant="secondary" />
      <StatButton label="Foul" onClick={() => onLog(player, teamId, [{ statType: 'fouls', value: 1 }])} variant="destructive" />
    </div>
  );

  const renderVolleyball = () => (
    <div className="flex flex-wrap gap-2">
      <StatButton label="Attack" onClick={() => onLog(player, teamId, [{ statType: 'attacks', value: 1 }])} />
      <StatButton label="Ace" onClick={() => onLog(player, teamId, [{ statType: 'aces', value: 1 }])} />
      <StatButton label="Block" onClick={() => onLog(player, teamId, [{ statType: 'blocks', value: 1 }])} />
      <StatButton label="Rally Err" onClick={() => onLog(player, teamId, [{ statType: 'rally_errors', value: 1 }])} variant="destructive" />
    </div>
  );

  return (
    <div className="w-full rounded-2xl border bg-white p-3 md:p-4 shadow-sm flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {player.jersey_number && (
            <div className="h-9 w-9 md:h-10 md:w-10 rounded-full bg-slate-100 text-slate-700 grid place-items-center text-sm md:text-base font-semibold">
              {player.jersey_number}
            </div>
          )}
          <div className="text-sm md:text-base font-medium">{fullName || `Player ${player.id.slice(-4)}`}</div>
        </div>
      </div>
      <div className={`${isLoading ? 'opacity-60 pointer-events-none' : ''}`}>
        {sport === 'volleyball' ? renderVolleyball() : renderBasketball()}
      </div>
    </div>
  );
}