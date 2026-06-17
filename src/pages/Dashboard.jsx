import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Users, Trophy, Calendar, TrendingUp, Plus, PlayCircle, Sun, Moon, LogOut, Sparkles } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import AdminHeader from "@/components/AdminHeader";
import AdminSidebar from "@/components/AdminSidebar";
import AIInsights from "@/components/AIInsights";
import AIAssistant from "@/components/AIAssistant";
import SubscriptionBadge from "@/components/subscription/SubscriptionBadge";
import RecentActivity from "@/components/dashboard/RecentActivity";
import CategoryLeaders from "@/components/dashboard/CategoryLeaders";
import SportShowcase from "@/components/dashboard/SportShowcase";
import FeaturedMatch from "@/components/dashboard/FeaturedMatch";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [showAIInsights, setShowAIInsights] = useState(() => localStorage.getItem('hideAIInsights') !== 'true');
  const navigate = useNavigate();

  const toggleAIInsights = () => {
    setShowAIInsights((prev) => {
      const next = !prev;
      localStorage.setItem('hideAIInsights', (!next).toString());
      return next;
    });
  };
  const currentOrgId = user?.active_organization_id || user?.organization_id;

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
        navigate("/scorekeeperdashboard");
        return;
      }
      
      // Only allow admins
      if (currentUser.role !== 'admin') {
        navigate("/");
        return;
      }
      
      setUser(currentUser);
    } catch (error) {
      console.error("Error loading user:", error);
      base44.auth.redirectToLogin("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    base44.auth.logout("/");
  };

  const { data: organization } = useQuery({
    queryKey: ['organization', currentOrgId],
    queryFn: async () => {
      const orgs = await base44.entities.Organization.list();
      return orgs.find(o => o.id === currentOrgId);
    },
    enabled: !!currentOrgId,
    refetchOnWindowFocus: true,
    refetchInterval: 10000,
  });

  const { data: allOrganizations = [] } = useQuery({
    queryKey: ['all-organizations'],
    queryFn: () => base44.entities.Organization.list(),
    enabled: user?.role === 'admin' && user?.is_super_admin === true,
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['teams', currentOrgId],
    queryFn: () => base44.entities.Team.filter({ organization_id: currentOrgId }),
    enabled: !!currentOrgId,
    refetchInterval: 15000,
  });

  const { data: players = [] } = useQuery({
    queryKey: ['players', currentOrgId],
    queryFn: async () => {
      const orgTeams = await base44.entities.Team.filter({ organization_id: currentOrgId });
      const teamIds = orgTeams.map(t => t.id);
      if (teamIds.length === 0) return [];
      const allPlayers = await base44.entities.Player.list();
      return allPlayers.filter(p => teamIds.includes(p.team_id));
    },
    enabled: !!currentOrgId,
    refetchInterval: 15000,
  });

  const { data: games = [] } = useQuery({
    queryKey: ['dashboard-games', currentOrgId],
    queryFn: () => base44.entities.Game.filter({ organization_id: currentOrgId }, '-game_date', 100),
    enabled: !!currentOrgId,
    refetchInterval: 15000,
  });

  const teamMap = React.useMemo(() => {
    const m = {};
    teams.forEach((t) => { m[t.id] = t; });
    return m;
  }, [teams]);

  const featuredGame = React.useMemo(() => {
    if (!games.length) return null;
    const live = games.find((g) => g.status === 'in_progress' && !g.archived);
    if (live) return live;
    const upcoming = games
      .filter((g) => g.status === 'scheduled' && !g.archived && g.game_date && new Date(g.game_date) >= new Date())
      .sort((a, b) => new Date(a.game_date) - new Date(b.game_date))[0];
    if (upcoming) return upcoming;
    return games.find((g) => g.status === 'completed' && !g.archived) || null;
  }, [games]);

  const basketballTeams = teams.filter((t) => t.sport === 'basketball').length;
  const volleyballTeams = teams.filter((t) => t.sport === 'volleyball').length;
  const liveGamesCount = games.filter((g) => g.status === 'in_progress' && !g.archived).length;
  const completedGamesCount = games.filter((g) => g.status === 'completed' && !g.archived).length;
  const upcomingGames = games
    .filter((g) => g.status === 'scheduled' && !g.archived && g.game_date && new Date(g.game_date) >= new Date())
    .sort((a, b) => new Date(a.game_date) - new Date(b.game_date))
    .slice(0, 4);

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
                {organization && (
                  <div className="mt-3 flex items-center gap-3">
                    <SubscriptionBadge organization={organization} />
                    {isSuperAdmin && (
                      <Link to="/subscriptionmanagement">
                        <Button variant="outline" size="sm">Manage Subscriptions</Button>
                      </Link>
                    )}
                  </div>
                )}
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
                    <Link to="/organizations">
                      <Button className="bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white font-bold shadow-lg">
                        <Plus className="w-5 h-5 mr-2" />
                        Create Your Organization
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              )}

              {organization && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2">
                    <FeaturedMatch
                      game={featuredGame}
                      homeTeam={featuredGame ? teamMap[featuredGame.home_team_id] : null}
                      awayTeam={featuredGame ? teamMap[featuredGame.away_team_id] : null}
                    />
                  </div>
                  <Card className="border border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl shadow-futuristic">
                    <CardHeader className="border-b border-gray-200/50 dark:border-gray-700/50 py-4">
                      <CardTitle className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-purple-500" /> Upcoming Games
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                      {upcomingGames.length === 0 ? (
                        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium py-6 text-center">No upcoming games scheduled</p>
                      ) : (
                        <div className="space-y-2">
                          {upcomingGames.map((g) => (
                            <Link key={g.id} to="/games" className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-gray-50 dark:bg-gray-700/30 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors">
                              <span className="text-sm font-bold text-gray-900 dark:text-white truncate flex-1">
                                {teamMap[g.home_team_id]?.name || 'TBD'} <span className="text-gray-400">vs</span> {teamMap[g.away_team_id]?.name || 'TBD'}
                              </span>
                              <span className="text-xs font-semibold text-purple-500 whitespace-nowrap">
                                {new Date(g.game_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                              </span>
                            </Link>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              {organization && teams.length > 0 && (
                <SportShowcase basketballTeams={basketballTeams} volleyballTeams={volleyballTeams} />
              )}

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
                <Card className="relative overflow-hidden border border-red-200/50 dark:border-red-800/50 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl shadow-futuristic hover:shadow-futuristic-lg transition-all duration-500 card-hover group">
                  <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-red-500/20 to-rose-500/20 rounded-full blur-3xl group-hover:opacity-60 transition-opacity"></div>
                  <CardHeader className="relative z-10">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-bold text-gray-600 dark:text-gray-400">Live</CardTitle>
                      <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-rose-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                        <PlayCircle className="w-5 h-5 text-white" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="relative z-10">
                    <p className="text-5xl font-black bg-gradient-to-r from-red-500 to-rose-500 bg-clip-text text-transparent">{liveGamesCount}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-semibold mt-2">Games now</p>
                  </CardContent>
                </Card>

                <Card className="relative overflow-hidden border border-indigo-200/50 dark:border-indigo-800/50 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl shadow-futuristic hover:shadow-futuristic-lg transition-all duration-500 card-hover group">
                  <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-indigo-500/20 to-blue-500/20 rounded-full blur-3xl group-hover:opacity-60 transition-opacity"></div>
                  <CardHeader className="relative z-10">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-bold text-gray-600 dark:text-gray-400">Completed</CardTitle>
                      <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                        <Trophy className="w-5 h-5 text-white" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="relative z-10">
                    <p className="text-5xl font-black bg-gradient-to-r from-indigo-500 to-blue-500 bg-clip-text text-transparent">{completedGamesCount}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-semibold mt-2">Games played</p>
                  </CardContent>
                </Card>

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

                <Link to="/games" className="block">
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
                <div>
                  <div className="flex items-center justify-end gap-3 mb-4">
                    <Sparkles className="w-4 h-4 text-purple-500" />
                    <Label htmlFor="toggle-ai-insights" className="text-sm font-semibold text-gray-700 dark:text-gray-300 cursor-pointer">AI Insights</Label>
                    <Switch id="toggle-ai-insights" checked={showAIInsights} onCheckedChange={toggleAIInsights} />
                  </div>
                  {showAIInsights && (
                    <AIInsights
                      teams={teams}
                      players={players}
                      games={[]}
                      organizationName={organization.name}
                    />
                  )}
                </div>
              )}

              {organization && (
                <CategoryLeaders
                  organizationId={currentOrgId}
                  players={players}
                  teams={teams}
                />
              )}

              <RecentActivity
                organizationId={currentOrgId}
                teams={teams}
                players={players}
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}