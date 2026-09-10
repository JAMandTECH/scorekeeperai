import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  FileEdit, 
  Save, 
  Users, 
  Trophy, 
  CheckCircle, 
  ArrowLeft,
  AlertTriangle,
  BarChart3
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import AdminHeader from "@/components/AdminHeader";
import AdminSidebar from "@/components/AdminSidebar";
import AIAssistant from "@/components/AIAssistant";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function ManualGameEntry() {
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [selectedGame, setSelectedGame] = useState(null);
  const [showStatsDialog, setShowStatsDialog] = useState(false);
  const [playerStats, setPlayerStats] = useState({});
  const [gameScores, setGameScores] = useState({ home: 0, away: 0 });
  const [successMessage, setSuccessMessage] = useState("");
  const [confirmSave, setConfirmSave] = useState(false);
  const queryClient = useQueryClient();
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
      if (currentUser.role !== 'admin') {
        navigate(createPageUrl("Home"));
        return;
      }
      setUser(currentUser);
    } catch (error) {
      console.error("Error loading user:", error);
      base44.auth.redirectToLogin(createPageUrl("ManualGameEntry"));
    }
  };

  const handleLogout = () => {
    base44.auth.logout(createPageUrl("PublicLanding"));
  };

  const { data: organization } = useQuery({
    queryKey: ['organization', user?.organization_id],
    queryFn: async () => {
      const res = await base44.functions.invoke('getUserOrganization', {});
      return res?.data?.organization || null;
    },
    enabled: !!user?.organization_id,
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['teams', user?.organization_id],
    queryFn: () => base44.entities.Team.filter({ organization_id: user?.organization_id }),
    enabled: !!user?.organization_id,
  });

  const { data: games = [] } = useQuery({
    queryKey: ['games', user?.organization_id],
    queryFn: () => base44.entities.Game.filter({ organization_id: user?.organization_id }, '-game_date'),
    enabled: !!user?.organization_id,
  });

  const { data: allPlayers = [] } = useQuery({
    queryKey: ['all-players', user?.organization_id],
    queryFn: async () => {
      const orgTeams = await base44.entities.Team.filter({ organization_id: user?.organization_id });
      const teamIds = orgTeams.map(t => t.id);
      if (teamIds.length === 0) return [];
      const players = await base44.entities.Player.list();
      return players.filter(p => teamIds.includes(p.team_id));
    },
    enabled: !!user?.organization_id,
  });

  const { data: existingStats = [] } = useQuery({
    queryKey: ['game-stats', selectedGame?.id],
    queryFn: () => base44.entities.PlayerGameStats.filter({ game_id: selectedGame?.id }),
    enabled: !!selectedGame?.id,
  });

  // Initialize player stats when game is selected
  useEffect(() => {
    if (selectedGame && allPlayers.length > 0) {
      const homeTeamPlayers = allPlayers.filter(p => p.team_id === selectedGame.home_team_id);
      const awayTeamPlayers = allPlayers.filter(p => p.team_id === selectedGame.away_team_id);
      
      const initialStats = {};
      [...homeTeamPlayers, ...awayTeamPlayers].forEach(player => {
        // Check if stats already exist for this player
        const existingStat = existingStats.find(s => s.player_id === player.id);
        initialStats[player.id] = existingStat ? {
          points: existingStat.points || 0,
          rebounds: existingStat.rebounds || 0,
          assists: existingStat.assists || 0,
          steals: existingStat.steals || 0,
          blocks: existingStat.blocks || 0,
          fouls: existingStat.fouls || 0,
          three_pointers: existingStat.three_pointers || 0,
          field_goals_made: existingStat.field_goals_made || 0,
          field_goals_attempted: existingStat.field_goals_attempted || 0,
          free_throws_made: existingStat.free_throws_made || 0,
          free_throws_attempted: existingStat.free_throws_attempted || 0,
        } : {
          points: 0,
          rebounds: 0,
          assists: 0,
          steals: 0,
          blocks: 0,
          fouls: 0,
          three_pointers: 0,
          field_goals_made: 0,
          field_goals_attempted: 0,
          free_throws_made: 0,
          free_throws_attempted: 0,
        };
      });
      setPlayerStats(initialStats);
      setGameScores({
        home: selectedGame.home_score || 0,
        away: selectedGame.away_score || 0
      });
    }
  }, [selectedGame, allPlayers, existingStats]);

  const updateGameMutation = useMutation({
    mutationFn: async ({ gameId, homeScore, awayScore }) => {
      return base44.entities.Game.update(gameId, {
        home_score: homeScore,
        away_score: awayScore,
        status: 'completed'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['games']);
    }
  });

  const saveStatsMutation = useMutation({
    mutationFn: async ({ gameId, stats }) => {
      // Delete existing stats for this game first
      const existingGameStats = await base44.entities.PlayerGameStats.filter({ game_id: gameId });
      for (const stat of existingGameStats) {
        await base44.entities.PlayerGameStats.delete(stat.id);
      }
      
      // Create new stats
      const statsToCreate = Object.entries(stats)
        .filter(([playerId, playerStat]) => {
          // Only create stats if player has any recorded stats
          return Object.values(playerStat).some(val => val > 0);
        })
        .map(([playerId, playerStat]) => {
          const player = allPlayers.find(p => p.id === playerId);
          return {
            game_id: gameId,
            player_id: playerId,
            team_id: player?.team_id,
            quarter: 1, // Manual entry goes to quarter 1
            ...playerStat
          };
        });
      
      if (statsToCreate.length > 0) {
        await base44.entities.PlayerGameStats.bulkCreate(statsToCreate);
      }
      
      return statsToCreate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['all-player-stats']);
      queryClient.invalidateQueries(['game-stats']);
    }
  });

  const handleSaveAll = async () => {
    try {
      // Save game scores
      await updateGameMutation.mutateAsync({
        gameId: selectedGame.id,
        homeScore: gameScores.home,
        awayScore: gameScores.away
      });
      
      // Save player stats
      await saveStatsMutation.mutateAsync({
        gameId: selectedGame.id,
        stats: playerStats
      });

      // Update team standings (wins/losses) based on final score
      try {
        const originalStatus = selectedGame.status;
        const prevHome = selectedGame.home_score ?? 0;
        const prevAway = selectedGame.away_score ?? 0;
        const prevWinner = originalStatus === 'completed'
          ? (prevHome === prevAway ? null : (prevHome > prevAway ? 'home' : 'away'))
          : null;

        const newHome = gameScores.home;
        const newAway = gameScores.away;
        const newWinner = newHome === newAway ? null : (newHome > newAway ? 'home' : 'away');

        const allTeams = await base44.entities.Team.list();
        const homeTeam = allTeams.find(t => t.id === selectedGame.home_team_id);
        const awayTeam = allTeams.find(t => t.id === selectedGame.away_team_id);
        if (homeTeam && awayTeam) {
          let homeWins = homeTeam.wins || 0;
          let homeLosses = homeTeam.losses || 0;
          let awayWins = awayTeam.wins || 0;
          let awayLosses = awayTeam.losses || 0;

          if (originalStatus !== 'completed') {
            // Newly completing a game
            if (newWinner === 'home') { homeWins++; awayLosses++; }
            else if (newWinner === 'away') { awayWins++; homeLosses++; }
            // ties do not change W/L
          } else {
            // Editing a previously completed game
            if (prevWinner === newWinner) {
              // no change
            } else if (prevWinner && !newWinner) {
              // was a win, now tie -> remove previous result
              if (prevWinner === 'home') { homeWins = Math.max(0, homeWins - 1); awayLosses = Math.max(0, awayLosses - 1); }
              else { awayWins = Math.max(0, awayWins - 1); homeLosses = Math.max(0, homeLosses - 1); }
            } else if (!prevWinner && newWinner) {
              // was tie, now a win
              if (newWinner === 'home') { homeWins++; awayLosses++; }
              else { awayWins++; homeLosses++; }
            } else if (prevWinner && newWinner && prevWinner !== newWinner) {
              // switch winner
              if (prevWinner === 'home') { homeWins = Math.max(0, homeWins - 1); awayLosses = Math.max(0, awayLosses - 1); }
              else { awayWins = Math.max(0, awayWins - 1); homeLosses = Math.max(0, homeLosses - 1); }
              if (newWinner === 'home') { homeWins++; awayLosses++; }
              else { awayWins++; homeLosses++; }
            }
          }

          await Promise.all([
            base44.entities.Team.update(homeTeam.id, { wins: homeWins, losses: homeLosses }),
            base44.entities.Team.update(awayTeam.id, { wins: awayWins, losses: awayLosses }),
          ]);

          // Refresh teams list to reflect new standings
          queryClient.invalidateQueries(['teams']);
        }
      } catch (e) {
        console.error('Failed to update team standings:', e);
      }
      
      setSuccessMessage("Game result and player statistics saved successfully!");
      setConfirmSave(false);
      
      setTimeout(() => {
        setSuccessMessage("");
        setSelectedGame(null);
        setShowStatsDialog(false);
      }, 2000);
    } catch (error) {
      console.error("Error saving:", error);
      alert("Error saving data. Please try again.");
    }
  };

  const updatePlayerStat = (playerId, stat, value) => {
    setPlayerStats(prev => ({
      ...prev,
      [playerId]: {
        ...prev[playerId],
        [stat]: parseInt(value) || 0
      }
    }));
  };

  const getTeamName = (teamId) => {
    const team = teams.find(t => t.id === teamId);
    return team?.name || 'Unknown';
  };

  const getTeamLogo = (teamId) => {
    const team = teams.find(t => t.id === teamId);
    return team?.logo_url;
  };

  // Filter games that need manual entry (scheduled or can be edited)
  const scheduledGames = games.filter(g => g.status === 'scheduled' && !g.archived);
  const completedGames = games.filter(g => g.status === 'completed' && !g.archived);

  const handleSelectGame = (game) => {
    setSelectedGame(game);
    setShowStatsDialog(true);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
      </div>
    );
  }

  const homeTeamPlayers = selectedGame ? allPlayers.filter(p => p.team_id === selectedGame.home_team_id) : [];
  const awayTeamPlayers = selectedGame ? allPlayers.filter(p => p.team_id === selectedGame.away_team_id) : [];

  const StatInput = ({ playerId, stat, label, max = 100 }) => (
    <div className="flex flex-col">
      <label className="text-xs text-muted-foreground font-medium mb-1">{label}</label>
      <Input
        type="number"
        min="0"
        max={max}
        value={playerStats[playerId]?.[stat] || 0}
        onChange={(e) => updatePlayerStat(playerId, stat, e.target.value)}
        className="w-16 h-8 text-center text-sm font-heading font-bold tabular-nums"
      />
    </div>
  );

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
              {/* Header */}
              <div className="flex items-center gap-4">
                <Link to={createPageUrl("Games")}>
                  <Button variant="outline">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Games
                  </Button>
                </Link>
                <div>
                  <h1 className="font-heading text-3xl font-bold tracking-tight flex items-center gap-3">
                    <FileEdit className="w-10 h-10 text-primary" />
                    Manual Game Entry
                  </h1>
                  <p className="text-muted-foreground mt-2 font-medium">
                    Enter game results and player statistics for games not scored in the app
                  </p>
                </div>
              </div>

              {successMessage && (
                <div className="bg-primary/10 border border-primary/30 p-4 flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-primary" />
                  <p className="text-foreground font-medium">{successMessage}</p>
                </div>
              )}

              <Tabs defaultValue="scheduled" className="space-y-6">
                <TabsList>
                  <TabsTrigger value="scheduled">
                    Enter New Results ({scheduledGames.length})
                  </TabsTrigger>
                  <TabsTrigger value="completed">
                    Edit Completed ({completedGames.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="scheduled">
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {scheduledGames.map(game => (
                      <Card key={game.id} className="hover:border-foreground/20 transition-colors cursor-pointer" onClick={() => handleSelectGame(game)}>
                        <CardHeader>
                          <div className="flex justify-between items-center">
                            <Badge variant="outline" className="border-border text-muted-foreground font-medium">
                              SCHEDULED
                            </Badge>
                            <Badge variant="outline" className="border-border text-muted-foreground font-medium uppercase">
                              {game.sport}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground font-medium mt-2">
                            {new Date(game.game_date).toLocaleDateString()} at {new Date(game.game_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </p>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Avatar className="w-10 h-10 border border-border">
                                <AvatarImage src={getTeamLogo(game.home_team_id)} />
                                <AvatarFallback className="bg-secondary text-foreground text-xs font-heading font-bold">
                                  {getTeamName(game.home_team_id)?.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-heading font-bold text-foreground text-sm">{getTeamName(game.home_team_id)}</span>
                            </div>
                            <span className="text-muted-foreground font-medium">vs</span>
                            <div className="flex items-center gap-2">
                              <span className="font-heading font-bold text-foreground text-sm">{getTeamName(game.away_team_id)}</span>
                              <Avatar className="w-10 h-10 border border-border">
                                <AvatarImage src={getTeamLogo(game.away_team_id)} />
                                <AvatarFallback className="bg-secondary text-foreground text-xs font-heading font-bold">
                                  {getTeamName(game.away_team_id)?.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                            </div>
                          </div>
                          <Button className="w-full mt-4 font-medium">
                            <FileEdit className="w-4 h-4 mr-2" />
                            Enter Result
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  {scheduledGames.length === 0 && (
                    <div className="text-center py-20">
                      <Trophy className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground text-xl font-heading font-bold">No scheduled games to enter results for</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="completed">
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {completedGames.map(game => (
                      <Card key={game.id} className="hover:border-foreground/20 transition-colors cursor-pointer" onClick={() => handleSelectGame(game)}>
                        <CardHeader>
                          <div className="flex justify-between items-center">
                            <Badge variant="outline" className="border-primary text-primary font-medium">
                              COMPLETED
                            </Badge>
                            <Badge variant="outline" className="border-border text-muted-foreground font-medium uppercase">
                              {game.sport}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground font-medium mt-2">
                            {new Date(game.game_date).toLocaleDateString()}
                          </p>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                              <Avatar className="w-10 h-10 border border-border">
                                <AvatarImage src={getTeamLogo(game.home_team_id)} />
                                <AvatarFallback className="bg-secondary text-foreground text-xs font-heading font-bold">
                                  {getTeamName(game.home_team_id)?.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <span className="font-heading font-bold text-foreground text-sm block">{getTeamName(game.home_team_id)}</span>
                                <span className="text-2xl font-heading font-bold text-foreground tabular-nums">{game.home_score}</span>
                              </div>
                            </div>
                            <span className="text-muted-foreground font-medium text-2xl">-</span>
                            <div className="flex items-center gap-2">
                              <div className="text-right">
                                <span className="font-heading font-bold text-foreground text-sm block">{getTeamName(game.away_team_id)}</span>
                                <span className="text-2xl font-heading font-bold text-foreground tabular-nums">{game.away_score}</span>
                              </div>
                              <Avatar className="w-10 h-10 border border-border">
                                <AvatarImage src={getTeamLogo(game.away_team_id)} />
                                <AvatarFallback className="bg-secondary text-foreground text-xs font-heading font-bold">
                                  {getTeamName(game.away_team_id)?.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                            </div>
                          </div>
                          <Button variant="secondary" className="w-full font-medium">
                            <BarChart3 className="w-4 h-4 mr-2" />
                            Edit Stats
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  {completedGames.length === 0 && (
                    <div className="text-center py-20">
                      <CheckCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground text-xl font-heading font-bold">No completed games to edit</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>

              {/* Stats Entry Dialog */}
              <Dialog open={showStatsDialog} onOpenChange={(open) => {
                setShowStatsDialog(open);
                if (!open) setSelectedGame(null);
              }}>
                <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-heading font-bold flex items-center gap-3">
                      <FileEdit className="w-6 h-6 text-primary" />
                      {selectedGame?.status === 'completed' ? 'Edit Game Stats' : 'Enter Game Result'}
                    </DialogTitle>
                  </DialogHeader>

                  {selectedGame && (
                    <div className="space-y-6">
                      {/* Game Score Entry */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg font-heading font-bold">Final Score</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center justify-center gap-8">
                            <div className="text-center">
                              <Avatar className="w-16 h-16 mx-auto mb-2 border border-border">
                                <AvatarImage src={getTeamLogo(selectedGame.home_team_id)} />
                                <AvatarFallback className="bg-secondary text-foreground font-heading font-bold">
                                  {getTeamName(selectedGame.home_team_id)?.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <p className="font-heading font-bold text-foreground mb-2">{getTeamName(selectedGame.home_team_id)}</p>
                              <p className="text-xs text-muted-foreground font-medium mb-2 uppercase tracking-wide">HOME</p>
                              <Input
                                type="number"
                                min="0"
                                value={gameScores.home}
                                onChange={(e) => setGameScores(prev => ({ ...prev, home: parseInt(e.target.value) || 0 }))}
                                className="w-24 h-16 text-center text-3xl font-heading font-bold tabular-nums"
                              />
                            </div>
                            <div className="text-4xl font-heading font-bold text-muted-foreground">-</div>
                            <div className="text-center">
                              <Avatar className="w-16 h-16 mx-auto mb-2 border border-border">
                                <AvatarImage src={getTeamLogo(selectedGame.away_team_id)} />
                                <AvatarFallback className="bg-secondary text-foreground font-heading font-bold">
                                  {getTeamName(selectedGame.away_team_id)?.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <p className="font-heading font-bold text-foreground mb-2">{getTeamName(selectedGame.away_team_id)}</p>
                              <p className="text-xs text-muted-foreground font-medium mb-2 uppercase tracking-wide">AWAY</p>
                              <Input
                                type="number"
                                min="0"
                                value={gameScores.away}
                                onChange={(e) => setGameScores(prev => ({ ...prev, away: parseInt(e.target.value) || 0 }))}
                                className="w-24 h-16 text-center text-3xl font-heading font-bold tabular-nums"
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Player Stats Entry */}
                      <Tabs defaultValue="home" className="space-y-4">
                        <TabsList>
                          <TabsTrigger value="home">
                            {getTeamName(selectedGame.home_team_id)} ({homeTeamPlayers.length})
                          </TabsTrigger>
                          <TabsTrigger value="away">
                            {getTeamName(selectedGame.away_team_id)} ({awayTeamPlayers.length})
                          </TabsTrigger>
                        </TabsList>

                        <TabsContent value="home">
                          <div className="space-y-3">
                            {homeTeamPlayers.map(player => (
                              <Card key={player.id}>
                                <CardContent className="p-4">
                                  <div className="flex items-center gap-4">
                                    <Avatar className="w-12 h-12 border border-border">
                                      <AvatarImage src={player.photo_url} />
                                      <AvatarFallback className="bg-secondary text-foreground font-heading font-bold">
                                        {player.jersey_number}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                      <p className="font-heading font-bold text-foreground">#{player.jersey_number} {player.first_name} {player.last_name}</p>
                                      <p className="text-xs text-muted-foreground">{player.position}</p>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                      {selectedGame.sport === 'basketball' ? (
                                        <>
                                          <StatInput playerId={player.id} stat="points" label="PTS" />
                                          <StatInput playerId={player.id} stat="rebounds" label="REB" />
                                          <StatInput playerId={player.id} stat="assists" label="AST" />
                                          <StatInput playerId={player.id} stat="steals" label="STL" />
                                          <StatInput playerId={player.id} stat="blocks" label="BLK" />
                                          <StatInput playerId={player.id} stat="fouls" label="PF" max={6} />
                                          <StatInput playerId={player.id} stat="three_pointers" label="3PT" />
                                        </>
                                      ) : (
                                        <>
                                          <StatInput playerId={player.id} stat="field_goals_made" label="ATK" />
                                          <StatInput playerId={player.id} stat="blocks" label="BLK" />
                                          <StatInput playerId={player.id} stat="three_pointers" label="ACE" />
                                          <StatInput playerId={player.id} stat="rebounds" label="DIG" />
                                          <StatInput playerId={player.id} stat="assists" label="SET" />
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                            {homeTeamPlayers.length === 0 && (
                              <div className="text-center py-8 text-muted-foreground">
                                <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                <p>No players found for this team</p>
                              </div>
                            )}
                          </div>
                        </TabsContent>

                        <TabsContent value="away">
                          <div className="space-y-3">
                            {awayTeamPlayers.map(player => (
                              <Card key={player.id}>
                                <CardContent className="p-4">
                                  <div className="flex items-center gap-4">
                                    <Avatar className="w-12 h-12 border border-border">
                                      <AvatarImage src={player.photo_url} />
                                      <AvatarFallback className="bg-secondary text-foreground font-heading font-bold">
                                        {player.jersey_number}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                      <p className="font-heading font-bold text-foreground">#{player.jersey_number} {player.first_name} {player.last_name}</p>
                                      <p className="text-xs text-muted-foreground">{player.position}</p>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                      {selectedGame.sport === 'basketball' ? (
                                        <>
                                          <StatInput playerId={player.id} stat="points" label="PTS" />
                                          <StatInput playerId={player.id} stat="rebounds" label="REB" />
                                          <StatInput playerId={player.id} stat="assists" label="AST" />
                                          <StatInput playerId={player.id} stat="steals" label="STL" />
                                          <StatInput playerId={player.id} stat="blocks" label="BLK" />
                                          <StatInput playerId={player.id} stat="fouls" label="PF" max={6} />
                                          <StatInput playerId={player.id} stat="three_pointers" label="3PT" />
                                        </>
                                      ) : (
                                        <>
                                          <StatInput playerId={player.id} stat="field_goals_made" label="ATK" />
                                          <StatInput playerId={player.id} stat="blocks" label="BLK" />
                                          <StatInput playerId={player.id} stat="three_pointers" label="ACE" />
                                          <StatInput playerId={player.id} stat="rebounds" label="DIG" />
                                          <StatInput playerId={player.id} stat="assists" label="SET" />
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                            {awayTeamPlayers.length === 0 && (
                              <div className="text-center py-8 text-muted-foreground">
                                <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                <p>No players found for this team</p>
                              </div>
                            )}
                          </div>
                        </TabsContent>
                      </Tabs>

                      {/* Save Button */}
                      <div className="flex justify-end gap-3 pt-4 border-t border-border">
                        <Button 
                          variant="outline" 
                          onClick={() => {
                            setShowStatsDialog(false);
                            setSelectedGame(null);
                          }}
                        >
                          Cancel
                        </Button>
                        <Button 
                          onClick={() => setConfirmSave(true)}
                          disabled={updateGameMutation.isLoading || saveStatsMutation.isLoading}
                        >
                          <Save className="w-4 h-4 mr-2" />
                          {updateGameMutation.isLoading || saveStatsMutation.isLoading ? 'Saving...' : 'Save All'}
                        </Button>
                      </div>
                    </div>
                  )}
                </DialogContent>
              </Dialog>

              {/* Confirm Save Dialog */}
              <AlertDialog open={confirmSave} onOpenChange={setConfirmSave}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-12 h-12 bg-primary/10 border border-primary/30 flex items-center justify-center">
                        <Save className="w-6 h-6 text-primary" />
                      </div>
                      <AlertDialogTitle className="text-xl font-heading font-bold">
                        Save Game Data?
                      </AlertDialogTitle>
                    </div>
                    <AlertDialogDescription className="text-muted-foreground font-medium">
                      This will save the final score of <span className="font-heading font-bold text-foreground">{gameScores.home} - {gameScores.away}</span> and all player statistics.
                      <br /><br />
                      {selectedGame?.status === 'scheduled' && (
                        <p className="text-primary font-medium">
                          ✓ The game status will be changed to "Completed"
                        </p>
                      )}
                      {selectedGame?.status === 'completed' && (
                        <p className="text-foreground font-medium">
                          ⚠️ This will replace any existing stats for this game
                        </p>
                      )}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleSaveAll}
                    >
                      Save All
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </main>
      </div>
      
      <AIAssistant />
    </div>
  );
}