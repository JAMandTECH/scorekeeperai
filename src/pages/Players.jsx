import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/dialog";
import { Plus, User, Edit, Trophy, Target } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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

  return (
    <div className="p-4 md:p-8 bg-gray-950 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Players</h1>
            <p className="text-gray-400 mt-1">Manage player rosters</p>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <select
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              className="bg-gray-900 border border-gray-800 text-white rounded-lg px-4 py-2"
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
              className="bg-yellow-400 hover:bg-yellow-500 text-gray-900"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Player
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {players.map((player) => (
            <Card key={player.id} className="bg-gray-900 border-gray-800 hover:border-yellow-400/50 transition-colors">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-16 h-16">
                      <AvatarImage src={player.photo_url} />
                      <AvatarFallback className="bg-yellow-400 text-gray-900 font-bold text-lg">
                        {player.jersey_number}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="text-white font-bold text-lg">
                        {player.first_name} {player.last_name}
                      </h3>
                      <p className="text-gray-400 text-sm">{getTeamName(player.team_id)}</p>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => {
                      setEditingPlayer(player);
                      setShowForm(true);
                    }}
                    className="text-gray-400 hover:text-white"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-400">Position</span>
                    <p className="text-white font-medium">{player.position || '-'}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">Height</span>
                    <p className="text-white font-medium">{player.height || '-'}</p>
                  </div>
                </div>
                <div className="border-t border-gray-800 pt-3 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="text-yellow-400 font-bold text-lg">{player.total_points || 0}</div>
                    <div className="text-gray-500 text-xs">PTS</div>
                  </div>
                  <div>
                    <div className="text-yellow-400 font-bold text-lg">{player.total_rebounds || 0}</div>
                    <div className="text-gray-500 text-xs">REB</div>
                  </div>
                  <div>
                    <div className="text-yellow-400 font-bold text-lg">{player.total_assists || 0}</div>
                    <div className="text-gray-500 text-xs">AST</div>
                  </div>
                </div>
                <div className="text-center text-sm text-gray-400">
                  {player.games_played || 0} games played
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {players.length === 0 && (
          <div className="text-center py-16">
            <User className="w-16 h-16 text-gray-700 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No players found</p>
            <p className="text-gray-600 text-sm">Add your first player to get started</p>
          </div>
        )}

        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="bg-gray-900 border-gray-800 text-white">
            <DialogHeader>
              <DialogTitle>{editingPlayer ? 'Edit Player' : 'Add New Player'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="team_id">Team</Label>
                <select
                  id="team_id"
                  name="team_id"
                  defaultValue={editingPlayer?.team_id}
                  required
                  className="w-full bg-gray-950 border border-gray-800 text-white rounded-lg px-3 py-2"
                >
                  <option value="">Select a team</option>
                  {teams.map(team => (
                    <option key={team.id} value={team.id}>{team.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="first_name">First Name</Label>
                  <Input
                    id="first_name"
                    name="first_name"
                    defaultValue={editingPlayer?.first_name}
                    required
                    className="bg-gray-950 border-gray-800 text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="last_name">Last Name</Label>
                  <Input
                    id="last_name"
                    name="last_name"
                    defaultValue={editingPlayer?.last_name}
                    required
                    className="bg-gray-950 border-gray-800 text-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="jersey_number">Jersey #</Label>
                  <Input
                    id="jersey_number"
                    name="jersey_number"
                    defaultValue={editingPlayer?.jersey_number}
                    required
                    className="bg-gray-950 border-gray-800 text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="position">Position</Label>
                  <Input
                    id="position"
                    name="position"
                    defaultValue={editingPlayer?.position}
                    placeholder="e.g., Guard, Forward"
                    className="bg-gray-950 border-gray-800 text-white"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="height">Height</Label>
                <Input
                  id="height"
                  name="height"
                  defaultValue={editingPlayer?.height}
                  placeholder="e.g., 6'2&quot;"
                  className="bg-gray-950 border-gray-800 text-white"
                />
              </div>
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="border-gray-700 text-white">
                  Cancel
                </Button>
                <Button type="submit" className="bg-yellow-400 hover:bg-yellow-500 text-gray-900">
                  {editingPlayer ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}