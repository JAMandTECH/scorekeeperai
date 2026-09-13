import React from "react";
import { AlertTriangle } from "lucide-react";
import {
  aggregateByPlayer,
  getTeamInsights,
  isInPenalty,
  playerLabel,
} from "@/lib/gameInsights";

function TeamColumn({ fouls, inPenalty, topScorer, foulTrouble, align }) {
  const isRight = align === "right";
  return (
    <div className={`flex-1 px-4 py-3 ${isRight ? "text-right" : "text-left"}`}>
      {/* Team Fouls + Penalty */}
      <div className={`flex items-center gap-2 ${isRight ? "justify-end" : ""}`}>
        <span className="text-[10px] font-heading font-bold uppercase tracking-widest text-muted-foreground">
          Team Fouls
        </span>
        <span
          className={`font-heading text-lg font-bold tabular-nums ${
            inPenalty ? "text-destructive" : "text-foreground"
          }`}
        >
          {fouls}
        </span>
        {inPenalty && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 border border-destructive text-destructive text-[9px] font-heading font-bold uppercase tracking-widest">
            <AlertTriangle className="w-2.5 h-2.5" />
            Penalty
          </span>
        )}
      </div>

      {/* Top Scorer */}
      <div className="mt-2">
        <span className="text-[10px] font-heading font-bold uppercase tracking-widest text-muted-foreground">
          Top Scorer
        </span>
        <p className="text-sm font-heading font-bold text-foreground">
          {topScorer ? `${playerLabel(topScorer)} · ${topScorer.points} PTS` : "—"}
        </p>
      </div>

      {/* Foul Trouble */}
      <div className="mt-2">
        <span className="text-[10px] font-heading font-bold uppercase tracking-widest text-muted-foreground">
          Foul Trouble
        </span>
        {foulTrouble.length > 0 ? (
          <div className={`flex flex-wrap gap-1 mt-0.5 ${isRight ? "justify-end" : ""}`}>
            {foulTrouble.map((e) => (
              <span
                key={e.player_id}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 border border-warning/60 text-warning text-[10px] font-heading font-bold tabular-nums"
              >
                <AlertTriangle className="w-2.5 h-2.5" />
                {playerLabel(e)} ({e.fouls})
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">—</p>
        )}
      </div>
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
    <div className="flex items-stretch border-y border-border">
      <TeamColumn
        fouls={homeFouls}
        inPenalty={isInPenalty(game, homeFouls)}
        topScorer={home.topScorer}
        foulTrouble={home.foulTrouble}
        align="left"
      />
      <div className="border-l border-border" />
      <TeamColumn
        fouls={awayFouls}
        inPenalty={isInPenalty(game, awayFouls)}
        topScorer={away.topScorer}
        foulTrouble={away.foulTrouble}
        align="right"
      />
    </div>
  );
}