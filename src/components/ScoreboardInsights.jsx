import React from "react";
import { AlertTriangle } from "lucide-react";
import {
  aggregateByPlayer,
  getTeamInsights,
  isInPenalty,
  playerLabel,
} from "@/lib/gameInsights";

// One row: left value | center label | right value
function InsightRow({ label, left, right }) {
  return (
    <div className="grid grid-cols-3 items-center px-4 py-2.5 border-b" style={{ borderColor: "#2D2D2D" }}>
      <div className="text-left font-heading font-bold text-sm tabular-nums" style={{ color: "#E0E0E0" }}>
        {left}
      </div>
      <div className="text-center text-[10px] font-heading font-bold uppercase tracking-widest" style={{ color: "#9CA3AF" }}>
        {label}
      </div>
      <div className="text-right font-heading font-bold text-sm tabular-nums" style={{ color: "#E0E0E0" }}>
        {right}
      </div>
    </div>
  );
}

// Render a category leader cell: "#23 Smith · 14"
function leaderCell(entry, statKey, suffix) {
  if (!entry) return "—";
  const val = entry[statKey] || 0;
  return `${playerLabel(entry)} · ${val}${suffix || ""}`;
}

// Render foul trouble cell: list of "#23 (4)" chips, or "—"
function foulTroubleCell(list) {
  if (!list || list.length === 0) return "—";
  return list.map((e) => `${playerLabel(e)} (${e.fouls})`).join("  ");
}

export default function ScoreboardInsights({ game, players, playerStats }) {
  if (game?.sport !== "basketball") return null;

  const aggMap = aggregateByPlayer(playerStats);
  const homeFouls = game.home_team_fouls ?? 0;
  const awayFouls = game.away_team_fouls ?? 0;
  const home = getTeamInsights(aggMap, players, game.home_team_id, game);
  const away = getTeamInsights(aggMap, players, game.away_team_id, game);

  const homeFoulCell = (
    <span className="inline-flex items-center gap-1.5">
      <span className={isInPenalty(game, homeFouls) ? "text-destructive" : ""}>{homeFouls}</span>
      {isInPenalty(game, homeFouls) && (
        <span className="inline-flex items-center gap-1 text-destructive text-[9px] uppercase tracking-widest">
          <AlertTriangle className="w-2.5 h-2.5" />
          Penalty
        </span>
      )}
    </span>
  );
  const awayFoulCell = (
    <span className="inline-flex items-center gap-1.5">
      {isInPenalty(game, awayFouls) && (
        <span className="inline-flex items-center gap-1 text-destructive text-[9px] uppercase tracking-widest">
          <AlertTriangle className="w-2.5 h-2.5" />
          Penalty
        </span>
      )}
      <span className={isInPenalty(game, awayFouls) ? "text-destructive" : ""}>{awayFouls}</span>
    </span>
  );

  return (
    <div style={{ background: "#1E1E1E" }}>
      {/* Faint gold top accent line */}
      <div style={{ height: "1px", background: "#B5A642", opacity: 0.5 }} />

      <InsightRow label="Team Fouls" left={homeFoulCell} right={awayFoulCell} />
      <InsightRow label="Top Scorer" left={leaderCell(home.topScorer, "points", " PTS")} right={leaderCell(away.topScorer, "points", " PTS")} />
      <InsightRow label="Foul Trouble" left={foulTroubleCell(home.foulTrouble)} right={foulTroubleCell(away.foulTrouble)} />
      <InsightRow label="Top Rebounder" left={leaderCell(home.topRebounder, "rebounds", " REB")} right={leaderCell(away.topRebounder, "rebounds", " REB")} />
      <InsightRow label="Top Assists" left={leaderCell(home.topAssist, "assists", " AST")} right={leaderCell(away.topAssist, "assists", " AST")} />
      <InsightRow label="Top Steals" left={leaderCell(home.topSteal, "steals", " STL")} right={leaderCell(away.topSteal, "steals", " STL")} />
      <InsightRow label="Top Blocks" left={leaderCell(home.topBlock, "blocks", " BLK")} right={leaderCell(away.topBlock, "blocks", " BLK")} />
      <InsightRow label="Top 3PT" left={leaderCell(home.topThree, "three_pointers", " 3PM")} right={leaderCell(away.topThree, "three_pointers", " 3PM")} />

      {/* Footer: court + date */}
      <div className="flex items-center justify-between px-4 py-2 text-[10px] font-heading font-bold uppercase tracking-widest" style={{ color: "#9CA3AF" }}>
        <span>{game.court_number ? `Court ${game.court_number}` : "—"}</span>
        <span>{new Date(game.game_date).toLocaleDateString()}</span>
      </div>
    </div>
  );
}