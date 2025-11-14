import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, TrendingUp, Target, TrendingDown, Filter, Loader2, Sparkles, Printer } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend, PieChart, Pie, Cell } from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import AdminHeader from "@/components/AdminHeader";
import AdminSidebar from "@/components/AdminSidebar";
import { createPageUrl } from "@/utils";

export default function Statistics() {
  const [user, setUser] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [selectedDivision, setSelectedDivision] = useState('all');
  const [selectedSport, setSelectedSport] = useState('all');
  const [viewMode, setViewMode] = useState('card');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);

  useEffect(() => {
    loadUser();
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    setDarkMode(savedDarkMode);
    if (savedDarkMode) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem('darkMode', newDarkMode.toString());
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const loadUser = async () => {
    const currentUser = await base44.auth.me();
    setUser(currentUser);
  };

  const handleLogout = () => {
    base44.auth.logout(createPageUrl("PublicLanding"));
  };

  const handlePrint = () => {
    window.print();
  };

  const { data: organization } = useQuery({
    queryKey: ['organization', user?.organization_id],
    queryFn: async () => {
      const orgs = await base44.entities.Organization.list();
      return orgs.find(o => o.id === user?.organization_id);
    },
    enabled: !!user?.organization_id,
  });

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

  const { data: playerGameStats = [] } = useQuery({
    queryKey: ['playerGameStats', user?.organization_id],
    queryFn: async () => {
      return base44.entities.PlayerGameStats.list();
    },
    enabled: !!user?.organization_id,
  });

  const divisions = ['all', ...new Set(teams.map(t => t.division || 'No Division'))];
  const sports = ['all', 'basketball', 'volleyball'];

  const filteredTeams = teams.filter(team => {
    const divisionMatch = selectedDivision === 'all' || (team.division || 'No Division') === selectedDivision;
    const sportMatch = selectedSport === 'all' || team.sport === selectedSport;
    return divisionMatch && sportMatch;
  });

  const filteredTeamIds = filteredTeams.map(t => t.id);
  const filteredGames = games.filter(game =>
    (filteredTeamIds.includes(game.home_team_id) || filteredTeamIds.includes(game.away_team_id))
  );
  const filteredPlayers = players.filter(p => filteredTeamIds.includes(p.team_id));
  const completedGames = filteredGames.filter(g => g.status === 'completed');

  const relevantPlayerGameStats = playerGameStats.filter(stat => {
    const gameIsCompletedAndFiltered = completedGames.some(game => game.id === stat.game_id);
    const playerIsFiltered = filteredPlayers.some(player => player.id === stat.player_id);
    return gameIsCompletedAndFiltered && playerIsFiltered;
  });

  // Calculate comprehensive player statistics
  const calculatePlayerStats = (playerId, sport) => {
    const playerSpecificStats = relevantPlayerGameStats.filter(s => s.player_id === playerId);
    
    if (sport === 'volleyball') {
      return {
        points: playerSpecificStats.reduce((sum, s) => sum + (s.points || 0), 0),
        attacks: playerSpecificStats.reduce((sum, s) => sum + (s.field_goals_made || 0), 0),
        blocks: playerSpecificStats.reduce((sum, s) => sum + (s.blocks || 0), 0),
        aces: playerSpecificStats.reduce((sum, s) => sum + (s.three_pointers || 0), 0),
        assists: playerSpecificStats.reduce((sum, s) => sum + (s.assists || 0), 0),
      };
    } else {
      return {
        points: playerSpecificStats.reduce((sum, s) => sum + (s.points || 0), 0),
        rebounds: playerSpecificStats.reduce((sum, s) => sum + (s.rebounds || 0), 0),
        assists: playerSpecificStats.reduce((sum, s) => sum + (s.assists || 0), 0),
        blocks: playerSpecificStats.reduce((sum, s) => sum + (s.blocks || 0), 0),
        steals: playerSpecificStats.reduce((sum, s) => sum + (s.steals || 0), 0),
        fouls: playerSpecificStats.reduce((sum, s) => sum + (s.fouls || 0), 0),
        threePointers: playerSpecificStats.reduce((sum, s) => sum + (s.three_pointers || 0), 0),
        fieldGoalsMade: playerSpecificStats.reduce((sum, s) => sum + (s.field_goals_made || 0), 0),
        fieldGoalsAttempted: playerSpecificStats.reduce((sum, s) => sum + (s.field_goals_attempted || 0), 0),
        freeThrowsMade: playerSpecificStats.reduce((sum, s) => sum + (s.free_throws_made || 0), 0),
        freeThrowsAttempted: playerSpecificStats.reduce((sum, s) => sum + (s.free_throws_attempted || 0), 0),
      };
    }
  };

  // Calculate comprehensive team statistics
  const calculateTeamStats = () => {
    return filteredTeams.map(team => {
      const teamGames = completedGames.filter(g => g.home_team_id === team.id || g.away_team_id === team.id);
      let wins = 0, losses = 0, totalFouls = 0, totalTimeouts = 0, totalPoints = 0, totalPointsAgainst = 0;

      teamGames.forEach(game => {
        const isHome = game.home_team_id === team.id;
        const teamScore = isHome ? game.home_score : game.away_score;
        const oppScore = isHome ? game.away_score : game.home_score;
        
        totalPoints += teamScore;
        totalPointsAgainst += oppScore;
        if (teamScore > oppScore) wins++;
        else losses++;

        // Team fouls and timeouts
        if (isHome) {
          totalFouls += game.home_team_fouls || 0;
          totalTimeouts += (5 - (game.home_timeouts || 5));
        } else {
          totalFouls += game.away_team_fouls || 0;
          totalTimeouts += (5 - (game.away_timeouts || 5));
        }
      });

      // Calculate player stats aggregated for the team
      const teamPlayers = filteredPlayers.filter(p => p.team_id === team.id);
      const teamPlayerStats = teamPlayers.map(p => calculatePlayerStats(p.id, team.sport));
      
      const aggregatedPlayerStats = teamPlayerStats.reduce((acc, stats) => {
        Object.keys(stats).forEach(key => {
          acc[key] = (acc[key] || 0) + stats[key];
        });
        return acc;
      }, {});

      return {
        ...team,
        gamesPlayed: teamGames.length,
        wins,
        losses,
        winPercentage: teamGames.length > 0 ? ((wins / teamGames.length) * 100).toFixed(1) : 0,
        avgPointsFor: teamGames.length > 0 ? (totalPoints / teamGames.length).toFixed(1) : 0,
        avgPointsAgainst: teamGames.length > 0 ? (totalPointsAgainst / teamGames.length).toFixed(1) : 0,
        totalFouls,
        avgFouls: teamGames.length > 0 ? (totalFouls / teamGames.length).toFixed(1) : 0,
        totalTimeouts,
        avgTimeouts: teamGames.length > 0 ? (totalTimeouts / teamGames.length).toFixed(1) : 0,
        ...aggregatedPlayerStats,
      };
    });
  };

  const teamStats = calculateTeamStats();

  // Create leaderboards
  const createLeaderboard = (stat, label, sport = null) => {
    return filteredPlayers
      .filter(p => {
        if (sport) {
          const team = teams.find(t => t.id === p.team_id);
          return team?.sport === sport;
        }
        return true;
      })
      .map(player => {
        const team = teams.find(t => t.id === player.team_id);
        const stats = calculatePlayerStats(player.id, team?.sport);
        return {
          name: `${player.first_name} ${player.last_name}`,
          team: team?.name,
          value: stats[stat] || 0,
          playerId: player.id,
        };
      })
      .filter(p => p.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  };

  const generateAIAnalysis = async () => {
    setLoadingAI(true);
    try {
      const statsData = {
        organization: organization?.name,
        totalTeams: filteredTeams.length,
        totalPlayers: filteredPlayers.length,
        totalGames: completedGames.length,
        basketballTeams: filteredTeams.filter(t => t.sport === 'basketball').length,
        volleyballTeams: filteredTeams.filter(t => t.sport === 'volleyball').length,
        teamStats: teamStats.map(t => ({
          name: t.name,
          sport: t.sport,
          record: `${t.wins}-${t.losses}`,
          avgPointsFor: t.avgPointsFor,
          avgPointsAgainst: t.avgPointsAgainst,
          avgFouls: t.avgFouls,
        })),
        topScorers: createLeaderboard('points', 'Points').slice(0, 5),
      };

      const prompt = `You are a professional sports analyst. Analyze the following sports organization statistics and provide a comprehensive executive summary with insights, trends, and recommendations.

Organization: ${statsData.organization}
Total Teams: ${statsData.totalTeams} (${statsData.basketballTeams} Basketball, ${statsData.volleyballTeams} Volleyball)
Total Players: ${statsData.totalPlayers}
Completed Games: ${statsData.totalGames}

Team Performance Summary:
${statsData.teamStats.map(t => `- ${t.name} (${t.sport}): ${t.record}, Avg Pts: ${t.avgPointsFor}/${t.avgPointsAgainst}, Avg Fouls: ${t.avgFouls}`).join('\n')}

Top Scorers:
${statsData.topScorers.map((p, i) => `${i + 1}. ${p.name} (${p.team}): ${p.value} points`).join('\n')}

Please provide:
1. Executive Summary (2-3 sentences)
2. Key Performance Insights (3-4 bullet points)
3. Areas of Strength (2-3 points)
4. Areas for Improvement (2-3 points)
5. Strategic Recommendations (3-4 actionable items)

Format the response in a clear, professional manner.`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: false,
      });

      setAiAnalysis(response);
    } catch (error) {
      console.error("AI Analysis Error:", error);
      setAiAnalysis("Unable to generate AI analysis at this time. Please try again later.");
    } finally {
      setLoadingAI(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-indigo-50/30 to-gray-50 dark:from-gray-900 dark:via-indigo-950/10 dark:to-gray-900">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-full-width { width: 100% !important; max-width: 100% !important; }
        }
      `}</style>

      <AdminHeader 
        user={user}
        organization={organization}
        darkMode={darkMode}
        toggleDarkMode={toggleDarkMode}
        handleLogout={handleLogout}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />

      <div className="flex">
        <AdminSidebar 
          user={user}
          organization={organization}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          handleLogout={handleLogout}
        />

        <main className="flex-1 min-w-0">
          <div className="p-6 lg:p-8 print-full-width">
            <div className="max-w-7xl mx-auto space-y-8">
              {/* Header */}
              <div className="mb-8 flex justify-between items-start">
                <div>
                  <h1 className="text-4xl font-black text-gray-900 dark:text-white">Statistics & Analytics</h1>
                  <p className="text-gray-600 dark:text-gray-400 mt-2 font-medium">Comprehensive performance insights</p>
                </div>
                <Button onClick={handlePrint} className="no-print bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold">
                  <Printer className="w-4 h-4 mr-2" />
                  Print Report
                </Button>
              </div>

              {/* Filters */}
              <Card className="no-print bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Filter className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                      <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Filter by:</span>
                    </div>

                    <select
                      value={selectedSport}
                      onChange={(e) => {
                        setSelectedSport(e.target.value);
                        setSelectedTeam(null);
                      }}
                      className="bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-xl px-4 py-2 font-bold shadow-sm"
                    >
                      {sports.map(sport => (
                        <option key={sport} value={sport}>
                          {sport === 'all' ? 'All Sports' : sport.charAt(0).toUpperCase() + sport.slice(1)}
                        </option>
                      ))}
                    </select>

                    <select
                      value={selectedDivision}
                      onChange={(e) => {
                        setSelectedDivision(e.target.value);
                        setSelectedTeam(null);
                      }}
                      className="bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-xl px-4 py-2 font-bold shadow-sm"
                    >
                      {divisions.map(div => (
                        <option key={div} value={div}>
                          {div === 'all' ? 'All Divisions' : div}
                        </option>
                      ))}
                    </select>
                  </div>
                </CardContent>
              </Card>

              {/* AI Analysis Section */}
              <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30 border-2 border-purple-200 dark:border-purple-800 shadow-xl">
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle className="flex items-center gap-2 text-2xl font-black text-gray-900 dark:text-white">
                      <Sparkles className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                      AI-Powered Analysis
                    </CardTitle>
                    <Button 
                      onClick={generateAIAnalysis}
                      disabled={loadingAI}
                      className="no-print bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold"
                    >
                      {loadingAI ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          {aiAnalysis ? 'Regenerate Analysis' : 'Generate Analysis'}
                        </>
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {aiAnalysis ? (
                    <div className="prose dark:prose-invert max-w-none">
                      <pre className="whitespace-pre-wrap font-sans text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                        {aiAnalysis}
                      </pre>
                    </div>
                  ) : (
                    <p className="text-gray-600 dark:text-gray-400 text-center py-8">
                      Click "Generate Analysis" to get AI-powered insights about your organization's performance
                    </p>
                  )}
                </CardContent>
              </Card>

              <Tabs defaultValue="overview" className="space-y-6">
                <TabsList className="no-print bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 p-1 rounded-xl shadow-lg">
                  <TabsTrigger value="overview" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white dark:text-gray-300 font-bold rounded-lg">
                    Overview
                  </TabsTrigger>
                  <TabsTrigger value="teams" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white dark:text-gray-300 font-bold rounded-lg">
                    Team Stats
                  </TabsTrigger>
                  <TabsTrigger value="basketball" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-600 data-[state=active]:to-red-600 data-[state=active]:text-white dark:text-gray-300 font-bold rounded-lg">
                    Basketball Leaders
                  </TabsTrigger>
                  <TabsTrigger value="volleyball" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-blue-700 data-[state=active]:text-white dark:text-gray-300 font-bold rounded-lg">
                    Volleyball Leaders
                  </TabsTrigger>
                </TabsList>

                {/* OVERVIEW TAB */}
                <TabsContent value="overview" className="space-y-6">
                  <div className="grid md:grid-cols-4 gap-6">
                    <Card className="relative overflow-hidden border-2 border-blue-100 dark:border-blue-900 bg-gradient-to-br from-white to-blue-50 dark:from-gray-800 dark:to-blue-950/30 shadow-lg">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/20 to-transparent rounded-full blur-3xl"></div>
                      <CardHeader className="relative z-10 pb-2">
                        <CardTitle className="text-sm font-bold text-gray-600 dark:text-gray-400">Total Games</CardTitle>
                      </CardHeader>
                      <CardContent className="relative z-10">
                        <div className="text-4xl font-black text-gray-900 dark:text-white">{completedGames.length}</div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-semibold">Completed</p>
                      </CardContent>
                    </Card>

                    <Card className="relative overflow-hidden border-2 border-orange-100 dark:border-orange-900 bg-gradient-to-br from-white to-orange-50 dark:from-gray-800 dark:to-orange-950/30 shadow-lg">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-orange-500/20 to-transparent rounded-full blur-3xl"></div>
                      <CardHeader className="relative z-10 pb-2">
                        <CardTitle className="text-sm font-bold text-gray-600 dark:text-gray-400">Teams</CardTitle>
                      </CardHeader>
                      <CardContent className="relative z-10">
                        <div className="text-4xl font-black text-gray-900 dark:text-white">{filteredTeams.length}</div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-semibold">
                          🏀 {filteredTeams.filter(t => t.sport === 'basketball').length} • 
                          🏐 {filteredTeams.filter(t => t.sport === 'volleyball').length}
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="relative overflow-hidden border-2 border-purple-100 dark:border-purple-900 bg-gradient-to-br from-white to-purple-50 dark:from-gray-800 dark:to-purple-950/30 shadow-lg">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500/20 to-transparent rounded-full blur-3xl"></div>
                      <CardHeader className="relative z-10 pb-2">
                        <CardTitle className="text-sm font-bold text-gray-600 dark:text-gray-400">Active Players</CardTitle>
                      </CardHeader>
                      <CardContent className="relative z-10">
                        <div className="text-4xl font-black text-gray-900 dark:text-white">{filteredPlayers.length}</div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-semibold">Registered</p>
                      </CardContent>
                    </Card>

                    <Card className="relative overflow-hidden border-2 border-green-100 dark:border-green-900 bg-gradient-to-br from-white to-green-50 dark:from-gray-800 dark:to-green-950/30 shadow-lg">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-500/20 to-transparent rounded-full blur-3xl"></div>
                      <CardHeader className="relative z-10 pb-2">
                        <CardTitle className="text-sm font-bold text-gray-600 dark:text-gray-400">Avg Points/Game</CardTitle>
                      </CardHeader>
                      <CardContent className="relative z-10">
                        <div className="text-4xl font-black text-gray-900 dark:text-white">
                          {completedGames.length > 0
                            ? Math.round(completedGames.reduce((sum, g) => sum + g.home_score + g.away_score, 0) / completedGames.length)
                            : 0}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-semibold">Combined</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Sport Distribution */}
                  <div className="grid md:grid-cols-2 gap-6">
                    <Card className="border-2 border-gray-100 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-xl">
                      <CardHeader className="border-b-2 border-gray-100 dark:border-gray-700">
                        <CardTitle className="text-xl font-black text-gray-900 dark:text-white">Sport Distribution</CardTitle>
                      </CardHeader>
                      <CardContent className="p-6">
                        <ResponsiveContainer width="100%" height={250}>
                          <PieChart>
                            <Pie
                              data={[
                                { name: 'Basketball', value: filteredTeams.filter(t => t.sport === 'basketball').length },
                                { name: 'Volleyball', value: filteredTeams.filter(t => t.sport === 'volleyball').length },
                              ]}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              <Cell fill="#f97316" />
                              <Cell fill="#3b82f6" />
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    <Card className="border-2 border-gray-100 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-xl">
                      <CardHeader className="border-b-2 border-gray-100 dark:border-gray-700">
                        <CardTitle className="text-xl font-black text-gray-900 dark:text-white">Top 5 Scorers</CardTitle>
                      </CardHeader>
                      <CardContent className="p-6">
                        <ResponsiveContainer width="100%" height={250}>
                          <BarChart data={createLeaderboard('points', 'Points').slice(0, 5)}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="value" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* TEAM STATS TAB */}
                <TabsContent value="teams" className="space-y-6">
                  <Card className="border-2 border-gray-100 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-xl">
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="bg-gray-50 dark:bg-gray-900 border-b-2 border-gray-100 dark:border-gray-700">
                              <th className="text-left py-4 px-4 text-gray-600 dark:text-gray-400 font-bold text-sm">TEAM</th>
                              <th className="text-center py-4 px-4 text-gray-600 dark:text-gray-400 font-bold text-sm">W-L</th>
                              <th className="text-center py-4 px-4 text-gray-600 dark:text-gray-400 font-bold text-sm">WIN%</th>
                              <th className="text-center py-4 px-4 text-gray-600 dark:text-gray-400 font-bold text-sm">PPG</th>
                              <th className="text-center py-4 px-4 text-gray-600 dark:text-gray-400 font-bold text-sm">PAPG</th>
                              <th className="text-center py-4 px-4 text-gray-600 dark:text-gray-400 font-bold text-sm">FOULS</th>
                              <th className="text-center py-4 px-4 text-gray-600 dark:text-gray-400 font-bold text-sm">TO</th>
                              <th className="text-center py-4 px-4 text-gray-600 dark:text-gray-400 font-bold text-sm">PTS</th>
                              <th className="text-center py-4 px-4 text-gray-600 dark:text-gray-400 font-bold text-sm">REB/ATK</th>
                              <th className="text-center py-4 px-4 text-gray-600 dark:text-gray-400 font-bold text-sm">AST</th>
                              <th className="text-center py-4 px-4 text-gray-600 dark:text-gray-400 font-bold text-sm">BLK</th>
                            </tr>
                          </thead>
                          <tbody>
                            {teamStats.map((team) => (
                              <tr key={team.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                <td className="py-4 px-4">
                                  <div className="flex items-center gap-3">
                                    <Avatar className="w-10 h-10 border-2 border-white dark:border-gray-700">
                                      <AvatarImage src={team.logo_url} />
                                      <AvatarFallback className="bg-gradient-to-br from-gray-300 to-gray-400 text-xs font-bold">
                                        {team.name?.substring(0, 2).toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div>
                                      <p className="font-bold text-gray-900 dark:text-white">{team.name}</p>
                                      <Badge className={`text-xs ${team.sport === 'basketball' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                                        {team.sport}
                                      </Badge>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-4 px-4 text-center font-bold text-gray-900 dark:text-white">{team.wins}-{team.losses}</td>
                                <td className="py-4 px-4 text-center font-bold text-gray-900 dark:text-white">{team.winPercentage}%</td>
                                <td className="py-4 px-4 text-center font-semibold text-green-600 dark:text-green-400">{team.avgPointsFor}</td>
                                <td className="py-4 px-4 text-center font-semibold text-red-600 dark:text-red-400">{team.avgPointsAgainst}</td>
                                <td className="py-4 px-4 text-center font-semibold text-yellow-600 dark:text-yellow-400">{team.avgFouls}</td>
                                <td className="py-4 px-4 text-center font-semibold text-purple-600 dark:text-purple-400">{team.avgTimeouts}</td>
                                <td className="py-4 px-4 text-center font-semibold text-blue-600 dark:text-blue-400">{team.points || 0}</td>
                                <td className="py-4 px-4 text-center font-semibold text-orange-600 dark:text-orange-400">
                                  {team.sport === 'volleyball' ? (team.attacks || 0) : (team.rebounds || 0)}
                                </td>
                                <td className="py-4 px-4 text-center font-semibold text-indigo-600 dark:text-indigo-400">{team.assists || 0}</td>
                                <td className="py-4 px-4 text-center font-semibold text-purple-600 dark:text-purple-400">{team.blocks || 0}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* BASKETBALL LEADERS TAB */}
                <TabsContent value="basketball" className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    {['points', 'rebounds', 'assists', 'blocks', 'steals', 'threePointers'].map(stat => (
                      <Card key={stat} className="border-2 border-orange-100 dark:border-orange-900 bg-white/80 dark:bg-gray-800/80 shadow-xl">
                        <CardHeader className="border-b-2 border-orange-100 dark:border-orange-700">
                          <CardTitle className="text-lg font-black text-gray-900 dark:text-white">
                            Top {stat.charAt(0).toUpperCase() + stat.slice(1).replace(/([A-Z])/g, ' $1')}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4">
                          <div className="space-y-2">
                            {createLeaderboard(stat, stat, 'basketball').slice(0, 5).map((player, index) => (
                              <div key={index} className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-950/30 rounded-lg">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 bg-orange-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                    {index + 1}
                                  </div>
                                  <div>
                                    <p className="font-bold text-gray-900 dark:text-white text-sm">{player.name}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{player.team}</p>
                                  </div>
                                </div>
                                <p className="text-2xl font-black text-orange-600 dark:text-orange-400">{player.value}</p>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>

                {/* VOLLEYBALL LEADERS TAB */}
                <TabsContent value="volleyball" className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    {['points', 'attacks', 'blocks', 'aces', 'assists'].map(stat => (
                      <Card key={stat} className="border-2 border-blue-100 dark:border-blue-900 bg-white/80 dark:bg-gray-800/80 shadow-xl">
                        <CardHeader className="border-b-2 border-blue-100 dark:border-blue-700">
                          <CardTitle className="text-lg font-black text-gray-900 dark:text-white">
                            Top {stat.charAt(0).toUpperCase() + stat.slice(1)}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4">
                          <div className="space-y-2">
                            {createLeaderboard(stat, stat, 'volleyball').slice(0, 5).map((player, index) => (
                              <div key={index} className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                    {index + 1}
                                  </div>
                                  <div>
                                    <p className="font-bold text-gray-900 dark:text-white text-sm">{player.name}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{player.team}</p>
                                  </div>
                                </div>
                                <p className="text-2xl font-black text-blue-600 dark:text-blue-400">{player.value}</p>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}