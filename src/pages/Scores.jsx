import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Calendar, TrendingUp, Target, Zap, Shield, ArrowRight, Sun, Moon, Building2, Trophy, Users, LogOut } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import AIInsights from "@/components/AIInsights";
import AIGameSummary from "@/components/AIGameSummary";

export default function Scores() {
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [viewMode, setViewMode] = useState('all'); // 'all' or 'my-org'
  const navigate = useNavigate();

  React.useEffect(() => {
    checkAuth();
    loadUser();
    // Load dark mode preference
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    setDarkMode(savedDarkMode);
    if (savedDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark'); // Ensure it's removed if not dark
    }
  }, []);

  const checkAuth = async () => {
    const authenticated = await base44.auth.isAuthenticated();
    setIsAuthenticated(authenticated);
  };

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      
      // Load organization if user has organization_id
      if (currentUser?.organization_id) {
        const orgs = await base44.entities.Organization.list(); // Assuming Organization entity exists
        const userOrg = orgs.find(o => o.id === currentUser.organization_id);
        setOrganization(userOrg);
        setViewMode('my-org'); // Default to showing their org data
      }
    } catch (error) {
      // User not logged in or other error
      console.log("User not authenticated or error loading user/org:", error);
      setUser(null); // Ensure user is null if error
      setOrganization(null);
      setViewMode('all'); // Default to 'all' if no user/org
    }
  };

  // Dark mode toggle function
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

  // Logout function
  const handleLogout = () => {
    base44.auth.logout(createPageUrl("Home"));
  };

  // Fetch all data
  const { data: allTeams = [] } = useQuery({
    queryKey: ['all-teams-home'],
    queryFn: () => base44.entities.Team.list(),
  });

  const { data: allPlayers = [] } = useQuery({
    queryKey: ['all-players-home'],
    queryFn: () => base44.entities.Player.list(),
  });

  const { data: allGames = [] } = useQuery({
    queryKey: ['all-games-home'],
    queryFn: () => base44.entities.Game.list('-game_date'),
  });

  const { data: allPlayerStats = [] } = useQuery({
    queryKey: ['all-player-stats-home'],
    queryFn: () => base44.entities.PlayerGameStats.list(),
  });

  // Filter data based on view mode
  const teams = viewMode === 'my-org' && user?.organization_id
    ? allTeams.filter(t => t.organization_id === user.organization_id)
    : allTeams;

  const games = viewMode === 'my-org' && user?.organization_id
    ? allGames.filter(g => g.organization_id === user.organization_id)
    : allGames;

  const teamIds = teams.map(t => t.id);
  const players = allPlayers.filter(p => teamIds.includes(p.team_id));
  const playerStats = allPlayerStats.filter(s => {
    const player = players.find(p => p.id === s.player_id); // Use filtered players here
    return player && teamIds.includes(player.team_id);
  });

  // Calculate team standings by division and sport
  const getTeamStandings = (sport) => {
    const sportTeams = teams.filter(t => t.sport === sport);
    const divisions = [...new Set(sportTeams.map(t => t.division || 'No Division'))];
    
    return divisions.map(division => {
      const divisionTeams = sportTeams
        .filter(t => (t.division || 'No Division') === division)
        .map(team => {
          const teamGames = games.filter(g => 
            g.status === 'completed' && 
            (g.home_team_id === team.id || g.away_team_id === team.id)
          );
          
          let wins = 0, losses = 0, pointsFor = 0, pointsAgainst = 0;
          
          teamGames.forEach(game => {
            const isHome = game.home_team_id === team.id;
            let teamScore, oppScore;

            if (sport === 'volleyball') {
              // For volleyball: calculate total points across all sets
              const homeTotalPoints = (game.quarter_scores || []).reduce((sum, s) => sum + (s.home || 0), 0);
              const awayTotalPoints = (game.quarter_scores || []).reduce((sum, s) => sum + (s.away || 0), 0);
              const homeSetsWon = (game.quarter_scores || []).filter(s => s.home > s.away).length;
              const awaySetsWon = (game.quarter_scores || []).filter(s => s.away > s.home).length;
              
              teamScore = isHome ? homeTotalPoints : awayTotalPoints;
              oppScore = isHome ? awayTotalPoints : homeTotalPoints;
              
              // Win/loss based on sets won
              if (homeSetsWon > awaySetsWon) {
                if (isHome) wins++;
                else losses++;
              } else if (awaySetsWon > homeSetsWon) { // Fixed: added else if to handle away win
                if (isHome) losses++;
                else wins++;
              }
            } else { // Basketball
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
          // First sort by win percentage
          if (b.winPct !== a.winPct) {
            return b.winPct - a.winPct;
          }
          // If tied in win percentage, sort by point differential
          return b.diff - a.diff;
        });

      return { division, teams: divisionTeams };
    });
  };

  // Calculate top players for basketball
  const getTopPlayers = (statType, sport = 'basketball', limit = 10) => {
    const sportTeamIds = teams.filter(t => t.sport === sport).map(t => t.id);
    const sportPlayers = players.filter(p => sportTeamIds.includes(p.team_id));

    const playerTotals = sportPlayers.map(player => {
      const playerStatsList = playerStats.filter(s => s.player_id === player.id);
      
      let total = 0;
      let averageLabel = "";

      if (statType === 'points') {
        if (sport === 'basketball') {
          total = playerStatsList.reduce((sum, s) => sum + (s.points || 0), 0);
          averageLabel = "PPG";
        } else { // volleyball - total 'points' in this context means sum of attacks, blocks, aces
          total = playerStatsList.reduce((sum, s) => 
            sum + (s.field_goals_made || 0) + (s.blocks || 0) + (s.three_pointers || 0), 0); // three_pointers used for aces
          averageLabel = "Score/G";
        }
      } else if (statType === 'rebounds') {
        total = playerStatsList.reduce((sum, s) => sum + (s.rebounds || 0), 0);
        averageLabel = "RPG";
      } else if (statType === 'blocks') {
        total = playerStatsList.reduce((sum, s) => sum + (s.blocks || 0), 0);
        averageLabel = "BPG";
      } else if (statType === 'three_pointers') {
        total = playerStatsList.reduce((sum, s) => sum + (s.three_pointers || 0), 0);
        averageLabel = sport === 'basketball' ? "3PG" : "ACE/G";
      } else if (statType === 'attacks') {
        total = playerStatsList.reduce((sum, s) => sum + (s.field_goals_made || 0), 0); // field_goals_made used for attacks in volleyball
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
        division: team?.division || 'No Division',
      };
    });

    return playerTotals
      .filter(p => p.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, limit);
  };

  const basketballStandings = getTeamStandings('basketball');
  const volleyballStandings = getTeamStandings('volleyball');

  const topScorers = getTopPlayers('points', 'basketball', 10);
  const topRebounders = getTopPlayers('rebounds', 'basketball', 10);
  const topBlockers = getTopPlayers('blocks', 'basketball', 10);
  const top3Pointers = getTopPlayers('three_pointers', 'basketball', 10);

  const topVolleyballScorers = getTopPlayers('points', 'volleyball', 10);
  const topVolleyballAttackers = getTopPlayers('attacks', 'volleyball', 10);
  const topVolleyballBlockers = getTopPlayers('blocks', 'volleyball', 10);
  const topVolleyballAces = getTopPlayers('three_pointers', 'volleyball', 10);

  const upcomingBasketballGames = games
    .filter(g => g.sport === 'basketball' && g.status === 'scheduled')
    .sort((a, b) => new Date(a.game_date).getTime() - new Date(b.game_date).getTime())
    .slice(0, 10);

  const completedBasketballGames = games
    .filter(g => g.sport === 'basketball' && g.status === 'completed')
    .sort((a, b) => new Date(b.game_date).getTime() - new Date(a.game_date).getTime())
    .slice(0, 10);

  const upcomingVolleyballGames = games
    .filter(g => g.sport === 'volleyball' && g.status === 'scheduled')
    .sort((a, b) => new Date(a.game_date).getTime() - new Date(b.game_date).getTime())
    .slice(0, 10);

  const completedVolleyballGames = games
    .filter(g => g.sport === 'volleyball' && g.status === 'completed')
    .sort((a, b) => new Date(b.game_date).getTime() - new Date(a.game_date).getTime())
    .slice(0, 10);

  const getTeamName = (teamId) => {
    const team = allTeams.find(t => t.id === teamId);
    return team?.name || 'Unknown';
  };

  // Show loading while checking authentication
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* ... keep existing code (all the JSX from the original Home page - hero section, organization banners, basketball/volleyball sections, footer - EXACTLY as it was) ... */}
    </div>
  );
}