import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlayCircle, Calendar, MapPin, Clock, CheckCircle, Home as HomeIcon, Clipboard, MessageCircle, BarChart3 } from "lucide-react";
import AdminHeader from "@/components/AdminHeader";
import AdminSidebar from "@/components/AdminSidebar";

export default function ScorekeeperDashboard() {
  const [user, setUser] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    loadUser();
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    setDarkMode(savedDarkMode);
    if (savedDarkMode) document.documentElement.classList.add('dark');
  }, []);

  const toggleDarkMode = () => {
    const next = !darkMode;
    setDarkMode(next);
    localStorage.setItem('darkMode', next.toString());
    document.documentElement.classList.toggle('dark', next);
  };

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      if (!currentUser.is_scorekeeper) {
        window.location.href = createPageUrl("Home");
      }
    } catch {
      base44.auth.redirectToLogin(createPageUrl("ScorekeeperDashboard"));
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => base44.auth.logout(createPageUrl("Home"));

  const { data: organization } = useQuery({
    queryKey: ['organization', user?.organization_id, user?.active_organization_id],
    queryFn: async () => {
      const res = await base44.functions.invoke('getUserOrganization', {});
      return res?.data?.organization || null;
    },
    enabled: !!user?.organization_id || !!user?.active_organization_id,
  });

  const { data: myGames = [] } = useQuery({
    queryKey: ['my-scorekeeper-games', user?.email, user?.organization_id, user?.active_organization_id],
    queryFn: async () => {
      const orgId = user?.organization_id || user?.active_organization_id;
      const allGames = await base44.entities.Game.filter(
        orgId ? { organization_id: orgId } : {},
        '-game_date'
      );
      const myEmail = (user?.email || '').toLowerCase();
      return allGames.filter(game => {
        const arr = Array.isArray(game.assigned_scorekeeper_emails) ? game.assigned_scorekeeper_emails.map(e => (e || '').toLowerCase()) : [];
        const legacy = (game.assigned_scorekeeper_email || '').toLowerCase();
        const overall = (game.overall_scorekeeper_email || '').toLowerCase();
        const homeStat = (game.home_statistician_email || '').toLowerCase();
        const awayStat = (game.away_statistician_email || '').toLowerCase();
        return arr.includes(myEmail) || legacy === myEmail || overall === myEmail || homeStat === myEmail || awayStat === myEmail;
      });
    },
    enabled: !!user?.email && (!!user?.organization_id || !!user?.active_organization_id),
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: () => base44.entities.Team.list(),
  });

  if (loading || !user) {
    return (
      <div className="arena-command min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
      </div>
    );
  }

  const getTeamName = (teamId) => teams.find(t => t.id === teamId)?.name || 'Unknown';

  const scheduledGames = myGames.filter(g => g.status === 'scheduled');
  const inProgressGames = myGames.filter(g => g.status === 'in_progress');
  const completedGames = myGames.filter(g => g.status === 'completed');

  const scorekeeperNav = [
    { title: "Organization Home", url: createPageUrl("Home"), icon: HomeIcon },
    { title: "Dashboard", url: createPageUrl("Dashboard"), icon: BarChart3 },
    { title: "My Games", url: createPageUrl("ScorekeeperDashboard"), icon: Clipboard },
    { title: "Social Feed", url: createPageUrl("SocialFeed"), icon: MessageCircle },
  ];

  const statusBadge = (status) => {
    if (status === 'in_progress') return <Badge variant="default" className="gap-1"><PlayCircle className="w-3 h-3" />In Progress</Badge>;
    if (status === 'completed') return <Badge variant="outline" className="gap-1"><CheckCircle className="w-3 h-3" />Completed</Badge>;
    return <Badge variant="secondary" className="gap-1"><Clock className="w-3 h-3" />Scheduled</Badge>;
  };

  const GameCard = ({ game }) => (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-border py-3 px-4">
        <div className="flex items-center justify-between">
          {statusBadge(game.status)}
          <Badge variant="outline" className="uppercase">{game.sport}</Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
          <Calendar className="w-3 h-3" />
          {new Date(game.game_date).toLocaleDateString()} at {new Date(game.game_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
        {game.court_number && <p className="text-xs text-muted-foreground mt-1">Court {game.court_number}</p>}
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        <div className="rounded-sm border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="font-heading font-bold text-foreground">{getTeamName(game.home_team_id)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">HOME</p>
            </div>
            {game.status === 'completed' ? (
              <div className="flex items-center gap-3">
                <span className="font-heading text-3xl font-bold tabular-nums text-primary">{game.home_score}</span>
                <span className="text-muted-foreground text-xl">–</span>
                <span className="font-heading text-3xl font-bold tabular-nums">{game.away_score}</span>
              </div>
            ) : (
              <span className="text-muted-foreground text-lg font-heading">vs</span>
            )}
            <div className="flex-1 text-right">
              <p className="font-heading font-bold text-foreground">{getTeamName(game.away_team_id)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">AWAY</p>
            </div>
          </div>
        </div>
        {game.location && (
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <MapPin className="w-3 h-3" /> {game.location}
          </p>
        )}
        {game.status === 'scheduled' && (
          <Link to={createPageUrl(game.sport === 'volleyball' ? 'LiveScoringVolleyball' : 'LiveScoring') + `?game_id=${game.id}`}>
            <Button className="w-full"><PlayCircle className="w-4 h-4 mr-2" />Start Game</Button>
          </Link>
        )}
        {game.status === 'in_progress' && (
          <Link to={createPageUrl(game.sport === 'volleyball' ? 'LiveScoringVolleyball' : 'LiveScoring') + `?game_id=${game.id}`}>
            <Button className="w-full"><PlayCircle className="w-4 h-4 mr-2" />Continue Scoring</Button>
          </Link>
        )}
      </CardContent>
    </Card>
  );

  const Section = ({ title, games }) => (
    <div>
      <h2 className="font-heading text-xl font-bold tracking-tight mb-4">{title}</h2>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {games.map(game => <GameCard key={game.id} game={game} />)}
      </div>
    </div>
  );

  return (
    <div className="arena-command min-h-screen bg-background text-foreground">
      <AdminHeader user={user} organization={organization} darkMode={darkMode} toggleDarkMode={toggleDarkMode} handleLogout={handleLogout} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <div className="flex">
        <AdminSidebar user={user} organization={organization} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} handleLogout={handleLogout} navigationItems={scorekeeperNav} />
        <main className="flex-1 min-w-0">
          <div className="p-6 lg:p-8">
            <div className="max-w-7xl mx-auto space-y-8">
              <div>
                <h1 className="font-heading text-3xl font-bold tracking-tight">My Games</h1>
                <p className="text-muted-foreground mt-2">Welcome, {user.full_name}. You have {scheduledGames.length} upcoming game{scheduledGames.length !== 1 ? 's' : ''} to score.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-xs font-heading font-bold uppercase tracking-widest text-muted-foreground">Scheduled</CardTitle></CardHeader>
                  <CardContent><div className="font-heading text-3xl font-bold tabular-nums">{scheduledGames.length}</div></CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-xs font-heading font-bold uppercase tracking-widest text-muted-foreground">In Progress</CardTitle></CardHeader>
                  <CardContent><div className="font-heading text-3xl font-bold tabular-nums text-primary">{inProgressGames.length}</div></CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-xs font-heading font-bold uppercase tracking-widest text-muted-foreground">Completed</CardTitle></CardHeader>
                  <CardContent><div className="font-heading text-3xl font-bold tabular-nums">{completedGames.length}</div></CardContent>
                </Card>
              </div>

              {scheduledGames.length > 0 && <Section title="Upcoming Games" games={scheduledGames} />}
              {inProgressGames.length > 0 && <Section title="Games In Progress" games={inProgressGames} />}
              {completedGames.length > 0 && <Section title="Recently Completed" games={completedGames.slice(0, 6)} />}

              {myGames.length === 0 && (
                <div className="text-center py-20">
                  <div className="w-20 h-20 border border-border rounded-full flex items-center justify-center mx-auto mb-6">
                    <Calendar className="w-10 h-10 text-muted-foreground" />
                  </div>
                  <h3 className="font-heading text-xl font-bold mb-2">No Games Assigned Yet</h3>
                  <p className="text-muted-foreground mb-6">You don't have any games assigned to you at the moment.</p>
                  <Link to={createPageUrl("Home")}>
                    <Button variant="outline"><HomeIcon className="w-4 h-4 mr-2" />Go to Organization Home</Button>
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