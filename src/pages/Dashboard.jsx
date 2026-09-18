import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Users, Trophy, Calendar, Plus, PlayCircle } from "lucide-react";
import { format } from "date-fns";
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
import TimerPanel from "@/components/TimerPanel";
import KpiTile from "@/components/dashboard/KpiTile";

function ResultLine({ game, homeTeam, awayTeam, label }) {
  if (!game) return null;
  return (
    <Link to="/games" className="flex items-center justify-between gap-2 py-2 hover:bg-muted transition-colors -mx-2 px-2 rounded-sm">
      <span className="text-[10px] font-heading font-bold uppercase tracking-widest text-muted-foreground w-16 shrink-0">{label}</span>
      <span className="text-sm font-medium text-foreground truncate flex-1 text-center">
        {homeTeam?.name || "TBD"} <span className="text-muted-foreground">vs</span> {awayTeam?.name || "TBD"}
      </span>
      <span className="font-heading text-sm font-bold tabular-nums text-primary whitespace-nowrap">
        {game.home_score ?? 0}–{game.away_score ?? 0}
      </span>
    </Link>
  );
}

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

  const hasLatestResults = latestResults.basketball || latestResults.volleyball;

  return (
    <div className="arena-command min-h-screen bg-background text-foreground">
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
            <div className="max-w-7xl mx-auto space-y-6">
              {/* Header */}
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

              {/* Setup card */}
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

              {/* Row 1: Featured hero + KPI rail */}
              {organization && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="lg:col-span-2 space-y-4">
                    {featuredGame ? (
                      <>
                        <FeaturedMatch
                          game={featuredGame}
                          homeTeam={teamMap[featuredGame.home_team_id]}
                          awayTeam={teamMap[featuredGame.away_team_id]}
                        />
                        <TimerPanel gameId={featuredGame.id} game={featuredGame} variant="compact" />
                      </>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

                    {hasLatestResults && (
                      <div className="rounded-lg border border-border bg-card p-4">
                        <div className="text-[10px] font-heading font-bold uppercase tracking-widest text-muted-foreground mb-2">
                          Latest Results
                        </div>
                        <div className="divide-y divide-border">
                          <ResultLine
                            game={latestResults.basketball}
                            homeTeam={latestResults.basketball ? teamMap[latestResults.basketball.home_team_id] : null}
                            awayTeam={latestResults.basketball ? teamMap[latestResults.basketball.away_team_id] : null}
                            label="Basketball"
                          />
                          <ResultLine
                            game={latestResults.volleyball}
                            homeTeam={latestResults.volleyball ? teamMap[latestResults.volleyball.home_team_id] : null}
                            awayTeam={latestResults.volleyball ? teamMap[latestResults.volleyball.away_team_id] : null}
                            label="Volleyball"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* KPI rail */}
                  <div className="grid grid-cols-2 gap-3 content-start">
                    <KpiTile
                      icon={PlayCircle}
                      label="Live"
                      value={liveGamesCount}
                      sub="Games now"
                      accent={liveGamesCount > 0}
                    />
                    <KpiTile
                      icon={Trophy}
                      label="Completed"
                      value={completedGamesCount}
                      sub="Games played"
                    />
                    <KpiTile
                      icon={Building2}
                      label="Organizations"
                      value={organizationCount}
                      sub={isSuperAdmin ? 'System-wide' : 'Your org'}
                    />
                    <KpiTile
                      icon={Users}
                      label="Teams"
                      value={teams.length}
                      sub="Active teams"
                    />
                    <KpiTile
                      icon={Trophy}
                      label="Players"
                      value={players.length}
                      sub="Registered"
                    />
                    <KpiTile
                      icon={Calendar}
                      label="Games"
                      value="Schedule"
                      sub="Manage games →"
                      to="/games"
                    />
                  </div>
                </div>
              )}

              {/* Division Standings */}
              {organization && teams.length > 0 && (
                <DivisionStandings teams={teams} games={games} />
              )}

              {/* Sport Showcase */}
              {organization && teams.length > 0 && (
                <SportShowcase basketballTeams={basketballTeams} volleyballTeams={volleyballTeams} />
              )}

              {/* Recent Activity + Upcoming Games */}
              {organization && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <RecentActivity
                    organizationId={currentOrgId}
                    teams={teams}
                    players={players}
                  />
                  <Card>
                    <CardHeader className="border-b border-border py-4">
                      <CardTitle className="text-base font-heading font-bold flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-primary" /> Upcoming Games
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                      {upcomingGames.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-6 text-center">No upcoming games scheduled</p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {upcomingGames.map((g) => (
                            <Link
                              key={g.id}
                              to="/games"
                              className="rounded-lg border border-border bg-card p-3 hover:border-primary/40 transition-colors"
                            >
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-7 h-7 rounded-full border border-border bg-secondary flex items-center justify-center shrink-0">
                                  <span className="text-[10px] font-heading font-bold text-foreground">
                                    {(teamMap[g.home_team_id]?.name || "?").slice(0, 2).toUpperCase()}
                                  </span>
                                </div>
                                <span className="text-sm font-medium text-foreground truncate flex-1">
                                  {teamMap[g.home_team_id]?.name || 'TBD'}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-7 h-7 rounded-full border border-border bg-secondary flex items-center justify-center shrink-0">
                                  <span className="text-[10px] font-heading font-bold text-foreground">
                                    {(teamMap[g.away_team_id]?.name || "?").slice(0, 2).toUpperCase()}
                                  </span>
                                </div>
                                <span className="text-sm font-medium text-foreground truncate flex-1">
                                  {teamMap[g.away_team_id]?.name || 'TBD'}
                                </span>
                              </div>
                              <p className="text-xs text-primary tabular-nums mt-2">
                                {g.game_date ? format(new Date(g.game_date), "EEE, MMM d · h:mm a") : ""}
                              </p>
                            </Link>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Top Scorer Spotlight */}
              {organization && players.length > 0 && (
                <TopScorerSpotlight organizationId={currentOrgId} players={players} teams={teams} />
              )}

              {/* Category Leaders */}
              {organization && (
                <CategoryLeaders
                  organizationId={currentOrgId}
                  players={players}
                  teams={teams}
                />
              )}

              {/* Recent activity fallback when no organization */}
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

      <AIAssistant />
    </div>
  );
}