import React from "react";
import { TrendingUp, Target, Zap, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TopAssistLeaders from "@/components/leaders/TopAssistLeaders";
import LeaderCard from "@/components/leaders/LeaderCard";
import StandingsTable from "@/components/home/StandingsTable";
import BasketballSchedule from "@/components/home/BasketballSchedule";

export default function BasketballSection({
  bbDivTab,
  setBbDivTab,
  organization,
  basketballStandingsOpen,
  basketballStandingsVeterans,
  topScorersOpen,
  topScorersVeterans,
  topReboundersOpen,
  topReboundersVeterans,
  topBlockersOpen,
  topBlockersVeterans,
  top3PointersOpen,
  top3PointersVeterans,
  upcomingBasketballGamesOpen,
  upcomingBasketballGamesVeterans,
  completedBasketballGamesOpen,
  completedBasketballGamesVeterans,
  allPlayerStats,
  allPlayers,
  allTeams,
  isAdmin,
  orgId,
  getTeamName,
}) {
  return (
    <section className="mb-20">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 border border-border bg-secondary flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-foreground">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/>
            <path d="M2 12h20"/>
          </svg>
        </div>
        <div>
          <h2 className="font-heading text-2xl font-bold tracking-tight">Basketball</h2>
          <p className="text-sm text-muted-foreground">League Standings & Player Stats</p>
        </div>
      </div>

      <Tabs defaultValue="standings" className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <TabsList>
            <TabsTrigger value="standings">Standings</TabsTrigger>
            <TabsTrigger value="leaders">Player Leaders</TabsTrigger>
            <TabsTrigger value="schedule">Schedule & Results</TabsTrigger>
          </TabsList>
          <div className="flex gap-2">
            <Button type="button" variant={bbDivTab === 'open' ? 'default' : 'outline'} size="sm" onClick={() => setBbDivTab('open')}>Open</Button>
            <Button type="button" variant={bbDivTab === 'veterans' ? 'default' : 'outline'} size="sm" onClick={() => setBbDivTab('veterans')}>Veterans</Button>
          </div>
        </div>

        <TabsContent value="standings">
          {(bbDivTab === 'open' ? basketballStandingsOpen : basketballStandingsVeterans).map((divisionData, idx) => (
            <StandingsTable key={idx} divisionData={divisionData} organization={organization} accent="orange" />
          ))}
        </TabsContent>

        <TabsContent value="leaders">
          <div className="grid md:grid-cols-2 gap-6">
            <LeaderCard title="Top 10 Scorers" icon={Target} organization={organization} data={bbDivTab === 'open' ? topScorersOpen : topScorersVeterans} />
            <LeaderCard title="Top 10 Rebounders" icon={TrendingUp} organization={organization} data={bbDivTab === 'open' ? topReboundersOpen : topReboundersVeterans} />
            <LeaderCard title="Top 10 Blockers" icon={Shield} organization={organization} data={bbDivTab === 'open' ? topBlockersOpen : topBlockersVeterans} />
            {orgId ? (
              <TopAssistLeaders
                organizationId={orgId}
                sport="basketball"
                division={bbDivTab === 'open' ? 'Open Division' : 'Veterans Division'}
                title={`Top 10 Assist Leaders — ${bbDivTab === 'open' ? 'Open' : 'Veterans'}`}
                orgName={organization?.name}
                orgLogoUrl={organization?.logo_url}
              />
            ) : null}
            <LeaderCard title="Top 10 3-Pointer Leaders" icon={Zap} organization={organization} data={bbDivTab === 'open' ? top3PointersOpen : top3PointersVeterans} />
          </div>
        </TabsContent>

        <TabsContent value="schedule">
          <BasketballSchedule
            upcomingGames={bbDivTab === 'open' ? upcomingBasketballGamesOpen : upcomingBasketballGamesVeterans}
            completedGames={bbDivTab === 'open' ? completedBasketballGamesOpen : completedBasketballGamesVeterans}
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