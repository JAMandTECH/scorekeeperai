import React from "react";
import {
  aggregateByPlayer,
  getTeamInsights,
  isInPenalty,
  playerLabel,
} from "@/lib/gameInsights";

function topScorerLabel(entry) {
  if (!entry?.player) return "—";
  const p = entry.player;
  const first = p.first_name ? `${p.first_name[0]}. ` : "";
  return `${first}${p.last_name || p.first_name || "—"} ${entry.points}`;
}

function foulTroubleLabel(entries) {
  if (!entries || entries.length === 0) return "—";
  return entries
    .map((e) => {
      const num = e.player?.jersey_number ? `#${e.player.jersey_number}` : "—";
      return `${num} (${e.fouls})`;
    })
    .join(", ");
}

function StatRow({ label, value, warning }) {
  return (
    <div className="flex items-center justify-between text-[10px]">
      <span className="tracking-[0.12em] text-white/45 uppercase">{label}</span>
      <span className={`font-semibold tabular-nums ${warning ? "text-warning" : "text-white/85"}`}>
        {value}
      </span>
    </div>
  );
}

function TeamColumn({ fouls, inPenalty, topScorer, foulTrouble, divider }) {
  return (
    <div className={`px-5 py-3 space-y-1.5 ${divider ? "border-l" : ""}`} style={divider ? { borderColor: "rgba(255,255,255,0.06)" } : undefined}>
      <StatRow label="TEAM FOULS" value={fouls} warning={inPenalty} />
      <StatRow label="TOP SCORER" value={topScorer ? topScorerLabel(topScorer) : "—"} />
      <StatRow label="FOUL TROUBLE" value={foulTroubleLabel(foulTrouble)} warning={foulTrouble.length > 0} />
    </div>
  );
}

export default function ScoreboardInsights({ game, players, playerStats }) {
  if (game?.sport !== "basketball") return null;

  const aggMap = aggregateByPlayer(playerStats);
  const homeFouls = game.home_team_fouls ?? 0;
  const awayFouls = game.away_team_fouls ?? 0;
  const home = getTeamInsights(aggMap, players, game.home_team_id, game);
  const away = getTeamInsights(aggMap, players, game.away_team_id, game);

  return (
    <div className="grid grid-cols-2">
      <TeamColumn
        fouls={homeFouls}
        inPenalty={isInPenalty(game, homeFouls)}
        topScorer={home.topScorer}
        foulTrouble={home.foulTrouble}
      />
      <TeamColumn
        fouls={awayFouls}
        inPenalty={isInPenalty(game, awayFouls)}
        topScorer={away.topScorer}
        foulTrouble={away.foulTrouble}
        divider
      />
    </div>
  );
}