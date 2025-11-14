import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Trophy, Users, Calendar, Building2, ArrowRight, Settings } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import AdminHeader from "@/components/AdminHeader";
import AdminSidebar from "@/components/AdminSidebar";
import AIInsights from "@/components/AIInsights";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [organization, setOrganization] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
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
      setUser(currentUser);
      setIsSuperAdmin(currentUser.role === 'admin' && currentUser.is_super_admin === true);
      
      if (currentUser?.organization_id) {
        const orgs = await base44.entities.Organization.list();
        const userOrg = orgs.find(o => o.id === currentUser.organization_id);
        setOrganization(userOrg);
      }
    } catch (error) {
      console.error("Dashboard: Error loading user", error);
      base44.auth.redirectToLogin(createPageUrl("Dashboard"));
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    base44.auth.logout(createPageUrl("PublicLanding"));
  };

  const { data: organizations = [] } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => base44.entities.Organization.list(),
    enabled: isSuperAdmin,
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['teams', user?.organization_id],
    queryFn: () => isSuperAdmin
      ? base44.entities.Team.list()
      : base44.entities.Team.filter({ organization_id: user?.organization_id }),
    enabled: !!user,
  });

  const { data: players = [] } = useQuery({
    queryKey: ['players', user?.organization_id],
    queryFn: async () => {
      if (isSuperAdmin) {
        return base44.entities.Player.list();
      }
      const orgTeams = await base44.entities.Team.filter({ organization_id: user?.organization_id });
      const teamIds = orgTeams.map(t => t.id);
      if (teamIds.length === 0) return [];
      const allPlayers = await base44.entities.Player.list();
      return allPlayers.filter(p => teamIds.includes(p.team_id));
    },
    enabled: !!user,
  });

  const { data: games = [] } = useQuery({
    queryKey: ['games', user?.organization_id],
    queryFn: () => isSuperAdmin
      ? base44.entities.Game.list('-game_date')
      : base44.entities.Game.filter({ organization_id: user?.organization_id }, '-game_date'),
    enabled: !!user,
  });

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  const upcomingGames = games.filter(g => g.status === 'scheduled').slice(0, 5);
  const recentGames = games.filter(g => g.status === 'completed').slice(0, 5);
  const isAdmin = user?.role === 'admin';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
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
              {isAdmin && !isSuperAdmin && teams.length === 0 && (
                <Card className="relative overflow-hidden bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/30 dark:to-red-950/30 border-2 border-orange-200 dark:border-orange-800 shadow-xl">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-orange-400/20 to-transparent rounded-full blur-3xl"></div>
                  <CardHeader className="relative z-10">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                        <Trophy className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-2xl font-black text-gray-900 dark:text-white">
                          Welcome to {organization?.name || 'Your Organization'}!
                        </CardTitle>
                        <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                          Let's get your sports league set up
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="relative z-10">
                    <p className="text-gray-700 dark:text-gray-300 mb-6 font-medium">
                      You're all set as an organization admin! Here's what you can do next:
                    </p>
                    <div className="grid md:grid-cols-2 gap-4">
                      <Link to={createPageUrl("Divisions")}>
                        <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-2 border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-lg transition-all cursor-pointer">
                          <CardContent className="p-4">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                                <Trophy className="w-5 h-5 text-white" />
                              </div>
                              <h3 className="font-black text-gray-900 dark:text-white">Create Divisions</h3>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Organize your league into divisions (optional)
                            </p>
                          </CardContent>
                        </Card>
                      </Link>

                      <Link to={createPageUrl("Teams")}>
                        <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-2 border-gray-200 dark:border-gray-700 hover:border-green-400 dark:hover:border-green-600 hover:shadow-lg transition-all cursor-pointer">
                          <CardContent className="p-4">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                                <Users className="w-5 h-5 text-white" />
                              </div>
                              <h3 className="font-black text-gray-900 dark:text-white">Add Teams</h3>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Create your first team to get started
                            </p>
                          </CardContent>
                        </Card>
                      </Link>

                      <Link to={createPageUrl("Players")}>
                        <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-2 border-gray-200 dark:border-gray-700 hover:border-purple-400 dark:hover:border-purple-600 hover:shadow-lg transition-all cursor-pointer">
                          <CardContent className="p-4">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                                <Users className="w-5 h-5 text-white" />
                              </div>
                              <h3 className="font-black text-gray-900 dark:text-white">Manage Players</h3>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Add players to your teams
                            </p>
                          </CardContent>
                        </Card>
                      </Link>

                      <Link to={createPageUrl("Games")}>
                        <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-2 border-gray-200 dark:border-gray-700 hover:border-orange-400 dark:hover:border-orange-600 hover:shadow-lg transition-all cursor-pointer">
                          <CardContent className="p-4">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                                <Calendar className="w-5 h-5 text-white" />
                              </div>
                              <h3 className="font-black text-gray-900 dark:text-white">Schedule Games</h3>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Set up your game schedule
                            </p>
                          </CardContent>
                        </Card>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div>
                <div className="flex items-center gap-3 mb-2">
                  {isSuperAdmin && (
                    <div className="px-4 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-black rounded-full shadow-lg">
                      SUPER ADMIN
                    </div>
                  )}
                </div>
                <h1 className="text-4xl font-black text-gray-900 dark:text-white">Dashboard</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-2 font-medium">
                  {isSuperAdmin ? 'System-wide overview' : `Welcome to ${organization?.name || 'your organization'}`}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {isSuperAdmin && (
                  <Card className="relative overflow-hidden border-2 border-purple-100 dark:border-purple-900 bg-gradient-to-br from-white to-purple-50 dark:from-gray-800 dark:to-purple-950/30 shadow-lg hover:shadow-xl transition-all group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500/20 to-transparent rounded-full blur-2xl"></div>
                    <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
                      <CardTitle className="text-sm font-bold text-gray-600 dark:text-gray-400">Organizations</CardTitle>
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                        <Building2 className="w-5 h-5 text-white" />
                      </div>
                    </CardHeader>
                    <CardContent className="relative z-10">
                      <div className="text-4xl font-black text-gray-900 dark:text-white mb-1">{organizations.length}</div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold">Active organizations</p>
                    </CardContent>
                  </Card>
                )}

                <Card className="relative overflow-hidden border-2 border-blue-100 dark:border-blue-900 bg-gradient-to-br from-white to-blue-50 dark:from-gray-800 dark:to-blue-950/30 shadow-lg hover:shadow-xl transition-all group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/20 to-transparent rounded-full blur-2xl"></div>
                  <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
                    <CardTitle className="text-sm font-bold text-gray-600 dark:text-gray-400">Teams</CardTitle>
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                      <Users className="w-5 h-5 text-white" />
                    </div>
                  </CardHeader>
                  <CardContent className="relative z-10">
                    <div className="text-4xl font-black text-gray-900 dark:text-white mb-1">{teams.length}</div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold">
                      {teams.filter(t => t.sport === 'basketball').length} Basketball · {teams.filter(t => t.sport === 'volleyball').length} Volleyball
                    </p>
                  </CardContent>
                </Card>

                <Card className="relative overflow-hidden border-2 border-orange-100 dark:border-orange-900 bg-gradient-to-br from-white to-orange-50 dark:from-gray-800 dark:to-orange-950/30 shadow-lg hover:shadow-xl transition-all group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-orange-500/20 to-transparent rounded-full blur-2xl"></div>
                  <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
                    <CardTitle className="text-sm font-bold text-gray-600 dark:text-gray-400">Players</CardTitle>
                    <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                      <Trophy className="w-5 h-5 text-white" />
                    </div>
                  </CardHeader>
                  <CardContent className="relative z-10">
                    <div className="text-4xl font-black text-gray-900 dark:text-white mb-1">{players.length}</div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold">Total registered</p>
                  </CardContent>
                </Card>

                <Card className="relative overflow-hidden border-2 border-green-100 dark:border-green-900 bg-gradient-to-br from-white to-green-50 dark:from-gray-800 dark:to-green-950/30 shadow-lg hover:shadow-xl transition-all group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-500/20 to-transparent rounded-full blur-2xl"></div>
                    <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
                      <CardTitle className="text-sm font-bold text-gray-600 dark:text-gray-400">Games</CardTitle>
                      <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                        <Calendar className="w-5 h-5 text-white" />
                      </div>
                    </CardHeader>
                  <CardContent className="relative z-10">
                    <div className="text-4xl font-black text-gray-900 dark:text-white mb-1">{games.length}</div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold">
                      {games.filter(g => g.status === 'scheduled').length} upcoming
                    </p>
                  </CardContent>
                </Card>
              </div>

              {(teams.length > 0 || games.length > 0) && (
                <AIInsights
                  teams={teams}
                  players={players}
                  games={games}
                  organizationName={isSuperAdmin ? "ALAB Sports System" : organization?.name}
                />
              )}

              <div className="grid lg:grid-cols-2 gap-8">
                <Card className="border-2 border-gray-100 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-xl">
                  <CardHeader className="border-b-2 border-gray-100 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-transparent dark:from-blue-950/30 dark:to-transparent">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                          <Calendar className="w-5 h-5 text-white" />
                        </div>
                        <CardTitle className="text-xl font-black text-gray-900 dark:text-white">Upcoming Games</CardTitle>
                      </div>
                      <Link to={createPageUrl(isSuperAdmin ? "AllGames" : "Games")} className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-bold flex items-center gap-1">
                        View all
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    {upcomingGames.length === 0 ? (
                      <div className="text-center py-16">
                        <Calendar className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                        <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">No upcoming games</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {upcomingGames.map((game) => (
                          <div key={game.id} className="relative overflow-hidden border-2 border-gray-100 dark:border-gray-700 rounded-xl p-4 hover:shadow-lg transition-all bg-gradient-to-r from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 group">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs text-gray-500 dark:text-gray-400 font-semibold">{new Date(game.game_date).toLocaleDateString()}</span>
                              <Badge className={`font-bold ${
                                game.sport === 'basketball'
                                  ? 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800'
                                  : 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800'
                              }`}>
                                {game.sport}
                              </Badge>
                            </div>
                            <div className="text-sm font-bold text-gray-900 dark:text-white">
                              Home vs Away
                            </div>
                            {game.location && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 font-medium">📍 {game.location}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-2 border-gray-100 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-xl">
                  <CardHeader className="border-b-2 border-gray-100 dark:border-gray-700 bg-gradient-to-r from-green-50 to-transparent dark:from-green-950/30 dark:to-transparent">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                        <Trophy className="w-5 h-5 text-white" />
                      </div>
                      <CardTitle className="text-xl font-black text-gray-900 dark:text-white">Recent Results</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    {recentGames.length === 0 ? (
                      <div className="text-center py-16">
                        <Trophy className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                        <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">No completed games</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {recentGames.map((game) => (
                          <div key={game.id} className="relative overflow-hidden border-2 border-gray-100 dark:border-gray-700 rounded-xl p-5 bg-gradient-to-r from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 hover:shadow-lg transition-all">
                            <div className="flex items-center justify-between mb-4">
                              <span className="text-xs text-gray-500 dark:text-gray-400 font-semibold">{new Date(game.game_date).toLocaleDateString()}</span>
                              <Badge className="bg-green-100 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800 font-bold">
                                FINAL
                              </Badge>
                            </div>
                            <div className="flex justify-between items-center">
                              <div className="flex-1">
                                <div className="text-sm font-bold text-gray-900 dark:text-white mb-1">Home</div>
                                <div className="text-3xl font-black text-blue-600 dark:text-blue-400">{game.home_score}</div>
                              </div>
                              <div className="text-gray-300 dark:text-gray-600 text-2xl font-black px-4">-</div>
                              <div className="flex-1 text-right">
                                <div className="text-sm font-bold text-gray-900 dark:text-white mb-1">Away</div>
                                <div className="text-3xl font-black text-gray-900 dark:text-white">{game.away_score}</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}