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

  const { data: superAdminData } = useQuery({
    queryKey: ['super-admin-data'],
    queryFn: async () => {
      const response = await base44.functions.invoke('getSuperAdminData', {});
      return response.data;
    },
    enabled: !!user,
    refetchInterval: 30000,
  });

  const allOrganizations = superAdminData?.organizations || [];
  const allTeams = superAdminData?.teams || [];
  const allPlayers = superAdminData?.players || [];
  const allGames = superAdminData?.games || [];
  const allUsers = superAdminData?.users || [];
  const pendingAdminRequests = superAdminData?.pendingAdminRequests || [];

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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
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
              <div className="border border-border bg-card p-8">
                <h1 className="font-heading text-4xl md:text-5xl font-bold tracking-tight mb-3">
                  Welcome, Super Admin
                </h1>
                <p className="text-lg text-muted-foreground font-medium">
                  Platform Overview • {activeOrganizations.length} Active Organizations
                </p>
              </div>

              {/* Key Platform Metrics */}
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-sm font-heading font-bold text-muted-foreground">
                      <Building2 className="w-4 h-4" />
                      Organizations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-heading font-bold tabular-nums mb-2">{allOrganizations.length}</div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div>
                        <span>Active:</span>
                        <span className="font-heading font-bold ml-1 text-foreground">{activeOrganizations.length}</span>
                      </div>
                      <div>
                        <span>Inactive:</span>
                        <span className="font-heading font-bold ml-1 text-foreground">{inactiveOrganizations.length}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-sm font-heading font-bold text-muted-foreground">
                      <Users className="w-4 h-4" />
                      Teams
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-heading font-bold tabular-nums mb-2">{allTeams.length}</div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div>
                        <span>BB:</span>
                        <span className="font-heading font-bold ml-1 text-foreground">{allTeams.filter(t => t.sport === 'basketball').length}</span>
                      </div>
                      <div>
                        <span>VB:</span>
                        <span className="font-heading font-bold ml-1 text-foreground">{allTeams.filter(t => t.sport === 'volleyball').length}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-sm font-heading font-bold text-muted-foreground">
                      <Trophy className="w-4 h-4" />
                      Players
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-heading font-bold tabular-nums mb-2">{allPlayers.length}</div>
                    <p className="text-sm text-muted-foreground">Registered athletes</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-sm font-heading font-bold text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      Games
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-heading font-bold tabular-nums mb-2">{allGames.length}</div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div>
                        <span>Done:</span>
                        <span className="font-heading font-bold ml-1 text-foreground">{completedGames.length}</span>
                      </div>
                      <div>
                        <span>Sched:</span>
                        <span className="font-heading font-bold ml-1 text-foreground">{scheduledGames.length}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Quick Actions */}
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Link to={createPageUrl("SuperAdminDashboard")}>
                  <Card className="hover:border-foreground/20 transition-colors cursor-pointer group">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 border border-border flex items-center justify-center">
                            <Activity className="w-6 h-6 text-foreground" />
                          </div>
                          <div>
                            <h3 className="font-heading font-bold text-foreground">Analytics Dashboard</h3>
                            <p className="text-sm text-muted-foreground">Detailed insights</p>
                          </div>
                        </div>
                        <ChevronRight className="w-6 h-6 text-muted-foreground group-hover:text-foreground transition-colors" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>

                <Link to={createPageUrl("Organizations")}>
                  <Card className="hover:border-foreground/20 transition-colors cursor-pointer group">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 border border-border flex items-center justify-center">
                            <Building2 className="w-6 h-6 text-foreground" />
                          </div>
                          <div>
                            <h3 className="font-heading font-bold text-foreground">Manage Organizations</h3>
                            <p className="text-sm text-muted-foreground">Add or edit orgs</p>
                          </div>
                        </div>
                        <ChevronRight className="w-6 h-6 text-muted-foreground group-hover:text-foreground transition-colors" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>

                <Link to={createPageUrl("DataBackup")}>
                  <Card className="hover:border-foreground/20 transition-colors cursor-pointer group">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 border border-border flex items-center justify-center">
                            <Database className="w-6 h-6 text-foreground" />
                          </div>
                          <div>
                            <h3 className="font-heading font-bold text-foreground">Data Backups</h3>
                            <p className="text-sm text-muted-foreground">Manage backups</p>
                          </div>
                        </div>
                        <ChevronRight className="w-6 h-6 text-muted-foreground group-hover:text-foreground transition-colors" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>

                <Link to={createPageUrl("AdminApprovals")}>
                  <Card className={`hover:border-foreground/20 transition-colors cursor-pointer group ${pendingAdminRequests.length > 0 ? 'border-primary' : ''}`}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 border border-border flex items-center justify-center relative">
                            <Shield className="w-6 h-6 text-foreground" />
                            {pendingAdminRequests.length > 0 && (
                              <span className="absolute -top-2 -right-2 w-6 h-6 bg-primary text-primary-foreground text-xs font-heading font-bold flex items-center justify-center border border-background">
                                {pendingAdminRequests.length}
                              </span>
                            )}
                          </div>
                          <div>
                            <h3 className="font-heading font-bold text-foreground">Admin Approvals</h3>
                            <p className={`text-sm ${pendingAdminRequests.length > 0 ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                              {pendingAdminRequests.length > 0 ? `${pendingAdminRequests.length} pending request(s)` : 'Review requests'}
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="w-6 h-6 text-muted-foreground group-hover:text-foreground transition-colors" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </div>

              {/* Top Organizations */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl font-heading font-bold">
                    <TrendingUp className="w-5 h-5 text-primary" />
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
                        <div className="flex items-center gap-4 p-4 bg-muted hover:bg-muted/60 transition-colors cursor-pointer group">
                          <div className="flex items-center justify-center w-12 h-12 border border-border font-heading font-bold text-foreground text-xl">
                            #{index + 1}
                          </div>
                          <div className="flex-1">
                            <h3 className="font-heading font-bold text-lg text-foreground group-hover:text-primary transition-colors">
                              {org.name}
                            </h3>
                            <div className="flex items-center gap-4 mt-1">
                              <Badge variant="outline" className="font-medium">
                                {org.teamsCount} Teams
                              </Badge>
                              <Badge variant="outline" className="font-medium">
                                {org.playersCount} Players
                              </Badge>
                              <Badge variant="outline" className="font-medium">
                                {org.completedGamesCount} Games
                              </Badge>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="flex gap-2">
                              {org.basketballTeams > 0 && (
                                <div className="text-sm font-heading font-bold text-muted-foreground">
                                  BB {org.basketballTeams}
                                </div>
                              )}
                              {org.volleyballTeams > 0 && (
                                <div className="text-sm font-heading font-bold text-muted-foreground">
                                  VB {org.volleyballTeams}
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
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl font-heading font-bold">
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
                      <Bar dataKey="games" fill="hsl(var(--primary))" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* All Organizations Grid */}
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-xl font-heading font-bold">
                      All Registered Organizations
                    </CardTitle>
                    <Link to={createPageUrl("Organizations")}>
                      <Badge className="cursor-pointer font-medium">
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
                        className={`hover:border-foreground/20 transition-colors ${
                          org.status === 'active' ? '' : 'opacity-60'
                        }`}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="font-heading font-bold text-lg text-foreground truncate">
                                {org.name}
                              </h3>
                              <Badge variant="outline" className={`mt-2 font-medium ${
                                org.status === 'active' ? 'border-primary text-primary' : 'border-border text-muted-foreground'
                              }`}>
                                {org.status === 'active' ? 'Active' : 'Inactive'}
                              </Badge>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div className="bg-muted p-2">
                              <div className="text-xl font-heading font-bold text-foreground tabular-nums">
                                {org.teamsCount}
                              </div>
                              <div className="text-xs text-muted-foreground font-medium">
                                Teams
                              </div>
                            </div>
                            <div className="bg-muted p-2">
                              <div className="text-xl font-heading font-bold text-foreground tabular-nums">
                                {org.playersCount}
                              </div>
                              <div className="text-xs text-muted-foreground font-medium">
                                Players
                              </div>
                            </div>
                            <div className="bg-muted p-2">
                              <div className="text-xl font-heading font-bold text-foreground tabular-nums">
                                {org.gamesCount}
                              </div>
                              <div className="text-xs text-muted-foreground font-medium">
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