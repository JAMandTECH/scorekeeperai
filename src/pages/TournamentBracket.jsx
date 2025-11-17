import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trophy, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import AdminHeader from "@/components/AdminHeader";
import AdminSidebar from "@/components/AdminSidebar";
import TournamentForm from "@/components/TournamentForm";
import TeamSeeder from "@/components/TeamSeeder";
import BracketVisual from "@/components/BracketVisual";
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

export default function TournamentBracket() {
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [showSeeder, setShowSeeder] = useState(false);
  const [deletingTournament, setDeletingTournament] = useState(null);
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
      
      if (currentUser.is_scorekeeper && currentUser.role !== 'admin') {
        navigate(createPageUrl("ScorekeeperDashboard"));
        return;
      }
      
      if (currentUser.role !== 'admin') {
        navigate(createPageUrl("Home"));
        return;
      }
      
      setUser(currentUser);
    } catch (error) {
      console.error("Error loading user:", error);
      base44.auth.redirectToLogin(createPageUrl("TournamentBracket"));
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

  const { data: tournaments = [] } = useQuery({
    queryKey: ['tournaments', user?.organization_id],
    queryFn: () => base44.entities.Tournament.filter({ organization_id: user?.organization_id }, '-created_date'),
    enabled: !!user?.organization_id,
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['teams', user?.organization_id],
    queryFn: () => base44.entities.Team.filter({ organization_id: user?.organization_id }),
    enabled: !!user?.organization_id,
  });

  const { data: allMatches = [] } = useQuery({
    queryKey: ['bracket-matches', selectedTournament?.id],
    queryFn: () => base44.entities.BracketMatch.filter({ tournament_id: selectedTournament.id }),
    enabled: !!selectedTournament,
  });

  const createTournamentMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.Tournament.create({
        ...data,
        organization_id: user?.organization_id,
        status: 'setup',
      });
    },
    onSuccess: (newTournament) => {
      queryClient.invalidateQueries(['tournaments']);
      setShowForm(false);
      setSelectedTournament(newTournament);
      setShowSeeder(true);
    },
  });

  const updateTournamentMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Tournament.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['tournaments']);
    },
  });

  const updateMatchMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.BracketMatch.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['bracket-matches']);
    },
  });

  const deleteTournamentMutation = useMutation({
    mutationFn: async (id) => {
      const matches = await base44.entities.BracketMatch.filter({ tournament_id: id });
      await Promise.all(matches.map(m => base44.entities.BracketMatch.delete(m.id)));
      return await base44.entities.Tournament.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['tournaments']);
      queryClient.invalidateQueries(['bracket-matches']);
      setDeletingTournament(null);
      if (selectedTournament?.id === deletingTournament?.id) {
        setSelectedTournament(null);
      }
    },
  });

  const generateBracketMatches = async (tournament, seededTeamIds) => {
    const existingMatches = await base44.entities.BracketMatch.filter({ tournament_id: tournament.id });
    
    if (existingMatches.length > 0) {
      await Promise.all(existingMatches.map(m => base44.entities.BracketMatch.delete(m.id)));
    }

    const numTeams = tournament.num_teams;
    const bestOfSettings = tournament.best_of_settings || {};
    
    const getRoundName = (roundNum, totalRounds) => {
      if (roundNum === totalRounds) return 'finals';
      if (roundNum === totalRounds - 1) return 'semi_finals';
      if (roundNum === totalRounds - 2) return 'quarter_finals';
      if (roundNum === totalRounds - 3) return 'round_of_16';
      return `round_${roundNum}`;
    };

    const calculateRequiredWins = (roundName) => {
      const bestOf = bestOfSettings[roundName] || 1;
      return Math.ceil(bestOf / 2);
    };

    const totalRounds = Math.log2(numTeams);
    const allMatches = [];

    for (let round = 1; round <= totalRounds; round++) {
      const matchesInRound = Math.pow(2, totalRounds - round);
      const roundName = getRoundName(round, totalRounds);
      const requiredWins = calculateRequiredWins(roundName);

      for (let matchNum = 0; matchNum < matchesInRound; matchNum++) {
        const match = {
          tournament_id: tournament.id,
          round_name: roundName,
          match_number: matchNum,
          required_wins: requiredWins,
          status: 'pending',
        };

        if (round === 1) {
          const homeIdx = matchNum * 2;
          const awayIdx = matchNum * 2 + 1;
          match.home_team_id = seededTeamIds[homeIdx] || null;
          match.away_team_id = seededTeamIds[awayIdx] || null;
          match.status = (match.home_team_id && match.away_team_id) ? 'ready' : 'pending';
        }

        allMatches.push(match);
      }
    }

    const createdMatches = [];
    for (const matchData of allMatches) {
      const created = await base44.entities.BracketMatch.create(matchData);
      createdMatches.push(created);
    }

    for (let round = 1; round < totalRounds; round++) {
      const roundName = getRoundName(round, totalRounds);
      const nextRoundName = getRoundName(round + 1, totalRounds);
      
      const currentRoundMatches = createdMatches.filter(m => m.round_name === roundName);
      const nextRoundMatches = createdMatches.filter(m => m.round_name === nextRoundName);

      for (let i = 0; i < currentRoundMatches.length; i++) {
        const nextMatchIdx = Math.floor(i / 2);
        const isHomeSlot = i % 2 === 0;
        
        await base44.entities.BracketMatch.update(currentRoundMatches[i].id, {
          next_match_id: nextRoundMatches[nextMatchIdx]?.id,
          is_home_slot: isHomeSlot,
        });
      }
    }

    return createdMatches;
  };

  const handleSeedingComplete = async (seededTeamIds) => {
    try {
      await updateTournamentMutation.mutateAsync({
        id: selectedTournament.id,
        data: {
          initial_teams: seededTeamIds,
          status: 'seeding',
        }
      });

      await generateBracketMatches(selectedTournament, seededTeamIds);

      await updateTournamentMutation.mutateAsync({
        id: selectedTournament.id,
        data: { status: 'in_progress' }
      });

      queryClient.invalidateQueries(['tournaments']);
      queryClient.invalidateQueries(['bracket-matches']);
      setShowSeeder(false);
    } catch (error) {
      console.error("Error completing seeding:", error);
      alert("Error setting up bracket. Please try again.");
    }
  };

  const handleTeamReorder = async (sourceMatchId, sourceSlot, destMatchId, destSlot) => {
    const sourceMatch = allMatches.find(m => m.id === sourceMatchId);
    const destMatch = allMatches.find(m => m.id === destMatchId);
    
    if (!sourceMatch || !destMatch) return;
    
    const sourceTeamId = sourceSlot === 'home' ? sourceMatch.home_team_id : sourceMatch.away_team_id;
    const destTeamId = destSlot === 'home' ? destMatch.home_team_id : destMatch.away_team_id;
    
    const sourceUpdate = {};
    const destUpdate = {};
    
    if (sourceSlot === 'home') {
      sourceUpdate.home_team_id = destTeamId;
    } else {
      sourceUpdate.away_team_id = destTeamId;
    }
    
    if (destSlot === 'home') {
      destUpdate.home_team_id = sourceTeamId;
    } else {
      destUpdate.away_team_id = sourceTeamId;
    }
    
    await updateMatchMutation.mutateAsync({ id: sourceMatchId, data: sourceUpdate });
    await updateMatchMutation.mutateAsync({ id: destMatchId, data: destUpdate });
  };

  const handleMatchClick = (match) => {
    console.log("Match clicked:", match);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

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
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-4xl font-black text-gray-900 dark:text-white">Tournament Brackets</h1>
                  <p className="text-gray-600 dark:text-gray-400 mt-2 font-medium">Manage playoff and finals tournaments</p>
                </div>
                <Button 
                  onClick={() => setShowForm(true)}
                  className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold shadow-xl"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Create Tournament
                </Button>
              </div>

              {!selectedTournament && (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {tournaments.map(tournament => (
                    <Card 
                      key={tournament.id}
                      className="border-2 border-purple-100 dark:border-purple-900 hover:shadow-xl transition-all cursor-pointer"
                      onClick={() => setSelectedTournament(tournament)}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <Trophy className="w-8 h-8 text-yellow-500" />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletingTournament(tournament);
                            }}
                            className="text-gray-400 hover:text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">
                          {tournament.name}
                        </h3>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge className="bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                              {tournament.sport.toUpperCase()}
                            </Badge>
                            <Badge variant="outline">
                              {tournament.num_teams} Teams
                            </Badge>
                          </div>
                          <Badge className={
                            tournament.status === 'completed' ? 'bg-green-600' :
                            tournament.status === 'in_progress' ? 'bg-yellow-600' :
                            tournament.status === 'seeding' ? 'bg-orange-600' :
                            'bg-gray-600'
                          }>
                            {tournament.status.replace('_', ' ').toUpperCase()}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {tournaments.length === 0 && (
                    <div className="col-span-full text-center py-20">
                      <Trophy className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                      <p className="text-gray-500 dark:text-gray-400 text-xl font-bold">No tournaments yet</p>
                      <p className="text-gray-400 dark:text-gray-500 text-sm">Create your first tournament to get started</p>
                    </div>
                  )}
                </div>
              )}

              {selectedTournament && !showSeeder && (
                <div className="space-y-6">
                  <Button
                    variant="outline"
                    onClick={() => setSelectedTournament(null)}
                    className="font-bold"
                  >
                    ← Back to Tournaments
                  </Button>
                  <BracketVisual
                    tournament={selectedTournament}
                    matches={allMatches}
                    teams={teams}
                    onMatchClick={handleMatchClick}
                    onTeamReorder={handleTeamReorder}
                  />
                </div>
              )}

              {showSeeder && selectedTournament && (
                <TeamSeeder
                  tournament={selectedTournament}
                  teams={teams}
                  onComplete={handleSeedingComplete}
                  onCancel={() => {
                    setShowSeeder(false);
                    setSelectedTournament(null);
                  }}
                />
              )}

              <Dialog open={showForm} onOpenChange={setShowForm}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-black">Create New Tournament</DialogTitle>
                  </DialogHeader>
                  <TournamentForm
                    teams={teams}
                    onSubmit={(data) => createTournamentMutation.mutate(data)}
                    onCancel={() => setShowForm(false)}
                  />
                </DialogContent>
              </Dialog>

              <AlertDialog open={!!deletingTournament} onOpenChange={() => setDeletingTournament(null)}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Tournament?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete "{deletingTournament?.name}"? This will also delete all bracket matches. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deleteTournamentMutation.mutate(deletingTournament.id)}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Delete
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