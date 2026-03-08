import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, TrendingUp, Target, TrendingDown, Filter, Printer, Sparkles, Loader2, Users } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend, PieChart, Pie, Cell } from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import AdminHeader from "@/components/AdminHeader";
import AdminSidebar from "@/components/AdminSidebar";
import TopAssistLeaders from "@/components/leaders/TopAssistLeaders";
import { createPageUrl } from "@/utils";

export default function Statistics() {
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [selectedDivision, setSelectedDivision] = useState('all');
  const [selectedSport, setSelectedSport] = useState('all');
  const [selectedTeamForPlayers, setSelectedTeamForPlayers] = useState('all');
  const [viewMode, setViewMode] = useState('card');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const isAdmin = user?.role === 'admin';

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
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      
      if (currentUser?.organization_id) {
        const orgs = await base44.entities.Organization.list();
        const userOrg = orgs.find(o => o.id === currentUser.organization_id);
        setOrganization(userOrg);
      }
    } catch (error) {
      // Require authentication for access
      base44.auth.redirectToLogin(createPageUrl("Statistics"));
    }
  };


  const handleLogout = () => {
    base44.auth.logout(createPageUrl("PublicLanding"));
  };

  const orgId = user?.organization_id || user?.active_organization_id;
  const { data: teams = [] } = useQuery({
    queryKey: ['teams', orgId],
    queryFn: () => base44.entities.Team.filter({ organization_id: orgId }),
    enabled: !!orgId,
  });

  const { data: games = [] } = useQuery({
    queryKey: ['games', orgId],
    queryFn: () => orgId ? base44.entities.Game.filter({ organization_id: orgId }) : base44.entities.Game.list(),
    enabled: !!user,
  });

  const { data: players = [] } = useQuery({
    queryKey: ['players', orgId],
    queryFn: async () => {
      const allPlayers = await base44.entities.Player.list();
      const teamIds = teams.map(t => t.id);
      return allPlayers.filter(p => teamIds.includes(p.team_id));
    },
    enabled: teams.length > 0 && !!orgId,
  });

  const filteredTeams = teams.filter(team => {
    const divisionMatch = selectedDivision === 'all' || (team.division || 'No Division') === selectedDivision;
    const sportMatch = selectedSport === 'all' || team.sport === selectedSport;
    return divisionMatch && sportMatch;
  });
  const filteredTeamIds = filteredTeams.map(t => t.id);

  // Build filters first so we can derive game IDs correctly
  const filteredTeams = teams.filter(team => {
    const divisionMatch = selectedDivision === 'all' || (team.division || 'No Division') === selectedDivision;
    const sportMatch = selectedSport === 'all' || team.sport === selectedSport;
    return divisionMatch && sportMatch;
  });
  const filteredTeamIds = filteredTeams.map(t => t.id);

  // Build team filters first
  const filteredTeams = teams.filter(team => {
    const divisionMatch = selectedDivision === 'all' || (team.division || 'No Division') === selectedDivision;
    const sportMatch = selectedSport === 'all' || team.sport === selectedSport;
    return divisionMatch && sportMatch;
  });
  const filteredTeamIds = filteredTeams.map(t => t.id);

  const completedIds = games.filter(g => g.status === 'completed').map(g => g.id);
  const filteredGameIds = games
    .filter(g => filteredTeamIds.includes(g.home_team_id) || filteredTeamIds.includes(g.away_team_id))
    .map(g => g.id);

  const { data: playerGameStats = [] } = useQuery({
    queryKey: ['playerGameStats', orgId, JSON.stringify(filteredGameIds)],
    queryFn: async () => {
      if (filteredGameIds.length === 0) return [];
      const res = await base44.functions.invoke('getGamePlayerStats', { game_ids: filteredGameIds });
      return res.data || [];
    },
    enabled: filteredGameIds.length > 0,
    refetchInterval: 10000,
  });

  const divisions = ['all', ...new Set(teams.map(t => t.division || 'No Division'))];
  const sports = ['all', 'basketball', 'volleyball'];

  // filteredTeams and filteredTeamIds are defined above
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

  // Team players filter
  const teamPlayersFilteredByTeam = selectedTeamForPlayers === 'all' 
    ? filteredPlayers 
    : filteredPlayers.filter(p => p.team_id === selectedTeamForPlayers);

  const selectedTeamData = selectedTeamForPlayers !== 'all' 
    ? teams.find(t => t.id === selectedTeamForPlayers) 
    : null;

  // Individual player statistics with detailed metrics
  const getDetailedPlayerStats = (playerId) => {
    const playerStats = relevantPlayerGameStats.filter(s => s.player_id === playerId);
    const gamesPlayed = [...new Set(playerStats.map(s => s.game_id))].length;

    const totals = {
      points: playerStats.reduce((sum, s) => sum + (s.points || 0), 0),
      rebounds: playerStats.reduce((sum, s) => sum + (s.rebounds || 0), 0),
      assists: playerStats.reduce((sum, s) => sum + (s.assists || 0), 0),
      blocks: playerStats.reduce((sum, s) => sum + (s.blocks || 0), 0),
      steals: playerStats.reduce((sum, s) => sum + (s.steals || 0), 0),
      fouls: playerStats.reduce((sum, s) => sum + (s.fouls || 0), 0),
      threePointers: playerStats.reduce((sum, s) => sum + (s.three_pointers || 0), 0),
      fieldGoalsMade: playerStats.reduce((sum, s) => sum + (s.field_goals_made || 0), 0),
      fieldGoalsAttempted: playerStats.reduce((sum, s) => sum + (s.field_goals_attempted || 0), 0),
      freeThrowsMade: playerStats.reduce((sum, s) => sum + (s.free_throws_made || 0), 0),
      freeThrowsAttempted: playerStats.reduce((sum, s) => sum + (s.free_throws_attempted || 0), 0),
    };

    // Volleyball uses ATK (field_goals_made), BLK (blocks), ACE (three_pointers) as scoring actions
    if (selectedSport === 'volleyball') {
      const volleyPoints = playerStats.reduce((sum, s) => sum + (s.field_goals_made || 0) + (s.blocks || 0) + (s.three_pointers || 0), 0);
      totals.points = volleyPoints;
    }

    return {
      gamesPlayed,
      ...totals,
      ppg: gamesPlayed > 0 ? (totals.points / gamesPlayed).toFixed(1) : 0,
      rpg: gamesPlayed > 0 ? (totals.rebounds / gamesPlayed).toFixed(1) : 0,
      apg: gamesPlayed > 0 ? (totals.assists / gamesPlayed).toFixed(1) : 0,
      bpg: gamesPlayed > 0 ? (totals.blocks / gamesPlayed).toFixed(1) : 0,
      spg: gamesPlayed > 0 ? (totals.steals / gamesPlayed).toFixed(1) : 0,
      fpg: gamesPlayed > 0 ? (totals.fouls / gamesPlayed).toFixed(1) : 0,
      fgPct: totals.fieldGoalsAttempted > 0 ? ((totals.fieldGoalsMade / totals.fieldGoalsAttempted) * 100).toFixed(1) : 0,
      ftPct: totals.freeThrowsAttempted > 0 ? ((totals.freeThrowsMade / totals.freeThrowsAttempted) * 100).toFixed(1) : 0,
    };
  };

  const teamPlayersWithStats = teamPlayersFilteredByTeam.map(player => ({
    ...player,
    stats: getDetailedPlayerStats(player.id)
  })).sort((a, b) => (b.stats.points || 0) - (a.stats.points || 0));

  // Comprehensive organization statistics
  const orgStats = {
    totalTeams: filteredTeams.length,
    totalPlayers: filteredPlayers.length,
    totalGames: completedGames.length,
    basketballTeams: filteredTeams.filter(t => t.sport === 'basketball').length,
    volleyballTeams: filteredTeams.filter(t => t.sport === 'volleyball').length,
    basketballGames: completedGames.filter(g => g.sport === 'basketball').length,
    volleyballGames: completedGames.filter(g => g.sport === 'volleyball').length,
    totalPoints: relevantPlayerGameStats.reduce((sum, s) => sum + (s.points || 0), 0),
    totalRebounds: relevantPlayerGameStats.reduce((sum, s) => sum + (s.rebounds || 0), 0),
    totalAssists: relevantPlayerGameStats.reduce((sum, s) => sum + (s.assists || 0), 0),
    totalBlocks: relevantPlayerGameStats.reduce((sum, s) => sum + (s.blocks || 0), 0),
    totalSteals: relevantPlayerGameStats.reduce((sum, s) => sum + (s.steals || 0), 0),
    totalFouls: relevantPlayerGameStats.reduce((sum, s) => sum + (s.fouls || 0), 0),
    totalThreePointers: relevantPlayerGameStats.reduce((sum, s) => sum + (s.three_pointers || 0), 0),
    avgGameScore: completedGames.length > 0 
      ? (completedGames.reduce((sum, g) => sum + g.home_score + g.away_score, 0) / completedGames.length).toFixed(1)
      : 0,
  };

  // Team statistics with fouls, timeouts, etc.
  const teamStats = filteredTeams.map(team => {
    const teamGames = completedGames.filter(g => g.home_team_id === team.id || g.away_team_id === team.id);
    
    let wins = 0, losses = 0, totalFouls = 0, totalTimeouts = 0;
    let totalPointsFor = 0, totalPointsAgainst = 0;
    
    teamGames.forEach(game => {
      const isHome = game.home_team_id === team.id;
      const teamScore = isHome ? game.home_score : game.away_score;
      const oppScore = isHome ? game.away_score : game.home_score;
      
      totalPointsFor += teamScore;
      totalPointsAgainst += oppScore;
      
      if (teamScore > oppScore) wins++;
      else losses++;
      
      totalFouls += isHome ? (game.home_team_fouls || 0) : (game.away_team_fouls || 0);
      totalTimeouts += isHome ? (5 - (game.home_timeouts || 5)) : (5 - (game.away_timeouts || 5));
    });

    const last5Games = teamGames.slice(-5);
    const last5Results = last5Games.map(game => {
      const isHome = game.home_team_id === team.id;
      const teamScore = isHome ? game.home_score : game.away_score;
      const oppScore = isHome ? game.away_score : game.home_score;
      return teamScore > oppScore ? 'W' : 'L';
    });

    return {
      ...team,
      wins,
      losses,
      gamesPlayed: teamGames.length,
      avgPointsFor: teamGames.length > 0 ? (totalPointsFor / teamGames.length).toFixed(1) : 0,
      avgPointsAgainst: teamGames.length > 0 ? (totalPointsAgainst / teamGames.length).toFixed(1) : 0,
      avgFouls: teamGames.length > 0 ? (totalFouls / teamGames.length).toFixed(1) : 0,
      avgTimeouts: teamGames.length > 0 ? (totalTimeouts / teamGames.length).toFixed(1) : 0,
      last5: last5Results,
    };
  });

  // Player leaderboards
  const createPlayerLeaderboard = (statKey, label) => {
    return filteredPlayers
      .map(player => {
        const playerStats = relevantPlayerGameStats.filter(s => s.player_id === player.id);
        let total;
        if (selectedSport === 'volleyball' && statKey === 'points') {
          total = playerStats.reduce((sum, s) => sum + (s.field_goals_made || 0) + (s.blocks || 0) + (s.three_pointers || 0), 0);
        } else {
          total = playerStats.reduce((sum, s) => sum + (s[statKey] || 0), 0);
        }
        const team = filteredTeams.find(t => t.id === player.team_id);
        return {
          name: `${player.first_name} ${player.last_name}`,
          team: team?.name || 'Unknown',
          value: total,
          sport: team?.sport,
        };
      })
      .filter(p => p.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  };

  const topScorers = createPlayerLeaderboard('points', 'Points');
  const topRebounders = createPlayerLeaderboard('rebounds', 'Rebounds');
  const topAssists = createPlayerLeaderboard('assists', 'Assists');
  const topBlocks = createPlayerLeaderboard('blocks', 'Blocks');
  const topSteals = createPlayerLeaderboard('steals', 'Steals');

  const generateAIAnalysis = async () => {
    setLoadingAI(true);
    try {
      const prompt = `Analyze the following sports organization statistics and provide a comprehensive executive summary with key insights, trends, and recommendations:

Organization: ${organization?.name || 'Sports Organization'}
Total Teams: ${orgStats.totalTeams} (Basketball: ${orgStats.basketballTeams}, Volleyball: ${orgStats.volleyballTeams})
Total Players: ${orgStats.totalPlayers}
Total Completed Games: ${orgStats.totalGames}

Overall Statistics:
- Total Points Scored: ${orgStats.totalPoints}
- Total Rebounds: ${orgStats.totalRebounds}
- Total Assists: ${orgStats.totalAssists}
- Total Blocks: ${orgStats.totalBlocks}
- Total Steals: ${orgStats.totalSteals}
- Total Fouls: ${orgStats.totalFouls}
- Average Combined Game Score: ${orgStats.avgGameScore}

Top 3 Teams by Wins:
${teamStats.sort((a, b) => b.wins - a.wins).slice(0, 3).map((t, i) => 
  `${i + 1}. ${t.name} (${t.sport}): ${t.wins}W-${t.losses}L, Avg ${t.avgPointsFor} PPG`
).join('\n')}

Top 3 Scorers:
${topScorers.slice(0, 3).map((p, i) => `${i + 1}. ${p.name} (${p.team}): ${p.value} points`).join('\n')}

Please provide:
1. Executive Summary (2-3 sentences)
2. Key Performance Insights (3-4 bullet points)
3. Notable Trends (2-3 observations)
4. Recommendations for Improvement (2-3 actionable suggestions)`;

      const response = await base44.integrations.Core.InvokeLLM({ prompt });
      setAiAnalysis(response);
    } catch (error) {
      console.error('Error generating AI analysis:', error);
      setAiAnalysis('Unable to generate analysis at this time.');
    } finally {
      setLoadingAI(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-indigo-50/30 to-gray-50 dark:from-gray-900 dark:via-indigo-950/10 dark:to-gray-900">
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
          <div className="p-6 lg:p-8">
            <div className="max-w-7xl mx-auto space-y-8">
              {/* Header with Print Button */}
              <div className="flex justify-between items-start mb-8 print:mb-4">
                <div>
                  <h1 className="text-4xl font-black text-gray-900 dark:text-white print:text-3xl">Statistics & Analytics</h1>
                  <p className="text-gray-600 dark:text-gray-400 mt-2 font-medium print:text-sm">
                    {organization?.name || 'Organization'} Performance Report
                  </p>
                </div>
                <Button
                  onClick={handlePrint}
                  className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-bold shadow-xl print:hidden"
                >
                  <Printer className="w-5 h-5 mr-2" />
                  Print Report
                </Button>
              </div>

              {/* Filters */}
              <Card className="bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 shadow-lg print:hidden">
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

                    {(selectedDivision !== 'all' || selectedSport !== 'all') && (
                      <Badge className="bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800 font-bold">
                        {selectedSport !== 'all' && (selectedSport.charAt(0).toUpperCase() + selectedSport.slice(1))}
                        {selectedSport !== 'all' && selectedDivision !== 'all' && ' • '}
                        {selectedDivision !== 'all' && selectedDivision}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Tabs defaultValue="overview" className="space-y-6">
                <TabsList className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 p-1 rounded-xl shadow-lg print:hidden">
                  <TabsTrigger value="overview" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white dark:text-gray-300 font-bold rounded-lg">
                    Overview
                  </TabsTrigger>
                  <TabsTrigger value="players" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white dark:text-gray-300 font-bold rounded-lg">
                    Player Leaders
                  </TabsTrigger>
                  <TabsTrigger value="team-players" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-600 data-[state=active]:to-green-700 data-[state=active]:text-white dark:text-gray-300 font-bold rounded-lg">
                    Team Players
                  </TabsTrigger>
                  <TabsTrigger value="teams" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white dark:text-gray-300 font-bold rounded-lg">
                    Team Stats
                  </TabsTrigger>
                  {isAdmin && (
                    <TabsTrigger value="ai" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-purple-700 data-[state=active]:text-white dark:text-gray-300 font-bold rounded-lg">
                      AI Insights
                    </TabsTrigger>
                  )}
                </TabsList>

                {/* OVERVIEW TAB */}
                <TabsContent value="overview" className="space-y-6">
                  {/* Organization Summary Cards */}
                  <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 print:grid-cols-4 print:gap-4">
                    <Card className="relative overflow-hidden border-2 border-blue-100 dark:border-blue-900 bg-gradient-to-br from-white to-blue-50 dark:from-gray-800 dark:to-blue-950/30 shadow-lg print:shadow-none">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold text-gray-600 dark:text-gray-400 print:text-xs">Teams</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-black text-gray-900 dark:text-white print:text-2xl">{orgStats.totalTeams}</div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-semibold">
                          🏀 {orgStats.basketballTeams} • 🏐 {orgStats.volleyballTeams}
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="relative overflow-hidden border-2 border-green-100 dark:border-green-900 bg-gradient-to-br from-white to-green-50 dark:from-gray-800 dark:to-green-950/30 shadow-lg print:shadow-none">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold text-gray-600 dark:text-gray-400 print:text-xs">Players</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-black text-gray-900 dark:text-white print:text-2xl">{orgStats.totalPlayers}</div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-semibold">Active athletes</p>
                      </CardContent>
                    </Card>

                    <Card className="relative overflow-hidden border-2 border-orange-100 dark:border-orange-900 bg-gradient-to-br from-white to-orange-50 dark:from-gray-800 dark:to-orange-950/30 shadow-lg print:shadow-none">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold text-gray-600 dark:text-gray-400 print:text-xs">Games Played</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-black text-gray-900 dark:text-white print:text-2xl">{orgStats.totalGames}</div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-semibold">
                          🏀 {orgStats.basketballGames} • 🏐 {orgStats.volleyballGames}
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="relative overflow-hidden border-2 border-purple-100 dark:border-purple-900 bg-gradient-to-br from-white to-purple-50 dark:from-gray-800 dark:to-purple-950/30 shadow-lg print:shadow-none">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold text-gray-600 dark:text-gray-400 print:text-xs">Avg Game Score</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-black text-gray-900 dark:text-white print:text-2xl">{orgStats.avgGameScore}</div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-semibold">Points per game</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Organization-Wide Statistics Grid */}
                  <Card className="border-2 border-gray-100 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-xl print:shadow-none print:break-inside-avoid">
                    <CardHeader className="border-b-2 border-gray-100 dark:border-gray-700">
                      <CardTitle className="text-2xl font-black text-gray-900 dark:text-white print:text-xl">
                        Organization Statistics Summary
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 print:p-4">
                      <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-4 print:grid-cols-6 print:gap-3">
                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30 rounded-xl p-4 print:p-3 border-2 border-blue-200 dark:border-blue-800">
                          <div className="text-3xl font-black text-blue-600 dark:text-blue-400 print:text-2xl">{orgStats.totalPoints}</div>
                          <div className="text-xs text-gray-600 dark:text-gray-400 font-bold mt-1">Total Points</div>
                        </div>
                        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/30 rounded-xl p-4 print:p-3 border-2 border-green-200 dark:border-green-800">
                          <div className="text-3xl font-black text-green-600 dark:text-green-400 print:text-2xl">{orgStats.totalRebounds}</div>
                          <div className="text-xs text-gray-600 dark:text-gray-400 font-bold mt-1">Total Rebounds</div>
                        </div>
                        <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/30 rounded-xl p-4 print:p-3 border-2 border-purple-200 dark:border-purple-800">
                          <div className="text-3xl font-black text-purple-600 dark:text-purple-400 print:text-2xl">{orgStats.totalAssists}</div>
                          <div className="text-xs text-gray-600 dark:text-gray-400 font-bold mt-1">Total Assists</div>
                        </div>
                        <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/30 dark:to-orange-900/30 rounded-xl p-4 print:p-3 border-2 border-orange-200 dark:border-orange-800">
                          <div className="text-3xl font-black text-orange-600 dark:text-orange-400 print:text-2xl">{orgStats.totalBlocks}</div>
                          <div className="text-xs text-gray-600 dark:text-gray-400 font-bold mt-1">Total Blocks</div>
                        </div>
                        <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/30 dark:to-red-900/30 rounded-xl p-4 print:p-3 border-2 border-red-200 dark:border-red-800">
                          <div className="text-3xl font-black text-red-600 dark:text-red-400 print:text-2xl">{orgStats.totalSteals}</div>
                          <div className="text-xs text-gray-600 dark:text-gray-400 font-bold mt-1">Total Steals</div>
                        </div>
                        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-950/30 dark:to-yellow-900/30 rounded-xl p-4 print:p-3 border-2 border-yellow-200 dark:border-yellow-800">
                          <div className="text-3xl font-black text-yellow-600 dark:text-yellow-400 print:text-2xl">{orgStats.totalFouls}</div>
                          <div className="text-xs text-gray-600 dark:text-gray-400 font-bold mt-1">Total Fouls</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Sport Distribution Chart */}
                  <div className="grid lg:grid-cols-2 gap-6 print:grid-cols-2 print:gap-4">
                    <Card className="border-2 border-gray-100 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-xl print:shadow-none print:break-inside-avoid">
                      <CardHeader className="border-b-2 border-gray-100 dark:border-gray-700">
                        <CardTitle className="text-xl font-black text-gray-900 dark:text-white print:text-lg">Teams by Sport</CardTitle>
                      </CardHeader>
                      <CardContent className="p-6 print:p-4">
                        <ResponsiveContainer width="100%" height={250}>
                          <PieChart>
                            <Pie
                              data={[
                                { name: 'Basketball', value: orgStats.basketballTeams },
                                { name: 'Volleyball', value: orgStats.volleyballTeams }
                              ]}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {[0, 1].map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={index === 0 ? '#F97316' : '#3B82F6'} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    <Card className="border-2 border-gray-100 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-xl print:shadow-none print:break-inside-avoid">
                      <CardHeader className="border-b-2 border-gray-100 dark:border-gray-700">
                        <CardTitle className="text-xl font-black text-gray-900 dark:text-white print:text-lg">Games by Sport</CardTitle>
                      </CardHeader>
                      <CardContent className="p-6 print:p-4">
                        <ResponsiveContainer width="100%" height={250}>
                          <BarChart
                            data={[
                              { sport: 'Basketball', games: orgStats.basketballGames },
                              { sport: 'Volleyball', games: orgStats.volleyballGames }
                            ]}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="sport" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="games" fill="#3B82F6" />
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* PLAYER LEADERS TAB */}
                <TabsContent value="players" className="space-y-6">
                  <div className="grid lg:grid-cols-2 gap-6 print:grid-cols-2 print:gap-4">
                    {/* Top Scorers */}
                    <Card className="border-2 border-gray-100 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-xl print:shadow-none print:break-inside-avoid">
                      <CardHeader className="border-b-2 border-gray-100 dark:border-gray-700">
                        <CardTitle className="text-xl font-black text-gray-900 dark:text-white print:text-lg">🏆 Top Scorers</CardTitle>
                      </CardHeader>
                      <CardContent className="p-6 print:p-4">
                        <div className="space-y-2">
                          {topScorers.length === 0 && (
                             <div className="text-sm text-gray-500 dark:text-gray-400">No data available.</div>
                           )}
                           {topScorers.map((player, index) => (
                            <div key={index} className="flex items-center gap-3 bg-gradient-to-r from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 rounded-lg p-3 print:p-2 border border-gray-200 dark:border-gray-700">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black ${
                                index === 0 ? 'bg-yellow-400 text-gray-900' :
                                index === 1 ? 'bg-gray-300 text-white' :
                                index === 2 ? 'bg-orange-600 text-white' :
                                'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                              }`}>
                                {index + 1}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-gray-900 dark:text-white truncate print:text-xs">{player.name}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{player.team}</p>
                              </div>
                              <div className="text-xl font-black text-blue-600 dark:text-blue-400 print:text-lg">{player.value}</div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Top Rebounders */}
                    <Card className="border-2 border-gray-100 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-xl print:shadow-none print:break-inside-avoid">
                      <CardHeader className="border-b-2 border-gray-100 dark:border-gray-700">
                        <CardTitle className="text-xl font-black text-gray-900 dark:text-white print:text-lg">💪 Top Rebounders</CardTitle>
                      </CardHeader>
                      <CardContent className="p-6 print:p-4">
                        <div className="space-y-2">
                          {topRebounders.length === 0 && (
                             <div className="text-sm text-gray-500 dark:text-gray-400">No data available.</div>
                           )}
                           {topRebounders.slice(0, 10).map((player, index) => (
                            <div key={index} className="flex items-center gap-3 bg-gradient-to-r from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 rounded-lg p-3 print:p-2 border border-gray-200 dark:border-gray-700">
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black bg-green-500 text-white">
                                {index + 1}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-gray-900 dark:text-white truncate print:text-xs">{player.name}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{player.team}</p>
                              </div>
                              <div className="text-xl font-black text-green-600 dark:text-green-400 print:text-lg">{player.value}</div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Top Assists (Basketball) */}
                    <TopAssistLeaders organizationId={orgId} sport={selectedSport === 'all' ? 'basketball' : selectedSport} orgName={organization?.name} orgLogoUrl={organization?.logo_url} />

                    {/* Top Blocks */}
                    <Card className="border-2 border-gray-100 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-xl print:shadow-none print:break-inside-avoid">
                      <CardHeader className="border-b-2 border-gray-100 dark:border-gray-700">
                        <CardTitle className="text-xl font-black text-gray-900 dark:text-white print:text-lg">🛡️ Top Blocks</CardTitle>
                      </CardHeader>
                      <CardContent className="p-6 print:p-4">
                        <div className="space-y-2">
                          {topBlocks.length === 0 && (
                             <div className="text-sm text-gray-500 dark:text-gray-400">No data available.</div>
                           )}
                           {topBlocks.slice(0, 10).map((player, index) => (
                            <div key={index} className="flex items-center gap-3 bg-gradient-to-r from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 rounded-lg p-3 print:p-2 border border-gray-200 dark:border-gray-700">
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black bg-orange-500 text-white">
                                {index + 1}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-gray-900 dark:text-white truncate print:text-xs">{player.name}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{player.team}</p>
                              </div>
                              <div className="text-xl font-black text-orange-600 dark:text-orange-400 print:text-lg">{player.value}</div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* TEAM PLAYERS TAB */}
                <TabsContent value="team-players" className="space-y-6">
                  {/* Team Filter */}
                  <Card className="bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 shadow-lg">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4 flex-wrap">
                        <div className="flex items-center gap-2">
                          <Users className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                          <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Select Team:</span>
                        </div>

                        <select
                          value={selectedTeamForPlayers}
                          onChange={(e) => setSelectedTeamForPlayers(e.target.value)}
                          className="bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-xl px-4 py-2 font-bold shadow-sm"
                        >
                          <option value="all">All Teams</option>
                          {filteredTeams.map(team => (
                            <option key={team.id} value={team.id}>
                              {team.sport === 'basketball' ? '🏀' : '🏐'} {team.name}
                            </option>
                          ))}
                        </select>

                        {selectedTeamData && (
                          <Badge className="bg-green-100 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800 font-bold">
                            {teamPlayersWithStats.length} Players
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Selected Team Info */}
                  {selectedTeamData && (
                    <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/30 border-2 border-green-200 dark:border-green-800 shadow-lg">
                      <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                          <Avatar className="w-16 h-16 border-4 border-white dark:border-gray-700 shadow-xl">
                            <AvatarImage src={selectedTeamData.logo_url} />
                            <AvatarFallback className={`bg-gradient-to-br ${
                              selectedTeamData.sport === 'basketball' ? 'from-orange-500 to-orange-600' : 'from-blue-500 to-blue-600'
                            } text-white font-black text-lg`}>
                              {selectedTeamData.name?.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h2 className="text-2xl font-black text-gray-900 dark:text-white">{selectedTeamData.name}</h2>
                            <Badge className={`mt-2 ${
                              selectedTeamData.sport === 'basketball'
                                ? 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800'
                                : 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800'
                            } font-bold`}>
                              {selectedTeamData.sport}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Players Table */}
                  <Card className="bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 shadow-lg">
                    <CardHeader className="border-b-2 border-gray-100 dark:border-gray-700">
                      <CardTitle className="text-2xl font-black text-gray-900 dark:text-white">
                        Individual Player Statistics
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="bg-gray-50 dark:bg-gray-900 border-b-2 border-gray-100 dark:border-gray-700">
                              <th className="text-left py-4 px-4 text-gray-600 dark:text-gray-400 font-bold text-sm">PLAYER</th>
                              <th className="text-center py-4 px-4 text-gray-600 dark:text-gray-400 font-bold text-sm">GP</th>
                              <th className="text-center py-4 px-4 text-gray-600 dark:text-gray-400 font-bold text-sm">PTS</th>
                              <th className="text-center py-4 px-4 text-gray-600 dark:text-gray-400 font-bold text-sm">PPG</th>
                              <th className="text-center py-4 px-4 text-gray-600 dark:text-gray-400 font-bold text-sm">REB</th>
                              <th className="text-center py-4 px-4 text-gray-600 dark:text-gray-400 font-bold text-sm">RPG</th>
                              <th className="text-center py-4 px-4 text-gray-600 dark:text-gray-400 font-bold text-sm">AST</th>
                              <th className="text-center py-4 px-4 text-gray-600 dark:text-gray-400 font-bold text-sm">APG</th>
                              <th className="text-center py-4 px-4 text-gray-600 dark:text-gray-400 font-bold text-sm">BLK</th>
                              <th className="text-center py-4 px-4 text-gray-600 dark:text-gray-400 font-bold text-sm">STL</th>
                              <th className="text-center py-4 px-4 text-gray-600 dark:text-gray-400 font-bold text-sm">FLS</th>
                              <th className="text-center py-4 px-4 text-gray-600 dark:text-gray-400 font-bold text-sm">FG%</th>
                            </tr>
                          </thead>
                          <tbody>
                            {teamPlayersWithStats.length > 0 ? teamPlayersWithStats.map((player) => (
                              <tr key={player.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                <td className="py-4 px-4">
                                  <div className="flex items-center gap-3">
                                    <Avatar className="w-10 h-10 border-2 border-white dark:border-gray-700 shadow-md">
                                      <AvatarImage src={player.photo_url} />
                                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white text-xs font-bold">
                                        {player.jersey_number}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div>
                                      <p className="font-bold text-gray-900 dark:text-white">
                                        {player.first_name} {player.last_name}
                                      </p>
                                      <p className="text-xs text-gray-500 dark:text-gray-400">#{player.jersey_number}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-4 px-4 text-center font-semibold text-gray-900 dark:text-white">{player.stats.gamesPlayed}</td>
                                <td className="py-4 px-4 text-center text-blue-600 dark:text-blue-400 font-bold text-lg">{player.stats.points}</td>
                                <td className="py-4 px-4 text-center font-semibold text-gray-700 dark:text-gray-300">{player.stats.ppg}</td>
                                <td className="py-4 px-4 text-center text-green-600 dark:text-green-400 font-bold">{player.stats.rebounds}</td>
                                <td className="py-4 px-4 text-center font-semibold text-gray-700 dark:text-gray-300">{player.stats.rpg}</td>
                                <td className="py-4 px-4 text-center text-purple-600 dark:text-purple-400 font-bold">{player.stats.assists}</td>
                                <td className="py-4 px-4 text-center font-semibold text-gray-700 dark:text-gray-300">{player.stats.apg}</td>
                                <td className="py-4 px-4 text-center text-orange-600 dark:text-orange-400 font-semibold">{player.stats.blocks}</td>
                                <td className="py-4 px-4 text-center text-red-600 dark:text-red-400 font-semibold">{player.stats.steals}</td>
                                <td className="py-4 px-4 text-center text-yellow-600 dark:text-yellow-400 font-semibold">{player.stats.fouls}</td>
                                <td className="py-4 px-4 text-center text-indigo-600 dark:text-indigo-400 font-semibold">{player.stats.fgPct}%</td>
                              </tr>
                            )) : (
                              <tr>
                                <td colSpan="12" className="py-20 text-center">
                                  <Users className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                                  <p className="text-gray-500 dark:text-gray-400 font-medium">
                                    {selectedTeamForPlayers === 'all' ? 'Select a team to view player statistics' : 'No players found for this team'}
                                  </p>
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* TEAM STATS TAB */}
                <TabsContent value="teams" className="space-y-6">
                  <Card className="bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 shadow-lg print:shadow-none print:break-inside-avoid">
                    <CardHeader className="border-b-2 border-gray-100 dark:border-gray-700">
                      <CardTitle className="text-2xl font-black text-gray-900 dark:text-white print:text-xl">
                        Team Performance Statistics
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="bg-gray-50 dark:bg-gray-900 border-b-2 border-gray-100 dark:border-gray-700">
                              <th className="text-left py-4 px-4 text-gray-600 dark:text-gray-400 font-bold text-sm print:text-xs">TEAM</th>
                              <th className="text-center py-4 px-4 text-gray-600 dark:text-gray-400 font-bold text-sm print:text-xs">SPORT</th>
                              <th className="text-center py-4 px-4 text-gray-600 dark:text-gray-400 font-bold text-sm print:text-xs">W-L</th>
                              <th className="text-center py-4 px-4 text-gray-600 dark:text-gray-400 font-bold text-sm print:text-xs">WIN%</th>
                              <th className="text-center py-4 px-4 text-gray-600 dark:text-gray-400 font-bold text-sm print:text-xs">PPG</th>
                              <th className="text-center py-4 px-4 text-gray-600 dark:text-gray-400 font-bold text-sm print:text-xs">PAPG</th>
                              <th className="text-center py-4 px-4 text-gray-600 dark:text-gray-400 font-bold text-sm print:text-xs">FOULS</th>
                              <th className="text-center py-4 px-4 text-gray-600 dark:text-gray-400 font-bold text-sm print:text-xs">TO/G</th>
                            </tr>
                          </thead>
                          <tbody>
                            {teamStats.map((team) => (
                              <tr key={team.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                <td className="py-4 px-4 print:py-2 print:px-2">
                                  <div className="flex items-center gap-3">
                                    <Avatar className="w-10 h-10 border-2 border-white dark:border-gray-700 shadow-md print:w-8 print:h-8">
                                      <AvatarImage src={team.logo_url} />
                                      <AvatarFallback className={`bg-gradient-to-br ${
                                        team.sport === 'basketball' ? 'from-orange-500 to-orange-600' : 'from-blue-500 to-blue-600'
                                      } text-white text-xs font-bold`}>
                                        {team.name?.substring(0, 2).toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="font-bold text-gray-900 dark:text-white print:text-xs">{team.name}</span>
                                  </div>
                                </td>
                                <td className="py-4 px-4 text-center print:py-2 print:px-2">
                                  <Badge className={`${
                                    team.sport === 'basketball'
                                      ? 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800'
                                      : 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800'
                                  } font-bold print:text-xs`}>
                                    {team.sport === 'basketball' ? '🏀' : '🏐'}
                                  </Badge>
                                </td>
                                <td className="py-4 px-4 text-center font-bold text-gray-900 dark:text-white print:py-2 print:px-2 print:text-xs">
                                  {team.wins}-{team.losses}
                                </td>
                                <td className="py-4 px-4 text-center font-bold text-gray-900 dark:text-white print:py-2 print:px-2 print:text-xs">
                                  {team.gamesPlayed > 0 ? ((team.wins / team.gamesPlayed) * 100).toFixed(0) : 0}%
                                </td>
                                <td className="py-4 px-4 text-center text-blue-600 dark:text-blue-400 font-semibold print:py-2 print:px-2 print:text-xs">
                                  {team.avgPointsFor}
                                </td>
                                <td className="py-4 px-4 text-center text-red-600 dark:text-red-400 font-semibold print:py-2 print:px-2 print:text-xs">
                                  {team.avgPointsAgainst}
                                </td>
                                <td className="py-4 px-4 text-center text-yellow-600 dark:text-yellow-400 font-semibold print:py-2 print:px-2 print:text-xs">
                                  {team.avgFouls}
                                </td>
                                <td className="py-4 px-4 text-center text-purple-600 dark:text-purple-400 font-semibold print:py-2 print:px-2 print:text-xs">
                                  {team.avgTimeouts}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* AI INSIGHTS TAB - Admins only */}
                {isAdmin && (
                <TabsContent value="ai" className="space-y-6">
                  <Card className="border-2 border-gray-100 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-xl print:shadow-none print:break-inside-avoid">
                    <CardHeader className="border-b-2 border-gray-100 dark:border-gray-700">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                          <Sparkles className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                          AI Performance Analysis
                        </CardTitle>
                        {!aiAnalysis && (
                          <Button
                            onClick={generateAIAnalysis}
                            disabled={loadingAI}
                            className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-bold"
                          >
                            {loadingAI ? (
                              <>
                                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                Analyzing...
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-5 h-5 mr-2" />
                                Generate Analysis
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="p-6 print:p-4">
                      {aiAnalysis ? (
                        <div className="prose prose-sm max-w-none dark:prose-invert">
                          <div className="whitespace-pre-wrap text-gray-700 dark:text-gray-300 leading-relaxed">
                            {aiAnalysis}
                          </div>
                          <Button
                            onClick={() => setAiAnalysis(null)}
                            variant="outline"
                            className="mt-4 print:hidden"
                          >
                            Generate New Analysis
                          </Button>
                        </div>
                      ) : (
                        <div className="text-center py-20">
                          <Sparkles className="w-16 h-16 text-purple-300 dark:text-purple-600 mx-auto mb-4" />
                          <p className="text-gray-500 dark:text-gray-400 font-medium mb-4">
                            Click "Generate Analysis" to get AI-powered insights about your organization's performance
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
                )}
              </Tabs>
            </div>
          </div>
        </main>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:break-inside-avoid {
            break-inside: avoid;
          }
        }
      `}</style>
    </div>
  );
}