import React from "react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function StandingsTable({ divisionData, organization, accent = "orange" }) {
  return (
    <Card className="mb-6 overflow-hidden">
      <div className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-medium tracking-widest uppercase text-muted-foreground mb-1">
            {accent === "blue" ? "Volleyball League" : "Basketball League"}
          </p>
          <h3 className="font-heading text-xl md:text-2xl font-bold tracking-tight">
            {divisionData.division}
          </h3>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden sm:block text-sm text-muted-foreground">{organization?.name}</span>
          {organization?.logo_url && (
            <Avatar className="w-10 h-10 border border-border">
              <AvatarImage src={organization.logo_url} className="grayscale" />
              <AvatarFallback className="bg-secondary text-foreground font-heading font-bold text-sm">
                {organization.name?.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      </div>

      <div className="px-4 sm:px-6 pt-4 pb-2">
        <div className="grid grid-cols-[40px_1fr_repeat(7,minmax(0,40px))] sm:grid-cols-[56px_1fr_repeat(7,minmax(0,56px))] items-center gap-2 text-[10px] sm:text-xs font-medium tracking-widest text-muted-foreground uppercase px-2">
          <div className="text-left">Pos</div>
          <div className="text-left pl-1">Team</div>
          <div className="text-center">W</div>
          <div className="text-center">L</div>
          <div className="text-center">D</div>
          <div className="text-center">Pct</div>
          <div className="text-center">PF</div>
          <div className="text-center">PA</div>
          <div className="text-center">Diff</div>
        </div>
      </div>

      <div className="px-3 sm:px-5 pb-5 space-y-px">
        {divisionData.teams.map((team, i) => (
          <div
            key={team.id}
            className="grid grid-cols-[40px_1fr_repeat(7,minmax(0,40px))] sm:grid-cols-[56px_1fr_repeat(7,minmax(0,56px))] items-center gap-2 px-2 py-2.5 hover:bg-muted transition-colors border-b border-border last:border-0"
          >
            <div className={`text-center font-heading text-sm font-bold tabular-nums ${i < 3 ? 'text-primary' : 'text-muted-foreground'}`}>
              {i + 1}
            </div>
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 pl-1">
              <Avatar className="w-8 h-8 sm:w-9 sm:h-9 border border-border bg-secondary shrink-0">
                <AvatarImage src={team.logo_url} className="object-contain grayscale" />
                <AvatarFallback className="bg-secondary text-foreground text-xs font-heading font-bold">
                  {team.name?.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium text-foreground text-sm sm:text-base truncate">
                {team.name}
              </span>
            </div>
            <div className="text-center font-heading font-bold text-foreground text-sm tabular-nums">{team.wins}</div>
            <div className="text-center font-heading font-bold text-foreground text-sm tabular-nums">{team.losses}</div>
            <div className="text-center font-heading font-bold text-foreground text-sm tabular-nums">{team.draws || 0}</div>
            <div className="text-center font-heading font-bold text-foreground text-sm tabular-nums">{(team.winPct * 100).toFixed(0)}%</div>
            <div className="text-center text-muted-foreground text-sm tabular-nums">{team.avgPointsFor}</div>
            <div className="text-center text-muted-foreground text-sm tabular-nums">{team.avgPointsAgainst}</div>
            <div className={`text-center font-heading font-bold text-sm tabular-nums ${team.diff > 0 ? "text-primary" : team.diff < 0 ? "text-destructive" : "text-muted-foreground"}`}>
              {team.diff > 0 ? "+" : ""}{team.diff}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}