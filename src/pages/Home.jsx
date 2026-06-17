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
import AIInsights from "@/components/AIInsights";
import AIAssistant from "@/components/AIAssistant";
import LiveStreamEmbed from "@/components/LiveStreamEmbed";
import BasketballSection from "@/components/home/BasketballSection";
import VolleyballSection from "@/components/home/VolleyballSection";

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [bbDivTab, setBbDivTab] = useState('open');
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
        const activeOrgId = currentUser?.active_organization_id || currentUser?.organization_id;
        if (activeOrgId) {
          const orgs = await base44.entities.Organization.list();
          setOrganization(orgs.find(o => o.id === activeOrgId) || null);
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
          const part = await base44.entities.Player.filter({ team_id: { $in: chunk } }, '-created_date', 500);
          out.push(...part);
        } catch (_) {
          const per = await Promise.all(
            chunk.map((id) => base44.entities.Player.filter({ team_id: id }, '-created_date', 500).catch(() => []))
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
    queryFn: () => orgId ? base44.entities.Game.filter({ organization_id: orgId }) : base44.entities.Game.list('-game_date'),
    enabled: isAuthenticated === true,
    refetchInterval: 10000,
  });

  const teams = orgId ? allTeams.filter(t => t.organization_id === orgId) : allTeams;
  const games = orgId ? allGames.filter(g => g.organization_id === orgId) : allGames;
  const completedGames = games.filter(g => g.status === 'completed').sort((a, b) => new Date(b.game_date) - new Date(a.game_date));

  const { data: allPlayerStats = [] } = useQuery({
    queryKey: ['all-player-stats-home', completedGames.map(g => g.id).join(',')],
    queryFn: async () => {
      if (completedGames.length === 0) return [];
      const gameIds = completedGames.map(g => g.id);

      // Primary: backend function (handles batching/backoff) — same as Statistics page
      let stats = [];
      try {
        const res = await base44.functions.invoke('getGamePlayerStats', { game_ids: gameIds });
        stats = Array.isArray(res.data) ? res.data : [];
      } catch (e) {
        console.warn('getGamePlayerStats failed, falling back to direct entity fetch:', e?.message || e);
      }

      // Fallback: fetch directly from entity if function fails or returns empty (safety net) — mirrors Statistics
      if (!stats || stats.length === 0) {
        const results = [];
        for (let i = 0; i < gameIds.length; i += 50) {
          const chunk = gameIds.slice(i, i + 50);
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
        stats = results;
      }

      return stats;
    },
    enabled: isAuthenticated === true,
    staleTime: 30000,
    gcTime: 5 * 60 * 1000,
    refetchInterval: 20000,
  });

  const teamIds = teams.map(t => t.id);
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
    const eligibleGameIds = new Set(
      games
        .filter((g) => {
          if (g.status !== 'completed') return false;
          if (sport && (g.sport || '').toLowerCase() !== sport.toLowerCase()) return false;
          if (division) {
            const homeDiv = teamsById.get(g.home_team_id)?.division || 'No Division';
            const awayDiv = teamsById.get(g.away_team_id)?.division || 'No Division';
            if (homeDiv !== division && awayDiv !== division) return false;
          }
          return true;
        })
        .map((g) => g.id)
    );

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
        const gamesPlayed = gameIds.size;
        return {
          ...(player || { id: playerId, first_name: 'Player', last_name: String(playerId).slice(-4) }),
          total,
          gamesPlayed,
          average: gamesPlayed > 0 ? (total / gamesPlayed).toFixed(1) : 0,
          averageLabel,
          teamName: team?.name || 'Unknown',
          teamLogoUrl: team?.logo_url || '',
        };
      })
      .filter((p) => p.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, limit);
  };

  const getTeamStandings = (sport) => {
    const sportTeams = teams.filter(t => (t.sport || '').toLowerCase() === sport.toLowerCase());
    const divisions = [...new Set(sportTeams.map(t => t.division || 'No Division'))];
    return divisions.map(division => ({
      division,
      teams: sportTeams.filter(t => (t.division || 'No Division') === division).map(team => {
        const teamGames = games.filter(g => g.status === 'completed' && (g.sport || '').toLowerCase() === sport.toLowerCase() && g.archived !== true && (g.home_team_id === team.id || g.away_team_id === team.id));
        let wins = 0, losses = 0, pointsFor = 0, pointsAgainst = 0;
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
          } else {
            if (teamScore > oppScore) wins++; else losses++;
          }
          pointsFor += Number(teamScore || 0);
          pointsAgainst += Number(oppScore || 0);
        });
        const gamesPlayed = wins + losses;
        return {
          ...team,
          wins,
          losses,
          gamesPlayed,
          winPct: gamesPlayed > 0 ? wins / gamesPlayed : 0,
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
    return <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div></div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 mesh-gradient">
      {user && <AdminHeader user={user} organization={organization} darkMode={darkMode} toggleDarkMode={toggleDarkMode} handleLogout={handleLogout} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />}
      <div className="flex">
        {user && <AdminSidebar user={user} organization={organization} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} handleLogout={handleLogout} navigationItems={navigationItems} />}
        <main className={user ? "flex-1 min-w-0" : "w-full"}>
          <section className="relative bg-gradient-to-br from-gray-900 via-blue-900 to-indigo-900 dark:from-black dark:via-gray-900 dark:to-indigo-950 text-white py-24 px-4 overflow-hidden gradient-animate">
            <div className="absolute inset-0 grid-pattern opacity-30"></div>
            <div className="absolute inset-0 particles"></div>
            <div className="absolute top-20 left-10 w-72 h-72 bg-gradient-to-r from-cyan-500/30 to-blue-500/30 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-20 right-10 w-96 h-96 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
            {!user && <div className="absolute top-6 right-6 flex items-center gap-3 z-50"><button onClick={toggleDarkMode} className="p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-xl transition-all">{darkMode ? <Sun className="w-6 h-6 text-white" /> : <Moon className="w-6 h-6 text-white" />}</button>{isAuthenticated && <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-3 bg-red-600/90 hover:bg-red-700 backdrop-blur-md rounded-xl transition-all font-bold text-white shadow-lg"><LogOut className="w-5 h-5" /><span className="hidden sm:inline">Logout</span></button>}</div>}
            {organization && user && (
              <div className="hidden lg:block absolute right-0 bottom-0 top-0 w-[40%] z-0 pointer-events-none">
                <div className="relative w-full h-full flex items-end justify-center">
                  <div className="smoke smoke-1"></div>
                  <div className="smoke smoke-2"></div>
                  <div className="smoke smoke-3"></div>
                  <img
                    src="https://media.base44.com/images/public/690476f21c3624553ac82b4f/f18e6c393_Gemini_Generated_Image_2rtwlr2rtwlr2rtw_visioncut.png"
                    alt="Athlete"
                    className="relative z-10 h-full max-h-[520px] w-auto object-contain object-bottom drop-shadow-2xl"
                  />
                </div>
              </div>
            )}
            <div className="max-w-7xl mx-auto text-center relative z-10">
              {organization && user ? (
                <div className="space-y-8">
                  <div className="flex justify-center"><div className="relative"><div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-red-600 rounded-3xl blur-3xl opacity-30 animate-pulse"></div><Avatar className="relative w-40 h-40 border-8 border-white/20 shadow-2xl backdrop-blur-sm"><AvatarImage src={organization.logo_url} className="object-cover" /><AvatarFallback className="bg-gradient-to-br from-orange-500 to-red-600 text-white font-black text-6xl">{organization.name?.substring(0, 2).toUpperCase()}</AvatarFallback></Avatar></div></div>
                  <div><Badge className="mb-4 bg-orange-500/20 text-orange-300 border border-orange-400/30 text-sm font-bold px-6 py-2 backdrop-blur-sm">YOUR ORGANIZATION</Badge><h1 className="text-6xl md:text-7xl font-black mb-4 tracking-tight">{organization.name}</h1>{organization.tournament_name && <p className="text-xl md:text-2xl text-blue-100 mb-3 max-w-3xl mx-auto font-medium">{organization.tournament_name}</p>}<p className="text-lg md:text-xl text-blue-200 mb-6 max-w-3xl mx-auto font-medium">Sports League Management Dashboard</p></div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto"><div className="glass-card rounded-2xl p-5"><div className="text-4xl font-black text-gradient-primary">{teams.length}</div><div className="text-sm text-cyan-200 font-semibold mt-1">Teams</div></div><div className="glass-card rounded-2xl p-5"><div className="text-4xl font-black text-gradient-warm">{players.length}</div><div className="text-sm text-cyan-200 font-semibold mt-1">Players</div></div><div className="glass-card rounded-2xl p-5"><div className="text-4xl font-black bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">{games.length}</div><div className="text-sm text-cyan-200 font-semibold mt-1">Games</div></div><div className="glass-card rounded-2xl p-5"><div className="text-4xl font-black bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">{completedGames.length}</div><div className="text-sm text-cyan-200 font-semibold mt-1">Completed</div></div></div>
                  <div className="flex gap-6 justify-center flex-wrap">{isAdmin && <Link to={createPageUrl("Dashboard")}><Button className="btn-futuristic bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 hover:from-orange-600 hover:via-red-600 hover:to-pink-600 text-white text-lg px-12 py-7 font-bold shadow-2xl rounded-2xl">Go to Dashboard<ArrowRight className="w-5 h-5 ml-2" /></Button></Link>}{!isAdmin && isAuthenticated && <Link to={createPageUrl("TeamRegistration")}><Button className="btn-futuristic bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 hover:from-orange-600 hover:via-red-600 hover:to-pink-600 text-white text-lg px-12 py-7 font-bold shadow-2xl rounded-2xl"><UserPlus className="w-5 h-5 mr-2" />Register Your Team</Button></Link>}</div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-center gap-4 mb-8"><div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center shadow-2xl"><Trophy className="w-10 h-10 text-white" /></div></div>
                  <h1 className="text-6xl md:text-7xl font-black mb-6 tracking-tight"><span className="text-gradient-primary neon-text-blue">Scorekeeper</span><span className="text-gradient-warm">AI</span></h1>
                  <p className="text-xl md:text-2xl text-blue-100 mb-3 max-w-3xl mx-auto font-medium">Professional Basketball & Volleyball League Management</p>
                  <p className="text-blue-200 mb-10 max-w-2xl mx-auto">Real-time scoring • Live statistics • Tournament management</p>
                  {!isAuthenticated && <div className="flex gap-6 justify-center flex-wrap"><Button onClick={() => base44.auth.redirectToLogin(createPageUrl("Dashboard"))} className="btn-futuristic bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 hover:from-orange-600 hover:via-red-600 hover:to-pink-600 text-white text-lg px-12 py-7 font-bold shadow-2xl rounded-2xl">Get Started<ArrowRight className="w-5 h-5 ml-2" /></Button><Link to={createPageUrl("RequestAdminAccess")}><Button variant="outline" className="glass border-2 border-cyan-400/50 text-cyan-100 hover:bg-cyan-500/20 text-lg px-12 py-7 font-bold rounded-2xl">Request Admin Access</Button></Link></div>}
                </>
              )}
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-gray-50 dark:from-gray-900 to-transparent"></div>
          </section>

          {user && (
            <div className="max-w-7xl mx-auto px-4 py-16">
              {organization && <div className="mb-12"><Card className="relative overflow-hidden border-2 border-blue-200 dark:border-blue-800 shadow-2xl"><div className="absolute inset-0 bg-gradient-to-br from-white via-blue-50/50 to-purple-50/50 dark:from-gray-800 dark:via-blue-950/30 dark:to-purple-950/30"></div><CardContent className="relative z-10 p-8"><div className="flex flex-col lg:flex-row items-center gap-8"><Avatar className="relative w-32 h-32 border-4 border-white dark:border-gray-700 shadow-2xl"><AvatarImage src={organization.logo_url} className="object-cover" /><AvatarFallback className="bg-gradient-to-br from-orange-500 to-red-600 text-white font-black text-5xl">{organization.name?.substring(0, 2).toUpperCase()}</AvatarFallback></Avatar><div className="flex-1 text-center lg:text-left"><Badge className="mb-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-0 font-bold px-4 py-1">VIEWING YOUR ORGANIZATION</Badge><h2 className="text-4xl font-black text-gray-900 dark:text-white mb-2">{organization.name}</h2><p className="text-gray-600 dark:text-gray-400 font-medium mb-4">Complete sports league management and statistics</p></div></div></CardContent></Card></div>}

              {isAdmin && (teams.length > 0 || games.length > 0) && <div className="mb-12"><AIInsights teams={teams} players={players} games={games} organizationName={organization?.name || "ScorekeeperAI"} /></div>}

              {games.filter(g => g.status === 'in_progress').length > 0 && (
                <section className="mb-12">
                  <div className="flex items-center gap-3 mb-6"><div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg"><PlayCircle className="w-5 h-5 text-white animate-pulse" /></div><h2 className="text-3xl font-black text-gray-900 dark:text-white">Games In Progress</h2><Badge className="bg-red-500 text-white font-bold animate-pulse">LIVE</Badge></div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {games.filter(g => g.status === 'in_progress').map(game => {
                      const homeTeamData = allTeams.find(t => t.id === game.home_team_id);
                      const awayTeamData = allTeams.find(t => t.id === game.away_team_id);
                      if (!homeTeamData || !awayTeamData) return null;
                      return <Card key={game.id} className="glass-card border-2 border-orange-400/50 shadow-lg hover:shadow-xl transition-shadow overflow-hidden"><CardHeader className="bg-gradient-to-r from-orange-600 to-orange-700 py-3 px-4"><CardTitle className="text-white text-lg font-bold flex items-center justify-between"><div className="flex items-center gap-2"><div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>LIVE</div><Badge className="bg-white/20 text-white font-bold border-0">{game.sport.toUpperCase()}</Badge></CardTitle></CardHeader><CardContent className="p-4"><div className="flex items-center justify-between mb-4"><div className="flex-1 text-center"><Avatar className="w-14 h-14 mx-auto mb-2 border-4 border-white dark:border-gray-700 shadow-lg"><AvatarImage src={homeTeamData.logo_url} /><AvatarFallback className="bg-gradient-to-br from-orange-500 to-orange-600 text-white text-sm font-bold">{homeTeamData.name?.substring(0, 2).toUpperCase()}</AvatarFallback></Avatar><p className="font-semibold text-gray-800 dark:text-gray-200 text-sm truncate">{homeTeamData.name}</p></div><div className="flex flex-col items-center mx-4"><span className="text-4xl font-black text-gray-900 dark:text-white">{game.home_score} - {game.away_score}</span></div><div className="flex-1 text-center"><Avatar className="w-14 h-14 mx-auto mb-2 border-4 border-white dark:border-gray-700 shadow-lg"><AvatarImage src={awayTeamData.logo_url} /><AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white text-sm font-bold">{awayTeamData.name?.substring(0, 2).toUpperCase()}</AvatarFallback></Avatar><p className="font-semibold text-gray-800 dark:text-gray-200 text-sm truncate">{awayTeamData.name}</p></div></div>{game.stream_url && <div className="mb-4"><LiveStreamEmbed streamUrl={game.stream_url} gameTitle={`${homeTeamData.name} vs ${awayTeamData.name}`} /></div>}<div className="flex gap-2"><Link to={createPageUrl("PublicGameView") + `?game_id=${game.id}`} className="flex-1"><Button className="w-full bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white font-bold shadow-md"><PlayCircle className="w-4 h-4 mr-2" />View Live</Button></Link>{game.stream_url && <Button variant="outline" className="border-2 border-red-400 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30" onClick={() => window.open(game.stream_url, '_blank')}><Video className="w-4 h-4" /></Button>}</div></CardContent></Card>;
                    })}
                  </div>
                </section>
              )}

              <BasketballSection bbDivTab={bbDivTab} setBbDivTab={setBbDivTab} organization={organization} basketballStandingsOpen={basketballStandingsOpen} basketballStandingsVeterans={basketballStandingsVeterans} topScorersOpen={topScorersOpen} topScorersVeterans={topScorersVeterans} topReboundersOpen={topReboundersOpen} topReboundersVeterans={topReboundersVeterans} topBlockersOpen={topBlockersOpen} topBlockersVeterans={topBlockersVeterans} top3PointersOpen={top3PointersOpen} top3PointersVeterans={top3PointersVeterans} upcomingBasketballGamesOpen={upcomingBasketballGamesOpen} upcomingBasketballGamesVeterans={upcomingBasketballGamesVeterans} completedBasketballGamesOpen={completedBasketballGamesOpen} completedBasketballGamesVeterans={completedBasketballGamesVeterans} allPlayerStats={allPlayerStats} allPlayers={allPlayers} allTeams={allTeams} isAdmin={isAdmin} orgId={orgId} getTeamName={getTeamName} />

              <VolleyballSection organization={organization} volleyballStandings={volleyballStandings} topVolleyballScorers={topVolleyballScorers} topVolleyballAttackers={topVolleyballAttackers} topVolleyballBlockers={topVolleyballBlockers} topVolleyballAces={topVolleyballAces} upcomingVolleyballGames={upcomingVolleyballGames} completedVolleyballGames={completedVolleyballGames} allPlayerStats={allPlayerStats} allPlayers={allPlayers} allTeams={allTeams} isAdmin={isAdmin} getTeamName={getTeamName} />
            </div>
          )}

          <footer className="bg-gradient-to-br from-gray-900 via-gray-900 to-black dark:from-black dark:via-gray-950 dark:to-black text-white py-16 px-4 mt-20 relative overflow-hidden"><div className="absolute inset-0 grid-pattern opacity-10"></div><div className="max-w-7xl mx-auto text-center relative z-10"><div className="flex items-center justify-center gap-4 mb-6"><div className="w-16 h-16 bg-gradient-to-br from-orange-500 via-red-500 to-pink-500 rounded-xl flex items-center justify-center shadow-2xl neon-glow-orange"><Trophy className="w-8 h-8 text-white" /></div><span className="text-3xl font-black tracking-tight text-gradient-warm">ScorekeeperAI</span></div><p className="text-blue-200 dark:text-blue-300 text-lg mb-2 font-medium">Professional League Management System</p><p className="text-blue-300 dark:text-blue-400 text-sm">Basketball • Volleyball • Real-time Scoring</p><p className="text-blue-400 dark:text-blue-500 text-sm mt-8">© 2025 ScorekeeperAI. All rights reserved.</p></div></footer>
        </main>
      </div>
      <AIAssistant />
    </div>
  );
}