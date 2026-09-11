import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Users, Trophy, Calendar, TrendingUp, Plus, PlayCircle, Sun, Moon, LogOut, CalendarCheck } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import AdminHeader from "@/components/AdminHeader";
import AdminSidebar from "@/components/AdminSidebar";
import AIAssistant from "@/components/AIAssistant";
import SubscriptionBadge from "@/components/subscription/SubscriptionBadge";
import RecentActivity from "@/components/dashboard/RecentActivity";
import TopScorerSpotlight from "@/components/dashboard/TopScorerSpotlight";
import CategoryLeaders from "@/components/dashboard/CategoryLeaders";
import SportShowcase from "@/components/dashboard/SportShowcase";
import FeaturedMatch from "@/components/dashboard/FeaturedMatch";
import DivisionStandings from "@/components/dashboard/DivisionStandings";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const navigate = useNavigate();

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

      // Fetch fresh user data from DB (auth.me() may return stale token data)
      let user = currentUser;
      try {
        const allUsers = await base44.entities.User.list();
        const freshUser = allUsers.find(u => u.id === currentUser.id);
        if (freshUser) user = { ...currentUser, ...freshUser };
      } catch (e) {
        console.error('Failed to fetch fresh user data:', e);
      }

      // Super admins manage the whole platform — send them to the platform dashboard
      if (user.role === 'admin' && user.is_super_admin === true) {
        navigate("/SuperAdminHome");
        return;
      }

      // Redirect scorekeepers to their dashboard
      if (currentUser.is_scorekeeper && currentUser.role !== 'admin') {
        navigate("/scorekeeperdashboard");
        return;
      }
      
      // Admins and registered organization members can view the dashboard.
      // Users with no organization association are sent home.
      const belongsToOrg = user.active_organization_id || user.organization_id;
      if (user.role !== 'admin' && !belongsToOrg) {
        navigate("/");
        return;
      }
      
      setUser(user);
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
    queryKey: ['user-organization', currentOrgId],
    queryFn: async () => {
      const res = await base44.functions.invoke('getUserOrganization', {});
      return res.data?.organization || null;
    },
    enabled: !!currentOrgId,
    refetchOnWindowFocus: true,
    refetchInterval: 30000,
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
      const teamIds = orgTeams.map(t => t.id).filter(Boolean);
      if (teamIds.length === 0) return [];
      // Player.list() is paginated and caps results — fetch by team_ids in chunks so no player is missed.
      const chunkSize = 50;
      const out = [];
      for (let i = 0; i < teamIds.length; i += chunkSize) {
        const chunk = teamIds.slice(i, i + chunkSize);
        try {
          const part = await base44.entities.Player.filter({ team_id: { $in: chunk } }, '-created_date', 2000);
          out.push(...part);
        } catch (_) {
          const per = await Promise.all(
            chunk.map((id) => base44.entities.Player.filter({ team_id: id }, '-created_date', 2000).catch(() => []))
          );
          out.push(...per.flat());
        }
      }
      return out;
    },
    enabled: !!currentOrgId,
    refetchInterval: 15000,
  });

  const { data: games = [] } = useQuery({
    queryKey: ['dashboard-games', currentOrgId],
    queryFn: () => base44.entities.Game.filter({ organization_id: currentOrgId }, '-game_date'),
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
    return null;
  }, [games]);

  // Latest completed result per sport (shown when no live/upcoming match)
  const latestResults = React.useMemo(() => {
    const pickLatest = (sport) =>
      games
        .filter((g) => g.sport === sport && g.status === 'completed' && !g.archived && g.game_date)
        .sort((a, b) => new Date(b.game_date) - new Date(a.game_date))[0] || null;
    return {
      basketball: pickLatest('basketball'),
      volleyball: pickLatest('volleyball'),
    };
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
      </div>
    );
  }

  const isSuperAdmin = user?.role === 'admin' && user?.is_super_admin === true;
  const isAdmin = user?.role === 'admin';
  const organizationCount = isSuperAdmin ? allOrganizations.length : (organization ? 1 : 0);

  return (
    <div className="min-h-screen bg-background text-foreground">
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
                <h1 className="font-heading text-3xl font-bold tracking-tight">
                  {isSuperAdmin ? 'Super Admin Dashboard' : 'Organization Dashboard'}
                </h1>
                <p className="text-muted-foreground mt-2">
                  {isSuperAdmin 
                    ? 'Manage all organizations and system-wide settings' 
                    : organization 
                      ? `Manage ${organization.name}` 
                      : 'Loading organization...'}
                </p>
                {organization && isAdmin && (
                  <div className="mt-3 flex items-center gap-3 flex-wrap">
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
                <Card>
                  <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-3">
                      <Building2 className="w-5 h-5 text-primary" />
                      Complete Your Setup
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-muted-foreground">
                      Welcome! To get started with your sports league management, you need to create your organization first.
                    </p>
                    <Link to="/organizations">
                      <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        Create Your Organization
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              )}

              {organization && teams.length > 0 && (
                <DivisionStandings teams={teams} games={games} />
              )}

              {organization && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2">
                    {featuredGame ? (
                      <FeaturedMatch
                        game={featuredGame}
                        homeTeam={teamMap[featuredGame.home_team_id]}
                        awayTeam={teamMap[featuredGame.away_team_id]}
                      />
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 h-full">
                        <FeaturedMatch
                          game={latestResults.basketball}
                          homeTeam={latestResults.basketball ? teamMap[latestResults.basketball.home_team_id] : null}
                          awayTeam={latestResults.basketball ? teamMap[latestResults.basketball.away_team_id] : null}
                        />
                        <FeaturedMatch
                          game={latestResults.volleyball}
                          homeTeam={latestResults.volleyball ? teamMap[latestResults.volleyball.home_team_id] : null}
                          awayTeam={latestResults.volleyball ? teamMap[latestResults.volleyball.away_team_id] : null}
                        />
                      </div>
                    )}
                  </div>
                  <Card>
                    <CardHeader className="border-b border-border py-4">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" /> Upcoming Games
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                      {upcomingGames.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-6 text-center">No upcoming games scheduled</p>
                      ) : (
                        <div className="space-y-0">
                          {upcomingGames.map((g) => (
                            <Link key={g.id} to="/games" className="flex items-center justify-between gap-2 py-3 border-b border-border last:border-0 hover:bg-muted transition-colors -mx-2 px-2">
                              <span className="text-sm font-medium truncate flex-1">
                                {teamMap[g.home_team_id]?.name || 'TBD'} <span className="text-muted-foreground">vs</span> {teamMap[g.away_team_id]?.name || 'TBD'}
                              </span>
                              <span className="text-xs text-primary whitespace-nowrap tabular-nums">
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

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-px bg-border border border-border">
                <Card className="border-0 rounded-none">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xs text-muted-foreground font-medium">Live</CardTitle>
                      <PlayCircle className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="font-heading text-3xl font-bold tabular-nums">{liveGamesCount}</p>
                    <p className="text-xs text-muted-foreground mt-1">Games now</p>
                  </CardContent>
                </Card>

                <Card className="border-0 rounded-none">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xs text-muted-foreground font-medium">Completed</CardTitle>
                      <Trophy className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="font-heading text-3xl font-bold tabular-nums">{completedGamesCount}</p>
                    <p className="text-xs text-muted-foreground mt-1">Games played</p>
                  </CardContent>
                </Card>

                <Card className="border-0 rounded-none">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xs text-muted-foreground font-medium">Organizations</CardTitle>
                      <Building2 className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="font-heading text-3xl font-bold tabular-nums">{organizationCount}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {isSuperAdmin ? 'System-wide' : 'Your org'}
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-0 rounded-none">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xs text-muted-foreground font-medium">Teams</CardTitle>
                      <Users className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="font-heading text-3xl font-bold tabular-nums">{teams.length}</p>
                    <p className="text-xs text-muted-foreground mt-1">Active teams</p>
                  </CardContent>
                </Card>

                <Card className="border-0 rounded-none">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xs text-muted-foreground font-medium">Players</CardTitle>
                      <Trophy className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="font-heading text-3xl font-bold tabular-nums">{players.length}</p>
                    <p className="text-xs text-muted-foreground mt-1">Registered</p>
                  </CardContent>
                </Card>

                <Link to="/games" className="block">
                  <Card className="border-0 rounded-none h-full cursor-pointer hover:bg-muted transition-colors">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-xs text-muted-foreground font-medium">Games</CardTitle>
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="font-heading text-lg font-bold text-primary">View Schedule</p>
                      <p className="text-xs text-muted-foreground mt-1">Manage games →</p>
                    </CardContent>
                  </Card>
                </Link>
              </div>

              {organization && players.length > 0 && (
                <TopScorerSpotlight organizationId={currentOrgId} players={players} teams={teams} />
              )}

              {organization && (
                <CategoryLeaders
                  organizationId={currentOrgId}
                  players={players}
                  teams={teams}
                  rightColumnExtra={
                    <RecentActivity
                      organizationId={currentOrgId}
                      teams={teams}
                      players={players}
                    />
                  }
                />
              )}

              {!organization && (
                <RecentActivity
                  organizationId={currentOrgId}
                  teams={teams}
                  players={players}
                />
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}