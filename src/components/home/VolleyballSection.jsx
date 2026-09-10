import React from "react";
import { Target, Zap, Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StandingsTable from "@/components/home/StandingsTable";
import VolleyballSchedule from "@/components/home/VolleyballSchedule";

export default function VolleyballSection({
  organization,
  volleyballStandings,
  topVolleyballScorers,
  topVolleyballAttackers,
  topVolleyballBlockers,
  topVolleyballAces,
  upcomingVolleyballGames,
  completedVolleyballGames,
  allPlayerStats,
  allPlayers,
  allTeams,
  isAdmin,
  getTeamName,
}) {
  const leaderCards = [
    { title: 'Top 10 Scorers', icon: Target, data: topVolleyballScorers },
    { title: 'Top 10 Attackers', icon: Zap, data: topVolleyballAttackers },
    { title: 'Top 10 Blockers', icon: Shield, data: topVolleyballBlockers },
    { title: 'Top 10 Ace Leaders', icon: Zap, data: topVolleyballAces },
  ];

  return (
    <section className="mb-20">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 border border-border bg-secondary flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-foreground">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 2a10 10 0 0 0 0 20"/>
            <path d="M12 2a10 10 0 0 1 0 20"/>
            <path d="M2 12h20"/>
            <path d="M12 2v20"/>
          </svg>
        </div>
        <div>
          <h2 className="font-heading text-2xl font-bold tracking-tight">Volleyball</h2>
          <p className="text-sm text-muted-foreground">League Standings & Player Stats</p>
        </div>
      </div>

      <Tabs defaultValue="standings" className="space-y-6">
        <TabsList>
          <TabsTrigger value="standings">Standings</TabsTrigger>
          <TabsTrigger value="leaders">Player Leaders</TabsTrigger>
          <TabsTrigger value="schedule">Schedule & Results</TabsTrigger>
        </TabsList>

        <TabsContent value="standings">
          {volleyballStandings.map((divisionData, idx) => (
            <StandingsTable key={idx} divisionData={divisionData} organization={organization} accent="blue" />
          ))}
        </TabsContent>

        <TabsContent value="leaders">
          <div className="grid md:grid-cols-2 gap-6">
            {leaderCards.map(({ title, icon: Icon, data }) => (
              <Card key={title} className="overflow-hidden">
                <CardHeader className="border-b border-border py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 shrink-0 border border-border bg-secondary flex items-center justify-center">
                        <Icon className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <CardTitle className="text-base font-heading font-bold truncate">{title}</CardTitle>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {organization?.name && (
                        <span className="text-sm text-muted-foreground hidden sm:inline truncate max-w-[180px]">{organization.name}</span>
                      )}
                      {organization?.logo_url && (
                        <Avatar className="w-9 h-9 border border-border">
                          <AvatarImage src={organization.logo_url} />
                          <AvatarFallback className="bg-secondary text-foreground font-heading font-bold text-xs">
                            {(organization.name || '').substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-3">
                  <div className="space-y-1">
                    {data.length === 0 && (
                      <div className="text-sm text-muted-foreground px-2 py-6 text-center">No data available.</div>
                    )}
                    {data.map((player, i) => (
                      <div key={player.id} className="flex items-center gap-3 px-2 py-2.5 hover:bg-muted transition-colors border-b border-border last:border-0">
                        <div className={`w-7 text-center font-heading text-sm font-bold tabular-nums shrink-0 ${i < 3 ? 'text-primary' : 'text-muted-foreground'}`}>
                          {i + 1}
                        </div>
                        <Avatar className="w-9 h-10 shrink-0 border border-border bg-secondary">
                          <AvatarImage src={player.photo_url} className="object-cover" />
                          <AvatarFallback className="bg-secondary text-foreground text-xs font-heading font-bold">{player.jersey_number}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{player.first_name} {player.last_name}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {player.teamLogoUrl && (
                              <img src={player.teamLogoUrl} alt="" className="w-4 h-4 object-cover" />
                            )}
                            <p className="text-xs text-muted-foreground truncate">{player.teamName}</p>
                          </div>
                        </div>
                        <div className="text-right shrink-0 pl-1">
                          <p className="font-heading text-xl font-bold text-primary tabular-nums leading-none">{player.total}</p>
                          <p className="text-[11px] text-muted-foreground mt-1 tabular-nums">{player.average} {player.averageLabel}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="schedule">
          <VolleyballSchedule
            upcomingGames={upcomingVolleyballGames}
            completedGames={completedVolleyballGames}
            allPlayerStats={allPlayerStats}
            allPlayers={allPlayers}
            allTeams={allTeams}
            isAdmin={isAdmin}
            getTeamName={getTeamName}
          />
        </TabsContent>
      </Tabs>
    </section>
  );
}