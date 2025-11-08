import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, User, Edit, TrendingUp, Target, Award } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export default function Players() {
  const [showForm, setShowForm] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [user, setUser] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState('all');
  const queryClient = useQueryClient();

  useEffect(() => {
    loadUser();
    const urlParams = new URLSearchParams(window.location.search);
    const teamId = urlParams.get('team_id');
    if (teamId) setSelectedTeam(teamId);
  }, []);

  const loadUser = async () => {
    const currentUser = await base44.auth.me();
    setUser(currentUser);
  };

  const { data: teams = [] } = useQuery({
    queryKey: ['teams', user?.organization_id],
    queryFn: () => base44.entities.Team.filter({ organization_id: user?.organization_id }),
    enabled: !!user?.organization_id,
  });

  const { data: allPlayers = [] } = useQuery({
    queryKey: ['players'],
    queryFn: () => base44.entities.Player.list('-created_date'),
    enabled: !!user,
  });

  const players = allPlayers.filter(p => {
    const teamIds = teams.map(t => t.id);
    if (!teamIds.includes(p.team_id)) return false;
    if (selectedTeam === 'all') return true;
    return p.team_id === selectedTeam;
  });

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

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      team_id: formData.get('team_id'),
      first_name: formData.get('first_name'),
      last_name: formData.get('last_name'),
      jersey_number: formData.get('jersey_number'),
      position: formData.get('position'),
      height: formData.get('height'),
    };

    if (editingPlayer) {
      updateMutation.mutate({ id: editingPlayer.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const getTeamName = (teamId) => {
    const team = teams.find(t => t.id === teamId);
    return team?.name || 'Unknown Team';
  };

  const getTeamSport = (teamId) => {
    const team = teams.find(t => t.id === teamId);
    return team?.sport || 'basketball';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-purple-50/30 to-gray-50 dark:from-gray-900 dark:via-purple-950/10 dark:to-gray-900">
      <div className="p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-4xl font-black text-gray-900 dark:text-white">Players</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2 font-medium">Manage player rosters</p>
            </div>
            <div className="flex gap-3 w-full md:w-auto">
              <select
                value={selectedTeam}
                onChange={(e) => setSelectedTeam(e.target.value)}
                className="bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-xl px-4 py-2 font-bold shadow-lg"
              >
                <option value="all">All Teams</option>
                {teams.map(team => (
                  <option key={team.id} value={team.id}>{team.name}</option>
                ))}
              </select>
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
            </div>
          </div>

          {/* Players Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {players.map((player) => {
              const sport = getTeamSport(player.team_id);
              const sportColor = sport === 'basketball' ? 'orange' : 'blue';
              
              return (
                <Card key={player.id} className={`relative overflow-hidden border-2 border-${sportColor}-100 dark:border-${sportColor}-900 bg-gradient-to-br from-white to-${sportColor}-50 dark:from-gray-800 dark:to-${sportColor}-950/30 shadow-lg hover:shadow-2xl transition-all group`}>
                  <div className={`absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-${sportColor}-500/20 to-transparent rounded-full blur-3xl`}></div>
                  
                  <CardHeader className="pb-3 relative z-10">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-16 h-16 border-4 border-white dark:border-gray-700 shadow-xl">
                          <AvatarImage src={player.photo_url} />
                          <AvatarFallback className={`bg-gradient-to-br from-${sportColor}-600 to-${sportColor}-700 text-white font-black text-lg`}>
                            {player.jersey_number}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="text-gray-900 dark:text-white font-black text-lg">
                            {player.first_name} {player.last_name}
                          </h3>
                          <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">{getTeamName(player.team_id)}</p>
                        </div>
                      </div>
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
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-white/60 dark:bg-gray-900/60 rounded-xl p-3">
                          <div className={`text-${sportColor}-600 dark:text-${sportColor}-400 font-black text-2xl`}>
                            {player.total_points || 0}
                          </div>
                          <div className="text-gray-500 dark:text-gray-400 text-xs font-bold">PTS</div>
                        </div>
                        <div className="bg-white/60 dark:bg-gray-900/60 rounded-xl p-3">
                          <div className={`text-${sportColor}-600 dark:text-${sportColor}-400 font-black text-2xl`}>
                            {player.total_rebounds || 0}
                          </div>
                          <div className="text-gray-500 dark:text-gray-400 text-xs font-bold">REB</div>
                        </div>
                        <div className="bg-white/60 dark:bg-gray-900/60 rounded-xl p-3">
                          <div className={`text-${sportColor}-600 dark:text-${sportColor}-400 font-black text-2xl`}>
                            {player.total_assists || 0}
                          </div>
                          <div className="text-gray-500 dark:text-gray-400 text-xs font-bold">AST</div>
                        </div>
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
            })}
          </div>

          {players.length === 0 && (
            <div className="text-center py-20">
              <div className="w-24 h-24 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
                <User className="w-12 h-12 text-gray-400 dark:text-gray-500" />
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-xl font-bold">No players found</p>
              <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">Add your first player to get started</p>
            </div>
          )}

          {/* Dialog */}
          <Dialog open={showForm} onOpenChange={setShowForm}>
            <DialogContent className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 max-w-md">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black text-gray-900 dark:text-white">
                  {editingPlayer ? 'Edit Player' : 'Add New Player'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
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
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 font-bold">
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold">
                    {editingPlayer ? 'Update' : 'Create'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}