
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlayCircle, Calendar, MapPin, Trophy, Clock, CheckCircle, Home as HomeIcon, Clipboard } from "lucide-react";
import AdminHeader from "@/components/AdminHeader";
import AdminSidebar from "@/components/AdminSidebar";

export default function ScorekeeperDashboard() {
  const [user, setUser] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

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
      console.log("SCOREKEEPER USER FULL OBJECT:", JSON.stringify(currentUser, null, 2));
      console.log("User email field:", currentUser.email);
      console.log("User is_scorekeeper:", currentUser.is_scorekeeper);
      console.log("User organization_id:", currentUser.organization_id);
      setUser(currentUser);
      
      if (!currentUser.is_scorekeeper) {
        navigate(createPageUrl("Home"));
      }
    } catch (error) {
      console.error("Error loading user:", error);
      base44.auth.redirectToLogin(createPageUrl("ScorekeeperDashboard"));
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    base44.auth.logout(createPageUrl("Home"));
  };

  const { data: organization } = useQuery({
    queryKey: ['organization', user?.organization_id],
    queryFn: async () => {
      const orgs = await base44.entities.Organization.list();
      return orgs.find(o => o.id === user?.organization_id);
    },
    enabled: !!user?.organization_id,
  });

  const { data: myGames = [] } = useQuery({
    queryKey: ['my-scorekeeper-games', user?.email],
    queryFn: async () => {
      console.log("=== FETCHING GAMES FOR SCOREKEEPER ===");
      console.log("User email from query:", user?.email);
      
      // Get ALL games (no RLS)
      const allGames = await base44.entities.Game.list('-game_date');
      console.log("Total games from API:", allGames.length);
      
      // Filter games where scorekeeper email is in the array
      const myAssignedGames = allGames.filter(game => {
        const emails = game.assigned_scorekeeper_emails || [];
        return emails.includes(user?.email);
      });
      
      console.log("Games assigned to this scorekeeper:", myAssignedGames.length);
      console.log("My games data:", JSON.stringify(myAssignedGames.map(g => ({
        id: g.id,
        sport: g.sport,
        home_team_id: g.home_team_id,
        away_team_id: g.away_team_id,
        assigned_scorekeeper_emails: g.assigned_scorekeeper_emails, // Changed from single email to array
        status: g.status
      })), null, 2));
      
      return myAssignedGames;
    },
    enabled: !!user?.email,
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: () => base44.entities.Team.list(),
  });

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  const getTeamName = (teamId) => {
    const team = teams.find(t => t.id === teamId);
    return team?.name || 'Unknown';
  };

  const scheduledGames = myGames.filter(g => g.status === 'scheduled');
  const inProgressGames = myGames.filter(g => g.status === 'in_progress');
  const completedGames = myGames.filter(g => g.status === 'completed');

  const scorekeeperNav = [
    { title: "Organization Home", url: createPageUrl("Home"), icon: HomeIcon },
    { title: "My Games", url: createPageUrl("ScorekeeperDashboard"), icon: Clipboard },
  ];

  const GameCard = ({ game }) => {
    const sportColor = game.sport === 'basketball' ? 'orange' : 'blue';
    const statusColor = 
      game.status === 'scheduled' ? 'blue' :
      game.status === 'in_progress' ? 'yellow' : 'green';
    
    return (
      <Card className={`relative overflow-hidden border-2 border-${sportColor}-100 dark:border-${sportColor}-900 bg-gradient-to-br from-white to-${sportColor}-50 dark:from-gray-800 dark:to-${sportColor}-950/30 shadow-lg hover:shadow-2xl transition-all`}>
        <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-${sportColor}-500/20 to-transparent rounded-full blur-3xl`}></div>
        
        <CardHeader className="relative z-10">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <Badge className={`bg-${statusColor}-100 text-${statusColor}-700 border-${statusColor}-200 dark:bg-${statusColor}-950 dark:text-${statusColor}-300 dark:border-${statusColor}-800 font-bold mb-2`}>
                {game.status === 'scheduled' && <Clock className="w-3 h-3 mr-1" />}
                {game.status === 'in_progress' && <PlayCircle className="w-3 h-3 mr-1" />}
                {game.status === 'completed' && <CheckCircle className="w-3 h-3 mr-1" />}
                {game.status ? game.status.replace('_', ' ').toUpperCase() : 'SCHEDULED'}
              </Badge>
              <p className="text-gray-500 dark:text-gray-400 text-sm font-semibold flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(game.game_date).toLocaleDateString()} at {new Date(game.game_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </p>
              {game.court_number && (
                <p className="text-gray-600 dark:text-gray-400 text-xs font-bold mt-1">
                  Court {game.court_number}
                </p>
              )}
            </div>
            <Badge variant="outline" className={`text-${sportColor}-600 dark:text-${sportColor}-400 border-${sportColor}-600 dark:border-${sportColor}-400 font-black`}>
              {game.sport}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4 relative z-10">
          <div className="bg-white/60 dark:bg-gray-900/60 rounded-xl p-4">
            <div className="flex justify-between items-center">
              <div className="flex-1">
                <p className="text-gray-900 dark:text-white font-black">{getTeamName(game.home_team_id)}</p>
                <p className="text-gray-500 dark:text-gray-400 text-xs font-semibold">HOME</p>
              </div>
              {game.status === 'completed' ? (
                <>
                  <div className={`text-4xl font-black text-${sportColor}-600 dark:text-${sportColor}-400`}>{game.home_score}</div>
                  <div className="text-gray-400 dark:text-gray-600 px-4 text-2xl font-black">-</div>
                  <div className="text-4xl font-black text-gray-900 dark:text-white">{game.away_score}</div>
                </>
              ) : (
                <div className="text-gray-400 dark:text-gray-600 text-xl font-bold">vs</div>
              )}
              <div className="flex-1 text-right">
                <p className="text-gray-900 dark:text-white font-black">{getTeamName(game.away_team_id)}</p>
                <p className="text-gray-500 dark:text-gray-400 text-xs font-semibold">AWAY</p>
              </div>
            </div>
          </div>
          
          {game.location && (
            <p className="text-gray-500 dark:text-gray-400 text-sm font-medium flex items-center gap-1">
              <MapPin className="w-3 h-3" /> {game.location}
            </p>
          )}
          
          {game.status === 'scheduled' && (
            <Link to={createPageUrl(game.sport === 'volleyball' ? 'LiveScoringVolleyball' : 'LiveScoring') + `?game_id=${game.id}`}>
              <Button className={`w-full bg-gradient-to-r from-${sportColor}-600 to-${sportColor}-700 hover:from-${sportColor}-700 hover:to-${sportColor}-800 text-white font-bold shadow-lg`}>
                <PlayCircle className="w-4 h-4 mr-2" />
                Start Game
              </Button>
            </Link>
          )}
          {game.status === 'in_progress' && (
            <Link to={createPageUrl(game.sport === 'volleyball' ? 'LiveScoringVolleyball' : 'LiveScoring') + `?game_id=${game.id}`}>
              <Button className={`w-full bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800 text-white font-bold shadow-lg`}>
                Continue Scoring
              </Button>
            </Link>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-50 dark:from-gray-900 dark:via-blue-950/10 dark:to-gray-900">
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
          navigationItems={scorekeeperNav}
        />

        <main className="flex-1 min-w-0">
          <div className="p-6 lg:p-8">
            <div className="max-w-7xl mx-auto space-y-8">
              <Card className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 border-0 shadow-2xl">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4 text-white">
                    <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                      <Trophy className="w-8 h-8" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black">Welcome, {user.full_name}!</h2>
                      <p className="text-blue-100 font-medium">You have {scheduledGames.length} upcoming games to score</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="border-2 border-blue-100 dark:border-blue-900 bg-white dark:bg-gray-800 shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-sm font-bold text-gray-600 dark:text-gray-400">Scheduled Games</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-black text-blue-600 dark:text-blue-400">{scheduledGames.length}</div>
                  </CardContent>
                </Card>

                <Card className="border-2 border-yellow-100 dark:border-yellow-900 bg-white dark:bg-gray-800 shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-sm font-bold text-gray-600 dark:text-gray-400">In Progress</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-black text-yellow-600 dark:text-yellow-400">{inProgressGames.length}</div>
                  </CardContent>
                </Card>

                <Card className="border-2 border-green-100 dark:border-green-900 bg-white dark:bg-gray-800 shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-sm font-bold text-gray-600 dark:text-gray-400">Completed</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-black text-green-600 dark:text-green-400">{completedGames.length}</div>
                  </CardContent>
                </Card>
              </div>

              {scheduledGames.length > 0 && (
                <div>
                  <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-4">Upcoming Games</h2>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {scheduledGames.map(game => <GameCard key={game.id} game={game} />)}
                  </div>
                </div>
              )}

              {inProgressGames.length > 0 && (
                <div>
                  <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-4">Games In Progress</h2>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {inProgressGames.map(game => <GameCard key={game.id} game={game} />)}
                  </div>
                </div>
              )}

              {completedGames.length > 0 && (
                <div>
                  <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-4">Recently Completed</h2>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {completedGames.slice(0, 6).map(game => <GameCard key={game.id} game={game} />)}
                  </div>
                </div>
              )}

              {myGames.length === 0 && (
                <div className="text-center py-20">
                  <div className="w-24 h-24 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Calendar className="w-12 h-12 text-gray-400 dark:text-gray-500" />
                  </div>
                  <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2">No Games Assigned Yet</h3>
                  <p className="text-gray-600 dark:text-gray-400 font-medium mb-6">
                    You don't have any games assigned to you at the moment.
                  </p>
                  <Link to={createPageUrl("Home")}>
                    <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold">
                      <HomeIcon className="w-4 h-4 mr-2" />
                      Go to Organization Home
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
