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
      const orgs = await base44.entities.Organization.list();
      return orgs.find(o => o.id === user?.organization_id);
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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  const homeTeamPlayers = selectedGame ? allPlayers.filter(p => p.team_id === selectedGame.home_team_id) : [];
  const awayTeamPlayers = selectedGame ? allPlayers.filter(p => p.team_id === selectedGame.away_team_id) : [];

  const StatInput = ({ playerId, stat, label, max = 100 }) => (
    <div className="flex flex-col">
      <label className="text-xs text-gray-500 dark:text-gray-400 font-semibold mb-1">{label}</label>
      <Input
        type="number"
        min="0"
        max={max}
        value={playerStats[playerId]?.[stat] || 0}
        onChange={(e) => updatePlayerStat(playerId, stat, e.target.value)}
        className="w-16 h-8 text-center text-sm font-bold bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600"
      />
    </div>
  );

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
              {/* Header */}
              <div className="flex items-center gap-4">
                <Link to={createPageUrl("Games")}>
                  <Button variant="outline" className="border-2 border-gray-300 dark:border-gray-600">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Games
                  </Button>
                </Link>
                <div>
                  <h1 className="text-4xl font-black text-gray-900 dark:text-white flex items-center gap-3">
                    <FileEdit className="w-10 h-10 text-blue-600" />
                    Manual Game Entry
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400 mt-2 font-medium">
                    Enter game results and player statistics for games not scored in the app
                  </p>
                </div>
              </div>

              {successMessage && (
                <div className="bg-green-100 dark:bg-green-950/30 border-2 border-green-300 dark:border-green-700 rounded-xl p-4 flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                  <p className="text-green-800 dark:text-green-300 font-bold">{successMessage}</p>
                </div>
              )}

              <Tabs defaultValue="scheduled" className="space-y-6">
                <TabsList className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 p-1 rounded-xl shadow-lg">
                  <TabsTrigger value="scheduled" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-blue-700 data-[state=active]:text-white dark:text-gray-300 font-bold rounded-lg">
                    Enter New Results ({scheduledGames.length})
                  </TabsTrigger>
                  <TabsTrigger value="completed" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-600 data-[state=active]:to-green-700 data-[state=active]:text-white dark:text-gray-300 font-bold rounded-lg">
                    Edit Completed ({completedGames.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="scheduled">
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {scheduledGames.map(game => (
                      <Card key={game.id} className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl transition-all cursor-pointer" onClick={() => handleSelectGame(game)}>
                        <CardHeader>
                          <div className="flex justify-between items-center">
                            <Badge className="bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800 font-bold">
                              SCHEDULED
                            </Badge>
                            <Badge variant="outline" className={`font-bold ${game.sport === 'basketball' ? 'text-orange-600 border-orange-600' : 'text-blue-600 border-blue-600'}`}>
                              {game.sport}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-500 dark:text-gray-400 font-semibold mt-2">
                            {new Date(game.game_date).toLocaleDateString()} at {new Date(game.game_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </p>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Avatar className="w-10 h-10 border-2 border-white dark:border-gray-700">
                                <AvatarImage src={getTeamLogo(game.home_team_id)} />
                                <AvatarFallback className="bg-gradient-to-br from-orange-500 to-orange-600 text-white text-xs font-bold">
                                  {getTeamName(game.home_team_id)?.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-bold text-gray-900 dark:text-white text-sm">{getTeamName(game.home_team_id)}</span>
                            </div>
                            <span className="text-gray-400 font-bold">vs</span>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-gray-900 dark:text-white text-sm">{getTeamName(game.away_team_id)}</span>
                              <Avatar className="w-10 h-10 border-2 border-white dark:border-gray-700">
                                <AvatarImage src={getTeamLogo(game.away_team_id)} />
                                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white text-xs font-bold">
                                  {getTeamName(game.away_team_id)?.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                            </div>
                          </div>
                          <Button className="w-full mt-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold">
                            <FileEdit className="w-4 h-4 mr-2" />
                            Enter Result
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  {scheduledGames.length === 0 && (
                    <div className="text-center py-20">
                      <Trophy className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                      <p className="text-gray-500 dark:text-gray-400 text-xl font-bold">No scheduled games to enter results for</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="completed">
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {completedGames.map(game => (
                      <Card key={game.id} className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl transition-all cursor-pointer" onClick={() => handleSelectGame(game)}>
                        <CardHeader>
                          <div className="flex justify-between items-center">
                            <Badge className="bg-green-100 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800 font-bold">
                              COMPLETED
                            </Badge>
                            <Badge variant="outline" className={`font-bold ${game.sport === 'basketball' ? 'text-orange-600 border-orange-600' : 'text-blue-600 border-blue-600'}`}>
                              {game.sport}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-500 dark:text-gray-400 font-semibold mt-2">
                            {new Date(game.game_date).toLocaleDateString()}
                          </p>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                              <Avatar className="w-10 h-10 border-2 border-white dark:border-gray-700">
                                <AvatarImage src={getTeamLogo(game.home_team_id)} />
                                <AvatarFallback className="bg-gradient-to-br from-orange-500 to-orange-600 text-white text-xs font-bold">
                                  {getTeamName(game.home_team_id)?.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <span className="font-bold text-gray-900 dark:text-white text-sm block">{getTeamName(game.home_team_id)}</span>
                                <span className="text-2xl font-black text-gray-900 dark:text-white">{game.home_score}</span>
                              </div>
                            </div>
                            <span className="text-gray-400 font-bold text-2xl">-</span>
                            <div className="flex items-center gap-2">
                              <div className="text-right">
                                <span className="font-bold text-gray-900 dark:text-white text-sm block">{getTeamName(game.away_team_id)}</span>
                                <span className="text-2xl font-black text-gray-900 dark:text-white">{game.away_score}</span>
                              </div>
                              <Avatar className="w-10 h-10 border-2 border-white dark:border-gray-700">
                                <AvatarImage src={getTeamLogo(game.away_team_id)} />
                                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white text-xs font-bold">
                                  {getTeamName(game.away_team_id)?.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                            </div>
                          </div>
                          <Button className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold">
                            <BarChart3 className="w-4 h-4 mr-2" />
                            Edit Stats
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  {completedGames.length === 0 && (
                    <div className="text-center py-20">
                      <CheckCircle className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                      <p className="text-gray-500 dark:text-gray-400 text-xl font-bold">No completed games to edit</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>

              {/* Stats Entry Dialog */}
              <Dialog open={showStatsDialog} onOpenChange={(open) => {
                setShowStatsDialog(open);
                if (!open) setSelectedGame(null);
              }}>
                <DialogContent className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 max-w-6xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-3">
                      <FileEdit className="w-6 h-6 text-blue-600" />
                      {selectedGame?.status === 'completed' ? 'Edit Game Stats' : 'Enter Game Result'}
                    </DialogTitle>
                  </DialogHeader>

                  {selectedGame && (
                    <div className="space-y-6">
                      {/* Game Score Entry */}
                      <Card className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 border-2 border-gray-200 dark:border-gray-700">
                        <CardHeader>
                          <CardTitle className="text-lg font-bold text-gray-900 dark:text-white">Final Score</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center justify-center gap-8">
                            <div className="text-center">
                              <Avatar className="w-16 h-16 mx-auto mb-2 border-4 border-white dark:border-gray-700 shadow-lg">
                                <AvatarImage src={getTeamLogo(selectedGame.home_team_id)} />
                                <AvatarFallback className="bg-gradient-to-br from-orange-500 to-orange-600 text-white font-bold">
                                  {getTeamName(selectedGame.home_team_id)?.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <p className="font-bold text-gray-900 dark:text-white mb-2">{getTeamName(selectedGame.home_team_id)}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold mb-2">HOME</p>
                              <Input
                                type="number"
                                min="0"
                                value={gameScores.home}
                                onChange={(e) => setGameScores(prev => ({ ...prev, home: parseInt(e.target.value) || 0 }))}
                                className="w-24 h-16 text-center text-3xl font-black bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600"
                              />
                            </div>
                            <div className="text-4xl font-black text-gray-400">-</div>
                            <div className="text-center">
                              <Avatar className="w-16 h-16 mx-auto mb-2 border-4 border-white dark:border-gray-700 shadow-lg">
                                <AvatarImage src={getTeamLogo(selectedGame.away_team_id)} />
                                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white font-bold">
                                  {getTeamName(selectedGame.away_team_id)?.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <p className="font-bold text-gray-900 dark:text-white mb-2">{getTeamName(selectedGame.away_team_id)}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold mb-2">AWAY</p>
                              <Input
                                type="number"
                                min="0"
                                value={gameScores.away}
                                onChange={(e) => setGameScores(prev => ({ ...prev, away: parseInt(e.target.value) || 0 }))}
                                className="w-24 h-16 text-center text-3xl font-black bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600"
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Player Stats Entry */}
                      <Tabs defaultValue="home" className="space-y-4">
                        <TabsList className="bg-gray-100 dark:bg-gray-900 p-1 rounded-xl">
                          <TabsTrigger value="home" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-orange-600 data-[state=active]:text-white font-bold rounded-lg">
                            {getTeamName(selectedGame.home_team_id)} ({homeTeamPlayers.length})
                          </TabsTrigger>
                          <TabsTrigger value="away" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-blue-600 data-[state=active]:text-white font-bold rounded-lg">
                            {getTeamName(selectedGame.away_team_id)} ({awayTeamPlayers.length})
                          </TabsTrigger>
                        </TabsList>

                        <TabsContent value="home">
                          <div className="space-y-3">
                            {homeTeamPlayers.map(player => (
                              <Card key={player.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
                                <CardContent className="p-4">
                                  <div className="flex items-center gap-4">
                                    <Avatar className="w-12 h-12 border-2 border-orange-200 dark:border-orange-800">
                                      <AvatarImage src={player.photo_url} />
                                      <AvatarFallback className="bg-gradient-to-br from-orange-500 to-orange-600 text-white font-bold">
                                        {player.jersey_number}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                      <p className="font-bold text-gray-900 dark:text-white">#{player.jersey_number} {player.first_name} {player.last_name}</p>
                                      <p className="text-xs text-gray-500 dark:text-gray-400">{player.position}</p>
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
                              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                <p>No players found for this team</p>
                              </div>
                            )}
                          </div>
                        </TabsContent>

                        <TabsContent value="away">
                          <div className="space-y-3">
                            {awayTeamPlayers.map(player => (
                              <Card key={player.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
                                <CardContent className="p-4">
                                  <div className="flex items-center gap-4">
                                    <Avatar className="w-12 h-12 border-2 border-blue-200 dark:border-blue-800">
                                      <AvatarImage src={player.photo_url} />
                                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white font-bold">
                                        {player.jersey_number}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                      <p className="font-bold text-gray-900 dark:text-white">#{player.jersey_number} {player.first_name} {player.last_name}</p>
                                      <p className="text-xs text-gray-500 dark:text-gray-400">{player.position}</p>
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
                              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                <p>No players found for this team</p>
                              </div>
                            )}
                          </div>
                        </TabsContent>
                      </Tabs>

                      {/* Save Button */}
                      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <Button 
                          variant="outline" 
                          onClick={() => {
                            setShowStatsDialog(false);
                            setSelectedGame(null);
                          }}
                          className="border-2 border-gray-300 dark:border-gray-600 font-bold"
                        >
                          Cancel
                        </Button>
                        <Button 
                          onClick={() => setConfirmSave(true)}
                          className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold"
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
                <AlertDialogContent className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700">
                  <AlertDialogHeader>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-12 h-12 bg-green-100 dark:bg-green-950/30 rounded-xl flex items-center justify-center">
                        <Save className="w-6 h-6 text-green-600 dark:text-green-400" />
                      </div>
                      <AlertDialogTitle className="text-xl font-black text-gray-900 dark:text-white">
                        Save Game Data?
                      </AlertDialogTitle>
                    </div>
                    <AlertDialogDescription className="text-gray-600 dark:text-gray-400 font-medium">
                      This will save the final score of <span className="font-bold text-gray-900 dark:text-white">{gameScores.home} - {gameScores.away}</span> and all player statistics.
                      <br /><br />
                      {selectedGame?.status === 'scheduled' && (
                        <p className="text-blue-600 dark:text-blue-400 font-semibold">
                          ✓ The game status will be changed to "Completed"
                        </p>
                      )}
                      {selectedGame?.status === 'completed' && (
                        <p className="text-orange-600 dark:text-orange-400 font-semibold">
                          ⚠️ This will replace any existing stats for this game
                        </p>
                      )}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="border-2 border-gray-300 dark:border-gray-600 font-bold">
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleSaveAll}
                      className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold"
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