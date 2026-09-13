import React from "react";
import { AlertTriangle } from "lucide-react";
import { playerLabel } from "@/lib/gameInsights";

/**
 * Compact insights block for the stream overlay: fouls (+penalty),
 * top scorer, and foul-trouble count. Renders below the team name.
 * All three rows are always visible so the enhancement is evident
 * even before stats accumulate.
 */
export default function OverlayInsights({ fouls, inPenalty, topScorer, foulTrouble, align }) {
  const isRight = align === "right";
  return (
    <div className={`flex flex-col gap-0.5 leading-tight ${isRight ? "items-end" : "items-start"}`}>
      <span className={`text-[9px] sm:text-[10px] lg:text-xs font-bold ${inPenalty ? "text-red-400" : "text-white/60"}`}>
        Fouls: {fouls}{inPenalty && <AlertTriangle className="inline w-2.5 h-2.5 ml-0.5" />}
      </span>
      <span className="text-white/80 text-[9px] sm:text-[10px] lg:text-xs font-bold truncate max-w-[120px]">
        {topScorer ? `${playerLabel(topScorer)} ${topScorer.points}pts` : "Top: —"}
      </span>
      <span className="text-amber-400 text-[9px] sm:text-[10px] lg:text-xs font-bold flex items-center gap-0.5">
        <AlertTriangle className="w-2.5 h-2.5" />
        {foulTrouble.length}
      </span>
    </div>
  );
}