
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, TrendingUp, Target, TrendingDown } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Statistics() {
  const [user, setUser] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [selectedDivision, setSelectedDivision] = useState('all');
  const [selectedSport, setSelectedSport] = useState('all');

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

  // Get unique divisions and sports
  const allDivisions = [...new Set(teams.map(t => t.division || 'No Division'))];
  const divisions = ['all', ...allDivisions];
  const sports = ['all', 'basketball', 'volleyball']; // Hardcoded for now, can be dynamic if needed

  // Filter teams by division and sport
  const filteredTeams = teams.filter(team => {
    const divisionMatch = selectedDivision === 'all' || (team.division || 'No Division') === selectedDivision;
    const sportMatch = selectedSport === 'all' || team.sport === selectedSport;
    return divisionMatch && sportMatch;
  });

  // Filter players by filtered teams
  const filteredPlayers = players.filter(p => filteredTeams.some(t => t.id === p.team_id));

  // Filter completed games to only include games involving filtered teams
  const filteredCompletedGames = completedGames.filter(g =>
    filteredTeams.some(t => t.id === g.home_team_id || t.id === g.away_team_id)
  );

  // Reset selectedTeam if it's no longer in filteredTeams
  useEffect(() => {
    if (selectedTeam && !filteredTeams.some(t => t.id === selectedTeam.id)) {
      setSelectedTeam(null);
    }
  }, [selectedDivision, selectedSport, filteredTeams, selectedTeam]);


  // Calculate head-to-head records
  const getHeadToHead = (teamId) => {
    const h2h = {};

    filteredCompletedGames.forEach(game => { // Use filteredCompletedGames here
      if (game.home_team_id === teamId || game.away_team_id === teamId) {
        const opponentId = game.home_team_id === teamId ? game.away_team_id : game.home_team_id;
        const opponent = teams.find(t => t.id === opponentId); // `teams` (unfiltered) is correct for finding opponent name.

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
    const teamGames = filteredCompletedGames // Use filteredCompletedGames here
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

  // Top scorers from filtered players
  const topScorers = [...filteredPlayers] // Use filteredPlayers here
    .sort((a, b) => (b.total_points || 0) - (a.total_points || 0))
    .slice(0, 5)
    .map(p => ({
      name: `${p.first_name} ${p.last_name}`,
      points: p.total_points || 0,
    }));

  // Team stats with recent form for filtered teams
  const teamStats = filteredTeams.map(team => { // Iterate over filteredTeams
    const teamGames = filteredCompletedGames.filter(g => g.home_team_id === team.id || g.away_team_id === team.id); // Use filteredCompletedGames here
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

    // Calculate team wins and losses
    let wins = 0;
    let losses = 0;
    teamGames.forEach(game => {
      const isHome = game.home_team_id === team.id;
      const teamScore = isHome ? game.home_score : game.away_score;
      const oppScore = isHome ? game.away_score : game.home_score;
      if (teamScore > oppScore) {
        wins++;
      } else {
        losses++;
      }
    });

    return {
      ...team,
      last5: last5Results,
      avgPointsFor,
      avgPointsAgainst,
      gamesPlayed: teamGames.length,
      wins,
      losses,
    };
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-indigo-50/30 to-gray-50 dark:from-gray-900 dark:via-indigo-950/10 dark:to-gray-900">
      <div className="p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h1 className="text-4xl font-black text-gray-900 dark:text-white">Statistics & Analytics</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-2 font-medium">Performance insights and trends</p>
              </div>

              {/* Filters */}
              <div className="flex gap-3 flex-wrap">
                <Select value={selectedSport} onValueChange={setSelectedSport}>
                  <SelectTrigger className="w-[180px] bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 font-bold">
                    <SelectValue placeholder="All Sports" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600">
                    <SelectItem value="all" className="font-bold">All Sports</SelectItem>
                    <SelectItem value="basketball" className="font-bold">🏀 Basketball</SelectItem>
                    <SelectItem value="volleyball" className="font-bold">🏐 Volleyball</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={selectedDivision} onValueChange={setSelectedDivision}>
                  <SelectTrigger className="w-[180px] bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 font-bold">
                    <SelectValue placeholder="All Divisions" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600">
                    {divisions.map(div => (
                      <SelectItem key={div} value={div} className="font-bold">
                        {div === 'all' ? 'All Divisions' : div}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Active Filters Display */}
            {(selectedDivision !== 'all' || selectedSport !== 'all') && (
              <div className="flex gap-2 mt-4 flex-wrap">
                {selectedSport !== 'all' && (
                  <Badge className="bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800 font-bold px-3 py-1">
                    Sport: {selectedSport === 'basketball' ? '🏀 Basketball' : '🏐 Volleyball'}
                  </Badge>
                )}
                {selectedDivision !== 'all' && (
                  <Badge className="bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800 font-bold px-3 py-1">
                    Division: {selectedDivision}
                  </Badge>
                )}
              </div>
            )}
          </div>

          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 p-1 rounded-xl shadow-lg">
              <TabsTrigger value="overview" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white dark:text-gray-300 font-bold rounded-lg">
                Overview
              </TabsTrigger>
              <TabsTrigger value="performance" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white dark:text-gray-300 font-bold rounded-lg">
                Team Performance
              </TabsTrigger>
              <TabsTrigger value="players" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white dark:text-gray-300 font-bold rounded-lg">
                Top Players
              </TabsTrigger>
            </TabsList>

            {/* OVERVIEW TAB */}
            <TabsContent value="overview" className="space-y-6">
              {/* Summary Cards */}
              <div className="grid md:grid-cols-3 gap-6">
                <Card className="relative overflow-hidden border-2 border-blue-100 dark:border-blue-900 bg-gradient-to-br from-white to-blue-50 dark:from-gray-800 dark:to-blue-950/30 shadow-lg">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/20 to-transparent rounded-full blur-3xl"></div>
                  <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
                    <CardTitle className="text-sm font-bold text-gray-600 dark:text-gray-400">Total Games</CardTitle>
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                      <Trophy className="w-5 h-5 text-white" />
                    </div>
                  </CardHeader>
                  <CardContent className="relative z-10">
                    <div className="text-4xl font-black text-gray-900 dark:text-white">{filteredCompletedGames.length}</div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-semibold">Completed games</p>
                  </CardContent>
                </Card>

                <Card className="relative overflow-hidden border-2 border-green-100 dark:border-green-900 bg-gradient-to-br from-white to-green-50 dark:from-gray-800 dark:to-green-950/30 shadow-lg">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-500/20 to-transparent rounded-full blur-3xl"></div>
                  <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
                    <CardTitle className="text-sm font-bold text-gray-600 dark:text-gray-400">Avg Points/Game</CardTitle>
                    <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                      <Target className="w-5 h-5 text-white" />
                    </div>
                  </CardHeader>
                  <CardContent className="relative z-10">
                    <div className="text-4xl font-black text-gray-900 dark:text-white">
                      {filteredCompletedGames.length > 0
                        ? Math.round(
                            filteredCompletedGames.reduce((sum, g) => sum + g.home_score + g.away_score, 0) /
                            filteredCompletedGames.length
                          )
                        : 0}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-semibold">Combined average</p>
                  </CardContent>
                </Card>

                <Card className="relative overflow-hidden border-2 border-orange-100 dark:border-orange-900 bg-gradient-to-br from-white to-orange-50 dark:from-gray-800 dark:to-orange-950/30 shadow-lg">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-orange-500/20 to-transparent rounded-full blur-3xl"></div>
                  <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
                    <CardTitle className="text-sm font-bold text-gray-600 dark:text-gray-400">Active Players</CardTitle>
                    <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-white" />
                    </div>
                  </CardHeader>
                  <CardContent className="relative z-10">
                    <div className="text-4xl font-black text-gray-900 dark:text-white">{filteredPlayers.length}</div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-semibold">In selected filter</p>
                  </CardContent>
                </Card>
              </div>

              {/* Top Scorers Chart */}
              <Card className="border-2 border-gray-100 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-xl">
                <CardHeader className="border-b-2 border-gray-100 dark:border-gray-700">
                  <CardTitle className="text-2xl font-black text-gray-900 dark:text-white">
                    Top Scorers
                    {(selectedDivision !== 'all' || selectedSport !== 'all') && (
                      <span className="text-lg font-semibold text-gray-500 dark:text-gray-400 ml-2">
                        ({selectedDivision !== 'all' ? selectedDivision : ''}{selectedDivision !== 'all' && selectedSport !== 'all' ? ' - ' : ''}{selectedSport !== 'all' ? selectedSport : ''})
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  {topScorers.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={topScorers}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" className="dark:stroke-gray-700" />
                        <XAxis dataKey="name" stroke="#6B7280" className="dark:stroke-gray-400" />
                        <YAxis stroke="#6B7280" className="dark:stroke-gray-400" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'var(--tw-bg-opacity, #FFFFFF)',
                            border: '1px solid #E5E7EB',
                            borderRadius: '12px',
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                          }}
                          labelStyle={{ color: '#111827', fontWeight: 'bold' }}
                        />
                        <Bar dataKey="points" fill="url(#colorGradient)" radius={[8, 8, 0, 0]} />
                        <defs>
                          <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#3B82F6" />
                            <stop offset="100%" stopColor="#6366F1" />
                          </linearGradient>
                        </defs>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-center py-20">
                      <Trophy className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                      <p className="text-gray-500 dark:text-gray-400 font-medium">No player statistics for selected filter</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* TEAM PERFORMANCE TAB */}
            <TabsContent value="performance" className="space-y-6">
              {/* Team Selection Cards */}
              {teamStats.length > 0 ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {teamStats.map((team) => {
                    const sportColor = team.sport === 'basketball' ? 'orange' : 'blue';

                    return (
                      <Card
                        key={team.id}
                        className={`relative overflow-hidden border-2 border-${sportColor}-100 dark:border-${sportColor}-900 bg-gradient-to-br from-white to-${sportColor}-50 dark:from-gray-800 dark:to-${sportColor}-950/30 cursor-pointer transition-all shadow-lg hover:shadow-2xl ${
                          selectedTeam?.id === team.id ? 'ring-4 ring-blue-600' : ''
                        }`}
                        onClick={() => setSelectedTeam(team)}
                      >
                        <div className={`absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-${sportColor}-500/20 to-transparent rounded-full blur-3xl`}></div>
                        <CardHeader className="relative z-10">
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-3 flex-1">
                              <Avatar className="w-14 h-14 border-4 border-white dark:border-gray-700 shadow-xl">
                                <AvatarImage src={team.logo_url} />
                                <AvatarFallback className={`bg-gradient-to-br from-${sportColor}-500 to-${sportColor}-600 text-white font-black text-sm`}>
                                  {team.name?.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <CardTitle className="text-lg font-black text-gray-900 dark:text-white truncate">{team.name}</CardTitle>
                                <Badge className={`mt-2 bg-${sportColor}-100 text-${sportColor}-700 border-${sportColor}-200 dark:bg-${sportColor}-950 dark:text-${sportColor}-300 dark:border-${sportColor}-800 font-bold`}>
                                  {team.sport}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3 relative z-10">
                          <div className="flex justify-between text-sm bg-white/60 dark:bg-gray-900/60 rounded-xl p-3">
                            <span className="text-gray-600 dark:text-gray-400 font-bold">Record</span>
                            <span className="text-gray-900 dark:text-white font-black">
                              {team.wins || 0}W - {team.losses || 0}L
                            </span>
                          </div>
                          <div className="flex justify-between text-sm bg-white/60 dark:bg-gray-900/60 rounded-xl p-3">
                            <span className="text-gray-600 dark:text-gray-400 font-bold">Win Rate</span>
                            <span className="text-gray-900 dark:text-white font-black">
                              {team.gamesPlayed > 0
                                ? ((team.wins / team.gamesPlayed) * 100).toFixed(0)
                                : 0}%
                            </span>
                          </div>
                          <div className="flex justify-between text-sm bg-white/60 dark:bg-gray-900/60 rounded-xl p-3">
                            <span className="text-gray-600 dark:text-gray-400 font-bold">Avg Points</span>
                            <span className="text-gray-900 dark:text-white font-black">
                              {team.avgPointsFor} / {team.avgPointsAgainst}
                            </span>
                          </div>
                          {team.last5.length > 0 && (
                            <div>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-bold">Last 5 Games</p>
                              <div className="flex gap-1">
                                {team.last5.map((result, i) => (
                                  <div
                                    key={i}
                                    className={`w-10 h-10 rounded-lg flex items-center justify-center text-xs font-black shadow-md ${
                                      result === 'W' ? 'bg-gradient-to-br from-green-500 to-green-600 text-white' : 'bg-gradient-to-br from-red-500 to-red-600 text-white'
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
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-20">
                  <div className="w-24 h-24 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Trophy className="w-12 h-12 text-gray-400 dark:text-gray-500" />
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 text-xl font-bold">No teams found for selected filter</p>
                  <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">Try adjusting your division or sport filter</p>
                </div>
              )}

              {/* Selected Team Detailed Analysis */}
              {selectedTeam && (
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <Avatar className="w-16 h-16 border-4 border-white dark:border-gray-700 shadow-xl">
                      <AvatarImage src={selectedTeam.logo_url} />
                      <AvatarFallback className={`bg-gradient-to-br ${
                        selectedTeam.sport === 'basketball'
                          ? 'from-orange-500 to-orange-600'
                          : 'from-blue-500 to-blue-600'
                      } text-white font-black text-lg`}>
                        {selectedTeam.name?.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <h2 className="text-3xl font-black text-gray-900 dark:text-white">{selectedTeam.name}</h2>
                    <Badge className={`${
                      selectedTeam.sport === 'basketball'
                        ? 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800'
                        : 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800'
                    } font-black`}>
                      {selectedTeam.sport}
                    </Badge>
                  </div>

                  <div className="grid lg:grid-cols-2 gap-6">
                    {/* Performance Trend */}
                    <Card className="border-2 border-gray-100 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-xl">
                      <CardHeader className="border-b-2 border-gray-100 dark:border-gray-700">
                        <CardTitle className="text-xl font-black text-gray-900 dark:text-white">Performance Trend (Last 10 Games)</CardTitle>
                      </CardHeader>
                      <CardContent className="p-6">
                        {getPerformanceTrend(selectedTeam.id).length > 0 ? (
                          <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={getPerformanceTrend(selectedTeam.id)}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" className="dark:stroke-gray-700" />
                              <XAxis dataKey="game" stroke="#6B7280" className="dark:stroke-gray-400" />
                              <YAxis stroke="#6B7280" className="dark:stroke-gray-400" />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: '#FFFFFF',
                                  border: '2px solid #E5E7EB',
                                  borderRadius: '12px',
                                  fontWeight: 'bold'
                                }}
                              />
                              <Legend />
                              <Line type="monotone" dataKey="winRate" stroke="#3B82F6" name="Win Rate %" strokeWidth={3} />
                              <Line type="monotone" dataKey="score" stroke="#10B981" name="Points For" strokeWidth={3} />
                              <Line type="monotone" dataKey="oppScore" stroke="#EF4444" name="Points Against" strokeWidth={3} />
                            </LineChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="text-center py-20">
                            <TrendingUp className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                            <p className="text-gray-500 dark:text-gray-400 font-medium">No games played yet</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Head-to-Head Records */}
                    <Card className="border-2 border-gray-100 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-xl">
                      <CardHeader className="border-b-2 border-gray-100 dark:border-gray-700">
                        <CardTitle className="text-xl font-black text-gray-900 dark:text-white">Head-to-Head Records</CardTitle>
                      </CardHeader>
                      <CardContent className="p-6">
                        {getHeadToHead(selectedTeam.id).length > 0 ? (
                          <div className="space-y-3 max-h-[300px] overflow-y-auto">
                            {getHeadToHead(selectedTeam.id).map((h2h, index) => (
                              <div key={index} className="bg-gradient-to-r from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 rounded-xl p-4 border-2 border-gray-200 dark:border-gray-700">
                                <div className="flex justify-between items-center mb-2">
                                  <p className="text-gray-900 dark:text-white font-black">{h2h.opponent}</p>
                                  <div className="flex gap-2">
                                    {h2h.wins > h2h.losses ? (
                                      <TrendingUp className="w-4 h-4 text-green-500" />
                                    ) : h2h.wins < h2h.losses ? (
                                      <TrendingDown className="w-4 h-4 text-red-500" />
                                    ) : null}
                                  </div>
                                </div>
                                <div className="grid grid-cols-3 gap-2 text-sm">
                                  <div className="text-center bg-white/60 dark:bg-gray-950/60 rounded-lg p-2">
                                    <div className="text-green-600 dark:text-green-400 font-black text-xl">{h2h.wins}</div>
                                    <div className="text-gray-500 dark:text-gray-400 text-xs font-bold">Wins</div>
                                  </div>
                                  <div className="text-center bg-white/60 dark:bg-gray-950/60 rounded-lg p-2">
                                    <div className="text-red-600 dark:text-red-400 font-black text-xl">{h2h.losses}</div>
                                    <div className="text-gray-500 dark:text-gray-400 text-xs font-bold">Losses</div>
                                  </div>
                                  <div className="text-center bg-white/60 dark:bg-gray-950/60 rounded-lg p-2">
                                    <div className="text-blue-600 dark:text-blue-400 font-black text-xl">
                                      {h2h.wins + h2h.losses > 0
                                        ? ((h2h.wins / (h2h.wins + h2h.losses)) * 100).toFixed(0)
                                        : 0}%
                                    </div>
                                    <div className="text-gray-500 dark:text-gray-400 text-xs font-bold">Win Rate</div>
                                  </div>
                                </div>
                                <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 text-center font-semibold">
                                  Avg: {(h2h.pointsFor / (h2h.wins + h2h.losses)).toFixed(1)} - {(h2h.pointsAgainst / (h2h.wins + h2h.losses)).toFixed(1)}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-20">
                            <Trophy className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                            <p className="text-gray-500 dark:text-gray-400 font-medium">No head-to-head data yet</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}

              {!selectedTeam && teamStats.length > 0 && ( // Only show if there are teams available after filter
                <div className="text-center py-20">
                  <div className="w-24 h-24 bg-gradient-to-br from-blue-200 to-blue-300 dark:from-blue-800 dark:to-blue-700 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Trophy className="w-12 h-12 text-blue-600 dark:text-blue-300" />
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 text-xl font-bold">Select a team to view detailed performance analysis</p>
                </div>
              )}
            </TabsContent>

            {/* TOP PLAYERS TAB */}
            <TabsContent value="players" className="space-y-6">
              <Card className="border-2 border-gray-100 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-xl">
                <CardHeader className="border-b-2 border-gray-100 dark:border-gray-700">
                  <CardTitle className="text-2xl font-black text-gray-900 dark:text-white">
                    Top Players Leaderboard
                    {(selectedDivision !== 'all' || selectedSport !== 'all') && (
                      <span className="text-lg font-semibold text-gray-500 dark:text-gray-400 ml-2">
                        ({selectedDivision !== 'all' ? selectedDivision : ''}{selectedDivision !== 'all' && selectedSport !== 'all' ? ' - ' : ''}{selectedSport !== 'all' ? selectedSport : ''})
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  {topScorers.length > 0 ? (
                    <div className="space-y-3">
                      {topScorers.map((player, index) => (
                        <div key={index} className="flex items-center gap-4 bg-gradient-to-r from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 rounded-xl p-4 border-2 border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-black shadow-lg ${
                            index === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-500 text-gray-900' :
                            index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-white' :
                            index === 2 ? 'bg-gradient-to-br from-orange-600 to-orange-700 text-white' :
                            'bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 text-gray-700 dark:text-gray-300'
                          }`}>
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <p className="text-gray-900 dark:text-white font-black text-lg">{player.name}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-4xl font-black text-blue-600 dark:text-blue-400">{player.points}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-bold">Points</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-20">
                      <Trophy className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                      <p className="text-gray-500 dark:text-gray-400 font-medium">No player statistics for selected filter</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
