
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Calendar, TrendingUp, Target, Zap, Shield, ArrowRight, Sun, Moon, Building2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [viewMode, setViewMode] = useState('all'); // 'all' or 'my-org'

  React.useEffect(() => {
    checkAuth();
    loadUser();
    // Load dark mode preference
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    setDarkMode(savedDarkMode);
    if (savedDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark'); // Ensure it's removed if not dark
    }
  }, []);

  const checkAuth = async () => {
    const authenticated = await base44.auth.isAuthenticated();
    setIsAuthenticated(authenticated);
  };

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      
      // Load organization if user has organization_id
      if (currentUser?.organization_id) {
        const orgs = await base44.entities.Organization.list(); // Assuming Organization entity exists
        const userOrg = orgs.find(o => o.id === currentUser.organization_id);
        setOrganization(userOrg);
        setViewMode('my-org'); // Default to showing their org data
      }
    } catch (error) {
      // User not logged in or other error
      console.log("User not authenticated or error loading user/org:", error);
      setUser(null); // Ensure user is null if error
      setOrganization(null);
      setViewMode('all'); // Default to 'all' if no user/org
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

  // Filter data based on view mode
  const teams = viewMode === 'my-org' && user?.organization_id
    ? allTeams.filter(t => t.organization_id === user.organization_id)
    : allTeams;

  const games = viewMode === 'my-org' && user?.organization_id
    ? allGames.filter(g => g.organization_id === user.organization_id)
    : allGames;

  const teamIds = teams.map(t => t.id);
  const players = allPlayers.filter(p => teamIds.includes(p.team_id));
  const playerStats = allPlayerStats.filter(s => {
    const player = players.find(p => p.id === s.player_id); // Use filtered players here
    return player && teamIds.includes(player.team_id);
  });

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
              } else if (awaySetsWon > homeSetsWon) { // Fixed: added else if to handle away win
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

  // Calculate top players for basketball
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
            sum + (s.field_goals_made || 0) + (s.blocks || 0) + (s.three_pointers || 0), 0); // three_pointers used for aces
          averageLabel = "Score/G";
        }
      } else if (statType === 'rebounds') {
        total = playerStatsList.reduce((sum, s) => sum + (s.rebounds || 0), 0);
        averageLabel = "RPG";
      } else if (statType === 'blocks') {
        total = playerStatsList.reduce((sum, s) => sum + (s.blocks || 0), 0);
        averageLabel = "BPG";
      } else if (statType === 'three_pointers') {
        total = playerStatsList.reduce((sum, s) => sum + (s.three_pointers || 0), 0);
        averageLabel = sport === 'basketball' ? "3PG" : "ACE/G";
      } else if (statType === 'attacks') {
        total = playerStatsList.reduce((sum, s) => sum + (s.field_goals_made || 0), 0); // field_goals_made used for attacks in volleyball
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-gray-900 via-blue-900 to-indigo-900 dark:from-black dark:via-gray-900 dark:to-indigo-950 text-white py-24 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNzeiIHN0cm9rZT0iIzFmMmQzZCIgc3Ryb2tlLXdpZHRoPSIyIi8+PC9nPjwvc3ZnPg==')] opacity-10"></div>
        
        {/* Dark Mode Toggle - Top Right */}
        <button
          onClick={toggleDarkMode}
          className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-xl transition-all"
        >
          {darkMode ? <Sun className="w-6 h-6 text-white" /> : <Moon className="w-6 h-6 text-white" />}
        </button>

        <div className="max-w-7xl mx-auto text-center relative z-10">
          <div className="flex items-center justify-center gap-4 mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center shadow-2xl transform rotate-6 hover:rotate-0 transition-transform duration-300">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
              </svg>
            </div>
          </div>
          
          <h1 className="text-6xl md:text-7xl font-black mb-6 tracking-tight">
            ALAB <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-500">SPORTS</span>
          </h1>
          <p className="text-xl md:text-2xl text-blue-100 mb-3 max-w-3xl mx-auto font-medium">
            Professional Basketball & Volleyball League Management
          </p>
          <p className="text-blue-200 mb-10 max-w-2xl mx-auto">
            Real-time scoring • Live statistics • Tournament management
          </p>
          
          {!isAuthenticated ? (
            <div className="flex gap-4 justify-center flex-wrap">
              <Button 
                onClick={() => base44.auth.redirectToLogin(createPageUrl("Dashboard"))}
                className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white text-lg px-10 py-7 font-bold shadow-xl transform hover:scale-105 transition-all"
              >
                Get Started
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Link to={createPageUrl("RequestAdminAccess")}>
                <Button 
                  variant="outline"
                  className="border-2 border-white text-white hover:bg-white hover:text-blue-900 text-lg px-10 py-7 font-bold backdrop-blur-sm"
                >
                  Request Admin Access
                </Button>
              </Link>
            </div>
          ) : (
            <Link to={createPageUrl("Dashboard")}>
              <Button className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white text-lg px-10 py-7 font-bold shadow-xl transform hover:scale-105 transition-all">
                Go to Dashboard
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          )}
        </div>
        
        {/* Decorative Elements */}
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-gray-50 dark:from-gray-900 to-transparent"></div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-16">
        {/* Organization Header & Filter */}
        {organization && (
          <div className="mb-12">
            <Card className="bg-gradient-to-br from-white via-blue-50/30 to-purple-50/30 dark:from-gray-800 dark:via-blue-950/20 dark:to-purple-950/20 border-2 border-blue-200 dark:border-blue-800 shadow-xl">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                  {/* Organization Info */}
                  <div className="flex items-center gap-4">
                    <Avatar className="w-20 h-20 border-4 border-white dark:border-gray-700 shadow-2xl">
                      <AvatarImage src={organization.logo_url} />
                      <AvatarFallback className="bg-gradient-to-br from-orange-500 to-red-600 text-white font-black text-2xl">
                        {organization.name?.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h2 className="text-3xl font-black text-gray-900 dark:text-white">{organization.name}</h2>
                      <p className="text-sm text-gray-600 dark:text-gray-400 font-medium mt-1">Your Organization</p>
                    </div>
                  </div>

                  {/* View Toggle */}
                  <div className="flex bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 rounded-xl p-1 shadow-lg">
                    <Button
                      variant={viewMode === 'my-org' ? 'default' : 'ghost'}
                      onClick={() => setViewMode('my-org')}
                      className={`font-bold px-6 ${viewMode === 'my-org' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white' : 'text-gray-600 dark:text-gray-400'}`}
                    >
                      <Building2 className="w-4 h-4 mr-2" />
                      My Organization
                    </Button>
                    <Button
                      variant={viewMode === 'all' ? 'default' : 'ghost'}
                      onClick={() => setViewMode('all')}
                      className={`font-bold px-6 ${viewMode === 'all' ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white' : 'text-gray-600 dark:text-gray-400'}`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                        <circle cx="12" cy="12" r="10"/>
                        <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/>
                        <path d="M2 12h20"/>
                      </svg>
                      All Leagues
                    </Button>
                  </div>
                </div>

                {/* Active Filter Badge */}
                {viewMode === 'my-org' && (
                  <div className="mt-4 pt-4 border-t border-blue-200 dark:border-blue-800">
                    <Badge className="bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800 font-bold text-sm px-4 py-2">
                      🏆 Showing {organization.name} data only
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
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
                    <CardTitle className="text-2xl font-black text-gray-900 dark:text-white">{divisionData.division}</CardTitle>
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
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                        <Target className="w-6 h-6 text-white" />
                      </div>
                      <CardTitle className="text-xl font-black text-gray-900 dark:text-white">Top 10 Scorers</CardTitle>
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
                            <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                              {player.first_name} {player.last_name}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{player.teamName}</p>
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
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                        <TrendingUp className="w-6 h-6 text-white" />
                      </div>
                      <CardTitle className="text-xl font-black text-gray-900 dark:text-white">Top 10 Rebounders</CardTitle>
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
                            <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                              {player.first_name} {player.last_name}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{player.teamName}</p>
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
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center">
                        <Shield className="w-6 h-6 text-white" />
                      </div>
                      <CardTitle className="text-xl font-black text-gray-900 dark:text-white">Top 10 Blockers</CardTitle>
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
                            <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                              {player.first_name} {player.last_name}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{player.teamName}</p>
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
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-lg flex items-center justify-center">
                        <Zap className="w-6 h-6 text-white" />
                      </div>
                      <CardTitle className="text-xl font-black text-gray-900 dark:text-white">Top 10 3-Pointer Leaders</CardTitle>
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
                            <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                              {player.first_name} {player.last_name}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{player.teamName}</p>
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
                    <CardTitle className="text-xl font-black text-gray-900 dark:text-white">Upcoming Games</CardTitle>
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
                    <CardTitle className="text-xl font-black text-gray-900 dark:text-white">Recent Results</CardTitle>
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
                    <CardTitle className="text-2xl font-black text-gray-900 dark:text-white">{divisionData.division}</CardTitle>
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
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                        <Target className="w-6 h-6 text-white" />
                      </div>
                      <CardTitle className="text-xl font-black text-gray-900 dark:text-white">Top 10 Scorers</CardTitle>
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
                            <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                              {player.first_name} {player.last_name}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{player.teamName}</p>
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
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                        <Zap className="w-6 h-6 text-white" />
                      </div>
                      <CardTitle className="text-xl font-black text-gray-900 dark:text-white">Top 10 Attackers</CardTitle>
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
                            <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                              {player.first_name} {player.last_name}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{player.teamName}</p>
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
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center">
                        <Shield className="w-6 h-6 text-white" />
                      </div>
                      <CardTitle className="text-xl font-black text-gray-900 dark:text-white">Top 10 Blockers</CardTitle>
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
                            <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                              {player.first_name} {player.last_name}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{player.teamName}</p>
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
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-lg flex items-center justify-center">
                        <Zap className="w-6 h-6 text-white" />
                      </div>
                      <CardTitle className="text-xl font-black text-gray-900 dark:text-white">Top 10 Ace Leaders</CardTitle>
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
                            <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                              {player.first_name} {player.last_name}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{player.teamName}</p>
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
                    <CardTitle className="text-xl font-black text-gray-900 dark:text-white">Upcoming Games</CardTitle>
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
                    <CardTitle className="text-xl font-black text-gray-900 dark:text-white">Recent Results</CardTitle>
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

      {/* Footer */}
      <footer className="bg-gradient-to-br from-gray-900 via-blue-900 to-indigo-900 dark:from-black dark:via-gray-950 dark:to-indigo-950 text-white py-16 px-4 mt-20">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center shadow-2xl">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
              </svg>
            </div>
            <span className="text-3xl font-black tracking-tight">ALAB SPORTS</span>
          </div>
          <p className="text-blue-200 dark:text-blue-300 text-lg mb-2 font-medium">
            Professional League Management System
          </p>
          <p className="text-blue-300 dark:text-blue-400 text-sm">
            Basketball • Volleyball • Real-time Scoring
          </p>
          <p className="text-blue-400 dark:text-blue-500 text-sm mt-8">
            © 2025 ALAB Sports. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
