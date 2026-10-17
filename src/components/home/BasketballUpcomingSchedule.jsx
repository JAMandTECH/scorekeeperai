import React from "react";
import { Calendar, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function BasketballUpcomingSchedule({ upcomingGames, getTeamName, allTeams }) {
  return (
    <Card>
      <CardHeader className="border-b border-border py-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-heading font-bold">Upcoming Games</CardTitle>
          <Badge variant="outline" className="tabular-nums">{upcomingGames.length} scheduled</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        {upcomingGames.length === 0 ? (
          <div className="text-sm text-muted-foreground py-10 text-center">No upcoming games.</div>
        ) : (
          <div className="space-y-3">
            {upcomingGames.map((game) => {
              const homeTeamData = allTeams.find((t) => t.id === game.home_team_id);
              const awayTeamData = allTeams.find((t) => t.id === game.away_team_id);
              return (
                <div key={game.id} className="border border-border p-4 hover:bg-muted transition-colors">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs text-muted-foreground flex items-center gap-1 tabular-nums">
                      <Calendar className="w-3 h-3" />
                      {new Date(game.game_date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                    </span>
                    <Badge variant="outline" className="text-[10px] font-medium">
                      {game.game_type?.replace('_', ' ').toUpperCase() || 'REGULAR'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Avatar className="w-9 h-9 border border-border bg-secondary shrink-0">
                        <AvatarImage src={homeTeamData?.logo_url} />
                        <AvatarFallback className="bg-secondary text-foreground text-xs font-heading font-bold">{homeTeamData?.name?.substring(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <p className="text-sm font-medium text-foreground truncate">{getTeamName(game.home_team_id)}</p>
                    </div>
                    <span className="text-xs text-muted-foreground font-medium shrink-0">vs</span>
                    <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                      <p className="text-sm font-medium text-foreground truncate text-right">{getTeamName(game.away_team_id)}</p>
                      <Avatar className="w-9 h-9 border border-border bg-secondary shrink-0">
                        <AvatarImage src={awayTeamData?.logo_url} />
                        <AvatarFallback className="bg-secondary text-foreground text-xs font-heading font-bold">{awayTeamData?.name?.substring(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                    </div>
                  </div>
                  {game.location && (
                    <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {game.location}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}