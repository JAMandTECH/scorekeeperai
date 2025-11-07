
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Users, Edit, Trophy } from "lucide-react";
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
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Teams</h1>
            <p className="text-gray-600 mt-1">Manage your organization's teams</p>
          </div>
          <Button 
            onClick={() => {
              setEditingTeam(null);
              setShowForm(true);
            }}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Team
          </Button>
        </div>

        {/* Basketball Teams */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Trophy className="w-6 h-6 text-blue-600" />
            Basketball Teams ({basketballTeams.length})
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {basketballTeams.map((team) => (
              <Card key={team.id} className="bg-white border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-gray-900">{team.name}</CardTitle>
                      <Badge className="mt-2 bg-orange-50 text-orange-600 border-orange-200">
                        {team.division || 'No Division'}
                      </Badge>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleEdit(team)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Record</span>
                    <span className="text-gray-900 font-semibold">{team.wins || 0}W - {team.losses || 0}L</span>
                  </div>
                  {team.coach_name && (
                    <div className="text-sm text-gray-600">
                      Coach: <span className="text-gray-900 font-medium">{team.coach_name}</span>
                    </div>
                  )}
                  <Link to={createPageUrl("Players") + `?team_id=${team.id}`}>
                    <Button variant="outline" className="w-full border-gray-300 text-gray-700 hover:bg-gray-50">
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
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Trophy className="w-6 h-6 text-blue-600" />
            Volleyball Teams ({volleyballTeams.length})
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {volleyballTeams.map((team) => (
              <Card key={team.id} className="bg-white border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-gray-900">{team.name}</CardTitle>
                      <Badge className="mt-2 bg-blue-50 text-blue-600 border-blue-200">
                        {team.division || 'No Division'}
                      </Badge>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleEdit(team)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Record</span>
                    <span className="text-gray-900 font-semibold">{team.wins || 0}W - {team.losses || 0}L</span>
                  </div>
                  {team.coach_name && (
                    <div className="text-sm text-gray-600">
                      Coach: <span className="text-gray-900 font-medium">{team.coach_name}</span>
                    </div>
                  )}
                  <Link to={createPageUrl("Players") + `?team_id=${team.id}`}>
                    <Button variant="outline" className="w-full border-gray-300 text-gray-700 hover:bg-gray-50">
                      <Users className="w-4 h-4 mr-2" />
                      View Players
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="bg-white border-gray-200">
            <DialogHeader>
              <DialogTitle className="text-gray-900">{editingTeam ? 'Edit Team' : 'Add New Team'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Team Name</Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={editingTeam?.name}
                  required
                  className="bg-white border-gray-300 text-gray-900"
                />
              </div>
              <div>
                <Label htmlFor="sport">Sport</Label>
                <Select name="sport" defaultValue={editingTeam?.sport || 'basketball'} required>
                  <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-300">
                    <SelectItem value="basketball">Basketball</SelectItem>
                    <SelectItem value="volleyball">Volleyball</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="division">Division</Label>
                <Input
                  id="division"
                  name="division"
                  defaultValue={editingTeam?.division}
                  placeholder="e.g., Division A, Youth League"
                  className="bg-white border-gray-300 text-gray-900"
                />
              </div>
              <div>
                <Label htmlFor="coach_name">Coach Name</Label>
                <Input
                  id="coach_name"
                  name="coach_name"
                  defaultValue={editingTeam?.coach_name}
                  className="bg-white border-gray-300 text-gray-900"
                />
              </div>
              <div>
                <Label htmlFor="coach_contact">Coach Contact</Label>
                <Input
                  id="coach_contact"
                  name="coach_contact"
                  defaultValue={editingTeam?.coach_contact}
                  placeholder="Phone or email"
                  className="bg-white border-gray-300 text-gray-900"
                />
              </div>
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="border-gray-300 text-gray-700 hover:bg-gray-50">
                  Cancel
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
                  {editingTeam ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
