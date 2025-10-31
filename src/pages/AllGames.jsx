import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, PlayCircle, CheckCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AllGames() {
  const { data: games = [] } = useQuery({
    queryKey: ['all-games'],
    queryFn: () => base44.entities.Game.list('-game_date'),
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['all-teams'],
    queryFn: () => base44.entities.Team.list(),
  });

  const getTeamName = (teamId) => {
    const team = teams.find(t => t.id === teamId);
    return team?.name || 'Unknown Team';
  };

  const scheduledGames = games.filter(g => g.status === 'scheduled');
  const inProgressGames = games.filter(g => g.status === 'in_progress');
  const completedGames = games.filter(g => g.status === 'completed');

  const GameCard = ({ game }) => (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <Badge className={
              game.status === 'scheduled' ? 'bg-blue-500/10 text-blue-500' :
              game.status === 'in_progress' ? 'bg-yellow-500/10 text-yellow-500' :
              'bg-green-500/10 text-green-500'
            }>
              {game.status === 'scheduled' && <Clock className="w-3 h-3 mr-1" />}
              {game.status === 'in_progress' && <PlayCircle className="w-3 h-3 mr-1" />}
              {game.status === 'completed' && <CheckCircle className="w-3 h-3 mr-1" />}
              {game.status.replace('_', ' ')}
            </Badge>
            <p className="text-gray-400 text-sm mt-2">
              <Calendar className="w-3 h-3 inline mr-1" />
              {new Date(game.game_date).toLocaleDateString()}
            </p>
          </div>
          <Badge variant="outline" className="text-yellow-400 border-yellow-400">
            {game.sport}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between items-center">
          <div className="flex-1">
            <p className="text-white font-semibold">{getTeamName(game.home_team_id)}</p>
            <p className="text-gray-500 text-sm">Home</p>
          </div>
          {game.status === 'completed' ? (
            <>
              <div className="text-2xl font-bold text-yellow-400">{game.home_score}</div>
              <div className="text-gray-500 px-3">-</div>
              <div className="text-2xl font-bold text-white">{game.away_score}</div>
            </>
          ) : (
            <div className="text-gray-500">vs</div>
          )}
          <div className="flex-1 text-right">
            <p className="text-white font-semibold">{getTeamName(game.away_team_id)}</p>
            <p className="text-gray-500 text-sm">Away</p>
          </div>
        </div>
        {game.location && (
          <p className="text-gray-400 text-sm">📍 {game.location}</p>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="p-4 md:p-8 bg-gray-950 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">All Games</h1>
          <p className="text-gray-400 mt-1">System-wide game overview</p>
        </div>

        <Tabs defaultValue="all" className="space-y-6">
          <TabsList className="bg-gray-900 border border-gray-800">
            <TabsTrigger value="all" className="data-[state=active]:bg-yellow-400 data-[state=active]:text-gray-900">
              All ({games.length})
            </TabsTrigger>
            <TabsTrigger value="scheduled" className="data-[state=active]:bg-yellow-400 data-[state=active]:text-gray-900">
              Scheduled ({scheduledGames.length})
            </TabsTrigger>
            <TabsTrigger value="in_progress" className="data-[state=active]:bg-yellow-400 data-[state=active]:text-gray-900">
              In Progress ({inProgressGames.length})
            </TabsTrigger>
            <TabsTrigger value="completed" className="data-[state=active]:bg-yellow-400 data-[state=active]:text-gray-900">
              Completed ({completedGames.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {games.map(game => <GameCard key={game.id} game={game} />)}
            </div>
          </TabsContent>

          <TabsContent value="scheduled">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {scheduledGames.map(game => <GameCard key={game.id} game={game} />)}
            </div>
          </TabsContent>

          <TabsContent value="in_progress">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {inProgressGames.map(game => <GameCard key={game.id} game={game} />)}
            </div>
          </TabsContent>

          <TabsContent value="completed">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {completedGames.map(game => <GameCard key={game.id} game={game} />)}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}