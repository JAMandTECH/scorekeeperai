import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, User, Edit, LayoutGrid, Table, Trash2, AlertTriangle, BarChart3 } from "lucide-react";
import PlayerStatsDialog from "@/components/players/PlayerStatsDialog";
import PlayerLeaderboard from "@/components/players/PlayerLeaderboard";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { createPageUrl } from "@/utils";
import AdminHeader from "@/components/AdminHeader";
import AdminSidebar from "@/components/AdminSidebar";
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

export default function Players() {
  const [showForm, setShowForm] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [deletingPlayer, setDeletingPlayer] = useState(null);
  const [statsPlayer, setStatsPlayer] = useState(null);
  const [user, setUser] = useState(null);
  const [selectedDivision, setSelectedDivision] = useState('all');
  const [selectedSport, setSelectedSport] = useState('all');
  const [selectedTeam, setSelectedTeam] = useState('all');
  const [viewMode, setViewMode] = useState('card');
  const [photoFile, setPhotoFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const queryClient = useQueryClient();

  const canManagePlayers = user?.role === 'admin';

  useEffect(() => {
    loadUser();
    const urlParams = new URLSearchParams(window.location.search);
    const teamId = urlParams.get('team_id');
    if (teamId) setSelectedTeam(teamId);
    
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
      // For multi-org users, the active organization (set by the org switcher) is the
      // org being viewed. Prefer it over the primary organization_id.
      const orgId = currentUser?.active_organization_id || currentUser?.organization_id;
      setUser({ ...currentUser, organization_id: orgId });
    } catch (error) {
      console.error("Error loading user:", error);
      base44.auth.redirectToLogin(createPageUrl("Players"));
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

  const divisions = ['all', ...new Set(teams.map(t => t.division || 'No Division'))].sort((a, b) => {
    if (a === 'all') return -1;
    if (b === 'all') return 1;
    if (a === 'No Division') return -1;
    if (b === 'No Division') return 1;
    return a.localeCompare(b);
  });
  const sports = ['all', 'basketball', 'volleyball'];

  const { data: allPlayers = [] } = useQuery({
    queryKey: ['players', user?.organization_id],
    queryFn: () => base44.entities.Player.list('-created_date'),
    enabled: !!user,
  });

  const { data: allPlayerStats = [] } = useQuery({
  queryKey: ['player-stats'],
  queryFn: () => base44.entities.PlayerGameStats.list(),
  enabled: !!user,
  });

  // Completed games (only these should count toward player statistics)
  const { data: completedGames = [] } = useQuery({
  queryKey: ['completed-games', user?.organization_id],
  queryFn: async () => {
    if (!user?.organization_id) return [];
    return base44.entities.Game.filter({ organization_id: user.organization_id, status: 'completed' });
  },
  enabled: !!user?.organization_id,
  });

  // Load stats only from completed games (robust via function + fallback)
  const { data: playerGameStats = [] } = useQuery({
    queryKey: ['playerGameStatsPlayers', user?.organization_id, (completedGames || []).map(g => g.id).join(',')],
    queryFn: async () => {
      const gameIds = (completedGames || []).map(g => g.id);
      if (gameIds.length === 0) return [];
      try {
        const res = await base44.functions.invoke('getGamePlayerStats', { game_ids: gameIds });
        return Array.isArray(res.data) ? res.data : [];
      } catch (e) {
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
        return results;
      }
    },
    enabled: (completedGames || []).length > 0,
    staleTime: 30000,
    gcTime: 5 * 60 * 1000,
    refetchInterval: 20000,
  });

  const filteredTeams = teams.filter(team => {
    const divisionMatch = selectedDivision === 'all' || (team.division || 'No Division') === selectedDivision;
    const sportMatch = selectedSport === 'all' || team.sport === selectedSport;
    return divisionMatch && sportMatch;
  });

  const getTeamName = (teamId) => {
    const team = teams.find(t => t.id === teamId);
    return team?.name || 'Unknown Team';
  };

  const getTeamLogo = (teamId) => {
    const team = teams.find(t => t.id === teamId);
    return team?.logo_url || null;
  };

  const getTeamSport = (teamId) => {
    const team = teams.find(t => t.id === teamId);
    return team?.sport || 'basketball';
  };

  // Only include stats from completed games
  const completedGameIds = new Set((completedGames || []).map(g => g.id));

  // Team games-played divisor — how many completed games each team played (home or away).
  // Mirrors the Dashboard/Home/Statistics leaderboards so "games played" matches everywhere.
  const teamGamesPlayedMap = (() => {
    const m = new Map();
    (completedGames || []).forEach((g) => {
      if (g.home_team_id) m.set(g.home_team_id, (m.get(g.home_team_id) || 0) + 1);
      if (g.away_team_id) m.set(g.away_team_id, (m.get(g.away_team_id) || 0) + 1);
    });
    return m;
  })();

  const players = allPlayers.filter(p => {
    const playerTeam = teams.find(t => t.id === p.team_id);
    if (!playerTeam) return false;

    if (selectedDivision !== 'all') {
      const teamDivision = playerTeam.division || 'No Division';
      if (teamDivision !== selectedDivision) return false;
    }

    if (selectedSport !== 'all') {
      if (playerTeam.sport !== selectedSport) return false;
    }

    if (selectedTeam !== 'all') {
      if (p.team_id !== selectedTeam) return false;
    }

    return true;
  }).map(player => {
    const playerStatsList = playerGameStats.filter(s => s.player_id === player.id && completedGameIds.has(s.game_id));
    const sport = getTeamSport(player.team_id);
    // Use the team's completed-games count as the divisor (synced with Dashboard/Home/Statistics)
    const gamesPlayed = teamGamesPlayedMap.get(player.team_id) || 0;
    
    if (sport === 'volleyball') {
      const attacks = playerStatsList.reduce((sum, s) => sum + (s.attacks || 0), 0);
      const blocks = playerStatsList.reduce((sum, s) => sum + (s.blocks || 0), 0);
      const aces = playerStatsList.reduce((sum, s) => sum + (s.aces || 0), 0);
      const points = attacks + blocks + aces;
      
      return {
        ...player,
        stats: [
          { value: points, label: 'PTS' },
          { value: attacks, label: 'ATK' },
          { value: blocks, label: 'BLK' },
          { value: aces, label: 'ACE' },
        ],
        games_played: gamesPlayed,
      };
    } else {
      const points = playerStatsList.reduce((sum, s) => sum + (s.points || 0), 0);
      const rebounds = playerStatsList.reduce((sum, s) => sum + (s.rebounds || 0), 0);
      const assists = playerStatsList.reduce((sum, s) => sum + (s.assists || 0), 0);
      const blocks = playerStatsList.reduce((sum, s) => sum + (s.blocks || 0), 0);
      const steals = playerStatsList.reduce((sum, s) => sum + (s.steals || 0), 0);
      
      return {
        ...player,
        stats: [
          { value: points, label: 'PTS' },
          { value: rebounds, label: 'REB' },
          { value: assists, label: 'AST' },
          { value: blocks, label: 'BLK' },
          { value: steals, label: 'STL' },
        ],
        games_played: gamesPlayed,
      };
    }
  });

  const handleDivisionChange = (division) => {
    setSelectedDivision(division);
    setSelectedTeam('all');
  };

  const handleSportChange = (sport) => {
    setSelectedSport(sport);
    setSelectedTeam('all');
  };

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Player.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['players']);
      setShowForm(false);
      setEditingPlayer(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Player.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['players']);
      setShowForm(false);
      setEditingPlayer(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Player.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['players']);
      setDeletingPlayer(null);
    },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUploading(true);

    try {
      const formData = new FormData(e.target);
      const data = {
        team_id: formData.get('team_id'),
        first_name: formData.get('first_name'),
        last_name: formData.get('last_name'),
        jersey_number: formData.get('jersey_number'),
        position: formData.get('position'),
        height: formData.get('height'),
      };

      if (photoFile) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file: photoFile });
        data.photo_url = file_url;
      }

      if (editingPlayer) {
        updateMutation.mutate({ id: editingPlayer.id, data });
      } else {
        createMutation.mutate(data);
      }
    } catch (error) {
      console.error("Error uploading photo:", error);
    } finally {
      setUploading(false);
      setPhotoFile(null);
    }
  };

  const getPlayerStatRecords = (playerId) =>
    playerGameStats.filter(s => s.player_id === playerId && completedGameIds.has(s.game_id));

  const handleDeleteClick = (player) => {
    const playerStats = allPlayerStats.filter(s => s.player_id === player.id);
    setDeletingPlayer({ ...player, statsCount: playerStats.length });
  };

  const PlayerCard = ({ player, sport, sportColor, teamLogo }) => {
    const isBasketball = sport === 'basketball';
    const cardClasses = isBasketball
      ? "border-orange-100 dark:border-orange-900 bg-gradient-to-br from-white to-orange-50 dark:from-gray-800 dark:to-orange-950/30"
      : "border-blue-100 dark:border-blue-900 bg-gradient-to-br from-white to-blue-50 dark:from-gray-800 dark:to-blue-950/30";
    const glowClasses = isBasketball
      ? "bg-gradient-to-br from-orange-500/20 to-transparent"
      : "bg-gradient-to-br from-blue-500/20 to-transparent";
    const avatarClasses = isBasketball
      ? "bg-gradient-to-br from-orange-600 to-orange-700"
      : "bg-gradient-to-br from-blue-600 to-blue-700";
    const statClasses = isBasketball
      ? "text-orange-600 dark:text-orange-400"
      : "text-blue-600 dark:text-blue-400";

    return (
    <Card className={`relative overflow-hidden border-2 ${cardClasses} shadow-lg hover:shadow-2xl transition-all group`}>
      <div className={`absolute top-0 right-0 w-40 h-40 ${glowClasses} rounded-full blur-3xl`}></div>
      
      <CardHeader className="pb-3 relative z-10">
        <div className="flex justify-between items-start">
          <div className="flex items-start gap-3 flex-1">
            <Avatar className="w-16 h-16 border-4 border-white dark:border-gray-700 shadow-xl">
              <AvatarImage src={player.photo_url} />
              <AvatarFallback className={`${avatarClasses} text-white font-black text-lg`}>
                {player.jersey_number}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h3 className="text-gray-900 dark:text-white font-black text-lg truncate">
                {player.first_name} {player.last_name}
              </h3>
              <div className="flex items-center gap-2 mt-2">
                {teamLogo && (
                  <Avatar className="w-7 h-7 border-2 border-gray-300 dark:border-gray-600 shadow-md">
                    <AvatarImage src={teamLogo} />
                    <AvatarFallback className="text-[10px] bg-gray-200 dark:bg-gray-700">T</AvatarFallback>
                  </Avatar>
                )}
                <p className="text-gray-500 dark:text-gray-400 text-sm font-bold truncate">{getTeamName(player.team_id)}</p>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setStatsPlayer(player)}
              className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30"
              title="View statistics"
            >
              <BarChart3 className="w-4 h-4" />
            </Button>
            {canManagePlayers && (
              <>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => {
                    setEditingPlayer(player);
                    setShowForm(true);
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => handleDeleteClick(player)}
                  className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4 relative z-10">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/60 dark:bg-gray-900/60 rounded-xl p-3">
            <span className="text-gray-500 dark:text-gray-400 text-xs font-semibold">Position</span>
            <p className="text-gray-900 dark:text-white font-bold">{player.position || '-'}</p>
          </div>
          <div className="bg-white/60 dark:bg-gray-900/60 rounded-xl p-3">
            <span className="text-gray-500 dark:text-gray-400 text-xs font-semibold">Height</span>
            <p className="text-gray-900 dark:text-white font-bold">{player.height || '-'}</p>
          </div>
        </div>
        
        <div className="border-t-2 border-gray-200 dark:border-gray-700 pt-4">
          <div className={`grid ${sport === 'volleyball' ? 'grid-cols-4' : 'grid-cols-5'} gap-2 text-center`}>
            {player.stats.map((stat, idx) => (
              <div key={idx} className="bg-white/60 dark:bg-gray-900/60 rounded-xl p-3">
                <div className={`${statClasses} font-black text-xl`}>
                  {stat.value || 0}
                </div>
                <div className="text-gray-500 dark:text-gray-400 text-xs font-bold">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="text-center bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-900 dark:to-gray-800 rounded-xl p-3">
          <span className="text-sm text-gray-600 dark:text-gray-400 font-bold">
            {player.games_played || 0} games played
          </span>
        </div>
      </CardContent>
    </Card>
    );
  };

  const PlayerTable = ({ players }) => {
    const allSameSport = players.length > 0 && players.every(p => getTeamSport(p.team_id) === getTeamSport(players[0].team_id));
    const displaySport = allSameSport ? getTeamSport(players[0].team_id) : null;
    const isVolleyball = displaySport === 'volleyball';
    
    return (
      <Card className="bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 shadow-lg hover:shadow-xl transition-shadow">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-900 border-b-2 border-gray-100 dark:border-gray-700">
                  <th className="text-left py-4 px-4 text-gray-600 dark:text-gray-400 font-bold text-sm">PLAYER</th>
                  <th className="text-center py-4 px-4 text-gray-600 dark:text-gray-400 font-bold text-sm">TEAM</th>
                  <th className="text-center py-4 px-4 text-gray-600 dark:text-gray-400 font-bold text-sm">POS</th>
                  <th className="text-center py-4 px-4 text-gray-600 dark:text-gray-400 font-bold text-sm">HT</th>
                  <th className="text-center py-4 px-4 text-gray-600 dark:text-gray-400 font-bold text-sm">PTS</th>
                  {isVolleyball ? (
                    <>
                      <th className="text-center py-4 px-4 text-gray-600 dark:text-gray-400 font-bold text-sm">ATK</th>
                      <th className="text-center py-4 px-4 text-gray-600 dark:text-gray-400 font-bold text-sm">BLK</th>
                      <th className="text-center py-4 px-4 text-gray-600 dark:text-gray-400 font-bold text-sm">ACE</th>
                    </>
                  ) : (
                    <>
                      <th className="text-center py-4 px-4 text-gray-600 dark:text-gray-400 font-bold text-sm">REB</th>
                      <th className="text-center py-4 px-4 text-gray-600 dark:text-gray-400 font-bold text-sm">AST</th>
                      <th className="text-center py-4 px-4 text-gray-600 dark:text-gray-400 font-bold text-sm">BLK</th>
                      <th className="text-center py-4 px-4 text-gray-600 dark:text-gray-400 font-bold text-sm">STL</th>
                    </>
                  )}
                  <th className="text-center py-4 px-4 text-gray-600 dark:text-gray-400 font-bold text-sm">GP</th>
                  <th className="text-center py-4 px-4 text-gray-600 dark:text-gray-400 font-bold text-sm">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {players.map((player) => {
                  const sport = getTeamSport(player.team_id);
                  const sportColor = sport === 'basketball' ? 'orange' : 'blue';
                  const teamLogo = getTeamLogo(player.team_id);
                  
                  const isBasketball = sport === 'basketball';
                  const rowHoverClass = isBasketball 
                    ? "hover:bg-orange-50/50 dark:hover:bg-orange-950/20" 
                    : "hover:bg-blue-50/50 dark:hover:bg-blue-950/20";
                  const avatarBgClass = isBasketball
                    ? "bg-gradient-to-br from-orange-500 to-orange-600"
                    : "bg-gradient-to-br from-blue-500 to-blue-600";

                  return (
                    <tr key={player.id} className={`border-b border-gray-100 dark:border-gray-700 ${rowHoverClass} transition-colors`}>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-12 h-12 border-2 border-white dark:border-gray-700 shadow-md">
                            <AvatarImage src={player.photo_url} />
                            <AvatarFallback className={`${avatarBgClass} text-white text-xs font-bold`}>
                              {player.jersey_number}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-bold text-gray-900 dark:text-white">
                              {player.first_name} {player.last_name}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold">#{player.jersey_number}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-center gap-3">
                          {teamLogo ? (
                            <Avatar className="w-8 h-8 border-2 border-gray-300 dark:border-gray-600 shadow-md">
                              <AvatarImage src={teamLogo} />
                              <AvatarFallback className="text-[10px] bg-gray-200 dark:bg-gray-700 font-bold">T</AvatarFallback>
                            </Avatar>
                          ) : (
                            <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                              <span className="text-[10px] text-gray-500 dark:text-gray-400 font-bold">T</span>
                            </div>
                          )}
                          <span className="text-sm font-bold text-gray-900 dark:text-white">{getTeamName(player.team_id)}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center text-gray-600 dark:text-gray-400 font-semibold text-sm">
                        {player.position || '-'}
                      </td>
                      <td className="py-4 px-4 text-center text-gray-600 dark:text-gray-400 font-semibold text-sm">
                        {player.height || '-'}
                      </td>
                      {player.stats.map((stat, idx) => (
                        <td key={idx} className="py-4 px-4 text-center font-bold text-lg text-blue-600 dark:text-blue-400">
                          {stat.value || 0}
                        </td>
                      ))}
                      <td className="py-4 px-4 text-center text-gray-600 dark:text-gray-400 font-semibold">
                        {player.games_played || 0}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-center gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => setStatsPlayer(player)}
                            className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                            title="View statistics"
                          >
                            <BarChart3 className="w-4 h-4" />
                          </Button>
                          {canManagePlayers && (
                            <>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => {
                                  setEditingPlayer(player);
                                  setShowForm(true);
                                }}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleDeleteClick(player)}
                                className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-purple-50/30 to-gray-50 dark:from-gray-900 dark:via-purple-950/10 dark:to-gray-900">
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
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h1 className="text-4xl font-black text-gray-900 dark:text-white">Players</h1>
                  <p className="text-gray-600 dark:text-gray-400 mt-2 font-medium">Manage player rosters</p>
                </div>
                {canManagePlayers && (
                  <Button 
                    onClick={() => {
                      setEditingPlayer(null);
                      setShowForm(true);
                    }}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold shadow-xl"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Add Player
                  </Button>
                )}
              </div>

              <Card className="bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-gray-900 dark:text-white">Filter Players</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                          {players.length} player{players.length !== 1 ? 's' : ''} found
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <Label className="text-xs font-bold text-gray-600 dark:text-gray-400 mb-2 block">SPORT</Label>
                        <select
                          value={selectedSport}
                          onChange={(e) => handleSportChange(e.target.value)}
                          className="w-full bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-xl px-3 py-2.5 font-bold shadow-sm hover:border-purple-400 dark:hover:border-purple-600 transition-colors"
                        >
                          {sports.map(sport => (
                            <option key={sport} value={sport}>
                              {sport === 'all' ? '🏀🏐 All Sports' : sport === 'basketball' ? '🏀 Basketball' : '🏐 Volleyball'}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <Label className="text-xs font-bold text-gray-600 dark:text-gray-400 mb-2 block">DIVISION</Label>
                        <select
                          value={selectedDivision}
                          onChange={(e) => handleDivisionChange(e.target.value)}
                          className="w-full bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-xl px-3 py-2.5 font-bold shadow-sm hover:border-purple-400 dark:hover:border-purple-600 transition-colors"
                        >
                          {divisions.map(div => (
                            <option key={div} value={div}>
                              {div === 'all' ? '📁 All Divisions' : div}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <Label className="text-xs font-bold text-gray-600 dark:text-gray-400 mb-2 block">TEAM</Label>
                        <select
                          value={selectedTeam}
                          onChange={(e) => setSelectedTeam(e.target.value)}
                          className="w-full bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-xl px-3 py-2.5 font-bold shadow-sm hover:border-purple-400 dark:hover:border-purple-600 transition-colors"
                        >
                          <option value="all">👥 All Teams</option>
                          {filteredTeams.map(team => (
                            <option key={team.id} value={team.id}>
                              {team.sport === 'basketball' ? '🏀' : '🏐'} {team.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <Label className="text-xs font-bold text-gray-600 dark:text-gray-400 mb-2 block">VIEW</Label>
                        <div className="flex bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 rounded-xl p-1 shadow-sm">
                          <Button
                            variant={viewMode === 'card' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setViewMode('card')}
                            className={`flex-1 font-bold ${viewMode === 'card' ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white' : 'text-gray-600 dark:text-gray-400'}`}
                          >
                            <LayoutGrid className="w-4 h-4" />
                          </Button>
                          <Button
                            variant={viewMode === 'table' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setViewMode('table')}
                            className={`flex-1 font-bold ${viewMode === 'table' ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white' : 'text-gray-600 dark:text-gray-400'}`}
                          >
                            <Table className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    {(selectedSport !== 'all' || selectedDivision !== 'all' || selectedTeam !== 'all') && (
                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                        <span className="text-xs font-bold text-gray-500 dark:text-gray-400">Active Filters:</span>
                        {selectedSport !== 'all' && (
                          <Badge className="bg-orange-100 text-orange-700 border border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800 font-bold">
                            {selectedSport === 'basketball' ? '🏀 Basketball' : '🏐 Volleyball'}
                            <button
                              onClick={() => handleSportChange('all')}
                              className="ml-2 hover:text-orange-900 dark:hover:text-orange-100"
                            >
                              ✕
                            </button>
                          </Badge>
                        )}
                        {selectedDivision !== 'all' && (
                          <Badge className="bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800 font-bold">
                            📁 {selectedDivision}
                            <button
                              onClick={() => handleDivisionChange('all')}
                              className="ml-2 hover:text-blue-900 dark:hover:text-blue-100"
                            >
                              ✕
                            </button>
                          </Badge>
                        )}
                        {selectedTeam !== 'all' && (
                          <Badge className="bg-purple-100 text-purple-700 border border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800 font-bold">
                            👥 {getTeamName(selectedTeam)}
                            <button
                              onClick={() => setSelectedTeam('all')}
                              className="ml-2 hover:text-purple-900 dark:hover:text-purple-100"
                            >
                              ✕
                            </button>
                          </Badge>
                        )}
                        <button
                          onClick={() => {
                            setSelectedSport('all');
                            setSelectedDivision('all');
                            setSelectedTeam('all');
                          }}
                          className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 font-bold underline ml-2"
                        >
                          Clear All
                        </button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {players.length > 0 ? (
                viewMode === 'card' ? (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {players.map((player) => {
                      const sport = getTeamSport(player.team_id);
                      const sportColor = sport === 'basketball' ? 'orange' : 'blue';
                      const teamLogo = getTeamLogo(player.team_id);
                      
                      return (
                        <PlayerCard 
                          key={player.id} 
                          player={player} 
                          sport={sport} 
                          sportColor={sportColor} 
                          teamLogo={teamLogo} 
                        />
                      );
                    })}
                  </div>
                ) : (
                  <PlayerLeaderboard
                    players={players}
                    getTeamName={getTeamName}
                    getTeamLogo={getTeamLogo}
                    getTeamSport={getTeamSport}
                    canManagePlayers={canManagePlayers}
                    onViewStats={setStatsPlayer}
                    onEdit={(player) => {
                      setEditingPlayer(player);
                      setShowForm(true);
                    }}
                    onDelete={handleDeleteClick}
                  />
                )
              ) : (
                <div className="text-center py-20">
                  <div className="w-24 h-24 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
                    <User className="w-12 h-12 text-gray-400 dark:text-gray-500" />
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 text-xl font-bold">No players found</p>
                  <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">Add your first player to get started</p>
                </div>
              )}

              <Dialog open={showForm} onOpenChange={setShowForm}>
                <DialogContent className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 max-w-md">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-black text-gray-900 dark:text-white">
                      {editingPlayer ? 'Edit Player' : 'Add New Player'}
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Label className="font-bold text-gray-700 dark:text-gray-300">Player Photo</Label>
                      <div className="mt-2 flex items-center gap-4">
                        <Avatar className="w-20 h-20 border-4 border-gray-200 dark:border-gray-600">
                          <AvatarImage src={photoFile ? URL.createObjectURL(photoFile) : editingPlayer?.photo_url} />
                          <AvatarFallback className="bg-gradient-to-br from-gray-300 to-gray-400 dark:from-gray-600 dark:to-gray-700">
                            <User className="w-8 h-8 text-gray-500 dark:text-gray-400" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={(e) => setPhotoFile(e.target.files[0])}
                            className="bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white font-medium"
                          />
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">PNG, JPG, or GIF (Max 5MB)</p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="team_id" className="font-bold text-gray-700 dark:text-gray-300">Team</Label>
                      <select
                        id="team_id"
                        name="team_id"
                        defaultValue={editingPlayer?.team_id}
                        required
                        className="w-full bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-xl px-3 py-2 font-medium"
                      >
                        <option value="">Select a team</option>
                        {teams.map(team => (
                          <option key={team.id} value={team.id}>{team.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="first_name" className="font-bold text-gray-700 dark:text-gray-300">First Name</Label>
                        <Input
                          id="first_name"
                          name="first_name"
                          defaultValue={editingPlayer?.first_name}
                          required
                          className="bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white font-medium"
                        />
                      </div>
                      <div>
                        <Label htmlFor="last_name" className="font-bold text-gray-700 dark:text-gray-300">Last Name</Label>
                        <Input
                          id="last_name"
                          name="last_name"
                          defaultValue={editingPlayer?.last_name}
                          required
                          className="bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white font-medium"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="jersey_number" className="font-bold text-gray-700 dark:text-gray-300">Jersey #</Label>
                        <Input
                          id="jersey_number"
                          name="jersey_number"
                          defaultValue={editingPlayer?.jersey_number}
                          required
                          className="bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white font-medium"
                        />
                      </div>
                      <div>
                        <Label htmlFor="position" className="font-bold text-gray-700 dark:text-gray-300">Position</Label>
                        <Input
                          id="position"
                          name="position"
                          defaultValue={editingPlayer?.position}
                          placeholder="e.g., Guard, Forward"
                          className="bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white font-medium"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="height" className="font-bold text-gray-700 dark:text-gray-300">Height</Label>
                      <Input
                        id="height"
                        name="height"
                        defaultValue={editingPlayer?.height}
                        placeholder="e.g., 6'2&quot;"
                        className="bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white font-medium"
                      />
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => {
                          setShowForm(false);
                          setPhotoFile(null);
                        }} 
                        className="border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 font-bold"
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={uploading}
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold"
                      >
                        {uploading ? 'Uploading...' : editingPlayer ? 'Update' : 'Create'}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>

              <PlayerStatsDialog
                open={!!statsPlayer}
                onOpenChange={(o) => !o && setStatsPlayer(null)}
                player={statsPlayer}
                sport={statsPlayer ? getTeamSport(statsPlayer.team_id) : "basketball"}
                teamName={statsPlayer ? getTeamName(statsPlayer.team_id) : ""}
                teamLogo={statsPlayer ? getTeamLogo(statsPlayer.team_id) : null}
                statRecords={statsPlayer ? getPlayerStatRecords(statsPlayer.id) : []}
              />

              <AlertDialog open={!!deletingPlayer} onOpenChange={() => setDeletingPlayer(null)}>
                <AlertDialogContent className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700">
                  <AlertDialogHeader>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-12 h-12 bg-red-100 dark:bg-red-950/30 rounded-xl flex items-center justify-center">
                        <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
                      </div>
                      <AlertDialogTitle className="text-xl font-black text-gray-900 dark:text-white">
                        Delete Player?
                      </AlertDialogTitle>
                    </div>
                    <AlertDialogDescription className="text-gray-600 dark:text-gray-400 font-medium">
                      Are you sure you want to delete <span className="font-bold text-gray-900 dark:text-white">{deletingPlayer?.first_name} {deletingPlayer?.last_name}</span>?
                      {deletingPlayer?.statsCount > 0 && (
                        <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                          <p className="text-sm text-yellow-800 dark:text-yellow-300 font-semibold">
                            ⚠️ Warning: This player has {deletingPlayer.statsCount} game statistic record(s). All statistics will be permanently deleted.
                          </p>
                        </div>
                      )}
                      <p className="mt-3 font-semibold text-red-600 dark:text-red-400">This action cannot be undone.</p>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="border-2 border-gray-300 dark:border-gray-600 font-bold">
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deleteMutation.mutate(deletingPlayer.id)}
                      className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold"
                    >
                      Delete Player
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}