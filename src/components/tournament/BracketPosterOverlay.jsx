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

  const HeaderContent = (
    <>
      {orgLogo && (
        <Avatar className="w-10 h-10 md:w-12 md:h-12 border-2 border-border shadow-lg shrink-0">
          <AvatarImage src={orgLogo} className="object-cover" />
          <AvatarFallback className="bg-primary text-primary-foreground font-black text-sm">
            {orgName?.substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      )}
      <div className="min-w-0">
        {orgName && (
          <h2 className="text-sm md:text-lg font-heading font-bold text-foreground tracking-tight truncate max-w-[200px] md:max-w-none">
            {orgName}
          </h2>
        )}
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {season && (
            <span className="text-xs font-heading font-bold text-muted-foreground flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {season} Season
            </span>
          )}
          {division && (
            <span className="text-xs font-heading font-bold text-muted-foreground flex items-center gap-1">
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