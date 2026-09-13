import React from "react";
import { AlertTriangle } from "lucide-react";
import { playerLabel } from "@/lib/gameInsights";

/**
 * Compact one-line insights for the stream overlay: fouls (+penalty),
 * top scorer, and foul-trouble count. Renders below the team name.
 */
export default function OverlayInsights({ fouls, inPenalty, topScorer, foulTrouble, align }) {
  const isRight = align === "right";
  return (
    <div className={`flex items-center gap-2 sm:gap-3 text-[9px] sm:text-[10px] lg:text-xs font-bold ${isRight ? "justify-end" : ""}`}>
      <span className={inPenalty ? "text-red-400" : "text-white/60"}>
        F:{fouls}
        {inPenalty && <AlertTriangle className="inline w-2.5 h-2.5 ml-0.5" />}
      </span>
      {topScorer && (
        <span className="text-white/80 truncate max-w-[90px] sm:max-w-[130px]">
          {playerLabel(topScorer)} {topScorer.points}
        </span>
      )}
      {foulTrouble.length > 0 && (
        <span className="flex items-center gap-0.5 text-amber-400">
          <AlertTriangle className="w-2.5 h-2.5" />
          {foulTrouble.length}
        </span>
      )}
    </div>
  );
}