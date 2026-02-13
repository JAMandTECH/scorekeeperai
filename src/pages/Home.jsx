import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Calendar, TrendingUp, Target, Zap, Shield, ArrowRight, Sun, Moon, Building2, Trophy, Users, LogOut, BarChart3, Home as HomeIcon, PlayCircle, MessageCircle, UserPlus, Video } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import AdminHeader from "@/components/AdminHeader";
import AdminSidebar from "@/components/AdminSidebar";
import AIInsights from "@/components/AIInsights";
import AIGameSummary from "@/components/AIGameSummary";
import AIAssistant from "@/components/AIAssistant";
import LiveStreamEmbed from "@/components/LiveStreamEmbed";
import TopAssistLeaders from "@/components/leaders/TopAssistLeaders";

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);

  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  React.useEffect(() => {
    initializePage();
  }, []);

  const initializePage = async () => {
    // Load dark mode preference
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    setDarkMode(savedDarkMode);
    if (savedDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Check authentication and load user
    try {
      const authenticated = await base44.auth.isAuthenticated();
      setIsAuthenticated(authenticated);
      
      if (authenticated) {
        try {
          const currentUser = await base44.auth.me();
          
          // Redirect super admins to SuperAdminHome
          if (currentUser?.role === 'admin' && currentUser?.is_super_admin === true) {
            navigate(createPageUrl("SuperAdminHome"));
            return;
          }
          
          // Check if user has NOT completed onboarding AND has no organization
          // Redirect to RoleSelection for new users
          const hasOrg = currentUser?.organization_id || currentUser?.active_organization_id;
          if (!currentUser?.onboarding_completed && !hasOrg && currentUser?.role !== 'admin') {
            console.log("New user without org, redirecting to RoleSelection");
            navigate(createPageUrl("RoleSelection"));
            return;
          }
          
          setUser(currentUser);
          
          // Load organization - prioritize active_organization_id over organization_id
          const activeOrgId = currentUser?.active_organization_id || currentUser?.organization_id;
          if (activeOrgId) {
            const orgs = await base44.entities.Organization.list();
            const userOrg = orgs.find(o => o.id === activeOrgId);
            setOrganization(userOrg);
          }
        } catch (error) {
          console.log("Error loading user data after authentication:", error);
          setUser(null); 
          setOrganization(null);
        }
      } else {
        // If not authenticated, ensure user and organization are null
        setUser(null);
        setOrganization(null);
      }
    } catch (error) {
      console.log("Error during authentication check:", error);
      setIsAuthenticated(false);
      setUser(null);
      setOrganization(null);
    } finally {
      setLoading(false);
    }
  };

  // Dark mode toggle function
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

  // Logout function
  const handleLogout = () => {
    base44.auth.logout(createPageUrl("Home"));
  };

  // Navigate to Dashboard
  const goToDashboard = () => {
    navigate(createPageUrl("Dashboard"));
  };

  // Navigation items for admin users
  // Note: PlayCircle is used here, ensure it's imported in AdminSidebar as well if it renders icons directly.
  const superAdminNav = [
    { title: "Home", url: createPageUrl("Home"), icon: HomeIcon },
    { title: "Dashboard", url: createPageUrl("Dashboard"), icon: BarChart3 },
    { title: "Organizations", url: createPageUrl("Organizations"), icon: Building2 },
    { title: "All Teams", url: createPageUrl("AllTeams"), icon: Users },
    { title: "All Games", url: createPageUrl("AllGames"), icon: Calendar },
    { title: "Admin Approvals", url: createPageUrl("AdminApprovals"), icon: Shield },
  ];

  const adminNav = [
    { title: "Home", url: createPageUrl("Home"), icon: HomeIcon },
    { title: "Dashboard", url: createPageUrl("Dashboard"), icon: BarChart3 },
    { title: "Divisions", url: createPageUrl("Divisions"), icon: Trophy },
    { title: "Teams", url: createPageUrl("Teams"), icon: Users },
    { title: "Players", url: createPageUrl("Players"), icon: Trophy },
    { title: "Games", url: createPageUrl("Games"), icon: Calendar },
    { title: "Scorekeepers", url: createPageUrl("Scorekeepers"), icon: Shield },
    { title: "Live Scoring", url: createPageUrl("LiveScoring"), icon: PlayCircle }, // PlayCircle from lucide-react
    { title: "Statistics", url: createPageUrl("Statistics"), icon: BarChart3 },
  ];

  const isSuperAdmin = user?.role === 'admin' && user?.is_super_admin === true;
  const isAdmin = user?.role === 'admin';
  
  // Navigation for non-admin users (ordinary users)
  const userNav = [
    { title: "Home", url: createPageUrl("Home"), icon: HomeIcon },
    { title: "Register Team", url: createPageUrl("TeamRegistration"), icon: UserPlus },
    { title: "Join Organization", url: createPageUrl("JoinOrganization"), icon: Building2 },
    { title: "Social Feed", url: createPageUrl("SocialFeed"), icon: MessageCircle },
  ];
  
  // Only pass explicit navigation for super admins and regular admins
  // Users with role_id (but not admin role) should get null so AdminSidebar filters based on permissions
  const navigationItems = isSuperAdmin ? superAdminNav : (isAdmin ? adminNav : (user?.role_id ? null : userNav));

  // Fetch all data - but conditionally based on auth
  const { data: allTeams = [] } = useQuery({
    queryKey: ['all-teams-home'],
    queryFn: () => base44.entities.Team.list(),
    enabled: isAuthenticated === true,
  });

  const { data: allPlayers = [] } = useQuery({
    queryKey: ['all-players-home'],
    queryFn: () => base44.entities.Player.list(),
    enabled: isAuthenticated === true,
  });

  const { data: allGames = [] } = useQuery({
    queryKey: ['all-games-home'],
    queryFn: () => base44.entities.Game.list('-game_date'),
    enabled: isAuthenticated === true,
    refetchInterval: 10000, // Auto-refresh every 10 seconds for live scores
  });

  const { data: allPlayerStats = [] } = useQuery({
    queryKey: ['all-player-stats-home'],
    queryFn: () => base44.entities.PlayerGameStats.list(),
    enabled: isAuthenticated === true,
  });

  // Filter data based on user's ACTIVE organization (prioritize active_organization_id)
  const orgId = user?.active_organization_id || user?.organization_id;
  const teams = orgId ? allTeams.filter(t => t.organization_id === orgId) : allTeams;
  const games = orgId ? allGames.filter(g => g.organization_id === orgId) : allGames;

  const teamIds = teams.map(t => t.id);
  const players = allPlayers.filter(p => teamIds.includes(p.team_id));
  const playerStats = allPlayerStats.filter(s => {
    const player = players.find(p => p.id === s.player_id);
    return player && teamIds.includes(player.team_id);
  });

  // Calculate top players for a given stat type and sport
  const getTopPlayers = (statType, sport = 'basketball', limit = 10) => {
    const sportTeamIds = teams.filter(t => t.sport === sport).map(t => t.id);
    const sportPlayers = players.filter(p => sportTeamIds.includes(p.team_id));

    const playerTotals = sportPlayers.map(player => {
      const playerStatsList = playerStats.filter(s => s.player_id === player.id);
      
      let total = 0;
      let averageLabel = "";

      if (statType === 'points') {
        if (sport === 'basketball') {
          total = playerStatsList.reduce((sum, s) => sum + (s.points || 0), 0);
          averageLabel = "PPG";
        } else { // volleyball - total 'points' in this context means sum of attacks, blocks, aces
          total = playerStatsList.reduce((sum, s) => 
            sum + (s.field_goals_made || 0) + (s.blocks || 0) + (s.three_pointers || 0), 0);
          averageLabel = "Score/G";
        }
      } else if (statType === 'rebounds') {
        total = playerStatsList.reduce((sum, s) => sum + (s.rebounds || 0), 0);
        averageLabel = "RPG";
      } else if (statType === 'assists') {
        total = playerStatsList.reduce((sum, s) => sum + (s.assists || 0), 0);
        averageLabel = "APG";
      } else if (statType === 'blocks') {
        total = playerStatsList.reduce((sum, s) => sum + (s.blocks || 0), 0);
        averageLabel = "BPG";
      } else if (statType === 'three_pointers') {
        total = playerStatsList.reduce((sum, s) => sum + (s.three_pointers || 0), 0);
        averageLabel = sport === 'basketball' ? "3PG" : "ACE/G";
      } else if (statType === 'attacks') {
        total = playerStatsList.reduce((sum, s) => sum + (s.field_goals_made || 0), 0);
        averageLabel = "APG";
      }

      const team = allTeams.find(t => t.id === player.team_id);
      const gamesPlayed = [...new Set(playerStatsList.map(s => s.game_id))].length;

      return {
        ...player,
        total,
        gamesPlayed,
        average: gamesPlayed > 0 ? (total / gamesPlayed).toFixed(1) : 0,
        averageLabel,
        teamName: team?.name || 'Unknown',
        teamLogoUrl: team?.logo_url || '',
        division: team?.division || 'No Division',
      };
    });

    return playerTotals
      .filter(p => p.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, limit);
  };

  // Calculate team standings by division and sport
  const getTeamStandings = (sport) => {
    const sportTeams = teams.filter(t => t.sport === sport);
    const divisions = [...new Set(sportTeams.map(t => t.division || 'No Division'))];
    
    return divisions.map(division => {
      const divisionTeams = sportTeams
        .filter(t => (t.division || 'No Division') === division)
        .map(team => {
          const teamGames = games.filter(g => 
            g.status === 'completed' && 
            g.game_type !== 'pre_season' &&
            (g.game_type === 'regular_season' || !g.game_type) &&
            (g.home_team_id === team.id || g.away_team_id === team.id)
          );
          
          let wins = 0, losses = 0, pointsFor = 0, pointsAgainst = 0;
          
          teamGames.forEach(game => {
            const isHome = game.home_team_id === team.id;
            let teamScore, oppScore;

            if (sport === 'volleyball') {
              // For volleyball: calculate total points across all sets
              const homeTotalPoints = (game.quarter_scores || []).reduce((sum, s) => sum + (s.home || 0), 0);
              const awayTotalPoints = (game.quarter_scores || []).reduce((sum, s) => sum + (s.away || 0), 0);
              const homeSetsWon = (game.quarter_scores || []).filter(s => s.home > s.away).length;
              const awaySetsWon = (game.quarter_scores || []).filter(s => s.away > s.home).length;
              
              teamScore = isHome ? homeTotalPoints : awayTotalPoints;
              oppScore = isHome ? awayTotalPoints : homeTotalPoints;
              
              // Win/loss based on sets won
              if (homeSetsWon > awaySetsWon) {
                if (isHome) wins++;
                else losses++;
              } else if (awaySetsWon > homeSetsWon) {
                if (isHome) losses++;
                else wins++;
              }
            } else { // Basketball
              teamScore = isHome ? game.home_score : game.away_score;
              oppScore = isHome ? game.away_score : game.home_score;
              
              if (teamScore > oppScore) wins++;
              else losses++;
            }
            
            pointsFor += teamScore;
            pointsAgainst += oppScore;
          });

          const gamesPlayed = wins + losses;
          const winPct = gamesPlayed > 0 ? (wins / gamesPlayed) : 0;
          const avgPointsFor = gamesPlayed > 0 ? (pointsFor / gamesPlayed).toFixed(1) : 0;
          const avgPointsAgainst = gamesPlayed > 0 ? (pointsAgainst / gamesPlayed).toFixed(1) : 0;
          const diff = pointsFor - pointsAgainst;

          return {
            ...team,
            wins,
            losses,
            gamesPlayed,
            winPct,
            pointsFor,
            pointsAgainst,
            avgPointsFor,
            avgPointsAgainst,
            diff,
          };
        })
        .sort((a, b) => {
          // First sort by win percentage
          if (b.winPct !== a.winPct) {
            return b.winPct - a.winPct;
          }
          // If tied in win percentage, sort by point differential
          return b.diff - a.diff;
        });

      return { division, teams: divisionTeams };
    });
  };

  const basketballStandings = getTeamStandings('basketball');
  const volleyballStandings = getTeamStandings('volleyball');

  const topScorers = getTopPlayers('points', 'basketball', 10);
  const topRebounders = getTopPlayers('rebounds', 'basketball', 10);
  const topAssisters = getTopPlayers('assists', 'basketball', 10);
  const topBlockers = getTopPlayers('blocks', 'basketball', 10);
  const top3Pointers = getTopPlayers('three_pointers', 'basketball', 10);

  const topVolleyballScorers = getTopPlayers('points', 'volleyball', 10);
  const topVolleyballAttackers = getTopPlayers('attacks', 'volleyball', 10);
  const topVolleyballBlockers = getTopPlayers('blocks', 'volleyball', 10);
  const topVolleyballAces = getTopPlayers('three_pointers', 'volleyball', 10);

  const upcomingBasketballGames = games
    .filter(g => g.sport === 'basketball' && g.status === 'scheduled')
    .sort((a, b) => new Date(a.game_date).getTime() - new Date(b.game_date).getTime())
    .slice(0, 10);

  const completedBasketballGames = games
    .filter(g => g.sport === 'basketball' && g.status === 'completed')
    .sort((a, b) => new Date(b.game_date).getTime() - new Date(a.game_date).getTime())
    .slice(0, 10);

  const upcomingVolleyballGames = games
    .filter(g => g.sport === 'volleyball' && g.status === 'scheduled')
    .sort((a, b) => new Date(a.game_date).getTime() - new Date(b.game_date).getTime())
    .slice(0, 10);

  const completedVolleyballGames = games
    .filter(g => g.sport === 'volleyball' && g.status === 'completed')
    .sort((a, b) => new Date(b.game_date).getTime() - new Date(a.game_date).getTime())
    .slice(0, 10);

  const getTeamName = (teamId) => {
    const team = allTeams.find(t => t.id === teamId);
    return team?.name || 'Unknown';
  };

  // Show loading while initializing
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 mesh-gradient">
      {user && (
        <AdminHeader 
          user={user}
          organization={organization}
          darkMode={darkMode}
          toggleDarkMode={toggleDarkMode}
          handleLogout={handleLogout}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
        />
      )}

      <div className="flex">
        {user && (
          <AdminSidebar 
            user={user}
            organization={organization}
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
            handleLogout={handleLogout}
            navigationItems={navigationItems}
          />
        )}

        <main className={user ? "flex-1 min-w-0" : "w-full"}>
          {/* Hero Section */}
          <section className="relative bg-gradient-to-br from-gray-900 via-blue-900 to-indigo-900 dark:from-black dark:via-gray-900 dark:to-indigo-950 text-white py-24 px-4 overflow-hidden gradient-animate">
          <div className="absolute inset-0 grid-pattern opacity-30"></div>
          <div className="absolute inset-0 particles"></div>
          <div className="absolute top-20 left-10 w-72 h-72 bg-gradient-to-r from-cyan-500/30 to-blue-500/30 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
        
        {/* Top Right Controls - ONLY IF NOT AUTHENTICATED (authenticated users have header) */}
        {!user && (
          <div className="absolute top-6 right-6 flex items-center gap-3 z-50">
            <button
              onClick={toggleDarkMode}
              className="p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-xl transition-all"
            >
              {darkMode ? <Sun className="w-6 h-6 text-white" /> : <Moon className="w-6 h-6 text-white" />}
            </button>
            
            {/* Show Logout if authenticated (non-admin) */}
            {isAuthenticated && (
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-3 bg-red-600/90 hover:bg-red-700 backdrop-blur-md rounded-xl transition-all font-bold text-white shadow-lg"
              >
                <LogOut className="w-5 h-5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            )}
          </div>
        )}

        <div className="max-w-7xl mx-auto text-center relative z-10">
          {/* Organization-specific Hero - ONLY FOR AUTHENTICATED USERS WITH AN ORGANIZATION */}
          {organization && user ? (
            <div className="space-y-8">
              {/* Organization Logo - Large & Prominent */}
              <div className="flex justify-center">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-red-600 rounded-3xl blur-3xl opacity-30 animate-pulse"></div>
                  <Avatar className="relative w-40 h-40 border-8 border-white/20 shadow-2xl backdrop-blur-sm">
                    <AvatarImage src={organization.logo_url} className="object-cover" />
                    <AvatarFallback className="bg-gradient-to-br from-orange-500 to-red-600 text-white font-black text-6xl">
                      {organization.name?.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </div>

              {/* Organization Name */}
              <div>
                <Badge className="mb-4 bg-orange-500/20 text-orange-300 border border-orange-400/30 text-sm font-bold px-6 py-2 backdrop-blur-sm">
                  YOUR ORGANIZATION
                </Badge>
                <h1 className="text-6xl md:text-7xl font-black mb-4 tracking-tight">
                  {organization.name}
                </h1>
                {organization.tournament_name && (
                  <p className="text-xl md:text-2xl text-blue-100 mb-3 max-w-3xl mx-auto font-medium">
                    {organization.tournament_name}
                  </p>
                )}
                <p className="text-lg md:text-xl text-blue-200 mb-6 max-w-3xl mx-auto font-medium">
                  Sports League Management Dashboard
                </p>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto">
                <div className="glass-card rounded-2xl p-5 card-hover cursor-pointer group">
                  <div className="text-4xl font-black text-gradient-primary group-hover:scale-110 transition-transform inline-block">{teams.length}</div>
                  <div className="text-sm text-cyan-200 font-semibold mt-1">Teams</div>
                </div>
                <div className="glass-card rounded-2xl p-5 card-hover cursor-pointer group">
                  <div className="text-4xl font-black text-gradient-warm group-hover:scale-110 transition-transform inline-block">{players.length}</div>
                  <div className="text-sm text-cyan-200 font-semibold mt-1">Players</div>
                </div>
                <div className="glass-card rounded-2xl p-5 card-hover cursor-pointer group">
                  <div className="text-4xl font-black bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent group-hover:scale-110 transition-transform inline-block">{games.length}</div>
                  <div className="text-sm text-cyan-200 font-semibold mt-1">Games</div>
                </div>
                <div className="glass-card rounded-2xl p-5 card-hover cursor-pointer group">
                  <div className="text-4xl font-black bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent group-hover:scale-110 transition-transform inline-block">{games.filter(g => g.status === 'completed').length}</div>
                  <div className="text-sm text-cyan-200 font-semibold mt-1">Completed</div>
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="flex gap-6 justify-center flex-wrap">
                {isAdmin && (
                  <Link to={createPageUrl("Dashboard")}>
                    <Button className="btn-futuristic bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 hover:from-orange-600 hover:via-red-600 hover:to-pink-600 text-white text-lg px-12 py-7 font-bold shadow-2xl transform hover:scale-105 transition-all duration-300 rounded-2xl neon-glow-orange">
                      Go to Dashboard
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                  </Link>
                )}
                {!isAdmin && isAuthenticated && (
                  <Link to={createPageUrl("TeamRegistration")}>
                    <Button className="btn-futuristic bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 hover:from-orange-600 hover:via-red-600 hover:to-pink-600 text-white text-lg px-12 py-7 font-bold shadow-2xl transform hover:scale-105 transition-all duration-300 rounded-2xl neon-glow-orange">
                      <UserPlus className="w-5 h-5 mr-2" />
                      Register Your Team
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          ) : (
            /* PUBLIC Hero for NON-authenticated users */
            <>
              <div className="flex items-center justify-center gap-4 mb-8">
                <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center shadow-2xl transform rotate-6 hover:rotate-0 transition-transform duration-300">
                  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
                  </svg>
                </div>
              </div>
              
              <h1 className="text-6xl md:text-7xl font-black mb-6 tracking-tight">
                <span className="text-gradient-primary neon-text-blue">Scorekeeper</span><span className="text-gradient-warm">AI</span>
              </h1>
              <p className="text-xl md:text-2xl text-blue-100 mb-3 max-w-3xl mx-auto font-medium">
                Professional Basketball & Volleyball League Management
              </p>
              <p className="text-blue-200 mb-10 max-w-2xl mx-auto">
                Real-time scoring • Live statistics • Tournament management
              </p>
              
              {/* Only show buttons if NOT authenticated */}
              {!isAuthenticated && (
                <div className="flex gap-6 justify-center flex-wrap">
                  <Button 
                    onClick={() => base44.auth.redirectToLogin(createPageUrl("Dashboard"))}
                    className="btn-futuristic bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 hover:from-orange-600 hover:via-red-600 hover:to-pink-600 text-white text-lg px-12 py-7 font-bold shadow-2xl transform hover:scale-105 transition-all duration-300 rounded-2xl neon-glow-orange"
                  >
                    Get Started
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                  <Link to={createPageUrl("RequestAdminAccess")}>
                    <Button 
                      variant="outline"
                      className="glass border-2 border-cyan-400/50 text-cyan-100 hover:bg-cyan-500/20 hover:border-cyan-400 text-lg px-12 py-7 font-bold rounded-2xl transition-all duration-300 hover:scale-105 neon-glow-blue"
                    >
                      Request Admin Access
                    </Button>
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
        
        {/* Decorative Elements */}
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-gray-50 dark:from-gray-900 to-transparent"></div>
          </section>

          {user && (
            <div className="max-w-7xl mx-auto px-4 py-16">
          {/* Organization Info Banner - Below Hero */}
          {organization && (
            <div className="mb-12">
              <Card className="relative overflow-hidden border-2 border-blue-200 dark:border-blue-800 shadow-2xl">
                <div className="absolute inset-0 bg-gradient-to-br from-white via-blue-50/50 to-purple-50/50 dark:from-gray-800 dark:via-blue-950/30 dark:to-purple-950/30"></div>
                <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-3xl"></div>
              
                <CardContent className="relative z-10 p-8">
                  <div className="flex flex-col lg:flex-row items-center gap-8">
                    {/* Left: Organization Branding */}
                    <div className="flex-shrink-0">
                      <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl blur-xl opacity-30"></div>
                        <Avatar className="relative w-32 h-32 border-4 border-white dark:border-gray-700 shadow-2xl">
                          <AvatarImage src={organization.logo_url} className="object-cover" />
                          <AvatarFallback className="bg-gradient-to-br from-orange-500 to-red-600 text-white font-black text-5xl">
                            {organization.name?.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                    </div>

                    {/* Center: Organization Details */}
                    <div className="flex-1 text-center lg:text-left">
                      <Badge className="mb-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-0 font-bold px-4 py-1">
                        VIEWING YOUR ORGANIZATION
                      </Badge>
                      <h2 className="text-4xl font-black text-gray-900 dark:text-white mb-2">
                        {organization.name}
                      </h2>
                      <p className="text-gray-600 dark:text-gray-400 font-medium mb-4">
                        Complete sports league management and statistics
                      </p>
                      
                      {/* Mini Stats Row */}
                      <div className="flex flex-wrap gap-4 justify-center lg:justify-start">
                        <div className="flex items-center gap-2 bg-white/60 dark:bg-gray-900/60 rounded-lg px-4 py-2 border border-gray-200 dark:border-gray-700">
                          <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                            <Trophy className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <div className="text-xl font-black text-gray-900 dark:text-white">{teams.filter(t => t.sport === 'basketball').length}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 font-semibold">Basketball</div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 bg-white/60 dark:bg-gray-900/60 rounded-lg px-4 py-2 border border-gray-200 dark:border-gray-700">
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                            <Trophy className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <div className="text-xl font-black text-gray-900 dark:text-white">{teams.filter(t => t.sport === 'volleyball').length}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 font-semibold">Volleyball</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 bg-white/60 dark:bg-gray-900/60 rounded-lg px-4 py-2 border border-gray-200 dark:border-gray-700">
                          <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                            <Users className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <div className="text-xl font-black text-gray-900 dark:text-white">{players.length}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 font-semibold">Players</div>
                          </div>
                        </div>
                      </div>
                    </div>


                  </div>
                </CardContent>
              </Card>
            </div>
          )}



          {/* AI Insights Section - ONLY FOR ADMINS */}
          {isAdmin && (teams.length > 0 || games.length > 0) && (
            <div className="mb-12">
              <AIInsights
                teams={teams}
                players={players}
                games={games}
                organizationName={organization?.name || "ScorekeeperAI"}
              />
            </div>
          )}

          {/* LIVE GAMES IN PROGRESS */}
          {games.filter(g => g.status === 'in_progress').length > 0 && (
            <section className="mb-12">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg">
                  <PlayCircle className="w-5 h-5 text-white animate-pulse" />
                </div>
                <h2 className="text-3xl font-black text-gray-900 dark:text-white">Games In Progress</h2>
                <Badge className="bg-red-500 text-white font-bold animate-pulse">LIVE</Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {games.filter(g => g.status === 'in_progress').map(game => {
                  const homeTeamData = allTeams.find(t => t.id === game.home_team_id);
                  const awayTeamData = allTeams.find(t => t.id === game.away_team_id);
                  if (!homeTeamData || !awayTeamData) return null;

                  const quarterLabel = game.sport === 'basketball' 
                    ? (game.current_quarter <= 4 ? `Q${game.current_quarter}` : `OT${game.current_quarter - 4}`)
                    : `Set ${game.current_quarter}`;
                  const sportColor = game.sport === 'basketball' ? 'orange' : 'blue';

                  return (
                    <Card key={game.id} className={`glass-card border-2 border-${sportColor}-400/50 shadow-lg hover:shadow-xl transition-shadow overflow-hidden`}>
                      <CardHeader className={`bg-gradient-to-r from-${sportColor}-600 to-${sportColor}-700 py-3 px-4`}>
                        <CardTitle className="text-white text-lg font-bold flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                            LIVE
                          </div>
                          <Badge className="bg-white/20 text-white font-bold border-0">{game.sport.toUpperCase()}</Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex-1 text-center">
                            <Avatar className="w-14 h-14 mx-auto mb-2 border-4 border-white dark:border-gray-700 shadow-lg">
                              <AvatarImage src={homeTeamData.logo_url} />
                              <AvatarFallback className={`bg-gradient-to-br from-${sportColor}-500 to-${sportColor}-600 text-white text-sm font-bold`}>{homeTeamData.name?.substring(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <p className="font-semibold text-gray-800 dark:text-gray-200 text-sm truncate">{homeTeamData.name}</p>
                          </div>
                          <div className="flex flex-col items-center mx-4">
                            <span className="text-4xl font-black text-gray-900 dark:text-white">{game.home_score} - {game.away_score}</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400 font-bold mt-1">{quarterLabel}</span>
                          </div>
                          <div className="flex-1 text-center">
                            <Avatar className="w-14 h-14 mx-auto mb-2 border-4 border-white dark:border-gray-700 shadow-lg">
                              <AvatarImage src={awayTeamData.logo_url} />
                              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white text-sm font-bold">{awayTeamData.name?.substring(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <p className="font-semibold text-gray-800 dark:text-gray-200 text-sm truncate">{awayTeamData.name}</p>
                          </div>
                        </div>
                        
                        {/* Live Stream Embed */}
                        {game.stream_url && (
                          <div className="mb-4">
                            <LiveStreamEmbed 
                              streamUrl={game.stream_url} 
                              gameTitle={`${homeTeamData.name} vs ${awayTeamData.name}`}
                            />
                          </div>
                        )}
                        
                        <div className="flex gap-2">
                          <Link to={createPageUrl("PublicGameView") + `?game_id=${game.id}`} className="flex-1">
                            <Button className={`w-full bg-gradient-to-r from-${sportColor}-600 to-${sportColor}-700 hover:from-${sportColor}-700 hover:to-${sportColor}-800 text-white font-bold shadow-md`}>
                              <PlayCircle className="w-4 h-4 mr-2" />
                              View Live
                            </Button>
                          </Link>
                          {game.stream_url && (
                            <Button 
                              variant="outline" 
                              className="border-2 border-red-400 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                              onClick={() => window.open(game.stream_url, '_blank')}
                            >
                              <Video className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </section>
          )}

          {/* BASKETBALL SECTION */}
          <section className="mb-20">
            <div className="flex items-center gap-4 mb-10">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/>
                  <path d="M2 12h20"/>
                </svg>
              </div>
              <div>
                <h2 className="text-4xl font-black text-gray-900 dark:text-white">Basketball</h2>
                <p className="text-gray-500 dark:text-gray-400 font-medium">League Standings & Player Stats</p>
              </div>
            </div>

            <div className="mb-8"><TopAssistLeaders organizationId={orgId} sport="basketball" title="Top 10 Assist Leaders" /></div>

            <Tabs defaultValue="standings" className="space-y-8">
              <TabsList className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 p-1 rounded-xl shadow-sm">
                <TabsTrigger value="standings" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-orange-600 data-[state=active]:text-white dark:text-gray-300 font-semibold rounded-lg px-6">
                  Standings
                </TabsTrigger>
                <TabsTrigger value="leaders" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-orange-600 data-[state=active]:text-white dark:text-gray-300 font-semibold rounded-lg px-6">
                  Player Leaders
                </TabsTrigger>
                <TabsTrigger value="schedule" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-orange-600 data-[state=active]:text-white dark:text-gray-300 font-semibold rounded-lg px-6">
                  Schedule & Results
                </TabsTrigger>
              </TabsList>

              <TabsContent value="standings">
                {basketballStandings.map((divisionData, idx) => (
                  <Card key={idx} className="mb-6 bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 shadow-lg hover:shadow-xl transition-shadow">
                    <CardHeader className="border-b-2 border-gray-100 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-900">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-2xl font-black text-gray-900 dark:text-white">{divisionData.division}</CardTitle>
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-bold text-gray-700 dark:text-gray-300">{organization?.name}</span>
                          {organization?.logo_url && (
                            <Avatar className="w-12 h-12 border-2 border-white dark:border-gray-700 shadow-md">
                              <AvatarImage src={organization.logo_url} />
                              <AvatarFallback className="bg-gradient-to-br from-orange-500 to-red-600 text-white font-black">
                                {organization.name?.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="bg-gray-50 dark:bg-gray-900 border-b-2 border-gray-100 dark:border-gray-700">
                              <th className="text-left py-4 px-4 text-gray-600 dark:text-gray-400 font-bold text-sm">#</th>
                              <th className="text-left py-4 px-4 text-gray-600 dark:text-gray-400 font-bold text-sm">TEAM</th>
                              <th className="text-center py-4 px-4 text-gray-600 dark:text-gray-400 font-bold text-sm">W</th>
                              <th className="text-center py-4 px-4 text-gray-600 dark:text-gray-400 font-bold text-sm">L</th>
                              <th className="text-center py-4 px-4 text-gray-600 dark:text-gray-400 font-bold text-sm">PCT</th>
                              <th className="text-center py-4 px-4 text-gray-600 dark:text-gray-400 font-bold text-sm">PF</th>
                              <th className="text-center py-4 px-4 text-gray-600 dark:text-gray-400 font-bold text-sm">PA</th>
                              <th className="text-center py-4 px-4 text-gray-600 dark:text-gray-400 font-bold text-sm">DIFF</th>
                            </tr>
                          </thead>
                          <tbody>
                            {divisionData.teams.map((team, i) => (
                              <tr key={team.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition-colors">
                                <td className="py-4 px-4 font-black text-xl text-gray-400 dark:text-gray-500">{i + 1}</td>
                                <td className="py-4 px-4">
                                  <div className="flex items-center gap-3">
                                    <Avatar className="w-10 h-10 border-2 border-white dark:border-gray-700 shadow-md">
                                      <AvatarImage src={team.logo_url} />
                                      <AvatarFallback className="bg-gradient-to-br from-orange-500 to-orange-600 text-white text-xs font-bold">
                                        {team.name?.substring(0, 2).toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="font-bold text-gray-900 dark:text-white">{team.name}</span>
                                  </div>
                                </td>
                                <td className="py-4 px-4 text-center text-green-600 dark:text-green-400 font-bold text-lg">{team.wins}</td>
                                <td className="py-4 px-4 text-center text-red-600 dark:text-red-400 font-bold text-lg">{team.losses}</td>
                                <td className="py-4 px-4 text-center font-bold text-gray-900 dark:text-white">{(team.winPct * 100).toFixed(0)}%</td>
                                <td className="py-4 px-4 text-center text-blue-600 dark:text-blue-400 font-semibold">{team.avgPointsFor}</td>
                                <td className="py-4 px-4 text-center text-orange-600 dark:text-orange-400 font-semibold">{team.avgPointsAgainst}</td>
                                <td className={`py-4 px-4 text-center font-bold text-lg ${team.diff > 0 ? 'text-green-600 dark:text-green-400' : team.diff < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>
                                  {team.diff > 0 ? '+' : ''}{team.diff}
                                </td>
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
                  <Card className="bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 shadow-lg hover:shadow-xl transition-shadow">
                    <CardHeader className="border-b-2 border-gray-100 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-white dark:from-gray-800 dark:to-gray-900">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                            <Target className="w-6 h-6 text-white" />
                          </div>
                          <CardTitle className="text-xl font-black text-gray-900 dark:text-white">Top 10 Scorers</CardTitle>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{organization?.name}</span>
                          {organization?.logo_url && (
                            <Avatar className="w-10 h-10 border-2 border-white dark:border-gray-700 shadow-md">
                              <AvatarImage src={organization.logo_url} />
                              <AvatarFallback className="bg-gradient-to-br from-orange-500 to-red-600 text-white font-black text-xs">
                                {organization.name?.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        {topScorers.map((player, i) => (
                          <div key={player.id} className="flex items-center gap-3 bg-gradient-to-r from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 rounded-xl p-3 border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black shadow-md ${
                              i === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-500 text-gray-900' :
                              i === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-white' :
                              i === 2 ? 'bg-gradient-to-br from-orange-600 to-orange-700 text-white' :
                              'bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 text-gray-700 dark:text-gray-300'
                            }`}>
                              {i + 1}
                            </div>
                            <Avatar className="w-12 h-12 border-2 border-white dark:border-gray-700 shadow-md">
                              <AvatarImage src={player.photo_url} />
                              <AvatarFallback className="bg-gradient-to-br from-blue-600 to-blue-700 text-white text-xs font-bold">
                                {player.jersey_number}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-gray-900 dark:text-white truncate">#{player.jersey_number} {player.first_name} {player.last_name}</p>
                              <div className="flex items-center gap-2">
                                <Avatar className="w-5 h-5 border border-gray-200 dark:border-gray-700">
                                  <AvatarImage src={player.teamLogoUrl} />
                                  <AvatarFallback className="bg-gray-200 text-[10px] font-bold">{player.teamName?.substring(0,2)?.toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{player.teamName}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-black text-blue-600 dark:text-blue-400">{player.total}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold">{player.average} {player.averageLabel}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Top Rebounders */}
                  <Card className="bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 shadow-lg hover:shadow-xl transition-shadow">
                    <CardHeader className="border-b-2 border-gray-100 dark:border-gray-700 bg-gradient-to-r from-green-50 to-white dark:from-gray-800 dark:to-gray-900">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                            <TrendingUp className="w-6 h-6 text-white" />
                          </div>
                          <CardTitle className="text-xl font-black text-gray-900 dark:text-white">Top 10 Rebounders</CardTitle>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{organization?.name}</span>
                          {organization?.logo_url && (
                            <Avatar className="w-10 h-10 border-2 border-white dark:border-gray-700 shadow-md">
                              <AvatarImage src={organization.logo_url} />
                              <AvatarFallback className="bg-gradient-to-br from-orange-500 to-red-600 text-white font-black text-xs">
                                {organization.name?.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        {topRebounders.map((player, i) => (
                          <div key={player.id} className="flex items-center gap-3 bg-gradient-to-r from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 rounded-xl p-3 border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black shadow-md ${
                              i === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-500 text-gray-900' :
                              i === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-white' :
                              i === 2 ? 'bg-gradient-to-br from-orange-600 to-orange-700 text-white' :
                              'bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 text-gray-700 dark:text-gray-300'
                            }`}>
                              {i + 1}
                            </div>
                            <Avatar className="w-12 h-12 border-2 border-white dark:border-gray-700 shadow-md">
                              <AvatarImage src={player.photo_url} />
                              <AvatarFallback className="bg-gradient-to-br from-green-600 to-green-700 text-white text-xs font-bold">
                                {player.jersey_number}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-gray-900 dark:text-white truncate">#{player.jersey_number} {player.first_name} {player.last_name}</p>
                              <div className="flex items-center gap-2">
                                <Avatar className="w-5 h-5 border border-gray-200 dark:border-gray-700">
                                  <AvatarImage src={player.teamLogoUrl} />
                                  <AvatarFallback className="bg-gray-200 text-[10px] font-bold">{player.teamName?.substring(0,2)?.toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{player.teamName}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-black text-green-600 dark:text-green-400">{player.total}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold">{player.average} {player.averageLabel}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Top Blockers */}
                  <Card className="bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 shadow-lg hover:shadow-xl transition-shadow">
                    <CardHeader className="border-b-2 border-gray-100 dark:border-gray-700 bg-gradient-to-r from-red-50 to-white dark:from-gray-800 dark:to-gray-900">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center">
                            <Shield className="w-6 h-6 text-white" />
                          </div>
                          <CardTitle className="text-xl font-black text-gray-900 dark:text-white">Top 10 Blockers</CardTitle>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{organization?.name}</span>
                          {organization?.logo_url && (
                            <Avatar className="w-10 h-10 border-2 border-white dark:border-gray-700 shadow-md">
                              <AvatarImage src={organization.logo_url} />
                              <AvatarFallback className="bg-gradient-to-br from-orange-500 to-red-600 text-white font-black text-xs">
                                {organization.name?.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        {topBlockers.map((player, i) => (
                          <div key={player.id} className="flex items-center gap-3 bg-gradient-to-r from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 rounded-xl p-3 border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black shadow-md ${
                              i === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-500 text-gray-900' :
                              i === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-white' :
                              i === 2 ? 'bg-gradient-to-br from-orange-600 to-orange-700 text-white' :
                              'bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 text-gray-700 dark:text-gray-300'
                            }`}>
                              {i + 1}
                            </div>
                            <Avatar className="w-12 h-12 border-2 border-white dark:border-gray-700 shadow-md">
                              <AvatarImage src={player.photo_url} />
                              <AvatarFallback className="bg-gradient-to-br from-red-600 to-red-700 text-white text-xs font-bold">
                                {player.jersey_number}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-gray-900 dark:text-white truncate">#{player.jersey_number} {player.first_name} {player.last_name}</p>
                              <div className="flex items-center gap-2">
                                <Avatar className="w-5 h-5 border border-gray-200 dark:border-gray-700">
                                  <AvatarImage src={player.teamLogoUrl} />
                                  <AvatarFallback className="bg-gray-200 text-[10px] font-bold">{player.teamName?.substring(0,2)?.toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{player.teamName}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-black text-red-600 dark:text-red-400">{player.total}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold">{player.average} {player.averageLabel}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Top 3-Pointer Leaders */}
                  <Card className="bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 shadow-lg hover:shadow-xl transition-shadow">
                    <CardHeader className="border-b-2 border-gray-100 dark:border-gray-700 bg-gradient-to-r from-yellow-50 to-white dark:from-gray-800 dark:to-gray-900">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-lg flex items-center justify-center">
                            <Zap className="w-6 h-6 text-white" />
                          </div>
                          <CardTitle className="text-xl font-black text-gray-900 dark:text-white">Top 10 3-Pointer Leaders</CardTitle>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{organization?.name}</span>
                          {organization?.logo_url && (
                            <Avatar className="w-10 h-10 border-2 border-white dark:border-gray-700 shadow-md">
                              <AvatarImage src={organization.logo_url} />
                              <AvatarFallback className="bg-gradient-to-br from-orange-500 to-red-600 text-white font-black text-xs">
                                {organization.name?.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        {top3Pointers.map((player, i) => (
                          <div key={player.id} className="flex items-center gap-3 bg-gradient-to-r from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 rounded-xl p-3 border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black shadow-md ${
                              i === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-500 text-gray-900' :
                              i === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-white' :
                              i === 2 ? 'bg-gradient-to-br from-orange-600 to-orange-700 text-white' :
                              'bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 text-gray-700 dark:text-gray-300'
                            }`}>
                              {i + 1}
                            </div>
                            <Avatar className="w-12 h-12 border-2 border-white dark:border-gray-700 shadow-md">
                              <AvatarImage src={player.photo_url} />
                              <AvatarFallback className="bg-gradient-to-br from-yellow-600 to-yellow-700 text-white text-xs font-bold">
                                {player.jersey_number}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-gray-900 dark:text-white truncate">#{player.jersey_number} {player.first_name} {player.last_name}</p>
                              <div className="flex items-center gap-2">
                                <Avatar className="w-5 h-5 border border-gray-200 dark:border-gray-700">
                                  <AvatarImage src={player.teamLogoUrl} />
                                  <AvatarFallback className="bg-gray-200 text-[10px] font-bold">{player.teamName?.substring(0,2)?.toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{player.teamName}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-black text-yellow-600 dark:text-yellow-400">{player.total}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold">{player.average} {player.averageLabel}</p>
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
                  <Card className="bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 shadow-lg">
                    <CardHeader className="border-b-2 border-gray-100 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-white dark:from-gray-800 dark:to-gray-900">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-xl font-black text-gray-900 dark:text-white">Upcoming Games</CardTitle>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{organization?.name}</span>
                          {organization?.logo_url && (
                            <Avatar className="w-10 h-10 border-2 border-white dark:border-gray-700 shadow-md">
                              <AvatarImage src={organization.logo_url} />
                              <AvatarFallback className="bg-gradient-to-br from-orange-500 to-red-600 text-white font-black text-xs">
                                {organization.name?.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        {upcomingBasketballGames.map(game => (
                          <div key={game.id} className="border-2 border-gray-100 dark:border-gray-700 rounded-xl p-4 hover:shadow-md transition-all bg-gradient-to-r from-white to-gray-50 dark:from-gray-900 dark:to-gray-800">
                            <div className="flex justify-between items-center mb-3">
                              <span className="text-xs text-gray-500 dark:text-gray-400 font-semibold flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(game.game_date).toLocaleDateString()}
                              </span>
                              <Badge className="bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-bold">
                                {game.game_type?.replace('_', ' ').toUpperCase() || 'REGULAR'}
                              </Badge>
                            </div>
                            <div className="text-sm font-bold text-gray-900 dark:text-white">
                              {getTeamName(game.home_team_id)} vs {getTeamName(game.away_team_id)}
                            </div>
                            {game.location && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 font-medium">📍 {game.location}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Recent Results */}
                  <Card className="bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 shadow-lg">
                    <CardHeader className="border-b-2 border-gray-100 dark:border-gray-700 bg-gradient-to-r from-green-50 to-white dark:from-gray-800 dark:to-gray-900">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-xl font-black text-gray-900 dark:text-white">Recent Results</CardTitle>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{organization?.name}</span>
                          {organization?.logo_url && (
                            <Avatar className="w-10 h-10 border-2 border-white dark:border-gray-700 shadow-md">
                              <AvatarImage src={organization.logo_url} />
                              <AvatarFallback className="bg-gradient-to-br from-orange-500 to-red-600 text-white font-black text-xs">
                                {organization.name?.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        {completedBasketballGames.map(game => {
                          // Determine winning team
                          const winningTeamId = game.home_score > game.away_score ? game.home_team_id : game.away_team_id;
                          
                          // Find best player from WINNING team only
                          const gameStats = allPlayerStats.filter(s => s.game_id === game.id && s.team_id === winningTeamId);
                          const bestPlayerStat = gameStats.reduce((best, current) => {
                            const currentPoints = current.points || 0;
                            const bestPoints = best?.points || 0;
                            return currentPoints > bestPoints ? current : best;
                          }, null);
                          
                          const bestPlayer = bestPlayerStat ? allPlayers.find(p => p.id === bestPlayerStat.player_id) : null;
                          
                          const homeTeamData = allTeams.find(t => t.id === game.home_team_id);
                          const awayTeamData = allTeams.find(t => t.id === game.away_team_id);

                          // Prepare top players for AI summary
                          const topPlayersForAI = [];
                          if (bestPlayer && bestPlayerStat) {
                            topPlayersForAI.push({
                              name: `${bestPlayer.first_name} ${bestPlayer.last_name}`,
                              team: getTeamName(winningTeamId),
                              stats: `${bestPlayerStat.points} PTS • ${bestPlayerStat.rebounds || 0} REB • ${bestPlayerStat.assists || 0} AST`
                            });
                          }

                          return (
                            <div key={game.id} className="border-2 border-gray-100 dark:border-gray-700 rounded-xl p-4 hover:shadow-md transition-all bg-gradient-to-r from-white to-gray-50 dark:from-gray-900 dark:to-gray-800">
                              <div className="flex justify-between items-center mb-3">
                                <span className="text-xs text-gray-500 dark:text-gray-400 font-semibold">
                                  {new Date(game.game_date).toLocaleDateString()}
                                </span>
                                <Badge className="bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800 text-xs font-bold">
                                  FINAL
                                </Badge>
                              </div>
                              <div className="flex justify-between items-center mb-3">
                                <div className="flex items-center gap-2 flex-1">
                                  <Avatar className="w-10 h-10 border-2 border-white dark:border-gray-700">
                                    <AvatarImage src={homeTeamData?.logo_url} />
                                    <AvatarFallback className="bg-gradient-to-br from-orange-500 to-orange-600 text-white text-xs font-bold">
                                      {homeTeamData?.name?.substring(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm font-bold text-gray-900 dark:text-white truncate">{getTeamName(game.home_team_id)}</div>
                                    <div className="text-3xl font-black text-gray-900 dark:text-white mt-1">{game.home_score}</div>
                                  </div>
                                </div>
                                <div className="text-gray-300 dark:text-gray-600 text-2xl font-black px-4">-</div>
                                <div className="flex items-center gap-2 flex-1 justify-end">
                                  <div className="flex-1 min-w-0 text-right">
                                    <div className="text-sm font-bold text-gray-900 dark:text-white truncate">{getTeamName(game.away_team_id)}</div>
                                    <div className="text-3xl font-black text-gray-900 dark:text-white mt-1">{game.away_score}</div>
                                  </div>
                                  <Avatar className="w-10 h-10 border-2 border-white dark:border-gray-700">
                                    <AvatarImage src={awayTeamData?.logo_url} />
                                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white text-xs font-bold">
                                      {awayTeamData?.name?.substring(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                </div>
                              </div>
                              {bestPlayer && bestPlayerStat && (
                                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                                  <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold mb-2">⭐ Best Player (Winner):</p>
                                  <div className="flex items-center gap-2 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/30 dark:to-orange-950/30 rounded-lg p-2 border border-yellow-200 dark:border-yellow-800">
                                    <Avatar className="w-8 h-8 border-2 border-white dark:border-gray-700">
                                      <AvatarImage src={bestPlayer.photo_url} />
                                      <AvatarFallback className="bg-gradient-to-br from-orange-500 to-orange-600 text-white text-xs font-bold">
                                        {bestPlayer.jersey_number}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                                        #{bestPlayer.jersey_number} {bestPlayer.first_name} {bestPlayer.last_name}
                                      </p>
                                      <p className="text-[10px] text-gray-600 dark:text-gray-400 font-semibold">
                                        {bestPlayerStat.points} PTS • {bestPlayerStat.rebounds || 0} REB • {bestPlayerStat.assists || 0} AST
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              )}
                              
                              {/* AI Game Summary - ONLY FOR ADMINS */}
                              {isAdmin && homeTeamData && awayTeamData && topPlayersForAI.length > 0 && (
                                <div className="mt-3">
                                  <AIGameSummary
                                    game={game}
                                    homeTeam={homeTeamData}
                                    awayTeam={awayTeamData}
                                    topPlayers={topPlayersForAI}
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </section>

          {/* VOLLEYBALL SECTION */}
          <section className="mb-20">
            <div className="flex items-center gap-4 mb-10">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 2a10 10 0 0 0 0 20"/>
                  <path d="M12 2a10 10 0 0 1 0 20"/>
                  <path d="M2 12h20"/>
                  <path d="M12 2v20"/>
                </svg>
              </div>
              <div>
                <h2 className="text-4xl font-black text-gray-900 dark:text-white">Volleyball</h2>
                <p className="text-gray-500 dark:text-gray-400 font-medium">League Standings & Player Stats</p>
              </div>
            </div>

            <Tabs defaultValue="standings" className="space-y-8">
              <TabsList className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 p-1 rounded-xl shadow-sm">
                <TabsTrigger value="standings" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-blue-600 data-[state=active]:text-white dark:text-gray-300 font-semibold rounded-lg px-6">
                  Standings
                </TabsTrigger>
                <TabsTrigger value="leaders" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-blue-600 data-[state=active]:text-white dark:text-gray-300 font-semibold rounded-lg px-6">
                  Player Leaders
                </TabsTrigger>
                <TabsTrigger value="schedule" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-blue-600 data-[state=active]:text-white dark:text-gray-300 font-semibold rounded-lg px-6">
                  Schedule & Results
                </TabsTrigger>
              </TabsList>

              <TabsContent value="standings">
                {volleyballStandings.map((divisionData, idx) => (
                  <Card key={idx} className="mb-6 bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 shadow-lg hover:shadow-xl transition-shadow">
                    <CardHeader className="border-b-2 border-gray-100 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-900">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-2xl font-black text-gray-900 dark:text-white">{divisionData.division}</CardTitle>
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-bold text-gray-700 dark:text-gray-300">{organization?.name}</span>
                          {organization?.logo_url && (
                            <Avatar className="w-12 h-12 border-2 border-white dark:border-gray-700 shadow-md">
                              <AvatarImage src={organization.logo_url} />
                              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white font-black">
                                {organization.name?.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="bg-gray-50 dark:bg-gray-900 border-b-2 border-gray-100 dark:border-gray-700">
                              <th className="text-left py-4 px-4 text-gray-600 dark:text-gray-400 font-bold text-sm">#</th>
                              <th className="text-left py-4 px-4 text-gray-600 dark:text-gray-400 font-bold text-sm">TEAM</th>
                              <th className="text-center py-4 px-4 text-gray-600 dark:text-gray-400 font-bold text-sm">W</th>
                              <th className="text-center py-4 px-4 text-gray-600 dark:text-gray-400 font-bold text-sm">L</th>
                              <th className="text-center py-4 px-4 text-gray-600 dark:text-gray-400 font-bold text-sm">PCT</th>
                              <th className="text-center py-4 px-4 text-gray-600 dark:text-gray-400 font-bold text-sm">PF</th>
                              <th className="text-center py-4 px-4 text-gray-600 dark:text-gray-400 font-bold text-sm">PA</th>
                              <th className="text-center py-4 px-4 text-gray-600 dark:text-gray-400 font-bold text-sm">DIFF</th>
                            </tr>
                          </thead>
                          <tbody>
                            {divisionData.teams.map((team, i) => (
                              <tr key={team.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-orange-50/50 dark:hover:bg-blue-950/20 transition-colors">
                                <td className="py-4 px-4 font-black text-xl text-gray-400 dark:text-gray-500">{i + 1}</td>
                                <td className="py-4 px-4">
                                  <div className="flex items-center gap-3">
                                    <Avatar className="w-10 h-10 border-2 border-white dark:border-gray-700 shadow-md">
                                      <AvatarImage src={team.logo_url} />
                                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white text-xs font-bold">
                                        {team.name?.substring(0, 2).toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="font-bold text-gray-900 dark:text-white">{team.name}</span>
                                  </div>
                                </td>
                                <td className="py-4 px-4 text-center text-green-600 dark:text-green-400 font-bold text-lg">{team.wins}</td>
                                <td className="py-4 px-4 text-center text-red-600 dark:text-red-400 font-bold text-lg">{team.losses}</td>
                                <td className="py-4 px-4 text-center font-bold text-gray-900 dark:text-white">{(team.winPct * 100).toFixed(0)}%</td>
                                <td className="py-4 px-4 text-center text-blue-600 dark:text-blue-400 font-semibold">{team.avgPointsFor}</td>
                                <td className="py-4 px-4 text-center text-orange-600 dark:text-orange-400 font-semibold">{team.avgPointsAgainst}</td>
                                <td className={`py-4 px-4 text-center font-bold text-lg ${team.diff > 0 ? 'text-green-600 dark:text-green-400' : team.diff < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>
                                  {team.diff > 0 ? '+' : ''}{team.diff}
                                </td>
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
                  <Card className="bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 shadow-lg hover:shadow-xl transition-shadow">
                    <CardHeader className="border-b-2 border-gray-100 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-white dark:from-gray-800 dark:to-gray-900">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                            <Target className="w-6 h-6 text-white" />
                          </div>
                          <CardTitle className="text-xl font-black text-gray-900 dark:text-white">Top 10 Scorers</CardTitle>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{organization?.name}</span>
                          {organization?.logo_url && (
                            <Avatar className="w-10 h-10 border-2 border-white dark:border-gray-700 shadow-md">
                              <AvatarImage src={organization.logo_url} />
                              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white font-black text-xs">
                                {organization.name?.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        {topVolleyballScorers.map((player, i) => (
                          <div key={player.id} className="flex items-center gap-3 bg-gradient-to-r from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 rounded-xl p-3 border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black shadow-md ${
                              i === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-500 text-gray-900' :
                              i === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-white' :
                              i === 2 ? 'bg-gradient-to-br from-orange-600 to-orange-700 text-white' :
                              'bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 text-gray-700 dark:text-gray-300'
                            }`}>
                              {i + 1}
                            </div>
                            <Avatar className="w-12 h-12 border-2 border-white dark:border-gray-700 shadow-md">
                              <AvatarImage src={player.photo_url} />
                              <AvatarFallback className="bg-gradient-to-br from-blue-600 to-blue-700 text-white text-xs font-bold">
                                {player.jersey_number}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-gray-900 dark:text-white truncate">#{player.jersey_number} {player.first_name} {player.last_name}</p>
                              <div className="flex items-center gap-2">
                                <Avatar className="w-5 h-5 border border-gray-200 dark:border-gray-700">
                                  <AvatarImage src={player.teamLogoUrl} />
                                  <AvatarFallback className="bg-gray-200 text-[10px] font-bold">{player.teamName?.substring(0,2)?.toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{player.teamName}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-black text-blue-600 dark:text-blue-400">{player.total}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold">{player.average} {player.averageLabel}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Top Attackers */}
                  <Card className="bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 shadow-lg hover:shadow-xl transition-shadow">
                    <CardHeader className="border-b-2 border-gray-100 dark:border-gray-700 bg-gradient-to-r from-orange-50 to-white dark:from-gray-800 dark:to-gray-900">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                            <Zap className="w-6 h-6 text-white" />
                          </div>
                          <CardTitle className="text-xl font-black text-gray-900 dark:text-white">Top 10 Attackers</CardTitle>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{organization?.name}</span>
                          {organization?.logo_url && (
                            <Avatar className="w-10 h-10 border-2 border-white dark:border-gray-700 shadow-md">
                              <AvatarImage src={organization.logo_url} />
                              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white font-black text-xs">
                                {organization.name?.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        {topVolleyballAttackers.map((player, i) => (
                          <div key={player.id} className="flex items-center gap-3 bg-gradient-to-r from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 rounded-xl p-3 border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black shadow-md ${
                              i === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-500 text-gray-900' :
                              i === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-white' :
                              i === 2 ? 'bg-gradient-to-br from-orange-600 to-orange-700 text-white' :
                              'bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 text-gray-700 dark:text-gray-300'
                            }`}>
                              {i + 1}
                            </div>
                            <Avatar className="w-12 h-12 border-2 border-white dark:border-gray-700 shadow-md">
                              <AvatarImage src={player.photo_url} />
                              <AvatarFallback className="bg-gradient-to-br from-orange-600 to-orange-700 text-white text-xs font-bold">
                                {player.jersey_number}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-gray-900 dark:text-white truncate">#{player.jersey_number} {player.first_name} {player.last_name}</p>
                              <div className="flex items-center gap-2">
                                <Avatar className="w-5 h-5 border border-gray-200 dark:border-gray-700">
                                  <AvatarImage src={player.teamLogoUrl} />
                                  <AvatarFallback className="bg-gray-200 text-[10px] font-bold">{player.teamName?.substring(0,2)?.toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{player.teamName}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-black text-orange-600 dark:text-orange-400">{player.total}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold">{player.average} {player.averageLabel}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Top Blockers */}
                  <Card className="bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 shadow-lg hover:shadow-xl transition-shadow">
                    <CardHeader className="border-b-2 border-gray-100 dark:border-gray-700 bg-gradient-to-r from-red-50 to-white dark:from-gray-800 dark:to-gray-900">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center">
                            <Shield className="w-6 h-6 text-white" />
                          </div>
                          <CardTitle className="text-xl font-black text-gray-900 dark:text-white">Top 10 Blockers</CardTitle>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{organization?.name}</span>
                          {organization?.logo_url && (
                            <Avatar className="w-10 h-10 border-2 border-white dark:border-gray-700 shadow-md">
                              <AvatarImage src={organization.logo_url} />
                              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white font-black text-xs">
                                {organization.name?.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        {topVolleyballBlockers.map((player, i) => (
                          <div key={player.id} className="flex items-center gap-3 bg-gradient-to-r from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 rounded-xl p-3 border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black shadow-md ${
                              i === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-500 text-gray-900' :
                              i === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-white' :
                              i === 2 ? 'bg-gradient-to-br from-orange-600 to-orange-700 text-white' :
                              'bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 text-gray-700 dark:text-gray-300'
                            }`}>
                              {i + 1}
                            </div>
                            <Avatar className="w-12 h-12 border-2 border-white dark:border-gray-700 shadow-md">
                              <AvatarImage src={player.photo_url} />
                              <AvatarFallback className="bg-gradient-to-br from-red-600 to-red-700 text-white text-xs font-bold">
                                {player.jersey_number}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-gray-900 dark:text-white truncate">#{player.jersey_number} {player.first_name} {player.last_name}</p>
                              <div className="flex items-center gap-2">
                                <Avatar className="w-5 h-5 border border-gray-200 dark:border-gray-700">
                                  <AvatarImage src={player.teamLogoUrl} />
                                  <AvatarFallback className="bg-gray-200 text-[10px] font-bold">{player.teamName?.substring(0,2)?.toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{player.teamName}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-black text-red-600 dark:text-red-400">{player.total}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold">{player.average} {player.averageLabel}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Top Ace Leaders */}
                  <Card className="bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 shadow-lg hover:shadow-xl transition-shadow">
                    <CardHeader className="border-b-2 border-gray-100 dark:border-gray-700 bg-gradient-to-r from-yellow-50 to-white dark:from-gray-800 dark:to-gray-900">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-lg flex items-center justify-center">
                            <Zap className="w-6 h-6 text-white" />
                          </div>
                          <CardTitle className="text-xl font-black text-gray-900 dark:text-white">Top 10 Ace Leaders</CardTitle>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{organization?.name}</span>
                          {organization?.logo_url && (
                            <Avatar className="w-10 h-10 border-2 border-white dark:border-gray-700 shadow-md">
                              <AvatarImage src={organization.logo_url} />
                              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white font-black text-xs">
                                {organization.name?.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        {topVolleyballAces.map((player, i) => (
                          <div key={player.id} className="flex items-center gap-3 bg-gradient-to-r from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 rounded-xl p-3 border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black shadow-md ${
                              i === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-500 text-gray-900' :
                              i === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-white' :
                              i === 2 ? 'bg-gradient-to-br from-orange-600 to-orange-700 text-white' :
                              'bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 text-gray-700 dark:text-gray-300'
                            }`}>
                              {i + 1}
                            </div>
                            <Avatar className="w-12 h-12 border-2 border-white dark:border-gray-700 shadow-md">
                              <AvatarImage src={player.photo_url} />
                              <AvatarFallback className="bg-gradient-to-br from-yellow-600 to-yellow-700 text-white text-xs font-bold">
                                {player.jersey_number}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-gray-900 dark:text-white truncate">#{player.jersey_number} {player.first_name} {player.last_name}</p>
                              <div className="flex items-center gap-2">
                                <Avatar className="w-5 h-5 border border-gray-200 dark:border-gray-700">
                                  <AvatarImage src={player.teamLogoUrl} />
                                  <AvatarFallback className="bg-gray-200 text-[10px] font-bold">{player.teamName?.substring(0,2)?.toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{player.teamName}</p>
                              </div>
                            </div>
                            <div className="text-right">
                            <p className="text-2xl font-black text-yellow-600 dark:text-yellow-400">{player.total}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold">{player.average} {player.averageLabel}</p>
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
                  <Card className="bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 shadow-lg">
                    <CardHeader className="border-b-2 border-gray-100 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-white dark:from-gray-800 dark:to-gray-900">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-xl font-black text-gray-900 dark:text-white">Upcoming Games</CardTitle>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{organization?.name}</span>
                          {organization?.logo_url && (
                            <Avatar className="w-10 h-10 border-2 border-white dark:border-gray-700 shadow-md">
                              <AvatarImage src={organization.logo_url} />
                              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white font-black text-xs">
                                {organization.name?.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        {upcomingVolleyballGames.map(game => (
                          <div key={game.id} className="border-2 border-gray-100 dark:border-gray-700 rounded-xl p-4 hover:shadow-md transition-all bg-gradient-to-r from-white to-gray-50 dark:from-gray-900 dark:to-gray-800">
                            <div className="flex justify-between items-center mb-3">
                              <span className="text-xs text-gray-500 dark:text-gray-400 font-semibold flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(game.game_date).toLocaleDateString()}
                              </span>
                              <Badge className="bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-bold">
                                {game.game_type?.replace('_', ' ').toUpperCase() || 'REGULAR'}
                              </Badge>
                            </div>
                            <div className="text-sm font-bold text-gray-900 dark:text-white">
                              {getTeamName(game.home_team_id)} vs {getTeamName(game.away_team_id)}
                            </div>
                            {game.location && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 font-medium">📍 {game.location}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Recent Results */}
                  <Card className="bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 shadow-lg">
                    <CardHeader className="border-b-2 border-gray-100 dark:border-gray-700 bg-gradient-to-r from-green-50 to-white dark:from-gray-800 dark:to-gray-900">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-xl font-black text-gray-900 dark:text-white">Recent Results</CardTitle>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{organization?.name}</span>
                          {organization?.logo_url && (
                            <Avatar className="w-10 h-10 border-2 border-white dark:border-gray-700 shadow-md">
                              <AvatarImage src={organization.logo_url} />
                              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white font-black text-xs">
                                {organization.name?.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        {completedVolleyballGames.map(game => {
                          // Calculate total points across all sets
                          const homeTotalPoints = (game.quarter_scores || []).reduce((sum, s) => sum + (s.home || 0), 0);
                          const awayTotalPoints = (game.quarter_scores || []).reduce((sum, s) => sum + (s.away || 0), 0);
                          const homeSetsWon = (game.quarter_scores || []).filter(s => s.home > s.away).length;
                          const awaySetsWon = (game.quarter_scores || []).filter(s => s.away > s.home).length;
                          
                          // Determine winning team based on sets won
                          const winningTeamId = homeSetsWon > awaySetsWon ? game.home_team_id : game.away_team_id;
                          
                          // Find best player from WINNING team only
                          const gameStats = allPlayerStats.filter(s => s.game_id === game.id && s.team_id === winningTeamId);
                          const bestPlayerStat = gameStats.reduce((best, current) => {
                            const currentScore = (current.field_goals_made || 0) + (current.blocks || 0) + (current.three_pointers || 0);
                            const bestScore = best ? ((best.field_goals_made || 0) + (best.blocks || 0) + (best.three_pointers || 0)) : 0;
                            return currentScore > bestScore ? current : best;
                          }, null);
                          
                          const bestPlayer = bestPlayerStat ? allPlayers.find(p => p.id === bestPlayerStat.player_id) : null;
                          
                          const homeTeamData = allTeams.find(t => t.id === game.home_team_id);
                          const awayTeamData = allTeams.find(t => t.id === game.away_team_id);

                          // Prepare top players for AI summary
                          const topPlayersForAI = [];
                          if (bestPlayer && bestPlayerStat) {
                            topPlayersForAI.push({
                              name: `${bestPlayer.first_name} ${bestPlayer.last_name}`,
                              team: getTeamName(winningTeamId),
                              stats: `${bestPlayerStat.field_goals_made || 0} ATK • ${bestPlayerStat.blocks || 0} BLK • ${bestPlayerStat.three_pointers || 0} ACE`
                            });
                          }
                          
                          return (
                            <div key={game.id} className="border-2 border-gray-100 dark:border-gray-700 rounded-xl p-4 hover:shadow-md transition-all bg-gradient-to-r from-white to-gray-50 dark:from-gray-900 dark:to-gray-800">
                              <div className="flex justify-between items-center mb-3">
                                <span className="text-xs text-gray-500 dark:text-gray-400 font-semibold">
                                  {new Date(game.game_date).toLocaleDateString()}
                                </span>
                                <Badge className="bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800 text-xs font-bold">
                                  FINAL
                                </Badge>
                              </div>
                              <div className="space-y-2 mb-3">
                                <div className="flex items-center gap-2">
                                  <Avatar className="w-10 h-10 border-2 border-white dark:border-gray-700">
                                    <AvatarImage src={homeTeamData?.logo_url} />
                                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white text-xs font-bold">
                                      {homeTeamData?.name?.substring(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm font-bold text-gray-900 dark:text-white truncate">{getTeamName(game.home_team_id)}</div>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-3xl font-black text-gray-900 dark:text-white">{homeTotalPoints}</div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 font-semibold">({homeSetsWon} sets)</div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Avatar className="w-10 h-10 border-2 border-white dark:border-gray-700">
                                    <AvatarImage src={awayTeamData?.logo_url} />
                                    <AvatarFallback className="bg-gradient-to-br from-orange-500 to-orange-600 text-white text-xs font-bold">
                                      {awayTeamData?.name?.substring(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm font-bold text-gray-900 dark:text-white truncate">{getTeamName(game.away_team_id)}</div>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-3xl font-black text-gray-900 dark:text-white">{awayTotalPoints}</div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 font-semibold">({awaySetsWon} sets)</div>
                                  </div>
                                </div>
                              </div>
                              {bestPlayer && bestPlayerStat && (
                                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                                  <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold mb-2">⭐ Best Player (Winner):</p>
                                  <div className="flex items-center gap-2 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/30 dark:to-orange-950/30 rounded-lg p-2 border border-yellow-200 dark:border-yellow-800">
                                    <Avatar className="w-8 h-8 border-2 border-white dark:border-gray-700">
                                      <AvatarImage src={bestPlayer.photo_url} />
                                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white text-xs font-bold">
                                        {bestPlayer.jersey_number}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                                        #{bestPlayer.jersey_number} {bestPlayer.first_name} {bestPlayer.last_name}
                                      </p>
                                      <p className="text-[10px] text-gray-600 dark:text-gray-400 font-semibold">
                                        {bestPlayerStat.field_goals_made || 0} ATK • {bestPlayerStat.blocks || 0} BLK • {bestPlayerStat.three_pointers || 0} ACE
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              )}
                              {game.quarter_scores && game.quarter_scores.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                                  <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold mb-1">Set Scores:</p>
                                  <div className="flex flex-wrap gap-2">
                                    {game.quarter_scores.map((set, idx) => (
                                      <Badge 
                                        key={idx} 
                                        variant="outline" 
                                        className={`text-xs font-bold ${
                                          set.home > set.away 
                                            ? 'border-blue-400 dark:border-blue-600 text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30' 
                                            : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'
                                        }`}
                                      >
                                        {set.home}-{set.away}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* AI Game Summary - ONLY FOR ADMINS */}
                              {isAdmin && homeTeamData && awayTeamData && topPlayersForAI.length > 0 && (
                                <div className="mt-3">
                                  <AIGameSummary
                                    game={game}
                                    homeTeam={homeTeamData}
                                    awayTeam={awayTeamData}
                                    topPlayers={topPlayersForAI}
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              </Tabs>
              </section>
              </div>
              )}

              {/* Footer - ALWAYS SHOW */}
              <footer className="bg-gradient-to-br from-gray-900 via-gray-900 to-black dark:from-black dark:via-gray-950 dark:to-black text-white py-16 px-4 mt-20 relative overflow-hidden">
              <div className="absolute inset-0 grid-pattern opacity-10"></div>
              <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent"></div>
              <div className="max-w-7xl mx-auto text-center relative z-10">
              <div className="flex items-center justify-center gap-4 mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 via-red-500 to-pink-500 rounded-xl flex items-center justify-center shadow-2xl neon-glow-orange">
              <svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
              </svg>
              </div>
              <span className="text-3xl font-black tracking-tight text-gradient-warm">ScorekeeperAI</span>
              </div>
          <p className="text-blue-200 dark:text-blue-300 text-lg mb-2 font-medium">
            Professional League Management System
          </p>
          <p className="text-blue-300 dark:text-blue-400 text-sm">
            Basketball • Volleyball • Real-time Scoring
          </p>
          <p className="text-blue-400 dark:text-blue-500 text-sm mt-8">
            © 2025 ScorekeeperAI. All rights reserved.
          </p>
            </div>
          </footer>
        </main>
      </div>
      
      <AIAssistant />
    </div>
  );
}