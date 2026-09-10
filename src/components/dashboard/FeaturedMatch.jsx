import React from "react";
import { Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Radio, Calendar, ChevronRight } from "lucide-react";
import { format } from "date-fns";

function TeamBlock({ team }) {
  const initials = (team?.name || "?").slice(0, 2).toUpperCase();
  return (
    <div className="flex flex-col items-center gap-2">
      <Avatar className="w-14 h-14 md:w-16 md:h-16 border border-border">
        <AvatarImage src={team?.logo_url} alt={team?.name} />
        <AvatarFallback className="bg-secondary text-foreground font-heading font-bold text-lg">{initials}</AvatarFallback>
      </Avatar>
      <span className="text-xs md:text-sm font-medium text-foreground text-center max-w-[110px] truncate">{team?.name || "TBD"}</span>
    </div>
  );
}

export default function FeaturedMatch({ game, homeTeam, awayTeam }) {
  if (!game) {
    return (
      <div className="border border-border bg-card p-8 h-full flex flex-col items-center justify-center text-center min-h-[260px]">
        <Calendar className="w-10 h-10 text-muted-foreground mb-4" />
        <h3 className="font-heading text-lg font-bold">No featured match yet</h3>
        <p className="text-sm text-muted-foreground mt-2">Schedule a game to feature it here.</p>
        <Link to="/games" className="mt-4">
          <span className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
            Schedule a game <ChevronRight className="w-4 h-4" />
          </span>
        </Link>
      </div>
    );
  }

  const isLive = game.status === "in_progress";
  const isCompleted = game.status === "completed";

  return (
    <Link to="/games" className="group block border border-border bg-card p-6 md:p-8 h-full min-h-[260px] hover:bg-muted transition-colors">
      <div className="flex items-center justify-between mb-6">
        <span className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {isLive ? (
            <><span className="live-dot" /> Live Match</>
          ) : isCompleted ? (
            <><Radio className="w-3.5 h-3.5" /> Final Result</>
          ) : (
            <><Calendar className="w-3.5 h-3.5" /> Featured Match</>
          )}
        </span>
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground capitalize">{game.sport}</span>
      </div>

      <div className="grid grid-cols-3 items-center gap-2">
        <TeamBlock team={homeTeam} />
        <div className="flex flex-col items-center">
          {isCompleted || isLive ? (
            <div className="flex items-center gap-2 md:gap-3">
              <span className="font-heading text-3xl md:text-4xl font-bold tabular-nums">{game.home_score ?? 0}</span>
              <span className="text-muted-foreground text-xl">:</span>
              <span className="font-heading text-3xl md:text-4xl font-bold tabular-nums">{game.away_score ?? 0}</span>
            </div>
          ) : (
            <span className="font-heading text-2xl text-muted-foreground">VS</span>
          )}
          <span className="mt-2 text-xs text-muted-foreground tabular-nums">
            {game.game_date ? format(new Date(game.game_date), "MMM d, h:mm a") : ""}
          </span>
        </div>
        <TeamBlock team={awayTeam} />
      </div>
    </Link>
  );
}