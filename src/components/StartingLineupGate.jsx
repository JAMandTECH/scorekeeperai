import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, CheckCircle2 } from "lucide-react";

export default function StartingLineupGate({ game, homeTeam, awayTeam, homePlayers, awayPlayers, onSetStarters }) {
  const homeLineup = game?.active_lineup?.home || [];
  const awayLineup = game?.active_lineup?.away || [];
  const homeReady = homeLineup.length === 5;
  const awayReady = awayLineup.length === 5;

  const getPlayerById = (list, id) => list.find((p) => p.id === id);

  const renderTeamCard = (team, lineup, players, side) => {
    const ready = lineup.length === 5;
    return (
      <div className={`flex flex-col bg-card border-2 rounded-sm ${ready ? "border-primary" : "border-border"}`}>
        <div className="flex-shrink-0 bg-muted border-b border-border p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="w-12 h-12 border border-border">
                <AvatarImage src={team?.logo_url} />
                <AvatarFallback className="bg-secondary text-foreground font-heading font-bold">
                  {team?.name?.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-lg font-heading font-bold text-foreground">{team?.name}</h3>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{side}</p>
              </div>
            </div>
            <Badge variant={ready ? "default" : "outline"} className="font-heading font-bold text-sm">
              {lineup.length} / 5
            </Badge>
          </div>
        </div>
        <div className="flex-1 p-4">
          {ready ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                <span className="text-xs font-heading font-bold text-primary uppercase tracking-wider">Active On Court</span>
              </div>
              {lineup.map((id) => {
                const p = getPlayerById(players, id);
                if (!p) return null;
                return (
                  <div key={id} className="flex items-center gap-3 p-2 bg-muted/40 border border-border rounded-sm">
                    <Avatar className="w-8 h-8 border border-border">
                      <AvatarImage src={p.photo_url} />
                      <AvatarFallback className="text-xs font-heading font-bold bg-secondary text-foreground">{p.jersey_number}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-heading font-bold text-foreground truncate">{p.first_name} {p.last_name}</p>
                      {p.position && <p className="text-xs text-muted-foreground">{p.position}</p>}
                    </div>
                  </div>
                );
              })}
              <Button onClick={() => onSetStarters(side)} variant="outline" size="sm" className="w-full mt-2 font-medium">
                Reset Lineup
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8">
              <Users className="w-10 h-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground font-medium mb-4 text-center">
                Select the starting five active players
              </p>
              <Button onClick={() => onSetStarters(side)} className="font-heading font-bold">
                <Users className="w-4 h-4 mr-2" />
                Set Starting Five
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-heading font-bold text-foreground mb-1">Set Starting Lineups</h2>
        <p className="text-sm text-muted-foreground font-medium">Select the active starting five for each team before live scoring begins.</p>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {renderTeamCard(homeTeam, homeLineup, homePlayers, "home")}
        {renderTeamCard(awayTeam, awayLineup, awayPlayers, "away")}
      </div>
      {homeReady && awayReady && (
        <div className="mt-6 text-center">
          <p className="text-sm font-heading font-bold text-primary">✓ Both lineups set — starting live scoring...</p>
        </div>
      )}
    </div>
  );
}