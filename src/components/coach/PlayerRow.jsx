import React from "react";

const BASKETBALL_STATS = [
  { key: "points", label: "PTS" },
  { key: "rebounds", label: "REB" },
  { key: "assists", label: "AST" },
  { key: "steals", label: "STL" },
  { key: "blocks", label: "BLK" },
  { key: "three_pointers", label: "3PM" },
  { key: "free_throws_made", label: "FTM" },
  { key: "fouls", label: "FLS" },
];

const VOLLEYBALL_STATS = [
  { key: "attacks", label: "ATK" },
  { key: "aces", label: "ACE" },
  { key: "blocks", label: "BLK" },
  { key: "rally_errors", label: "ERR" },
];

export default function PlayerRow({ player, sport, stats }) {
  const fullName = `${player.first_name || ""} ${player.last_name || ""}`.trim();
  const statSet = sport === "volleyball" ? VOLLEYBALL_STATS : BASKETBALL_STATS;
  const totals = stats || {};

  return (
    <div className="w-full border border-border bg-card p-3 md:p-4 flex flex-col gap-3">
      <div className="flex items-center gap-3">
        {player.jersey_number && (
          <div className="h-9 w-9 md:h-10 md:w-10 rounded-full bg-muted text-foreground grid place-items-center text-sm md:text-base font-semibold">
            {player.jersey_number}
          </div>
        )}
        <div className="text-sm md:text-base font-medium">{fullName || `Player ${player.id.slice(-4)}`}</div>
      </div>
      <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
        {statSet.map((s) => (
          <div key={s.key} className="border border-border bg-background px-2 py-1.5 text-center">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{s.label}</div>
            <div className="text-sm md:text-base font-semibold tabular-nums">{Number(totals[s.key] || 0)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}