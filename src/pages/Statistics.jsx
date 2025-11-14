
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, TrendingUp, Target, TrendingDown, Filter, Menu, X, LogOut, Sun, Moon, Home, BarChart3, Users, Calendar, Shield, PlayCircle, Building2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function Statistics() {
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [selectedDivision, setSelectedDivision] = useState('all');
  const [selectedSport, setSelectedSport] = useState('all');
  const [viewMode, setViewMode] = useState('card');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

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
    
    if (currentUser?.organization_id) {
      const orgs = await base44.entities.Organization.list();
      const userOrg = orgs.find(o => o.id === currentUser.organization_id);
      setOrganization(userOrg);
    }
  };

  const handleLogout = () => {
    base44.auth.logout(createPageUrl("PublicLanding"));
  };

  const isSuperAdmin = user?.role === 'admin' && user?.is_super_admin === true;
  const isAdmin = user?.role === 'admin';

  const superAdminNav = [
    { title: "Home", url: createPageUrl("Home"), icon: Home },
    { title: "Dashboard", url: createPageUrl("Dashboard"), icon: BarChart3 },
    { title: "Organizations", url: createPageUrl("Organizations"), icon: Building2 },
    { title: "All Teams", url: createPageUrl("AllTeams"), icon: Users },
    { title: "All Games", url: createPageUrl("AllGames"), icon: Calendar },
    { title: "Admin Approvals", url: createPageUrl("AdminApprovals"), icon: Shield },
  ];

  const adminNav = [
    { title: "Home", url: createPageUrl("Home"), icon: Home },
    { title: "Dashboard", url: createPageUrl("Dashboard"), icon: BarChart3 },
    { title: "Divisions", url: createPageUrl("Divisions"), icon: Trophy },
    { title: "Teams", url: createPageUrl("Teams"), icon: Users },
    { title: "Players", url: createPageUrl("Players"), icon: Trophy },
    { title: "Games", url: createPageUrl("Games"), icon: Calendar },
    { title: "Scorekeepers", url: createPageUrl("Scorekeepers"), icon: Shield },
    { title: "Live Scoring", url: createPageUrl("LiveScoring"), icon: PlayCircle },
    { title: "Statistics", url: createPageUrl("Statistics"), icon: BarChart3 },
  ];

  const navigationItems = isSuperAdmin ? superAdminNav : (isAdmin ? adminNav : []);

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

  // Fetch PlayerGameStats to calculate real-time totals
  const { data: playerGameStats = [] } = useQuery({
    queryKey: ['playerGameStats', user?.organization_id],
    queryFn: async () => {
      return base44.entities.PlayerGameStats.list();
    },
    enabled: !!user?.organization_id,
  });

  // Get unique divisions and sports
  const divisions = ['all', ...new Set(teams.map(t => t.division || 'No Division'))];
  const sports = ['all', 'basketball', 'volleyball'];

  // Filter teams based on division and sport
  const filteredTeams = teams.filter(team => {
    const divisionMatch = selectedDivision === 'all' || (team.division || 'No Division') === selectedDivision;
    const sportMatch = selectedSport === 'all' || team.sport === selectedSport;
    return divisionMatch && sportMatch;
  });

  const filteredTeamIds = filteredTeams.map(t => t.id);

  // Filter games based on filtered teams
  const filteredGames = games.filter(game =>
    (filteredTeamIds.includes(game.home_team_id) || filteredTeamIds.includes(game.away_team_id))
  );

  // Filter players based on filtered teams
  const filteredPlayers = players.filter(p => filteredTeamIds.includes(p.team_id));

  const completedGames = filteredGames.filter(g => g.status === 'completed');

  // Filter PlayerGameStats to only include stats from games that are in completedGames and are relevant to filtered players.
  const relevantPlayerGameStats = playerGameStats.filter(stat => {
    const gameIsCompletedAndFiltered = completedGames.some(game => game.id === stat.game_id);
    const playerIsFiltered = filteredPlayers.some(player => player.id === stat.player_id);
    return gameIsCompletedAndFiltered && playerIsFiltered;
  });

  // Calculate player totals from PlayerGameStats
  const calculatePlayerStats = (playerId) => {
    const playerSpecificStats = relevantPlayerGameStats.filter(s => s.player_id === playerId);
    const totalPoints = playerSpecificStats.reduce((sum, s) => sum + (s.points || 0), 0);
    const totalRebounds = playerSpecificStats.reduce((sum, s) => sum + (s.rebounds || 0), 0);
    const totalAssists = playerSpecificStats.reduce((sum, s) => sum + (s.assists || 0), 0);
    
    return {
      points: totalPoints,
      rebounds: totalRebounds,
      assists: totalAssists,
    };
  };

  // Calculate head-to-head records
  const getHeadToHead = (teamId) => {
    const h2h = {};

    completedGames.forEach(game => {
      if (game.home_team_id === teamId || game.away_team_id === teamId) {
        const opponentId = game.home_team_id === teamId ? game.away_team_id : game.home_team_id;
        const opponent = filteredTeams.find(t => t.id === opponentId);

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

  // Top scorers - Calculate from PlayerGameStats
  const topScorers = filteredPlayers
    .map(player => {
      const stats = calculatePlayerStats(player.id);
      return {
        name: `${player.first_name} ${player.last_name}`,
        points: stats.points,
        playerId: player.id,
      };
    })
    .filter(p => p.points > 0)
    .sort((a, b) => b.points - a.points)
    .slice(0, 5);

  // Team stats with recent form
  const teamStats = filteredTeams.map(team => {
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
      {/* HEADER WITH HAMBURGER MENU */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 h-16 px-4 lg:px-6 flex items-center justify-between sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Toggle Navigation Menu"
          >
            {sidebarOpen ? (
              <X className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            ) : (
              <Menu className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            )}
          </button>
          <div className="flex items-center gap-3">
            {organization?.logo_url ? (
              <Avatar className="w-10 h-10 border-2 border-orange-500 shadow-lg">
                <AvatarImage src={organization.logo_url} />
                <AvatarFallback className="bg-gradient-to-br from-orange-500 to-red-600 text-white font-black">
                  {organization.name?.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            ) : (
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                  <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
                </svg>
              </div>
            )}
            <div className="hidden sm:block">
              <span className="font-bold text-xl text-gray-900 dark:text-white tracking-tight">
                {organization?.name || 'ALAB'}
              </span>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 -mt-1 font-medium tracking-wide">
                {organization ? 'ORGANIZATION' : 'SPORTS LEAGUE'}
              </p>
            </div>
            {isSuperAdmin && (
              <span className="hidden lg:inline-block ml-2 text-xs bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-2.5 py-1 rounded-full font-semibold shadow-sm">
                SUPER ADMIN
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={toggleDarkMode}
            variant="ghost"
            size="icon"
            className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </Button>

          <div className="hidden lg:flex items-center gap-3 text-sm">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-sm">
              <span className="text-sm font-bold text-white">
                {user?.full_name?.[0] || 'U'}
              </span>
            </div>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white text-sm">{user?.full_name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Administrator</p>
            </div>
          </div>
          <Button
            onClick={handleLogout}
            className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold shadow-md"
            size="sm"
          >
            <LogOut className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </div>
      </header>

      <div className="flex">
        {/* SIDEBAR */}
        <aside className={`
          fixed inset-y-0 left-0 z-40 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700
          transform transition-transform duration-200 ease-in-out mt-16 shadow-2xl
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
          <div className="h-full flex flex-col pt-6 pb-6">
            {organization && (
              <div className="px-4 mb-6">
                <div className="flex items-center gap-3 p-3 bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/30 dark:to-red-950/30 rounded-xl border-2 border-orange-200 dark:border-orange-800">
                  <Avatar className="w-12 h-12 border-2 border-white dark:border-gray-700 shadow-lg">
                    <AvatarImage src={organization.logo_url} />
                    <AvatarFallback className="bg-gradient-to-br from-orange-500 to-red-600 text-white font-black text-sm">
                      {organization.name?.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-gray-900 dark:text-white truncate">{organization.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold">Your Organization</p>
                  </div>
                </div>
              </div>
            )}

            <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
              {navigationItems.map((item) => {
                const isActive = window.location.pathname === item.url;
                return (
                  <Link
                    key={item.title}
                    to={item.url}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                      isActive
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    {item.title}
                  </Link>
                );
              })}
            </nav>

            <div className="px-4 pt-4 border-t border-gray-200 dark:border-gray-700 mt-auto bg-gray-50 dark:bg-gray-900">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-11 h-11 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-sm">
                  <span className="text-sm font-bold text-white">
                    {user?.full_name?.[0] || 'U'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{user?.full_name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start text-red-600 dark:text-red-400 border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-950 hover:text-red-700 dark:hover:text-red-300 dark:hover:border-red-700 font-semibold"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </aside>

        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-gray-900/50 dark:bg-black/70 z-30 backdrop-blur-sm mt-16"
            onClick={() => setSidebarOpen(false)}
          ></div>
        )}

        {/* MAIN CONTENT */}
        <main className="flex-1 min-w-0">
          <div className="p-6 lg:p-8">
            <div className="max-w-7xl mx-auto space-y-8">
              {/* Header */}
              <div className="mb-8">
                <h1 className="text-4xl font-black text-gray-900 dark:text-white">Statistics & Analytics</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-2 font-medium">Performance insights and trends</p>
              </div>

              {/* Filters */}
              <Card className="bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Filter className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                      <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Filter by:</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <label htmlFor="sport-filter" className="text-sm font-semibold text-gray-600 dark:text-gray-400 sr-only">Sport filter</label>
                      <select
                        id="sport-filter"
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
                    </div>

                    <div className="flex items-center gap-2">
                      <label htmlFor="division-filter" className="text-sm font-semibold text-gray-600 dark:text-gray-400 sr-only">Division filter</label>
                      <select
                        id="division-filter"
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
                        <div className="text-4xl font-black text-gray-900 dark:text-white">{completedGames.length}</div>
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
                          {completedGames.length > 0
                            ? Math.round(
                                completedGames.reduce((sum, g) => sum + g.home_score + g.away_score, 0) /
                                completedGames.length
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
                      <CardTitle className="text-2xl font-black text-gray-900 dark:text-white">Top Scorers</CardTitle>
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
                          <p className="text-gray-500 dark:text-gray-400 font-medium">No player statistics yet</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* TEAM PERFORMANCE TAB */}
                <TabsContent value="performance" className="space-y-6">
                  {/* View Toggle Header */}
                  <div className="flex justify-end">
                    <div className="flex bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl p-1 shadow-sm">
                      <Button
                        variant={viewMode === 'card' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setViewMode('card')}
                        className={`font-bold ${viewMode === 'card' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white' : 'text-gray-600 dark:text-gray-400'}`}
                      >
                        <Trophy className="w-4 h-4 mr-2" />
                        Cards
                      </Button>
                      <Button
                        variant={viewMode === 'table' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setViewMode('table')}
                        className={`font-bold ${viewMode === 'table' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white' : 'text-gray-600 dark:text-gray-400'}`}
                      >
                        <Target className="w-4 h-4 mr-2" />
                        Table
                      </Button>
                    </div>
                  </div>

                  {/* Team Selection Cards / Table */}
                  {teamStats.length === 0 ? (
                    <div className="text-center py-20">
                      <Trophy className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                      <p className="text-gray-500 dark:text-gray-400 font-medium">No teams found for the selected filters.</p>
                    </div>
                  ) : viewMode === 'card' ? (
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
                    <Card className="bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 shadow-lg hover:shadow-xl transition-shadow">
                      <CardContent className="p-0">
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="bg-gray-50 dark:bg-gray-900 border-b-2 border-gray-100 dark:border-gray-700">
                                <th className="text-left py-4 px-4 text-gray-600 dark:text-gray-400 font-bold text-sm">TEAM</th>
                                <th className="text-center py-4 px-4 text-gray-600 dark:text-gray-400 font-bold text-sm">SPORT</th>
                                <th className="text-center py-4 px-4 text-gray-600 dark:text-gray-400 font-bold text-sm">W</th>
                                <th className="text-center py-4 px-4 text-gray-600 dark:text-gray-400 font-bold text-sm">L</th>
                                <th className="text-center py-4 px-4 text-gray-600 dark:text-gray-400 font-bold text-sm">WIN %</th>
                                <th className="text-center py-4 px-4 text-gray-600 dark:text-gray-400 font-bold text-sm">PF</th>
                                <th className="text-center py-4 px-4 text-gray-600 dark:text-gray-400 font-bold text-sm">PA</th>
                                <th className="text-center py-4 px-4 text-gray-600 dark:text-gray-400 font-bold text-sm">LAST 5</th>
                                <th className="text-center py-4 px-4 text-gray-600 dark:text-gray-400 font-bold text-sm">ACTION</th>
                              </tr>
                            </thead>
                            <tbody>
                              {teamStats.map((team) => {
                                const sportColor = team.sport === 'basketball' ? 'orange' : 'blue';
                                return (
                                  <tr key={team.id} className={`border-b border-gray-100 dark:border-gray-700 hover:bg-${sportColor}-50/50 dark:hover:bg-${sportColor}-950/20 transition-colors`}>
                                    <td className="py-4 px-4">
                                      <div className="flex items-center gap-3">
                                        <Avatar className="w-12 h-12 border-2 border-white dark:border-gray-700 shadow-md">
                                          <AvatarImage src={team.logo_url} />
                                          <AvatarFallback className={`bg-gradient-to-br from-${sportColor}-500 to-${sportColor}-600 text-white text-xs font-bold`}>
                                            {team.name?.substring(0, 2).toUpperCase()}
                                          </AvatarFallback>
                                        </Avatar>
                                        <span className="font-bold text-gray-900 dark:text-white">{team.name}</span>
                                      </div>
                                    </td>
                                    <td className="py-4 px-4 text-center">
                                      <Badge className={`bg-${sportColor}-100 text-${sportColor}-700 border-${sportColor}-200 dark:bg-${sportColor}-950 dark:text-${sportColor}-300 dark:border-${sportColor}-800 font-bold`}>
                                        {team.sport}
                                      </Badge>
                                    </td>
                                    <td className="py-4 px-4 text-center text-green-600 dark:text-green-400 font-bold text-lg">{team.wins || 0}</td>
                                    <td className="py-4 px-4 text-center text-red-600 dark:text-red-400 font-bold text-lg">{team.losses || 0}</td>
                                    <td className="py-4 px-4 text-center font-bold text-gray-900 dark:text-white">
                                      {team.gamesPlayed > 0
                                        ? ((team.wins / team.gamesPlayed) * 100).toFixed(0)
                                        : 0}%
                                    </td>
                                    <td className="py-4 px-4 text-center text-blue-600 dark:text-blue-400 font-semibold">{team.avgPointsFor}</td>
                                    <td className="py-4 px-4 text-center text-orange-600 dark:text-orange-400 font-semibold">{team.avgPointsAgainst}</td>
                                    <td className="py-4 px-4">
                                      <div className="flex gap-1 justify-center">
                                        {team.last5.length > 0 ? team.last5.map((result, i) => (
                                          <div
                                            key={i}
                                            className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black shadow-sm ${
                                              result === 'W' ? 'bg-gradient-to-br from-green-500 to-green-600 text-white' : 'bg-gradient-to-br from-red-500 to-red-600 text-white'
                                            }`}
                                          >
                                            {result}
                                          </div>
                                        )) : <span className="text-gray-400 text-sm">-</span>}
                                      </div>
                                    </td>
                                    <td className="py-4 px-4 text-center">
                                      <Button
                                        size="sm"
                                        onClick={() => setSelectedTeam(team)}
                                        className={`bg-gradient-to-r from-${sportColor}-600 to-${sportColor}-700 hover:from-${sportColor}-700 hover:to-${sportColor}-800 text-white font-bold`}
                                      >
                                        View Details
                                      </Button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </CardContent>
                    </Card>
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

                  {!selectedTeam && teamStats.length > 0 && (
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
                      <CardTitle className="text-2xl font-black text-gray-900 dark:text-white">Top Players Leaderboard</CardTitle>
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
                          <p className="text-gray-500 dark:text-gray-400 font-medium">No player statistics yet</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
