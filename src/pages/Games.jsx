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
  const [formDivision, setFormDivision] = useState('');
  const [formSport, setFormSport] = useState('');
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
      let seasonId = null;
      try {
        const res = await base44.functions.invoke('getActiveSeason', {});
        seasonId = res.data?.season?.id || null;
      } catch (_) {}
      const withSeason = (g) => ({ ...g, season_id: seasonId });
      if (Array.isArray(data)) {
        return base44.entities.Game.bulkCreate(data.map(withSeason));
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
          
          gamesToCreate.push(withSeason({
            ...data,
            game_date: gameDate.toISOString(),
            recurring_series_id: seriesId,
          }));
        }
        
        return Promise.all(gamesToCreate.map(game => base44.entities.Game.create(game)));
      } else {
        return base44.entities.Game.create(withSeason(data));
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
        setFormSport(game.sport || '');
        form.game_type.value = game.game_type || 'regular_season';
        form.division.value = game.division || '';
        setFormDivision(game.division || '');
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

  // Filter teams for form selects based on currently selected sport/division in the dialog
  const teamsForSelect = React.useMemo(() => {
    const d = (formDivision || '').trim().toLowerCase();
    const s = (formSport || '').trim().toLowerCase();
    return teams.filter((t) => {
      const sportOk = s ? String(t.sport || '').toLowerCase() === s : true;
      const divVal = String(t.division || '').toLowerCase();
      const divOk = d ? divVal.includes(d) : true;
      return sportOk && divOk;
    });
  }, [teams, formDivision, formSport]);

  const GameCard = ({ game, showActions = true }) => {
    const assignedScorekeepersList = (game.assigned_scorekeeper_emails || []).map(email => 
      scorekeepers.find(s => s.email === email)
    ).filter(Boolean);
    
    return (
      <Card className="relative border border-border bg-card hover:border-foreground/20 transition-colors">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <Badge variant="outline" className="border-border text-muted-foreground font-medium mb-2 uppercase tracking-wide text-xs">
                {game.status === 'scheduled' && <Clock className="w-3 h-3 mr-1" />}
                {game.status === 'in_progress' && <PlayCircle className="w-3 h-3 mr-1" />}
                {game.status === 'completed' && <CheckCircle className="w-3 h-3 mr-1" />}
                {game.status ? game.status.replace('_', ' ').toUpperCase() : 'SCHEDULED'}
              </Badge>
              <p className="text-muted-foreground text-sm font-medium flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(game.game_date).toLocaleDateString()} at {new Date(game.game_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </p>
              {game.court_number && (
                <p className="text-muted-foreground text-xs font-medium mt-1">
                  Court {game.court_number}
                </p>
              )}
              {(isAdmin || hasPermission('manage_scorekeepers') || hasPermission('manage_games')) && assignedScorekeepersList.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {assignedScorekeepersList.map((sk, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs font-medium border-border text-muted-foreground">
                      👤 {sk?.full_name || sk?.email}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge variant="outline" className="border-border text-foreground font-heading font-bold uppercase tracking-wide text-xs">
                {game.sport}
              </Badge>
              {showActions && game.status === 'scheduled' && !game.archived && (
                <div className="flex gap-1">
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => handleEditGame(game)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => handleDeleteClick(game)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4 relative z-10">
          <div className="border border-border bg-background p-4">
            <div className="flex justify-between items-center">
              <div className="flex-1">
                <p className="text-foreground font-heading font-bold">{getTeamName(game.home_team_id)}</p>
                <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">HOME</p>
              </div>
              {game.status === 'completed' ? (
                <>
                  <div className="text-4xl font-heading font-bold tabular-nums text-primary">{game.home_score}</div>
                  <div className="text-muted-foreground px-4 text-2xl font-heading font-bold">-</div>
                  <div className="text-4xl font-heading font-bold tabular-nums">{game.away_score}</div>
                </>
              ) : (
                <div className="text-muted-foreground text-xl font-heading font-bold">vs</div>
              )}
              <div className="flex-1 text-right">
                <p className="text-foreground font-heading font-bold">{getTeamName(game.away_team_id)}</p>
                <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">AWAY</p>
              </div>
            </div>
          </div>
          
          {game.location && (
            <p className="text-muted-foreground text-sm font-medium flex items-center gap-1">
              <MapPin className="w-3 h-3" /> {game.location}
            </p>
          )}
          
          {game.status === 'scheduled' && !game.archived && hasPermission('live_scoring') && (
            <Link to={createPageUrl(game.sport === 'volleyball' ? 'LiveScoringVolleyball' : 'LiveScoring') + `?game_id=${game.id}`}>
              <Button className="w-full font-medium">
                <PlayCircle className="w-4 h-4 mr-2" />
                Start Game
              </Button>
            </Link>
          )}
          {game.status === 'in_progress' && !game.archived && hasPermission('live_scoring') && (
            <Link to={createPageUrl(game.sport === 'volleyball' ? 'LiveScoringVolleyball' : 'LiveScoring') + `?game_id=${game.id}`}>
              <Button variant="outline" className="w-full font-medium">
                Continue Scoring
              </Button>
            </Link>
          )}
          {showActions && game.status === 'completed' && !game.archived && (
            <div className="flex flex-wrap gap-2">
              <Button 
                onClick={() => handleEditGame(game)}
                variant="outline"
                size="sm"
                className="border border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 font-medium"
              >
                <Edit className="w-3.5 h-3.5 mr-1.5" />
                Edit
              </Button>
              <Link to={createPageUrl(game.sport === 'volleyball' ? 'LiveScoringVolleyball' : 'LiveScoring') + `?game_id=${game.id}&edit=1`}>
                <Button
                  variant="outline"
                  size="sm"
                  className="border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 font-medium"
                >
                  <FileEdit className="w-3.5 h-3.5 mr-1.5" />
                  Edit Stats
                </Button>
              </Link>
              <Button
                onClick={() => setArchivingGame(game)}
                variant="outline"
                size="sm"
                className="border border-purple-300 dark:border-purple-700 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/30 font-medium"
              >
                <Archive className="w-3.5 h-3.5 mr-1.5" />
                Archive
              </Button>
              <Button
                onClick={() => handleDeleteClick(game)}
                variant="outline"
                size="sm"
                className="border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 font-medium"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                Delete
              </Button>
            </div>
          )}
          {game.archived && showActions && (
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => setRestoringGame(game)}
                variant="outline"
                size="sm"
                className="border-border text-primary hover:bg-primary/10 font-medium"
              >
                <ArchiveRestore className="w-3.5 h-3.5 mr-1.5" />
                Restore
              </Button>
              <Button
                onClick={() => handleDeleteClick(game)}
                variant="outline"
                size="sm"
                className="border-border text-destructive hover:bg-destructive/10 font-medium"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
      </div>
    );
  }

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
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="font-heading text-3xl font-bold tracking-tight">Games</h1>
                  <p className="text-muted-foreground mt-1 text-sm">Schedule and manage games</p>
                </div>
                <div className="flex gap-3">
                  {hasPermission('manage_games') && (
                    <Link to={createPageUrl("ManualGameEntry")}>
                      <Button variant="outline">
                        <FileEdit className="w-4 h-4 mr-2" />
                        Manual Entry
                      </Button>
                    </Link>
                  )}
                  <Button 
                    onClick={() => setShowAIScheduleDialog(true)}
                    variant="outline"
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    AI Generate Schedule
                  </Button>
                  {hasPermission('manage_games') && (
                    <Button 
                      onClick={() => setShowForm(true)}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Schedule Game
                    </Button>
                  )}
                </div>
              </div>

              <Tabs defaultValue="scheduled" className="space-y-6">
                <TabsList className="bg-card border border-border p-1">
                  <TabsTrigger value="scheduled" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-medium">
                    Scheduled ({scheduledGames.length})
                  </TabsTrigger>
                  <TabsTrigger value="in_progress" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-medium">
                    In Progress ({inProgressGames.length})
                  </TabsTrigger>
                  <TabsTrigger value="completed" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-medium">
                    Completed ({completedGames.length})
                  </TabsTrigger>
                  <TabsTrigger value="archived" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-medium">
                    Archived ({archivedGames.length})
                  </TabsTrigger>
                  <TabsTrigger value="history" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-medium">
                    Game History
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="scheduled" className="space-y-4">
                  {scheduledGames.length > 0 && (
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex gap-1 bg-card border border-border p-1">
                        <Button
                          onClick={() => setAiScheduleView('card')}
                          variant={aiScheduleView === 'card' ? 'default' : 'ghost'}
                          size="sm"
                          className={aiScheduleView === 'card' ? 'bg-primary text-primary-foreground font-medium' : 'font-medium text-muted-foreground'}
                        >
                          Card View
                        </Button>
                        <Button
                          onClick={() => setAiScheduleView('table')}
                          variant={aiScheduleView === 'table' ? 'default' : 'ghost'}
                          size="sm"
                          className={aiScheduleView === 'table' ? 'bg-primary text-primary-foreground font-medium' : 'font-medium text-muted-foreground'}
                        >
                          Table View
                        </Button>
                      </div>
                      <Button
                        onClick={() => setShowClearAllDialog(true)}
                        variant="outline"
                        className="border-border text-destructive hover:bg-destructive/10 font-medium"
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
                              className="w-full bg-card border border-border rounded-sm px-6 py-3 hover:bg-muted transition-colors flex items-center justify-between"
                            >
                              <div className="text-left">
                                <h3 className="text-xl font-heading font-bold text-foreground">
                                  {week === 'Unassigned' ? 'Unassigned Games' : `WEEK ${week}`}
                                </h3>
                                <p className="text-sm text-muted-foreground font-medium">
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
                                <div className="border-l-2 border-primary pl-4">
                                  <h4 className="text-lg font-heading font-bold text-foreground">{division}</h4>
                                  <p className="text-xs text-muted-foreground font-medium">
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
                              className="w-full bg-card border border-border rounded-sm px-6 py-3 hover:bg-muted transition-colors flex items-center justify-between"
                            >
                              <div className="text-left">
                                <h3 className="text-xl font-heading font-bold text-foreground">
                                  {week === 'Unassigned' ? 'Unassigned Games' : `WEEK ${week}`}
                                </h3>
                                <p className="text-sm text-muted-foreground font-medium">
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
                                <div className="border-l-2 border-primary pl-4">
                                  <h4 className="text-lg font-heading font-bold text-foreground">{division}</h4>
                                  <p className="text-xs text-muted-foreground font-medium">
                                    {divisionGames.length} {divisionGames.length === 1 ? 'game' : 'games'}
                                  </p>
                                </div>
                                <div className="bg-card border border-border overflow-hidden">
                                  <table className="w-full">
                                    <thead className="bg-muted/50 border-b border-border">
                                      <tr>
                                        <th className="text-left py-3 px-4 text-foreground font-heading font-bold text-sm">Date & Time</th>
                                        <th className="text-left py-3 px-4 text-foreground font-heading font-bold text-sm">Matchup</th>
                                        <th className="text-left py-3 px-4 text-foreground font-heading font-bold text-sm">Sport</th>
                                        <th className="text-left py-3 px-4 text-foreground font-heading font-bold text-sm">Court</th>
                                        <th className="text-left py-3 px-4 text-foreground font-heading font-bold text-sm">Status</th>
                                        <th className="text-left py-3 px-4 text-foreground font-heading font-bold text-sm">Actions</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {divisionGames.map(game => (
                                        <tr key={game.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                                          <td className="py-3 px-4 text-sm font-medium text-foreground">
                                            {new Date(game.game_date).toLocaleDateString()}<br />
                                            <span className="text-xs text-gray-500 dark:text-gray-400">{new Date(game.game_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                          </td>
                                          <td className="py-3 px-4 text-sm font-heading font-bold text-foreground">
                                            {getTeamName(game.home_team_id)} <span className="text-muted-foreground font-normal">vs</span> {getTeamName(game.away_team_id)}
                                          </td>
                                          <td className="py-3 px-4">
                                            <Badge variant="outline" className="border-border text-foreground font-heading font-bold uppercase text-xs">
                                              {game.sport}
                                            </Badge>
                                          </td>
                                          <td className="py-3 px-4 text-sm font-medium text-muted-foreground">
                                            {game.court_number || '-'}
                                          </td>
                                          <td className="py-3 px-4">
                                            <Badge variant="outline" className="border-border text-muted-foreground font-medium uppercase text-xs">
                                              {game.status.replace('_', ' ').toUpperCase()}
                                            </Badge>
                                          </td>
                                          <td className="py-3 px-4">
                                            <div className="flex gap-1">
                                              <Button 
                                                variant="ghost" 
                                                size="icon"
                                                onClick={() => handleEditGame(game)}
                                                className="text-muted-foreground hover:text-foreground"
                                              >
                                                <Edit className="w-4 h-4" />
                                              </Button>
                                              <Button 
                                                variant="ghost" 
                                                size="icon"
                                                onClick={() => handleDeleteClick(game)}
                                                className="text-muted-foreground hover:text-destructive"
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
                      <div className="w-24 h-24 border border-border bg-card flex items-center justify-center mx-auto mb-6">
                        <Clock className="w-12 h-12 text-muted-foreground" />
                      </div>
                      <p className="text-muted-foreground text-xl font-heading font-bold">No scheduled games</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="in_progress" className="space-y-4">
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {inProgressGames.map(game => <GameCard key={game.id} game={game} showActions={false} />)}
                  </div>
                  {inProgressGames.length === 0 && (
                    <div className="text-center py-20">
                      <div className="w-24 h-24 border border-border bg-card flex items-center justify-center mx-auto mb-6">
                        <PlayCircle className="w-12 h-12 text-muted-foreground" />
                      </div>
                      <p className="text-muted-foreground text-xl font-heading font-bold">No games in progress</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="completed" className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2 bg-card border border-border p-2">
                      <label className="text-sm font-medium text-foreground">Sport</label>
                      <select
                        value={completedSportFilter}
                        onChange={(e) => setCompletedSportFilter(e.target.value)}
                        className="bg-background border border-border px-2 py-1 text-sm font-medium"
                      >
                        <option value="all">All</option>
                        <option value="basketball">Basketball</option>
                        <option value="volleyball">Volleyball</option>
                      </select>
                      <label className="text-sm font-medium text-foreground ml-3">Week</label>
                      <select
                        value={completedWeekFilter}
                        onChange={(e) => setCompletedWeekFilter(e.target.value)}
                        className="bg-background border border-border px-2 py-1 text-sm font-medium"
                      >
                        <option value="all">All</option>
                        {completedWeekOptions.map((w) => (
                          <option key={w} value={String(w)}>{w}</option>
                        ))}
                        {hasUnassignedCompleted && <option value="unassigned">Unassigned</option>}
                      </select>
                    </div>
                    <div className="flex gap-1 bg-card border border-border p-1">
                      <Button
                        onClick={() => setCompletedView('card')}
                        variant={completedView === 'card' ? 'default' : 'ghost'}
                        size="sm"
                        className={completedView === 'card' ? 'bg-primary text-primary-foreground font-medium' : 'font-medium text-muted-foreground'}
                      >
                        Card View
                      </Button>
                      <Button
                        onClick={() => setCompletedView('table')}
                        variant={completedView === 'table' ? 'default' : 'ghost'}
                        size="sm"
                        className={completedView === 'table' ? 'bg-primary text-primary-foreground font-medium' : 'font-medium text-muted-foreground'}
                      >
                        Table View
                      </Button>
                    </div>
                    <div className="text-sm text-muted-foreground font-medium">
                      Showing {filteredCompletedGames.length} of {completedGames.length}
                    </div>
                  </div>
                  {completedView === 'card' ? (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {filteredCompletedGames.map(game => <GameCard key={game.id} game={game} />)}
                    </div>
                  ) : (
                    <div className="bg-card border border-border overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-muted/50 border-b border-border">
                          <tr>
                            <th className="text-left py-3 px-4 text-foreground font-heading font-bold text-sm">Date & Time</th>
                            <th className="text-left py-3 px-4 text-foreground font-heading font-bold text-sm">Matchup</th>
                            <th className="text-left py-3 px-4 text-foreground font-heading font-bold text-sm">Sport</th>
                            <th className="text-left py-3 px-4 text-foreground font-heading font-bold text-sm">Court</th>
                            <th className="text-left py-3 px-4 text-foreground font-heading font-bold text-sm">Score</th>
                            <th className="text-left py-3 px-4 text-foreground font-heading font-bold text-sm">Week</th>
                            <th className="text-left py-3 px-4 text-foreground font-heading font-bold text-sm">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredCompletedGames.map((game) => (
                            <tr key={game.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                              <td className="py-3 px-4 text-sm font-medium text-foreground">
                                {new Date(game.game_date).toLocaleDateString()}<br />
                                <span className="text-xs text-gray-500 dark:text-gray-400">{new Date(game.game_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                              </td>
                              <td className="py-3 px-4 text-sm font-heading font-bold text-foreground">
                                {getTeamName(game.home_team_id)} <span className="text-muted-foreground font-normal">vs</span> {getTeamName(game.away_team_id)}
                              </td>
                              <td className="py-3 px-4">
                                <Badge variant="outline" className="border-border text-foreground font-heading font-bold uppercase text-xs">
                                  {game.sport}
                                </Badge>
                              </td>
                              <td className="py-3 px-4 text-sm font-medium text-muted-foreground">{game.court_number || '-'}</td>
                              <td className="py-3 px-4 text-sm font-heading font-bold tabular-nums text-foreground">{game.home_score} - {game.away_score}</td>
                              <td className="py-3 px-4 text-sm font-medium text-muted-foreground">{game.week_number || '-'}</td>
                              <td className="py-3 px-4">
                                <div className="flex gap-1">
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    onClick={() => handleEditGame(game)}
                                    className="text-muted-foreground hover:text-foreground"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Link to={createPageUrl(game.sport === 'volleyball' ? 'LiveScoringVolleyball' : 'LiveScoring') + `?game_id=${game.id}&edit=1`}>
                                    <Button 
                                      variant="ghost" 
                                      size="icon"
                                      className="text-muted-foreground hover:text-primary"
                                    >
                                      <FileEdit className="w-4 h-4" />
                                    </Button>
                                  </Link>
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    onClick={() => setArchivingGame(game)}
                                    className="text-muted-foreground hover:text-foreground"
                                  >
                                    <Archive className="w-4 h-4" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    onClick={() => handleDeleteClick(game)}
                                    className="text-muted-foreground hover:text-destructive"
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
                     <div className="w-24 h-24 border border-border bg-card flex items-center justify-center mx-auto mb-6">
                                             <CheckCircle className="w-12 h-12 text-muted-foreground" />
                     </div>
                     <p className="text-muted-foreground text-xl font-heading font-bold">No completed games match your filters</p>
                   </div>
                  )}
                </TabsContent>

                <TabsContent value="archived" className="space-y-4">
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {archivedGames.map(game => <GameCard key={game.id} game={game} />)}
                  </div>
                  {archivedGames.length === 0 && (
                    <div className="text-center py-20">
                      <div className="w-24 h-24 border border-border bg-card flex items-center justify-center mx-auto mb-6">
                        <Archive className="w-12 h-12 text-muted-foreground" />
                      </div>
                      <p className="text-muted-foreground text-xl font-heading font-bold">No archived games</p>
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
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-heading font-bold">
                      {editingGame ? 'Edit Game' : 'Schedule New Game'}
                    </DialogTitle>
                  </DialogHeader>
                  <form id="game-form" onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="sport" className="font-heading font-bold text-foreground">Sport</Label>
                      <select
                        id="sport"
                        name="sport"
                        required
                        onChange={(e) => setFormSport(e.target.value)}
                        className="w-full bg-background border border-border text-foreground px-3 py-2 font-medium"
                      >
                        <option value="">Select sport</option>
                        <option value="basketball">Basketball</option>
                        <option value="volleyball">Volleyball</option>
                      </select>
                    </div>

                    <div>
                      <Label htmlFor="game_type" className="font-heading font-bold text-foreground">Game Type</Label>
                      <select
                        id="game_type"
                        name="game_type"
                        required
                        className="w-full bg-background border border-border text-foreground px-3 py-2 font-medium"
                      >
                        <option value="pre_season">Pre-Season</option>
                        <option value="regular_season">Regular Season</option>
                        <option value="play_in">Play In</option>
                        <option value="playoffs">Playoffs</option>
                        <option value="quarter_finals">Quarter Finals</option>
                        <option value="semi_finals">Semi Finals</option>
                        <option value="finals">Finals</option>
                      </select>
                    </div>

                    <div>
                      <Label htmlFor="division" className="font-heading font-bold text-foreground">Division</Label>
                      <select
                        id="division"
                        name="division"
                        onChange={(e) => setFormDivision(e.target.value)}
                        className="w-full bg-background border border-border text-foreground px-3 py-2 font-medium"
                      >
                        <option value="">Select division</option>
                        {divisions.map(div => (
                          <option key={div.id} value={div.name}>{div.name}{div.sport ? ` (${div.sport})` : ''}</option>
                        ))}
                      </select>
                    </div>

                    {/* Scorekeeper Role Assignments (Basketball Only) */}
                    <div className="bg-muted/50 p-4 border border-border space-y-4">
                      <h3 className="text-lg font-heading font-bold text-foreground flex items-center gap-2">
                        <Users className="w-5 h-5 text-primary" />
                        Scorekeeper & Statistician Assignments
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        For basketball: Assign specific roles. The Overall Scorekeeper handles points, fouls, timeouts, and game flow. Statisticians only record non-point stats for their assigned team.
                      </p>
                      
                      <div>
                        <Label htmlFor="overall_scorekeeper_email" className="font-heading font-bold text-foreground">Overall Scorekeeper</Label>
                        <select
                          id="overall_scorekeeper_email"
                          name="overall_scorekeeper_email"
                          className="w-full bg-background border border-border text-foreground px-3 py-2 font-medium"
                        >
                          <option value="">-- None --</option>
                          {scorekeepers.map(sk => (
                            <option key={sk.email} value={sk.email}>{sk.full_name} ({sk.email})</option>
                          ))}
                        </select>
                        <p className="text-xs text-muted-foreground mt-1">Controls score, fouls, timeouts, game flow, and all player stats.</p>
                      </div>

                      <div>
                        <Label htmlFor="home_statistician_email" className="font-heading font-bold text-foreground">Home Team Statistician</Label>
                        <select
                          id="home_statistician_email"
                          name="home_statistician_email"
                          className="w-full bg-background border border-border text-foreground px-3 py-2 font-medium"
                        >
                          <option value="">-- None --</option>
                          {scorekeepers.map(sk => (
                            <option key={sk.email} value={sk.email}>{sk.full_name} ({sk.email})</option>
                          ))}
                        </select>
                        <p className="text-xs text-muted-foreground mt-1">Records non-point stats (rebounds, assists, etc.) for Home team only.</p>
                      </div>

                      <div>
                        <Label htmlFor="away_statistician_email" className="font-heading font-bold text-foreground">Away Team Statistician</Label>
                        <select
                          id="away_statistician_email"
                          name="away_statistician_email"
                          className="w-full bg-background border border-border text-foreground px-3 py-2 font-medium"
                        >
                          <option value="">-- None --</option>
                          {scorekeepers.map(sk => (
                            <option key={sk.email} value={sk.email}>{sk.full_name} ({sk.email})</option>
                          ))}
                        </select>
                        <p className="text-xs text-muted-foreground mt-1">Records non-point stats (rebounds, assists, etc.) for Away team only.</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="game_date" className="font-heading font-bold text-foreground">Date & Time *</Label>
                        <Input
                          id="game_date"
                          name="game_date"
                          type="datetime-local"
                          required
                          onChange={handleFormChange}
                          className="bg-background border border-border text-foreground font-medium"
                        />
                      </div>
                      <div>
                        <Label htmlFor="court_number" className="font-heading font-bold text-foreground">Court Number *</Label>
                        <Input
                          id="court_number"
                          name="court_number"
                          type="text"
                          required
                          onChange={handleFormChange}
                          placeholder="e.g., 1, 2, A, B"
                          className="bg-background border border-border text-foreground font-medium"
                        />
                        <p className="text-xs text-muted-foreground mt-1">Duration: 1.5 hours</p>
                      </div>
                      <div>
                        <Label htmlFor="week_number" className="font-heading font-bold text-foreground">Week Number</Label>
                        <Input
                          id="week_number"
                          name="week_number"
                          type="number"
                          min="1"
                          placeholder="e.g., 1, 2, 3"
                          className="bg-background border border-border text-foreground font-medium"
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
                        <Label htmlFor="penalty_limit_per_quarter" className="font-heading font-bold text-foreground">Team Foul Penalty Limit</Label>
                        <Input
                          id="penalty_limit_per_quarter"
                          name="penalty_limit_per_quarter"
                          type="number"
                          defaultValue="5"
                          min="1"
                          max="10"
                          required
                          className="bg-background border border-border text-foreground font-medium"
                        />
                      </div>
                      <div>
                        <Label htmlFor="player_foul_limit" className="font-heading font-bold text-foreground">Player Foul Limit</Label>
                        <Input
                          id="player_foul_limit"
                          name="player_foul_limit"
                          type="number"
                          defaultValue="5"
                          min="1"
                          max="10"
                          required
                          className="bg-background border border-border text-foreground font-medium"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="home_team_id" className="font-heading font-bold text-foreground">Home Team</Label>
                      <select
                        id="home_team_id"
                        name="home_team_id"
                        required
                        className="w-full bg-background border border-border text-foreground px-3 py-2 font-medium"
                      >
                        <option value="">Select team</option>
                        {teamsForSelect.map(team => (
                          <option key={team.id} value={team.id}>{team.name} ({team.sport})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="away_team_id" className="font-heading font-bold text-foreground">Away Team</Label>
                      <select
                        id="away_team_id"
                        name="away_team_id"
                        required
                        className="w-full bg-background border border-border text-foreground px-3 py-2 font-medium"
                      >
                        <option value="">Select team</option>
                        {teamsForSelect.map(team => (
                          <option key={team.id} value={team.id}>{team.name} ({team.sport})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                                                <Label htmlFor="location" className="font-heading font-bold text-foreground">Location</Label>
                                                <Input
                                                  id="location"
                                                  name="location"
                                                  placeholder="e.g., Main Gym, Sports Complex"
                                                  className="bg-background border border-border text-foreground font-medium"
                                                />
                                              </div>
                                              <div>
                                                <Label htmlFor="stream_url" className="font-heading font-bold text-foreground">Live Stream URL (Optional)</Label>
                                                <Input
                                                  id="stream_url"
                                                  name="stream_url"
                                                  placeholder="e.g., https://youtube.com/live/... or https://twitch.tv/..."
                                                  className="bg-background border border-border text-foreground font-medium"
                                                />
                                                <p className="text-xs text-muted-foreground mt-1">Paste a YouTube Live, Twitch, or other embed URL for live streaming.</p>
                                              </div>
                    <div className="flex justify-end gap-3 pt-4">
                      <Button type="button" variant="outline" onClick={() => { 
                        setShowForm(false); 
                        setConflicts([]); 
                        setRecurringConfig({ enabled: false });
                        setSelectedScorekeeperEmails([]);
                        setEditingGame(null);
                      }} className="font-medium">
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={createMutation.isLoading || updateMutation.isLoading}
                        className="font-medium"
                      >
                        {editingGame ? (updateMutation.isLoading ? 'Updating...' : 'Update Game') : (createMutation.isLoading ? 'Scheduling...' : (recurringConfig.enabled ? `Schedule ${recurringConfig.occurrences} Games` : 'Schedule Game'))}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>

              <AlertDialog open={!!deletingGame} onOpenChange={() => setDeletingGame(null)}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-12 h-12 bg-destructive/10 flex items-center justify-center">
                        <AlertTriangle className="w-6 h-6 text-destructive" />
                      </div>
                      <AlertDialogTitle className="text-xl font-heading font-bold">
                        Delete Game Permanently?
                      </AlertDialogTitle>
                    </div>
                    <AlertDialogDescription className="text-muted-foreground font-medium">
                      Are you sure you want to permanently delete this game between <span className="font-heading font-bold text-foreground">{getTeamName(deletingGame?.home_team_id)}</span> and <span className="font-heading font-bold text-foreground">{getTeamName(deletingGame?.away_team_id)}</span>?
                      <br /><br />
                      <p className="text-sm">
                        📅 {deletingGame?.game_date && new Date(deletingGame.game_date).toLocaleString()}
                      </p>
                      {deletingGame?.statsCount > 0 && (
                        <div className="mt-3 p-3 bg-muted border border-border">
                          <p className="text-sm text-foreground font-medium">
                            ⚠️ This game has {deletingGame.statsCount} player statistic record(s) that will also be deleted.
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
                      onClick={() => deleteMutation.mutate(deletingGame.id)}
                      className="font-medium"
                    >
                      Delete Permanently
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <AlertDialog open={!!archivingGame} onOpenChange={() => setArchivingGame(null)}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-12 h-12 bg-muted flex items-center justify-center">
                        <Archive className="w-6 h-6 text-foreground" />
                      </div>
                      <AlertDialogTitle className="text-xl font-heading font-bold">
                        Archive Completed Game?
                      </AlertDialogTitle>
                    </div>
                    <AlertDialogDescription className="text-muted-foreground font-medium">
                      Archive the completed game between <span className="font-heading font-bold text-foreground">{getTeamName(archivingGame?.home_team_id)}</span> and <span className="font-heading font-bold text-foreground">{getTeamName(archivingGame?.away_team_id)}</span>?
                      <br /><br />
                      <p className="text-sm text-muted-foreground font-medium">
                        📦 Archived games can be restored later from the Archived tab.
                      </p>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="font-medium">
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => archiveMutation.mutate({ id: archivingGame.id })}
                      className="font-medium"
                    >
                      Archive Game
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <AlertDialog open={!!restoringGame} onOpenChange={() => setRestoringGame(null)}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-12 h-12 bg-primary/10 flex items-center justify-center">
                        <ArchiveRestore className="w-6 h-6 text-primary" />
                      </div>
                      <AlertDialogTitle className="text-xl font-heading font-bold">
                        Restore Archived Game?
                      </AlertDialogTitle>
                    </div>
                    <AlertDialogDescription className="text-muted-foreground font-medium">
                      Restore the archived game between <span className="font-heading font-bold text-foreground">{getTeamName(restoringGame?.home_team_id)}</span> and <span className="font-heading font-bold text-foreground">{getTeamName(restoringGame?.away_team_id)}</span> back to the Completed tab?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="font-medium">
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => restoreMutation.mutate({ id: restoringGame.id })}
                      className="font-medium"
                    >
                      Restore Game
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <AlertDialog open={showClearAllDialog} onOpenChange={setShowClearAllDialog}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-12 h-12 bg-destructive/10 flex items-center justify-center">
                        <AlertTriangle className="w-6 h-6 text-destructive" />
                      </div>
                      <AlertDialogTitle className="text-xl font-heading font-bold">
                        Clear All Scheduled Games?
                      </AlertDialogTitle>
                    </div>
                    <AlertDialogDescription className="text-muted-foreground font-medium">
                      Are you sure you want to delete all <span className="font-heading font-bold text-foreground">{scheduledGames.length}</span> scheduled games?
                      <br /><br />
                      <p className="font-medium text-destructive">⚠️ This action cannot be undone. All scheduled games will be permanently deleted.</p>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="font-medium">
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => clearAllScheduledMutation.mutate()}
                      className="font-medium"
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