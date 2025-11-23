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
                <Card className="relative overflow-hidden border-2 border-blue-100 dark:border-blue-900 bg-gradient-to-br from-white to-blue-50 dark:from-gray-800 dark:to-blue-950/30 shadow-lg hover:shadow-2xl transition-all">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/20 to-transparent rounded-full blur-3xl"></div>
                  <CardHeader className="relative z-10">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-bold text-gray-600 dark:text-gray-400">Organizations</CardTitle>
                      <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                  </CardHeader>
                  <CardContent className="relative z-10">
                    <p className="text-4xl font-black text-gray-900 dark:text-white">{organizationCount}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-semibold mt-2">
                      {isSuperAdmin ? 'System-wide' : 'Your organization'}
                    </p>
                  </CardContent>
                </Card>

                <Card className="relative overflow-hidden border-2 border-orange-100 dark:border-orange-900 bg-gradient-to-br from-white to-orange-50 dark:from-gray-800 dark:to-orange-950/30 shadow-lg hover:shadow-2xl transition-all">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-orange-500/20 to-transparent rounded-full blur-3xl"></div>
                  <CardHeader className="relative z-10">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-bold text-gray-600 dark:text-gray-400">Teams</CardTitle>
                      <Users className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                    </div>
                  </CardHeader>
                  <CardContent className="relative z-10">
                    <p className="text-4xl font-black text-gray-900 dark:text-white">{teams.length}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-semibold mt-2">
                      Active teams
                    </p>
                  </CardContent>
                </Card>

                <Card className="relative overflow-hidden border-2 border-green-100 dark:border-green-900 bg-gradient-to-br from-white to-green-50 dark:from-gray-800 dark:to-green-950/30 shadow-lg hover:shadow-2xl transition-all">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-500/20 to-transparent rounded-full blur-3xl"></div>
                  <CardHeader className="relative z-10">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-bold text-gray-600 dark:text-gray-400">Players</CardTitle>
                      <Trophy className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                  </CardHeader>
                  <CardContent className="relative z-10">
                    <p className="text-4xl font-black text-gray-900 dark:text-white">{players.length}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-semibold mt-2">
                      Registered players
                    </p>
                  </CardContent>
                </Card>

                <Link to={createPageUrl("Games")} className="block">
                  <Card className="relative overflow-hidden border-2 border-purple-100 dark:border-purple-900 bg-gradient-to-br from-white to-purple-50 dark:from-gray-800 dark:to-purple-950/30 shadow-lg hover:shadow-2xl transition-all h-full cursor-pointer group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500/20 to-transparent rounded-full blur-3xl"></div>
                    <CardHeader className="relative z-10">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-bold text-gray-600 dark:text-gray-400">Games</CardTitle>
                        <Calendar className="w-5 h-5 text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform" />
                      </div>
                    </CardHeader>
                    <CardContent className="relative z-10">
                      <p className="text-2xl font-black text-gray-900 dark:text-white">View Schedule</p>
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
                <Card className="border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg">
                  <CardHeader className="border-b border-gray-200 dark:border-gray-700">
                    <CardTitle className="text-xl font-black text-gray-900 dark:text-white">Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-3">
                    <Link to={createPageUrl("Teams")}>
                      <Button className="w-full justify-start bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white font-bold shadow-md">
                        <Users className="w-5 h-5 mr-3" />
                        Manage Teams
                      </Button>
                    </Link>
                    <Link to={createPageUrl("Players")}>
                      <Button className="w-full justify-start bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold shadow-md">
                        <Trophy className="w-5 h-5 mr-3" />
                        Manage Players
                      </Button>
                    </Link>
                    <Link to={createPageUrl("Games")}>
                      <Button className="w-full justify-start bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-bold shadow-md">
                        <Calendar className="w-5 h-5 mr-3" />
                        Schedule Games
                      </Button>
                    </Link>
                    <Link to={createPageUrl("LiveScoring")}>
                      <Button className="w-full justify-start bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold shadow-md">
                        <PlayCircle className="w-5 h-5 mr-3" />
                        Live Scoring
                      </Button>
                    </Link>
                  </CardContent>
                </Card>

                <Card className="border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg">
                  <CardHeader className="border-b border-gray-200 dark:border-gray-700">
                    <CardTitle className="text-xl font-black text-gray-900 dark:text-white">Recent Activity</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="text-center py-8">
                      <TrendingUp className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
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