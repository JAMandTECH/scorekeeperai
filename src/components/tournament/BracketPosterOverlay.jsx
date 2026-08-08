import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, Layers } from "lucide-react";

/**
 * Poster-style branding overlay rendered on top of the bracket visual.
 * Auto mode: header absolute top-left, logo absolute bottom-right.
 * Manual mode: header inline (static, placed below controls row by caller),
 *              logo absolute bottom-right.
 * Uses pointer-events-none so it never blocks drag interactions.
 */
export default function BracketPosterOverlay({ organization, tournament, manualMode = false }) {
  if (!organization && !tournament) return null;

  const orgName = organization?.name || organization?.tournament_name || "";
  const orgLogo = organization?.logo_url;
  const division = tournament?.division;
  const season = tournament?.start_date
    ? new Date(tournament.start_date).getFullYear()
    : null;

  const shadow = "0 2px 8px rgba(0,0,0,0.6)";

  const HeaderContent = (
    <>
      {orgLogo && (
        <Avatar className="w-10 h-10 md:w-12 md:h-12 border-2 border-white/20 shadow-lg shrink-0">
          <AvatarImage src={orgLogo} className="object-cover" />
          <AvatarFallback className="bg-gradient-to-br from-orange-500 to-red-600 text-white font-black text-sm">
            {orgName?.substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      )}
      <div className="min-w-0">
        {orgName && (
          <h2
            className="text-sm md:text-lg font-black text-white tracking-tight truncate max-w-[200px] md:max-w-none"
            style={{ textShadow: shadow }}
          >
            {orgName}
          </h2>
        )}
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {season && (
            <span
              className="text-[10px] md:text-xs font-bold text-white/90 flex items-center gap-1"
              style={{ textShadow: shadow }}
            >
              <Calendar className="w-3 h-3" />
              {season} Season
            </span>
          )}
          {division && (
            <span
              className="text-[10px] md:text-xs font-bold text-white/90 flex items-center gap-1"
              style={{ textShadow: shadow }}
            >
              <Layers className="w-3 h-3" />
              {division}
            </span>
          )}
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Header: absolute in auto mode, inline in manual mode */}
      {manualMode ? (
        <div className="flex items-center gap-3 select-none py-1">
          {HeaderContent}
        </div>
      ) : (
        <div className="pointer-events-none absolute top-3 left-3 z-30 flex items-center gap-3 select-none">
          {HeaderContent}
        </div>
      )}

    </>
  );
}