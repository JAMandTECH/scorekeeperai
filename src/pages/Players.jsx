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

  // Load stats from completed games — direct PlayerGameStats.filter in chunks of 50,
  // the SAME path used by the Dashboard (usePlayerLeaders) and Home. The
  // getGamePlayerStats backend function can return partial data on timeout,
  // which made the Players leaderboard diverge from the Dashboard.
  const { data: playerGameStats = [] } = useQuery({
    queryKey: ['playerGameStatsPlayers', user?.organization_id, (completedGames || []).map(g => g.id).join(',')],
    queryFn: async () => {
      const gameIds = (completedGames || []).map(g => g.id);
      if (gameIds.length === 0) return [];
      const results = [];
      for (let i = 0; i < gameIds.length; i += 10) {
        const chunk = gameIds.slice(i, i + 10);
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

  // Filter completed games by the selected division/sport so that stats and the
  // games-played divisor match the Dashboard/Home/Statistics leaderboards exactly.
  // A game belongs to a division if either team's division matches (same rule as
  // buildLeaderboard in usePlayerLeaders).
  const teamsById = new Map(teams.map(t => [t.id, t]));
  const eligibleCompletedGames = (completedGames || []).filter(g => {
    if (selectedSport !== 'all' && (g.sport || '').toLowerCase() !== selectedSport) return false;
    if (selectedDivision !== 'all') {
      const homeDiv = teamsById.get(g.home_team_id)?.division || 'No Division';
      const awayDiv = teamsById.get(g.away_team_id)?.division || 'No Division';
      if (homeDiv !== selectedDivision && awayDiv !== selectedDivision) return false;
    }
    return true;
  });

  // Only include stats from eligible completed games
  const completedGameIds = new Set(eligibleCompletedGames.map(g => g.id));

  // Team games-played divisor — how many eligible completed games each team played
  // (home or away). Mirrors the Dashboard/Home/Statistics leaderboards so "games
  // played" matches everywhere.
  const teamGamesPlayedMap = (() => {
    const m = new Map();
    eligibleCompletedGames.forEach((g) => {
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
    mutationFn: async (data) => {
      let seasonId = null;
      try {
        const res = await base44.functions.invoke('getActiveSeason', {});
        seasonId = res.data?.season?.id || null;
      } catch (_) {}
      return base44.entities.Player.create({ ...data, season_id: seasonId });
    },
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
    return (
    <Card className="relative border border-border bg-card hover:border-foreground/20 transition-colors">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex items-start gap-3 flex-1">
            <Avatar className="w-16 h-16 border border-border">
              <AvatarImage src={player.photo_url} />
              <AvatarFallback className="bg-secondary text-foreground font-heading font-bold text-lg">
                {player.jersey_number}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h3 className="text-foreground font-heading font-bold text-lg truncate">
                {player.first_name} {player.last_name}
              </h3>
              <div className="flex items-center gap-2 mt-2">
                {teamLogo && (
                  <Avatar className="w-7 h-7 border border-border">
                    <AvatarImage src={teamLogo} />
                    <AvatarFallback className="text-[10px] bg-muted text-muted-foreground">T</AvatarFallback>
                  </Avatar>
                )}
                <p className="text-muted-foreground text-sm font-medium truncate">{getTeamName(player.team_id)}</p>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setStatsPlayer(player)}
              className="text-muted-foreground hover:text-foreground"
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
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => handleDeleteClick(player)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="border border-border bg-background p-3">
            <span className="text-muted-foreground text-xs font-medium">Position</span>
            <p className="text-foreground font-heading font-bold">{player.position || '-'}</p>
          </div>
          <div className="border border-border bg-background p-3">
            <span className="text-muted-foreground text-xs font-medium">Height</span>
            <p className="text-foreground font-heading font-bold">{player.height || '-'}</p>
          </div>
        </div>
        
        <div className="border-t border-border pt-4">
          <div className={`grid ${sport === 'volleyball' ? 'grid-cols-4' : 'grid-cols-5'} gap-2 text-center`}>
            {player.stats.map((stat, idx) => (
              <div key={idx} className="border border-border bg-background p-3">
                <div className="text-primary font-heading font-bold text-xl tabular-nums">
                  {stat.value || 0}
                </div>
                <div className="text-muted-foreground text-xs font-heading font-bold">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="text-center border border-border bg-muted p-3">
          <span className="text-sm text-muted-foreground font-medium">
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
      <Card className="border border-border bg-card">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="text-left py-4 px-4 text-muted-foreground font-heading font-bold text-sm uppercase tracking-wide">PLAYER</th>
                  <th className="text-center py-4 px-4 text-muted-foreground font-heading font-bold text-sm uppercase tracking-wide">TEAM</th>
                  <th className="text-center py-4 px-4 text-muted-foreground font-heading font-bold text-sm uppercase tracking-wide">POS</th>
                  <th className="text-center py-4 px-4 text-muted-foreground font-heading font-bold text-sm uppercase tracking-wide">HT</th>
                  <th className="text-center py-4 px-4 text-muted-foreground font-heading font-bold text-sm uppercase tracking-wide">PTS</th>
                  {isVolleyball ? (
                    <>
                      <th className="text-center py-4 px-4 text-muted-foreground font-heading font-bold text-sm uppercase tracking-wide">ATK</th>
                      <th className="text-center py-4 px-4 text-muted-foreground font-heading font-bold text-sm uppercase tracking-wide">BLK</th>
                      <th className="text-center py-4 px-4 text-muted-foreground font-heading font-bold text-sm uppercase tracking-wide">ACE</th>
                    </>
                  ) : (
                    <>
                      <th className="text-center py-4 px-4 text-muted-foreground font-heading font-bold text-sm uppercase tracking-wide">REB</th>
                      <th className="text-center py-4 px-4 text-muted-foreground font-heading font-bold text-sm uppercase tracking-wide">AST</th>
                      <th className="text-center py-4 px-4 text-muted-foreground font-heading font-bold text-sm uppercase tracking-wide">BLK</th>
                      <th className="text-center py-4 px-4 text-muted-foreground font-heading font-bold text-sm uppercase tracking-wide">STL</th>
                    </>
                  )}
                  <th className="text-center py-4 px-4 text-muted-foreground font-heading font-bold text-sm uppercase tracking-wide">GP</th>
                  <th className="text-center py-4 px-4 text-muted-foreground font-heading font-bold text-sm uppercase tracking-wide">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {players.map((player) => {
                  const sport = getTeamSport(player.team_id);
                  const sportColor = sport === 'basketball' ? 'orange' : 'blue';
                  const teamLogo = getTeamLogo(player.team_id);
                  
                  return (
                    <tr key={player.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-12 h-12 border border-border">
                            <AvatarImage src={player.photo_url} />
                            <AvatarFallback className="bg-secondary text-foreground text-xs font-heading font-bold">
                              {player.jersey_number}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-heading font-bold text-foreground">
                              {player.first_name} {player.last_name}
                            </p>
                            <p className="text-xs text-muted-foreground font-medium">#{player.jersey_number}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-center gap-3">
                          {teamLogo ? (
                            <Avatar className="w-8 h-8 border border-border">
                              <AvatarImage src={teamLogo} />
                              <AvatarFallback className="text-[10px] bg-muted text-muted-foreground font-bold">T</AvatarFallback>
                            </Avatar>
                          ) : (
                            <div className="w-8 h-8 bg-muted flex items-center justify-center">
                              <span className="text-[10px] text-muted-foreground font-bold">T</span>
                            </div>
                          )}
                          <span className="text-sm font-heading font-bold text-foreground">{getTeamName(player.team_id)}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center text-muted-foreground font-medium text-sm">
                        {player.position || '-'}
                      </td>
                      <td className="py-4 px-4 text-center text-muted-foreground font-medium text-sm">
                        {player.height || '-'}
                      </td>
                      {player.stats.map((stat, idx) => (
                        <td key={idx} className="py-4 px-4 text-center font-heading font-bold text-lg tabular-nums text-foreground">
                          {stat.value || 0}
                        </td>
                      ))}
                      <td className="py-4 px-4 text-center text-muted-foreground font-medium">
                        {player.games_played || 0}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-center gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => setStatsPlayer(player)}
                            className="text-muted-foreground hover:text-foreground"
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
                                className="text-muted-foreground hover:text-foreground"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleDeleteClick(player)}
                                className="text-muted-foreground hover:text-destructive"
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
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h1 className="font-heading text-3xl font-bold tracking-tight">Players</h1>
                  <p className="text-muted-foreground mt-1 text-sm">Manage player rosters</p>
                </div>
                {canManagePlayers && (
                  <Button 
                    onClick={() => {
                      setEditingPlayer(null);
                      setShowForm(true);
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Player
                  </Button>
                )}
              </div>

              <Card className="border border-border bg-card">
                <CardContent className="p-6">
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 border border-border bg-muted flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-lg font-heading font-bold">Filter Players</h3>
                        <p className="text-xs text-muted-foreground font-medium">
                          {players.length} player{players.length !== 1 ? 's' : ''} found
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <Label className="text-xs font-heading font-bold text-muted-foreground mb-2 block uppercase tracking-wide">SPORT</Label>
                        <select
                          value={selectedSport}
                          onChange={(e) => handleSportChange(e.target.value)}
                          className="w-full bg-background border border-border text-foreground px-3 py-2.5 font-medium"
                        >
                          {sports.map(sport => (
                            <option key={sport} value={sport}>
                              {sport === 'all' ? '🏀🏐 All Sports' : sport === 'basketball' ? '🏀 Basketball' : '🏐 Volleyball'}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <Label className="text-xs font-heading font-bold text-muted-foreground mb-2 block uppercase tracking-wide">DIVISION</Label>
                        <select
                          value={selectedDivision}
                          onChange={(e) => handleDivisionChange(e.target.value)}
                          className="w-full bg-background border border-border text-foreground px-3 py-2.5 font-medium"
                        >
                          {divisions.map(div => (
                            <option key={div} value={div}>
                              {div === 'all' ? '📁 All Divisions' : div}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <Label className="text-xs font-heading font-bold text-muted-foreground mb-2 block uppercase tracking-wide">TEAM</Label>
                        <select
                          value={selectedTeam}
                          onChange={(e) => setSelectedTeam(e.target.value)}
                          className="w-full bg-background border border-border text-foreground px-3 py-2.5 font-medium"
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
                        <Label className="text-xs font-heading font-bold text-muted-foreground mb-2 block uppercase tracking-wide">VIEW</Label>
                        <div className="flex bg-background border border-border p-1">
                          <Button
                            variant={viewMode === 'card' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setViewMode('card')}
                            className={`flex-1 font-medium ${viewMode === 'card' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
                          >
                            <LayoutGrid className="w-4 h-4" />
                          </Button>
                          <Button
                            variant={viewMode === 'table' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setViewMode('table')}
                            className={`flex-1 font-medium ${viewMode === 'table' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
                          >
                            <Table className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    {(selectedSport !== 'all' || selectedDivision !== 'all' || selectedTeam !== 'all') && (
                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
                        <span className="text-xs font-heading font-bold text-muted-foreground">Active Filters:</span>
                        {selectedSport !== 'all' && (
                          <Badge variant="outline" className="border-border text-muted-foreground font-medium">
                            {selectedSport === 'basketball' ? '🏀 Basketball' : '🏐 Volleyball'}
                            <button
                              onClick={() => handleSportChange('all')}
                              className="ml-2 hover:text-foreground"
                            >
                              ✕
                            </button>
                          </Badge>
                        )}
                        {selectedDivision !== 'all' && (
                          <Badge variant="outline" className="border-border text-muted-foreground font-medium">
                            📁 {selectedDivision}
                            <button
                              onClick={() => handleDivisionChange('all')}
                              className="ml-2 hover:text-foreground"
                            >
                              ✕
                            </button>
                          </Badge>
                        )}
                        {selectedTeam !== 'all' && (
                          <Badge variant="outline" className="border-border text-muted-foreground font-medium">
                            👥 {getTeamName(selectedTeam)}
                            <button
                              onClick={() => setSelectedTeam('all')}
                              className="ml-2 hover:text-foreground"
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
                          className="text-xs text-muted-foreground hover:text-foreground font-medium underline ml-2"
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
                  <div className="w-24 h-24 border border-border bg-card flex items-center justify-center mx-auto mb-6">
                    <User className="w-12 h-12 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground text-xl font-heading font-bold">No players found</p>
                  <p className="text-muted-foreground text-sm mt-2">Add your first player to get started</p>
                </div>
              )}

              <Dialog open={showForm} onOpenChange={setShowForm}>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-heading font-bold">
                      {editingPlayer ? 'Edit Player' : 'Add New Player'}
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Label className="font-heading font-bold text-foreground">Player Photo</Label>
                      <div className="mt-2 flex items-center gap-4">
                        <Avatar className="w-20 h-20 border border-border">
                          <AvatarImage src={photoFile ? URL.createObjectURL(photoFile) : editingPlayer?.photo_url} />
                          <AvatarFallback className="bg-muted">
                            <User className="w-8 h-8 text-muted-foreground" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={(e) => setPhotoFile(e.target.files[0])}
                            className="bg-background border border-border text-foreground font-medium"
                          />
                          <p className="text-xs text-muted-foreground mt-1">PNG, JPG, or GIF (Max 5MB)</p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="team_id" className="font-heading font-bold text-foreground">Team</Label>
                      <select
                        id="team_id"
                        name="team_id"
                        defaultValue={editingPlayer?.team_id}
                        required
                        className="w-full bg-background border border-border text-foreground px-3 py-2 font-medium"
                      >
                        <option value="">Select a team</option>
                        {teams.map(team => (
                          <option key={team.id} value={team.id}>{team.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="first_name" className="font-heading font-bold text-foreground">First Name</Label>
                        <Input
                          id="first_name"
                          name="first_name"
                          defaultValue={editingPlayer?.first_name}
                          required
                          className="bg-background border border-border text-foreground font-medium"
                        />
                      </div>
                      <div>
                        <Label htmlFor="last_name" className="font-heading font-bold text-foreground">Last Name</Label>
                        <Input
                          id="last_name"
                          name="last_name"
                          defaultValue={editingPlayer?.last_name}
                          required
                          className="bg-background border border-border text-foreground font-medium"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="jersey_number" className="font-heading font-bold text-foreground">Jersey #</Label>
                        <Input
                          id="jersey_number"
                          name="jersey_number"
                          defaultValue={editingPlayer?.jersey_number}
                          required
                          className="bg-background border border-border text-foreground font-medium"
                        />
                      </div>
                      <div>
                        <Label htmlFor="position" className="font-heading font-bold text-foreground">Position</Label>
                        <Input
                          id="position"
                          name="position"
                          defaultValue={editingPlayer?.position}
                          placeholder="e.g., Guard, Forward"
                          className="bg-background border border-border text-foreground font-medium"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="height" className="font-heading font-bold text-foreground">Height</Label>
                      <Input
                        id="height"
                        name="height"
                        defaultValue={editingPlayer?.height}
                        placeholder="e.g., 6'2&quot;"
                        className="bg-background border border-border text-foreground font-medium"
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
                        className="font-medium"
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={uploading}
                        className="font-medium"
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
                gamesPlayed={statsPlayer ? (statsPlayer.games_played || 0) : 0}
              />

              <AlertDialog open={!!deletingPlayer} onOpenChange={() => setDeletingPlayer(null)}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-12 h-12 bg-destructive/10 flex items-center justify-center">
                        <AlertTriangle className="w-6 h-6 text-destructive" />
                      </div>
                      <AlertDialogTitle className="text-xl font-heading font-bold">
                        Delete Player?
                      </AlertDialogTitle>
                    </div>
                    <AlertDialogDescription className="text-muted-foreground font-medium">
                      Are you sure you want to delete <span className="font-heading font-bold text-foreground">{deletingPlayer?.first_name} {deletingPlayer?.last_name}</span>?
                      {deletingPlayer?.statsCount > 0 && (
                        <div className="mt-3 p-3 bg-muted border border-border">
                          <p className="text-sm text-foreground font-medium">
                            ⚠️ Warning: This player has {deletingPlayer.statsCount} game statistic record(s). All statistics will be permanently deleted.
                          </p>
                        </div>
                      )}
                      <p className="mt-3 font-medium text-destructive">This action cannot be undone.</p>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="font-medium">
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deleteMutation.mutate(deletingPlayer.id)}
                      className="font-medium"
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