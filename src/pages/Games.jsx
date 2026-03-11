import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Calendar, PlayCircle, CheckCircle, Clock, MapPin, AlertTriangle, Trash2, Archive, ArchiveRestore, Users, Zap, Edit, ChevronDown, ChevronUp, FileEdit } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import AdminHeader from "@/components/AdminHeader";
import AdminSidebar from "@/components/AdminSidebar";
import GameHistory from "@/components/GameHistory";
import ConflictResolver from "@/components/ConflictResolver";
import AIScheduleGenerator from "@/components/AIScheduleGenerator";
import AIAssistant from "@/components/AIAssistant";
import { usePermissions } from "@/components/hooks/usePermissions";
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
  const [editingGame, setEditingGame] = useState(null);
  const [deletingGame, setDeletingGame] = useState(null);
  const [archivingGame, setArchivingGame] = useState(null);
  const [restoringGame, setRestoringGame] = useState(null);
  const [showAIScheduleDialog, setShowAIScheduleDialog] = useState(false);
  const [showClearAllDialog, setShowClearAllDialog] = useState(false);
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [conflicts, setConflicts] = useState([]);
  const [selectedSport, setSelectedSport] = useState('all');
  const [selectedDivision, setSelectedDivision] = useState('all');
  const [selectedTeam, setSelectedTeam] = useState('all');
  const [recurringConfig, setRecurringConfig] = useState({ enabled: false });
  const [completedSportFilter, setCompletedSportFilter] = useState('all');
  const [completedWeekFilter, setCompletedWeekFilter] = useState('all');
  const [completedView, setCompletedView] = useState('card');
  const [selectedScorekeeperEmails, setSelectedScorekeeperEmails] = useState([]);
  const [aiScheduleView, setAiScheduleView] = useState('card');
  const [expandedWeeks, setExpandedWeeks] = useState({});
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { hasPermission, loading: permissionsLoading, isAdmin } = usePermissions();

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
      setUser(currentUser);
    } catch (error) {
      console.error("Error loading user:", error);
      base44.auth.redirectToLogin(createPageUrl("Games"));
    }
  };


  // Permission-based access guard for Games page
  useEffect(() => {
    if (!user || permissionsLoading) return;

    // Scorekeepers without game management go to their dashboard
    if (user.is_scorekeeper && user.role !== 'admin' && !hasPermission('manage_games')) {
      navigate(createPageUrl("ScorekeeperDashboard"));
      return;
    }

    // Built-in admins are allowed
    if (isAdmin) return;

    // Custom role must have manage_games
    if (user.role_id && !hasPermission('manage_games')) {
      navigate(createPageUrl("Home"));
    }
  }, [user, permissionsLoading]);

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

  const { data: divisions = [] } = useQuery({
    queryKey: ['divisions', user?.organization_id],
    queryFn: () => base44.entities.Division.filter({ organization_id: user?.organization_id }),
    enabled: !!user?.organization_id,
  });

  const { data: games = [] } = useQuery({
    queryKey: ['games', user?.organization_id],
    queryFn: () => base44.entities.Game.filter({ organization_id: user?.organization_id }, '-game_date'),
    enabled: !!user?.organization_id,
    refetchInterval: 15000,
  });

  const { data: allPlayers = [] } = useQuery({
    queryKey: ['all-players', user?.organization_id],
    queryFn: async () => {
      const orgTeams = await base44.entities.Team.filter({ organization_id: user?.organization_id });
      const teamIds = orgTeams.map(t => t.id);
      if (teamIds.length === 0) return [];
      const results = await Promise.all(teamIds.map(id => base44.entities.Player.filter({ team_id: id }).catch(() => [])));
      const merged = new Map();
      results.flat().forEach(p => { if (!merged.has(p.id)) merged.set(p.id, p); });
      return Array.from(merged.values());
    },
    enabled: !!user?.organization_id,
  });

  const completedIds = (games || []).filter(g => g.status === 'completed' && !g.archived).map(g => g.id);

  const { data: allPlayerStats = [] } = useQuery({
    queryKey: ['all-player-stats', user?.organization_id, JSON.stringify(completedIds)],
    queryFn: async () => {
      if (completedIds.length === 0) return [];

      let stats = [];
      try {
        const res = await base44.functions.invoke('getGamePlayerStats', { game_ids: completedIds });
        stats = Array.isArray(res.data) ? res.data : [];
      } catch (e) {
        console.warn('getGamePlayerStats failed, falling back to direct entity fetch:', e?.message || e);
      }

      if (!stats || stats.length === 0) {
        const results = [];
        for (let i = 0; i < completedIds.length; i += 50) {
          const chunk = completedIds.slice(i, i + 50);
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
    enabled: !!user?.organization_id && completedIds.length > 0,
    staleTime: 30000,
    gcTime: 5 * 60 * 1000,
    refetchInterval: 20000,
  });

  const { data: scorekeepers = [] } = useQuery({
    queryKey: ['scorekeepers', user?.organization_id],
    queryFn: async () => {
      const res = await base44.functions.invoke('getScorekeepers', {});
      return Array.isArray(res.data) ? res.data : [];
    },
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

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Game.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['games']);
      setShowForm(false);
      setEditingGame(null);
      setConflicts([]);
      setSelectedScorekeeperEmails([]);
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      if (Array.isArray(data)) {
        return base44.entities.Game.bulkCreate(data);
      } else if (recurringConfig.enabled) {
        const seriesId = Date.now().toString();
        const gamesToCreate = [];
        
        for (let i = 0; i < recurringConfig.occurrences; i++) {
          const gameDate = new Date(data.game_date);
          
          if (recurringConfig.frequency === 'weekly') {
            gameDate.setDate(gameDate.getDate() + (i * 7 * recurringConfig.interval));
          } else {
            gameDate.setDate(gameDate.getDate() + (i * recurringConfig.interval));
          }
          
          gamesToCreate.push({
            ...data,
            game_date: gameDate.toISOString(),
            recurring_series_id: seriesId,
          });
        }
        
        return Promise.all(gamesToCreate.map(game => base44.entities.Game.create(game)));
      } else {
        return base44.entities.Game.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['games']);
      setShowForm(false);
      setShowAIScheduleDialog(false);
      setConflicts([]);
      setRecurringConfig({ enabled: false });
      setSelectedScorekeeperEmails([]);
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

  const clearAllScheduledMutation = useMutation({
    mutationFn: async () => {
      const scheduledGameIds = scheduledGames.map(g => g.id);
      console.log(`Deleting ${scheduledGameIds.length} games in batches...`);
      
      const BATCH_SIZE = 10;
      const DELAY_MS = 500;
      let deletedCount = 0;
      
      for (let i = 0; i < scheduledGameIds.length; i += BATCH_SIZE) {
        const batch = scheduledGameIds.slice(i, i + BATCH_SIZE);
        console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(scheduledGameIds.length / BATCH_SIZE)}`);
        
        const results = await Promise.allSettled(batch.map(id => base44.entities.Game.delete(id)));
        const succeeded = results.filter(r => r.status === 'fulfilled').length;
        deletedCount += succeeded;
        
        if (i + BATCH_SIZE < scheduledGameIds.length) {
          await new Promise(resolve => setTimeout(resolve, DELAY_MS));
        }
      }
      
      console.log(`Successfully deleted ${deletedCount} out of ${scheduledGameIds.length} games`);
      return { total: scheduledGameIds.length, deleted: deletedCount };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries(['games']);
      setShowClearAllDialog(false);
      alert(`Successfully deleted ${result.deleted} scheduled games.`);
    },
    onError: (error) => {
      console.error("Clear all failed:", error);
      alert(`Error: ${error.message}`);
      setShowClearAllDialog(false);
      queryClient.invalidateQueries(['games']);
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

  const handleSelectAlternative = (alternative) => {
    const form = document.getElementById('game-form');
    if (alternative.gameDate) {
      const dateInput = form.querySelector('[name="game_date"]');
      const localDate = new Date(alternative.gameDate);
      const offset = localDate.getTimezoneOffset();
      const adjustedDate = new Date(localDate.getTime() - (offset * 60 * 1000));
      dateInput.value = adjustedDate.toISOString().slice(0, 16);
    }
    if (alternative.courtNumber) {
      form.querySelector('[name="court_number"]').value = alternative.courtNumber;
    }
    setConflicts([]);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const weekNumber = formData.get('week_number');
    const baseData = {
                organization_id: user?.organization_id,
                home_team_id: formData.get('home_team_id'),
                away_team_id: formData.get('away_team_id'),
                sport: formData.get('sport'),
                game_type: formData.get('game_type'),
                division: formData.get('division') || null,
                game_date: new Date(formData.get('game_date')).toISOString(),
                court_number: formData.get('court_number'),
                duration_hours: 1.5,
                location: formData.get('location'),
                stream_url: formData.get('stream_url') || null,
                penalty_limit_per_quarter: parseInt(formData.get('penalty_limit_per_quarter')),
                player_foul_limit: parseInt(formData.get('player_foul_limit')),
                assigned_scorekeeper_emails: selectedScorekeeperEmails,
                overall_scorekeeper_email: formData.get('overall_scorekeeper_email') || null,
                home_statistician_email: formData.get('home_statistician_email') || null,
                away_statistician_email: formData.get('away_statistician_email') || null,
                week_number: weekNumber ? parseInt(weekNumber) : null,
              };

              const data = editingGame ? baseData : { ...baseData, status: 'scheduled', archived: false };

    if (editingGame) {
      updateMutation.mutate({ id: editingGame.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEditGame = (game) => {
    setEditingGame(game);
    setSelectedScorekeeperEmails(game.assigned_scorekeeper_emails || []);
    setShowForm(true);
    
    setTimeout(() => {
      const form = document.getElementById('game-form');
      if (form) {
        form.sport.value = game.sport || '';
        form.game_type.value = game.game_type || 'regular_season';
        form.division.value = game.division || '';
        form.home_team_id.value = game.home_team_id || '';
        form.away_team_id.value = game.away_team_id || '';
        form.location.value = game.location || '';
        form.court_number.value = game.court_number || '';
        form.penalty_limit_per_quarter.value = game.penalty_limit_per_quarter || 5;
        form.player_foul_limit.value = game.player_foul_limit || 5;
        form.overall_scorekeeper_email.value = game.overall_scorekeeper_email || '';
        form.home_statistician_email.value = game.home_statistician_email || '';
        form.away_statistician_email.value = game.away_statistician_email || '';
        form.week_number.value = game.week_number || '';
                      form.stream_url.value = game.stream_url || '';

                      if (game.game_date) {
          const localDate = new Date(game.game_date);
          const offset = localDate.getTimezoneOffset();
          const adjustedDate = new Date(localDate.getTime() - (offset * 60 * 1000));
          form.game_date.value = adjustedDate.toISOString().slice(0, 16);
        }
      }
    }, 100);
  };

  const aiGenerateMutation = useMutation({
    mutationFn: async ({ sport, rounds }) => {
      if (!user?.organization_id) throw new Error("User organization not found.");
      
      const teamsInSport = teams.filter(t => t.sport === sport);

      if (teamsInSport.length < 2) {
        throw new Error(`Need at least 2 ${sport} teams to generate a schedule.`);
      }

      // Group teams by division
      const teamsByDivision = {};
      teamsInSport.forEach(team => {
        const division = team.division || 'No Division';
        if (!teamsByDivision[division]) {
          teamsByDivision[division] = [];
        }
        teamsByDivision[division].push(team);
      });

      // Calculate max weeks needed across all divisions
      let maxWeeks = 0;
      const divisionSchedules = {};
      
      // Generate schedules for each division
      for (const [division, divisionTeams] of Object.entries(teamsByDivision)) {
        const numTeams = divisionTeams.length;
        const isOdd = numTeams % 2 !== 0;
        const teamsForScheduling = isOdd ? [...divisionTeams, { id: 'BYE', name: 'BYE' }] : divisionTeams;
        const totalTeams = teamsForScheduling.length;
        const weeksPerRound = totalTeams - 1;
        const totalWeeks = weeksPerRound * rounds;
        
        maxWeeks = Math.max(maxWeeks, totalWeeks);
        divisionSchedules[division] = [];
        
        // Generate round-robin schedule using circle method
        for (let round = 0; round < rounds; round++) {
          for (let weekInRound = 0; weekInRound < weeksPerRound; weekInRound++) {
            const weekGames = [];
            
            for (let match = 0; match < totalTeams / 2; match++) {
              let home = (weekInRound + match) % (totalTeams - 1);
              let away = (totalTeams - 1 - match + weekInRound) % (totalTeams - 1);
              
              if (match === 0) {
                away = totalTeams - 1;
              }
              
              const homeTeam = teamsForScheduling[home];
              const awayTeam = teamsForScheduling[away];
              
              // Skip BYE games
              if (homeTeam.id === 'BYE' || awayTeam.id === 'BYE') {
                continue;
              }
              
              // Alternate home/away for second round
              const actualHome = round % 2 === 0 ? homeTeam : awayTeam;
              const actualAway = round % 2 === 0 ? awayTeam : homeTeam;
              
              weekGames.push({
                home_team_id: actualHome.id,
                away_team_id: actualAway.id,
                division: division,
              });
            }
            
            divisionSchedules[division].push(weekGames);
          }
        }
      }
      
      // Now combine all divisions week by week
      const allGeneratedGames = [];
      for (let weekIndex = 0; weekIndex < maxWeeks; weekIndex++) {
        const weekNumber = weekIndex + 1;
        
        // Add games from each division for this week
        for (const [division, schedule] of Object.entries(divisionSchedules)) {
          if (weekIndex < schedule.length) {
            const weekGames = schedule[weekIndex];
            weekGames.forEach(game => {
              allGeneratedGames.push({
                organization_id: user.organization_id,
                home_team_id: game.home_team_id,
                away_team_id: game.away_team_id,
                sport: sport,
                game_date: null,
                court_number: null,
                location: null,
                assigned_scorekeeper_emails: [],
                status: 'scheduled',
                archived: false,
                game_type: 'regular_season',
                penalty_limit_per_quarter: 5,
                player_foul_limit: 5,
                week_number: weekNumber,
                division: game.division,
              });
            });
          }
        }
      }

      return createMutation.mutate(allGeneratedGames);
    },
    onSuccess: () => {
      alert("AI-generated schedule created successfully! Remember to assign dates, times, venues, and scorekeepers to these games.");
    },
    onError: (error) => {
      console.error("AI schedule generation failed:", error);
      alert(`Failed to generate schedule: ${error.message}`);
    },
  });

  const generateScheduleWithAI = (sport, rounds) => {
    if (scheduledGames.length > 0) {
      const confirmGenerate = window.confirm(
        `⚠️ Warning: You already have ${scheduledGames.length} scheduled game(s).\n\n` +
        `Generating a new schedule will create additional games, which may cause duplicates.\n\n` +
        `Recommendation: Clear all scheduled games first before generating a new schedule.\n\n` +
        `Do you want to continue anyway?`
      );
      
      if (!confirmGenerate) {
        return;
      }
    }
    
    aiGenerateMutation.mutate({ sport, rounds });
  };

  const handleDeleteClick = (game) => {
    const gameStats = allPlayerStats.filter(s => s.game_id === game.id);
    setDeletingGame({ ...game, statsCount: gameStats.length });
  };

  const getTeamName = (teamId) => {
    const team = teams.find(t => t.id === teamId);
    return team?.name || 'Unknown';
  };

  const toggleScorekeeperSelection = (email) => {
  setSelectedScorekeeperEmails(prev => 
    prev.includes(email) ? prev.filter(e => e !== email) : [...prev, email]
  );
  };

  const toggleWeekExpanded = (week) => {
  setExpandedWeeks(prev => ({
    ...prev,
    [week]: !prev[week]
  }));
  };

  const scheduledGames = games.filter(g => g.status === 'scheduled' && !g.archived);
  const inProgressGames = games.filter(g => g.status === 'in_progress' && !g.archived);
  const completedGames = games.filter(g => g.status === 'completed' && !g.archived);
  const archivedGames = games.filter(g => g.archived === true);
  const completedWeekOptions = Array.from(new Set(completedGames.map(g => g.week_number).filter((w) => w !== null && w !== undefined))).sort((a, b) => a - b);
  const hasUnassignedCompleted = completedGames.some((g) => !g.week_number);
  const filteredCompletedGames = completedGames.filter((g) =>
    (completedSportFilter === 'all' || g.sport === completedSportFilter) &&
    (completedWeekFilter === 'all' || (completedWeekFilter === 'unassigned' ? !g.week_number : g.week_number === parseInt(completedWeekFilter)))
  );

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

    const assignedScorekeepersList = (game.assigned_scorekeeper_emails || []).map(email => 
      scorekeepers.find(s => s.email === email)
    ).filter(Boolean);
    
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
              {(isAdmin || hasPermission('manage_scorekeepers') || hasPermission('manage_games')) && assignedScorekeepersList.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {assignedScorekeepersList.map((sk, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs font-bold border-green-300 dark:border-green-700 text-green-700 dark:text-green-300">
                      👤 {sk?.full_name || sk?.email}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge variant="outline" className={`text-${sportColor}-600 dark:text-${sportColor}-400 border-${sportColor}-600 dark:border-${sportColor}-400 font-black`}>
                {game.sport}
              </Badge>
              {showActions && game.status === 'scheduled' && !game.archived && (
                <div className="flex gap-1">
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => handleEditGame(game)}
                    className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => handleDeleteClick(game)}
                    className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
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
          
          {game.status === 'scheduled' && !game.archived && hasPermission('live_scoring') && (
            <Link to={createPageUrl(game.sport === 'volleyball' ? 'LiveScoringVolleyball' : 'LiveScoring') + `?game_id=${game.id}`}>
              <Button className={`w-full bg-gradient-to-r from-${sportColor}-600 to-${sportColor}-700 hover:from-${sportColor}-700 hover:to-${sportColor}-800 text-white font-bold shadow-lg`}>
                <PlayCircle className="w-4 h-4 mr-2" />
                Start Game
              </Button>
            </Link>
          )}
          {game.status === 'in_progress' && !game.archived && hasPermission('live_scoring') && (
            <Link to={createPageUrl(game.sport === 'volleyball' ? 'LiveScoringVolleyball' : 'LiveScoring') + `?game_id=${game.id}`}>
              <Button className={`w-full bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800 text-white font-bold shadow-lg`}>
                Continue Scoring
              </Button>
            </Link>
          )}
          {showActions && game.status === 'completed' && !game.archived && (
            <div className="grid grid-cols-3 gap-2">
              <Button 
               onClick={() => handleEditGame(game)}
               variant="outline"
               className="border-2 border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 font-bold"
              >
               <Edit className="w-4 h-4 mr-2" />
               Edit
              </Button>
              <a href={createPageUrl(game.sport === 'volleyball' ? 'LiveScoringVolleyball' : 'LiveScoring') + `?game_id=${game.id}&edit=1`} className="w-full">
               <Button className="w-full bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-700 hover:to-amber-700 text-white font-bold">
                 <Edit className="w-4 h-4 mr-2" /> Edit Stats
               </Button>
              </a>
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

  if (!user || permissionsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

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
                <div className="flex gap-3">
                  {hasPermission('manage_games') && (
                    <Link to={createPageUrl("ManualGameEntry")}>
                      <Button 
                        className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold shadow-xl"
                      >
                        <FileEdit className="w-5 h-5 mr-2" />
                        Manual Entry
                      </Button>
                    </Link>
                  )}
                  <Button 
                    onClick={() => setShowAIScheduleDialog(true)}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold shadow-xl"
                  >
                    <Zap className="w-5 h-5 mr-2" />
                    AI Generate Schedule
                  </Button>
                  {hasPermission('manage_games') && (
                    <Button 
                      onClick={() => setShowForm(true)}
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold shadow-xl"
                    >
                      <Plus className="w-5 h-5 mr-2" />
                      Schedule Game
                    </Button>
                  )}
                </div>
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
                  {scheduledGames.length > 0 && (
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex gap-2 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 p-1 rounded-xl">
                        <Button
                          onClick={() => setAiScheduleView('card')}
                          variant={aiScheduleView === 'card' ? 'default' : 'ghost'}
                          size="sm"
                          className={aiScheduleView === 'card' ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold' : 'font-semibold text-gray-600 dark:text-gray-400'}
                        >
                          Card View
                        </Button>
                        <Button
                          onClick={() => setAiScheduleView('table')}
                          variant={aiScheduleView === 'table' ? 'default' : 'ghost'}
                          size="sm"
                          className={aiScheduleView === 'table' ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold' : 'font-semibold text-gray-600 dark:text-gray-400'}
                        >
                          Table View
                        </Button>
                      </div>
                      <Button
                        onClick={() => setShowClearAllDialog(true)}
                        variant="outline"
                        className="border-2 border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 font-bold"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Clear All Scheduled Games
                      </Button>
                    </div>
                  )}
                  
                  {(() => {
                    const gamesByWeek = {};
                    scheduledGames.forEach(game => {
                      const week = game.week_number || 'Unassigned';
                      if (!gamesByWeek[week]) gamesByWeek[week] = [];
                      gamesByWeek[week].push(game);
                    });
                    
                    const sortedWeeks = Object.keys(gamesByWeek).sort((a, b) => {
                      if (a === 'Unassigned') return 1;
                      if (b === 'Unassigned') return -1;
                      return parseInt(a) - parseInt(b);
                    });

                    if (aiScheduleView === 'card') {
                      return sortedWeeks.map(week => {
                        // Group games by division within each week
                        const gamesByDivision = {};
                        gamesByWeek[week].forEach(game => {
                          const homeTeam = teams.find(t => t.id === game.home_team_id);
                          const division = homeTeam?.division || 'No Division';
                          if (!gamesByDivision[division]) gamesByDivision[division] = [];
                          gamesByDivision[division].push(game);
                        });
                        
                        return (
                          <div key={week} className="space-y-6">
                            <button
                              onClick={() => toggleWeekExpanded(week)}
                              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl px-6 py-3 shadow-lg hover:from-blue-700 hover:to-indigo-700 transition-all flex items-center justify-between"
                            >
                              <div className="text-left">
                                <h3 className="text-xl font-black text-white">
                                  {week === 'Unassigned' ? 'Unassigned Games' : `WEEK ${week}`}
                                </h3>
                                <p className="text-sm text-blue-100 font-semibold">
                                  {gamesByWeek[week].length} {gamesByWeek[week].length === 1 ? 'game' : 'games'}
                                </p>
                              </div>
                              {expandedWeeks[week] ? (
                                <ChevronUp className="w-6 h-6 text-white" />
                              ) : (
                                <ChevronDown className="w-6 h-6 text-white" />
                              )}
                            </button>
                            {expandedWeeks[week] && (
                            <div className="space-y-6">
                            {Object.entries(gamesByDivision).map(([division, divisionGames]) => (
                              <div key={division} className="space-y-3">
                                <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg px-4 py-2 shadow-md">
                                  <h4 className="text-lg font-black text-white">{division}</h4>
                                  <p className="text-xs text-purple-100 font-semibold">
                                    {divisionGames.length} {divisionGames.length === 1 ? 'game' : 'games'}
                                  </p>
                                </div>
                                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                  {divisionGames.map(game => <GameCard key={game.id} game={game} />)}
                                </div>
                              </div>
                            ))}
                            </div>
                            )}
                          </div>
                        );
                      });
                    } else {
                      return sortedWeeks.map(week => {
                        // Group games by division within each week
                        const gamesByDivision = {};
                        gamesByWeek[week].forEach(game => {
                          const homeTeam = teams.find(t => t.id === game.home_team_id);
                          const division = homeTeam?.division || 'No Division';
                          if (!gamesByDivision[division]) gamesByDivision[division] = [];
                          gamesByDivision[division].push(game);
                        });
                        
                        return (
                          <div key={week} className="space-y-6">
                            <button
                              onClick={() => toggleWeekExpanded(week)}
                              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl px-6 py-3 shadow-lg hover:from-blue-700 hover:to-indigo-700 transition-all flex items-center justify-between"
                            >
                              <div className="text-left">
                                <h3 className="text-xl font-black text-white">
                                  {week === 'Unassigned' ? 'Unassigned Games' : `WEEK ${week}`}
                                </h3>
                                <p className="text-sm text-blue-100 font-semibold">
                                  {gamesByWeek[week].length} {gamesByWeek[week].length === 1 ? 'game' : 'games'}
                                </p>
                              </div>
                              {expandedWeeks[week] ? (
                                <ChevronUp className="w-6 h-6 text-white" />
                              ) : (
                                <ChevronDown className="w-6 h-6 text-white" />
                              )}
                            </button>
                            {expandedWeeks[week] && (
                            <div className="space-y-6">
                            {Object.entries(gamesByDivision).map(([division, divisionGames]) => (
                              <div key={division} className="space-y-3">
                                <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg px-4 py-2 shadow-md">
                                  <h4 className="text-lg font-black text-white">{division}</h4>
                                  <p className="text-xs text-purple-100 font-semibold">
                                    {divisionGames.length} {divisionGames.length === 1 ? 'game' : 'games'}
                                  </p>
                                </div>
                                <div className="bg-white dark:bg-gray-800 rounded-xl border-2 border-gray-200 dark:border-gray-700 overflow-hidden shadow-lg">
                                  <table className="w-full">
                                    <thead className="bg-gray-50 dark:bg-gray-900 border-b-2 border-gray-200 dark:border-gray-700">
                                      <tr>
                                        <th className="text-left py-3 px-4 text-gray-700 dark:text-gray-300 font-bold text-sm">Date & Time</th>
                                        <th className="text-left py-3 px-4 text-gray-700 dark:text-gray-300 font-bold text-sm">Matchup</th>
                                        <th className="text-left py-3 px-4 text-gray-700 dark:text-gray-300 font-bold text-sm">Sport</th>
                                        <th className="text-left py-3 px-4 text-gray-700 dark:text-gray-300 font-bold text-sm">Court</th>
                                        <th className="text-left py-3 px-4 text-gray-700 dark:text-gray-300 font-bold text-sm">Status</th>
                                        <th className="text-left py-3 px-4 text-gray-700 dark:text-gray-300 font-bold text-sm">Actions</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {divisionGames.map(game => (
                                        <tr key={game.id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
                                          <td className="py-3 px-4 text-sm font-medium text-gray-900 dark:text-white">
                                            {new Date(game.game_date).toLocaleDateString()}<br />
                                            <span className="text-xs text-gray-500 dark:text-gray-400">{new Date(game.game_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                          </td>
                                          <td className="py-3 px-4 text-sm font-bold text-gray-900 dark:text-white">
                                            {getTeamName(game.home_team_id)} <span className="text-gray-400 font-normal">vs</span> {getTeamName(game.away_team_id)}
                                          </td>
                                          <td className="py-3 px-4">
                                            <Badge variant="outline" className={`text-${game.sport === 'basketball' ? 'orange' : 'blue'}-600 dark:text-${game.sport === 'basketball' ? 'orange' : 'blue'}-400 border-${game.sport === 'basketball' ? 'orange' : 'blue'}-600 font-bold`}>
                                              {game.sport}
                                            </Badge>
                                          </td>
                                          <td className="py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                                            {game.court_number || '-'}
                                          </td>
                                          <td className="py-3 px-4">
                                            <Badge className="bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800 font-bold">
                                              {game.status.replace('_', ' ').toUpperCase()}
                                            </Badge>
                                          </td>
                                          <td className="py-3 px-4">
                                            <div className="flex gap-1">
                                              <Button 
                                                variant="ghost" 
                                                size="icon"
                                                onClick={() => handleEditGame(game)}
                                                className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                                              >
                                                <Edit className="w-4 h-4" />
                                              </Button>
                                              <Button 
                                                variant="ghost" 
                                                size="icon"
                                                onClick={() => handleDeleteClick(game)}
                                                className="text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                                              >
                                                <Trash2 className="w-4 h-4" />
                                              </Button>
                                            </div>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                  </div>
                                </div>
                              ))}
                            </div>
                            )}
                          </div>
                        );
                      });
                    }
                  })()}
                  
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
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 p-2 rounded-xl">
                      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Sport</label>
                      <select
                        value={completedSportFilter}
                        onChange={(e) => setCompletedSportFilter(e.target.value)}
                        className="bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 text-sm font-medium"
                      >
                        <option value="all">All</option>
                        <option value="basketball">Basketball</option>
                        <option value="volleyball">Volleyball</option>
                      </select>
                      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 ml-3">Week</label>
                      <select
                        value={completedWeekFilter}
                        onChange={(e) => setCompletedWeekFilter(e.target.value)}
                        className="bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 text-sm font-medium"
                      >
                        <option value="all">All</option>
                        {completedWeekOptions.map((w) => (
                          <option key={w} value={String(w)}>{w}</option>
                        ))}
                        {hasUnassignedCompleted && <option value="unassigned">Unassigned</option>}
                      </select>
                    </div>
                    <div className="flex gap-2 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 p-1 rounded-xl">
                      <Button
                        onClick={() => setCompletedView('card')}
                        variant={completedView === 'card' ? 'default' : 'ghost'}
                        size="sm"
                        className={completedView === 'card' ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold' : 'font-semibold text-gray-600 dark:text-gray-400'}
                      >
                        Card View
                      </Button>
                      <Button
                        onClick={() => setCompletedView('table')}
                        variant={completedView === 'table' ? 'default' : 'ghost'}
                        size="sm"
                        className={completedView === 'table' ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold' : 'font-semibold text-gray-600 dark:text-gray-400'}
                      >
                        Table View
                      </Button>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                      Showing {filteredCompletedGames.length} of {completedGames.length}
                    </div>
                  </div>
                  {completedView === 'card' ? (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {filteredCompletedGames.map(game => <GameCard key={game.id} game={game} />)}
                    </div>
                  ) : (
                    <div className="bg-white dark:bg-gray-800 rounded-xl border-2 border-gray-200 dark:border-gray-700 overflow-hidden shadow-lg">
                      <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-900 border-b-2 border-gray-200 dark:border-gray-700">
                          <tr>
                            <th className="text-left py-3 px-4 text-gray-700 dark:text-gray-300 font-bold text-sm">Date & Time</th>
                            <th className="text-left py-3 px-4 text-gray-700 dark:text-gray-300 font-bold text-sm">Matchup</th>
                            <th className="text-left py-3 px-4 text-gray-700 dark:text-gray-300 font-bold text-sm">Sport</th>
                            <th className="text-left py-3 px-4 text-gray-700 dark:text-gray-300 font-bold text-sm">Court</th>
                            <th className="text-left py-3 px-4 text-gray-700 dark:text-gray-300 font-bold text-sm">Score</th>
                            <th className="text-left py-3 px-4 text-gray-700 dark:text-gray-300 font-bold text-sm">Week</th>
                            <th className="text-left py-3 px-4 text-gray-700 dark:text-gray-300 font-bold text-sm">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredCompletedGames.map((game) => (
                            <tr key={game.id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
                              <td className="py-3 px-4 text-sm font-medium text-gray-900 dark:text-white">
                                {new Date(game.game_date).toLocaleDateString()}<br />
                                <span className="text-xs text-gray-500 dark:text-gray-400">{new Date(game.game_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                              </td>
                              <td className="py-3 px-4 text-sm font-bold text-gray-900 dark:text-white">
                                {getTeamName(game.home_team_id)} <span className="text-gray-400 font-normal">vs</span> {getTeamName(game.away_team_id)}
                              </td>
                              <td className="py-3 px-4">
                                <Badge variant="outline" className={`text-${game.sport === 'basketball' ? 'orange' : 'blue'}-600 dark:text-${game.sport === 'basketball' ? 'orange' : 'blue'}-400 border-${game.sport === 'basketball' ? 'orange' : 'blue'}-600 font-bold`}>
                                  {game.sport}
                                </Badge>
                              </td>
                              <td className="py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">{game.court_number || '-'}</td>
                              <td className="py-3 px-4 text-sm font-black text-gray-900 dark:text-white">{game.home_score} - {game.away_score}</td>
                              <td className="py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">{game.week_number || '-'}</td>
                              <td className="py-3 px-4">
                                <div className="flex gap-1">
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    onClick={() => handleEditGame(game)}
                                    className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    onClick={() => setArchivingGame(game)}
                                    className="text-gray-400 hover:text-purple-600 dark:hover:text-purple-400"
                                  >
                                    <Archive className="w-4 h-4" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    onClick={() => handleDeleteClick(game)}
                                    className="text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </td>
                              </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {filteredCompletedGames.length === 0 && (
                   <div className="text-center py-20">
                     <div className="w-24 h-24 bg-gradient-to-br from-green-200 to-green-300 dark:from-green-800 dark:to-green-700 rounded-full flex items-center justify-center mx-auto mb-6">
                       <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-300" />
                     </div>
                     <p className="text-gray-500 dark:text-gray-400 text-xl font-bold">No completed games match your filters</p>
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
              
              <AIScheduleGenerator 
                isOpen={showAIScheduleDialog}
                onClose={() => setShowAIScheduleDialog(false)}
                onGenerate={generateScheduleWithAI}
                isLoading={aiGenerateMutation.isLoading}
                teams={teams}
              />

              <Dialog open={showForm} onOpenChange={(open) => {
                setShowForm(open);
                if (!open) {
                  setConflicts([]);
                  setRecurringConfig({ enabled: false });
                  setSelectedScorekeeperEmails([]);
                  setEditingGame(null);
                }
              }}>
                <DialogContent className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 max-w-3xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-black text-gray-900 dark:text-white">
                      {editingGame ? 'Edit Game' : 'Schedule New Game'}
                    </DialogTitle>
                  </DialogHeader>
                  <form id="game-form" onSubmit={handleSubmit} className="space-y-4">
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
                        <option value="pre_season">Pre-Season</option>
                        <option value="regular_season">Regular Season</option>
                        <option value="playoffs">Playoffs</option>
                        <option value="semi_finals">Semi Finals</option>
                        <option value="finals">Finals</option>
                      </select>
                    </div>

                    <div>
                      <Label htmlFor="division" className="font-bold text-gray-700 dark:text-gray-300">Division</Label>
                      <select
                        id="division"
                        name="division"
                        className="w-full bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-xl px-3 py-2 font-medium"
                      >
                        <option value="">Select division</option>
                        {divisions.map(div => (
                          <option key={div.id} value={div.name}>{div.name}{div.sport ? ` (${div.sport})` : ''}</option>
                        ))}
                      </select>
                    </div>

                    {/* Scorekeeper Role Assignments (Basketball Only) */}
                    <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-xl border-2 border-blue-200 dark:border-blue-800 space-y-4">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Users className="w-5 h-5 text-blue-600" />
                        Scorekeeper & Statistician Assignments
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        For basketball: Assign specific roles. The Overall Scorekeeper handles points, fouls, timeouts, and game flow. Statisticians only record non-point stats for their assigned team.
                      </p>
                      
                      <div>
                        <Label htmlFor="overall_scorekeeper_email" className="font-bold text-gray-700 dark:text-gray-300">Overall Scorekeeper</Label>
                        <select
                          id="overall_scorekeeper_email"
                          name="overall_scorekeeper_email"
                          className="w-full bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-xl px-3 py-2 font-medium"
                        >
                          <option value="">-- None --</option>
                          {scorekeepers.map(sk => (
                            <option key={sk.email} value={sk.email}>{sk.full_name} ({sk.email})</option>
                          ))}
                        </select>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Controls score, fouls, timeouts, game flow, and all player stats.</p>
                      </div>

                      <div>
                        <Label htmlFor="home_statistician_email" className="font-bold text-gray-700 dark:text-gray-300">Home Team Statistician</Label>
                        <select
                          id="home_statistician_email"
                          name="home_statistician_email"
                          className="w-full bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-xl px-3 py-2 font-medium"
                        >
                          <option value="">-- None --</option>
                          {scorekeepers.map(sk => (
                            <option key={sk.email} value={sk.email}>{sk.full_name} ({sk.email})</option>
                          ))}
                        </select>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Records non-point stats (rebounds, assists, etc.) for Home team only.</p>
                      </div>

                      <div>
                        <Label htmlFor="away_statistician_email" className="font-bold text-gray-700 dark:text-gray-300">Away Team Statistician</Label>
                        <select
                          id="away_statistician_email"
                          name="away_statistician_email"
                          className="w-full bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-xl px-3 py-2 font-medium"
                        >
                          <option value="">-- None --</option>
                          {scorekeepers.map(sk => (
                            <option key={sk.email} value={sk.email}>{sk.full_name} ({sk.email})</option>
                          ))}
                        </select>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Records non-point stats (rebounds, assists, etc.) for Away team only.</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
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
                      <div>
                        <Label htmlFor="week_number" className="font-bold text-gray-700 dark:text-gray-300">Week Number</Label>
                        <Input
                          id="week_number"
                          name="week_number"
                          type="number"
                          min="1"
                          placeholder="e.g., 1, 2, 3"
                          className="bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white font-medium"
                        />
                      </div>
                    </div>

                    <ConflictResolver
                      conflicts={conflicts}
                      gameDate={document.querySelector('[name="game_date"]')?.value}
                      courtNumber={document.querySelector('[name="court_number"]')?.value}
                      allGames={games}
                      onSelectAlternative={handleSelectAlternative}
                    />

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
                                              <div>
                                                <Label htmlFor="stream_url" className="font-bold text-gray-700 dark:text-gray-300">Live Stream URL (Optional)</Label>
                                                <Input
                                                  id="stream_url"
                                                  name="stream_url"
                                                  placeholder="e.g., https://youtube.com/live/... or https://twitch.tv/..."
                                                  className="bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white font-medium"
                                                />
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Paste a YouTube Live, Twitch, or other embed URL for live streaming.</p>
                                              </div>
                    <div className="flex justify-end gap-3 pt-4">
                      <Button type="button" variant="outline" onClick={() => { 
                        setShowForm(false); 
                        setConflicts([]); 
                        setRecurringConfig({ enabled: false });
                        setSelectedScorekeeperEmails([]);
                        setEditingGame(null);
                      }} className="border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 font-bold">
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={createMutation.isLoading || updateMutation.isLoading}
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold"
                      >
                        {editingGame ? (updateMutation.isLoading ? 'Updating...' : 'Update Game') : (createMutation.isLoading ? 'Scheduling...' : (recurringConfig.enabled ? `Schedule ${recurringConfig.occurrences} Games` : 'Schedule Game'))}
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

              <AlertDialog open={showClearAllDialog} onOpenChange={setShowClearAllDialog}>
                <AlertDialogContent className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700">
                  <AlertDialogHeader>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-12 h-12 bg-red-100 dark:bg-red-950/30 rounded-xl flex items-center justify-center">
                        <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
                      </div>
                      <AlertDialogTitle className="text-xl font-black text-gray-900 dark:text-white">
                        Clear All Scheduled Games?
                      </AlertDialogTitle>
                    </div>
                    <AlertDialogDescription className="text-gray-600 dark:text-gray-400 font-medium">
                      Are you sure you want to delete all <span className="font-bold text-gray-900 dark:text-white">{scheduledGames.length}</span> scheduled games?
                      <br /><br />
                      <p className="font-semibold text-red-600 dark:text-red-400">⚠️ This action cannot be undone. All scheduled games will be permanently deleted.</p>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="border-2 border-gray-300 dark:border-gray-600 font-bold">
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => clearAllScheduledMutation.mutate()}
                      className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold"
                    >
                      {clearAllScheduledMutation.isLoading ? 'Deleting...' : 'Delete All'}
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