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

function InsightRow({ label, homeValue, awayValue, homeWarning, awayWarning }) {
  return (
    <div className="grid grid-cols-3 items-center text-[10px] py-1">
      <span className={`text-left font-semibold tabular-nums ${homeWarning ? "text-warning" : "text-white/85"}`}>
        {homeValue}
      </span>
      <span className="text-center tracking-[0.12em] text-white/45 uppercase">
        {label}
      </span>
      <span className={`text-right font-semibold tabular-nums ${awayWarning ? "text-warning" : "text-white/85"}`}>
        {awayValue}
      </span>
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
    <div className="px-5 py-3 space-y-1.5">
      <InsightRow
        label="TEAM FOULS"
        homeValue={homeFouls}
        awayValue={awayFouls}
        homeWarning={isInPenalty(game, homeFouls)}
        awayWarning={isInPenalty(game, awayFouls)}
      />
      <InsightRow
        label="TOP SCORER"
        homeValue={home.topScorer ? topScorerLabel(home.topScorer) : "—"}
        awayValue={away.topScorer ? topScorerLabel(away.topScorer) : "—"}
      />
      <InsightRow
        label="FOUL TROUBLE"
        homeValue={foulTroubleLabel(home.foulTrouble)}
        awayValue={foulTroubleLabel(away.foulTrouble)}
        homeWarning={home.foulTrouble.length > 0}
        awayWarning={away.foulTrouble.length > 0}
      />
    </div>
  );
}