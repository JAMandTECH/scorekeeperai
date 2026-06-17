import React from "react";
import { Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Radio, Calendar, ChevronRight } from "lucide-react";
import { format } from "date-fns";

function TeamBlock({ team, align = "left" }) {
  const initials = (team?.name || "?").slice(0, 2).toUpperCase();
  return (
    <div className={`flex flex-col items-center gap-3 ${align === "right" ? "md:items-center" : "md:items-center"}`}>
      <Avatar className="w-16 h-16 md:w-20 md:h-20 ring-2 ring-white/20 shadow-xl">
        <AvatarImage src={team?.logo_url} alt={team?.name} />
        <AvatarFallback className="bg-white/10 text-white font-black text-xl">{initials}</AvatarFallback>
      </Avatar>
      <span className="text-sm md:text-base font-bold text-white text-center max-w-[120px] truncate">{team?.name || "TBD"}</span>
    </div>
  );
}

export default function FeaturedMatch({ game, homeTeam, awayTeam }) {
  if (!game) {
    return (
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-950 p-8 h-full flex flex-col items-center justify-center text-center min-h-[260px]">
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/20 rounded-full blur-3xl" />
        <Calendar className="w-12 h-12 text-purple-300/60 mb-4 relative z-10" />
        <h3 className="text-xl font-black text-white relative z-10">No featured match yet</h3>
        <p className="text-sm text-purple-200/70 mt-2 relative z-10">Schedule a game to feature it here.</p>
        <Link to="/games" className="mt-4 relative z-10">
          <span className="inline-flex items-center gap-1 text-sm font-bold text-white bg-white/10 hover:bg-white/20 transition-colors px-4 py-2 rounded-full">
            Schedule a game <ChevronRight className="w-4 h-4" />
          </span>
        </Link>
      </div>
    );
  }

  const isLive = game.status === "in_progress";
  const isCompleted = game.status === "completed";

  return (
    <Link to="/games" className="group relative block overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-950 p-6 md:p-8 h-full min-h-[260px]">
      <div className="absolute top-0 right-0 w-72 h-72 bg-purple-600/20 rounded-full blur-3xl group-hover:bg-purple-500/30 transition-colors" />
      <div className="absolute bottom-0 left-0 w-56 h-56 bg-blue-600/20 rounded-full blur-3xl" />

      <div className="relative z-10 flex items-center justify-between mb-6">
        <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/70">
          {isLive ? (
            <><span className="live-dot" /> Live Match</>
          ) : isCompleted ? (
            <><Radio className="w-4 h-4" /> Final Result</>
          ) : (
            <><Calendar className="w-4 h-4" /> Featured Match</>
          )}
        </span>
        <span className="text-xs font-bold uppercase tracking-widest text-white/50 capitalize">{game.sport}</span>
      </div>

      <div className="relative z-10 grid grid-cols-3 items-center gap-2">
        <TeamBlock team={homeTeam} align="left" />
        <div className="flex flex-col items-center">
          {isCompleted || isLive ? (
            <div className="flex items-center gap-2 md:gap-3">
              <span className="text-4xl md:text-5xl font-black text-white">{game.home_score ?? 0}</span>
              <span className="text-2xl font-black text-white/40">:</span>
              <span className="text-4xl md:text-5xl font-black text-white">{game.away_score ?? 0}</span>
            </div>
          ) : (
            <span className="text-3xl font-black text-white/30">VS</span>
          )}
          <span className="mt-2 text-xs font-semibold text-purple-200/70">
            {game.game_date ? format(new Date(game.game_date), "MMM d, h:mm a") : ""}
          </span>
        </div>
        <TeamBlock team={awayTeam} align="right" />
      </div>
    </Link>
  );
}