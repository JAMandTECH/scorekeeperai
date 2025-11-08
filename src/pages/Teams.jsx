import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Users, Edit, Trophy, TrendingUp, Flame } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function Teams() {
  const [showForm, setShowForm] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const currentUser = await base44.auth.me();
    setUser(currentUser);
  };

  const { data: teams = [], isLoading } = useQuery({
    queryKey: ['teams', user?.organization_id],
    queryFn: () => base44.entities.Team.filter({ organization_id: user?.organization_id }, '-created_date'),
    enabled: !!user?.organization_id,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Team.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['teams']);
      setShowForm(false);
      setEditingTeam(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Team.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['teams']);
      setShowForm(false);
      setEditingTeam(null);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      organization_id: user?.organization_id,
      name: formData.get('name'),
      sport: formData.get('sport'),
      division: formData.get('division'),
      coach_name: formData.get('coach_name'),
      coach_contact: formData.get('coach_contact'),
    };

    if (editingTeam) {
      updateMutation.mutate({ id: editingTeam.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (team) => {
    setEditingTeam(team);
    setShowForm(true);
  };

  const basketballTeams = teams.filter(t => t.sport === 'basketball');
  const volleyballTeams = teams.filter(t => t.sport === 'volleyball');

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-orange-50/30 to-gray-50 dark:from-gray-900 dark:via-orange-950/10 dark:to-gray-900">
      <div className="p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-black text-gray-900 dark:text-white">Teams</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2 font-medium">Manage your organization's teams</p>
            </div>
            <Button 
              onClick={() => {
                setEditingTeam(null);
                setShowForm(true);
              }}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold shadow-xl"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Team
            </Button>
          </div>

          {/* Basketball Teams */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/>
                  <path d="M2 12h20"/>
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-black text-gray-900 dark:text-white">Basketball Teams</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{basketballTeams.length} teams</p>
              </div>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {basketballTeams.map((team) => (
                <Card key={team.id} className="relative overflow-hidden border-2 border-orange-100 dark:border-orange-900 bg-gradient-to-br from-white to-orange-50 dark:from-gray-800 dark:to-orange-950/30 shadow-lg hover:shadow-2xl transition-all group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-orange-500/20 to-transparent rounded-full blur-3xl"></div>
                  <CardHeader className="relative z-10">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center shadow-md">
                            <Trophy className="w-5 h-5 text-white" />
                          </div>
                          <CardTitle className="text-lg font-black text-gray-900 dark:text-white">{team.name}</CardTitle>
                        </div>
                        <Badge className="bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800 font-bold">
                          {team.division || 'No Division'}
                        </Badge>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleEdit(team)}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="relative z-10 space-y-4">
                    <div className="flex justify-between items-center p-3 bg-white/50 dark:bg-gray-900/50 rounded-xl">
                      <span className="text-sm text-gray-600 dark:text-gray-400 font-semibold">Record</span>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-black text-green-600 dark:text-green-400">{team.wins || 0}W</span>
                        <span className="text-gray-400">-</span>
                        <span className="text-lg font-black text-red-600 dark:text-red-400">{team.losses || 0}L</span>
                      </div>
                    </div>
                    
                    {team.coach_name && (
                      <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                        <span className="text-gray-500 dark:text-gray-500">Coach:</span> <span className="text-gray-900 dark:text-white font-bold">{team.coach_name}</span>
                      </div>
                    )}
                    
                    <Link to={createPageUrl("Players") + `?team_id=${team.id}`}>
                      <Button variant="outline" className="w-full border-2 border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950 font-bold">
                        <Users className="w-4 h-4 mr-2" />
                        View Players
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Volleyball Teams */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                <Trophy className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-gray-900 dark:text-white">Volleyball Teams</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{volleyballTeams.length} teams</p>
              </div>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {volleyballTeams.map((team) => (
                <Card key={team.id} className="relative overflow-hidden border-2 border-blue-100 dark:border-blue-900 bg-gradient-to-br from-white to-blue-50 dark:from-gray-800 dark:to-blue-950/30 shadow-lg hover:shadow-2xl transition-all group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/20 to-transparent rounded-full blur-3xl"></div>
                  <CardHeader className="relative z-10">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-md">
                            <Trophy className="w-5 h-5 text-white" />
                          </div>
                          <CardTitle className="text-lg font-black text-gray-900 dark:text-white">{team.name}</CardTitle>
                        </div>
                        <Badge className="bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800 font-bold">
                          {team.division || 'No Division'}
                        </Badge>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleEdit(team)}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="relative z-10 space-y-4">
                    <div className="flex justify-between items-center p-3 bg-white/50 dark:bg-gray-900/50 rounded-xl">
                      <span className="text-sm text-gray-600 dark:text-gray-400 font-semibold">Record</span>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-black text-green-600 dark:text-green-400">{team.wins || 0}W</span>
                        <span className="text-gray-400">-</span>
                        <span className="text-lg font-black text-red-600 dark:text-red-400">{team.losses || 0}L</span>
                      </div>
                    </div>
                    
                    {team.coach_name && (
                      <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                        <span className="text-gray-500 dark:text-gray-500">Coach:</span> <span className="text-gray-900 dark:text-white font-bold">{team.coach_name}</span>
                      </div>
                    )}
                    
                    <Link to={createPageUrl("Players") + `?team_id=${team.id}`}>
                      <Button variant="outline" className="w-full border-2 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950 font-bold">
                        <Users className="w-4 h-4 mr-2" />
                        View Players
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Dialog */}
          <Dialog open={showForm} onOpenChange={setShowForm}>
            <DialogContent className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 max-w-md">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black text-gray-900 dark:text-white">{editingTeam ? 'Edit Team' : 'Add New Team'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name" className="font-bold text-gray-700 dark:text-gray-300">Team Name</Label>
                  <Input
                    id="name"
                    name="name"
                    defaultValue={editingTeam?.name}
                    required
                    className="bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white font-medium"
                  />
                </div>
                <div>
                  <Label htmlFor="sport" className="font-bold text-gray-700 dark:text-gray-300">Sport</Label>
                  <Select name="sport" defaultValue={editingTeam?.sport || 'basketball'} required>
                    <SelectTrigger className="bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white font-medium">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600">
                      <SelectItem value="basketball">Basketball</SelectItem>
                      <SelectItem value="volleyball">Volleyball</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="division" className="font-bold text-gray-700 dark:text-gray-300">Division</Label>
                  <Input
                    id="division"
                    name="division"
                    defaultValue={editingTeam?.division}
                    placeholder="e.g., Division A, Youth League"
                    className="bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white font-medium"
                  />
                </div>
                <div>
                  <Label htmlFor="coach_name" className="font-bold text-gray-700 dark:text-gray-300">Coach Name</Label>
                  <Input
                    id="coach_name"
                    name="coach_name"
                    defaultValue={editingTeam?.coach_name}
                    className="bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white font-medium"
                  />
                </div>
                <div>
                  <Label htmlFor="coach_contact" className="font-bold text-gray-700 dark:text-gray-300">Coach Contact</Label>
                  <Input
                    id="coach_contact"
                    name="coach_contact"
                    defaultValue={editingTeam?.coach_contact}
                    placeholder="Phone or email"
                    className="bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white font-medium"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 font-bold">
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold">
                    {editingTeam ? 'Update' : 'Create'}
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