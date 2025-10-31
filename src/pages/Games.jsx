import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Calendar, PlayCircle, CheckCircle, Clock } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function Games() {
  const [showForm, setShowForm] = useState(false);
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const currentUser = await base44.auth.me();
    setUser(currentUser);
  };

  const { data: teams = [] } = useQuery({
    queryKey: ['teams', user?.organization_id],
    queryFn: () => base44.entities.Team.filter({ organization_id: user?.organization_id }),
    enabled: !!user?.organization_id,
  });

  const { data: games = [] } = useQuery({
    queryKey: ['games', user?.organization_id],
    queryFn: () => base44.entities.Game.filter({ organization_id: user?.organization_id }, '-game_date'),
    enabled: !!user?.organization_id,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Game.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['games']);
      setShowForm(false);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      organization_id: user?.organization_id,
      home_team_id: formData.get('home_team_id'),
      away_team_id: formData.get('away_team_id'),
      sport: formData.get('sport'),
      game_date: new Date(formData.get('game_date')).toISOString(),
      location: formData.get('location'),
      status: 'scheduled',
    };

    createMutation.mutate(data);
  };

  const getTeamName = (teamId) => {
    const team = teams.find(t => t.id === teamId);
    return team?.name || 'Unknown';
  };

  const scheduledGames = games.filter(g => g.status === 'scheduled');
  const inProgressGames = games.filter(g => g.status === 'in_progress');
  const completedGames = games.filter(g => g.status === 'completed');

  const GameCard = ({ game }) => (
    <Card className="bg-gray-900 border-gray-800 hover:border-yellow-400/50 transition-colors">
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
            <p className="text-gray-400 text-sm mt-2">{new Date(game.game_date).toLocaleDateString()}</p>
          </div>
          <Badge variant="outline" className="text-yellow-400 border-yellow-400">
            {game.sport}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex-1">
            <p className="text-white font-semibold">{getTeamName(game.home_team_id)}</p>
            <p className="text-gray-500 text-sm">Home</p>
          </div>
          {game.status === 'completed' ? (
            <>
              <div className="text-3xl font-bold text-yellow-400">{game.home_score}</div>
              <div className="text-gray-500 px-4">-</div>
              <div className="text-3xl font-bold text-white">{game.away_score}</div>
            </>
          ) : (
            <div className="text-gray-500 text-xl">vs</div>
          )}
          <div className="flex-1 text-right">
            <p className="text-white font-semibold">{getTeamName(game.away_team_id)}</p>
            <p className="text-gray-500 text-sm">Away</p>
          </div>
        </div>
        {game.location && (
          <p className="text-gray-400 text-sm">📍 {game.location}</p>
        )}
        {game.status === 'scheduled' && (
          <Link to={createPageUrl("LiveScoring") + `?game_id=${game.id}`}>
            <Button className="w-full bg-yellow-400 hover:bg-yellow-500 text-gray-900">
              <PlayCircle className="w-4 h-4 mr-2" />
              Start Game
            </Button>
          </Link>
        )}
        {game.status === 'in_progress' && (
          <Link to={createPageUrl("LiveScoring") + `?game_id=${game.id}`}>
            <Button className="w-full bg-yellow-400 hover:bg-yellow-500 text-gray-900">
              Continue Scoring
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="p-4 md:p-8 bg-gray-950 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Games</h1>
            <p className="text-gray-400 mt-1">Schedule and manage games</p>
          </div>
          <Button 
            onClick={() => setShowForm(true)}
            className="bg-yellow-400 hover:bg-yellow-500 text-gray-900"
          >
            <Plus className="w-4 h-4 mr-2" />
            Schedule Game
          </Button>
        </div>

        <Tabs defaultValue="scheduled" className="space-y-6">
          <TabsList className="bg-gray-900 border border-gray-800">
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

          <TabsContent value="scheduled" className="space-y-4">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {scheduledGames.map(game => <GameCard key={game.id} game={game} />)}
            </div>
            {scheduledGames.length === 0 && (
              <p className="text-gray-500 text-center py-12">No scheduled games</p>
            )}
          </TabsContent>

          <TabsContent value="in_progress" className="space-y-4">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {inProgressGames.map(game => <GameCard key={game.id} game={game} />)}
            </div>
            {inProgressGames.length === 0 && (
              <p className="text-gray-500 text-center py-12">No games in progress</p>
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-4">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {completedGames.map(game => <GameCard key={game.id} game={game} />)}
            </div>
            {completedGames.length === 0 && (
              <p className="text-gray-500 text-center py-12">No completed games</p>
            )}
          </TabsContent>
        </Tabs>

        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="bg-gray-900 border-gray-800 text-white">
            <DialogHeader>
              <DialogTitle>Schedule New Game</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="sport">Sport</Label>
                <select
                  id="sport"
                  name="sport"
                  required
                  className="w-full bg-gray-950 border border-gray-800 text-white rounded-lg px-3 py-2"
                >
                  <option value="">Select sport</option>
                  <option value="basketball">Basketball</option>
                  <option value="volleyball">Volleyball</option>
                </select>
              </div>
              <div>
                <Label htmlFor="home_team_id">Home Team</Label>
                <select
                  id="home_team_id"
                  name="home_team_id"
                  required
                  className="w-full bg-gray-950 border border-gray-800 text-white rounded-lg px-3 py-2"
                >
                  <option value="">Select team</option>
                  {teams.map(team => (
                    <option key={team.id} value={team.id}>{team.name} ({team.sport})</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="away_team_id">Away Team</Label>
                <select
                  id="away_team_id"
                  name="away_team_id"
                  required
                  className="w-full bg-gray-950 border border-gray-800 text-white rounded-lg px-3 py-2"
                >
                  <option value="">Select team</option>
                  {teams.map(team => (
                    <option key={team.id} value={team.id}>{team.name} ({team.sport})</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="game_date">Game Date & Time</Label>
                <Input
                  id="game_date"
                  name="game_date"
                  type="datetime-local"
                  required
                  className="bg-gray-950 border-gray-800 text-white"
                />
              </div>
              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  name="location"
                  placeholder="e.g., Main Gym, Court 1"
                  className="bg-gray-950 border-gray-800 text-white"
                />
              </div>
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="border-gray-700 text-white">
                  Cancel
                </Button>
                <Button type="submit" className="bg-yellow-400 hover:bg-yellow-500 text-gray-900">
                  Schedule Game
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}