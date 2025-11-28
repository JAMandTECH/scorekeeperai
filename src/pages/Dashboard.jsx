import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Users, Trophy, Calendar, TrendingUp, Plus, PlayCircle, Sun, Moon, LogOut } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import AdminHeader from "@/components/AdminHeader";
import AdminSidebar from "@/components/AdminSidebar";
import AIInsights from "@/components/AIInsights";

export default function Dashboard() {
  const [user, setUser] = useState(null);
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
      
      // Redirect scorekeepers to their dashboard
      if (currentUser.is_scorekeeper && currentUser.role !== 'admin') {
        navigate(createPageUrl("ScorekeeperDashboard"));
        return;
      }
      
      // Only allow admins
      if (currentUser.role !== 'admin') {
        navigate(createPageUrl("Home"));
        return;
      }
      
      setUser(currentUser);
    } catch (error) {
      console.error("Error loading user:", error);
      base44.auth.redirectToLogin(createPageUrl("Dashboard"));
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    base44.auth.logout(createPageUrl("PublicLanding"));
  };

  const { data: organization } = useQuery({
    queryKey: ['organization', user?.organization_id],
    queryFn: async () => {
      const orgs = await base44.entities.Organization.list();
      return orgs.find(o => o.id === user?.organization_id);
    },
    enabled: !!user?.organization_id,
  });

  const { data: allOrganizations = [] } = useQuery({
    queryKey: ['all-organizations'],
    queryFn: () => base44.entities.Organization.list(),
    enabled: user?.role === 'admin' && user?.is_super_admin === true,
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['teams', user?.organization_id],
    queryFn: () => base44.entities.Team.filter({ organization_id: user?.organization_id }),
    enabled: !!user?.organization_id,
  });

  const { data: players = [] } = useQuery({
    queryKey: ['players', user?.organization_id],
    queryFn: async () => {
      const orgTeams = await base44.entities.Team.filter({ organization_id: user?.organization_id });
      const teamIds = orgTeams.map(t => t.id);
      if (teamIds.length === 0) return [];
      const allPlayers = await base44.entities.Player.list();
      return allPlayers.filter(p => teamIds.includes(p.team_id));
    },
    enabled: !!user?.organization_id,
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  const isSuperAdmin = user?.role === 'admin' && user?.is_super_admin === true;
  const organizationCount = isSuperAdmin ? allOrganizations.length : (organization ? 1 : 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-50 dark:from-gray-900 dark:via-blue-950/10 dark:to-gray-900 mesh-gradient">
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
              <div>
                <h1 className="text-4xl font-black text-gray-900 dark:text-white">
                  {isSuperAdmin ? 'Super Admin Dashboard' : 'Organization Dashboard'}
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-2 font-medium">
                  {isSuperAdmin 
                    ? 'Manage all organizations and system-wide settings' 
                    : organization 
                      ? `Manage ${organization.name}` 
                      : 'Loading organization...'}
                </p>
              </div>

              {!organization && !isSuperAdmin && (
                <Card className="border-2 border-yellow-200 dark:border-yellow-800 bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-950/30 dark:to-orange-950/30 shadow-xl">
                  <CardHeader>
                    <CardTitle className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-3">
                      <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl flex items-center justify-center">
                        <Building2 className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                      </div>
                      Complete Your Setup
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-gray-700 dark:text-gray-300 font-medium">
                      Welcome! To get started with your sports league management, you need to create your organization first.
                    </p>
                    <Link to={createPageUrl("Organizations")}>
                      <Button className="bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white font-bold shadow-lg">
                        <Plus className="w-5 h-5 mr-2" />
                        Create Your Organization
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="relative overflow-hidden border border-blue-200/50 dark:border-blue-800/50 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl shadow-futuristic hover:shadow-futuristic-lg transition-all duration-500 card-hover group">
                  <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-full blur-3xl group-hover:opacity-60 transition-opacity"></div>
                  <div className="absolute inset-0 shimmer opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  <CardHeader className="relative z-10">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-bold text-gray-600 dark:text-gray-400">Organizations</CardTitle>
                      <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                        <Building2 className="w-5 h-5 text-white" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="relative z-10">
                    <p className="text-5xl font-black text-gradient-primary">{organizationCount}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-semibold mt-2">
                      {isSuperAdmin ? 'System-wide' : 'Your organization'}
                    </p>
                  </CardContent>
                </Card>

                <Card className="relative overflow-hidden border border-orange-200/50 dark:border-orange-800/50 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl shadow-futuristic hover:shadow-futuristic-lg transition-all duration-500 card-hover group">
                  <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-full blur-3xl group-hover:opacity-60 transition-opacity"></div>
                  <div className="absolute inset-0 shimmer opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  <CardHeader className="relative z-10">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-bold text-gray-600 dark:text-gray-400">Teams</CardTitle>
                      <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                        <Users className="w-5 h-5 text-white" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="relative z-10">
                    <p className="text-5xl font-black text-gradient-warm">{teams.length}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-semibold mt-2">
                      Active teams
                    </p>
                  </CardContent>
                </Card>

                <Card className="relative overflow-hidden border border-green-200/50 dark:border-green-800/50 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl shadow-futuristic hover:shadow-futuristic-lg transition-all duration-500 card-hover group">
                  <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-full blur-3xl group-hover:opacity-60 transition-opacity"></div>
                  <div className="absolute inset-0 shimmer opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  <CardHeader className="relative z-10">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-bold text-gray-600 dark:text-gray-400">Players</CardTitle>
                      <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                        <Trophy className="w-5 h-5 text-white" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="relative z-10">
                    <p className="text-5xl font-black bg-gradient-to-r from-green-500 to-emerald-500 bg-clip-text text-transparent">{players.length}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-semibold mt-2">
                      Registered players
                    </p>
                  </CardContent>
                </Card>

                <Link to={createPageUrl("Games")} className="block">
                  <Card className="relative overflow-hidden border border-purple-200/50 dark:border-purple-800/50 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl shadow-futuristic hover:shadow-futuristic-lg transition-all duration-500 h-full cursor-pointer card-hover group">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-full blur-3xl group-hover:opacity-60 transition-opacity"></div>
                    <div className="absolute inset-0 shimmer opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <CardHeader className="relative z-10">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-bold text-gray-600 dark:text-gray-400">Games</CardTitle>
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                          <Calendar className="w-5 h-5 text-white" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="relative z-10">
                      <p className="text-2xl font-black bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">View Schedule</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 font-semibold mt-2">
                        Manage games →
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              </div>

              {organization && teams.length > 0 && (
                <AIInsights
                  teams={teams}
                  players={players}
                  games={[]}
                  organizationName={organization.name}
                />
              )}

              <div className="grid md:grid-cols-2 gap-6">
                <Card className="border border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl shadow-futuristic">
                  <CardHeader className="border-b border-gray-200/50 dark:border-gray-700/50">
                    <CardTitle className="text-xl font-black text-gray-900 dark:text-white">Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-3">
                    <Link to={createPageUrl("Teams")}>
                      <Button className="w-full justify-start btn-futuristic bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 hover:from-orange-600 hover:via-red-600 hover:to-pink-600 text-white font-bold shadow-lg rounded-xl transition-all duration-300 hover:scale-[1.02]">
                        <Users className="w-5 h-5 mr-3" />
                        Manage Teams
                      </Button>
                    </Link>
                    <Link to={createPageUrl("Players")}>
                      <Button className="w-full justify-start btn-futuristic bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 hover:from-green-600 hover:via-emerald-600 hover:to-teal-600 text-white font-bold shadow-lg rounded-xl transition-all duration-300 hover:scale-[1.02]">
                        <Trophy className="w-5 h-5 mr-3" />
                        Manage Players
                      </Button>
                    </Link>
                    <Link to={createPageUrl("Games")}>
                      <Button className="w-full justify-start btn-futuristic bg-gradient-to-r from-purple-500 via-violet-500 to-indigo-500 hover:from-purple-600 hover:via-violet-600 hover:to-indigo-600 text-white font-bold shadow-lg rounded-xl transition-all duration-300 hover:scale-[1.02]">
                        <Calendar className="w-5 h-5 mr-3" />
                        Schedule Games
                      </Button>
                    </Link>
                    <Link to={createPageUrl("LiveScoring")}>
                      <Button className="w-full justify-start btn-futuristic bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 hover:from-cyan-600 hover:via-blue-600 hover:to-purple-600 text-white font-bold shadow-lg rounded-xl transition-all duration-300 hover:scale-[1.02] neon-glow-blue">
                        <PlayCircle className="w-5 h-5 mr-3" />
                        Live Scoring
                      </Button>
                    </Link>
                  </CardContent>
                </Card>

                <Card className="border border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl shadow-futuristic">
                  <CardHeader className="border-b border-gray-200/50 dark:border-gray-700/50">
                    <CardTitle className="text-xl font-black text-gray-900 dark:text-white">Recent Activity</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-gradient-to-br from-cyan-500/20 to-purple-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <TrendingUp className="w-8 h-8 text-cyan-600 dark:text-cyan-400" />
                      </div>
                      <p className="text-gray-500 dark:text-gray-400 font-medium">
                        Activity tracking coming soon
                      </p>
                    </div>
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