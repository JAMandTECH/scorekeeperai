import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Trophy, Calendar, TrendingUp, Target, Award, Zap, Shield, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(null);

  React.useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const authenticated = await base44.auth.isAuthenticated();
    setIsAuthenticated(authenticated);
  };

  // Fetch all data
  const { data: allTeams = [] } = useQuery({
    queryKey: ['all-teams-home'],
    queryFn: () => base44.entities.Team.list(),
  });

  const { data: allPlayers = [] } = useQuery({
    queryKey: ['all-players-home'],
    queryFn: () => base44.entities.Player.list(),
  });

  const { data: allGames = [] } = useQuery({
    queryKey: ['all-games-home'],
    queryFn: () => base44.entities.Game.list('-game_date'),
  });

  const { data: allPlayerStats = [] } = useQuery({
    queryKey: ['all-player-stats-home'],
    queryFn: () => base44.entities.PlayerGameStats.list(),
  });

  // Calculate team standings by division and sport
  const getTeamStandings = (sport) => {
    const sportTeams = allTeams.filter(t => t.sport === sport);
    const divisions = [...new Set(sportTeams.map(t => t.division || 'No Division'))];
    
    return divisions.map(division => {
      const divisionTeams = sportTeams
        .filter(t => (t.division || 'No Division') === division)
        .map(team => {
          const teamGames = allGames.filter(g => 
            g.status === 'completed' && 
            (g.home_team_id === team.id || g.away_team_id === team.id)
          );
          
          let wins = 0, losses = 0, pointsFor = 0, pointsAgainst = 0;
          
          teamGames.forEach(game => {
            const isHome = game.home_team_id === team.id;
            const teamScore = isHome ? game.home_score : game.away_score;
            const oppScore = isHome ? game.away_score : game.home_score;
            
            if (teamScore > oppScore) wins++;
            else losses++;
            
            pointsFor += teamScore;
            pointsAgainst += oppScore;
          });

          const gamesPlayed = wins + losses;
          const winPct = gamesPlayed > 0 ? (wins / gamesPlayed) : 0;

          return {
            ...team,
            wins,
            losses,
            gamesPlayed,
            winPct,
            pointsFor,
            pointsAgainst,
            avgPointsFor: gamesPlayed > 0 ? (pointsFor / gamesPlayed).toFixed(1) : 0,
            avgPointsAgainst: gamesPlayed > 0 ? (pointsAgainst / gamesPlayed).toFixed(1) : 0,
          };
        })
        .sort((a, b) => b.winPct - a.winPct);

      return { division, teams: divisionTeams };
    });
  };

  // Calculate top players for basketball
  const getTopPlayers = (statType, sport = 'basketball', limit = 10) => {
    const sportTeamIds = allTeams.filter(t => t.sport === sport).map(t => t.id);
    const sportPlayers = allPlayers.filter(p => sportTeamIds.includes(p.team_id));

    const playerTotals = sportPlayers.map(player => {
      const playerStats = allPlayerStats.filter(s => s.player_id === player.id);
      
      let total = 0;
      if (statType === 'points') {
        // For basketball: sum all points
        // For volleyball: sum attacks + blocks + aces
        if (sport === 'basketball') {
          total = playerStats.reduce((sum, s) => sum + (s.points || 0), 0);
        } else {
          total = playerStats.reduce((sum, s) => 
            sum + (s.field_goals_made || 0) + (s.blocks || 0) + (s.three_pointers || 0), 0);
        }
      } else if (statType === 'rebounds') {
        total = playerStats.reduce((sum, s) => sum + (s.rebounds || 0), 0);
      } else if (statType === 'blocks') {
        total = playerStats.reduce((sum, s) => sum + (s.blocks || 0), 0);
      } else if (statType === 'three_pointers') {
        total = playerStats.reduce((sum, s) => sum + (s.three_pointers || 0), 0);
      } else if (statType === 'attacks') {
        total = playerStats.reduce((sum, s) => sum + (s.field_goals_made || 0), 0);
      }

      const team = allTeams.find(t => t.id === player.team_id);
      const gamesPlayed = [...new Set(playerStats.map(s => s.game_id))].length;

      return {
        ...player,
        total,
        gamesPlayed,
        average: gamesPlayed > 0 ? (total / gamesPlayed).toFixed(1) : 0,
        teamName: team?.name || 'Unknown',
        division: team?.division || 'No Division',
      };
    });

    return playerTotals
      .filter(p => p.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, limit);
  };

  const basketballStandings = getTeamStandings('basketball');
  const volleyballStandings = getTeamStandings('volleyball');

  const topScorers = getTopPlayers('points', 'basketball', 10);
  const topRebounders = getTopPlayers('rebounds', 'basketball', 10);
  const topBlockers = getTopPlayers('blocks', 'basketball', 10);
  const top3Pointers = getTopPlayers('three_pointers', 'basketball', 10);

  const topVolleyballScorers = getTopPlayers('points', 'volleyball', 10);
  const topVolleyballAttackers = getTopPlayers('attacks', 'volleyball', 10);
  const topVolleyballBlockers = getTopPlayers('blocks', 'volleyball', 10);
  const topVolleyballAces = getTopPlayers('three_pointers', 'volleyball', 10);

  const upcomingBasketballGames = allGames
    .filter(g => g.sport === 'basketball' && g.status === 'scheduled')
    .slice(0, 10);

  const completedBasketballGames = allGames
    .filter(g => g.sport === 'basketball' && g.status === 'completed')
    .slice(0, 10);

  const upcomingVolleyballGames = allGames
    .filter(g => g.sport === 'volleyball' && g.status === 'scheduled')
    .slice(0, 10);

  const completedVolleyballGames = allGames
    .filter(g => g.sport === 'volleyball' && g.status === 'completed')
    .slice(0, 10);

  const getTeamName = (teamId) => {
    const team = allTeams.find(t => t.id === teamId);
    return team?.name || 'Unknown';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-50">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center">
              <Trophy className="w-10 h-10 text-blue-600" />
            </div>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            ALAB Sports League
          </h1>
          <p className="text-xl md:text-2xl text-blue-100 mb-8 max-w-3xl mx-auto">
            Professional Basketball & Volleyball League Management System
          </p>
          {!isAuthenticated ? (
            <div className="flex gap-4 justify-center">
              <Button 
                onClick={() => base44.auth.redirectToLogin(createPageUrl("Dashboard"))}
                className="bg-white text-blue-600 hover:bg-gray-100 text-lg px-8 py-6"
              >
                Get Started
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Link to={createPageUrl("RequestAdminAccess")}>
                <Button 
                  variant="outline"
                  className="border-2 border-white text-white hover:bg-white/10 text-lg px-8 py-6"
                >
                  Request Admin Access
                </Button>
              </Link>
            </div>
          ) : (
            <Link to={createPageUrl("Dashboard")}>
              <Button className="bg-white text-blue-600 hover:bg-gray-100 text-lg px-8 py-6">
                Go to Dashboard
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          )}
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* BASKETBALL SECTION */}
        <section className="mb-16">
          <div className="flex items-center gap-3 mb-8">
            <Trophy className="w-8 h-8 text-orange-600" />
            <h2 className="text-4xl font-bold text-gray-900">Basketball</h2>
          </div>

          <Tabs defaultValue="standings" className="space-y-6">
            <TabsList className="bg-white border border-gray-200">
              <TabsTrigger value="standings">Standings</TabsTrigger>
              <TabsTrigger value="leaders">Player Leaders</TabsTrigger>
              <TabsTrigger value="schedule">Schedule & Results</TabsTrigger>
            </TabsList>

            <TabsContent value="standings">
              {basketballStandings.map((divisionData, idx) => (
                <Card key={idx} className="mb-6 bg-white border-gray-200 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-gray-900">{divisionData.division}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-3 px-2 text-gray-600 font-medium">#</th>
                            <th className="text-left py-3 px-2 text-gray-600 font-medium">Team</th>
                            <th className="text-center py-3 px-2 text-gray-600 font-medium">W</th>
                            <th className="text-center py-3 px-2 text-gray-600 font-medium">L</th>
                            <th className="text-center py-3 px-2 text-gray-600 font-medium">WIN%</th>
                            <th className="text-center py-3 px-2 text-gray-600 font-medium">PPG</th>
                            <th className="text-center py-3 px-2 text-gray-600 font-medium">PAPG</th>
                          </tr>
                        </thead>
                        <tbody>
                          {divisionData.teams.map((team, i) => (
                            <tr key={team.id} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="py-3 px-2 font-semibold text-gray-900">{i + 1}</td>
                              <td className="py-3 px-2 font-medium text-gray-900">{team.name}</td>
                              <td className="py-3 px-2 text-center text-green-600 font-bold">{team.wins}</td>
                              <td className="py-3 px-2 text-center text-red-600 font-bold">{team.losses}</td>
                              <td className="py-3 px-2 text-center font-medium">{(team.winPct * 100).toFixed(0)}%</td>
                              <td className="py-3 px-2 text-center">{team.avgPointsFor}</td>
                              <td className="py-3 px-2 text-center">{team.avgPointsAgainst}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="leaders">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Top Scorers */}
                <Card className="bg-white border-gray-200 shadow-sm">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Target className="w-5 h-5 text-blue-600" />
                      <CardTitle className="text-gray-900">Top 10 Scorers</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {topScorers.map((player, i) => (
                        <div key={player.id} className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                            i === 0 ? 'bg-yellow-400 text-gray-900' :
                            i === 1 ? 'bg-gray-400 text-white' :
                            i === 2 ? 'bg-amber-700 text-white' :
                            'bg-gray-300 text-gray-700'
                          }`}>
                            {i + 1}
                          </div>
                          <Avatar className="w-10 h-10 border-2 border-gray-200">
                            <AvatarImage src={player.photo_url} />
                            <AvatarFallback className="bg-blue-600 text-white text-xs">
                              {player.jersey_number}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">
                              {player.first_name} {player.last_name}
                            </p>
                            <p className="text-xs text-gray-500">{player.teamName} • {player.division}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-bold text-blue-600">{player.total}</p>
                            <p className="text-xs text-gray-500">{player.average} PPG</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Top Rebounders */}
                <Card className="bg-white border-gray-200 shadow-sm">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-green-600" />
                      <CardTitle className="text-gray-900">Top 10 Rebounders</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {topRebounders.map((player, i) => (
                        <div key={player.id} className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                            i === 0 ? 'bg-yellow-400 text-gray-900' :
                            i === 1 ? 'bg-gray-400 text-white' :
                            i === 2 ? 'bg-amber-700 text-white' :
                            'bg-gray-300 text-gray-700'
                          }`}>
                            {i + 1}
                          </div>
                          <Avatar className="w-10 h-10 border-2 border-gray-200">
                            <AvatarImage src={player.photo_url} />
                            <AvatarFallback className="bg-green-600 text-white text-xs">
                              {player.jersey_number}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">
                              {player.first_name} {player.last_name}
                            </p>
                            <p className="text-xs text-gray-500">{player.teamName} • {player.division}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-bold text-green-600">{player.total}</p>
                            <p className="text-xs text-gray-500">{player.average} RPG</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Top Blockers */}
                <Card className="bg-white border-gray-200 shadow-sm">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Shield className="w-5 h-5 text-red-600" />
                      <CardTitle className="text-gray-900">Top 10 Blockers</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {topBlockers.map((player, i) => (
                        <div key={player.id} className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                            i === 0 ? 'bg-yellow-400 text-gray-900' :
                            i === 1 ? 'bg-gray-400 text-white' :
                            i === 2 ? 'bg-amber-700 text-white' :
                            'bg-gray-300 text-gray-700'
                          }`}>
                            {i + 1}
                          </div>
                          <Avatar className="w-10 h-10 border-2 border-gray-200">
                            <AvatarImage src={player.photo_url} />
                            <AvatarFallback className="bg-red-600 text-white text-xs">
                              {player.jersey_number}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">
                              {player.first_name} {player.last_name}
                            </p>
                            <p className="text-xs text-gray-500">{player.teamName} • {player.division}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-bold text-red-600">{player.total}</p>
                            <p className="text-xs text-gray-500">{player.average} BPG</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Top 3-Pointer Leaders */}
                <Card className="bg-white border-gray-200 shadow-sm">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Zap className="w-5 h-5 text-yellow-600" />
                      <CardTitle className="text-gray-900">Top 10 3-Pointer Leaders</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {top3Pointers.map((player, i) => (
                        <div key={player.id} className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                            i === 0 ? 'bg-yellow-400 text-gray-900' :
                            i === 1 ? 'bg-gray-400 text-white' :
                            i === 2 ? 'bg-amber-700 text-white' :
                            'bg-gray-300 text-gray-700'
                          }`}>
                            {i + 1}
                          </div>
                          <Avatar className="w-10 h-10 border-2 border-gray-200">
                            <AvatarImage src={player.photo_url} />
                            <AvatarFallback className="bg-yellow-600 text-white text-xs">
                              {player.jersey_number}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">
                              {player.first_name} {player.last_name}
                            </p>
                            <p className="text-xs text-gray-500">{player.teamName} • {player.division}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-bold text-yellow-600">{player.total}</p>
                            <p className="text-xs text-gray-500">{player.average} 3PG</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="schedule">
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Upcoming Games */}
                <Card className="bg-white border-gray-200 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-gray-900">Upcoming Games</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {upcomingBasketballGames.map(game => (
                        <div key={game.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-xs text-gray-500">
                              {new Date(game.game_date).toLocaleDateString()}
                            </span>
                            <Badge className="bg-blue-50 text-blue-600 border-blue-200 text-xs">
                              {game.game_type?.replace('_', ' ').toUpperCase() || 'REGULAR'}
                            </Badge>
                          </div>
                          <div className="text-sm font-medium text-gray-900">
                            {getTeamName(game.home_team_id)} vs {getTeamName(game.away_team_id)}
                          </div>
                          {game.location && (
                            <p className="text-xs text-gray-500 mt-1">📍 {game.location}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Recent Results */}
                <Card className="bg-white border-gray-200 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-gray-900">Recent Results</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {completedBasketballGames.map(game => (
                        <div key={game.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-xs text-gray-500">
                              {new Date(game.game_date).toLocaleDateString()}
                            </span>
                            <Badge className="bg-green-50 text-green-600 border-green-200 text-xs">
                              FINAL
                            </Badge>
                          </div>
                          <div className="flex justify-between items-center">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{getTeamName(game.home_team_id)}</div>
                              <div className="text-2xl font-bold text-gray-900 mt-1">{game.home_score}</div>
                            </div>
                            <div className="text-gray-400 text-lg">-</div>
                            <div className="text-right">
                              <div className="text-sm font-medium text-gray-900">{getTeamName(game.away_team_id)}</div>
                              <div className="text-2xl font-bold text-gray-900 mt-1">{game.away_score}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </section>

        {/* VOLLEYBALL SECTION */}
        <section className="mb-16">
          <div className="flex items-center gap-3 mb-8">
            <Award className="w-8 h-8 text-blue-600" />
            <h2 className="text-4xl font-bold text-gray-900">Volleyball</h2>
          </div>

          <Tabs defaultValue="standings" className="space-y-6">
            <TabsList className="bg-white border border-gray-200">
              <TabsTrigger value="standings">Standings</TabsTrigger>
              <TabsTrigger value="leaders">Player Leaders</TabsTrigger>
              <TabsTrigger value="schedule">Schedule & Results</TabsTrigger>
            </TabsList>

            <TabsContent value="standings">
              {volleyballStandings.map((divisionData, idx) => (
                <Card key={idx} className="mb-6 bg-white border-gray-200 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-gray-900">{divisionData.division}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-3 px-2 text-gray-600 font-medium">#</th>
                            <th className="text-left py-3 px-2 text-gray-600 font-medium">Team</th>
                            <th className="text-center py-3 px-2 text-gray-600 font-medium">W</th>
                            <th className="text-center py-3 px-2 text-gray-600 font-medium">L</th>
                            <th className="text-center py-3 px-2 text-gray-600 font-medium">WIN%</th>
                            <th className="text-center py-3 px-2 text-gray-600 font-medium">Sets Won</th>
                          </tr>
                        </thead>
                        <tbody>
                          {divisionData.teams.map((team, i) => (
                            <tr key={team.id} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="py-3 px-2 font-semibold text-gray-900">{i + 1}</td>
                              <td className="py-3 px-2 font-medium text-gray-900">{team.name}</td>
                              <td className="py-3 px-2 text-center text-green-600 font-bold">{team.wins}</td>
                              <td className="py-3 px-2 text-center text-red-600 font-bold">{team.losses}</td>
                              <td className="py-3 px-2 text-center font-medium">{(team.winPct * 100).toFixed(0)}%</td>
                              <td className="py-3 px-2 text-center">{team.pointsFor}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="leaders">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Top Scorers */}
                <Card className="bg-white border-gray-200 shadow-sm">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Target className="w-5 h-5 text-blue-600" />
                      <CardTitle className="text-gray-900">Top 10 Scorers</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {topVolleyballScorers.map((player, i) => (
                        <div key={player.id} className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                            i === 0 ? 'bg-yellow-400 text-gray-900' :
                            i === 1 ? 'bg-gray-400 text-white' :
                            i === 2 ? 'bg-amber-700 text-white' :
                            'bg-gray-300 text-gray-700'
                          }`}>
                            {i + 1}
                          </div>
                          <Avatar className="w-10 h-10 border-2 border-gray-200">
                            <AvatarImage src={player.photo_url} />
                            <AvatarFallback className="bg-blue-600 text-white text-xs">
                              {player.jersey_number}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">
                              {player.first_name} {player.last_name}
                            </p>
                            <p className="text-xs text-gray-500">{player.teamName} • {player.division}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-bold text-blue-600">{player.total}</p>
                            <p className="text-xs text-gray-500">{player.average} PPG</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Top Attackers */}
                <Card className="bg-white border-gray-200 shadow-sm">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Zap className="w-5 h-5 text-orange-600" />
                      <CardTitle className="text-gray-900">Top 10 Attackers</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {topVolleyballAttackers.map((player, i) => (
                        <div key={player.id} className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                            i === 0 ? 'bg-yellow-400 text-gray-900' :
                            i === 1 ? 'bg-gray-400 text-white' :
                            i === 2 ? 'bg-amber-700 text-white' :
                            'bg-gray-300 text-gray-700'
                          }`}>
                            {i + 1}
                          </div>
                          <Avatar className="w-10 h-10 border-2 border-gray-200">
                            <AvatarImage src={player.photo_url} />
                            <AvatarFallback className="bg-orange-600 text-white text-xs">
                              {player.jersey_number}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">
                              {player.first_name} {player.last_name}
                            </p>
                            <p className="text-xs text-gray-500">{player.teamName} • {player.division}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-bold text-orange-600">{player.total}</p>
                            <p className="text-xs text-gray-500">{player.average} APG</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Top Blockers */}
                <Card className="bg-white border-gray-200 shadow-sm">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Shield className="w-5 h-5 text-red-600" />
                      <CardTitle className="text-gray-900">Top 10 Blockers</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {topVolleyballBlockers.map((player, i) => (
                        <div key={player.id} className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                            i === 0 ? 'bg-yellow-400 text-gray-900' :
                            i === 1 ? 'bg-gray-400 text-white' :
                            i === 2 ? 'bg-amber-700 text-white' :
                            'bg-gray-300 text-gray-700'
                          }`}>
                            {i + 1}
                          </div>
                          <Avatar className="w-10 h-10 border-2 border-gray-200">
                            <AvatarImage src={player.photo_url} />
                            <AvatarFallback className="bg-red-600 text-white text-xs">
                              {player.jersey_number}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">
                              {player.first_name} {player.last_name}
                            </p>
                            <p className="text-xs text-gray-500">{player.teamName} • {player.division}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-bold text-red-600">{player.total}</p>
                            <p className="text-xs text-gray-500">{player.average} BPG</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Top Ace Leaders */}
                <Card className="bg-white border-gray-200 shadow-sm">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Zap className="w-5 h-5 text-yellow-600" />
                      <CardTitle className="text-gray-900">Top 10 Ace Leaders</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {topVolleyballAces.map((player, i) => (
                        <div key={player.id} className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                            i === 0 ? 'bg-yellow-400 text-gray-900' :
                            i === 1 ? 'bg-gray-400 text-white' :
                            i === 2 ? 'bg-amber-700 text-white' :
                            'bg-gray-300 text-gray-700'
                          }`}>
                            {i + 1}
                          </div>
                          <Avatar className="w-10 h-10 border-2 border-gray-200">
                            <AvatarImage src={player.photo_url} />
                            <AvatarFallback className="bg-yellow-600 text-white text-xs">
                              {player.jersey_number}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">
                              {player.first_name} {player.last_name}
                            </p>
                            <p className="text-xs text-gray-500">{player.teamName} • {player.division}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-bold text-yellow-600">{player.total}</p>
                            <p className="text-xs text-gray-500">{player.average} ACE/G</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="schedule">
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Upcoming Games */}
                <Card className="bg-white border-gray-200 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-gray-900">Upcoming Games</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {upcomingVolleyballGames.map(game => (
                        <div key={game.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-xs text-gray-500">
                              {new Date(game.game_date).toLocaleDateString()}
                            </span>
                            <Badge className="bg-blue-50 text-blue-600 border-blue-200 text-xs">
                              {game.game_type?.replace('_', ' ').toUpperCase() || 'REGULAR'}
                            </Badge>
                          </div>
                          <div className="text-sm font-medium text-gray-900">
                            {getTeamName(game.home_team_id)} vs {getTeamName(game.away_team_id)}
                          </div>
                          {game.location && (
                            <p className="text-xs text-gray-500 mt-1">📍 {game.location}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Recent Results */}
                <Card className="bg-white border-gray-200 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-gray-900">Recent Results</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {completedVolleyballGames.map(game => (
                        <div key={game.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-xs text-gray-500">
                              {new Date(game.game_date).toLocaleDateString()}
                            </span>
                            <Badge className="bg-green-50 text-green-600 border-green-200 text-xs">
                              FINAL
                            </Badge>
                          </div>
                          <div className="flex justify-between items-center">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{getTeamName(game.home_team_id)}</div>
                              <div className="text-2xl font-bold text-gray-900 mt-1">{game.home_score}</div>
                            </div>
                            <div className="text-gray-400 text-lg">-</div>
                            <div className="text-right">
                              <div className="text-sm font-medium text-gray-900">{getTeamName(game.away_team_id)}</div>
                              <div className="text-2xl font-bold text-gray-900 mt-1">{game.away_score}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </section>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Trophy className="w-8 h-8" />
            <span className="text-2xl font-bold">ALAB Sports</span>
          </div>
          <p className="text-gray-400">
            Professional League Management System for Basketball & Volleyball
          </p>
          <p className="text-gray-500 text-sm mt-4">
            © 2025 ALAB Sports. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}