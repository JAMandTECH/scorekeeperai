import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Calendar, ArrowRight, Sun, Moon, Building2, Trophy, Users, LogOut, BarChart3, Home as HomeIcon, PlayCircle, MessageCircle, UserPlus, Video } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import AdminHeader from "@/components/AdminHeader";
import AdminSidebar from "@/components/AdminSidebar";
import AIAssistant from "@/components/AIAssistant";
import LiveStreamEmbed from "@/components/LiveStreamEmbed";
import BasketballSection from "@/components/home/BasketballSection";
import VolleyballSection from "@/components/home/VolleyballSection";
import StatsFetchingIndicator from "@/components/stats/StatsFetchingIndicator";
import StatsRefreshControl from "@/components/stats/StatsRefreshControl";
import { useStatsRefresh } from "@/lib/StatsRefreshContext";

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [bbDivTab, setBbDivTab] = useState('open');
  const { autoRefreshStats, refreshIntervalMs } = useStatsRefresh();
  const navigate = useNavigate();

  useEffect(() => {
    initializePage();
  }, []);

  const initializePage = async () => {
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    setDarkMode(savedDarkMode);
    document.documentElement.classList.toggle('dark', savedDarkMode);

    try {
      const authenticated = await base44.auth.isAuthenticated();
      setIsAuthenticated(authenticated);

      if (authenticated) {
        const currentUser = await base44.auth.me();

        if (currentUser?.role === 'admin' && currentUser?.is_super_admin === true) {
          navigate(createPageUrl("SuperAdminHome"));
          return;
        }

        const hasOrg = currentUser?.organization_id || currentUser?.active_organization_id;
        if (!currentUser?.onboarding_completed && !hasOrg && currentUser?.role !== 'admin') {
          navigate(createPageUrl("RoleSelection"));
          return;
        }

        setUser(currentUser);
        const activeOrgId = currentUser?.active_organization_id || currentUser?.organization_id
          || currentUser?.data?.active_organization_id || currentUser?.data?.organization_id;
        if (activeOrgId) {
          try {
            const res = await base44.functions.invoke('getUserOrganization', {});
            setOrganization(res?.data?.organization || null);
          } catch {
            setOrganization(null);
          }
        }
      } else {
        setUser(null);
        setOrganization(null);
      }
    } catch {
      setIsAuthenticated(false);
      setUser(null);
      setOrganization(null);
    } finally {
      setLoading(false);
    }
  };

  const toggleDarkMode = () => {
    const next = !darkMode;
    setDarkMode(next);
    localStorage.setItem('darkMode', next.toString());
    document.documentElement.classList.toggle('dark', next);
  };

  const handleLogout = () => base44.auth.logout(createPageUrl("Home"));

  const superAdminNav = [
    { title: "Home", url: createPageUrl("Home"), icon: HomeIcon },
    { title: "Dashboard", url: createPageUrl("Dashboard"), icon: BarChart3 },
    { title: "Organizations", url: createPageUrl("Organizations"), icon: Building2 },
    { title: "All Teams", url: createPageUrl("AllTeams"), icon: Users },
    { title: "All Games", url: createPageUrl("AllGames"), icon: Calendar },
    { title: "Admin Approvals", url: createPageUrl("AdminApprovals"), icon: Building2 },
  ];

  const adminNav = [
    { title: "Home", url: createPageUrl("Home"), icon: HomeIcon },
    { title: "Dashboard", url: createPageUrl("Dashboard"), icon: BarChart3 },
    { title: "Divisions", url: createPageUrl("Divisions"), icon: Trophy },
    { title: "Teams", url: createPageUrl("Teams"), icon: Users },
    { title: "Players", url: createPageUrl("Players"), icon: Trophy },
    { title: "Games", url: createPageUrl("Games"), icon: Calendar },
    { title: "Scorekeepers", url: createPageUrl("Scorekeepers"), icon: Building2 },
    { title: "Live Scoring", url: createPageUrl("LiveScoring"), icon: PlayCircle },
    { title: "Statistics", url: createPageUrl("Statistics"), icon: BarChart3 },
  ];

  const userNav = [
    { title: "Home", url: createPageUrl("Home"), icon: HomeIcon },
    // Registered members of an organization can view the dashboard
    ...(user?.active_organization_id || user?.organization_id ? [{ title: "Dashboard", url: createPageUrl("Dashboard"), icon: BarChart3 }] : []),
    { title: "Teams", url: createPageUrl("Teams"), icon: Users },
    { title: "Players", url: createPageUrl("Players"), icon: Trophy },
    { title: "Register Team", url: createPageUrl("TeamRegistration"), icon: UserPlus },
    { title: "Join Organization", url: createPageUrl("JoinOrganization"), icon: Building2 },
    { title: "Social Feed", url: createPageUrl("SocialFeed"), icon: MessageCircle },
  ];

  const isSuperAdmin = user?.role === 'admin' && user?.is_super_admin === true;
  const isAdmin = user?.role === 'admin';
  const navigationItems = isSuperAdmin ? superAdminNav : (isAdmin ? adminNav : (user?.role_id ? null : userNav));

  const orgId = user?.active_organization_id || user?.organization_id;
  // Mirror Statistics: filter teams/games by org at query time (avoids default list() pagination cap missing records)
  const { data: allTeams = [] } = useQuery({
    queryKey: ['all-teams-home', orgId],
    queryFn: () => orgId ? base44.entities.Team.filter({ organization_id: orgId }) : base44.entities.Team.list(),
    enabled: isAuthenticated === true,
  });
  const { data: allPlayers = [] } = useQuery({
    queryKey: ['all-players-home', orgId, allTeams.length],
    queryFn: async () => {
      // Player.list() is paginated — fetch by team_ids of this org so we don't miss any.
      const teamIds = (allTeams || []).map((t) => t.id).filter(Boolean);
      if (teamIds.length === 0) return [];
      // Chunk team_ids to keep $in filter sizes safe.
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
    enabled: isAuthenticated === true && allTeams.length > 0,
    staleTime: 60000,
  });
  const { data: allGames = [] } = useQuery({
    queryKey: ['all-games-home', orgId],
    // Explicit sort + high limit so the FULL completed-game set loads — matches the
    // Dashboard leaderboard hook so both surfaces compute the identical games-played divisor.
    queryFn: () => orgId ? base44.entities.Game.filter({ organization_id: orgId }, '-game_date', 2000) : base44.entities.Game.list('-game_date', 2000),
    enabled: isAuthenticated === true,
    refetchInterval: 10000,
  });

  const teams = orgId ? allTeams.filter(t => t.organization_id === orgId) : allTeams;
  const games = orgId ? allGames.filter(g => g.organization_id === orgId) : allGames;
  const completedGames = games.filter(g => g.status === 'completed').sort((a, b) => new Date(b.game_date) - new Date(a.game_date));

  const teamIds = teams.map(t => t.id);
  const completedGameIds = completedGames.map(g => g.id).filter(Boolean);

  const { data: allPlayerStats = [], isFetching: isStatsFetching } = useQuery({
    queryKey: ['all-player-stats-home', completedGameIds.join(',')],
    queryFn: async () => {
      if (completedGameIds.length === 0) return [];
      // Chunk by game_id (proven Statistics-page path); isolate each chunk so
      // one failure never wipes the whole result set.
      const results = [];
      for (let i = 0; i < completedGameIds.length; i += 10) {
        const chunk = completedGameIds.slice(i, i + 10);
        try {
          const part = await base44.entities.PlayerGameStats.filter({ game_id: { $in: chunk } });
          results.push(...part);
        } catch (_) {
          const per = await Promise.all(
            chunk.map((id) => base44.entities.PlayerGameStats.filter({ game_id: id }).catch(() => []))
          );
          results.push(...per.flat());
        }
      }
      return results;
    },
    enabled: isAuthenticated === true && completedGameIds.length > 0,
    staleTime: 60000,
    gcTime: 10 * 60 * 1000,
    // Auto-refresh every 3 minutes when enabled; manual refresh always available via the button.
    refetchInterval: autoRefreshStats ? refreshIntervalMs : false,
    // Keep previous stats visible during background refetches so the UI never blanks out.
    placeholderData: (prev) => prev,
  });

  const players = allPlayers.filter(p => teamIds.includes(p.team_id));
  const playerStats = allPlayerStats;

  // EXACT mirror of Statistics' `createPlayerLeaderboard` totals & ordering.
  // Filtering pattern (same as Statistics): build the eligible-game set at the GAME level
  // (sport + division on either team), then aggregate stats unconditionally.
  // We additionally track gamesPlayed (distinct game_ids) so we can render PPG / RPG / APG averages.
  const getTopPlayers = (statType, sport = 'basketball', limit = 10, division = null) => {
    const teamsById = new Map(teams.map((t) => [t.id, t]));
    const playersByIdOrg = new Map(allPlayers.map((p) => [p.id, p]));

    // Mirror Statistics' filteredGameIds: completed + sport + (division on either team) — using GAMES not teams.
    const eligibleGames = games.filter((g) => {
      if (g.status !== 'completed') return false;
      if (sport && (g.sport || '').toLowerCase() !== sport.toLowerCase()) return false;
      if (division) {
        const homeDiv = teamsById.get(g.home_team_id)?.division || 'No Division';
        const awayDiv = teamsById.get(g.away_team_id)?.division || 'No Division';
        if (homeDiv !== division && awayDiv !== division) return false;
      }
      return true;
    });
    const eligibleGameIds = new Set(eligibleGames.map((g) => g.id));

    // How many eligible completed games each team played (home or away) — used as the average divisor.
    const teamGamesPlayed = new Map();
    eligibleGames.forEach((g) => {
      if (g.home_team_id) teamGamesPlayed.set(g.home_team_id, (teamGamesPlayed.get(g.home_team_id) || 0) + 1);
      if (g.away_team_id) teamGamesPlayed.set(g.away_team_id, (teamGamesPlayed.get(g.away_team_id) || 0) + 1);
    });

    const totals = new Map(); // player_id -> { total, team_id, gameIds:Set }
    playerStats.forEach((s) => {
      if (!eligibleGameIds.has(s.game_id)) return;

      // Same fallback as Statistics: team?.sport || selectedSport
      const team = teamsById.get(s.team_id);
      const statSport = (team?.sport || sport || '').toLowerCase();

      // Cross-division safety: in a game involving both an Open and a Veterans team,
      // only the team(s) actually in the selected division should contribute stats.
      // Without this, e.g. FOCUS (Open) playing a Veterans team would leak FOCUS players
      // (like Nicho Robinson) into the Veterans leaderboard.
      if (division) {
        const statDiv = team?.division || 'No Division';
        if (statDiv !== division) return;
      }

      let add = 0;
      if (statType === 'points') {
        if (statSport === 'volleyball') {
          const aces = Number(s.aces || 0);
          const attacks = Number(s.attacks || 0);
          const blocks = Number(s.blocks || 0);
          add = aces + attacks + blocks;
        } else {
          const stored = Number(s.points || 0);
          if (stored > 0) {
            add = stored;
          } else {
            const threes = Number(s.three_pointers || 0);
            const fgm = Number(s.field_goals_made || 0);
            const twos = Math.max(fgm - threes, 0);
            const ftm = Number(s.free_throws_made || 0);
            add = (twos * 2) + (threes * 3) + ftm;
          }
        }
      } else {
        add = Number(s[statType] || 0);
      }

      const prev = totals.get(s.player_id) || { total: 0, team_id: s.team_id, gameIds: new Set() };
      prev.total += add;
      prev.team_id = prev.team_id || s.team_id;
      // Games played = every eligible game the player has ANY stat row in (matches Statistics)
      prev.gameIds.add(s.game_id);
      totals.set(s.player_id, prev);
    });

    const normalizedSport = (sport || '').toLowerCase();
    const averageLabelMap = {
      points: normalizedSport === 'basketball' ? 'PPG' : 'Score/G',
      rebounds: 'RPG',
      assists: 'APG',
      blocks: 'BPG',
      three_pointers: normalizedSport === 'basketball' ? '3PG' : 'ACE/G',
      attacks: 'ATK/G',
    };
    const averageLabel = averageLabelMap[statType] || '';

    return Array.from(totals.entries())
      .map(([playerId, { total, team_id, gameIds }]) => {
        const player = playersByIdOrg.get(playerId);
        const team = teamsById.get(team_id);
        const gamesPlayed = teamGamesPlayed.get(team_id) || 0;
        const avgNum = gamesPlayed > 0 ? total / gamesPlayed : 0;
        return {
          ...(player || { id: playerId, first_name: 'Player', last_name: String(playerId).slice(-4) }),
          total,
          gamesPlayed,
          avgNum,
          average: gamesPlayed > 0 ? avgNum.toFixed(1) : '0.0',
          averageLabel,
          teamName: team?.name || 'Unknown',
          teamLogoUrl: team?.logo_url || '',
        };
      })
      .filter((p) => p.total > 0)
      .sort((a, b) => b.avgNum - a.avgNum)
      .slice(0, limit);
  };

  const getTeamStandings = (sport) => {
    const sportTeams = teams.filter(t => (t.sport || '').toLowerCase() === sport.toLowerCase());
    const divisions = [...new Set(sportTeams.map(t => t.division || 'No Division'))];
    return divisions.map(division => ({
      division,
      teams: sportTeams.filter(t => (t.division || 'No Division') === division).map(team => {
        const teamGames = games.filter(g => g.status === 'completed' && (g.game_type || 'regular_season') === 'regular_season' && (g.sport || '').toLowerCase() === sport.toLowerCase() && g.archived !== true && (g.home_team_id === team.id || g.away_team_id === team.id));
        let wins = 0, losses = 0, draws = 0, pointsFor = 0, pointsAgainst = 0;
        teamGames.forEach(game => {
          const isHome = game.home_team_id === team.id;
          let teamScore = isHome ? game.home_score : game.away_score;
          let oppScore = isHome ? game.away_score : game.home_score;
          if (sport === 'volleyball' && Array.isArray(game.quarter_scores) && game.quarter_scores.length > 0) {
            const homeTotal = game.quarter_scores.reduce((sum, s) => sum + (s.home || 0), 0);
            const awayTotal = game.quarter_scores.reduce((sum, s) => sum + (s.away || 0), 0);
            const homeSets = game.quarter_scores.filter(s => s.home > s.away).length;
            const awaySets = game.quarter_scores.filter(s => s.away > s.home).length;
            teamScore = isHome ? homeTotal : awayTotal;
            oppScore = isHome ? awayTotal : homeTotal;
            if (homeSets > awaySets) isHome ? wins++ : losses++;
            else if (awaySets > homeSets) isHome ? losses++ : wins++;
            else draws++;
          } else {
            if (teamScore > oppScore) wins++;
            else if (oppScore > teamScore) losses++;
            else draws++;
          }
          pointsFor += Number(teamScore || 0);
          pointsAgainst += Number(oppScore || 0);
        });
        const gamesPlayed = wins + losses + draws;
        return {
          ...team,
          wins,
          losses,
          draws,
          gamesPlayed,
          winPct: gamesPlayed > 0 ? (wins + draws * 0.5) / gamesPlayed : 0,
          avgPointsFor: gamesPlayed > 0 ? (pointsFor / gamesPlayed).toFixed(1) : 0,
          avgPointsAgainst: gamesPlayed > 0 ? (pointsAgainst / gamesPlayed).toFixed(1) : 0,
          diff: pointsFor - pointsAgainst,
        };
      }).sort((a, b) => b.winPct - a.winPct || b.diff - a.diff)
    }));
  };

  const basketballStandings = getTeamStandings('basketball');
  const basketballStandingsOpen = basketballStandings.filter(d => (d.division || '').toLowerCase().includes('open'));
  const basketballStandingsVeterans = basketballStandings.filter(d => (d.division || '').toLowerCase().includes('veteran'));
  const volleyballStandings = getTeamStandings('volleyball');

  const topScorersOpen = getTopPlayers('points', 'basketball', 10, 'Open Division');
  const topReboundersOpen = getTopPlayers('rebounds', 'basketball', 10, 'Open Division');
  const topBlockersOpen = getTopPlayers('blocks', 'basketball', 10, 'Open Division');
  const top3PointersOpen = getTopPlayers('three_pointers', 'basketball', 10, 'Open Division');
  const topScorersVeterans = getTopPlayers('points', 'basketball', 10, 'Veterans Division');
  const topReboundersVeterans = getTopPlayers('rebounds', 'basketball', 10, 'Veterans Division');
  const topBlockersVeterans = getTopPlayers('blocks', 'basketball', 10, 'Veterans Division');
  const top3PointersVeterans = getTopPlayers('three_pointers', 'basketball', 10, 'Veterans Division');

  const topVolleyballScorers = getTopPlayers('points', 'volleyball', 10);
  const topVolleyballAttackers = getTopPlayers('attacks', 'volleyball', 10);
  const topVolleyballBlockers = getTopPlayers('blocks', 'volleyball', 10);
  const topVolleyballAces = getTopPlayers('aces', 'volleyball', 10);

  const openTeamIds = teams.filter(t => (t.sport || '').toLowerCase() === 'basketball' && (t.division || '').toLowerCase().includes('open')).map(t => t.id);
  const veteransTeamIds = teams.filter(t => (t.sport || '').toLowerCase() === 'basketball' && (t.division || '').toLowerCase().includes('veteran')).map(t => t.id);

  const upcomingBasketballGamesOpen = games.filter(g => (g.sport || '').toLowerCase() === 'basketball' && g.status === 'scheduled' && (openTeamIds.includes(g.home_team_id) || openTeamIds.includes(g.away_team_id))).sort((a, b) => new Date(a.game_date) - new Date(b.game_date)).slice(0, 10);
  const completedBasketballGamesOpen = games.filter(g => (g.sport || '').toLowerCase() === 'basketball' && g.status === 'completed' && (openTeamIds.includes(g.home_team_id) || openTeamIds.includes(g.away_team_id))).sort((a, b) => new Date(b.game_date) - new Date(a.game_date)).slice(0, 10);
  const upcomingBasketballGamesVeterans = games.filter(g => (g.sport || '').toLowerCase() === 'basketball' && g.status === 'scheduled' && (veteransTeamIds.includes(g.home_team_id) || veteransTeamIds.includes(g.away_team_id))).sort((a, b) => new Date(a.game_date) - new Date(b.game_date)).slice(0, 10);
  const completedBasketballGamesVeterans = games.filter(g => (g.sport || '').toLowerCase() === 'basketball' && g.status === 'completed' && (veteransTeamIds.includes(g.home_team_id) || veteransTeamIds.includes(g.away_team_id))).sort((a, b) => new Date(b.game_date) - new Date(a.game_date)).slice(0, 10);
  const upcomingVolleyballGames = games.filter(g => (g.sport || '').toLowerCase() === 'volleyball' && g.status === 'scheduled').sort((a, b) => new Date(a.game_date) - new Date(b.game_date)).slice(0, 10);
  const completedVolleyballGames = games.filter(g => (g.sport || '').toLowerCase() === 'volleyball' && g.status === 'completed').sort((a, b) => new Date(b.game_date) - new Date(a.game_date)).slice(0, 10);

  const getTeamName = (teamId) => allTeams.find(t => t.id === teamId)?.name || 'Unknown';

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div></div>;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {user && <AdminHeader user={user} organization={organization} darkMode={darkMode} toggleDarkMode={toggleDarkMode} handleLogout={handleLogout} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />}
      <div className="flex">
        {user && <AdminSidebar user={user} organization={organization} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} handleLogout={handleLogout} navigationItems={navigationItems} />}
        <main className={user ? "flex-1 min-w-0" : "w-full"}>
          <section className="relative border-b border-border py-16 lg:py-20 px-4 overflow-hidden">
            {!user && <div className="absolute top-6 right-6 flex items-center gap-3 z-50"><button onClick={toggleDarkMode} className="p-2 text-muted-foreground hover:text-foreground transition-colors">{darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}</button>{isAuthenticated && <button onClick={handleLogout} className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"><LogOut className="w-4 h-4" /><span className="hidden sm:inline">Logout</span></button>}</div>}
            <div className="max-w-7xl mx-auto relative z-10">
              {organization && user ? (
                <div className="space-y-8">
                  <div className="flex flex-col lg:flex-row items-start gap-8 lg:gap-12">
                    <div className="flex items-center gap-5 flex-shrink-0">
                      <Avatar className="w-16 h-16 border border-border"><AvatarImage src={organization.logo_url} className="object-cover grayscale" /><AvatarFallback className="bg-secondary text-foreground font-heading font-bold text-xl">{organization.name?.substring(0, 2).toUpperCase()}</AvatarFallback></Avatar>
                      <div className="text-left">
                        <p className="text-xs text-muted-foreground mb-1 tracking-wide uppercase">Your Organization</p>
                        <h1 className="font-heading text-2xl md:text-3xl font-bold tracking-tight">{organization.name}</h1>
                        {organization.tournament_name && <p className="text-sm text-muted-foreground mt-1">{organization.tournament_name}</p>}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border border border-border flex-1 lg:max-w-2xl lg:ml-auto w-full">
                      <div className="bg-card p-4"><div className="font-heading text-2xl font-bold tabular-nums">{teams.length}</div><div className="text-xs text-muted-foreground mt-1">Teams</div></div>
                      <div className="bg-card p-4"><div className="font-heading text-2xl font-bold tabular-nums">{players.length}</div><div className="text-xs text-muted-foreground mt-1">Players</div></div>
                      <div className="bg-card p-4"><div className="font-heading text-2xl font-bold tabular-nums">{games.length}</div><div className="text-xs text-muted-foreground mt-1">Games</div></div>
                      <div className="bg-card p-4"><div className="font-heading text-2xl font-bold tabular-nums">{completedGames.length}</div><div className="text-xs text-muted-foreground mt-1">Completed</div></div>
                    </div>
                  </div>
                  <div className="flex gap-3 flex-wrap">{isAdmin && <Link to={createPageUrl("Dashboard")}><Button>Go to Dashboard<ArrowRight className="w-4 h-4 ml-2" /></Button></Link>}{!isAdmin && isAuthenticated && <Link to={createPageUrl("TeamRegistration")}><Button><UserPlus className="w-4 h-4 mr-2" />Register Your Team</Button></Link>}</div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-sm text-muted-foreground mb-4 tracking-wide">AI-Powered Sports League Management</p>
                  <h1 className="font-heading text-5xl md:text-6xl font-bold tracking-tight mb-4">Scorekeeper<span className="text-primary">AI</span></h1>
                  <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">Professional basketball and volleyball league management. Real-time scoring, live statistics, and tournament management.</p>
                  {!isAuthenticated && <div className="flex gap-3 justify-center flex-wrap"><Button size="lg" onClick={() => base44.auth.redirectToLogin(createPageUrl("Dashboard"))}>Get Started<ArrowRight className="w-4 h-4 ml-2" /></Button><Link to={createPageUrl("RequestAdminAccess")}><Button size="lg" variant="outline">Request Admin Access</Button></Link></div>}
                </div>
              )}
            </div>
          </section>

          {user && (
            <div className="max-w-7xl mx-auto px-4 py-16">
              {games.filter(g => g.status === 'in_progress').length > 0 && (
                <section className="mb-12">
                  <div className="flex items-center gap-3 mb-6"><span className="live-dot" /><h2 className="font-heading text-2xl font-bold tracking-tight">Games In Progress</h2><Badge variant="destructive" className="badge-pulse">LIVE</Badge></div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {games.filter(g => g.status === 'in_progress').map(game => {
                      const homeTeamData = allTeams.find(t => t.id === game.home_team_id);
                      const awayTeamData = allTeams.find(t => t.id === game.away_team_id);
                      if (!homeTeamData || !awayTeamData) return null;
                      return <Card key={game.id} className="overflow-hidden"><CardHeader className="border-b border-border py-3 px-4"><CardTitle className="text-base flex items-center justify-between"><div className="flex items-center gap-2"><span className="live-dot" /><span className="text-sm font-medium">LIVE</span></div><Badge variant="outline">{game.sport.toUpperCase()}</Badge></CardTitle></CardHeader><CardContent className="p-4"><div className="flex items-center justify-between mb-4"><div className="flex-1 text-center"><Avatar className="w-12 h-12 mx-auto mb-2 border border-border"><AvatarImage src={homeTeamData.logo_url} className="grayscale" /><AvatarFallback className="bg-secondary text-foreground text-sm font-heading font-bold">{homeTeamData.name?.substring(0, 2).toUpperCase()}</AvatarFallback></Avatar><p className="font-medium text-sm truncate">{homeTeamData.name}</p></div><div className="flex flex-col items-center mx-4"><span className="font-heading text-3xl font-bold tabular-nums">{game.home_score} - {game.away_score}</span></div><div className="flex-1 text-center"><Avatar className="w-12 h-12 mx-auto mb-2 border border-border"><AvatarImage src={awayTeamData.logo_url} className="grayscale" /><AvatarFallback className="bg-secondary text-foreground text-sm font-heading font-bold">{awayTeamData.name?.substring(0, 2).toUpperCase()}</AvatarFallback></Avatar><p className="font-medium text-sm truncate">{awayTeamData.name}</p></div></div>{game.stream_url && <div className="mb-4"><LiveStreamEmbed streamUrl={game.stream_url} gameTitle={`${homeTeamData.name} vs ${awayTeamData.name}`} /></div>}<div className="flex gap-2"><Link to={createPageUrl("PublicGameView") + `?game_id=${game.id}`} className="flex-1"><Button className="w-full"><PlayCircle className="w-4 h-4 mr-2" />View Live</Button></Link>{game.stream_url && <Button variant="outline" onClick={() => window.open(game.stream_url, '_blank')}><Video className="w-4 h-4" /></Button>}</div></CardContent></Card>;
                    })}
                  </div>
                </section>
              )}

              <StatsRefreshControl />

              {isStatsFetching && (
                <div className="mb-4">
                  <StatsFetchingIndicator fetching={isStatsFetching} label="Refreshing live stats…" />
                </div>
              )}
              <BasketballSection bbDivTab={bbDivTab} setBbDivTab={setBbDivTab} organization={organization} basketballStandingsOpen={basketballStandingsOpen} basketballStandingsVeterans={basketballStandingsVeterans} topScorersOpen={topScorersOpen} topScorersVeterans={topScorersVeterans} topReboundersOpen={topReboundersOpen} topReboundersVeterans={topReboundersVeterans} topBlockersOpen={topBlockersOpen} topBlockersVeterans={topBlockersVeterans} top3PointersOpen={top3PointersOpen} top3PointersVeterans={top3PointersVeterans} upcomingBasketballGamesOpen={upcomingBasketballGamesOpen} upcomingBasketballGamesVeterans={upcomingBasketballGamesVeterans} completedBasketballGamesOpen={completedBasketballGamesOpen} completedBasketballGamesVeterans={completedBasketballGamesVeterans} allPlayerStats={allPlayerStats} allPlayers={allPlayers} allTeams={allTeams} isAdmin={isAdmin} orgId={orgId} getTeamName={getTeamName} />

              <VolleyballSection organization={organization} volleyballStandings={volleyballStandings} topVolleyballScorers={topVolleyballScorers} topVolleyballAttackers={topVolleyballAttackers} topVolleyballBlockers={topVolleyballBlockers} topVolleyballAces={topVolleyballAces} upcomingVolleyballGames={upcomingVolleyballGames} completedVolleyballGames={completedVolleyballGames} allPlayerStats={allPlayerStats} allPlayers={allPlayers} allTeams={allTeams} isAdmin={isAdmin} getTeamName={getTeamName} />
            </div>
          )}

          <footer className="border-t border-border py-12 px-4 mt-20"><div className="max-w-7xl mx-auto text-center"><span className="font-heading text-xl font-bold tracking-tight block mb-2">ScorekeeperAI</span><p className="text-sm text-muted-foreground mb-1">Professional League Management System</p><p className="text-xs text-muted-foreground">Basketball · Volleyball · Real-time Scoring</p><p className="text-xs text-muted-foreground mt-6">© 2025 ScorekeeperAI. All rights reserved.</p></div></footer>
        </main>
      </div>
      <AIAssistant />
    </div>
  );
}