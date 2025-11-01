import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, TrendingUp, Target, TrendingDown } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

export default function Statistics() {
  const [user, setUser] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState(null);

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
    queryFn: () => base44.entities.Game.filter({ organization_id: user?.organization_id }),
    enabled: !!user?.organization_id,
  });

  const { data: players = [] } = useQuery({
    queryKey: ['players'],
    queryFn: async () => {
      const allPlayers = await base44.entities.Player.list();
      const teamIds = teams.map(t => t.id);
      return allPlayers.filter(p => teamIds.includes(p.team_id));
    },
    enabled: teams.length > 0,
  });

  const completedGames = games.filter(g => g.status === 'completed');

  // Calculate head-to-head records
  const getHeadToHead = (teamId) => {
    const h2h = {};
    
    completedGames.forEach(game => {
      if (game.home_team_id === teamId || game.away_team_id === teamId) {
        const opponentId = game.home_team_id === teamId ? game.away_team_id : game.home_team_id;
        const opponent = teams.find(t => t.id === opponentId);
        
        if (!opponent) return;
        
        if (!h2h[opponentId]) {
          h2h[opponentId] = {
            opponent: opponent.name,
            wins: 0,
            losses: 0,
            pointsFor: 0,
            pointsAgainst: 0,
          };
        }

        const isHome = game.home_team_id === teamId;
        const teamScore = isHome ? game.home_score : game.away_score;
        const oppScore = isHome ? game.away_score : game.home_score;

        h2h[opponentId].pointsFor += teamScore;
        h2h[opponentId].pointsAgainst += oppScore;

        if (teamScore > oppScore) {
          h2h[opponentId].wins += 1;
        } else {
          h2h[opponentId].losses += 1;
        }
      }
    });

    return Object.values(h2h);
  };

  // Get performance trend over time (last 10 games)
  const getPerformanceTrend = (teamId) => {
    const teamGames = completedGames
      .filter(g => g.home_team_id === teamId || g.away_team_id === teamId)
      .sort((a, b) => new Date(a.game_date) - new Date(b.game_date))
      .slice(-10);

    let wins = 0;
    return teamGames.map((game, index) => {
      const isHome = game.home_team_id === teamId;
      const teamScore = isHome ? game.home_score : game.away_score;
      const oppScore = isHome ? game.away_score : game.home_score;
      const won = teamScore > oppScore;
      
      if (won) wins++;

      return {
        game: `Game ${index + 1}`,
        result: won ? 'Win' : 'Loss',
        winRate: ((wins / (index + 1)) * 100).toFixed(0),
        score: teamScore,
        oppScore: oppScore,
      };
    });
  };

  // Top scorers
  const topScorers = [...players]
    .sort((a, b) => (b.total_points || 0) - (a.total_points || 0))
    .slice(0, 5)
    .map(p => ({
      name: `${p.first_name} ${p.last_name}`,
      points: p.total_points || 0,
    }));

  // Team stats with recent form
  const teamStats = teams.map(team => {
    const teamGames = completedGames.filter(g => g.home_team_id === team.id || g.away_team_id === team.id);
    const last5Games = teamGames.slice(-5);
    const last5Results = last5Games.map(game => {
      const isHome = game.home_team_id === team.id;
      const teamScore = isHome ? game.home_score : game.away_score;
      const oppScore = isHome ? game.away_score : game.home_score;
      return teamScore > oppScore ? 'W' : 'L';
    });

    const avgPointsFor = teamGames.length > 0 
      ? (teamGames.reduce((sum, g) => {
          const isHome = g.home_team_id === team.id;
          return sum + (isHome ? g.home_score : g.away_score);
        }, 0) / teamGames.length).toFixed(1)
      : 0;

    const avgPointsAgainst = teamGames.length > 0
      ? (teamGames.reduce((sum, g) => {
          const isHome = g.home_team_id === team.id;
          return sum + (isHome ? g.away_score : g.home_score);
        }, 0) / teamGames.length).toFixed(1)
      : 0;

    return {
      ...team,
      last5: last5Results,
      avgPointsFor,
      avgPointsAgainst,
      gamesPlayed: teamGames.length,
    };
  });

  return (
    <div className="p-4 md:p-8 bg-gray-950 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Statistics & Analytics</h1>
          <p className="text-gray-400 mt-1">Performance insights and trends</p>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-gray-900 border border-gray-800">
            <TabsTrigger value="overview" className="data-[state=active]:bg-yellow-400 data-[state=active]:text-gray-900">
              Overview
            </TabsTrigger>
            <TabsTrigger value="performance" className="data-[state=active]:bg-yellow-400 data-[state=active]:text-gray-900">
              Team Performance
            </TabsTrigger>
            <TabsTrigger value="players" className="data-[state=active]:bg-yellow-400 data-[state=active]:text-gray-900">
              Top Players
            </TabsTrigger>
          </TabsList>

          {/* OVERVIEW TAB */}
          <TabsContent value="overview" className="space-y-6">
            {/* Summary Cards */}
            <div className="grid md:grid-cols-3 gap-6">
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-400">Total Games</CardTitle>
                  <Trophy className="w-4 h-4 text-yellow-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-white">{completedGames.length}</div>
                  <p className="text-xs text-gray-500 mt-1">Completed games</p>
                </CardContent>
              </Card>

              <Card className="bg-gray-900 border-gray-800">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-400">Avg Points/Game</CardTitle>
                  <Target className="w-4 h-4 text-yellow-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-white">
                    {completedGames.length > 0
                      ? Math.round(
                          completedGames.reduce((sum, g) => sum + g.home_score + g.away_score, 0) /
                          completedGames.length
                        )
                      : 0}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Combined average</p>
                </CardContent>
              </Card>

              <Card className="bg-gray-900 border-gray-800">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-400">Active Players</CardTitle>
                  <TrendingUp className="w-4 h-4 text-yellow-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-white">{players.length}</div>
                  <p className="text-xs text-gray-500 mt-1">Across all teams</p>
                </CardContent>
              </Card>
            </div>

            {/* Top Scorers Chart */}
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white">Top Scorers</CardTitle>
              </CardHeader>
              <CardContent>
                {topScorers.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={topScorers}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="name" stroke="#9CA3AF" />
                      <YAxis stroke="#9CA3AF" />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px' }}
                        labelStyle={{ color: '#F3F4F6' }}
                      />
                      <Bar dataKey="points" fill="#FFD700" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-gray-500 text-center py-12">No player statistics yet</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TEAM PERFORMANCE TAB */}
          <TabsContent value="performance" className="space-y-6">
            {/* Team Selection Cards */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {teamStats.map((team) => (
                <Card 
                  key={team.id} 
                  className={`bg-gray-900 border-gray-800 cursor-pointer transition-all ${
                    selectedTeam?.id === team.id ? 'border-yellow-400 ring-2 ring-yellow-400' : 'hover:border-gray-700'
                  }`}
                  onClick={() => setSelectedTeam(team)}
                >
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-white">{team.name}</CardTitle>
                        <Badge className="mt-2 bg-yellow-400/10 text-yellow-400">
                          {team.sport}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Record</span>
                      <span className="text-white font-semibold">
                        {team.wins || 0}W - {team.losses || 0}L
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Win Rate</span>
                      <span className="text-white font-semibold">
                        {team.gamesPlayed > 0
                          ? ((team.wins / team.gamesPlayed) * 100).toFixed(0)
                          : 0}%
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Avg Points</span>
                      <span className="text-white font-semibold">
                        {team.avgPointsFor} / {team.avgPointsAgainst}
                      </span>
                    </div>
                    {team.last5.length > 0 && (
                      <div>
                        <p className="text-xs text-gray-500 mb-2">Last 5 Games</p>
                        <div className="flex gap-1">
                          {team.last5.map((result, i) => (
                            <div
                              key={i}
                              className={`w-8 h-8 rounded flex items-center justify-center text-xs font-bold ${
                                result === 'W' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                              }`}
                            >
                              {result}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Selected Team Detailed Analysis */}
            {selectedTeam && (
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <h2 className="text-2xl font-bold text-white">{selectedTeam.name} - Detailed Analysis</h2>
                  <Badge className="bg-yellow-400 text-gray-900">
                    {selectedTeam.sport}
                  </Badge>
                </div>

                <div className="grid lg:grid-cols-2 gap-6">
                  {/* Performance Trend */}
                  <Card className="bg-gray-900 border-gray-800">
                    <CardHeader>
                      <CardTitle className="text-white">Performance Trend (Last 10 Games)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {getPerformanceTrend(selectedTeam.id).length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                          <LineChart data={getPerformanceTrend(selectedTeam.id)}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis dataKey="game" stroke="#9CA3AF" />
                            <YAxis stroke="#9CA3AF" />
                            <Tooltip
                              contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px' }}
                              labelStyle={{ color: '#F3F4F6' }}
                            />
                            <Legend />
                            <Line type="monotone" dataKey="winRate" stroke="#FFD700" name="Win Rate %" strokeWidth={2} />
                            <Line type="monotone" dataKey="score" stroke="#10B981" name="Points For" strokeWidth={2} />
                            <Line type="monotone" dataKey="oppScore" stroke="#EF4444" name="Points Against" strokeWidth={2} />
                          </LineChart>
                        </ResponsiveContainer>
                      ) : (
                        <p className="text-gray-500 text-center py-12">No games played yet</p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Head-to-Head Records */}
                  <Card className="bg-gray-900 border-gray-800">
                    <CardHeader>
                      <CardTitle className="text-white">Head-to-Head Records</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {getHeadToHead(selectedTeam.id).length > 0 ? (
                        <div className="space-y-3 max-h-[300px] overflow-y-auto">
                          {getHeadToHead(selectedTeam.id).map((h2h, index) => (
                            <div key={index} className="bg-gray-950 rounded-lg p-4">
                              <div className="flex justify-between items-center mb-2">
                                <p className="text-white font-semibold">{h2h.opponent}</p>
                                <div className="flex gap-2">
                                  {h2h.wins > h2h.losses ? (
                                    <TrendingUp className="w-4 h-4 text-green-500" />
                                  ) : h2h.wins < h2h.losses ? (
                                    <TrendingDown className="w-4 h-4 text-red-500" />
                                  ) : null}
                                </div>
                              </div>
                              <div className="grid grid-cols-3 gap-2 text-sm">
                                <div className="text-center">
                                  <div className="text-green-400 font-bold text-lg">{h2h.wins}</div>
                                  <div className="text-gray-500 text-xs">Wins</div>
                                </div>
                                <div className="text-center">
                                  <div className="text-red-400 font-bold text-lg">{h2h.losses}</div>
                                  <div className="text-gray-500 text-xs">Losses</div>
                                </div>
                                <div className="text-center">
                                  <div className="text-yellow-400 font-bold text-lg">
                                    {h2h.wins + h2h.losses > 0
                                      ? ((h2h.wins / (h2h.wins + h2h.losses)) * 100).toFixed(0)
                                      : 0}%
                                  </div>
                                  <div className="text-gray-500 text-xs">Win Rate</div>
                                </div>
                              </div>
                              <div className="mt-2 text-xs text-gray-500 text-center">
                                Avg: {(h2h.pointsFor / (h2h.wins + h2h.losses)).toFixed(1)} - {(h2h.pointsAgainst / (h2h.wins + h2h.losses)).toFixed(1)}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-center py-12">No head-to-head data yet</p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {!selectedTeam && (
              <div className="text-center py-16">
                <Trophy className="w-16 h-16 text-gray-700 mx-auto mb-4" />
                <p className="text-gray-400 text-lg">Select a team to view detailed performance analysis</p>
              </div>
            )}
          </TabsContent>

          {/* TOP PLAYERS TAB */}
          <TabsContent value="players" className="space-y-6">
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white">Top Players Leaderboard</CardTitle>
              </CardHeader>
              <CardContent>
                {topScorers.length > 0 ? (
                  <div className="space-y-3">
                    {topScorers.map((player, index) => (
                      <div key={index} className="flex items-center gap-4 bg-gray-950 rounded-lg p-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold ${
                          index === 0 ? 'bg-yellow-400 text-gray-900' :
                          index === 1 ? 'bg-gray-400 text-gray-900' :
                          index === 2 ? 'bg-amber-700 text-white' :
                          'bg-gray-800 text-gray-400'
                        }`}>
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <p className="text-white font-semibold">{player.name}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-yellow-400">{player.points}</p>
                          <p className="text-xs text-gray-500">Points</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-12">No player statistics yet</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}