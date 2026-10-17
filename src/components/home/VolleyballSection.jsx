import React from "react";
import { Target, Zap, Shield } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StandingsTable from "@/components/home/StandingsTable";
import LeaderCard from "@/components/leaders/LeaderCard";
import VolleyballUpcomingSchedule from "@/components/home/VolleyballUpcomingSchedule";
import VolleyballGameResults from "@/components/home/VolleyballGameResults";

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
  excludeDraws = false,
  excludeDefaults = false,
}) {
  const leaderCards = [
    { title: 'Top Scorers', icon: Target, data: topVolleyballScorers },
    { title: 'Top Attackers', icon: Zap, data: topVolleyballAttackers },
    { title: 'Top Blockers', icon: Shield, data: topVolleyballBlockers },
    { title: 'Top Ace Leaders', icon: Zap, data: topVolleyballAces },
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
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="results">Game Results</TabsTrigger>
        </TabsList>

        <TabsContent value="standings">
          {volleyballStandings.map((divisionData, idx) => (
            <StandingsTable key={idx} divisionData={divisionData} organization={organization} accent="blue" excludeDraws={excludeDraws} excludeDefaults={excludeDefaults} />
          ))}
        </TabsContent>

        <TabsContent value="leaders">
          <div className="grid md:grid-cols-2 gap-6">
            {leaderCards.map(({ title, icon, data }) => (
              <LeaderCard key={title} title={title} icon={icon} organization={organization} data={data} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="schedule">
          <VolleyballUpcomingSchedule
            upcomingGames={upcomingVolleyballGames}
            getTeamName={getTeamName}
            allTeams={allTeams}
          />
        </TabsContent>

        <TabsContent value="results">
          <VolleyballGameResults
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