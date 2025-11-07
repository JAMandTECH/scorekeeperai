
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
      game_type: formData.get('game_type'),
      game_date: new Date(formData.get('game_date')).toISOString(),
      location: formData.get('location'),
      penalty_limit_per_quarter: parseInt(formData.get('penalty_limit_per_quarter')),
      player_foul_limit: parseInt(formData.get('player_foul_limit')),
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
    <Card className="bg-white border-gray-200 shadow-sm hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <Badge className={
              game.status === 'scheduled' ? 'bg-blue-50 text-blue-600 border-blue-200' :
              game.status === 'in_progress' ? 'bg-yellow-50 text-yellow-600 border-yellow-200' :
              'bg-green-50 text-green-600 border-green-200'
            }>
              {game.status === 'scheduled' && <Clock className="w-3 h-3 mr-1" />}
              {game.status === 'in_progress' && <PlayCircle className="w-3 h-3 mr-1" />}
              {game.status === 'completed' && <CheckCircle className="w-3 h-3 mr-1" />}
              {game.status ? game.status.replace('_', ' ') : 'scheduled'}
            </Badge>
            <p className="text-gray-500 text-sm mt-2">{new Date(game.game_date).toLocaleDateString()}</p>
          </div>
          <Badge variant="outline" className="text-blue-600 border-blue-600">
            {game.sport}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex-1">
            <p className="text-gray-900 font-semibold">{getTeamName(game.home_team_id)}</p>
            <p className="text-gray-500 text-sm">Home</p>
          </div>
          {game.status === 'completed' ? (
            <>
              <div className="text-3xl font-bold text-blue-600">{game.home_score}</div>
              <div className="text-gray-400 px-4">-</div>
              <div className="text-3xl font-bold text-gray-900">{game.away_score}</div>
            </>
          ) : (
            <div className="text-gray-400 text-xl">vs</div>
          )}
          <div className="flex-1 text-right">
            <p className="text-gray-900 font-semibold">{getTeamName(game.away_team_id)}</p>
            <p className="text-gray-500 text-sm">Away</p>
          </div>
        </div>
        {game.location && (
          <p className="text-gray-500 text-sm">📍 {game.location}</p>
        )}
        {game.status === 'scheduled' && (
          <Link to={createPageUrl("LiveScoring") + `?game_id=${game.id}`}>
            <Button className="w-full bg-blue-600 hover:bg-blue-700">
              <PlayCircle className="w-4 h-4 mr-2" />
              Start Game
            </Button>
          </Link>
        )}
        {game.status === 'in_progress' && (
          <Link to={createPageUrl("LiveScoring") + `?game_id=${game.id}`}>
            <Button className="w-full bg-blue-600 hover:bg-blue-700">
              Continue Scoring
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Games</h1>
            <p className="text-gray-600 mt-1">Schedule and manage games</p>
          </div>
          <Button 
            onClick={() => setShowForm(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Schedule Game
          </Button>
        </div>

        <Tabs defaultValue="scheduled" className="space-y-6">
          <TabsList className="bg-white border border-gray-200">
            <TabsTrigger value="scheduled" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              Scheduled ({scheduledGames.length})
            </TabsTrigger>
            <TabsTrigger value="in_progress" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              In Progress ({inProgressGames.length})
            </TabsTrigger>
            <TabsTrigger value="completed" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
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
          <DialogContent className="bg-white border-gray-200 max-w-xl">
            <DialogHeader>
              <DialogTitle className="text-gray-900">Schedule New Game</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="sport">Sport</Label>
                <select
                  id="sport"
                  name="sport"
                  required
                  className="w-full bg-white border border-gray-300 text-gray-900 rounded-lg px-3 py-2"
                >
                  <option value="">Select sport</option>
                  <option value="basketball">Basketball</option>
                  <option value="volleyball">Volleyball</option>
                </select>
              </div>

              <div>
                <Label htmlFor="game_type">Game Type</Label>
                <select
                  id="game_type"
                  name="game_type"
                  required
                  className="w-full bg-white border border-gray-300 text-gray-900 rounded-lg px-3 py-2"
                >
                  <option value="regular_season">Regular Season</option>
                  <option value="playoffs">Playoffs</option>
                  <option value="semi_finals">Semi Finals</option>
                  <option value="finals">Finals</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="penalty_limit_per_quarter">Team Foul Penalty Limit</Label>
                  <Input
                    id="penalty_limit_per_quarter"
                    name="penalty_limit_per_quarter"
                    type="number"
                    defaultValue="5"
                    min="1"
                    max="10"
                    required
                    className="bg-white border-gray-300 text-gray-900"
                  />
                  <p className="text-xs text-gray-500 mt-1">Fouls per quarter before penalty</p>
                </div>
                <div>
                  <Label htmlFor="player_foul_limit">Player Foul Limit</Label>
                  <Input
                    id="player_foul_limit"
                    name="player_foul_limit"
                    type="number"
                    defaultValue="5"
                    min="1"
                    max="10"
                    required
                    className="bg-white border-gray-300 text-gray-900"
                  />
                  <p className="text-xs text-gray-500 mt-1">Personal fouls before ejection</p>
                </div>
              </div>

              <div>
                <Label htmlFor="home_team_id">Home Team</Label>
                <select
                  id="home_team_id"
                  name="home_team_id"
                  required
                  className="w-full bg-white border border-gray-300 text-gray-900 rounded-lg px-3 py-2"
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
                  className="w-full bg-white border border-gray-300 text-gray-900 rounded-lg px-3 py-2"
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
                  className="bg-white border-gray-300 text-gray-900"
                />
              </div>
              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  name="location"
                  placeholder="e.g., Main Gym, Court 1"
                  className="bg-white border-gray-300 text-gray-900"
                />
              </div>
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="border-gray-300 text-gray-700">
                  Cancel
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
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
