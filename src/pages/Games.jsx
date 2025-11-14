
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Calendar, PlayCircle, CheckCircle, Clock, MapPin, AlertTriangle, Trash2, Archive, ArchiveRestore } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import AdminHeader from "@/components/AdminHeader";
import AdminSidebar from "@/components/AdminSidebar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import GameHistory from "@/components/GameHistory";
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

export default function Games() {
  const [showForm, setShowForm] = useState(false);
  const [deletingGame, setDeletingGame] = useState(null);
  const [archivingGame, setArchivingGame] = useState(null);
  const [restoringGame, setRestoringGame] = useState(null);
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [conflicts, setConflicts] = useState([]);
  const [selectedSport, setSelectedSport] = useState('all');
  const [selectedDivision, setSelectedDivision] = useState('all');
  const [selectedTeam, setSelectedTeam] = useState('all');
  const queryClient = useQueryClient();

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
    const currentUser = await base44.auth.me();
    setUser(currentUser);
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

  const { data: allPlayerStats = [] } = useQuery({
    queryKey: ['all-player-stats', user?.organization_id],
    queryFn: () => base44.entities.PlayerGameStats.list(),
    enabled: !!user?.organization_id,
  });

  const checkScheduleConflicts = (gameDate, courtNumber, durationHours = 1.5) => {
    if (!gameDate || !courtNumber) return [];
    
    const startTime = new Date(gameDate);
    const endTime = new Date(startTime.getTime() + durationHours * 60 * 60 * 1000);
    
    const conflictingGames = games.filter(game => {
      if (game.status === 'completed') return false;
      if (game.court_number !== courtNumber) return false;
      
      const existingStart = new Date(game.game_date);
      const existingEnd = new Date(existingStart.getTime() + (game.duration_hours || 1.5) * 60 * 60 * 1000);
      
      return (startTime < existingEnd && endTime > existingStart);
    });
    
    return conflictingGames;
  };

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Game.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['games']);
      setShowForm(false);
      setConflicts([]);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Game.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['games']);
      setDeletingGame(null);
    },
  });

  const archiveMutation = useMutation({
    mutationFn: ({ id }) => base44.entities.Game.update(id, { archived: true }),
    onSuccess: () => {
      queryClient.invalidateQueries(['games']);
      setArchivingGame(null);
    },
  });

  const restoreMutation = useMutation({
    mutationFn: ({ id }) => base44.entities.Game.update(id, { archived: false }),
    onSuccess: () => {
      queryClient.invalidateQueries(['games']);
      setRestoringGame(null);
    },
  });

  const handleFormChange = (e) => {
    const form = e.target.form;
    const gameDate = form?.game_date?.value;
    const courtNumber = form?.court_number?.value;
    
    if (gameDate && courtNumber) {
      const foundConflicts = checkScheduleConflicts(gameDate, courtNumber);
      setConflicts(foundConflicts);
    } else {
      setConflicts([]);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      organization_id: user?.organization_id,
      home_team_id: formData.get('home_team_id'),
      away_team_id: formData.get('away_team_id'),
      sport: formData.get('sport'),
      game_type: formData.get('game_type'),
      game_date: new Date(formData.get('game_date')).toISOString(),
      court_number: formData.get('court_number'),
      duration_hours: 1.5,
      location: formData.get('location'),
      penalty_limit_per_quarter: parseInt(formData.get('penalty_limit_per_quarter')),
      player_foul_limit: parseInt(formData.get('player_foul_limit')),
      status: 'scheduled',
      archived: false,
    };

    createMutation.mutate(data);
  };

  const handleDeleteClick = (game) => {
    const gameStats = allPlayerStats.filter(s => s.game_id === game.id);
    setDeletingGame({ ...game, statsCount: gameStats.length });
  };

  const getTeamName = (teamId) => {
    const team = teams.find(t => t.id === teamId);
    return team?.name || 'Unknown';
  };

  const scheduledGames = games.filter(g => g.status === 'scheduled' && !g.archived);
  const inProgressGames = games.filter(g => g.status === 'in_progress' && !g.archived);
  const completedGames = games.filter(g => g.status === 'completed' && !g.archived);
  const archivedGames = games.filter(g => g.archived === true);

  const handleDivisionChange = (division) => {
    setSelectedDivision(division);
    setSelectedTeam('all');
  };

  const handleSportChange = (sport) => {
    setSelectedSport(sport);
    setSelectedDivision('all');
    setSelectedTeam('all');
  };

  const GameCard = ({ game, showActions = true }) => {
    const sportColor = game.sport === 'basketball' ? 'orange' : 'blue';
    const statusColor = 
      game.status === 'scheduled' ? 'blue' :
      game.status === 'in_progress' ? 'yellow' : 'green';
    
    return (
      <Card className={`relative overflow-hidden border-2 border-${sportColor}-100 dark:border-${sportColor}-900 bg-gradient-to-br from-white to-${sportColor}-50 dark:from-gray-800 dark:to-${sportColor}-950/30 shadow-lg hover:shadow-2xl transition-all group`}>
        <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-${sportColor}-500/20 to-transparent rounded-full blur-3xl`}></div>
        
        <CardHeader className="relative z-10">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <Badge className={`bg-${statusColor}-100 text-${statusColor}-700 border-${statusColor}-200 dark:bg-${statusColor}-950 dark:text-${statusColor}-300 dark:border-${statusColor}-800 font-bold mb-2`}>
                {game.status === 'scheduled' && <Clock className="w-3 h-3 mr-1" />}
                {game.status === 'in_progress' && <PlayCircle className="w-3 h-3 mr-1" />}
                {game.status === 'completed' && <CheckCircle className="w-3 h-3 mr-1" />}
                {game.status ? game.status.replace('_', ' ').toUpperCase() : 'SCHEDULED'}
              </Badge>
              <p className="text-gray-500 dark:text-gray-400 text-sm font-semibold flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(game.game_date).toLocaleDateString()} at {new Date(game.game_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </p>
              {game.court_number && (
                <p className="text-gray-600 dark:text-gray-400 text-xs font-bold mt-1">
                  Court {game.court_number}
                </p>
              )}
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge variant="outline" className={`text-${sportColor}-600 dark:text-${sportColor}-400 border-${sportColor}-600 dark:border-${sportColor}-400 font-black`}>
                {game.sport}
              </Badge>
              {showActions && game.status === 'scheduled' && !game.archived && (
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => handleDeleteClick(game)}
                  className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4 relative z-10">
          <div className="bg-white/60 dark:bg-gray-900/60 rounded-xl p-4">
            <div className="flex justify-between items-center">
              <div className="flex-1">
                <p className="text-gray-900 dark:text-white font-black">{getTeamName(game.home_team_id)}</p>
                <p className="text-gray-500 dark:text-gray-400 text-xs font-semibold">HOME</p>
              </div>
              {game.status === 'completed' ? (
                <>
                  <div className={`text-4xl font-black text-${sportColor}-600 dark:text-${sportColor}-400`}>{game.home_score}</div>
                  <div className="text-gray-400 dark:text-gray-600 px-4 text-2xl font-black">-</div>
                  <div className="text-4xl font-black text-gray-900 dark:text-white">{game.away_score}</div>
                </>
              ) : (
                <div className="text-gray-400 dark:text-gray-600 text-xl font-bold">vs</div>
              )}
              <div className="flex-1 text-right">
                <p className="text-gray-900 dark:text-white font-black">{getTeamName(game.away_team_id)}</p>
                <p className="text-gray-500 dark:text-gray-400 text-xs font-semibold">AWAY</p>
              </div>
            </div>
          </div>
          
          {game.location && (
            <p className="text-gray-500 dark:text-gray-400 text-sm font-medium flex items-center gap-1">
              <MapPin className="w-3 h-3" /> {game.location}
            </p>
          )}
          
          {game.status === 'scheduled' && !game.archived && (
            <Link to={createPageUrl(game.sport === 'volleyball' ? 'LiveScoringVolleyball' : 'LiveScoring') + `?game_id=${game.id}`}>
              <Button className={`w-full bg-gradient-to-r from-${sportColor}-600 to-${sportColor}-700 hover:from-${sportColor}-700 hover:to-${sportColor}-800 text-white font-bold shadow-lg`}>
                <PlayCircle className="w-4 h-4 mr-2" />
                Start Game
              </Button>
            </Link>
          )}
          {game.status === 'in_progress' && !game.archived && (
            <Link to={createPageUrl(game.sport === 'volleyball' ? 'LiveScoringVolleyball' : 'LiveScoring') + `?game_id=${game.id}`}>
              <Button className={`w-full bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800 text-white font-bold shadow-lg`}>
                Continue Scoring
              </Button>
            </Link>
          )}
          {showActions && game.status === 'completed' && !game.archived && (
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={() => setArchivingGame(game)}
                variant="outline"
                className="border-2 border-purple-300 dark:border-purple-700 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/30 font-bold"
              >
                <Archive className="w-4 h-4 mr-2" />
                Archive
              </Button>
              <Button
                onClick={() => handleDeleteClick(game)}
                variant="outline"
                className="border-2 border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 font-bold"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </div>
          )}
          {game.archived && showActions && (
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={() => setRestoringGame(game)}
                variant="outline"
                className="border-2 border-green-300 dark:border-green-700 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-950/30 font-bold"
              >
                <ArchiveRestore className="w-4 h-4 mr-2" />
                Restore
              </Button>
              <Button
                onClick={() => handleDeleteClick(game)}
                variant="outline"
                className="border-2 border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 font-bold"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-green-50/30 to-gray-50 dark:from-gray-900 dark:via-green-950/10 dark:to-gray-900">
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
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-4xl font-black text-gray-900 dark:text-white">Games</h1>
                  <p className="text-gray-600 dark:text-gray-400 mt-2 font-medium">Schedule and manage games</p>
                </div>
                <Button 
                  onClick={() => setShowForm(true)}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold shadow-xl"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Schedule Game
                </Button>
              </div>

              <Tabs defaultValue="scheduled" className="space-y-6">
                <TabsList className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 p-1 rounded-xl shadow-lg">
                  <TabsTrigger value="scheduled" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-blue-700 data-[state=active]:text-white dark:text-gray-300 font-bold rounded-lg">
                    Scheduled ({scheduledGames.length})
                  </TabsTrigger>
                  <TabsTrigger value="in_progress" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-600 data-[state=active]:to-yellow-700 data-[state=active]:text-white dark:text-gray-300 font-bold rounded-lg">
                    In Progress ({inProgressGames.length})
                  </TabsTrigger>
                  <TabsTrigger value="completed" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-600 data-[state=active]:to-green-700 data-[state=active]:text-white dark:text-gray-300 font-bold rounded-lg">
                    Completed ({completedGames.length})
                  </TabsTrigger>
                  <TabsTrigger value="archived" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-purple-700 data-[state=active]:text-white dark:text-gray-300 font-bold rounded-lg">
                    Archived ({archivedGames.length})
                  </TabsTrigger>
                  <TabsTrigger value="history" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-600 data-[state=active]:to-indigo-700 data-[state=active]:text-white dark:text-gray-300 font-bold rounded-lg">
                    Game History
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="scheduled" className="space-y-4">
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {scheduledGames.map(game => <GameCard key={game.id} game={game} />)}
                  </div>
                  {scheduledGames.length === 0 && (
                    <div className="text-center py-20">
                      <div className="w-24 h-24 bg-gradient-to-br from-blue-200 to-blue-300 dark:from-blue-800 dark:to-blue-700 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Clock className="w-12 h-12 text-blue-600 dark:text-blue-300" />
                      </div>
                      <p className="text-gray-500 dark:text-gray-400 text-xl font-bold">No scheduled games</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="in_progress" className="space-y-4">
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {inProgressGames.map(game => <GameCard key={game.id} game={game} showActions={false} />)}
                  </div>
                  {inProgressGames.length === 0 && (
                    <div className="text-center py-20">
                      <div className="w-24 h-24 bg-gradient-to-br from-yellow-200 to-yellow-300 dark:from-yellow-800 dark:to-yellow-700 rounded-full flex items-center justify-center mx-auto mb-6">
                        <PlayCircle className="w-12 h-12 text-yellow-600 dark:text-yellow-300" />
                      </div>
                      <p className="text-gray-500 dark:text-gray-400 text-xl font-bold">No games in progress</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="completed" className="space-y-4">
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {completedGames.map(game => <GameCard key={game.id} game={game} />)}
                  </div>
                  {completedGames.length === 0 && (
                    <div className="text-center py-20">
                      <div className="w-24 h-24 bg-gradient-to-br from-green-200 to-green-300 dark:from-green-800 dark:to-green-700 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-300" />
                      </div>
                      <p className="text-gray-500 dark:text-gray-400 text-xl font-bold">No completed games</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="archived" className="space-y-4">
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {archivedGames.map(game => <GameCard key={game.id} game={game} />)}
                  </div>
                  {archivedGames.length === 0 && (
                    <div className="text-center py-20">
                      <div className="w-24 h-24 bg-gradient-to-br from-purple-200 to-purple-300 dark:from-purple-800 dark:to-purple-700 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Archive className="w-12 h-12 text-purple-600 dark:text-purple-300" />
                      </div>
                      <p className="text-gray-500 dark:text-gray-400 text-xl font-bold">No archived games</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="history" className="space-y-4">
                  <GameHistory
                    completedGames={completedGames}
                    teams={teams}
                    allPlayers={allPlayers}
                    allPlayerStats={allPlayerStats}
                    selectedSport={selectedSport}
                    selectedDivision={selectedDivision}
                    selectedTeam={selectedTeam}
                    onSportChange={handleSportChange}
                    onDivisionChange={handleDivisionChange}
                    onTeamChange={setSelectedTeam}
                  />
                </TabsContent>
              </Tabs>

              <Dialog open={showForm} onOpenChange={setShowForm}>
                <DialogContent className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 max-w-xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-black text-gray-900 dark:text-white">Schedule New Game</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {conflicts.length > 0 && (
                      <Alert className="bg-red-50 dark:bg-red-950/30 border-2 border-red-500">
                        <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                        <AlertDescription className="text-red-800 dark:text-red-300 font-bold">
                          <p className="font-black mb-2">⚠️ SCHEDULING CONFLICT DETECTED!</p>
                          <p className="text-sm">The selected court and time overlaps with {conflicts.length} existing game(s):</p>
                          <ul className="mt-2 space-y-1 text-xs">
                            {conflicts.map((conflict, idx) => (
                              <li key={idx}>
                                • Court {conflict.court_number} - {new Date(conflict.game_date).toLocaleString()} 
                                ({getTeamName(conflict.home_team_id)} vs {getTeamName(conflict.away_team_id)})
                              </li>
                            ))}
                          </ul>
                        </AlertDescription>
                      </Alert>
                    )}

                    <div>
                      <Label htmlFor="sport" className="font-bold text-gray-700 dark:text-gray-300">Sport</Label>
                      <select
                        id="sport"
                        name="sport"
                        required
                        className="w-full bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-xl px-3 py-2 font-medium"
                      >
                        <option value="">Select sport</option>
                        <option value="basketball">Basketball</option>
                        <option value="volleyball">Volleyball</option>
                      </select>
                    </div>

                    <div>
                      <Label htmlFor="game_type" className="font-bold text-gray-700 dark:text-gray-300">Game Type</Label>
                      <select
                        id="game_type"
                        name="game_type"
                        required
                        className="w-full bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-xl px-3 py-2 font-medium"
                      >
                        <option value="regular_season">Regular Season</option>
                        <option value="playoffs">Playoffs</option>
                        <option value="semi_finals">Semi Finals</option>
                        <option value="finals">Finals</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="game_date" className="font-bold text-gray-700 dark:text-gray-300">Date & Time *</Label>
                        <Input
                          id="game_date"
                          name="game_date"
                          type="datetime-local"
                          required
                          onChange={handleFormChange}
                          className="bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white font-medium"
                        />
                      </div>
                      <div>
                        <Label htmlFor="court_number" className="font-bold text-gray-700 dark:text-gray-300">Court Number *</Label>
                        <Input
                          id="court_number"
                          name="court_number"
                          type="text"
                          required
                          onChange={handleFormChange}
                          placeholder="e.g., 1, 2, A, B"
                          className="bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white font-medium"
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Duration: 1.5 hours</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="penalty_limit_per_quarter" className="font-bold text-gray-700 dark:text-gray-300">Team Foul Penalty Limit</Label>
                        <Input
                          id="penalty_limit_per_quarter"
                          name="penalty_limit_per_quarter"
                          type="number"
                          defaultValue="5"
                          min="1"
                          max="10"
                          required
                          className="bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white font-medium"
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Fouls per quarter before penalty</p>
                      </div>
                      <div>
                        <Label htmlFor="player_foul_limit" className="font-bold text-gray-700 dark:text-gray-300">Player Foul Limit</Label>
                        <Input
                          id="player_foul_limit"
                          name="player_foul_limit"
                          type="number"
                          defaultValue="5"
                          min="1"
                          max="10"
                          required
                          className="bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white font-medium"
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Personal fouls before ejection</p>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="home_team_id" className="font-bold text-gray-700 dark:text-gray-300">Home Team</Label>
                      <select
                        id="home_team_id"
                        name="home_team_id"
                        required
                        className="w-full bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-xl px-3 py-2 font-medium"
                      >
                        <option value="">Select team</option>
                        {teams.map(team => (
                          <option key={team.id} value={team.id}>{team.name} ({team.sport})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="away_team_id" className="font-bold text-gray-700 dark:text-gray-300">Away Team</Label>
                      <select
                        id="away_team_id"
                        name="away_team_id"
                        required
                        className="w-full bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-xl px-3 py-2 font-medium"
                      >
                        <option value="">Select team</option>
                        {teams.map(team => (
                          <option key={team.id} value={team.id}>{team.name} ({team.sport})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="location" className="font-bold text-gray-700 dark:text-gray-300">Location</Label>
                      <Input
                        id="location"
                        name="location"
                        placeholder="e.g., Main Gym, Sports Complex"
                        className="bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white font-medium"
                      />
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                      <Button type="button" variant="outline" onClick={() => { setShowForm(false); setConflicts([]); }} className="border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 font-bold">
                        Cancel
                      </Button>
                      <Button type="submit" className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold">
                        Schedule Game
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>

              <AlertDialog open={!!deletingGame} onOpenChange={() => setDeletingGame(null)}>
                <AlertDialogContent className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700">
                  <AlertDialogHeader>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-12 h-12 bg-red-100 dark:bg-red-950/30 rounded-xl flex items-center justify-center">
                        <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
                      </div>
                      <AlertDialogTitle className="text-xl font-black text-gray-900 dark:text-white">
                        Delete Game Permanently?
                      </AlertDialogTitle>
                    </div>
                    <AlertDialogDescription className="text-gray-600 dark:text-gray-400 font-medium">
                      Are you sure you want to permanently delete this game between <span className="font-bold text-gray-900 dark:text-white">{getTeamName(deletingGame?.home_team_id)}</span> and <span className="font-bold text-gray-900 dark:text-white">{getTeamName(deletingGame?.away_team_id)}</span>?
                      <br /><br />
                      <p className="text-sm">
                        📅 {deletingGame?.game_date && new Date(deletingGame.game_date).toLocaleString()}
                      </p>
                      {deletingGame?.statsCount > 0 && (
                        <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                          <p className="text-sm text-yellow-800 dark:text-yellow-300 font-semibold">
                            ⚠️ This game has {deletingGame.statsCount} player statistic record(s) that will also be deleted.
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
                      onClick={() => deleteMutation.mutate(deletingGame.id)}
                      className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold"
                    >
                      Delete Permanently
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <AlertDialog open={!!archivingGame} onOpenChange={() => setArchivingGame(null)}>
                <AlertDialogContent className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700">
                  <AlertDialogHeader>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-12 h-12 bg-purple-100 dark:bg-purple-950/30 rounded-xl flex items-center justify-center">
                        <Archive className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                      </div>
                      <AlertDialogTitle className="text-xl font-black text-gray-900 dark:text-white">
                        Archive Completed Game?
                      </AlertDialogTitle>
                    </div>
                    <AlertDialogDescription className="text-gray-600 dark:text-gray-400 font-medium">
                      Archive the completed game between <span className="font-bold text-gray-900 dark:text-white">{getTeamName(archivingGame?.home_team_id)}</span> and <span className="font-bold text-gray-900 dark:text-white">{getTeamName(archivingGame?.away_team_id)}</span>?
                      <br /><br />
                      <p className="text-sm text-purple-700 dark:text-purple-300 font-semibold">
                        📦 Archived games can be restored later from the Archived tab.
                      </p>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="border-2 border-gray-300 dark:border-gray-600 font-bold">
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => archiveMutation.mutate({ id: archivingGame.id })}
                      className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-bold"
                    >
                      Archive Game
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <AlertDialog open={!!restoringGame} onOpenChange={() => setRestoringGame(null)}>
                <AlertDialogContent className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700">
                  <AlertDialogHeader>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-12 h-12 bg-green-100 dark:bg-green-950/30 rounded-xl flex items-center justify-center">
                        <ArchiveRestore className="w-6 h-6 text-green-600 dark:text-green-400" />
                      </div>
                      <AlertDialogTitle className="text-xl font-black text-gray-900 dark:text-white">
                        Restore Archived Game?
                      </AlertDialogTitle>
                    </div>
                    <AlertDialogDescription className="text-gray-600 dark:text-gray-400 font-medium">
                      Restore the archived game between <span className="font-bold text-gray-900 dark:text-white">{getTeamName(restoringGame?.home_team_id)}</span> and <span className="font-bold text-gray-900 dark:text-white">{getTeamName(restoringGame?.away_team_id)}</span> back to the Completed tab?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="border-2 border-gray-300 dark:border-gray-600 font-bold">
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => restoreMutation.mutate({ id: restoringGame.id })}
                      className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold"
                    >
                      Restore Game
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
