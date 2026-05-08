import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Calendar, TrendingUp, Target, Zap, Shield, ArrowRight, Sun, Moon, Building2, Trophy, Users, LogOut, BarChart3, Home as HomeIcon, PlayCircle, MessageCircle, UserPlus, Video, Globe } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import AdminHeader from "@/components/AdminHeader";
import AdminSidebar from "@/components/AdminSidebar";
import AIInsights from "@/components/AIInsights";
import AIGameSummary from "@/components/AIGameSummary";
import AIAssistant from "@/components/AIAssistant";
import LiveStreamEmbed from "@/components/LiveStreamEmbed";
import TopAssistLeaders from "@/components/leaders/TopAssistLeaders";
import GameCompactStats from "@/components/stats/GameCompactStats";

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);

  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [bbDivTab, setBbDivTab] = useState('open');
  const navigate = useNavigate();

  React.useEffect(() => {
    initializePage();
  }, []);

  const initializePage = async () => {
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    setDarkMode(savedDarkMode);
    if (savedDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    try {
      const authenticated = await base44.auth.isAuthenticated();
      setIsAuthenticated(authenticated);
      
      if (authenticated) {
        try {
          const currentUser = await base44.auth.me();
          
          if (currentUser?.role === 'admin' && currentUser?.is_super_admin === true) {
            navigate(createPageUrl("SuperAdminHome"));
            return;
          }
          
          const hasOrg = currentUser?.organization_id || currentUser?.active_organization_id;
          if (!currentUser?.onboarding_completed && !hasOrg && currentUser?.role !== 'admin') {
            console.log("New user without org, redirecting to RoleSelection");
            navigate(createPageUrl("RoleSelection"));
            return;
          }
          
          setUser(currentUser);
          
          const activeOrgId = currentUser?.active_organization_id || currentUser?.organization_id;
          if (activeOrgId) {
            const orgs = await base44.entities.Organization.list();
            const userOrg = orgs.find(o => o.id === activeOrgId);
            setOrganization(userOrg);
          }
        } catch (error) {
          console.log("Error loading user data after authentication:", error);
          setUser(null); 
          setOrganization(null);
        }
      } else {
        setUser(null);
        setOrganization(null);
      }
    } catch (error) {
      console.log("Error during authentication check:", error);
      setIsAuthenticated(false);
      setUser(null);
      setOrganization(null);
    } finally {
      setLoading(false);
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
    base44.auth.logout(createPageUrl("Home"));
  };

  const goToDashboard = () => {
    navigate(createPageUrl("Dashboard"));
  };

  const superAdminNav = [
    { title: "Home", url: createPageUrl("Home"), icon: HomeIcon },
    { title: "Dashboard", url: createPageUrl("Dashboard"), icon: BarChart3 },
    { title: "Organizations", url: createPageUrl("Organizations"), icon: Building2 },
    { title: "All Teams", url: createPageUrl("AllTeams"), icon: Users },
    { title: "All Games", url: createPageUrl("AllGames"), icon: Calendar },
    { title: "Admin Approvals", url: createPageUrl("AdminApprovals"), icon: Shield },
  ];

  const adminNav = [
    { title: "Home", url: createPageUrl("Home"), icon: HomeIcon },
    { title: "Dashboard", url: createPageUrl("Dashboard"), icon: BarChart3 },
    { title: "Divisions", url: createPageUrl("Divisions"), icon: Trophy },
    { title: "Teams", url: createPageUrl("Teams"), icon: Users },
    { title: "Players", url: createPageUrl("Players"), icon: Trophy },
    { title: "Games", url: createPageUrl("Games"), icon: Calendar },
    { title: "Scorekeepers", url: createPageUrl("Scorekeepers"), icon: Shield },
    { title: "Live Scoring", url: createPageUrl("LiveScoring"), icon: PlayCircle },
    { title: "Statistics", url: createPageUrl("Statistics"), icon: BarChart3 },
  ];

  const isSuperAdmin = user?.role === 'admin' && user?.is_super_admin === true;
  const isAdmin = user?.role === 'admin';
  
  const userNav = [
    { title: "Home", url: createPageUrl("Home"), icon: HomeIcon },
    { title: "Register Team", url: createPageUrl("TeamRegistration"), icon: UserPlus },
    { title: "Join Organization", url: createPageUrl("JoinOrganization"), icon: Building2 },
    { title: "Statistics", url: createPageUrl("Statistics"), icon: BarChart3 },
    { title: "Social Feed", url: createPageUrl("SocialFeed"), icon: MessageCircle },
  ];
  
  const navigationItems = isSuperAdmin ? superAdminNav : (isAdmin ? adminNav : (user?.role_id ? null : userNav));

  const { data: allTeams = [] } = useQuery({
    queryKey: ['all-teams-home'],
    queryFn: () => base44.entities.Team.list(),
    enabled: isAuthenticated === true,
  });

  const { data: allPlayers = [] } = useQuery({
    queryKey: ['all-players-home'],
    queryFn: () => base44.entities.Player.list(),
    enabled: isAuthenticated === true,
  });

  const { data: allGames = [] } = useQuery({
    queryKey: ['all-games-home'],
    queryFn: () => base44.entities.Game.list('-game_date'),
    enabled: isAuthenticated === true,
    refetchInterval: 10000,
  });

  const { data: allPlayerStats = [] } = useQuery({
    queryKey: ['all-player-stats-home'],
    queryFn: () => base44.entities.PlayerGameStats.list(),
    enabled: isAuthenticated === true,
  });

  const orgId = user?.active_organization_id || user?.organization_id;
  const teams = orgId ? allTeams.filter(t => t.organization_id === orgId) : allTeams;
  const games = orgId ? allGames.filter(g => g.organization_id === orgId) : allGames;

  const teamIds = teams.map(t => t.id);
  const players = allPlayers.filter(p => teamIds.includes(p.team_id));
  const playerStats = allPlayerStats.filter(s => {
    const player = players.find(p => p.id === s.player_id);
    return player && teamIds.includes(player.team_id);
  });

  const getTopPlayers = (statType, sport = 'basketball', limit = 10, division = null) => {
    const sportTeamIds = teams
      .filter(t => ((t.sport || '').toLowerCase() === (sport || '').toLowerCase()) && (!division || ((t.division || 'No Division').toString().trim().toLowerCase().includes((division || '').toString().trim().toLowerCase()))))
      .map(t => t.id);
    const sportPlayers = players.filter(p => sportTeamIds.includes(p.team_id));

    const includeArchived = organization?.settings?.include_archived_in_leaders === true;
    const eligibleGameIds = sport === 'volleyball'
      ? new Set(games.filter(g => (g.sport || '').toLowerCase() === 'volleyball' && g.status === 'completed' && (includeArchived || !g.archived)).map(g => g.id))
      : new Set(games.map(g => g.id));

    const playerTotals = sportPlayers.map(player => {
      const playerStatsList = playerStats.filter(s => s.player_id === player.id && eligibleGameIds.has(s.game_id));
      
      let total = 0;
      let averageLabel = "";

      if (statType === 'points') {
        if (sport === 'basketball') {
          total = playerStatsList.reduce((sum, s) => {
            const stored = Number(s.points || 0);
            if (stored > 0) return sum + stored;
            const threes = Number(s.three_pointers || 0);
            const fgm = Number(s.field_goals_made || 0);
            const twos = Math.max(fgm - threes, 0);
            const ftm = Number(s.free_throws_made || 0);
            return sum + (twos * 2) + (threes * 3) + ftm;
          }, 0);
          averageLabel = "PPG";
        } else {
          total = playerStatsList.reduce((sum, s) => 
            sum + (s.field_goals_made || 0) + (s.blocks || 0) + (s.three_pointers || 0), 0);
          averageLabel = "Score/G";
        }
      } else if (statType === 'rebounds') {
        total = playerStatsList.reduce((sum, s) => sum + (s.rebounds || 0), 0);
        averageLabel = "RPG";
      } else if (statType === 'assists') {
        total = playerStatsList.reduce((sum, s) => sum + (s.assists || 0), 0);
        averageLabel = "APG";
      } else if (statType === 'blocks') {
        total = playerStatsList.reduce((sum, s) => sum + (s.blocks || 0), 0);
        averageLabel = "BPG";
      } else if (statType === 'three_pointers') {
        total = playerStatsList.reduce((sum, s) => sum + (s.three_pointers || 0), 0);
        averageLabel = sport === 'basketball' ? "3PG" : "ACE/G";
      } else if (statType === 'attacks') {
        total = playerStatsList.reduce((sum, s) => sum + (s.field_goals_made || 0), 0);
        averageLabel = "APG";
      }

      const team = allTeams.find(t => t.id === player.team_id);
      const gamesPlayed = [...new Set(playerStatsList.map(s => s.game_id))].length;

      return {
        ...player,
        total,
        gamesPlayed,
        average: gamesPlayed > 0 ? (total / gamesPlayed).toFixed(1) : 0,
        averageLabel,
        teamName: team?.name || 'Unknown',
        teamLogoUrl: team?.logo_url || '',
        division: team?.division || 'No Division',
      };
    });

    return playerTotals
      .filter(p => p.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, limit);
  };

  const getTeamStandings = (sport) => {
    const sportTeams = teams.filter(t => ((t.sport || '').toLowerCase() === (sport || '').toLowerCase()));
    const divisions = [...new Set(sportTeams.map(t => t.division || 'No Division'))];
    
    return divisions.map(division => {
      const divisionTeams = sportTeams
        .filter(t => (t.division || 'No Division') === division)
        .map(team => {
          const teamGames = games.filter(g => 
            g.status === 'completed' &&
            ((g.sport || '').toLowerCase() === (sport || '').toLowerCase()) &&
            g.archived !== true &&
            (g.home_team_id === team.id || g.away_team_id === team.id)
          );
          
          let wins = 0, losses = 0, pointsFor = 0, pointsAgainst = 0;
          
          teamGames.forEach(game => {
            const isHome = game.home_team_id === team.id;
            let teamScore, oppScore;

            if (sport === 'volleyball') {
              const sets = Array.isArray(game.quarter_scores) ? game.quarter_scores : [];
              if (sets.length > 0) {
                const homeTotalPoints = sets.reduce((sum, s) => sum + (s.home || 0), 0);
                const awayTotalPoints = sets.reduce((sum, s) => sum + (s.away || 0), 0);
                const homeSetsWon = sets.filter(s => s.home > s.away).length;
                const awaySetsWon = sets.filter(s => s.away > s.home).length;
                
                teamScore = isHome ? homeTotalPoints : awayTotalPoints;
                oppScore = isHome ? awayTotalPoints : homeTotalPoints;
                
                if (homeSetsWon > awaySetsWon) {
                  if (isHome) wins++; else losses++;
                } else if (awaySetsWon > homeSetsWon) {
                  if (isHome) losses++; else wins++;
                } else {
                  if (homeTotalPoints > awayTotalPoints) { if (isHome) wins++; else losses++; }
                  else if (awayTotalPoints > homeTotalPoints) { if (isHome) losses++; else wins++; }
                }
              } else {
                const homeFinal = Number(game.home_score || 0);
                const awayFinal = Number(game.away_score || 0);
                teamScore = isHome ? homeFinal : awayFinal;
                oppScore = isHome ? awayFinal : homeFinal;
                if (homeFinal > awayFinal) { if (isHome) wins++; else losses++; }
                else if (awayFinal > homeFinal) { if (isHome) losses++; else wins++; }
              }
            } else {
              teamScore = isHome ? game.home_score : game.away_score;
              oppScore = isHome ? game.away_score : game.home_score;
              
              if (teamScore > oppScore) wins++;
              else losses++;
            }
            
            pointsFor += teamScore;
            pointsAgainst += oppScore;
          });

          const gamesPlayed = wins + losses;
          const winPct = gamesPlayed > 0 ? (wins / gamesPlayed) : 0;
          const avgPointsFor = gamesPlayed > 0 ? (pointsFor / gamesPlayed).toFixed(1) : 0;
          const avgPointsAgainst = gamesPlayed > 0 ? (pointsAgainst / gamesPlayed).toFixed(1) : 0;
          const diff = pointsFor - pointsAgainst;

          return {
            ...team,
            wins,
            losses,
            gamesPlayed,
            winPct,
            pointsFor,
            pointsAgainst,
            avgPointsFor,
            avgPointsAgainst,
            diff,
          };
        })
        .sort((a, b) => {
          if (b.winPct !== a.winPct) {
            return b.winPct - a.winPct;
          }
          return b.diff - a.diff;
        });

      return { division, teams: divisionTeams };
    });
  };

  const basketballStandings = getTeamStandings('basketball');
  const basketballStandingsOpen = basketballStandings.filter(d => ((d.division || 'No Division').toString().trim().toLowerCase().includes('open')));
  const basketballStandingsVeterans = basketballStandings.filter(d => ((d.division || 'No Division').toString().trim().toLowerCase().includes('veteran')));
  const volleyballStandings = getTeamStandings('volleyball');

  const topScorers = getTopPlayers('points', 'basketball', 10);
  const topRebounders = getTopPlayers('rebounds', 'basketball', 10);
  const topAssisters = getTopPlayers('assists', 'basketball', 10);
  const topBlockers = getTopPlayers('blocks', 'basketball', 10);
  const top3Pointers = getTopPlayers('three_pointers', 'basketball', 10);

  const topScorersOpen = getTopPlayers('points', 'basketball', 10, 'Open');
  const topReboundersOpen = getTopPlayers('rebounds', 'basketball', 10, 'Open');
  const topAssistersOpen = getTopPlayers('assists', 'basketball', 10, 'Open');
  const topBlockersOpen = getTopPlayers('blocks', 'basketball', 10, 'Open');
  const top3PointersOpen = getTopPlayers('three_pointers', 'basketball', 10, 'Open');

  const topScorersVeterans = getTopPlayers('points', 'basketball', 10, 'Veterans');
  const topReboundersVeterans = getTopPlayers('rebounds', 'basketball', 10, 'Veterans');
  const topAssistersVeterans = getTopPlayers('assists', 'basketball', 10, 'Veterans');
  const topBlockersVeterans = getTopPlayers('blocks', 'basketball', 10, 'Veterans');
  const top3PointersVeterans = getTopPlayers('three_pointers', 'basketball', 10, 'Veterans');

  const topVolleyballScorers = getTopPlayers('points', 'volleyball', 10);
  const topVolleyballAttackers = getTopPlayers('attacks', 'volleyball', 10);
  const topVolleyballBlockers = getTopPlayers('blocks', 'volleyball', 10);
  const topVolleyballAces = getTopPlayers('three_pointers', 'volleyball', 10);

  const upcomingBasketballGames = games
    .filter(g => (g.sport || '').toLowerCase() === 'basketball' && g.status === 'scheduled')
    .sort((a, b) => new Date(a.game_date).getTime() - new Date(b.game_date).getTime())
    .slice(0, 10);

  const completedBasketballGames = games
    .filter(g => (g.sport || '').toLowerCase() === 'basketball' && g.status === 'completed')
    .sort((a, b) => new Date(b.game_date).getTime() - new Date(a.game_date).getTime())
    .slice(0, 10);

  const openTeamIds = teams.filter(t => (t.sport || '').toLowerCase() === 'basketball' && ((t.division || 'No Division').toString().trim().toLowerCase().includes('open'))).map(t => t.id);
  const veteransTeamIds = teams.filter(t => (t.sport || '').toLowerCase() === 'basketball' && ((t.division || 'No Division').toString().trim().toLowerCase().includes('veteran'))).map(t => t.id);

  const upcomingBasketballGamesOpen = games
    .filter(g => (g.sport || '').toLowerCase() === 'basketball' && g.status === 'scheduled' && (openTeamIds.includes(g.home_team_id) || openTeamIds.includes(g.away_team_id)))
    .sort((a, b) => new Date(a.game_date).getTime() - new Date(b.game_date).getTime())
    .slice(0, 10);

  const completedBasketballGamesOpen = games
    .filter(g => (g.sport || '').toLowerCase() === 'basketball' && g.status === 'completed' && (openTeamIds.includes(g.home_team_id) || openTeamIds.includes(g.away_team_id)))
    .sort((a, b) => new Date(b.game_date).getTime() - new Date(a.game_date).getTime())
    .slice(0, 10);

  const upcomingBasketballGamesVeterans = games
    .filter(g => (g.sport || '').toLowerCase() === 'basketball' && g.status === 'scheduled' && (veteransTeamIds.includes(g.home_team_id) || veteransTeamIds.includes(g.away_team_id)))
    .sort((a, b) => new Date(a.game_date).getTime() - new Date(b.game_date).getTime())
    .slice(0, 10);

  const completedBasketballGamesVeterans = games
    .filter(g => (g.sport || '').toLowerCase() === 'basketball' && g.status === 'completed' && (veteransTeamIds.includes(g.home_team_id) || veteransTeamIds.includes(g.away_team_id)))
    .sort((a, b) => new Date(b.game_date).getTime() - new Date(a.game_date).getTime())
    .slice(0, 10);

  const upcomingVolleyballGames = games
    .filter(g => (g.sport || '').toLowerCase() === 'volleyball' && g.status === 'scheduled')
    .sort((a, b) => new Date(a.game_date).getTime() - new Date(b.game_date).getTime())
    .slice(0, 10);

  const completedVolleyballGames = games
    .filter(g => (g.sport || '').toLowerCase() === 'volleyball' && g.status === 'completed')
    .sort((a, b) => new Date(b.game_date).getTime() - new Date(a.game_date).getTime())
    .slice(0, 10);

  const getTeamName = (teamId) => {
    const team = allTeams.find(t => t.id === teamId);
    return team?.name || 'Unknown';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  return <div />;
}