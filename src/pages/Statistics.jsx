import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, TrendingUp, Target } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

export default function Statistics() {
  const [user, setUser] = useState(null);

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

  // Top scorers
  const topScorers = [...players]
    .sort((a, b) => (b.total_points || 0) - (a.total_points || 0))
    .slice(0, 5)
    .map(p => ({
      name: `${p.first_name} ${p.last_name}`,
      points: p.total_points || 0,
    }));

  // Team performance
  const teamStats = teams.map(team => ({
    name: team.name,
    wins: team.wins || 0,
    losses: team.losses || 0,
  }));

  // Sport distribution
  const sportData = [
    { name: 'Basketball', value: teams.filter(t => t.sport === 'basketball').length },
    { name: 'Volleyball', value: teams.filter(t => t.sport === 'volleyball').length },
  ];

  const COLORS = ['#FFD700', '#60A5FA'];

  return (
    <div className="p-4 md:p-8 bg-gray-950 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Statistics & Analytics</h1>
          <p className="text-gray-400 mt-1">Performance insights and trends</p>
        </div>

        {/* Summary Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
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

        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          {/* Top Scorers */}
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

          {/* Sport Distribution */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">Sport Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={sportData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {sportData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Team Performance */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Team Performance</CardTitle>
          </CardHeader>
          <CardContent>
            {teamStats.length > 0 ? (
              <div className="space-y-4">
                {teamStats.map((team, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-950 rounded-lg">
                    <div className="flex-1">
                      <p className="text-white font-semibold">{team.name}</p>
                      <p className="text-sm text-gray-400">
                        {team.wins + team.losses} games played
                      </p>
                    </div>
                    <div className="flex gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold text-green-400">{team.wins}</div>
                        <div className="text-xs text-gray-500">Wins</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-red-400">{team.losses}</div>
                        <div className="text-xs text-gray-500">Losses</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-yellow-400">
                          {team.wins + team.losses > 0
                            ? ((team.wins / (team.wins + team.losses)) * 100).toFixed(0)
                            : 0}%
                        </div>
                        <div className="text-xs text-gray-500">Win Rate</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-12">No team statistics yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}