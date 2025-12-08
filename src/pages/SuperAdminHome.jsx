import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Users, Trophy, Calendar, TrendingUp, Activity, Loader2, ChevronRight, Shield, Clock, Database } from "lucide-react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";
import AdminHeader from "@/components/AdminHeader";
import AdminSidebar from "@/components/AdminSidebar";

export default function SuperAdminHome() {
  const [user, setUser] = useState(null);
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

  const loadUser = async () => {
    const currentUser = await base44.auth.me();
    setUser(currentUser);
    
    if (currentUser?.role !== 'admin' || !currentUser?.is_super_admin) {
      window.location.href = createPageUrl("Dashboard");
    }
  };

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

  const handleLogout = () => {
    base44.auth.logout(createPageUrl("PublicLanding"));
  };

  const { data: allOrganizations = [] } = useQuery({
    queryKey: ['all-organizations'],
    queryFn: () => base44.entities.Organization.list(),
    enabled: !!user,
    refetchInterval: 30000,
  });

  const { data: allTeams = [] } = useQuery({
    queryKey: ['all-teams'],
    queryFn: () => base44.entities.Team.list(),
    enabled: !!user,
    refetchInterval: 30000,
  });

  const { data: allPlayers = [] } = useQuery({
    queryKey: ['all-players'],
    queryFn: () => base44.entities.Player.list(),
    enabled: !!user,
    refetchInterval: 30000,
  });

  const { data: allGames = [] } = useQuery({
    queryKey: ['all-games'],
    queryFn: () => base44.entities.Game.list('-game_date'),
    enabled: !!user,
    refetchInterval: 30000,
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['all-users'],
    queryFn: () => base44.entities.User.list(),
    enabled: !!user,
    refetchInterval: 30000,
  });

  const { data: pendingAdminRequests = [], isError: adminRequestsError } = useQuery({
    queryKey: ['pending-admin-requests'],
    queryFn: async () => {
      try {
        const requests = await base44.entities.AdminRequest.list();
        console.log("All AdminRequests fetched:", requests);
        return requests.filter(r => r.status === 'pending');
      } catch (error) {
        console.error("Error fetching admin requests:", error);
        return [];
      }
    },
    enabled: !!user,
    refetchInterval: 30000,
  });

  const activeOrganizations = allOrganizations.filter(org => org.status === 'active');
  const inactiveOrganizations = allOrganizations.filter(org => org.status === 'inactive');

  const completedGames = allGames.filter(g => g.status === 'completed');
  const scheduledGames = allGames.filter(g => g.status === 'scheduled');

  const organizationsWithStats = allOrganizations.map(org => {
    const orgTeams = allTeams.filter(t => t.organization_id === org.id);
    const orgPlayers = allPlayers.filter(p => {
      const team = allTeams.find(t => t.id === p.team_id);
      return team?.organization_id === org.id;
    });
    const orgGames = allGames.filter(g => g.organization_id === org.id);
    const orgCompletedGames = orgGames.filter(g => g.status === 'completed');

    return {
      ...org,
      teamsCount: orgTeams.length,
      playersCount: orgPlayers.length,
      gamesCount: orgGames.length,
      completedGamesCount: orgCompletedGames.length,
      basketballTeams: orgTeams.filter(t => t.sport === 'basketball').length,
      volleyballTeams: orgTeams.filter(t => t.sport === 'volleyball').length,
    };
  }).sort((a, b) => b.teamsCount - a.teamsCount);

  const topOrganizations = organizationsWithStats.slice(0, 5);

  const activityData = allOrganizations.slice(0, 10).map(org => {
    const orgGames = allGames.filter(g => g.organization_id === org.id);
    return {
      name: org.name.length > 15 ? org.name.substring(0, 15) + '...' : org.name,
      games: orgGames.length,
    };
  });

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-indigo-50/30 to-gray-50 dark:from-gray-900 dark:via-indigo-950/10 dark:to-gray-900">
      <AdminHeader 
        user={user}
        organization={null}
        darkMode={darkMode}
        toggleDarkMode={toggleDarkMode}
        handleLogout={handleLogout}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />

      <div className="flex">
        <AdminSidebar 
          user={user}
          organization={null}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          handleLogout={handleLogout}
        />

        <main className="flex-1 min-w-0">
          <div className="p-6 lg:p-8">
            <div className="max-w-7xl mx-auto space-y-8">
              {/* Welcome Header */}
              <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 rounded-2xl p-8 shadow-2xl">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNnoiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLXdpZHRoPSIwLjUiIG9wYWNpdHk9IjAuMSIvPjwvZz48L3N2Zz4=')] opacity-20"></div>
                <div className="relative z-10">
                  <h1 className="text-4xl md:text-5xl font-black text-white mb-3">
                    Welcome, Super Admin
                  </h1>
                  <p className="text-xl text-blue-100 font-medium">
                    Platform Overview • {activeOrganizations.length} Active Organizations
                  </p>
                </div>
              </div>

              {/* Key Platform Metrics */}
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="bg-gradient-to-br from-blue-500 to-blue-600 border-0 shadow-xl text-white hover:shadow-2xl transition-all">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-sm font-bold opacity-90">
                      <Building2 className="w-4 h-4" />
                      Organizations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-5xl font-black mb-2">{allOrganizations.length}</div>
                    <div className="flex items-center gap-4 text-sm">
                      <div>
                        <span className="opacity-80">✅ Active:</span>
                        <span className="font-bold ml-1">{activeOrganizations.length}</span>
                      </div>
                      <div>
                        <span className="opacity-80">⏸️ Inactive:</span>
                        <span className="font-bold ml-1">{inactiveOrganizations.length}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-orange-500 to-orange-600 border-0 shadow-xl text-white hover:shadow-2xl transition-all">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-sm font-bold opacity-90">
                      <Users className="w-4 h-4" />
                      Teams
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-5xl font-black mb-2">{allTeams.length}</div>
                    <div className="flex items-center gap-4 text-sm">
                      <div>
                        <span className="opacity-80">🏀</span>
                        <span className="font-bold ml-1">{allTeams.filter(t => t.sport === 'basketball').length}</span>
                      </div>
                      <div>
                        <span className="opacity-80">🏐</span>
                        <span className="font-bold ml-1">{allTeams.filter(t => t.sport === 'volleyball').length}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-purple-500 to-purple-600 border-0 shadow-xl text-white hover:shadow-2xl transition-all">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-sm font-bold opacity-90">
                      <Trophy className="w-4 h-4" />
                      Players
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-5xl font-black mb-2">{allPlayers.length}</div>
                    <p className="text-sm opacity-80">Registered athletes</p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-green-500 to-green-600 border-0 shadow-xl text-white hover:shadow-2xl transition-all">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-sm font-bold opacity-90">
                      <Calendar className="w-4 h-4" />
                      Games
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-5xl font-black mb-2">{allGames.length}</div>
                    <div className="flex items-center gap-4 text-sm">
                      <div>
                        <span className="opacity-80">✅</span>
                        <span className="font-bold ml-1">{completedGames.length}</span>
                      </div>
                      <div>
                        <span className="opacity-80">📅</span>
                        <span className="font-bold ml-1">{scheduledGames.length}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Quick Actions */}
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Link to={createPageUrl("SuperAdminDashboard")}>
                  <Card className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl transition-all cursor-pointer group">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                            <Activity className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h3 className="font-black text-gray-900 dark:text-white">Analytics Dashboard</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Detailed insights</p>
                          </div>
                        </div>
                        <ChevronRight className="w-6 h-6 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>

                <Link to={createPageUrl("Organizations")}>
                  <Card className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl transition-all cursor-pointer group">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg">
                            <Building2 className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h3 className="font-black text-gray-900 dark:text-white">Manage Organizations</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Add or edit orgs</p>
                          </div>
                        </div>
                        <ChevronRight className="w-6 h-6 text-gray-400 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>

                <Link to={createPageUrl("DataBackup")}>
                  <Card className="bg-white dark:bg-gray-800 border-2 border-green-200 dark:border-green-700 shadow-lg hover:shadow-xl transition-all cursor-pointer group">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                            <Database className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h3 className="font-black text-gray-900 dark:text-white">Data Backups</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Manage backups</p>
                          </div>
                        </div>
                        <ChevronRight className="w-6 h-6 text-gray-400 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>

                <Link to={createPageUrl("AdminApprovals")}>
                  <Card className={`bg-white dark:bg-gray-800 border-2 shadow-lg hover:shadow-xl transition-all cursor-pointer group ${pendingAdminRequests.length > 0 ? 'border-red-400 dark:border-red-600' : 'border-gray-200 dark:border-gray-700'}`}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg relative ${pendingAdminRequests.length > 0 ? 'bg-gradient-to-br from-red-500 to-red-600' : 'bg-gradient-to-br from-purple-500 to-purple-600'}`}>
                            <Shield className="w-6 h-6 text-white" />
                            {pendingAdminRequests.length > 0 && (
                              <span className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse border-2 border-white">
                                {pendingAdminRequests.length}
                              </span>
                            )}
                          </div>
                          <div>
                            <h3 className="font-black text-gray-900 dark:text-white">Admin Approvals</h3>
                            <p className={`text-sm ${pendingAdminRequests.length > 0 ? 'text-red-600 dark:text-red-400 font-bold' : 'text-gray-500 dark:text-gray-400'}`}>
                              {pendingAdminRequests.length > 0 ? `${pendingAdminRequests.length} pending request(s)!` : 'Review requests'}
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="w-6 h-6 text-gray-400 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </div>

              {/* Top Organizations */}
              <Card className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl font-black text-gray-900 dark:text-white">
                    <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                    Top 5 Organizations by Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {topOrganizations.map((org, index) => (
                      <Link
                        key={org.id}
                        to={createPageUrl("SuperAdminDashboard") + `?org=${org.id}`}
                        className="block"
                      >
                        <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all cursor-pointer group">
                          <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl font-black text-white text-xl shadow-lg">
                            #{index + 1}
                          </div>
                          <div className="flex-1">
                            <h3 className="font-black text-lg text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              {org.name}
                            </h3>
                            <div className="flex items-center gap-4 mt-1">
                              <Badge className="bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800 font-bold">
                                {org.teamsCount} Teams
                              </Badge>
                              <Badge className="bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800 font-bold">
                                {org.playersCount} Players
                              </Badge>
                              <Badge className="bg-green-100 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800 font-bold">
                                {org.completedGamesCount} Games
                              </Badge>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="flex gap-2">
                              {org.basketballTeams > 0 && (
                                <div className="text-sm font-bold text-orange-600 dark:text-orange-400">
                                  🏀 {org.basketballTeams}
                                </div>
                              )}
                              {org.volleyballTeams > 0 && (
                                <div className="text-sm font-bold text-blue-600 dark:text-blue-400">
                                  🏐 {org.volleyballTeams}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Activity Chart */}
              <Card className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-xl font-black text-gray-900 dark:text-white">
                    Organization Activity (Games Played)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={activityData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="games" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* All Organizations Grid */}
              <Card className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 shadow-lg">
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-xl font-black text-gray-900 dark:text-white">
                      All Registered Organizations
                    </CardTitle>
                    <Link to={createPageUrl("Organizations")}>
                      <Badge className="bg-blue-600 text-white hover:bg-blue-700 cursor-pointer font-bold">
                        View All →
                      </Badge>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {organizationsWithStats.map((org) => (
                      <Card
                        key={org.id}
                        className={`border-2 shadow-md hover:shadow-xl transition-all ${
                          org.status === 'active'
                            ? 'bg-gradient-to-br from-white to-green-50 dark:from-gray-900 dark:to-green-950/20 border-green-200 dark:border-green-800'
                            : 'bg-gradient-to-br from-white to-gray-100 dark:from-gray-900 dark:to-gray-800 border-gray-300 dark:border-gray-600 opacity-60'
                        }`}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="font-black text-lg text-gray-900 dark:text-white truncate">
                                {org.name}
                              </h3>
                              <Badge className={`mt-2 font-bold ${
                                org.status === 'active'
                                  ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800'
                                  : 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600'
                              }`}>
                                {org.status === 'active' ? '✅ Active' : '⏸️ Inactive'}
                              </Badge>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div className="bg-white dark:bg-gray-800 rounded-lg p-2">
                              <div className="text-xl font-black text-orange-600 dark:text-orange-400">
                                {org.teamsCount}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 font-semibold">
                                Teams
                              </div>
                            </div>
                            <div className="bg-white dark:bg-gray-800 rounded-lg p-2">
                              <div className="text-xl font-black text-purple-600 dark:text-purple-400">
                                {org.playersCount}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 font-semibold">
                                Players
                              </div>
                            </div>
                            <div className="bg-white dark:bg-gray-800 rounded-lg p-2">
                              <div className="text-xl font-black text-green-600 dark:text-green-400">
                                {org.gamesCount}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 font-semibold">
                                Games
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}